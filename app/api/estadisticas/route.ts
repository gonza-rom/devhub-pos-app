// app/api/estadisticas/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await getTenantContext();
    const { searchParams } = new URL(req.url);

    const fechaInicio = searchParams.get("fechaInicio");
    const fechaFin    = searchParams.get("fechaFin");

    // Rango de fechas para filtrar ventas
    const whereVenta: any = { tenantId };
    if (fechaInicio && fechaFin) {
      whereVenta.createdAt = {
        gte: new Date(fechaInicio),
        lte: new Date(fechaFin + "T23:59:59"),
      };
    }

    // ── Obtener ventas del período con sus items ──────────────────────────
    // No necesitamos filtrar por cancelados via movimientos (lógica JMR):
    // en DevHub las ventas no tienen estado "cancelado" en la tabla Venta.
    // Los movimientos de venta sí pueden cancelarse pero la Venta en sí queda.
    // Por eso filtramos directamente sobre la tabla Venta.
    const ventas = await prisma.venta.findMany({
      where: whereVenta,
      include: {
        items: {
          include: {
            producto: {
              select: {
                id: true,
                nombre: true,
                imagen: true,
                categoria: { select: { id: true, nombre: true } },
              },
            },
          },
        },
      },
    });

    // ── Resumen general ───────────────────────────────────────────────────
    const totalVentas  = ventas.length;
    const ingresoTotal = ventas.reduce((sum, v) => sum + v.total, 0);
    const promedioVenta = totalVentas > 0 ? ingresoTotal / totalVentas : 0;

    // ── Productos más vendidos (top 10) ───────────────────────────────────
    const productosMap = new Map<
      string,
      { producto: any; cantidadVendida: number; ingresoGenerado: number }
    >();

    ventas.forEach((venta) => {
      venta.items.forEach((item) => {
        const entry = productosMap.get(item.productoId);
        if (entry) {
          entry.cantidadVendida  += item.cantidad;
          entry.ingresoGenerado  += item.subtotal;
        } else {
          productosMap.set(item.productoId, {
            producto:        item.producto,
            cantidadVendida: item.cantidad,
            ingresoGenerado: item.subtotal,
          });
        }
      });
    });

    const productosMasVendidos = [...productosMap.values()]
      .sort((a, b) => b.cantidadVendida - a.cantidadVendida)
      .slice(0, 10);

    // ── Ventas por categoría ──────────────────────────────────────────────
    const categoriasMap = new Map<
      string,
      { nombre: string; cantidad: number; ingreso: number }
    >();

    ventas.forEach((venta) => {
      venta.items.forEach((item) => {
        const nombreCat = item.producto.categoria?.nombre ?? "Sin categoría";
        const entry     = categoriasMap.get(nombreCat);
        if (entry) {
          entry.cantidad += item.cantidad;
          entry.ingreso  += item.subtotal;
        } else {
          categoriasMap.set(nombreCat, {
            nombre:   nombreCat,
            cantidad: item.cantidad,
            ingreso:  item.subtotal,
          });
        }
      });
    });

    const ventasPorCategoria = [...categoriasMap.values()]
      .sort((a, b) => b.ingreso - a.ingreso);

    // ── Ventas por método de pago ─────────────────────────────────────────
    const metodosMap = new Map<
      string,
      { metodo: string; cantidad: number; total: number }
    >();

    ventas.forEach((venta) => {
      const entry = metodosMap.get(venta.metodoPago);
      if (entry) {
        entry.cantidad++;
        entry.total += venta.total;
      } else {
        metodosMap.set(venta.metodoPago, {
          metodo:   venta.metodoPago,
          cantidad: 1,
          total:    venta.total,
        });
      }
    });

    const ventasPorMetodo = [...metodosMap.values()]
      .sort((a, b) => b.total - a.total);

    // ── Ventas por día ────────────────────────────────────────────────────
    const diasMap = new Map<
      string,
      { fecha: string; cantidad: number; total: number }
    >();

    ventas.forEach((venta) => {
      const fecha = new Date(venta.createdAt).toISOString().split("T")[0];
      const entry = diasMap.get(fecha);
      if (entry) {
        entry.cantidad++;
        entry.total += venta.total;
      } else {
        diasMap.set(fecha, { fecha, cantidad: 1, total: venta.total });
      }
    });

    const ventasPorDia = [...diasMap.values()]
      .sort((a, b) => a.fecha.localeCompare(b.fecha));

    // ── Ventas por mes ────────────────────────────────────────────────────
    const mesesMap = new Map<
      string,
      { mes: string; cantidad: number; total: number }
    >();

    ventas.forEach((venta) => {
      const d      = new Date(venta.createdAt);
      const mesKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const entry  = mesesMap.get(mesKey);
      if (entry) {
        entry.cantidad++;
        entry.total += venta.total;
      } else {
        mesesMap.set(mesKey, { mes: mesKey, cantidad: 1, total: venta.total });
      }
    });

    const ventasPorMes = [...mesesMap.values()]
      .sort((a, b) => a.mes.localeCompare(b.mes));

    // ── Productos con stock bajo (siempre, sin filtro de fecha) ───────────
    // Prisma no soporta comparación campo-a-campo en where, así que
    // traemos todos los activos y filtramos en JS.
    const todosProductos = await prisma.producto.findMany({
      where: { tenantId, activo: true },
      select: {
        id: true, nombre: true, stock: true, stockMinimo: true,
        categoria: { select: { nombre: true } },
      },
      orderBy: { stock: "asc" },
    });

    const productosStockBajo = todosProductos
      .filter((p) => p.stock <= p.stockMinimo)
      .slice(0, 10);

    return NextResponse.json({
      ok: true,
      data: {
        resumen: {
          totalVentas,
          ingresoTotal,
          promedioVenta,
        },
        productosMasVendidos,
        ventasPorCategoria,
        ventasPorMetodo,
        ventasPorDia,
        ventasPorMes,
        productosStockBajo,
      },
    });
  } catch (error) {
    console.error("[GET /api/estadisticas]", error);
    return NextResponse.json(
      { ok: false, error: "Error al obtener estadísticas" },
      { status: 500 }
    );
  }
}