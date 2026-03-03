// app/api/suscripcion/crear/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPreapproval } from "@/lib/mercadopago";
import { getTenantContext } from "@/lib/tenant";

export async function POST() {
  try {
    const { tenantId, usuarioId, rol } = await getTenantContext();

    if (rol === "EMPLEADO") {
      return NextResponse.json(
        { ok: false, error: "Solo el propietario puede gestionar el plan" },
        { status: 403 }
      );
    }

    const [usuarioTenant, tenant] = await Promise.all([
      prisma.usuarioTenant.findUnique({
        where: { supabaseId: usuarioId },
        select: { email: true },
      }),
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { nombre: true, plan: true },
      }),
    ]);

    if (!usuarioTenant?.email) {
      return NextResponse.json(
        { ok: false, error: "No se pudo obtener el email del usuario" },
        { status: 400 }
      );
    }

    if (!tenant) {
      return NextResponse.json(
        { ok: false, error: "Tenant no encontrado" },
        { status: 404 }
      );
    }

    if (tenant.plan === "PRO" || tenant.plan === "ENTERPRISE") {
      return NextResponse.json(
        { ok: false, error: "Ya tenés un plan activo" },
        { status: 400 }
      );
    }

    const payerEmail = process.env.MP_TEST_PAYER_EMAIL ?? usuarioTenant.email;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const preapproval = await createPreapproval({
      tenantId,
      tenantNombre: tenant.nombre,
      payerEmail,
      backUrl: `${appUrl}/configuracion/plan?suscripcion=resultado`,
    });

    await prisma.suscripcion.upsert({
      where: { tenantId },
      update: {
        mpPreapprovalId: preapproval.id,
        estado: "pending",
      },
      create: {
        tenantId,
        plan: "PRO",
        estado: "pending",
        mpPreapprovalId: preapproval.id,
      },
    });

    return NextResponse.json({
      ok: true,
      initPoint: preapproval.init_point,
      preapprovalId: preapproval.id,
    });
  } catch (err: any) {
    console.error("[suscripcion/crear]", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}