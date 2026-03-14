// app/api/ventas/[id]/cancelar/route.ts
// POST /api/ventas/:id/cancelar
// Cancela una venta, restaura el stock Y elimina el movimiento de caja

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
    const body = await req.json();
    const { motivoCancelacion } = body;

    // Verificar que la venta existe y pertenece al tenant
    const venta = await prisma.venta.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        items: {
          include: {
            producto: true,
          },
        },
      },
    });

    if (!venta) {
      return NextResponse.json(
        { ok: false, error: "Venta no encontrada" },
        { status: 404 }
      );
    }

    if (venta.cancelado) {
      return NextResponse.json(
        { ok: false, error: "La venta ya está cancelada" },
        { status: 400 }
      );
    }

    // Cancelar la venta en una transacción
    const result = await prisma.$transaction(async (tx) => {
      // 1. Marcar venta como cancelada
      const ventaCancelada = await tx.venta.update({
        where: { id },
        data: {
          cancelado: true,
          canceladoAt: new Date(),
          motivoCancelacion: motivoCancelacion || "Cancelado por administrador",
        },
      });

      // 2. Restaurar stock de cada producto
      for (const item of venta.items) {
        if (!item.productoId) continue; // Items manuales no tienen stock

        // Obtener stock actual
        const producto = await tx.producto.findUnique({
          where: { id: item.productoId },
          select: { stock: true, nombre: true },
        });

        if (!producto) continue;

        const stockAnterior = producto.stock;
        const nuevoStock = stockAnterior + item.cantidad;

        // Actualizar stock
        await tx.producto.update({
          where: { id: item.productoId },
          data: { stock: nuevoStock },
        });

        // Crear movimiento de ajuste (devuelve el stock)
        await tx.movimiento.create({
          data: {
            tenantId,
            productoId: item.productoId,
            productoNombre: producto.nombre,
            tipo: "ENTRADA",
            cantidad: item.cantidad,
            stockAnterior,
            stockResultante: nuevoStock,
            motivo: `Cancelación de venta #${id.slice(0, 8)}`,
            usuarioId: usuarioId,
            ventaId: id,
            cancelado: false,
          },
        });
      }

      // 3. ✨ NUEVO: Eliminar movimiento de caja si existe
      // Esto sincroniza la cancelación de la venta con la caja
      await tx.movimientoCaja.deleteMany({
        where: {
          tenantId,
          ventaId: id,
        },
      });

      return ventaCancelada;
    });

    return NextResponse.json({
      ok: true,
      data: result,
      message: "Venta cancelada, stock restaurado y movimiento de caja eliminado",
    });
  } catch (error: any) {
    console.error("Error cancelando venta:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Error al cancelar la venta",
        detalle: error.message,
      },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";