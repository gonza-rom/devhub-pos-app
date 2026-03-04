// app/api/plan/uso/route.ts
// Devuelve el uso actual del tenant + días restantes del trial FREE

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";
import { PLAN_LIMITES } from "@/lib/utils";

const TRIAL_DIAS = 7;

export async function GET() {
  try {
    const { tenantId } = await getTenantContext();

    const tenant = await prisma.tenant.findUnique({
      where:  { id: tenantId },
      select: { plan: true, createdAt: true },
    });

    if (!tenant) return NextResponse.json({ ok: false, error: "No encontrado" }, { status: 404 });

    const limites = PLAN_LIMITES[tenant.plan];

    const [productosActivos, usuariosActivos] = await Promise.all([
      prisma.producto.count({ where: { tenantId, activo: true } }),
      prisma.usuarioTenant.count({ where: { tenantId, activo: true } }),
    ]);

    // Días restantes del trial (solo FREE)
    let trialDiasRestantes: number | null = null;
    let trialVencidoAt: string | null = null;

    if (tenant.plan === "FREE") {
      const msDesdeRegistro = Date.now() - new Date(tenant.createdAt).getTime();
      const diasUsados      = Math.floor(msDesdeRegistro / 86_400_000);
      trialDiasRestantes    = Math.max(0, TRIAL_DIAS - diasUsados);
      const vence           = new Date(tenant.createdAt);
      vence.setDate(vence.getDate() + TRIAL_DIAS);
      trialVencidoAt        = vence.toISOString();
    }

    return NextResponse.json({
      ok: true,
      data: {
        plan: tenant.plan,
        uso: {
          productos: productosActivos,
          usuarios:  usuariosActivos,
        },
        limites: {
          productos:           limites.productos           === Infinity ? null : limites.productos,
          usuarios:            limites.usuarios            === Infinity ? null : limites.usuarios,
          historialDias:       7, // FREE siempre 7 días
          imagenesPorProducto: limites.imagenesPorProducto === Infinity ? null : limites.imagenesPorProducto,
        },
        trial: {
          diasRestantes: trialDiasRestantes,
          vencidoAt:     trialVencidoAt,
          vencido:       trialDiasRestantes === 0,
        },
      },
    });

  } catch (err: any) {
    console.error("[GET /api/plan/uso]", err);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";