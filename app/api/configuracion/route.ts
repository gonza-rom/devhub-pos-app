// app/api/configuracion/route.ts
// ACTUALIZADO: invalida el cache del layout cuando se guarda la configuración

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";
import { revalidateTag } from "next/cache";

// GET /api/configuracion
export async function GET() {
  try {
    const { tenantId } = await getTenantContext();

    const tenant = await prisma.tenant.findUnique({
      where:  { id: tenantId },
      select: {
        id: true, nombre: true, email: true, slug: true,
        logoUrl: true, telefono: true, direccion: true, plan: true,
        descripcion: true, cuit: true, sitioWeb: true,    // ← agregar
        instagram: true, facebook: true, ciudad: true, provincia: true, // ← agregar
      },
    });

    if (!tenant) return NextResponse.json({ ok: false, error: "Comercio no encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true, data: tenant });
  } catch (err: any) {
    if (err.message === "No autenticado") return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    console.error("[GET /api/configuracion]", err);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}

// PUT /api/configuracion
export async function PUT(req: NextRequest) {
  try {
    const { tenantId, rol } = await getTenantContext();

    if (rol === "EMPLEADO") return NextResponse.json({ ok: false, error: "Sin permisos" }, { status: 403 });

    const body = await req.json();

    const data: Record<string, any> = {};
    if (body.nombre    !== undefined) data.nombre    = String(body.nombre).trim();
    if (body.telefono  !== undefined) data.telefono  = body.telefono  || null;
    if (body.direccion !== undefined) data.direccion = body.direccion || null;
    if (body.logoUrl   !== undefined) data.logoUrl   = body.logoUrl   || null;
    if (body.descripcion !== undefined) data.descripcion = body.descripcion || null;
    if (body.cuit        !== undefined) data.cuit        = body.cuit        || null;
    if (body.sitioWeb    !== undefined) data.sitioWeb    = body.sitioWeb    || null;
    if (body.instagram   !== undefined) data.instagram   = body.instagram   || null;
    if (body.facebook    !== undefined) data.facebook    = body.facebook    || null;
    if (body.ciudad      !== undefined) data.ciudad      = body.ciudad      || null;
    if (body.provincia   !== undefined) data.provincia   = body.provincia   || null;

    if (!data.nombre) return NextResponse.json({ ok: false, error: "El nombre es obligatorio" }, { status: 400 });

    const updated = await prisma.tenant.update({
      where:  { id: tenantId },
      data,
      select: { id: true, nombre: true, email: true, logoUrl: true, telefono: true, direccion: true, plan: true },
    });

    // Invalida el cache del layout para que el Sidebar refleje los cambios
    // en el próximo request (máximo 30s de delay sin esto, 0 con esto)
    revalidateTag("tenant-config");

    return NextResponse.json({ ok: true, data: updated });
  } catch (err: any) {
    if (err.message === "No autenticado") return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    console.error("[PUT /api/configuracion]", err);
    return NextResponse.json({ ok: false, error: "Error al guardar" }, { status: 500 });
  }
}