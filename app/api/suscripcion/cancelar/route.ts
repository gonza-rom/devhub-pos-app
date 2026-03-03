// app/api/suscripcion/cancelar/route.ts

import { NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { cancelPreapproval } from "@/lib/mercadopago";

export async function POST() {
  try {
    const { tenantId, rol } = await getTenantContext();

    if (rol !== "PROPIETARIO") {
      return NextResponse.json({ ok: false, error: "Solo el propietario puede cancelar" }, { status: 403 });
    }

    const suscripcion = await prisma.suscripcion.findUnique({ where: { tenantId } });
    if (!suscripcion?.mpPreapprovalId) {
      return NextResponse.json({ ok: false, error: "No hay suscripción activa" }, { status: 404 });
    }

    // Cancelar en MP
    await cancelPreapproval(suscripcion.mpPreapprovalId);

    // Actualizar en DB — el tenant sigue activo hasta que venza (no cortamos inmediatamente)
    await prisma.suscripcion.update({
      where: { tenantId },
      data: { estado: "cancelled" },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[suscripcion/cancelar]", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}