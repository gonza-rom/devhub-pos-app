import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminSecret } from "@/lib/admin-auth";

// GET /api/tenants — Lista todos los tenants con stats
export async function GET(req: NextRequest) {
  if (!verifyAdminSecret(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          usuarios: true,
          productos: true,
          ventas: true,
        },
      },
      suscripcion: true,
    },
  });

  return NextResponse.json({ ok: true, data: tenants });
}

// POST /api/tenants — Crear tenant manualmente
export async function POST(req: NextRequest) {
  if (!verifyAdminSecret(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { nombre, slug, plan, email } = await req.json();

  if (!nombre || !slug) {
    return NextResponse.json({ error: "nombre y slug requeridos" }, { status: 400 });
  }

  // Verificar slug único
  const existe = await prisma.tenant.findUnique({ where: { slug } });
  if (existe) {
    return NextResponse.json({ error: "El slug ya está en uso" }, { status: 400 });
  }

  const tenant = await prisma.tenant.create({
    data: {
      nombre,
      email,
      slug,
      plan: plan ?? "FREE",
    },
  });

  return NextResponse.json({ ok: true, data: tenant }, { status: 201 });
}

export const dynamic = "force-dynamic";