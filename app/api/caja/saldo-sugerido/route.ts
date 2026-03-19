// app/api/caja/saldo-sugerido/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

export async function GET() {
  try {
    const { tenantId } = await getTenantContext();

    const ultimaCaja = await prisma.caja.findFirst({
      where: { tenantId, estado: "CERRADA" },
      select: {
        saldoFinal: true,   // fondo de cambio que quedó en caja
        cerradaAt: true,
        usuarioNombre: true,
      },
      orderBy: { cerradaAt: "desc" },
    });

    return NextResponse.json({
      ok: true,
      saldoSugerido: ultimaCaja?.saldoFinal ?? null,
      ultimaCaja: ultimaCaja ? {
        saldoContado: ultimaCaja.saldoFinal,
        fecha:        ultimaCaja.cerradaAt,
        usuario:      ultimaCaja.usuarioNombre,
      } : null,
    });
  } catch (error) {
    console.error("[GET /api/caja/saldo-sugerido]", error);
    return NextResponse.json({ ok: false, error: "Error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";