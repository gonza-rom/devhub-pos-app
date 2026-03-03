import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminSecret } from "@/lib/admin-auth";

// GET /api/tenants/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminSecret(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      comercio: true,
      _count: {
        select: { usuarios: true, productos: true, ventas: true },
      },
    },
  });

  if (!tenant) {
    return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, data: tenant });
}

// PATCH /api/tenants/[id] — Cambiar plan, activar/desactivar
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminSecret(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const { plan, activo } = await req.json();

  const updateData: Record<string, unknown> = {};
  if (plan !== undefined) updateData.plan = plan;
  if (activo !== undefined) updateData.activo = activo;

  const tenant = await prisma.tenant.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({ ok: true, data: tenant });
}

// DELETE /api/tenants/[id] — Soft delete
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminSecret(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  await prisma.tenant.update({
    where: { id },
    data: { activo: false },
  });

  return NextResponse.json({ ok: true });
}