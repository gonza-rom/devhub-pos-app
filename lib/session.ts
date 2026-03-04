// lib/session.ts
// ACTUALIZADO: agrega `plan` y `planVenceAt` al payload del JWT
// para que el middleware pueda bloquear tenants vencidos sin queries a DB.

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import type { RolTenant } from "@/types";

const COOKIE_NAME  = "devhub-tenant-session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 días

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET no está definido en .env");
  return new TextEncoder().encode(secret);
}

// ── Tipos ─────────────────────────────────────────────────────

export type TenantSessionPayload = {
  tenantId:    string;
  usuarioId:   string;
  rol:         RolTenant;
  nombre:      string;
  // ✅ Nuevos campos para bloqueo de plan en middleware (sin queries a DB)
  plan:        "FREE" | "PRO" | "ENTERPRISE";
  planVenceAt: number | null; // unix timestamp en ms, null = sin vencimiento
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
    return null;
  }
}

// ── Setear la cookie en una Response ─────────────────────────

export function setTenantCookie(response: NextResponse, token: string): void {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   COOKIE_MAX_AGE,
    path:     "/",
  });
}

// ── Borrar la cookie (logout) ─────────────────────────────────

export function deleteTenantCookie(response: NextResponse): void {
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   0,
    path:     "/",
  });
}

// ── Leer desde Server Components ─────────────────────────────

export async function getTenantSessionFromCookies(): Promise<TenantSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verificarTenantSession(token);
}

// ── Leer desde el middleware (Edge Runtime) ───────────────────

export async function getTenantSessionFromRequest(
  request: NextRequest
): Promise<TenantSessionPayload | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verificarTenantSession(token);
}

export { COOKIE_NAME };