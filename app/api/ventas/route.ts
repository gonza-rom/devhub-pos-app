// app/api/ventas/route.ts
// OPTIMIZADO: agrega revalidateTag("dashboard") al registrar venta

import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";
import type { CreateVentaInput } from "@/types";

// GET /api/ventas
export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await getTenantContext();
    const { searchParams } = new URL(req.url);

    const page  = parseInt(searchParams.get("page")  ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const desde = searchParams.get("desde");
    const hasta = searchParams.get("hasta");

    const where = {
      tenantId,
      ...(desde || hasta ? {
        createdAt: {
          ...(desde && { gte: new Date(desde) }),
          ...(hasta && { lte: new Date(hasta + "T23:59:59") }),
        },
      } : {}),
    };

    const [ventas, total] = await Promise.all([
      prisma.venta.findMany({
        where,
        include: {
          items: {
            include: {
              producto: { select: { id: true, nombre: true, imagen: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip:    (page - 1) * limit,
        take:    limit,
      }),
      prisma.venta.count({ where }),
    ]);

    return NextResponse.json({
      ok:   true,
      data: ventas,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });

  } catch (error) {
    console.error("[GET /api/ventas]", error);
    return NextResponse.json({ ok: false, error: "Error al obtener ventas" }, { status: 500 });
  }
}

// POST /api/ventas
export async function POST(req: NextRequest) {
  try {
    const { tenantId, usuarioId } = await getTenantContext();
    const body: CreateVentaInput = await req.json();
    const { items, metodoPago, descuento = 0, clienteNombre, clienteDni, observaciones } = body;

    if (!items || items.length === 0)
      return NextResponse.json({ ok: false, error: "La venta debe tener al menos un producto" }, { status: 400 });
    if (!metodoPago)
      return NextResponse.json({ ok: false, error: "El método de pago es requerido" }, { status: 400 });

    const usuarioTenant = await prisma.usuarioTenant.findUnique({
      where:  { supabaseId: usuarioId },
      select: { nombre: true },
    });

    const venta = await prisma.$transaction(async (tx) => {
      let subtotal = 0;
      const itemsData: {
        productoId: string; nombre: string; cantidad: number;
        precioUnit: number; subtotal: number;
      }[] = [];

      for (const item of items) {
        const producto = await tx.producto.findFirst({
          where: { id: item.productoId, tenantId, activo: true },
        });
        if (!producto) throw new Error(`Producto ${item.productoId} no encontrado`);
        if (producto.stock < item.cantidad) {
          throw new Error(
            `Stock insuficiente para "${producto.nombre}". Disponible: ${producto.stock}, pedido: ${item.cantidad}`
          );
        }

        const itemSubtotal = item.precioUnit * item.cantidad;
        subtotal += itemSubtotal;
        itemsData.push({
          productoId: producto.id,
          nombre:     producto.nombre,
          cantidad:   item.cantidad,
          precioUnit: item.precioUnit,
          subtotal:   itemSubtotal,
        });

        await tx.producto.update({
          where: { id: producto.id },
          data:  { stock: { decrement: item.cantidad } },
        });
      }

      const total = subtotal - descuento;

      const ventaCreada = await tx.venta.create({
        data: {
          tenantId,
          total, subtotal, descuento, metodoPago,
          clienteNombre: clienteNombre?.trim() || null,
          clienteDni:    clienteDni?.trim()    || null,
          observaciones: observaciones?.trim() || null,
          usuarioId,
          usuarioNombre: usuarioTenant?.nombre ?? null,
          createdAt:     new Date(),
          items: { create: itemsData },
        },
        include: { items: true },
      });

      const cajaAbierta = await tx.caja.findFirst({
        where: { tenantId, estado: "ABIERTA" },
      });
      if (cajaAbierta) {
        await tx.movimientoCaja.create({
          data: {
            tenantId,
            cajaId:       cajaAbierta.id,
            tipo:         metodoPago?.toUpperCase() === "EFECTIVO" ? "VENTA_EFECTIVO" : "VENTA_VIRTUAL",
            monto:        total,
            descripcion:  `Venta #${ventaCreada.id.slice(-6).toUpperCase()}`,
            ventaId:      ventaCreada.id,
            metodoPago,
            usuarioId,
            usuarioNombre: usuarioTenant?.nombre ?? null,
          },
        });
      }

      for (const item of itemsData) {
        const producto = await tx.producto.findUnique({ where: { id: item.productoId } });
        await tx.movimiento.create({
          data: {
            tenantId,
            productoId:      item.productoId,
            productoNombre:  item.nombre,
            tipo:            "VENTA",
            cantidad:        item.cantidad,
            stockResultante: producto?.stock ?? 0,
            ventaId:         ventaCreada.id,
            usuarioId,
            usuarioNombre:   usuarioTenant?.nombre ?? null,
            createdAt:       new Date(),
          },
        });
      }

      return ventaCreada;
    });

    // ✅ Invalidar dashboard — ventas del día y del mes cambiaron
    revalidateTag("dashboard");
    revalidateTag(`tenant-${tenantId}`);

    return NextResponse.json({ ok: true, data: venta }, { status: 201 });

  } catch (error: any) {
    console.error("[POST /api/ventas]", error);
    const esNegocio =
      error.message?.includes("Stock insuficiente") ||
      error.message?.includes("no encontrado");
    return NextResponse.json(
      { ok: false, error: error.message ?? "Error al registrar venta" },
      { status: esNegocio ? 400 : 500 }
    );
  }
}

export const dynamic = "force-dynamic";