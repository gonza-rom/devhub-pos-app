// app/api/configuracion/logo/route.ts
// ARREGLADO: agrega revalidateTag para que el Sidebar refleje el nuevo logo

import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

// POST /api/configuracion/logo
export async function POST(req: NextRequest) {
  try {
    const { tenantId, rol } = await getTenantContext();

    if (rol === "EMPLEADO")
      return NextResponse.json({ ok: false, error: "Sin permisos" }, { status: 403 });

    const { url } = await req.json();

    if (!url || typeof url !== "string" || !url.startsWith("https://"))
      return NextResponse.json({ ok: false, error: "URL inválida" }, { status: 400 });

    await prisma.tenant.update({
      where: { id: tenantId },
      data:  { logoUrl: url },
    });

    // ✅ Invalidar cache del layout — el Sidebar muestra el logo del tenant
    revalidateTag("tenant-config");
    revalidateTag(`tenant-${tenantId}`);

    return NextResponse.json({ ok: true, data: { url } });
  } catch (err: any) {
    if (err.message === "No autenticado")
      return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    console.error("[POST /api/configuracion/logo]", err);
    return NextResponse.json({ ok: false, error: "Error al guardar el logo" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";