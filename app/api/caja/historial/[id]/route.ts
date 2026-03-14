// app/api/caja/historial/[id]/route.ts
// PATCH - Editar caja cerrada
// DELETE - Eliminar caja cerrada

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

// ══════════════════════════════════════════════════════════════════════════════
// PATCH - Editar caja cerrada (saldoContado, observaciones)
// ══════════════════════════════════════════════════════════════════════════════

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await getTenantContext();
    const { id } = await params;
    const { saldoContado, observaciones } = await req.json();

    // Verificar que la caja existe y está cerrada
    const caja = await prisma.caja.findFirst({
      where: { id, tenantId, estado: "CERRADA" },
      select: { id: true, saldoFinal: true },
    });

    if (!caja) {
      return NextResponse.json(
        { ok: false, error: "Caja no encontrada o aún abierta" },
        { status: 404 }
      );
    }

    // Validar saldoContado
    if (saldoContado !== undefined && (isNaN(saldoContado) || saldoContado < 0)) {
      return NextResponse.json(
        { ok: false, error: "Saldo contado inválido" },
        { status: 400 }
      );
    }

    // Recalcular diferencia si se cambia saldoContado
    const nuevaDiferencia = saldoContado !== undefined
      ? saldoContado - (caja.saldoFinal || 0)
      : undefined;

    const cajaActualizada = await prisma.caja.update({
      where: { id },
      data: {
        ...(saldoContado !== undefined && { 
          saldoContado, 
          diferencia: nuevaDiferencia 
        }),
        ...(observaciones !== undefined && { 
          observaciones: observaciones.trim() || null 
        }),
      },
    });

    return NextResponse.json({ ok: true, data: cajaActualizada });
  } catch (error: any) {
    console.error("[PATCH /api/caja/historial/:id]", error);
    return NextResponse.json(
      { ok: false, error: "Error al actualizar caja" },
      { status: 500 }
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// DELETE - Eliminar caja cerrada y todos sus movimientos
// ══════════════════════════════════════════════════════════════════════════════

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await getTenantContext();
    const { id } = await params;

    // Verificar que la caja existe y está cerrada
    const caja = await prisma.caja.findFirst({
      where: { id, tenantId, estado: "CERRADA" },
      select: { id: true },
    });

    if (!caja) {
      return NextResponse.json(
        { ok: false, error: "Caja no encontrada o aún abierta" },
        { status: 404 }
      );
    }

    // Eliminar en transacción (movimientos primero, luego caja)
    await prisma.$transaction(async (tx) => {
      // 1. Eliminar todos los movimientos de la caja
      await tx.movimientoCaja.deleteMany({
        where: { cajaId: id },
      });

      // 2. Eliminar la caja
      await tx.caja.delete({
        where: { id },
      });
    });

    return NextResponse.json({ 
      ok: true, 
      message: "Caja eliminada exitosamente" 
    });
  } catch (error: any) {
    console.error("[DELETE /api/caja/historial/:id]", error);
    return NextResponse.json(
      { ok: false, error: "Error al eliminar caja" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";