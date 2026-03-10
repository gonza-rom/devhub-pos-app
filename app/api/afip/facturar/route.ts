// app/api/afip/facturar/route.ts
// POST /api/afip/facturar
// VERSIÓN FINAL - FUNCIONANDO con @arcasdk/core v0.3.6

import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { Arca } from "@arcasdk/core";
import {
  TIPO_COMPROBANTE,
  TIPO_DOCUMENTO,
  CONCEPTO,
  obtenerTipoComprobanteSegunCondicion,
  calcularIVA,
  obtenerIdIVA,
  formatearFecha,
  type DatosCliente,
} from "@/lib/afip/types";

// Mapear condición IVA a código numérico
function mapearCondicionIVAReceptor(condicionIVA?: string): number {
  if (!condicionIVA) return 5; // Default: Consumidor Final
  
  const mapa: Record<string, number> = {
    "Responsable Inscripto": 1,
    "Exento": 4,
    "Consumidor Final": 5,
    "Monotributo": 6,
  };
  
  return mapa[condicionIVA] || 5;
}

export async function POST(req: NextRequest) {
  try {
    const { tenantId } = await getTenantContext();
    const body = await req.json();

    const {
      ventaId,
      tipoComprobante: tipoComprobanteManual,
      cliente,
      items,
      total,
      descuento = 0,
      metodoPago,
    } = body;

    // ─── Validaciones ────────────────────────────────────────────────────────

    if (!items || items.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Debe incluir al menos un item" },
        { status: 400 }
      );
    }

    if (!total || total <= 0) {
      return NextResponse.json(
        { ok: false, error: "El total debe ser mayor a 0" },
        { status: 400 }
      );
    }

    // ─── Config AFIP ─────────────────────────────────────────────────────────

    const config = await prisma.configuracionAFIP.findUnique({
      where: { tenantId },
    });

    if (!config || !config.activo) {
      return NextResponse.json(
        { ok: false, error: "No hay configuración AFIP activa" },
        { status: 400 }
      );
    }

    // ─── Cliente ─────────────────────────────────────────────────────────────

    const clienteData: DatosCliente = {
      docTipo: cliente?.docTipo || TIPO_DOCUMENTO.CONSUMIDOR_FINAL,
      docNro: cliente?.docNro || 0,
      nombre: cliente?.nombre,
      email: cliente?.email,
      direccion: cliente?.direccion,
    };

    // Condición IVA del receptor (obligatorio según RG 5616)
    // 5 = Consumidor Final (para Factura B/C)
    const condicionIVAReceptor = mapearCondicionIVAReceptor(cliente?.condicionIVA);

    // ─── Tipo de Comprobante ─────────────────────────────────────────────────

    const tipoComprobante =
      tipoComprobanteManual ||
      obtenerTipoComprobanteSegunCondicion(
        config.condicionFiscal,
        clienteData.docTipo
      );

// ─── Cálculo de Importes ─────────────────────────────────────────────────

// Redondear a 2 decimales para AFIP
const round2 = (num: number) => Math.round(num * 100) / 100;

const totalConDescuento = round2(total - descuento);

let neto = 0;
let iva = 0;
let ivaDetalle: any[] = [];

// IMPORTANTE: El POS siempre envía precios CON IVA incluido
// Para Factura A, B y C hay que separar el IVA del total
neto = round2(totalConDescuento / 1.21);
iva = round2(totalConDescuento - neto);

ivaDetalle = [
  {
    Id: obtenerIdIVA(21), // 5 = 21%
    BaseImp: round2(neto),
    Importe: round2(iva),
  },
];


    // ─── Inicializar ARCA SDK ────────────────────────────────────────────────

    const arca = new Arca({
      cuit: parseInt(config.cuit),
      cert: config.certificado,
      key: config.clavePrivada,
      // @ts-ignore
      production: config.ambiente === "produccion",
    });
    
    // ─── Obtener último número de comprobante ────────────────────────────────

  let numeroComprobante = 1;

  try {
    const lastVoucherResult =
      await arca.electronicBillingService.getLastVoucher(
        config.puntoVenta,
        tipoComprobante
      );

    console.log("🔍 Respuesta getLastVoucher:", JSON.stringify(lastVoucherResult, null, 2));

    // FIX: v0.3.6 retorna un objeto con estructura diferente
    if (lastVoucherResult && typeof lastVoucherResult === "object") {
      // Buscar el número en diferentes ubicaciones posibles
      // FIX: v0.3.6 usa minúsculas en la respuesta
      const ultimoNro = 
        (lastVoucherResult as any).cbteNro ||  // ← minúscula
        (lastVoucherResult as any).CbteNro ||  // ← mayúscula (por las dudas)
        0;
      
      numeroComprobante = ultimoNro + 1;
    } else if (typeof lastVoucherResult === "number") {
      numeroComprobante = lastVoucherResult + 1;
    }

    console.log("✅ Último número obtenido:", numeroComprobante - 1, "→ Nuevo:", numeroComprobante);
  } catch (error) {
    console.error("❌ Error obteniendo último comprobante:", error);
    
    // Si falla, intentar obtener de la DB
    const ultimoComprobante = await prisma.comprobante.findFirst({
      where: {
        tenantId,
        puntoVenta: config.puntoVenta,
        tipoComprobante,
      },
      orderBy: { numeroComprobante: "desc" },
    });

    if (ultimoComprobante) {
      numeroComprobante = ultimoComprobante.numeroComprobante + 1;
      console.log("✅ Último número desde DB:", ultimoComprobante.numeroComprobante, "→ Nuevo:", numeroComprobante);
    } else {
      numeroComprobante = 1;
      console.log("⚠️ No hay comprobantes previos, empezando en 1");
    }
  }

    // ─── Generar Comprobante ─────────────────────────────────────────────────

    const fechaHoy = new Date();
    const fechaFormateada = parseInt(formatearFecha(fechaHoy));

    // ⚠️ v0.3.6 usa MAYÚSCULAS en todas las propiedades
const requestAFIP = {
  CantReg: 1,
  PtoVta: config.puntoVenta,
  CbteTipo: tipoComprobante,
  Concepto: CONCEPTO.PRODUCTOS,
  DocTipo: clienteData.docTipo,
  DocNro: clienteData.docNro,
  CbteDesde: numeroComprobante,
  CbteHasta: numeroComprobante,
  CbteFch: fechaFormateada,
  ImpTotal: round2(total - descuento),  // ← Redondear
  ImpTotConc: 0,
  ImpNeto: round2(neto),                // ← Redondear
  ImpOpEx: 0,
  ImpIVA: round2(iva),                  // ← Redondear
  ImpTrib: 0,
  MonId: "PES",
  MonCotiz: 1,
  CondicionIVAReceptorId: condicionIVAReceptor,
  Iva: ivaDetalle,
};
    console.log("📄 Request a AFIP:", JSON.stringify(requestAFIP, null, 2));

    const responseAFIP: any =
      await arca.electronicBillingService.createVoucher(requestAFIP as any);

    console.log("✅ Response de AFIP:", JSON.stringify(responseAFIP, null, 2));

    // ─── Validar Respuesta ───────────────────────────────────────────────────

    // Extraer resultado del response
    const resultado =
      responseAFIP.response?.FeCabResp?.Resultado || responseAFIP.Resultado;
    const detResponse =
      responseAFIP.response?.FeDetResp?.FECAEDetResponse?.[0] ||
      responseAFIP.FeDetResp?.FECAEDetResponse?.[0] ||
      {};

    if (resultado !== "A") {
      const observaciones =
        detResponse.Observaciones?.Obs?.map(
          (obs: any) => `[${obs.Code}] ${obs.Msg}`
        ).join("; ") || "Sin observaciones";

      return NextResponse.json(
        {
          ok: false,
          error: "AFIP rechazó el comprobante",
          resultado,
          observaciones,
          detalle: responseAFIP,
        },
        { status: 400 }
      );
    }

    const cae = detResponse.CAE || responseAFIP.cae || "";
    const caeFchVto = detResponse.CAEFchVto || responseAFIP.caeFchVto || "";

    // ─── Guardar en DB ───────────────────────────────────────────────────────

    const comprobante = await prisma.comprobante.create({
      data: {
        tenantId,
        ventaId: ventaId || null,
        puntoVenta: config.puntoVenta,
        tipoComprobante,
        numeroComprobante,
        cae,
        caeFchVto,
        docTipo: clienteData.docTipo,
        docNro: BigInt(clienteData.docNro),
        clienteNombre: clienteData.nombre || null,
        clienteEmail: clienteData.email || null,
        clienteDireccion: clienteData.direccion || null,
        total: total - descuento,
        neto,
        iva,
        descuento,
        importeNoGravado: 0,
        importeExento: 0,
        importeTributos: 0,
        monedaId: "PES",
        monedaCotizacion: 1,
        ivaDetalle: ivaDetalle as any,
        items: items as any,
        fecha: fechaHoy,
        resultado: resultado,
        observaciones: null,
        concepto: CONCEPTO.PRODUCTOS,
        metodoPago: metodoPago || null,
      },
    });

    // ─── Actualizar última conexión ──────────────────────────────────────────

    await prisma.configuracionAFIP.update({
      where: { tenantId },
      data: { ultimaConexion: new Date() },
    });

    // ─── Response ────────────────────────────────────────────────────────────

    return NextResponse.json({
      ok: true,
      comprobante: {
        id: comprobante.id,
        cae: comprobante.cae,
        caeFchVto: comprobante.caeFchVto,
        numeroComprobante: comprobante.numeroComprobante,
        puntoVenta: comprobante.puntoVenta,
        tipoComprobante: comprobante.tipoComprobante,
        total: comprobante.total,
        fecha: comprobante.fecha,
      },
    });
  } catch (error: any) {
    console.error("❌ Error en /api/afip/facturar:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Error al generar comprobante",
        detalle: error.message,
      },
      { status: 500 }
    );
  }
}