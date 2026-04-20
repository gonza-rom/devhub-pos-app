// app/api/categorias/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

// GET /api/categorias
export async function GET() {
  try {
    const { tenantId } = await getTenantContext();

    const categorias = await prisma.categoria.findMany({
      where:   { tenantId },
      include: {
        _count: { select: { productos: true } },
        hijas: {
          include: {
            _count: { select: { productos: true } },
            hijas: {
              include: {
                _count: { select: { productos: true } },
                hijas: {
                  include: { _count: { select: { productos: true } } },
                },
              },
            },
          },
          orderBy: { nombre: "asc" },
        },
      },
      orderBy: { nombre: "asc" },
    });

    // Solo devolver raíces (sin padre) — las hijas vienen anidadas
    const raices = categorias.filter(c => !(c as any).padreId);
    return NextResponse.json({ ok: true, data: raices });
  } catch (error) {
    console.error("[GET /api/categorias]", error);
    return NextResponse.json({ ok: false, error: "Error al obtener categorías" }, { status: 500 });
  }
}

// POST /api/categorias
export async function POST(req: NextRequest) {
  try {
    const { tenantId, rol } = await getTenantContext();

    if (rol === "EMPLEADO") {
      return NextResponse.json({ ok: false, error: "Sin permisos para esta acción" }, { status: 403 });
    }

    const body = await req.json();
    const { nombre, descripcion, padreId } = body;

    if (!nombre?.trim()) {
      return NextResponse.json({ ok: false, error: "El nombre es requerido" }, { status: 400 });
    }

    // Verificar que el padre pertenece al tenant
    if (padreId) {
      const padre = await prisma.categoria.findFirst({ where: { id: padreId, tenantId } });
      if (!padre) {
        return NextResponse.json({ ok: false, error: "Categoría padre no encontrada" }, { status: 404 });
      }
    }

    const categoria = await prisma.categoria.create({
      data: {
        tenantId,
        nombre:      nombre.trim(),
        descripcion: descripcion?.trim() || null,
        padreId:     padreId || null,
      },
      include: { _count: { select: { productos: true } } },
    });

    return NextResponse.json({ ok: true, data: categoria }, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ ok: false, error: "Ya existe una categoría con ese nombre" }, { status: 409 });
    }
    console.error("[POST /api/categorias]", error);
    return NextResponse.json({ ok: false, error: "Error al crear categoría" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";