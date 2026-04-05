// app/api/ventas/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";
import { revalidateTag } from "next/cache";

// ── PATCH /api/ventas/:id ─────────────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId, usuarioId, nombreUsuario } = await getTenantContext();
    const { id } = await params;
    const body = await req.json();
    const { metodoPago } = body;

    if (!metodoPago) {
      return NextResponse.json(
        { ok: false, error: "metodoPago es requerido" },
        { status: 400 }
      );
    }

    const METODOS_VALIDOS = ["EFECTIVO", "DEBITO", "CREDITO", "TRANSFERENCIA", "QR", "MERCADOPAGO"];
    if (!METODOS_VALIDOS.includes(metodoPago.toUpperCase())) {
      return NextResponse.json(
        { ok: false, error: `Método de pago inválido. Opciones: ${METODOS_VALIDOS.join(", ")}` },
        { status: 400 }
      );
    }

    const venta = await prisma.venta.findFirst({
      where: { id, tenantId },
      select: { id: true, cancelado: true, metodoPago: true, total: true },
    });

    if (!venta) {
      return NextResponse.json({ ok: false, error: "Venta no encontrada" }, { status: 404 });
    }

    if (venta.cancelado) {
      return NextResponse.json(
        { ok: false, error: "No se puede editar una venta cancelada" },
        { status: 400 }
      );
    }

    const metodoPagoNormalizado = metodoPago.toUpperCase();

    if (venta.metodoPago.toUpperCase() === metodoPagoNormalizado) {
      return NextResponse.json(
        { ok: false, error: "El método de pago ya es el mismo" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Actualizar la venta
      const ventaActualizada = await tx.venta.update({
        where: { id },
        data: { metodoPago: metodoPagoNormalizado },
        select: { id: true, metodoPago: true, total: true, clienteNombre: true },
      });

      // 2. Buscar caja abierta
      const cajaAbierta = await tx.caja.findFirst({
        where: { tenantId, estado: "ABIERTA" },
        select: { id: true },
      });

      let cajaYaCerrada = false;

      if (cajaAbierta) {
        // Hay caja abierta — actualizar el movimiento si existe en ella
        const movimientoCaja = await tx.movimientoCaja.findFirst({
          where: { tenantId, ventaId: id, cajaId: cajaAbierta.id },
          select: { id: true },
        });

        if (movimientoCaja) {
          const nuevoTipo =
            metodoPagoNormalizado === "EFECTIVO" ? "VENTA_EFECTIVO" : "VENTA_VIRTUAL";

          await tx.movimientoCaja.update({
            where: { id: movimientoCaja.id },
            data: {
              tipo: nuevoTipo,
              metodoPago: metodoPagoNormalizado,
              usuarioId,
              usuarioNombre: nombreUsuario ?? null,
            },
          });
        }
        // Si no hay movimiento en la caja abierta (venta de otro turno),
        // verificar si está en una caja cerrada
        else {
          const movimientoEnCajaCerrada = await tx.movimientoCaja.findFirst({
            where: { tenantId, ventaId: id },
            select: { id: true },
          });
          if (movimientoEnCajaCerrada) cajaYaCerrada = true;
        }
      } else {
        // No hay caja abierta — verificar si el movimiento está en una caja cerrada
        const movimientoEnCajaCerrada = await tx.movimientoCaja.findFirst({
          where: { tenantId, ventaId: id },
          select: { id: true },
        });
        if (movimientoEnCajaCerrada) cajaYaCerrada = true;
      }

      return { ...ventaActualizada, cajaYaCerrada };
    });

    revalidateTag("dashboard");
    revalidateTag(`tenant-${tenantId}`);

    return NextResponse.json({
      ok: true,
      data: result,
      cajaYaCerrada: result.cajaYaCerrada,
      message: result.cajaYaCerrada
        ? "Método de pago actualizado. La caja donde se registró ya está cerrada y no se modificó."
        : "Método de pago actualizado correctamente",
    });
  } catch (error: any) {
    console.error("[PATCH /api/ventas/:id]", error);
    return NextResponse.json(
      { ok: false, error: error.message ?? "Error al actualizar la venta" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";