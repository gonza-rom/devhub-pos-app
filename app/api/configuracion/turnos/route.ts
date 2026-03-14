// app/api/configuracion/turnos/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";
import { TURNOS_DEFAULT, type ConfigTurnos } from "@/lib/turnos";

export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await getTenantContext();

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { horariosTurnos: true },
    });

    // Cast correcto de JsonValue a ConfigTurnos
    const config = tenant?.horariosTurnos 
      ? (tenant.horariosTurnos as unknown as ConfigTurnos)
      : TURNOS_DEFAULT;

    return NextResponse.json({ ok: true, data: config });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { tenantId } = await getTenantContext();
    const config = await req.json() as ConfigTurnos;

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { horariosTurnos: config as any }, // Cast a any para Prisma JsonValue
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";