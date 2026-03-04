// app/api/movimientos/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

type Params = { params: Promise<{ id: string }> };

// ── PUT /api/movimientos/:id — Editar cantidad y motivo ───────────────────
// Solo PROPIETARIO y ADMINISTRADOR pueden editar.
// Ajusta el stock automáticamente según la diferencia.

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { tenantId, usuarioId, rol } = await getTenantContext();
    const { id } = await params;

    if (rol === "EMPLEADO") {
      return NextResponse.json(
        { ok: false, error: "Solo un administrador puede editar movimientos" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { cantidad, motivo } = body;

    if (!cantidad || cantidad <= 0) {
      return NextResponse.json(
        { ok: false, error: "La cantidad debe ser mayor a 0" },
        { status: 400 }
      );
    }

    // Verificar que el movimiento pertenece al tenant
    const original = await prisma.movimiento.findFirst({
      where: { id, tenantId },
      include: { producto: true },
    });

    if (!original) {
      return NextResponse.json(
        { ok: false, error: "Movimiento no encontrado" },
        { status: 404 }
      );
    }

    if (original.cancelado) {
      return NextResponse.json(
        { ok: false, error: "No se puede editar un movimiento cancelado" },
        { status: 400 }
      );
    }

    // Calcular ajuste de stock por la diferencia de cantidad
    const cantidadNueva    = parseInt(String(cantidad));
    const diferencia       = cantidadNueva - original.cantidad;
    const esEntrada        = original.tipo === "ENTRADA";
    const deltaStock       = esEntrada ? diferencia : -diferencia;
    const nuevoStock       = original.producto.stock + deltaStock;

    if (nuevoStock < 0) {
      return NextResponse.json(
        { ok: false, error: `Stock insuficiente. Quedaría en ${nuevoStock}` },
        { status: 400 }
      );
    }

    const movimientoActualizado = await prisma.$transaction(async (tx) => {
      const movActualizado = await tx.movimiento.update({
        where: { id },
        data: {
          cantidad:        cantidadNueva,
          motivo:          motivo !== undefined ? (motivo?.trim() || null) : original.motivo,
          stockResultante: nuevoStock,
        },
        include: {
          producto: {
            select: {
              id: true, nombre: true, stock: true,
              categoria: { select: { id: true, nombre: true } },
            },
          },
        },
      });

      if (diferencia !== 0) {
        await tx.producto.update({
          where: { id: original.productoId },
          data:  { stock: nuevoStock },
        });
      }

      return movActualizado;
    });

    return NextResponse.json({ ok: true, data: movimientoActualizado });
  } catch (error) {
    console.error("[PUT /api/movimientos/:id]", error);
    return NextResponse.json(
      { ok: false, error: "Error al editar movimiento" },
      { status: 500 }
    );
  }
}

// ── PATCH /api/movimientos/:id — Cancelar movimiento ─────────────────────
// Revierte el stock y marca el movimiento como cancelado.
// Solo PROPIETARIO y ADMINISTRADOR pueden cancelar.

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { tenantId, usuarioId, rol } = await getTenantContext();
    const { id } = await params;

    if (rol === "EMPLEADO") {
      return NextResponse.json(
        { ok: false, error: "Solo un administrador puede cancelar movimientos" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const motivoCancelacion =
      body.motivoCancelacion?.trim() || "Cancelado por administrador";

    // Verificar que el movimiento pertenece al tenant
    const movimiento = await prisma.movimiento.findFirst({
      where: { id, tenantId },
      include: { producto: true },
    });

    if (!movimiento) {
      return NextResponse.json(
        { ok: false, error: "Movimiento no encontrado" },
        { status: 404 }
      );
    }

    if (movimiento.cancelado) {
      return NextResponse.json(
        { ok: false, error: "El movimiento ya fue cancelado" },
        { status: 409 }
      );
    }

    // Invertir la operación original para restaurar el stock
    const delta     = movimiento.tipo === "ENTRADA" ? -movimiento.cantidad : movimiento.cantidad;
    const nuevoStock = movimiento.producto.stock + delta;

    if (nuevoStock < 0) {
      return NextResponse.json(
        {
          ok: false,
          error: `No se puede cancelar: el stock quedaría en ${nuevoStock}`,
        },
        { status: 400 }
      );
    }

    const [movimientoActualizado] = await prisma.$transaction([
      prisma.movimiento.update({
        where: { id },
        data: {
          cancelado:         true,
          motivoCancelacion,
          canceladoPor:      usuarioId,
          canceladoAt:       new Date(),
        },
        include: {
          producto: {
            select: {
              id: true, nombre: true, stock: true,
              categoria: { select: { id: true, nombre: true } },
            },
          },
        },
      }),
      prisma.producto.update({
        where: { id: movimiento.productoId },
        data:  { stock: nuevoStock },
      }),
    ]);

    return NextResponse.json({ ok: true, data: movimientoActualizado });
  } catch (error) {
    console.error("[PATCH /api/movimientos/:id]", error);
    return NextResponse.json(
      { ok: false, error: "Error al cancelar movimiento" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";