// middleware.ts
// Lee la cookie de sesión firmada (JWT) para inyectar tenantId y rol
// sin necesidad de Prisma. Compatible con Edge Runtime.

import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { getTenantSessionFromRequest } from "@/lib/session";

const PUBLIC_PATHS = [
  "/auth/login",
  "/auth/registro",
  "/auth/callback",
  "/api/auth",
  "/api/webhooks",
  "/_next",
  "/favicon.ico",
];

// Rutas del super-admin — tienen su propio sistema de auth (cookie devhub-admin-session)
const ADMIN_PATHS = [
  "/admin",
  "/api/admin",
  "/api/tenants",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

function isAdmin(pathname: string): boolean {
  return ADMIN_PATHS.some((p) => pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rutas de admin: bypasear todo el sistema de Supabase/tenant.
  // La verificación la hace requireAdmin() en cada Server Component
  // y verifyAdminSecret() en cada API route.
  if (isAdmin(pathname)) {
    return NextResponse.next();
  }

  if (isPublic(pathname)) {
    const { supabaseResponse } = await updateSession(request);
    return supabaseResponse;
  }

  // 1. Verificar sesión de Supabase (refresca el token si hace falta)
  const { supabaseResponse, user } = await updateSession(request);

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // 2. Leer la cookie de tenant firmada (sin tocar la DB)
  const tenantSession = await getTenantSessionFromRequest(request);

  // Si no hay cookie de tenant → mandar a regenerarla
  if (!tenantSession) {
    if (!pathname.startsWith("/api/auth/refresh-session")) {
      const url = request.nextUrl.clone();
      url.pathname = "/api/auth/refresh-session";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // 3. Inyectar datos del tenant en los headers (sin queries a DB 🎉)
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-tenant-id",   tenantSession.tenantId);
  requestHeaders.set("x-user-id",     tenantSession.usuarioId);
  requestHeaders.set("x-user-rol",    tenantSession.rol);
  requestHeaders.set("x-user-nombre", tenantSession.nombre);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // Pasar cookies de Supabase
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie.name, cookie.value, cookie);
  });

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};