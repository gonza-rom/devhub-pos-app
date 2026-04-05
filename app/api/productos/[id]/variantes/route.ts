// app/api/productos/[id]/variantes/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

type Params = { params: Promise<{ id: string }> };

// ── GET /api/productos/:id/variantes ──────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { tenantId } = await getTenantContext();
    const { id } = await params;

    const producto = await prisma.producto.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });

    if (!producto)
      return NextResponse.json({ ok: false, error: "Producto no encontrado" }, { status: 404 });

    const variantes = await prisma.productoVariante.findMany({
      where:   { productoId: id, tenantId },
      orderBy: [{ talle: "asc" }, { color: "asc" }],
    });

    return NextResponse.json({ ok: true, data: variantes });
  } catch (error) {
    console.error("[GET /api/productos/:id/variantes]", error);
    return NextResponse.json({ ok: false, error: "Error al obtener variantes" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";