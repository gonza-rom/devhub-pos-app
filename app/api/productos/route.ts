// app/api/productos/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantContext, verificarLimiteProductos } from "@/lib/tenant";

// GET /api/productos
// Listar productos del tenant con búsqueda y filtros
export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await getTenantContext();
    const { searchParams } = new URL(req.url);

    const busqueda = searchParams.get("q") ?? "";
    const categoriaId = searchParams.get("categoriaId");
    const soloActivos = searchParams.get("activos") !== "false";
    const stockBajo = searchParams.get("stockBajo") === "true";
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "50");
    const skip = (page - 1) * limit;

    const where = {
      tenantId,
      ...(soloActivos && { activo: true }),
      ...(categoriaId && { categoriaId }),
      ...(stockBajo && { stock: { lte: prisma.producto.fields.stockMinimo } }),
      ...(busqueda && {
        OR: [
          { nombre:         { contains: busqueda, mode: "insensitive" as const } },
          { codigoProducto: { contains: busqueda, mode: "insensitive" as const } },
          { codigoBarras:   { contains: busqueda, mode: "insensitive" as const } },
        ],
      }),
    };

    const [productos, total] = await Promise.all([
      prisma.producto.findMany({
        where,
        include: {
          categoria: { select: { id: true, nombre: true } },
          proveedor:  { select: { id: true, nombre: true } },
        },
        orderBy: { nombre: "asc" },
        skip,
        take: limit,
      }),
      prisma.producto.count({ where }),
    ]);

    return NextResponse.json({
      ok: true,
      data: productos,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });

  } catch (error) {
    console.error("[GET /api/productos]", error);
    return NextResponse.json({ ok: false, error: "Error al obtener productos" }, { status: 500 });
  }
}

// POST /api/productos
// Crear un nuevo producto
export async function POST(req: NextRequest) {
  try {
    const { tenantId, usuarioId } = await getTenantContext();

    // Verificar límite del plan
    await verificarLimiteProductos(tenantId);

    const body = await req.json();
    const {
      nombre, descripcion, codigoProducto, codigoBarras,
      precio, costo, stock, stockMinimo, unidad,
      imagen, imagenes, categoriaId, proveedorId,
    } = body;

    // Validaciones
    if (!nombre || typeof nombre !== "string") {
      return NextResponse.json({ ok: false, error: "El nombre es requerido" }, { status: 400 });
    }
    if (!precio || precio <= 0) {
      return NextResponse.json({ ok: false, error: "El precio debe ser mayor a 0" }, { status: 400 });
    }

    const producto = await prisma.producto.create({
      data: {
        tenantId,
        nombre:         nombre.trim(),
        descripcion:    descripcion?.trim(),
        codigoProducto: codigoProducto?.trim() || null,
        codigoBarras:   codigoBarras?.trim() || null,
        precio:         parseFloat(precio),
        costo:          costo ? parseFloat(costo) : null,
        stock:          parseInt(stock) || 0,
        stockMinimo:    parseInt(stockMinimo) || 5,
        unidad:         unidad?.trim() || null,
        imagen:         imagen || null,
        imagenes:       imagenes || [],
        categoriaId:    categoriaId || null,
        proveedorId:    proveedorId || null,
      },
      include: {
        categoria: { select: { id: true, nombre: true } },
        proveedor:  { select: { id: true, nombre: true } },
      },
    });

    // Si tiene stock inicial, crear movimiento de entrada
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
      return NextResponse.json(
        { ok: false, error: "Ya existe un producto con ese código" },
        { status: 409 }
      );
    }
    console.error("[POST /api/productos]", error);
    return NextResponse.json({ ok: false, error: error.message ?? "Error al crear producto" }, { status: 500 });
  }
}
