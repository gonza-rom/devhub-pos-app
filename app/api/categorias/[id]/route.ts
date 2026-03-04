// app/api/categorias/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

type Params = { params: Promise<{ id: string }> };

// GET /api/categorias/:id
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { tenantId } = await getTenantContext();
    const { id } = await params;

    const categoria = await prisma.categoria.findFirst({
      where: { id, tenantId },
      include: {
        _count: {
          select: { productos: true },
        },
      },
    });

    if (!categoria) {
      return NextResponse.json(
        { ok: false, error: "Categoría no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: categoria });
  } catch (error) {
    console.error("[GET /api/categorias/:id]", error);
    return NextResponse.json(
      { ok: false, error: "Error al obtener categoría" },
      { status: 500 }
    );
  }
}

// PUT /api/categorias/:id
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { tenantId, rol } = await getTenantContext();
    const { id } = await params;

    if (rol === "EMPLEADO") {
      return NextResponse.json(
        { ok: false, error: "Sin permisos para esta acción" },
        { status: 403 }
      );
    }

    // Verificar que la categoría pertenece al tenant
    const existente = await prisma.categoria.findFirst({
      where: { id, tenantId },
    });

    if (!existente) {
      return NextResponse.json(
        { ok: false, error: "Categoría no encontrada" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { nombre, descripcion } = body;

    if (!nombre?.trim()) {
      return NextResponse.json(
        { ok: false, error: "El nombre es requerido" },
        { status: 400 }
      );
    }

    const categoria = await prisma.categoria.update({
      where: { id },
      data: {
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || null,
      },
      include: {
        _count: {
          select: { productos: true },
        },
      },
    });

    return NextResponse.json({ ok: true, data: categoria });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { ok: false, error: "Ya existe una categoría con ese nombre" },
        { status: 409 }
      );
    }
    console.error("[PUT /api/categorias/:id]", error);
    return NextResponse.json(
      { ok: false, error: "Error al actualizar categoría" },
      { status: 500 }
    );
  }
}

// DELETE /api/categorias/:id
// Soft approach: desvincula productos (setea categoriaId = null) antes de eliminar
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { tenantId, rol } = await getTenantContext();
    const { id } = await params;

    if (rol === "EMPLEADO") {
      return NextResponse.json(
        { ok: false, error: "Sin permisos para esta acción" },
        { status: 403 }
      );
    }

    // Verificar que la categoría pertenece al tenant
    const existente = await prisma.categoria.findFirst({
      where: { id, tenantId },
      include: {
        _count: { select: { productos: true } },
      },
    });

    if (!existente) {
      return NextResponse.json(
        { ok: false, error: "Categoría no encontrada" },
        { status: 404 }
      );
    }

    // Desvincular los productos en lugar de eliminarlos
    // (el schema tiene onDelete: SetNull en Producto.categoriaId)
    await prisma.categoria.delete({
      where: { id },
    });

    return NextResponse.json({
      ok: true,
      message: `Categoría eliminada. ${existente._count.productos} producto(s) quedaron sin categoría.`,
    });
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json(
        { ok: false, error: "Categoría no encontrada" },
        { status: 404 }
      );
    }
    console.error("[DELETE /api/categorias/:id]", error);
    return NextResponse.json(
      { ok: false, error: "Error al eliminar categoría" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";