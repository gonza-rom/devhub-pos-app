// app/api/afip/config/route.ts
// POST /api/afip/config
// Guarda o actualiza la configuración AFIP del tenant

import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { tenantId } = await getTenantContext();
    const body = await req.json();

    const {
      cuit,
      razonSocial,
      puntoVenta,
      condicionFiscal,
      ambiente,
      activo,
      certificado,
      clavePrivada,
    } = body;

    // Validaciones
    if (!cuit || cuit.length !== 11) {
      return NextResponse.json(
        { ok: false, error: "El CUIT debe tener 11 dígitos" },
        { status: 400 }
      );
    }

    if (!certificado || !clavePrivada) {
      return NextResponse.json(
        { ok: false, error: "Debe proporcionar el certificado y la clave privada" },
        { status: 400 }
      );
    }

    if (!["RI", "MT", "EX", "CF"].includes(condicionFiscal)) {
      return NextResponse.json(
        { ok: false, error: "Condición fiscal inválida" },
        { status: 400 }
      );
    }

    if (!["testing", "produccion"].includes(ambiente)) {
      return NextResponse.json(
        { ok: false, error: "Ambiente inválido" },
        { status: 400 }
      );
    }

    // Verificar si ya existe configuración
    const existente = await prisma.configuracionAFIP.findUnique({
      where: { tenantId },
    });

    let config;

    if (existente) {
      // Actualizar
      config = await prisma.configuracionAFIP.update({
        where: { tenantId },
        data: {
          cuit,
          razonSocial: razonSocial || null,
          puntoVenta: parseInt(puntoVenta) || 1,
          condicionFiscal,
          ambiente,
          activo: activo ?? true,
          certificado,
          clavePrivada,
        },
      });
    } else {
      // Crear
      config = await prisma.configuracionAFIP.create({
        data: {
          tenantId,
          cuit,
          razonSocial: razonSocial || null,
          puntoVenta: parseInt(puntoVenta) || 1,
          condicionFiscal,
          ambiente,
          activo: activo ?? true,
          certificado,
          clavePrivada,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      config: {
        id: config.id,
        cuit: config.cuit,
        ambiente: config.ambiente,
        activo: config.activo,
      },
    });
  } catch (error: any) {
    console.error("❌ Error en /api/afip/config:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Error al guardar configuración",
        detalle: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await getTenantContext();

    const config = await prisma.configuracionAFIP.findUnique({
      where: { tenantId },
      select: {
        id: true,
        cuit: true,
        razonSocial: true,
        puntoVenta: true,
        condicionFiscal: true,
        ambiente: true,
        activo: true,
        ultimaConexion: true,
        createdAt: true,
        updatedAt: true,
        // NO retornar certificado ni clave por seguridad
      },
    });

    if (!config) {
      return NextResponse.json({ ok: true, config: null });
    }

    return NextResponse.json({ ok: true, config });
  } catch (error: any) {
    console.error("❌ Error en GET /api/afip/config:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Error al obtener configuración",
        detalle: error.message,
      },
      { status: 500 }
    );
  }
}