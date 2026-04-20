// app/api/ventas/[id]/reactivar/route.ts
// POST /api/ventas/:id/reactivar
// Reactiva una venta cancelada, descuenta el stock y recrea el movimiento de caja

import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId, usuarioId } = await getTenantContext();
    const { id } = await params;

    // Verificar que la venta existe y pertenece al tenant
    const venta = await prisma.venta.findFirst({
      where: { id, tenantId },
      include: {
        items: {
          include: { producto: true },
        },
      },
    });

    if (!venta) {
      return NextResponse.json(
        { ok: false, error: "Venta no encontrada" },
        { status: 404 }
      );
    }

    if (!venta.cancelado) {
      return NextResponse.json(
        { ok: false, error: "La venta no está cancelada" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Reactivar la venta
      const ventaReactivada = await tx.venta.update({
        where: { id },
        data: {
          cancelado:         false,
          canceladoAt:       null,
          motivoCancelacion: null,
        },
      });

      // 2. Descontar stock de cada producto (inverso de cancelar)
      for (const item of venta.items) {
        if (!item.productoId) continue;

        const producto = await tx.producto.findUnique({
          where:  { id: item.productoId },
          select: { stock: true, nombre: true },
        });

        if (!producto) continue;

        const stockAnterior  = producto.stock;
        const nuevoStock     = Math.max(0, stockAnterior - item.cantidad);

        await tx.producto.update({
          where: { id: item.productoId },
          data:  { stock: nuevoStock },
        });

        // Movimiento de salida por reactivación
        await tx.movimiento.create({
          data: {
            tenantId,
            productoId:      item.productoId,
            productoNombre:  producto.nombre,
            tipo:            "SALIDA",
            cantidad:        item.cantidad,
            stockAnterior,
            stockResultante: nuevoStock,
            motivo:          `Reactivación de venta #${id.slice(0, 8)}`,
            usuarioId,
            ventaId:         id,
            cancelado:       false,
          },
        });
      }

      // 3. Recrear movimiento de caja si hay una caja abierta
      const cajaAbierta = await tx.caja.findFirst({
        where:   { tenantId, estado: "ABIERTA" },
        orderBy: { abiertaAt: "desc" },
      });

      if (cajaAbierta) {
        await tx.movimientoCaja.create({
          data: {
            tenantId,
            cajaId:      cajaAbierta.id,
            ventaId:     id,
            tipo:        "INGRESO",
            monto:       venta.total,
            metodoPago:  venta.metodoPago,
            descripcion: `Reactivación de venta #${id.slice(0, 8)}`,
          },
        });
      }

      return ventaReactivada;
    });

    return NextResponse.json({
      ok:      true,
      data:    result,
      message: "Venta reactivada, stock descontado y caja actualizada",
    });
  } catch (error: any) {
    console.error("Error reactivando venta:", error);
    return NextResponse.json(
      { ok: false, error: "Error al reactivar la venta", detalle: error.message },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";