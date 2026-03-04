// app/api/suscripcion/estado/route.ts
// Devuelve el estado actual de la suscripción del tenant

import { NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const { tenantId } = await getTenantContext();

    const [tenant, suscripcion] = await Promise.all([
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { plan: true, activo: true },
      }),
      prisma.suscripcion.findUnique({ where: { tenantId } }),
    ]);

    if (!tenant) return NextResponse.json({ ok: false, error: "No encontrado" }, { status: 404 });

    const diasRestantes = suscripcion?.proximoVencimiento
      ? Math.ceil(
          (new Date(suscripcion.proximoVencimiento).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )
      : null;

    return NextResponse.json({
      ok: true,
      data: {
        plan: tenant.plan,
        estado: suscripcion?.estado ?? "sin_suscripcion",
        proximoVencimiento: suscripcion?.proximoVencimiento ?? null,
        diasRestantes,
        mpPreapprovalId: suscripcion?.mpPreapprovalId ?? null,
        puedeRenovar:
          suscripcion?.estado === "cancelled" ||
          suscripcion?.estado === "pending" ||
          !suscripcion,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";