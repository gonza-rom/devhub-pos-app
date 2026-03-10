// app/api/afip/config/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { revalidateTag, revalidatePath } from "next/cache";

export async function POST(req: NextRequest) {
  try {
    const { tenantId } = await getTenantContext();
    const body = await req.json();

    const { cuit, razonSocial, puntoVenta, condicionFiscal, ambiente, activo, certificado, clavePrivada } = body;

    if (!cuit || cuit.length !== 11) {
      return NextResponse.json({ ok: false, error: "El CUIT debe tener 11 dígitos" }, { status: 400 });
    }

    if (!certificado || !clavePrivada) {
      return NextResponse.json({ ok: false, error: "Debe proporcionar el certificado y la clave privada" }, { status: 400 });
    }

    if (!["RI", "MT", "EX", "CF"].includes(condicionFiscal)) {
      return NextResponse.json({ ok: false, error: "Condición fiscal inválida" }, { status: 400 });
    }

    if (!["testing", "produccion"].includes(ambiente)) {
      return NextResponse.json({ ok: false, error: "Ambiente inválido" }, { status: 400 });
    }

    const existente = await prisma.configuracionAFIP.findUnique({ where: { tenantId } });

    const data = {
      cuit,
      razonSocial: razonSocial || null,
      puntoVenta: parseInt(puntoVenta) || 1,
      condicionFiscal,
      ambiente,
      activo: activo ?? true,
      certificado,
      clavePrivada,
    };

    const config = existente
      ? await prisma.configuracionAFIP.update({ where: { tenantId }, data })
      : await prisma.configuracionAFIP.create({ data: { tenantId, ...data } });

    // ✅ Invalidar cache del layout
    revalidateTag("afip-config");
    revalidatePath("/", "layout");

    return NextResponse.json({
      ok: true,
      config: { id: config.id, cuit: config.cuit, ambiente: config.ambiente, activo: config.activo },
    });
  } catch (error: any) {
    console.error("❌ Error en /api/afip/config:", error);
    return NextResponse.json({ ok: false, error: "Error al guardar configuración", detalle: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await getTenantContext();

    const config = await prisma.configuracionAFIP.findUnique({
      where: { tenantId },
      select: {
        id: true, cuit: true, razonSocial: true, puntoVenta: true,
        condicionFiscal: true, ambiente: true, activo: true,
        ultimaConexion: true, createdAt: true, updatedAt: true,
      },
    });

    return NextResponse.json({ ok: true, config: config ?? null });
  } catch (error: any) {
    console.error("❌ Error en GET /api/afip/config:", error);
    return NextResponse.json({ ok: false, error: "Error al obtener configuración", detalle: error.message }, { status: 500 });
  }
}