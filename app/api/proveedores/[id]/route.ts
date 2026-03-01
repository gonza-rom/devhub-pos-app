// app/api/proveedores/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

type Params = { params: Promise<{ id: string }> };

// GET /api/proveedores/:id
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { tenantId } = await getTenantContext();
    const { id } = await params;

    const proveedor = await prisma.proveedor.findFirst({
      where: { id, tenantId },
      include: {
        _count: {
          select: { productos: true },
        },
      },
    });

    if (!proveedor) {
      return NextResponse.json(
        { ok: false, error: "Proveedor no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: proveedor });
  } catch (error) {
    console.error("[GET /api/proveedores/:id]", error);
    return NextResponse.json(
      { ok: false, error: "Error al obtener proveedor" },
      { status: 500 }
    );
  }
}

// PUT /api/proveedores/:id
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

    // Verificar que el proveedor pertenece al tenant
    const existente = await prisma.proveedor.findFirst({
      where: { id, tenantId },
    });

    if (!existente) {
      return NextResponse.json(
        { ok: false, error: "Proveedor no encontrado" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { nombre, telefono, email, direccion, notas } = body;

    if (!nombre?.trim()) {
      return NextResponse.json(
        { ok: false, error: "El nombre es requerido" },
        { status: 400 }
      );
    }

    const proveedor = await prisma.proveedor.update({
      where: { id },
      data: {
        nombre:    nombre.trim(),
        telefono:  telefono?.trim()  || null,
        email:     email?.trim()     || null,
        direccion: direccion?.trim() || null,
        notas:     notas?.trim()     || null,
      },
      include: {
        _count: {
          select: { productos: true },
        },
      },
    });

    return NextResponse.json({ ok: true, data: proveedor });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { ok: false, error: "Ya existe un proveedor con ese email" },
        { status: 409 }
      );
    }
    console.error("[PUT /api/proveedores/:id]", error);
    return NextResponse.json(
      { ok: false, error: "Error al actualizar proveedor" },
      { status: 500 }
    );
  }
}

// DELETE /api/proveedores/:id
// Desvincula los productos (proveedorId = null) en lugar de eliminarlos
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

    // Verificar que el proveedor pertenece al tenant
    const existente = await prisma.proveedor.findFirst({
      where: { id, tenantId },
      include: {
        _count: { select: { productos: true } },
      },
    });

    if (!existente) {
      return NextResponse.json(
        { ok: false, error: "Proveedor no encontrado" },
        { status: 404 }
      );
    }

    // El schema tiene onDelete: SetNull en Producto.proveedorId,
    // así que al borrar el proveedor los productos quedan con proveedorId = null
    await prisma.proveedor.delete({
      where: { id },
    });

    return NextResponse.json({
      ok: true,
      message: `Proveedor eliminado. ${existente._count.productos} producto(s) quedaron sin proveedor.`,
    });
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json(
        { ok: false, error: "Proveedor no encontrado" },
        { status: 404 }
      );
    }
    console.error("[DELETE /api/proveedores/:id]", error);
    return NextResponse.json(
      { ok: false, error: "Error al eliminar proveedor" },
      { status: 500 }
    );
  }
}