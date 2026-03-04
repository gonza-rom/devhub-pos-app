// app/api/caja/historial/route.ts
// Devuelve el historial de cajas cerradas con paginación

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await getTenantContext();
    const { searchParams } = new URL(req.url);

    const page  = parseInt(searchParams.get("page")  ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const desde = searchParams.get("desde");
    const hasta = searchParams.get("hasta");

    const where: any = {
      tenantId,
      estado: "CERRADA",
      ...(desde || hasta ? {
        abiertaAt: {
          ...(desde && { gte: new Date(desde) }),
          ...(hasta && { lte: new Date(hasta + "T23:59:59") }),
        },
      } : {}),
    };

    const [cajas, total] = await Promise.all([
      prisma.caja.findMany({
        where,
        orderBy: { cerradaAt: "desc" },
        skip:    (page - 1) * limit,
        take:    limit,
        include: {
          movimientos: {
            select: {
              id: true, tipo: true, monto: true,
              metodoPago: true, descripcion: true,
              usuarioNombre: true, createdAt: true,
            },
            orderBy: { createdAt: "asc" },
          },
        },
      }),
      prisma.caja.count({ where }),
    ]);

    // Calcular totales por caja
    const cajasConTotales = cajas.map((caja) => {
      const movs = caja.movimientos;
      const totalEfectivo      = movs.filter(m => m.tipo === "VENTA_EFECTIVO").reduce((s, m) => s + m.monto, 0);
      const totalVirtuales     = movs.filter(m => m.tipo === "VENTA_VIRTUAL").reduce((s, m) => s + m.monto, 0);
      const totalIngresos      = movs.filter(m => m.tipo === "INGRESO").reduce((s, m) => s + m.monto, 0);
      const totalEgresos       = movs.filter(m => m.tipo === "EGRESO").reduce((s, m) => s + m.monto, 0);
      const cantidadVentas     = movs.filter(m => m.tipo === "VENTA_EFECTIVO" || m.tipo === "VENTA_VIRTUAL").length;

      return {
        id:             caja.id,
        usuarioNombre:  caja.usuarioNombre,
        saldoInicial:   caja.saldoInicial,
        saldoFinal:     caja.saldoFinal,
        saldoContado:   caja.saldoContado,
        diferencia:     caja.diferencia,
        observaciones:  caja.observaciones,
        abiertaAt:      caja.abiertaAt,
        cerradaAt:      caja.cerradaAt,
        totalEfectivo,
        totalVirtuales,
        totalIngresos,
        totalEgresos,
        cantidadVentas,
        movimientos:    movs,
      };
    });

    return NextResponse.json({
      ok:   true,
      data: cajasConTotales,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });

  } catch (err: any) {
    console.error("[GET /api/caja/historial]", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";