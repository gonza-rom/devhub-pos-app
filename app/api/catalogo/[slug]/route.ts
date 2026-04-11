// app/api/catalogo/[slug]/route.ts
// GET público — no requiere autenticación
// Devuelve tenant + productos visibles en catálogo

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { slug } = await params;

    const tenant = await prisma.tenant.findUnique({
      where:  { slug },
      select: {
        id:        true,
        nombre:    true,
        logoUrl:   true,
        telefono:  true,
        direccion: true,
        ciudad:    true,
        descripcion: true,
        instagram: true,
        facebook:  true,
      },
    });

    if (!tenant) {
      return NextResponse.json({ ok: false, error: "Negocio no encontrado" }, { status: 404 });
    }

    const productos = await prisma.producto.findMany({
      where: {
        tenantId:        tenant.id,
        activo:          true,
        visibleCatalogo: true,
      },
      select: {
        id:          true,
        nombre:      true,
        descripcion: true,
        precio:      true,
        imagen:      true,
        imagenes:    true,
        categoria:   { select: { id: true, nombre: true } },
      },
      orderBy: { nombre: "asc" },
    });

    const categorias = [...new Map(
      productos
        .filter(p => p.categoria)
        .map(p => [p.categoria!.id, p.categoria!])
    ).values()];

    return NextResponse.json({
      ok: true,
      data: {
        tenant,
        productos,
        categorias,
      },
    });
  } catch (error) {
    console.error("[GET /api/catalogo/:slug]", error);
    return NextResponse.json({ ok: false, error: "Error al cargar el catálogo" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";