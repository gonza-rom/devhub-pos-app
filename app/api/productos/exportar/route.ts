// app/api/productos/exportar/route.ts
// Exporta todos los productos del tenant como CSV

import { NextResponse }   from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { prisma }          from "@/lib/prisma";

export async function GET() {
  try {
    const { tenantId } = await getTenantContext();

    const productos = await prisma.producto.findMany({
      where:   { tenantId, activo: true },
      select: {
        nombre:         true,
        codigoProducto: true,
        codigoBarras:   true,
        precio:         true,
        costo:          true,
        stock:          true,
        stockMinimo:    true,
        unidad:         true,
        descripcion:    true,
        categoria:      { select: { nombre: true } },
        proveedor:      { select: { nombre: true } },
      },
      orderBy: { nombre: "asc" },
    });

    const SEP = ";"; // Excel Argentina usa ; como separador

    const encabezado = [
      "nombre", "codigo_producto", "codigo_barras", "precio",
      "costo", "stock", "stock_minimo", "unidad",
      "descripcion", "categoria", "proveedor",
    ];

    const filas = productos.map((p) => [
      p.nombre,
      p.codigoProducto ?? "",
      p.codigoBarras   ?? "",
      p.precio,
      p.costo          ?? "",
      p.stock,
      p.stockMinimo,
      p.unidad         ?? "",
      (p.descripcion   ?? "").replace(/"/g, '""'),
      p.categoria?.nombre  ?? "",
      p.proveedor?.nombre  ?? "",
    ].map((v) => `"${v}"`).join(SEP));

    // BOM UTF-8 para que Excel abra con tildes correctamente
    const BOM = "\uFEFF";
    const csv = BOM + [encabezado.join(SEP), ...filas].join("\n");
    const fecha = new Date().toISOString().split("T")[0];

    return new NextResponse(csv, {
      headers: {
        "Content-Type":        "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="productos_${fecha}.csv"`,
      },
    });
  } catch (error) {
    console.error("[GET /api/productos/exportar]", error);
    return NextResponse.json({ ok: false, error: "Error al exportar" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";