// Crear: app/api/caja/saldo-sugerido/route.ts
 
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";
 
export async function GET() {
  try {
    const { tenantId } = await getTenantContext();
 
    const ultimaCaja = await prisma.caja.findFirst({
      where: { tenantId, estado: "CERRADA" },
      select: { 
        saldoContado: true,
        cerradaAt: true,
        usuarioNombre: true,
      },
      orderBy: { cerradaAt: "desc" },
    });
 
    return NextResponse.json({ 
      ok: true, 
      saldoSugerido: ultimaCaja?.saldoContado ?? null,
      ultimaCaja: ultimaCaja ? {
        saldoContado: ultimaCaja.saldoContado,
        fecha: ultimaCaja.cerradaAt,
        usuario: ultimaCaja.usuarioNombre,
      } : null,
    });
  } catch (error) {
    console.error("[GET /api/caja/saldo-sugerido]", error);
    return NextResponse.json({ ok: false, error: "Error" }, { status: 500 });
  }
}
 
export const dynamic = "force-dynamic";