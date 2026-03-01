// lib/tenant.ts
// Helpers para trabajar con el tenant en API Routes y Server Components.
//
// ARQUITECTURA:
// El middleware inyecta x-tenant-id, x-user-id, x-user-rol y x-user-nombre
// desde la cookie firmada (sin queries a DB). Acá solo leemos esos headers.

import { headers } from "next/headers";
import { NextRequest } from "next/server";
import { prisma } from "./prisma";
import { PLAN_LIMITES } from "./utils";

// ── Obtener el contexto completo desde los headers del middleware ──────────

export async function getTenantContext(): Promise<{
  tenantId: string;
  usuarioId: string;
  rol: string;
  nombreUsuario: string;
}> {
  const headersList = await headers();
  const tenantId    = headersList.get("x-tenant-id");
  const usuarioId   = headersList.get("x-user-id");
  const rol         = headersList.get("x-user-rol");
  const nombre      = headersList.get("x-user-nombre");

  if (!tenantId || !usuarioId) throw new Error("No autenticado");

  return {
    tenantId,
    usuarioId,
    rol:           rol    ?? "EMPLEADO",
    nombreUsuario: nombre ?? "",
  };
}

// ── Shortcut: solo el tenantId ────────────────────────────────────────────

export async function getTenantId(): Promise<string> {
  const { tenantId } = await getTenantContext();
  return tenantId;
}

// ── Verificar si el tenant puede crear más productos (según su plan) ──────

export async function verificarLimiteProductos(tenantId: string): Promise<void> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      plan: true,
      _count: { select: { productos: { where: { activo: true } } } },
    },
  });

  if (!tenant) throw new Error("Tenant no encontrado");

  const limite = PLAN_LIMITES[tenant.plan].productos;
  const actual = tenant._count.productos;

  if (actual >= limite) {
    throw new Error(
      `Límite de productos alcanzado (${actual}/${limite}). Actualizá tu plan para agregar más.`
    );
  }
}

// ── Obtener tenant desde un request (para webhooks u otros casos) ─────────

export async function getTenantFromRequest(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return null;

  return prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, nombre: true, plan: true, activo: true },
  });
}