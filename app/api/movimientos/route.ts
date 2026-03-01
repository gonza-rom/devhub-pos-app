// app/api/movimientos/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";
import type { CreateMovimientoInput } from "@/types";

// GET /api/movimientos
export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await getTenantContext();
    const { searchParams } = new URL(req.url);

    const page       = parseInt(searchParams.get("page") ?? "1");
    const limit      = parseInt(searchParams.get("limit") ?? "30");
    const productoId = searchParams.get("productoId");
    const tipo       = searchParams.get("tipo");
    const desde      = searchParams.get("desde");
    const hasta      = searchParams.get("hasta");

    const where = {
      tenantId,
      cancelado: false,
      ...(productoId && { productoId }),
      ...(tipo && { tipo: tipo as any }),
      ...(desde || hasta ? {
        createdAt: {
          ...(desde && { gte: new Date(desde) }),
          ...(hasta && { lte: new Date(hasta + "T23:59:59") }),
        },
      } : {}),
    };

    const [movimientos, total] = await Promise.all([
      prisma.movimiento.findMany({
        where,
        include: {
          producto: { select: { id: true, nombre: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.movimiento.count({ where }),
    ]);

    return NextResponse.json({
      ok: true,
      data: movimientos,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });

  } catch (error) {
    console.error("[GET /api/movimientos]", error);
    return NextResponse.json({ ok: false, error: "Error al obtener movimientos" }, { status: 500 });
  }
}

// POST /api/movimientos - Registrar entrada/salida/ajuste manual
export async function POST(req: NextRequest) {
  try {
    const { tenantId, usuarioId, rol } = await getTenantContext();

    // Solo ADMINISTRADOR y PROPIETARIO pueden crear movimientos manuales
    if (rol === "EMPLEADO") {
      return NextResponse.json({ ok: false, error: "Sin permisos para esta acción" }, { status: 403 });
    }

    const body: CreateMovimientoInput = await req.json();
    const { productoId, tipo, cantidad, motivo } = body;

    if (!productoId || !tipo || !cantidad || cantidad <= 0) {
      return NextResponse.json({ ok: false, error: "Datos inválidos" }, { status: 400 });
    }

    const usuarioTenant = await prisma.usuarioTenant.findUnique({
      where: { supabaseId: usuarioId },
      select: { nombre: true },
    });

    const movimiento = await prisma.$transaction(async (tx) => {
      const producto = await tx.producto.findFirst({
        where: { id: productoId, tenantId, activo: true },
      });

      if (!producto) throw new Error("Producto no encontrado");

      // Para salida, verificar stock suficiente
      if (tipo === "SALIDA" && producto.stock < cantidad) {
        throw new Error(`Stock insuficiente. Disponible: ${producto.stock}`);
      }

      // Actualizar stock según tipo
      const delta = tipo === "ENTRADA" ? cantidad : -cantidad;
      const productoActualizado = await tx.producto.update({
        where: { id: productoId },
        data:  { stock: { increment: delta } },
      });

      // Registrar el movimiento
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
          createdAt:       new Date(),
        },
        include: { producto: { select: { id: true, nombre: true } } },
      });
    });

    return NextResponse.json({ ok: true, data: movimiento }, { status: 201 });

  } catch (error: any) {
    console.error("[POST /api/movimientos]", error);
    return NextResponse.json(
      { ok: false, error: error.message ?? "Error al registrar movimiento" },
      { status: 400 }
    );
  }
}
