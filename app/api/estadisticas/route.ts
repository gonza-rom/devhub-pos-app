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

    const conFechas = !!(fechaInicio && fechaFin);
    const gte = conFechas ? new Date(fechaInicio!) : null;
    const lte = conFechas ? new Date(fechaFin! + "T23:59:59") : null;

    const whereVenta = {
      tenantId,
      cancelado: false,
      ...(conFechas && { createdAt: { gte: gte!, lte: lte! } }),
    };

    const hoy = new Date();
    const inicioMesActual   = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const inicioMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    const finMesAnterior    = new Date(hoy.getFullYear(), hoy.getMonth(), 0, 23, 59, 59);

    const [
      resumen,
      ventasPorMetodoRaw,
      ventasPorDiaRaw,
      ventasPorMesRaw,
      itemsPorProductoRaw,
      itemsPorProductoRealesRaw,
      itemsPorCategoriaRaw,
      productosStockBajoRaw,
      mesActualRaw,
      mesAnteriorRaw,
      ventasPorHoraRaw,
    ] = await Promise.all([

      prisma.venta.aggregate({
        where: whereVenta,
        _sum:   { total: true },
        _count: { _all: true },
        _avg:   { total: true },
      }),

      prisma.venta.groupBy({
        by:      ["metodoPago"],
        where:   whereVenta,
        _count:  { _all: true },
        _sum:    { total: true },
        orderBy: { _sum: { total: "desc" } },
      }),

      conFechas
        ? prisma.$queryRaw<{ fecha: string; cantidad: bigint; total: number }[]>`
            SELECT
              DATE(("createdAt" AT TIME ZONE 'UTC-3'))::text AS fecha,
              COUNT(*)::bigint  AS cantidad,
              SUM(total)::float AS total
            FROM "Venta"
            WHERE "tenantId" = ${tenantId}
              AND "cancelado" = false
              AND "createdAt" >= ${gte!}
              AND "createdAt" <= ${lte!}
            GROUP BY 1 ORDER BY 1 ASC
          `
        : prisma.$queryRaw<{ fecha: string; cantidad: bigint; total: number }[]>`
            SELECT
              DATE(("createdAt" AT TIME ZONE 'UTC-3'))::text AS fecha,
              COUNT(*)::bigint  AS cantidad,
              SUM(total)::float AS total
            FROM "Venta"
            WHERE "tenantId" = ${tenantId}
              AND "cancelado" = false
            GROUP BY 1 ORDER BY 1 ASC
          `,

      conFechas
        ? prisma.$queryRaw<{ mes: string; cantidad: bigint; total: number }[]>`
            SELECT
              TO_CHAR("createdAt" AT TIME ZONE 'UTC-3', 'YYYY-MM') AS mes,
              COUNT(*)::bigint  AS cantidad,
              SUM(total)::float AS total
            FROM "Venta"
            WHERE "tenantId" = ${tenantId}
              AND "cancelado" = false
              AND "createdAt" >= ${gte!}
              AND "createdAt" <= ${lte!}
            GROUP BY 1 ORDER BY 1 ASC
          `
        : prisma.$queryRaw<{ mes: string; cantidad: bigint; total: number }[]>`
            SELECT
              TO_CHAR("createdAt" AT TIME ZONE 'UTC-3', 'YYYY-MM') AS mes,
              COUNT(*)::bigint  AS cantidad,
              SUM(total)::float AS total
            FROM "Venta"
            WHERE "tenantId" = ${tenantId}
              AND "cancelado" = false
            GROUP BY 1 ORDER BY 1 ASC
          `,

      // ── Top 10 todos (incluye manuales) ──
      conFechas
        ? prisma.$queryRaw<{ productoId: string; nombre: string; categoriaNombre: string | null; cantidad: bigint; ingreso: number }[]>`
            SELECT
              vi."productoId",
              vi.nombre,
              COALESCE(c.nombre,
                CASE
                  WHEN vi."productoId" IS NULL OR LEFT(p.nombre, 2) = '__' OR LOWER(p.nombre) = 'varios'
                    OR EXISTS(SELECT 1 FROM "Producto" pp WHERE pp.id = vi."productoId" AND pp.activo = false)
                  THEN 'Varios'
                  ELSE 'Sin categoría'
                END
              ) AS "categoriaNombre",
              SUM(vi.cantidad)::bigint  AS cantidad,
              SUM(vi.subtotal)::float   AS ingreso
            FROM "VentaItem" vi
            JOIN "Venta" v          ON v.id = vi."ventaId"
            LEFT JOIN "Producto" p  ON p.id = vi."productoId"
            LEFT JOIN "Categoria" c ON c.id = p."categoriaId"
            WHERE v."tenantId" = ${tenantId}
              AND v."cancelado" = false
              AND v."createdAt" >= ${gte!}
              AND v."createdAt" <= ${lte!}
            GROUP BY vi."productoId", vi.nombre, c.nombre, p.nombre, p.activo
            ORDER BY cantidad DESC
            LIMIT 50
          `
        : prisma.$queryRaw<{ productoId: string; nombre: string; categoriaNombre: string | null; cantidad: bigint; ingreso: number }[]>`
            SELECT
              vi."productoId",
              vi.nombre,
              COALESCE(c.nombre,
                CASE
                  WHEN vi."productoId" IS NULL OR LEFT(p.nombre, 2) = '__' OR LOWER(p.nombre) = 'varios'
                    OR EXISTS(SELECT 1 FROM "Producto" pp WHERE pp.id = vi."productoId" AND pp.activo = false)
                  THEN 'Varios'
                  ELSE 'Sin categoría'
                END
              ) AS "categoriaNombre",
              SUM(vi.cantidad)::bigint  AS cantidad,
              SUM(vi.subtotal)::float   AS ingreso
            FROM "VentaItem" vi
            JOIN "Venta" v          ON v.id = vi."ventaId"
            LEFT JOIN "Producto" p  ON p.id = vi."productoId"
            LEFT JOIN "Categoria" c ON c.id = p."categoriaId"
            WHERE v."tenantId" = ${tenantId}
              AND v."cancelado" = false
            GROUP BY vi."productoId", vi.nombre, c.nombre, p.nombre, p.activo
            ORDER BY cantidad DESC
            LIMIT 50
          `,

      // ── Top 10 solo productos reales del catálogo ──
      conFechas
        ? prisma.$queryRaw<{ productoId: string; nombre: string; categoriaNombre: string | null; cantidad: bigint; ingreso: number }[]>`
            SELECT
              vi."productoId",
              vi.nombre,
              COALESCE(c.nombre, 'Sin categoría') AS "categoriaNombre",
              SUM(vi.cantidad)::bigint  AS cantidad,
              SUM(vi.subtotal)::float   AS ingreso
            FROM "VentaItem" vi
            JOIN "Venta" v         ON v.id = vi."ventaId"
            JOIN "Producto" p      ON p.id = vi."productoId"
            LEFT JOIN "Categoria" c ON c.id = p."categoriaId"
            WHERE v."tenantId" = ${tenantId}
              AND v."cancelado" = false
              AND v."createdAt" >= ${gte!}
              AND v."createdAt" <= ${lte!}
              AND vi."productoId" IS NOT NULL
              AND p.activo = true
              AND LEFT(p.nombre, 2) != '__'
              AND LOWER(p.nombre) != 'varios'
            GROUP BY vi."productoId", vi.nombre, c.nombre
            ORDER BY cantidad DESC
            LIMIT 50
          `
        : prisma.$queryRaw<{ productoId: string; nombre: string; categoriaNombre: string | null; cantidad: bigint; ingreso: number }[]>`
            SELECT
              vi."productoId",
              vi.nombre,
              COALESCE(c.nombre, 'Sin categoría') AS "categoriaNombre",
              SUM(vi.cantidad)::bigint  AS cantidad,
              SUM(vi.subtotal)::float   AS ingreso
            FROM "VentaItem" vi
            JOIN "Venta" v         ON v.id = vi."ventaId"
            JOIN "Producto" p      ON p.id = vi."productoId"
            LEFT JOIN "Categoria" c ON c.id = p."categoriaId"
            WHERE v."tenantId" = ${tenantId}
              AND v."cancelado" = false
              AND vi."productoId" IS NOT NULL
              AND p.activo = true
              AND LEFT(p.nombre, 2) != '__'
              AND LOWER(p.nombre) != 'varios'
            GROUP BY vi."productoId", vi.nombre, c.nombre
            ORDER BY cantidad DESC
            LIMIT 50
          `,

      conFechas
        ? prisma.$queryRaw<{ categoria: string; cantidad: bigint; ingreso: number }[]>`
            SELECT
              COALESCE(c.nombre,
                CASE
                  WHEN vi."productoId" IS NULL OR LEFT(p.nombre, 2) = '__' OR LOWER(p.nombre) = 'varios'
                    OR EXISTS(SELECT 1 FROM "Producto" pp WHERE pp.id = vi."productoId" AND pp.activo = false)
                  THEN 'Varios'
                  ELSE 'Sin categoría'
                END
              ) AS categoria,
              SUM(vi.cantidad)::bigint AS cantidad,
              SUM(vi.subtotal)::float  AS ingreso
            FROM "VentaItem" vi
            JOIN "Venta" v          ON v.id = vi."ventaId"
            LEFT JOIN "Producto" p  ON p.id = vi."productoId"
            LEFT JOIN "Categoria" c ON c.id = p."categoriaId"
            WHERE v."tenantId" = ${tenantId}
              AND v."cancelado" = false
              AND v."createdAt" >= ${gte!}
              AND v."createdAt" <= ${lte!}
            GROUP BY 1 ORDER BY ingreso DESC
          `
        : prisma.$queryRaw<{ categoria: string; cantidad: bigint; ingreso: number }[]>`
            SELECT
              COALESCE(c.nombre,
                CASE
                  WHEN vi."productoId" IS NULL OR LEFT(p.nombre, 2) = '__' OR LOWER(p.nombre) = 'varios'
                    OR EXISTS(SELECT 1 FROM "Producto" pp WHERE pp.id = vi."productoId" AND pp.activo = false)
                  THEN 'Varios'
                  ELSE 'Sin categoría'
                END
              ) AS categoria,
              SUM(vi.cantidad)::bigint AS cantidad,
              SUM(vi.subtotal)::float  AS ingreso
            FROM "VentaItem" vi
            JOIN "Venta" v          ON v.id = vi."ventaId"
            LEFT JOIN "Producto" p  ON p.id = vi."productoId"
            LEFT JOIN "Categoria" c ON c.id = p."categoriaId"
            WHERE v."tenantId" = ${tenantId}
              AND v."cancelado" = false
            GROUP BY 1 ORDER BY ingreso DESC
          `,

      prisma.$queryRaw<{ id: string; nombre: string; stock: number; stockMinimo: number; categoriaNombre: string | null }[]>`
        SELECT p.id, p.nombre, p.stock, p."stockMinimo", c.nombre AS "categoriaNombre"
        FROM "Producto" p
        LEFT JOIN "Categoria" c ON c.id = p."categoriaId"
        WHERE p."tenantId" = ${tenantId}
          AND p.activo = true
          AND p.stock <= p."stockMinimo"
        ORDER BY p.stock ASC
        LIMIT 10
      `,

      prisma.venta.aggregate({
        where: { tenantId, cancelado: false, createdAt: { gte: inicioMesActual, lte: hoy } },
        _sum:   { total: true },
        _count: { _all: true },
        _avg:   { total: true },
      }),

      prisma.venta.aggregate({
        where: { tenantId, cancelado: false, createdAt: { gte: inicioMesAnterior, lte: finMesAnterior } },
        _sum:   { total: true },
        _count: { _all: true },
        _avg:   { total: true },
      }),

      conFechas
        ? prisma.$queryRaw<{ hora: number; cantidad: bigint; total: number }[]>`
            SELECT
              EXTRACT(HOUR FROM "createdAt" AT TIME ZONE 'UTC-3')::int AS hora,
              COUNT(*)::bigint  AS cantidad,
              SUM(total)::float AS total
            FROM "Venta"
            WHERE "tenantId" = ${tenantId}
              AND "cancelado" = false
              AND "createdAt" >= ${gte!}
              AND "createdAt" <= ${lte!}
            GROUP BY 1 ORDER BY 1 ASC
          `
        : prisma.$queryRaw<{ hora: number; cantidad: bigint; total: number }[]>`
            SELECT
              EXTRACT(HOUR FROM "createdAt" AT TIME ZONE 'UTC-3')::int AS hora,
              COUNT(*)::bigint  AS cantidad,
              SUM(total)::float AS total
            FROM "Venta"
            WHERE "tenantId" = ${tenantId}
              AND "cancelado" = false
            GROUP BY 1 ORDER BY 1 ASC
          `,
    ]);

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
      categoriaNombre: r.categoriaNombre,
      cantidadVendida: Number(r.cantidad),
      ingresoGenerado: r.ingreso,
    }));

    const productosCatalogoMasVendidos = itemsPorProductoRealesRaw.map((r) => ({
      productoId:      r.productoId,
      nombre:          r.nombre,
      categoriaNombre: r.categoriaNombre,
      cantidadVendida: Number(r.cantidad),
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

    const horaMap = new Map(ventasPorHoraRaw.map((r) => [r.hora, r]));
    const ventasPorHora = Array.from({ length: 24 }, (_, hora) => {
      const r = horaMap.get(hora);
      return {
        hora:     `${String(hora).padStart(2, "0")}:00`,
        cantidad: r ? Number(r.cantidad) : 0,
        total:    r?.total ?? 0,
      };
    });

    const comparativaMeses = {
      actual: {
        ingresos: mesActualRaw._sum.total  ?? 0,
        ventas:   mesActualRaw._count._all,
        promedio: mesActualRaw._avg.total  ?? 0,
      },
      anterior: {
        ingresos: mesAnteriorRaw._sum.total  ?? 0,
        ventas:   mesAnteriorRaw._count._all,
        promedio: mesAnteriorRaw._avg.total  ?? 0,
      },
    };

    return NextResponse.json({
      ok: true,
      data: {
        resumen: {
          totalVentas:   resumen._count._all,
          ingresoTotal:  resumen._sum.total  ?? 0,
          promedioVenta: resumen._avg.total  ?? 0,
        },
        productosMasVendidos,
        productosCatalogoMasVendidos,
        ventasPorCategoria,
        ventasPorMetodo,
        ventasPorDia,
        ventasPorMes,
        productosStockBajo,
        comparativaMeses,
        ventasPorHora,
      },
    });
  } catch (error) {
    console.error("[GET /api/estadisticas]", error);
    return NextResponse.json({ ok: false, error: "Error al obtener estadísticas" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";