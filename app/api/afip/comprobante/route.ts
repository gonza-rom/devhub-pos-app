// app/api/afip/comprobante/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await getTenantContext();
    const { searchParams } = new URL(req.url);

    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const busqueda = searchParams.get("busqueda") || "";
    const tipoComprobante = searchParams.get("tipoComprobante");
    const fechaDesde = searchParams.get("fechaDesde");
    const fechaHasta = searchParams.get("fechaHasta");
    const resultado = searchParams.get("resultado");

    const where: Prisma.ComprobanteWhereInput = { tenantId };

    if (tipoComprobante) {
      where.tipoComprobante = parseInt(tipoComprobante);
    }

    if (resultado) {
      where.resultado = resultado;
    }

    if (fechaDesde || fechaHasta) {
      where.fecha = {};
      if (fechaDesde) {
        where.fecha.gte = new Date(fechaDesde);
      }
      if (fechaHasta) {
        const hasta = new Date(fechaHasta);
        hasta.setHours(23, 59, 59, 999);
        where.fecha.lte = hasta;
      }
    }

    if (busqueda) {
      const conditions: Prisma.ComprobanteWhereInput[] = [
        { cae: { contains: busqueda, mode: Prisma.QueryMode.insensitive } },
        { clienteNombre: { contains: busqueda, mode: Prisma.QueryMode.insensitive } },
      ];

      if (!isNaN(parseInt(busqueda))) {
        conditions.push({ numeroComprobante: parseInt(busqueda) });
      }

      where.OR = conditions;
    }

    const [comprobantes, total] = await Promise.all([
      prisma.comprobante.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          puntoVenta: true,
          tipoComprobante: true,
          numeroComprobante: true,
          cae: true,
          caeFchVto: true,
          fecha: true,
          clienteNombre: true,
          docTipo: true,
          docNro: true,
          total: true,
          neto: true,
          iva: true,
          resultado: true,
          metodoPago: true,
          createdAt: true,
        },
      }),
      prisma.comprobante.count({ where }),
    ]);

    // Convertir BigInt a string para poder serializar a JSON
    const comprobantesSerializados = comprobantes.map((c) => ({
      ...c,
      docNro: c.docNro.toString(),
    }));

    return NextResponse.json({
      ok: true,
      comprobantes: comprobantesSerializados,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        hasNext: page * pageSize < total,
        hasPrev: page > 1,
      },
    });
  } catch (error: any) {
    console.error("Error listando comprobantes:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Error al obtener comprobantes",
        detalle: error.message,
      },
      { status: 500 }
    );
  }
}