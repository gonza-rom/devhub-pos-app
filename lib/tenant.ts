// lib/tenant.ts
// Helpers para trabajar con el tenant en las API Routes
// El tenantId viene inyectado por el middleware en los headers

import { headers } from "next/headers";
import { NextRequest } from "next/server";
import { prisma } from "./prisma";
import { PlanTipo } from "@prisma/client";
import { PLAN_LIMITES } from "./utils";

// Obtener tenantId desde headers (uso en API Routes)
export async function getTenantId(): Promise<string> {
  const headersList = await headers();
  const tenantId = headersList.get("x-tenant-id");
  if (!tenantId) throw new Error("No autenticado o sin tenant");
  return tenantId;
}

// Obtener tenantId y rol desde headers
export async function getTenantContext(): Promise<{
  tenantId: string;
  usuarioId: string;
  rol: string;
}> {
  const headersList = await headers();
  const tenantId = headersList.get("x-tenant-id");
  const usuarioId = headersList.get("x-user-id");
  const rol = headersList.get("x-user-rol");

  if (!tenantId || !usuarioId) throw new Error("No autenticado");

  return { tenantId, usuarioId, rol: rol ?? "EMPLEADO" };
}

// Verificar si el tenant puede crear más productos (según su plan)
export async function verificarLimiteProductos(tenantId: string): Promise<void> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true, _count: { select: { productos: { where: { activo: true } } } } },
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

// Obtener tenant desde un request (para middleware o API Routes)
export async function getTenantFromRequest(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return null;

  return prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, nombre: true, plan: true, activo: true },
  });
}
