// lib/session.ts
// Firma y verifica la cookie de sesión del tenant.
// Usa `jose` (JWT puro) que es compatible con Edge Runtime.
//
// ¿Por qué una cookie propia y no solo la de Supabase?
// La cookie de Supabase solo tiene el supabaseId.
// Nosotros necesitamos tenantId + rol en el middleware (Edge Runtime)
// sin poder hacer queries a Prisma. Entonces los guardamos firmados en
// una cookie JWT separada que el middleware puede leer y verificar.

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import type { RolTenant } from "@/types";

// ── Constantes ────────────────────────────────────────────────

const COOKIE_NAME = "devhub-tenant-session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 días en segundos

// La clave secreta para firmar el JWT.
// IMPORTANTE: agregar SESSION_SECRET al .env con un string random largo.
// Generalo con: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET no está definido en .env");
  return new TextEncoder().encode(secret);
}

// ── Tipos ─────────────────────────────────────────────────────

export type TenantSessionPayload = {
  tenantId: string;
  usuarioId: string;   // supabaseId
  rol: RolTenant;
  nombre: string;
};

// ── Crear y firmar el JWT ─────────────────────────────────────

export async function crearTenantSession(
  payload: TenantSessionPayload
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

// ── Verificar y decodificar el JWT ────────────────────────────

export async function verificarTenantSession(
  token: string
): Promise<TenantSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as TenantSessionPayload;
  } catch {
    // Token inválido, expirado o corrupto
    return null;
  }
}

// ── Setear la cookie en una Response (para API Routes) ────────

export function setTenantCookie(
  response: NextResponse,
  token: string
): void {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,       // No accesible desde JavaScript del browser
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

// ── Borrar la cookie (logout) ─────────────────────────────────

export function deleteTenantCookie(response: NextResponse): void {
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}

// ── Leer la cookie desde Server Components ────────────────────
// (No usar en middleware — ahí se lee directo del request)

export async function getTenantSessionFromCookies(): Promise<TenantSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verificarTenantSession(token);
}

// ── Leer la cookie desde el middleware (Edge Runtime) ─────────

export async function getTenantSessionFromRequest(
  request: NextRequest
): Promise<TenantSessionPayload | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verificarTenantSession(token);
}

export { COOKIE_NAME };