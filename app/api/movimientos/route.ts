// app/api/movimientos/route.ts
// ⚠️  Este archivo REEMPLAZA al route.ts existente en el proyecto.
//     El route.ts actual ya tenía GET y POST pero le faltaban filtros
//     de fecha y el stockAnterior en el POST. Acá está la versión completa.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";
import type { CreateMovimientoInput } from "@/types";

// ── GET /api/movimientos ───────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await getTenantContext();
    const { searchParams } = new URL(req.url);

    const page       = Math.max(1, parseInt(searchParams.get("page")     ?? "1"));
    const pageSize   = Math.min(50, parseInt(searchParams.get("pageSize") ?? "30"));
    const skip       = (page - 1) * pageSize;
    const productoId = searchParams.get("productoId");
    const tipo       = searchParams.get("tipo");
    const desde      = searchParams.get("desde");
    const hasta      = searchParams.get("hasta");
    const cancelado  = searchParams.get("cancelado"); // "true" | "false" | null (todos)

    const where: any = { tenantId };

    if (productoId) where.productoId = productoId;
    if (tipo)       where.tipo = tipo;
    if (cancelado === "true")  where.cancelado = true;
    if (cancelado === "false") where.cancelado = false;

    if (desde || hasta) {
      where.createdAt = {
        ...(desde && { gte: new Date(desde) }),
        ...(hasta && { lte: new Date(hasta + "T23:59:59") }),
      };
    }

    const [movimientos, total] = await Promise.all([
      prisma.movimiento.findMany({
        where,
        include: {
          producto: {
            select: {
              id: true,
              nombre: true,
              codigoProducto: true,
              stock: true,
              stockMinimo: true,
              categoria: { select: { id: true, nombre: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.movimiento.count({ where }),
    ]);

    return NextResponse.json({
      ok: true,
      data: movimientos,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasNext: page < Math.ceil(total / pageSize),
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("[GET /api/movimientos]", error);
    return NextResponse.json(
      { ok: false, error: "Error al obtener movimientos" },
      { status: 500 }
    );
  }
}

// ── POST /api/movimientos ──────────────────────────────────────────────────
// Solo ENTRADA, SALIDA y AJUSTE manuales.
// Las VENTA las crea automáticamente /api/ventas.

export async function POST(req: NextRequest) {
  try {
    const { tenantId, usuarioId, rol } = await getTenantContext();

    if (rol === "EMPLEADO") {
      return NextResponse.json(
        { ok: false, error: "Sin permisos para esta acción" },
        { status: 403 }
      );
    }

    const body: CreateMovimientoInput = await req.json();
    const { productoId, tipo, cantidad, motivo } = body;

    if (!productoId || !tipo || !cantidad) {
      return NextResponse.json(
        { ok: false, error: "Faltan campos requeridos: productoId, tipo, cantidad" },
        { status: 400 }
      );
    }

    if (!["ENTRADA", "SALIDA", "AJUSTE"].includes(tipo)) {
      return NextResponse.json(
        { ok: false, error: "Tipo debe ser ENTRADA, SALIDA o AJUSTE" },
        { status: 400 }
      );
    }

    if (cantidad <= 0) {
      return NextResponse.json(
        { ok: false, error: "La cantidad debe ser mayor a 0" },
        { status: 400 }
      );
    }

    // Obtener nombre del usuario para el snapshot
    const usuarioTenant = await prisma.usuarioTenant.findUnique({
      where: { supabaseId: usuarioId },
      select: { nombre: true },
    });

    const movimiento = await prisma.$transaction(async (tx) => {
      const producto = await tx.producto.findFirst({
        where: { id: productoId, tenantId, activo: true },
      });

      if (!producto) throw new Error("Producto no encontrado");

      if (tipo === "SALIDA" && producto.stock < cantidad) {
        throw new Error(
          `Stock insuficiente. Disponible: ${producto.stock}, pedido: ${cantidad}`
        );
      }

      const delta             = tipo === "ENTRADA" ? cantidad : -cantidad;
      const productoActualizado = await tx.producto.update({
        where: { id: productoId },
        data:  { stock: { increment: delta } },
      });

      return tx.movimiento.create({
        data: {
          tenantId,
          productoId,
          productoNombre:  producto.nombre,
          tipo:            tipo as any,
          cantidad,
          stockAnterior:   producto.stock,
          stockResultante: productoActualizado.stock,
          motivo:          motivo?.trim() || null,
          usuarioId,
          usuarioNombre:   usuarioTenant?.nombre ?? null,
        },
        include: {
          producto: {
            select: {
              id: true, nombre: true, codigoProducto: true,
              stock: true, stockMinimo: true,
              categoria: { select: { id: true, nombre: true } },
            },
          },
        },
      });
    });

    return NextResponse.json({ ok: true, data: movimiento }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/movimientos]", error);
    const esNegocio =
      error.message?.includes("Stock insuficiente") ||
      error.message?.includes("no encontrado");
    return NextResponse.json(
      { ok: false, error: error.message ?? "Error al registrar movimiento" },
      { status: esNegocio ? 400 : 500 }
    );
  }
}

export const dynamic = "force-dynamic";