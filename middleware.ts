// middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { prisma } from "@/lib/prisma";

// Rutas que NO necesitan auth
const PUBLIC_PATHS = [
  "/auth/login",
  "/auth/registro",
  "/auth/callback",
  "/api/auth",
  "/api/webhooks",
  "/_next",
  "/favicon.ico",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Dejar pasar archivos estáticos y rutas públicas sin procesar
  if (isPublic(pathname)) {
    const { supabaseResponse } = await updateSession(request);
    return supabaseResponse;
  }

  // Refrescar sesión y obtener user
  const { supabaseResponse, user } = await updateSession(request);

  // Sin sesión → login
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // Buscar el tenant del usuario
  const usuarioTenant = await prisma.usuarioTenant.findUnique({
    where: { supabaseId: user.id },
    select: { tenantId: true, rol: true, activo: true, nombre: true },
  });

  // Si no tiene tenant todavía (recién registrado, Prisma no terminó)
  // devolvemos la response de supabase y dejamos que Next.js intente de nuevo
  if (!usuarioTenant || !usuarioTenant.activo) {
    // Solo redirigir a onboarding si no es ya esa ruta
    if (!pathname.startsWith("/onboarding")) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Inyectar tenantId y datos del usuario en los headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-tenant-id",   usuarioTenant.tenantId);
  requestHeaders.set("x-user-id",     user.id);
  requestHeaders.set("x-user-rol",    usuarioTenant.rol);
  requestHeaders.set("x-user-nombre", usuarioTenant.nombre);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // Pasar las cookies de Supabase a la respuesta
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie.name, cookie.value, cookie);
  });

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
