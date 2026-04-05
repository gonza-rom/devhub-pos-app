// app/api/ventas/route.ts
// OPTIMIZADO:
// - GET: filtros adicionales (metodoPago, clienteNombre), select mínimo, sin N+1
// - POST: stockAnterior guardado correctamente, sin query extra de usuarioTenant

import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";
import type { CreateVentaInput } from "@/types";

// ── GET /api/ventas ────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await getTenantContext();
    const { searchParams } = new URL(req.url);

    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20")); // ✅ MAX 50
    const desde = searchParams.get("desde");
    const hasta = searchParams.get("hasta");
    const metodoPago = searchParams.get("metodoPago"); // ✅ NUEVO
    const busqueda = searchParams.get("busqueda") ?? ""; // ✅ NUEVO

    const where: any = { tenantId };

    if (desde || hasta) {
      where.createdAt = {
        ...(desde && { gte: new Date(desde) }),
        ...(hasta && { lte: new Date(hasta + "T23:59:59") }),
      };
    }

    if (metodoPago) where.metodoPago = metodoPago;

    if (busqueda.trim()) {
      where.OR = [
        { clienteNombre: { contains: busqueda, mode: "insensitive" } },
        { clienteDni: { contains: busqueda, mode: "insensitive" } },
        { observaciones: { contains: busqueda, mode: "insensitive" } },
      ];
    }

    const [ventas, total] = await Promise.all([
      prisma.venta.findMany({
        where,
        // ✅ OPTIMIZACIÓN: Solo traemos lo necesario
        select: {
          id: true,
          total: true,
          subtotal: true,
          descuento: true,
          metodoPago: true,
          clienteNombre: true,
          usuarioNombre: true,
          createdAt: true,
          items: {
            select: {
              nombre: true,
              cantidad: true,
              precioUnit: true,
              subtotal: true,
              // ✅ NO traemos el producto completo, solo lo básico
              producto: {
                select: {
                  id: true,
                  nombre: true,
                  imagen: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.venta.count({ where }),
    ]);

    return NextResponse.json({
      ok: true,
      data: ventas,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("[GET /api/ventas]", error);
    return NextResponse.json({ ok: false, error: "Error al obtener ventas" }, { status: 500 });
  }
}

// ── POST /api/ventas ───────────────────────────────────────────────────────
// ── POST /api/ventas ───────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { tenantId, usuarioId, nombreUsuario } = await getTenantContext();
    const body: CreateVentaInput = await req.json();
    const { items, metodoPago, descuento = 0, clienteNombre, clienteDni, observaciones, vendedorId, vendedorNombre, fechaManual } = body;

    if (!items?.length)
      return NextResponse.json({ ok: false, error: "La venta debe tener al menos un producto" }, { status: 400 });
    if (!metodoPago)
      return NextResponse.json({ ok: false, error: "El método de pago es requerido" }, { status: 400 });

    const itemsReales   = items.filter(i => !i.productoId.startsWith("manual_"));
    const itemsManuales = items.filter(i =>  i.productoId.startsWith("manual_"));
    const productoIds   = itemsReales.map(i => i.productoId);
    const varianteIds   = itemsReales.filter(i => i.varianteId).map(i => i.varianteId as string);

    const venta = await prisma.$transaction(async (tx) => {

      const [productos, variantes] = await Promise.all([
        tx.producto.findMany({
          where:  { id: { in: productoIds }, tenantId, activo: true },
          select: { id: true, nombre: true, stock: true, precio: true },
        }),
        varianteIds.length > 0
          ? tx.productoVariante.findMany({
              where:  { id: { in: varianteIds }, tenantId, activo: true },
              select: { id: true, stock: true, precio: true },
            })
          : Promise.resolve([]),
      ]);

      const productoMap = new Map(productos.map(p => [p.id, p]));
      const varianteMap = new Map(variantes.map(v => [v.id, v]));

      // Validar stock
      for (const item of itemsReales) {
        const producto = productoMap.get(item.productoId);
        if (!producto) throw new Error(`Producto ${item.productoId} no encontrado`);

        if (item.varianteId) {
          const variante = varianteMap.get(item.varianteId);
          if (!variante) throw new Error(`Variante no encontrada para "${producto.nombre}"`);
          if (variante.stock < item.cantidad)
            throw new Error(`Stock insuficiente para "${producto.nombre}" (talle/color). Disponible: ${variante.stock}, pedido: ${item.cantidad}`);
        } else {
          if (producto.stock < item.cantidad)
            throw new Error(`Stock insuficiente para "${producto.nombre}". Disponible: ${producto.stock}, pedido: ${item.cantidad}`);
        }
      }

      const itemsData: {
        productoId: string | null; varianteId?: string | null;
        talle?: string | null; color?: string | null;
        nombre: string; cantidad: number; precioUnit: number; subtotal: number;
      }[] = [];

      let subtotal = 0;

      for (const item of itemsReales) {
        const producto     = productoMap.get(item.productoId)!;
        const itemSubtotal = item.precioUnit * item.cantidad;
        subtotal += itemSubtotal;
        itemsData.push({
          productoId: producto.id,
          varianteId: item.varianteId ?? null,
          talle:      item.talle      ?? null,
          color:      item.color      ?? null,
          nombre:     producto.nombre,
          cantidad:   item.cantidad,
          precioUnit: item.precioUnit,
          subtotal:   itemSubtotal,
        });
      }

      for (const item of itemsManuales) {
        const itemSubtotal = item.precioUnit * item.cantidad;
        subtotal += itemSubtotal;
        itemsData.push({
          productoId: null,
          nombre:     item.nombre ?? "Item manual",
          cantidad:   item.cantidad,
          precioUnit: item.precioUnit,
          subtotal:   itemSubtotal,
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
          usuarioId:     vendedorId    || usuarioId,
          usuarioNombre: vendedorNombre || nombreUsuario || null,
          createdAt:     fechaManual ? new Date(fechaManual) : new Date(),
          items: {
            create: itemsData.map(i => ({
              nombre:     i.nombre,
              cantidad:   i.cantidad,
              precioUnit: i.precioUnit,
              subtotal:   i.subtotal,
              ...(i.productoId && { productoId: i.productoId }),
              ...(i.varianteId && { varianteId: i.varianteId }),
              ...(i.talle      && { talle:      i.talle }),
              ...(i.color      && { color:      i.color }),
            })),
          },
        },
        select: {
          id:    true,
          total: true,
          items: { select: { id: true, nombre: true, cantidad: true, precioUnit: true, subtotal: true } },
        },
      });

      const itemsConProducto = itemsData.filter(i => i.productoId !== null) as {
        productoId: string; varianteId?: string | null;
        talle?: string | null; color?: string | null;
        nombre: string; cantidad: number; precioUnit: number; subtotal: number;
      }[];

      // Descontar stock — variante o producto según corresponda
      await Promise.all(
        itemsConProducto.map(item =>
          item.varianteId
            ? tx.productoVariante.update({
                where: { id: item.varianteId },
                data:  { stock: { decrement: item.cantidad } },
              })
            : tx.producto.update({
                where: { id: item.productoId },
                data:  { stock: { decrement: item.cantidad } },
              })
        )
      );

      // Caja
      const cajaAbierta = await tx.caja.findFirst({
        where:  { tenantId, estado: "ABIERTA" },
        select: { id: true },
      });
      if (cajaAbierta) {
        await tx.movimientoCaja.create({
          data: {
            tenantId,
            cajaId:        cajaAbierta.id,
            tipo:          metodoPago?.toUpperCase() === "EFECTIVO" ? "VENTA_EFECTIVO" : "VENTA_VIRTUAL",
            monto:         total,
            descripcion:   `Venta #${ventaCreada.id.slice(-6).toUpperCase()}`,
            ventaId:       ventaCreada.id,
            metodoPago,
            usuarioId,
            usuarioNombre: nombreUsuario ?? null,
          },
        });
      }
      
      // Movimientos
      await tx.movimiento.createMany({
        data: itemsConProducto.map(item => {
          const producto      = productoMap.get(item.productoId)!;
          const stockAnterior = producto.stock;
          return {
            tenantId,
            productoId:      item.productoId,
            productoNombre: [item.nombre, item.talle, item.color].filter(Boolean).join(" — "),
            tipo:            "VENTA" as const,
            cantidad:        item.cantidad,
            stockAnterior,
            stockResultante: stockAnterior - item.cantidad,
            ventaId:         ventaCreada.id,
            usuarioId,
            usuarioNombre:   nombreUsuario ?? null,
            createdAt:       fechaManual ? new Date(fechaManual) : new Date(),
          };
        }),
      });

      return ventaCreada;
    });

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