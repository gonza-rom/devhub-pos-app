// lib/afip/generar-pdf-factura.ts
// Genera PDF de factura electrónica ESTILO ARCA - Versión mejorada y centrada

import jsPDF from "jspdf";
import QRCode from "qrcode";
import {
  TIPO_COMPROBANTE,
  obtenerNombreComprobante,
  obtenerNombreTipoDocumento,
} from "./types";

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES DE DISEÑO
// ═══════════════════════════════════════════════════════════════════════════

const MARGEN_IZQ = 20;
const MARGEN_DER = 190;
const ANCHO_PAGINA = 170;

const COLORES = {
  primario: "#1e40af",
  secundario: "#64748b",
  borde: "#cbd5e1",
  fondoTabla: "#f1f5f9",
  negro: "#000000",
};

// ═══════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

interface DatosComprobante {
  // Emisor
  emisorCuit: string;
  emisorRazonSocial: string;
  emisorDomicilio?: string;
  emisorCondicionIVA: string;
  emisorIngresosBrutos?: string;
  emisorInicioActividades?: string;

  // Comprobante
  tipoComprobante: number;
  puntoVenta: number;
  numeroComprobante: number;
  fecha: Date;
  cae: string;
  caeFchVto: string;

  // Cliente
  clienteDocTipo: number;
  clienteDocNro: number;
  clienteNombre?: string;
  clienteDomicilio?: string;
  clienteCondicionIVA?: string;

  // Importes
  total: number;
  neto: number;
  iva: number;
  descuento?: number;

