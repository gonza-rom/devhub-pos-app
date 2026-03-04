// app/api/admin/tenants/[id]/route.ts
// Actualiza plan y/o estado activo de un tenant — solo superadmin

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const { plan, activo } = await req.json();

    const data: Record<string, unknown> = {};
    if (plan   !== undefined) data.plan   = plan;
    if (activo !== undefined) data.activo = activo;

    if (Object.keys(data).length === 0)
      return NextResponse.json({ ok: false, error: "Nada que actualizar" }, { status: 400 });

    const tenant = await prisma.tenant.update({
      where: { id },
      data,
      select: { id: true, plan: true, activo: true },
    });

    // Si cambia el plan, sincronizar también la suscripción
    if (plan !== undefined) {
      await prisma.suscripcion.upsert({
        where:  { tenantId: id },
        update: { plan },
        create: { tenantId: id, plan, estado: "authorized" },
      });
    }

    return NextResponse.json({ ok: true, data: tenant });
  } catch (err: any) {
    console.error("[PATCH /api/admin/tenants/[id]]", err);
    return NextResponse.json(
      { ok: false, error: err.message ?? "Error interno" },
      { status: 500 }
    );
  }
}