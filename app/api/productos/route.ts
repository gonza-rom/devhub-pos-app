// app/api/productos/route.ts
// OPTIMIZADO:
// - GET: caché con unstable_cache para llamadas frecuentes del POS
// - POST: sin cambios de lógica, ya estaba bien

import { NextRequest, NextResponse } from "next/server";
import { revalidateTag, unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getTenantContext, verificarLimiteProductos } from "@/lib/tenant";

function toNullIfEmpty(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
}

// ✅ Caché de categorías — se llaman en cada carga del POS, cambian muy poco
const getCategoriasCached = (tenantId: string) =>
  unstable_cache(
    () =>
      prisma.categoria.findMany({
        where:   { tenantId },
        select:  { id: true, nombre: true },
        orderBy: { nombre: "asc" },
      }),
    [`categorias-${tenantId}`],
    { tags: [`tenant-${tenantId}`, "categorias"], revalidate: 300 } // 5 min
  )();


  const getProveedoresCached = (tenantId: string) =>
  unstable_cache(
    () => prisma.proveedor.findMany({
      where: { tenantId },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
    [`proveedores-${tenantId}`],
    { tags: [`tenant-${tenantId}`, "proveedores"], revalidate: 300 }
  )()

// ── GET /api/productos ─────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await getTenantContext();
    const { searchParams } = new URL(req.url);

    const page     = Math.max(1, parseInt(searchParams.get("page")     ?? "1"));
    const pageSize = Math.min(100, parseInt(searchParams.get("pageSize") ?? "20"));
    const skip     = (page - 1) * pageSize;

    const busqueda    = searchParams.get("busqueda") ?? searchParams.get("q") ?? "";
    const categoriaId = searchParams.get("categoria") ?? searchParams.get("categoriaId") ?? "";
    const stockBajo   = searchParams.get("stockBajo") === "true";
    const soloActivos = searchParams.get("activos") !== "false";
    const ordenar     = searchParams.get("ordenar") ?? "nombre";

    // ✅ Endpoint especial: solo categorías (para selectores del front)
    if (searchParams.get("solo") === "categorias") {
      const categorias = await getCategoriasCached(tenantId);
      return NextResponse.json({ ok: true, data: categorias });
    }

    const where: any = { tenantId };
    if (soloActivos) where.activo = true;
    if (stockBajo)   where.stock  = { lte: 5 };
    if (categoriaId) where.categoriaId = categoriaId;
    if (busqueda.trim()) {
      where.OR = [
        { nombre:         { contains: busqueda, mode: "insensitive" } },
        { codigoProducto: { contains: busqueda, mode: "insensitive" } },
        { codigoBarras:   { contains: busqueda, mode: "insensitive" } },
        // ✅ descripcion removida — rara vez útil en búsqueda rápida y es campo largo
      ];
    }

    let orderBy: any = { nombre: "asc" };
    if (ordenar === "precio-asc")  orderBy = { precio: "asc" };
    if (ordenar === "precio-desc") orderBy = { precio: "desc" };
    if (ordenar === "recientes")   orderBy = { createdAt: "desc" };
    if (ordenar === "stock-asc")   orderBy = { stock: "asc" };

    // ✅ select explícito — evita traer imagenes[], descripcion larga, etc. en listados
    const esPOS = searchParams.get("modo") === "pos";
    const selectProducto = esPOS
      ? {
          // Modo POS: solo lo mínimo para mostrar en pantalla de venta
          id: true, nombre: true, precio: true, stock: true,stockMinimo: true,
          imagen: true, codigoBarras: true, codigoProducto: true,
          categoriaId: true,
          tieneVariantes: true,
          categoria: { select: { id: true, nombre: true } },
        }
      : {
          // Modo admin/listado: incluye más campos
          id: true, nombre: true, descripcion: true, precio: true, costo: true,
          stock: true, stockMinimo: true, unidad: true, imagen: true, imagenes: true,
          activo: true, categoriaId: true, proveedorId: true,
          codigoProducto: true, codigoBarras: true, createdAt: true,
          tieneVariantes: true,
          categoria: { select: { id: true, nombre: true } },
          proveedor:  { select: { id: true, nombre: true } },
        };

    const [productos, total] = await Promise.all([
      prisma.producto.findMany({
        where,
        select:  selectProducto,
        orderBy, skip, take: pageSize,
      }),
      prisma.producto.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json({
      ok:         true,
      data:       productos,
      productos,  // compatibilidad con código existente
      meta:       { page, pageSize, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
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
    await verificarLimiteProductos(tenantId);

    const body = await req.json();
    const {
      nombre, descripcion, precio, stock, stockMinimo,
      imagen, imagenes, categoriaId, proveedorId,
      codigoBarras, codigoProducto, costo, unidad,
    } = body;

    if (!nombre || precio === undefined || precio === "")
      return NextResponse.json({ ok: false, error: "Nombre y precio son requeridos" }, { status: 400 });
    if (parseFloat(precio) <= 0)
      return NextResponse.json({ ok: false, error: "El precio debe ser mayor a 0" }, { status: 400 });

    const codigoProductoFinal = toNullIfEmpty(codigoProducto);
    const codigoBarrasFinal   = toNullIfEmpty(codigoBarras);

    // ✅ Verificar duplicados en paralelo
    const [dupCodigo, dupBarras] = await Promise.all([
      codigoProductoFinal
        ? prisma.producto.findFirst({ where: { tenantId, codigoProducto: codigoProductoFinal, activo: true }, select: { nombre: true } })
        : null,
      codigoBarrasFinal
        ? prisma.producto.findFirst({ where: { tenantId, codigoBarras: codigoBarrasFinal, activo: true }, select: { nombre: true } })
        : null,
    ]);

    if (dupCodigo)
      return NextResponse.json({ ok: false, error: `El código "${codigoProductoFinal}" ya está en uso por: ${dupCodigo.nombre}` }, { status: 409 });
    if (dupBarras)
      return NextResponse.json({ ok: false, error: `El código de barras ya está en uso por: ${dupBarras.nombre}` }, { status: 409 });

    const imagenPrincipal =
      toNullIfEmpty(imagen) ??
      (Array.isArray(imagenes) && imagenes.length > 0 ? imagenes[0] : null);

    const stockFinal = parseInt(stock) || 0;

    // ✅ Crear producto y movimiento inicial en una sola transacción
    const producto = await prisma.$transaction(async (tx) => {
      const p = await tx.producto.create({
        data: {
          tenantId,
          nombre:         nombre.trim(),
          descripcion:    toNullIfEmpty(descripcion),
          precio:         parseFloat(precio),
          costo:          costo ? parseFloat(costo) : null,
          stock:          stockFinal,
          stockMinimo:    stockMinimo !== undefined && stockMinimo !== "" ? parseInt(stockMinimo) : 5,
          unidad:         toNullIfEmpty(unidad),
          imagen:         imagenPrincipal,
          imagenes:       Array.isArray(imagenes) ? imagenes : [],
          categoriaId:    toNullIfEmpty(categoriaId),
          proveedorId:    toNullIfEmpty(proveedorId),
          codigoProducto: codigoProductoFinal,
          codigoBarras:   codigoBarrasFinal,
          visibleCatalogo: body.visibleCatalogo ?? false,
        },
        include: {
          categoria: { select: { id: true, nombre: true } },
          proveedor:  { select: { id: true, nombre: true } },
        },
      });

      if (stockFinal > 0) {
        await tx.movimiento.create({
          data: {
            tenantId,
            productoId:      p.id,
            productoNombre:  p.nombre,
            tipo:            "ENTRADA",
            cantidad:        stockFinal,
            stockAnterior:   0,
            stockResultante: stockFinal,
            motivo:          "Stock inicial al crear producto",
            usuarioId,
          },
        });
      }

      return p;
    });

    revalidateTag("dashboard");
    revalidateTag(`tenant-${tenantId}`);
    revalidateTag("categorias"); // ✅ por si se creó con nueva categoría

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
    if (error.message?.includes("Límite de productos"))
      return NextResponse.json({ ok: false, error: error.message }, { status: 403 });
    console.error("[POST /api/productos]", error);
    return NextResponse.json({ ok: false, error: "Error al crear producto" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";