// app/api/estadisticas/route.ts
// OPTIMIZADO: cálculos en DB con groupBy en vez de traer todo a memoria

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await getTenantContext();
    const { searchParams } = new URL(req.url);

    const fechaInicio = searchParams.get("fechaInicio");
    const fechaFin    = searchParams.get("fechaFin");

    const conFechas = !!(fechaInicio && fechaFin);
    const gte = conFechas ? new Date(fechaInicio!) : null;
    const lte = conFechas ? new Date(fechaFin! + "T23:59:59") : null;

    const whereVenta = {
      tenantId,
      ...(conFechas && { createdAt: { gte: gte!, lte: lte! } }),
    };
    const whereItem = { venta: whereVenta };

    // ── Todo en paralelo, cálculos en DB ──────────────────────────────────
    const [
      resumen,
      ventasPorMetodoRaw,
      ventasPorDiaRaw,
      ventasPorMesRaw,
      itemsPorProductoRaw,
      itemsPorCategoriaRaw,
      productosStockBajoRaw,
    ] = await Promise.all([

      // Resumen: total, cantidad, promedio
      prisma.venta.aggregate({
        where: whereVenta,
        _sum:   { total: true },
        _count: { _all: true },
        _avg:   { total: true },
      }),

      // Ventas por método de pago
      prisma.venta.groupBy({
        by:     ["metodoPago"],
        where:  whereVenta,
        _count: { _all: true },
        _sum:   { total: true },
        orderBy: { _sum: { total: "desc" } },
      }),

      // Ventas por día — dos versiones según si hay rango de fechas
      conFechas
        ? prisma.$queryRaw<{ fecha: string; cantidad: bigint; total: number }[]>`
            SELECT
              DATE("createdAt" AT TIME ZONE 'America/Argentina/Buenos_Aires')::text AS fecha,
              COUNT(*)::bigint  AS cantidad,
              SUM(total)::float AS total
            FROM "Venta"
            WHERE "tenantId" = ${tenantId}
              AND "createdAt" >= ${gte!}
              AND "createdAt" <= ${lte!}
            GROUP BY 1
            ORDER BY 1 ASC
          `
        : prisma.$queryRaw<{ fecha: string; cantidad: bigint; total: number }[]>`
            SELECT
              DATE("createdAt" AT TIME ZONE 'America/Argentina/Buenos_Aires')::text AS fecha,
              COUNT(*)::bigint  AS cantidad,
              SUM(total)::float AS total
            FROM "Venta"
            WHERE "tenantId" = ${tenantId}
            GROUP BY 1
            ORDER BY 1 ASC
          `,

      // Ventas por mes
      conFechas
        ? prisma.$queryRaw<{ mes: string; cantidad: bigint; total: number }[]>`
            SELECT
              TO_CHAR("createdAt" AT TIME ZONE 'America/Argentina/Buenos_Aires', 'YYYY-MM') AS mes,
              COUNT(*)::bigint  AS cantidad,
              SUM(total)::float AS total
            FROM "Venta"
            WHERE "tenantId" = ${tenantId}
              AND "createdAt" >= ${gte!}
              AND "createdAt" <= ${lte!}
            GROUP BY 1
            ORDER BY 1 ASC
          `
        : prisma.$queryRaw<{ mes: string; cantidad: bigint; total: number }[]>`
            SELECT
              TO_CHAR("createdAt" AT TIME ZONE 'America/Argentina/Buenos_Aires', 'YYYY-MM') AS mes,
              COUNT(*)::bigint  AS cantidad,
              SUM(total)::float AS total
            FROM "Venta"
            WHERE "tenantId" = ${tenantId}
            GROUP BY 1
            ORDER BY 1 ASC
          `,

      // Top 10 productos más vendidos
      conFechas
  ? prisma.$queryRaw<{ productoId: string; nombre: string; categoriaNombre: string | null; cantidad: bigint; ingreso: number }[]>`
      SELECT
        vi."productoId",
        vi.nombre,
        c.nombre AS "categoriaNombre",
        SUM(vi.cantidad)::bigint  AS cantidad,
        SUM(vi.subtotal)::float   AS ingreso
      FROM "VentaItem" vi
      JOIN "Venta" v          ON v.id = vi."ventaId"
      LEFT JOIN "Producto" p  ON p.id = vi."productoId"
      LEFT JOIN "Categoria" c ON c.id = p."categoriaId"
      WHERE v."tenantId" = ${tenantId}
        AND v."createdAt" >= ${gte!}
        AND v."createdAt" <= ${lte!}
      GROUP BY vi."productoId", vi.nombre, c.nombre
      ORDER BY cantidad DESC
      LIMIT 10
    `
  : prisma.$queryRaw<{ productoId: string; nombre: string; categoriaNombre: string | null; cantidad: bigint; ingreso: number }[]>`
      SELECT
        vi."productoId",
        vi.nombre,
        c.nombre AS "categoriaNombre",
        SUM(vi.cantidad)::bigint  AS cantidad,
        SUM(vi.subtotal)::float   AS ingreso
      FROM "VentaItem" vi
      JOIN "Venta" v          ON v.id = vi."ventaId"
      LEFT JOIN "Producto" p  ON p.id = vi."productoId"
      LEFT JOIN "Categoria" c ON c.id = p."categoriaId"
      WHERE v."tenantId" = ${tenantId}
      GROUP BY vi."productoId", vi.nombre, c.nombre
      ORDER BY cantidad DESC
      LIMIT 10
    `,

      // Ventas por categoría
      conFechas
        ? prisma.$queryRaw<{ categoria: string; cantidad: bigint; ingreso: number }[]>`
            SELECT
              COALESCE(c.nombre, 'Sin categoría') AS categoria,
              SUM(vi.cantidad)::bigint             AS cantidad,
              SUM(vi.subtotal)::float              AS ingreso
            FROM "VentaItem" vi
            JOIN "Venta" v          ON v.id = vi."ventaId"
            LEFT JOIN "Producto" p  ON p.id = vi."productoId"
            LEFT JOIN "Categoria" c ON c.id = p."categoriaId"
            WHERE v."tenantId" = ${tenantId}
              AND v."createdAt" >= ${gte!}
              AND v."createdAt" <= ${lte!}
            GROUP BY 1
            ORDER BY ingreso DESC
          `
        : prisma.$queryRaw<{ categoria: string; cantidad: bigint; ingreso: number }[]>`
            SELECT
              COALESCE(c.nombre, 'Sin categoría') AS categoria,
              SUM(vi.cantidad)::bigint             AS cantidad,
              SUM(vi.subtotal)::float              AS ingreso
            FROM "VentaItem" vi
            JOIN "Venta" v          ON v.id = vi."ventaId"
            LEFT JOIN "Producto" p  ON p.id = vi."productoId"
            LEFT JOIN "Categoria" c ON c.id = p."categoriaId"
            WHERE v."tenantId" = ${tenantId}
            GROUP BY 1
            ORDER BY ingreso DESC
          `,

      // Stock bajo — siempre sin filtro de fecha
      prisma.$queryRaw<{
        id: string; nombre: string; stock: number;
        stockMinimo: number; categoriaNombre: string | null
      }[]>`
        SELECT
          p.id, p.nombre, p.stock, p."stockMinimo",
          c.nombre AS "categoriaNombre"
        FROM "Producto" p
        LEFT JOIN "Categoria" c ON c.id = p."categoriaId"
        WHERE p."tenantId" = ${tenantId}
          AND p.activo = true
          AND p.stock <= p."stockMinimo"
        ORDER BY p.stock ASC
        LIMIT 10
      `,
    ]);

    // ── Formatear resultados ──────────────────────────────────────────────

    const ventasPorMetodo = ventasPorMetodoRaw.map((r) => ({
      metodo:   r.metodoPago,
      cantidad: r._count._all,
      total:    r._sum.total ?? 0,
    }));

    const ventasPorDia = ventasPorDiaRaw.map((r) => ({
      fecha:    r.fecha,
      cantidad: Number(r.cantidad),
      total:    r.total,
    }));

    const ventasPorMes = ventasPorMesRaw.map((r) => ({
      mes:      r.mes,
      cantidad: Number(r.cantidad),
      total:    r.total,
    }));

    const productosMasVendidos = itemsPorProductoRaw.map((r) => ({
    productoId:      r.productoId,
    nombre:          r.nombre,
    categoriaNombre: r.categoriaNombre,   // ← agregar
    cantidadVendida: Number(r.cantidad),  // ← BigInt → number
    ingresoGenerado: r.ingreso,
  }));

    const ventasPorCategoria = itemsPorCategoriaRaw.map((r) => ({
      nombre:   r.categoria,
      cantidad: Number(r.cantidad),
      ingreso:  r.ingreso,
    }));

    const productosStockBajo = productosStockBajoRaw.map((p) => ({
      id:          p.id,
      nombre:      p.nombre,
      stock:       p.stock,
      stockMinimo: p.stockMinimo,
      categoria:   p.categoriaNombre ? { nombre: p.categoriaNombre } : null,
    }));

    return NextResponse.json({
      ok: true,
      data: {
        resumen: {
          totalVentas:  resumen._count._all,
          ingresoTotal: resumen._sum.total ?? 0,
          promedioVenta: resumen._avg.total ?? 0,
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
    return NextResponse.json({ ok: false, error: "Error al obtener estadísticas" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";