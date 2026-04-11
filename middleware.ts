// middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { getTenantSessionFromRequest } from "@/lib/session";

const PUBLIC_PATHS = [
  "/auth/login",
  "/auth/registro",
  "/auth/callback",
  "/auth/recuperar",
  "/auth/loading",
  "/api/auth",
  "/api/webhooks",
  "/_next",
  "/favicon.ico",
  "/api/catalogo"
];

const ADMIN_PATHS = [
  "/admin",
  "/api/admin",
  "/api/tenants",
];

const PLAN_PATHS_PERMITIDAS = [
  "/configuracion/plan",
  "/api/suscripcion",
  "/api/configuracion/plan",
  "/auth/logout",
  "/api/auth/logout",
];

// APIs que un trial vencido NO puede usar
const APIS_BLOQUEADAS_TRIAL = [
  "/api/productos",
  "/api/ventas",
  "/api/movimientos",
  "/api/caja",
  "/api/categorias",
  "/api/proveedores",
  "/api/afip",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

function isAdmin(pathname: string): boolean {
  return ADMIN_PATHS.some((p) => pathname.startsWith(p));
}

function isPlanPermitida(pathname: string): boolean {
  return PLAN_PATHS_PERMITIDAS.some((p) => pathname.startsWith(p));
}

function isApiBloqueada(pathname: string): boolean {
  return APIS_BLOQUEADAS_TRIAL.some((p) => pathname.startsWith(p));
}

function planEstaVencido(plan: string, planVenceAt: number | null): boolean {
  if (!planVenceAt) return false;
  return Date.now() > planVenceAt;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isAdmin(pathname))  return NextResponse.next();
  if (isPublic(pathname)) {
    const { supabaseResponse } = await updateSession(request);
    return supabaseResponse;
  }

  const { supabaseResponse, user } = await updateSession(request);

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  const tenantSession = await getTenantSessionFromRequest(request);

  if (!tenantSession) {
    if (!pathname.startsWith("/api/auth/refresh-session")) {
      const url = request.nextUrl.clone();
      url.pathname = "/api/auth/refresh-session";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  const vencido = planEstaVencido(tenantSession.plan, tenantSession.planVenceAt);

  if (vencido && !isPlanPermitida(pathname)) {
    if (pathname.startsWith("/api/")) {
      // Solo bloquear APIs de escritura
      if (isApiBloqueada(pathname)) {
        return NextResponse.json(
          {
            ok: false,
            error: "Tu período de prueba ha vencido. Suscribite al plan Pro para continuar.",
            code: "TRIAL_VENCIDO",
          },
          { status: 402 }
        );
      }
      // Otras APIs → dejar pasar
    }
    // Páginas → dejar pasar, el banner se muestra en el layout
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-tenant-id",    tenantSession.tenantId);
  requestHeaders.set("x-user-id",      tenantSession.usuarioId);
  requestHeaders.set("x-user-rol",     tenantSession.rol);
  requestHeaders.set("x-user-nombre",  tenantSession.nombre);
  requestHeaders.set("x-tenant-plan",  tenantSession.plan);
  // ← Pasar si está vencido para que el layout muestre el banner
  requestHeaders.set("x-trial-vencido", vencido ? "1" : "0");

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  supabaseResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie.name, cookie.value, cookie);
  });

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};