  // Items
  items: Array<{
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
  }>;
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIONES HELPER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Genera el código QR de AFIP
 */
async function generarQRAfip(datos: DatosComprobante): Promise<string> {
  const datosQR = {
    ver: 1,
    fecha: datos.fecha.toISOString().split("T")[0],
    cuit: parseInt(datos.emisorCuit.replace(/-/g, "")),
    ptoVta: datos.puntoVenta,
    tipoCmp: datos.tipoComprobante,
    nroCmp: datos.numeroComprobante,
    importe: datos.total,
    moneda: "PES",
    ctz: 1,
    tipoDocRec: datos.clienteDocTipo,
    nroDocRec: datos.clienteDocNro,
    tipoCodAut: "E",
    codAut: datos.cae,
  };

  const jsonString = JSON.stringify(datosQR);
  const base64 = btoa(jsonString);
  const urlQR = `https://www.afip.gob.ar/fe/qr/?p=${base64}`;

  return await QRCode.toDataURL(urlQR, {
    width: 350,
    margin: 0,
  });
}

function formatearMoneda(valor: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(valor);
}

function formatearCUIT(cuit: string): string {
  const solo_numeros = cuit.replace(/\D/g, "");
  if (solo_numeros.length === 11) {
    return `${solo_numeros.slice(0, 2)}-${solo_numeros.slice(2, 10)}-${solo_numeros.slice(10)}`;
  }
  return cuit;
}

function formatearFecha(fecha: Date): string {
  return new Intl.DateTimeFormat("es-AR").format(fecha);
}

function formatearCAEVto(caeFchVto: string): string {
  if (caeFchVto.length === 8) {
    const año = caeFchVto.substring(0, 4);
    const mes = caeFchVto.substring(4, 6);
    const dia = caeFchVto.substring(6, 8);
    return `${dia}/${mes}/${año}`;
  }
  return caeFchVto;
}

function obtenerLetraComprobante(tipo: number): string {
  const nombre = obtenerNombreComprobante(tipo);
  const match = nombre.match(/[ABC]/);
  return match ? match[0] : "X";
}

function obtenerCodigoComprobante(tipo: number): string {
  return `CÓD. ${tipo}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export async function generarPDFFactura(datos: DatosComprobante): Promise<Blob> {
  const doc = new jsPDF();

  const letra = obtenerLetraComprobante(datos.tipoComprobante);
  const codigo = obtenerCodigoComprobante(datos.tipoComprobante);
  const tipoNombre = obtenerNombreComprobante(datos.tipoComprobante).toUpperCase();

  // ═══════════════════════════════════════════════════════════════════════════
  // HEADER - Dos columnas
  // ═══════════════════════════════════════════════════════════════════════════

  let y = 20;

  // ─── Columna Izquierda: Datos del Emisor ──────────────────────────────────

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORES.negro);
  doc.text(datos.emisorRazonSocial, MARGEN_IZQ, y);

  y += 6;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORES.secundario);

  doc.text(`CUIT: ${formatearCUIT(datos.emisorCuit)}`, MARGEN_IZQ, y);
  y += 4;

  doc.text(`Ingresos Brutos: ${datos.emisorIngresosBrutos || "Exento"}`, MARGEN_IZQ, y);
  y += 4;

  doc.text(datos.emisorCondicionIVA, MARGEN_IZQ, y);
  y += 4;

  if (datos.emisorDomicilio) {
    doc.text(datos.emisorDomicilio, MARGEN_IZQ, y);
    y += 4;
  }

  if (datos.emisorInicioActividades) {
    doc.text(`Inicio de Actividades: ${datos.emisorInicioActividades}`, MARGEN_IZQ, y);
  }

  // ─── Columna Derecha: Tipo de Comprobante ─────────────────────────────────

  // Recuadro con letra - MÁS GRANDE
  const rectX = 130;
  const rectY = 18;
  const rectW = 30;
  const rectH = 30;

  doc.setDrawColor(COLORES.negro);
  doc.setLineWidth(1.5);
  doc.rect(rectX, rectY, rectW, rectH);

  // Letra MÁS GRANDE y centrada
  doc.setFontSize(40);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORES.negro);
  doc.text(letra, rectX + rectW / 2, rectY + 20, { align: "center" });

  // Código
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(codigo, rectX + rectW / 2, rectY + 26, { align: "center" });

  // Tipo de comprobante - a la derecha
  const textoX = rectX + rectW + 8;
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORES.negro);
  doc.text(tipoNombre, textoX, rectY + 10);

  // Número de comprobante
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const numeroFormateado = `${String(datos.puntoVenta).padStart(4, "0")}-${String(
    datos.numeroComprobante
  ).padStart(8, "0")}`;
  doc.text(numeroFormateado, textoX, rectY + 17);

  // Fecha de emisión
  doc.setFontSize(8);
  doc.setTextColor(COLORES.secundario);
  doc.text(`Fecha de Emisión: ${formatearFecha(datos.fecha)}`, textoX, rectY + 23);

  y = 55;

  // Línea separadora
  doc.setDrawColor(COLORES.borde);
  doc.setLineWidth(0.5);
  doc.line(MARGEN_IZQ, y, MARGEN_DER, y);

  y += 8;

  // ═══════════════════════════════════════════════════════════════════════════
  // DATOS DEL CLIENTE
  // ═══════════════════════════════════════════════════════════════════════════

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORES.negro);
  doc.text("DATOS DEL CLIENTE", MARGEN_IZQ, y);

  y += 6;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORES.secundario);

  // Nombre
  if (datos.clienteNombre) {
    doc.text(`Nombre: ${datos.clienteNombre}`, MARGEN_IZQ, y);
    y += 4;
  }

  // Documento
  const tipoDoc = obtenerNombreTipoDocumento(datos.clienteDocTipo);
  doc.text(`${tipoDoc}: ${datos.clienteDocNro || "0"}`, MARGEN_IZQ, y);
  y += 4;

  // Condición IVA
  if (datos.clienteCondicionIVA) {
    doc.text(`Cond. IVA: ${datos.clienteCondicionIVA}`, MARGEN_IZQ, y);
    y += 4;
  }

  // Domicilio
  if (datos.clienteDomicilio) {
    doc.text(`Domicilio: ${datos.clienteDomicilio}`, MARGEN_IZQ, y);
    y += 4;
  }

  y += 2;

  // Línea separadora
  doc.setDrawColor(COLORES.borde);
  doc.line(MARGEN_IZQ, y, MARGEN_DER, y);

  y += 8;

  // ═══════════════════════════════════════════════════════════════════════════
  // TABLA DE PRODUCTOS
  // ═══════════════════════════════════════════════════════════════════════════

  // Header de tabla con fondo
  doc.setFillColor(241, 245, 249);
  doc.rect(MARGEN_IZQ, y - 5, ANCHO_PAGINA, 8, "F");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORES.negro);

  doc.text("Código", MARGEN_IZQ + 2, y);
  doc.text("Descripción", MARGEN_IZQ + 20, y);
  doc.text("Cantidad", 135, y, { align: "center" });
  doc.text("P. Unitario", 165, y, { align: "right" });
  doc.text("Importe", MARGEN_DER - 2, y, { align: "right" });

  y += 3;

  // Línea debajo del header
  doc.setDrawColor(COLORES.borde);
  doc.line(MARGEN_IZQ, y, MARGEN_DER, y);

  y += 7;

  // Items
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(COLORES.negro);

  for (let i = 0; i < datos.items.length; i++) {
    const item = datos.items[i];

    // Código
    doc.text(String(i + 1).padStart(4, "0"), MARGEN_IZQ + 2, y);

    // Descripción (truncar si es muy larga)
    const descripcion =
      item.descripcion.length > 50
        ? item.descripcion.substring(0, 47) + "..."
        : item.descripcion;
    doc.text(descripcion, MARGEN_IZQ + 20, y);

    // Cantidad
    doc.text(String(item.cantidad), 135, y, { align: "center" });

    // Precio unitario
    doc.text(formatearMoneda(item.precioUnitario), 165, y, { align: "right" });

    // Importe
    doc.setFont("helvetica", "bold");
    doc.text(formatearMoneda(item.subtotal), MARGEN_DER - 2, y, { align: "right" });
    doc.setFont("helvetica", "normal");

    y += 6;

    // Nueva página si es necesario
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
  }

  y += 2;

  // Línea antes de totales
  doc.setDrawColor(COLORES.borde);
  doc.line(MARGEN_IZQ, y, MARGEN_DER, y);

  y += 8;

  // ═══════════════════════════════════════════════════════════════════════════
  // TOTALES
  // ═══════════════════════════════════════════════════════════════════════════

  const totalX = 130;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORES.secundario);

  // Descuento (si existe)
  if (datos.descuento && datos.descuento > 0) {
    doc.text("Dto./Recargo: $", totalX, y);
    doc.setTextColor("#10b981");
    doc.text(`-${formatearMoneda(datos.descuento)}`, MARGEN_DER - 2, y, {
      align: "right",
    });
    doc.setTextColor(COLORES.secundario);
    y += 6;
  }

  // Total con fondo
  doc.setFillColor(248, 250, 252);
  doc.rect(totalX - 5, y - 5, 65, 10, "F");

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORES.negro);
  doc.text("Total: $", totalX, y + 2);
  doc.setFontSize(13);
  doc.text(formatearMoneda(datos.total), MARGEN_DER - 2, y + 2, { align: "right" });

  y += 15;

  // ═══════════════════════════════════════════════════════════════════════════
  // CAE Y QR
  // ═══════════════════════════════════════════════════════════════════════════

  // Recuadro para CAE
  doc.setDrawColor(COLORES.borde);
  doc.setLineWidth(1);
  doc.rect(MARGEN_IZQ, y, ANCHO_PAGINA, 35);

  // QR Code - más grande
  try {
    const qrDataURL = await generarQRAfip(datos);
    doc.addImage(qrDataURL, "PNG", MARGEN_IZQ + 3, y + 5, 25, 25);
  } catch (error) {
    console.error("Error generando QR:", error);
  }

  // Logo ARCA
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORES.primario);
  doc.text("ARCA", MARGEN_IZQ + 33, y + 14);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORES.secundario);
  doc.text("AGENCIA DE RECAUDACIÓN", MARGEN_IZQ + 33, y + 19);
  doc.text("Y CONTROL ADUANERO", MARGEN_IZQ + 33, y + 23);

  // CAE
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORES.negro);
  doc.text(`CAE Nº: ${datos.cae}`, 105, y + 15);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORES.secundario);
  doc.text(`Fecha de Vto. de CAE: ${formatearCAEVto(datos.caeFchVto)}`, 105, y + 21);

  y += 40;

  // Footer legal
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(COLORES.secundario);
  doc.text("Comprobante Autorizado", MARGEN_IZQ, y);
  doc.text(
    "Esta Administración Federal no se responsabiliza por los datos ingresados en el detalle de la operación",
    MARGEN_IZQ,
    y + 3
  );

  // Generar blob
  return doc.output("blob");
}