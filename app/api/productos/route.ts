// app/api/productos/route.ts
// ⚠️  Este archivo REEMPLAZA al route.ts existente en el proyecto.
//     Mantiene la lógica del JMR pero agrega multi-tenancy y TypeScript.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantContext, verificarLimiteProductos } from "@/lib/tenant";

// Helper: string vacío → null
function toNullIfEmpty(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
}

// ── GET /api/productos ─────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await getTenantContext();
    const { searchParams } = new URL(req.url);

    // Paginación
    const page     = Math.max(1, parseInt(searchParams.get("page")     ?? "1"));
    const pageSize = Math.min(50, parseInt(searchParams.get("pageSize") ?? "20"));
    const skip     = (page - 1) * pageSize;

    // Filtros (compatibles con JMR)
    const busqueda    = searchParams.get("busqueda") ?? searchParams.get("q") ?? "";
    const categoriaId = searchParams.get("categoria") ?? searchParams.get("categoriaId") ?? "";
    const stockBajo   = searchParams.get("stockBajo") === "true";
    const soloActivos = searchParams.get("activos") !== "false";
    const ordenar     = searchParams.get("ordenar") ?? "nombre";

    const where: any = { tenantId };

    if (soloActivos) where.activo = true;
    if (stockBajo) where.stock = { lte: 5 }; // Aproximación; el filtro exacto es post-query

    if (busqueda.trim()) {
      where.OR = [
        { nombre:         { contains: busqueda, mode: "insensitive" } },
        { descripcion:    { contains: busqueda, mode: "insensitive" } },
        { codigoProducto: { contains: busqueda, mode: "insensitive" } },
        { codigoBarras:   { contains: busqueda, mode: "insensitive" } },
      ];
    }

    if (categoriaId) where.categoriaId = categoriaId; // cuid (string), no parseInt

    let orderBy: any = { nombre: "asc" };
    if (ordenar === "precio-asc")  orderBy = { precio: "asc" };
    if (ordenar === "precio-desc") orderBy = { precio: "desc" };
    if (ordenar === "recientes")   orderBy = { createdAt: "desc" };

    const [productos, total] = await Promise.all([
      prisma.producto.findMany({
        where,
        include: {
          categoria: { select: { id: true, nombre: true } },
          proveedor:  { select: { id: true, nombre: true } },
        },
        orderBy,
        skip,
        take: pageSize,
      }),
      prisma.producto.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json({
      ok: true,
      data: productos,
      // Mantener "productos" para compatibilidad con código JMR que lo lea así
      productos,
      meta: { page, pageSize, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
      pagination: { page, pageSize, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    });

  } catch (error) {
    console.error("[GET /api/productos]", error);
    return NextResponse.json({ ok: false, error: "Error al obtener productos" }, { status: 500 });
  }
}

// ── POST /api/productos ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { tenantId, usuarioId } = await getTenantContext();

    // Verificar límite del plan (FREE = 50 productos)
    await verificarLimiteProductos(tenantId);

    const body = await req.json();
    const {
      nombre, descripcion, precio, stock, stockMinimo,
      imagen, imagenes, categoriaId, proveedorId,
      codigoBarras, codigoProducto, costo, unidad,
    } = body;

    // Validaciones
    if (!nombre || precio === undefined || precio === "") {
      return NextResponse.json(
        { ok: false, error: "Nombre y precio son requeridos" },
        { status: 400 }
      );
    }
    if (parseFloat(precio) <= 0) {
      return NextResponse.json(
        { ok: false, error: "El precio debe ser mayor a 0" },
        { status: 400 }
      );
    }

    const codigoProductoFinal = toNullIfEmpty(codigoProducto);
    const codigoBarrasFinal   = toNullIfEmpty(codigoBarras);

    // Verificar unicidad por tenant (no global)
    if (codigoProductoFinal) {
      const existente = await prisma.producto.findFirst({
        where: { tenantId, codigoProducto: codigoProductoFinal },
      });
      if (existente) {
        return NextResponse.json(
          { ok: false, error: `El código "${codigoProductoFinal}" ya está en uso por: ${existente.nombre}` },
          { status: 409 }
        );
      }
    }

    if (codigoBarrasFinal) {
      const existente = await prisma.producto.findFirst({
        where: { tenantId, codigoBarras: codigoBarrasFinal },
      });
      if (existente) {
        return NextResponse.json(
          { ok: false, error: `El código de barras "${codigoBarrasFinal}" ya está en uso por: ${existente.nombre}` },
          { status: 409 }
        );
      }
    }

    const imagenPrincipal =
      toNullIfEmpty(imagen) ??
      (Array.isArray(imagenes) && imagenes.length > 0 ? imagenes[0] : null);

    const producto = await prisma.producto.create({
      data: {
        tenantId,
        nombre:         nombre.trim(),
        descripcion:    toNullIfEmpty(descripcion),
        precio:         parseFloat(precio),
        costo:          costo ? parseFloat(costo) : null,
        stock:          parseInt(stock) || 0,
        stockMinimo:    stockMinimo !== undefined && stockMinimo !== "" ? parseInt(stockMinimo) : 5,
        unidad:         toNullIfEmpty(unidad),
        imagen:         imagenPrincipal,
        imagenes:       Array.isArray(imagenes) ? imagenes : [],
        categoriaId:    toNullIfEmpty(categoriaId),
        proveedorId:    toNullIfEmpty(proveedorId),
        codigoProducto: codigoProductoFinal,
        codigoBarras:   codigoBarrasFinal,
      },
      include: {
        categoria: { select: { id: true, nombre: true } },
        proveedor:  { select: { id: true, nombre: true } },
      },
    });

    // Registrar movimiento de stock inicial
    if (producto.stock > 0) {
      await prisma.movimiento.create({
        data: {
          tenantId,
          productoId:      producto.id,
          productoNombre:  producto.nombre,
          tipo:            "ENTRADA",
          cantidad:        producto.stock,
          stockAnterior:   0,
          stockResultante: producto.stock,
          motivo:          "Stock inicial al crear producto",
          usuarioId,
        },
      });
    }

    return NextResponse.json({ ok: true, data: producto }, { status: 201 });

  } catch (error: any) {
    if (error.code === "P2002") {
      const field = error.meta?.target?.[0];
      const msg =
        field === "codigoBarras"   ? "El código de barras ya existe en otro producto" :
        field === "codigoProducto" ? "El código interno ya existe en otro producto" :
        "Ya existe un producto con ese código";
      return NextResponse.json({ ok: false, error: msg }, { status: 409 });
    }
    // Error de límite de plan
    if (error.message?.includes("Límite de productos")) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 403 });
    }
    console.error("[POST /api/productos]", error);
    return NextResponse.json({ ok: false, error: "Error al crear producto" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";