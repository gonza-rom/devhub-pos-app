// app/api/proveedores/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

// GET /api/proveedores
export async function GET() {
  try {
    const { tenantId } = await getTenantContext();

    const proveedores = await prisma.proveedor.findMany({
      where: { tenantId },
      include: {
        _count: {
          select: { productos: true },
        },
      },
      orderBy: { nombre: "asc" },
    });

    return NextResponse.json({ ok: true, data: proveedores });
  } catch (error) {
    console.error("[GET /api/proveedores]", error);
    return NextResponse.json(
      { ok: false, error: "Error al obtener proveedores" },
      { status: 500 }
    );
  }
}

// POST /api/proveedores
export async function POST(req: NextRequest) {
  try {
    const { tenantId, rol } = await getTenantContext();

    if (rol === "EMPLEADO") {
      return NextResponse.json(
        { ok: false, error: "Sin permisos para esta acción" },
        { status: 403 }
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

    const proveedor = await prisma.proveedor.create({
      data: {
        tenantId,
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

    return NextResponse.json({ ok: true, data: proveedor }, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { ok: false, error: "Ya existe un proveedor con ese email" },
        { status: 409 }
      );
    }
    console.error("[POST /api/proveedores]", error);
    return NextResponse.json(
      { ok: false, error: "Error al crear proveedor" },
      { status: 500 }
    );
  }
}