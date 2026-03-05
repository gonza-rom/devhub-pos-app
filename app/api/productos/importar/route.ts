// app/api/productos/importar/route.ts
// Importa productos desde un CSV.
// Columnas requeridas: nombre, precio
// Columnas opcionales: codigo_producto, codigo_barras, costo, stock,
//                      stock_minimo, unidad, descripcion, categoria

import { NextRequest, NextResponse } from "next/server";
import { getTenantContext }          from "@/lib/tenant";
import { prisma }                    from "@/lib/prisma";

function parsearCSV(texto: string): Record<string, string>[] {
  const lineas = texto.split(/\r?\n/).filter((l) => l.trim());
  if (lineas.length < 2) return [];

  // Auto-detectar separador: ; (Excel AR) o , (estándar)
  const SEP = lineas[0].includes(";") ? ";" : ",";

  const encabezados = lineas[0]
    .split(SEP)
    .map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase().replace(/ /g, "_"));

  return lineas.slice(1).map((linea) => {
    const valores: string[] = [];
    let actual = "";
    let enComillas = false;
    for (let i = 0; i < linea.length; i++) {
      const c = linea[i];
      if (c === '"') { enComillas = !enComillas; continue; }
      if (c === SEP && !enComillas) { valores.push(actual.trim()); actual = ""; continue; }
      actual += c;
    }
    valores.push(actual.trim());

    const fila: Record<string, string> = {};
    encabezados.forEach((h, i) => { fila[h] = valores[i] ?? ""; });
    return fila;
  });
}

export async function POST(req: NextRequest) {
  try {
    const { tenantId, usuarioId } = await getTenantContext();

    const formData = await req.formData();
    const archivo  = formData.get("archivo") as File | null;
    if (!archivo) return NextResponse.json({ ok: false, error: "No se recibió archivo" }, { status: 400 });

    const texto = await archivo.text();
    const filas = parsearCSV(texto);
    if (!filas.length) return NextResponse.json({ ok: false, error: "El archivo está vacío o mal formateado" }, { status: 400 });

    // Verificar columnas mínimas
    if (!("nombre" in filas[0]) || !("precio" in filas[0])) {
      return NextResponse.json({
        ok: false,
        error: "El CSV debe tener las columnas: nombre, precio",
      }, { status: 400 });
    }

    // Buscar categorías existentes del tenant para mapear por nombre
    const categorias = await prisma.categoria.findMany({
      where:  { tenantId },
      select: { id: true, nombre: true },
    });
    const catMap = new Map(categorias.map((c) => [c.nombre.toLowerCase(), c.id]));

    const resultados = { creados: 0, errores: 0, detallesError: [] as string[] };

    for (let i = 0; i < filas.length; i++) {
      const fila   = filas[i];
      const linea  = i + 2; // +2 por encabezado y base 1
      const nombre = fila.nombre?.trim();
      const precio = parseFloat(fila.precio ?? "");

      if (!nombre) {
        resultados.errores++;
        resultados.detallesError.push(`Fila ${linea}: nombre vacío`);
        continue;
      }
      if (isNaN(precio) || precio <= 0) {
        resultados.errores++;
        resultados.detallesError.push(`Fila ${linea}: precio inválido (${fila.precio})`);
        continue;
      }

      const categoriaId = fila.categoria
        ? catMap.get(fila.categoria.toLowerCase()) ?? null
        : null;

      try {
        const producto = await prisma.producto.create({
          data: {
            tenantId,
            nombre,
            precio,
            costo:          fila.costo       ? parseFloat(fila.costo)       : null,
            stock:          fila.stock        ? parseInt(fila.stock)         : 0,
            stockMinimo:    fila.stock_minimo ? parseInt(fila.stock_minimo)  : 5,
            unidad:         fila.unidad       || null,
            descripcion:    fila.descripcion  || null,
            codigoProducto: fila.codigo_producto || null,
            codigoBarras:   fila.codigo_barras   || null,
            categoriaId,
          },
        });

        // Movimiento de stock inicial si tiene stock
        const stockInicial = fila.stock ? parseInt(fila.stock) : 0;
        if (stockInicial > 0) {
          await prisma.movimiento.create({
            data: {
              tenantId,
              productoId:      producto.id,
              productoNombre:  producto.nombre,
              tipo:            "ENTRADA",
              cantidad:        stockInicial,
              stockAnterior:   0,
              stockResultante: stockInicial,
              motivo:          "Stock inicial — importación CSV",
              usuarioId,
            },
          });
        }

        resultados.creados++;
      } catch (err: any) {
        resultados.errores++;
        resultados.detallesError.push(`Fila ${linea}: ${err.message}`);
      }
    }

    return NextResponse.json({ ok: true, ...resultados });
  } catch (error) {
    console.error("[POST /api/productos/importar]", error);
    return NextResponse.json({ ok: false, error: "Error al importar" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";