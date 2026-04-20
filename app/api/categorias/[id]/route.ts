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
      where:   { id, tenantId },
      include: { _count: { select: { productos: true } } },
    });

    if (!categoria) {
      return NextResponse.json({ ok: false, error: "Categoría no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: categoria });
  } catch (error) {
    console.error("[GET /api/categorias/:id]", error);
    return NextResponse.json({ ok: false, error: "Error al obtener categoría" }, { status: 500 });
  }
}

// PUT /api/categorias/:id
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { tenantId, rol } = await getTenantContext();
    const { id } = await params;

    if (rol === "EMPLEADO") {
      return NextResponse.json({ ok: false, error: "Sin permisos para esta acción" }, { status: 403 });
    }

    const existente = await prisma.categoria.findFirst({ where: { id, tenantId } });
    if (!existente) {
      return NextResponse.json({ ok: false, error: "Categoría no encontrada" }, { status: 404 });
    }

    const body = await req.json();
    const { nombre, descripcion, padreId } = body;

    if (!nombre?.trim()) {
      return NextResponse.json({ ok: false, error: "El nombre es requerido" }, { status: 400 });
    }

    // No puede ser su propio padre
    if (padreId === id) {
      return NextResponse.json({ ok: false, error: "Una categoría no puede ser su propio padre" }, { status: 400 });
    }

    // Verificar que el padre pertenece al tenant y no es descendiente de esta categoría
    if (padreId) {
      const padre = await prisma.categoria.findFirst({ where: { id: padreId, tenantId } });
      if (!padre) {
        return NextResponse.json({ ok: false, error: "Categoría padre no encontrada" }, { status: 404 });
      }

      // Verificar que el padre no es un descendiente (evitar ciclos)
      const esDescendiente = await verificarDescendiente(id, padreId);
      if (esDescendiente) {
        return NextResponse.json({ ok: false, error: "No se puede crear una referencia circular entre categorías" }, { status: 400 });
      }
    }

    const categoria = await prisma.categoria.update({
      where:   { id },
      data: {
        nombre:      nombre.trim(),
        descripcion: descripcion?.trim() || null,
        padreId:     padreId || null,
      },
      include: { _count: { select: { productos: true } } },
    });

    return NextResponse.json({ ok: true, data: categoria });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ ok: false, error: "Ya existe una categoría con ese nombre" }, { status: 409 });
    }
    console.error("[PUT /api/categorias/:id]", error);
    return NextResponse.json({ ok: false, error: "Error al actualizar categoría" }, { status: 500 });
  }
}

// DELETE /api/categorias/:id
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { tenantId, rol } = await getTenantContext();
    const { id } = await params;

    if (rol === "EMPLEADO") {
      return NextResponse.json({ ok: false, error: "Sin permisos para esta acción" }, { status: 403 });
    }

    const existente = await prisma.categoria.findFirst({
      where:   { id, tenantId },
      include: { _count: { select: { productos: true } }, hijas: { select: { id: true } } },
    });

    if (!existente) {
      return NextResponse.json({ ok: false, error: "Categoría no encontrada" }, { status: 404 });
    }

    // Si tiene subcategorías, moverlas a la raíz (padreId = null)
    if ((existente as any).hijas?.length > 0) {
      await prisma.categoria.updateMany({
        where: { padreId: id },
        data:  { padreId: null },
      });
    }

    await prisma.categoria.delete({ where: { id } });

    return NextResponse.json({
      ok:      true,
      message: `Categoría eliminada. ${existente._count.productos} producto(s) quedaron sin categoría.`,
    });
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json({ ok: false, error: "Categoría no encontrada" }, { status: 404 });
    }
    console.error("[DELETE /api/categorias/:id]", error);
    return NextResponse.json({ ok: false, error: "Error al eliminar categoría" }, { status: 500 });
  }
}

// Helper: verificar si targetId es descendiente de sourceId
async function verificarDescendiente(sourceId: string, targetId: string): Promise<boolean> {
  const hijas = await prisma.categoria.findMany({
    where:  { padreId: sourceId },
    select: { id: true },
  });
  for (const hija of hijas) {
    if (hija.id === targetId) return true;
    if (await verificarDescendiente(hija.id, targetId)) return true;
  }
  return false;
}

export const dynamic = "force-dynamic";