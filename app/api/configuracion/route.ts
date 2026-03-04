// app/api/configuracion/route.ts
// ARREGLADO: el PUT ahora SÍ llama revalidateTag (antes tenía el comentario pero no la llamada)

import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

// GET /api/configuracion
export async function GET() {
  try {
    const { tenantId } = await getTenantContext();

    const tenant = await prisma.tenant.findUnique({
      where:  { id: tenantId },
      select: {
        id: true, nombre: true, email: true, slug: true,
        logoUrl: true, telefono: true, direccion: true, plan: true,
        descripcion: true, cuit: true, sitioWeb: true,
        instagram: true, facebook: true, ciudad: true, provincia: true,
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
    if (body.nombre      !== undefined) data.nombre      = String(body.nombre).trim();
    if (body.telefono    !== undefined) data.telefono    = body.telefono    || null;
    if (body.direccion   !== undefined) data.direccion   = body.direccion   || null;
    if (body.logoUrl     !== undefined) data.logoUrl     = body.logoUrl     || null;
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

    // ✅ Ahora SÍ invalida el cache — antes tenía el comentario pero faltaba la llamada
    revalidateTag("tenant-config");
    revalidateTag(`tenant-${tenantId}`);

    return NextResponse.json({ ok: true, data: updated });
  } catch (err: any) {
    if (err.message === "No autenticado") return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    console.error("[PUT /api/configuracion]", err);
    return NextResponse.json({ ok: false, error: "Error al guardar" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";