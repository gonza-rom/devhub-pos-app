// middleware.ts
// ACTUALIZADO: agrega bloqueo de tenants con plan vencido.
// Sin queries a DB — lee el plan desde la cookie JWT.

import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { getTenantSessionFromRequest } from "@/lib/session";

const PUBLIC_PATHS = [
  "/auth/login",
  "/auth/registro",
  "/auth/callback",
  "/auth/recuperar",        // recuperación de contraseña
  "/api/auth",
  "/api/webhooks",
  "/_next",
  "/favicon.ico",
];

const ADMIN_PATHS = [
  "/admin",
  "/api/admin",
  "/api/tenants",
];

// Rutas que un tenant vencido SÍ puede visitar
// (para que pueda renovar su plan)
const PLAN_PATHS_PERMITIDAS = [
  "/configuracion/plan",
  "/api/suscripcion",
  "/api/configuracion/plan",
  "/auth/logout",
  "/api/auth/logout",
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

// ── Lógica de bloqueo por plan ────────────────────────────────
// FREE:       acceso completo (es el plan de prueba)
// PRO/ENTERPRISE: acceso completo mientras planVenceAt > now
// PRO vencido: redirigir a /configuracion/plan

function planEstaVencido(
  plan: string,
  planVenceAt: number | null
): boolean {
  // FREE nunca vence
  if (plan === "FREE") return false;
  // Sin fecha de vencimiento = activo
  if (!planVenceAt) return false;
  // Vencido si la fecha ya pasó
  return Date.now() > planVenceAt;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isAdmin(pathname))  return NextResponse.next();
  if (isPublic(pathname)) {
    const { supabaseResponse } = await updateSession(request);
    return supabaseResponse;
  }

  // 1. Verificar sesión de Supabase
  const { supabaseResponse, user } = await updateSession(request);

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // 2. Leer cookie de tenant
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

  // 3. ✅ Bloqueo por plan vencido
  const vencido = planEstaVencido(tenantSession.plan, tenantSession.planVenceAt);

  if (vencido && !isPlanPermitida(pathname)) {
    // API routes → 402 Payment Required
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { ok: false, error: "Plan vencido. Renová tu suscripción para continuar.", code: "PLAN_VENCIDO" },
        { status: 402 }
      );
    }
    // Páginas → redirect a configuracion/plan
    const url = request.nextUrl.clone();
    url.pathname = "/configuracion/plan";
    url.searchParams.set("motivo", "vencido");
    return NextResponse.redirect(url);
  }

  // 4. Inyectar headers del tenant
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-tenant-id",    tenantSession.tenantId);
  requestHeaders.set("x-user-id",      tenantSession.usuarioId);
  requestHeaders.set("x-user-rol",     tenantSession.rol);
  requestHeaders.set("x-user-nombre",  tenantSession.nombre);
  requestHeaders.set("x-tenant-plan",  tenantSession.plan);  // bonus: disponible en API routes

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