// app/api/configuracion/plan/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

// GET /api/configuracion/plan
export async function GET() {
  try {
    const { tenantId } = await getTenantContext();

    const [tenant, suscripcion] = await Promise.all([
      prisma.tenant.findUnique({
        where:  { id: tenantId },
        select: { plan: true },
      }),
      prisma.suscripcion.findUnique({
        where:  { tenantId },
        select: {
          plan: true, estado: true,
          proximoVencimiento: true, createdAt: true,
          mpPreapprovalId: true,
        },
      }),
    ]);

    if (!tenant) return NextResponse.json({ ok: false, error: "Comercio no encontrado" }, { status: 404 });

    type EstadoNorm = "ACTIVA" | "VENCIDA" | "CANCELADA" | "TRIAL";
    const estadoMap: Record<string, EstadoNorm> = {
      active:    "ACTIVA",
      paused:    "VENCIDA",
      cancelled: "CANCELADA",
    };

    let estado: EstadoNorm  = "TRIAL";
    let diasRestantes: number | null = null;

    if (suscripcion) {
      estado = estadoMap[suscripcion.estado] ?? "TRIAL";

      if (suscripcion.proximoVencimiento) {
        const hoy  = new Date();
        const venc = new Date(suscripcion.proximoVencimiento);
        diasRestantes = Math.max(0, Math.ceil((venc.getTime() - hoy.getTime()) / 86_400_000));
        if (diasRestantes === 0 && estado === "ACTIVA") estado = "VENCIDA";
      }
    } else {
      estado = tenant.plan === "FREE" ? "TRIAL" : "ACTIVA";
    }

    return NextResponse.json({
      ok: true,
      data: {
        plan:             suscripcion?.plan    ?? tenant.plan,
        estado,
        fechaInicio:      suscripcion?.createdAt          ?? null,
        fechaVencimiento: suscripcion?.proximoVencimiento ?? null,
        diasRestantes,
        tieneMercadoPago: !!suscripcion?.mpPreapprovalId,
      },
    });
  } catch (err: any) {
    if (err.message === "No autenticado") return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    console.error("[GET /api/configuracion/plan]", err);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";