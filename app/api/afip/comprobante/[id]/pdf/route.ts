// app/api/afip/comprobante/[id]/pdf/route.ts
// GET /api/afip/comprobante/[id]/pdf
// Genera y retorna PDF de un comprobante

import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { generarPDFFactura } from "@/lib/afip/generar-pdf-factura";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await getTenantContext();
    const { id } = await params;

    // ─── Obtener comprobante ─────────────────────────────────────────────────

    const comprobante = await prisma.comprobante.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        tenant: true,
      },
    });

    if (!comprobante) {
      return NextResponse.json(
        { ok: false, error: "Comprobante no encontrado" },
        { status: 404 }
      );
    }

    // ─── Obtener config AFIP ─────────────────────────────────────────────────

    const config = await prisma.configuracionAFIP.findUnique({
      where: { tenantId },
    });

    if (!config) {
      return NextResponse.json(
        { ok: false, error: "No hay configuración AFIP" },
        { status: 400 }
      );
    }

    // ─── Generar PDF ─────────────────────────────────────────────────────────

    const pdfBlob = await generarPDFFactura({
      // Emisor
      emisorCuit: config.cuit,
      emisorRazonSocial: config.razonSocial || "Sin razón social",
      emisorDomicilio: undefined, // TODO: agregar a config
      emisorCondicionIVA: config.condicionFiscal,
      emisorIngresosBrutos: undefined, // TODO: agregar a config
      emisorInicioActividades: undefined, // TODO: agregar a config

      // Comprobante
      tipoComprobante: comprobante.tipoComprobante,
      puntoVenta: comprobante.puntoVenta,
      numeroComprobante: comprobante.numeroComprobante,
      fecha: comprobante.fecha,
      cae: comprobante.cae,
      caeFchVto: comprobante.caeFchVto,

      // Cliente
      clienteDocTipo: comprobante.docTipo,
      clienteDocNro: Number(comprobante.docNro),
      clienteNombre: comprobante.clienteNombre || undefined,
      clienteDomicilio: comprobante.clienteDireccion || undefined,
      clienteCondicionIVA: "Consumidor Final", // TODO: guardar en DB

      // Importes
      total: comprobante.total,
      neto: comprobante.neto,
      iva: comprobante.iva,
      descuento: comprobante.descuento,

      // Items
      items: (comprobante.items as any[]) || [],
    });

    // Convertir Blob a Buffer para Next.js
    const arrayBuffer = await pdfBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // ─── Retornar PDF ────────────────────────────────────────────────────────

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="factura-${comprobante.puntoVenta}-${comprobante.numeroComprobante}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("Error generando PDF:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Error al generar PDF",
        detalle: error.message,
      },
      { status: 500 }
    );
  }
}