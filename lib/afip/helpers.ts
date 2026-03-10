// lib/afip/helpers.ts
// Helpers para determinar tipo de comprobante

import { 
  TIPO_COMPROBANTE, 
  TIPO_DOCUMENTO, 
  CONDICION_FISCAL 
} from "./types";

/**
 * Determina el tipo de comprobante según la condición fiscal del emisor y receptor
 * 
 * Reglas AFIP:
 * - RI → RI: Factura A
 * - RI → Consumidor Final/Monotributo/Exento: Factura B
 * - Monotributo/Exento → Cualquiera: Factura C
 */
export function determinarTipoComprobante(
  condicionFiscalEmisor: string,
  docTipoReceptor: number,
  condicionFiscalReceptor?: string
): number {
  // Si el emisor es Responsable Inscripto
  if (condicionFiscalEmisor === CONDICION_FISCAL.RESPONSABLE_INSCRIPTO || condicionFiscalEmisor === "RI") {
    // Si el receptor es RI (tiene CUIT) → Factura A
    if (docTipoReceptor === TIPO_DOCUMENTO.CUIT) {
      return TIPO_COMPROBANTE.FACTURA_A;
    }
    
    // Si el receptor es Consumidor Final → Factura B
    return TIPO_COMPROBANTE.FACTURA_B;
  }
  
  // Si el emisor es Monotributo o Exento → siempre Factura C
  return TIPO_COMPROBANTE.FACTURA_C;
}

/**
 * Valida si se puede emitir un tipo de comprobante
 */
export function validarTipoComprobante(
  condicionFiscalEmisor: string,
  tipoComprobanteSeleccionado: number
): { valido: boolean; error?: string } {
  // RI puede emitir A y B
  if (condicionFiscalEmisor === CONDICION_FISCAL.RESPONSABLE_INSCRIPTO || condicionFiscalEmisor === "RI") {
    if (
      tipoComprobanteSeleccionado === TIPO_COMPROBANTE.FACTURA_A ||
      tipoComprobanteSeleccionado === TIPO_COMPROBANTE.FACTURA_B
    ) {
      return { valido: true };
    }
    return {
      valido: false,
      error: "Un Responsable Inscripto solo puede emitir Factura A o B",
    };
  }
  
  // Monotributo y Exento solo pueden emitir C
  if (
    condicionFiscalEmisor === CONDICION_FISCAL.MONOTRIBUTO ||
    condicionFiscalEmisor === CONDICION_FISCAL.EXENTO ||
    condicionFiscalEmisor === "MT" ||
    condicionFiscalEmisor === "EX"
  ) {
    if (tipoComprobanteSeleccionado === TIPO_COMPROBANTE.FACTURA_C) {
      return { valido: true };
    }
    return {
      valido: false,
      error: "Monotributo/Exento solo puede emitir Factura C",
    };
  }
  
  return { valido: true };
}

/**
 * Obtiene los tipos de comprobante permitidos según condición fiscal
 */
export function obtenerTiposComprobantePermitidos(
  condicionFiscalEmisor: string
): Array<{ value: number; label: string; descripcion: string }> {
  // Responsable Inscripto
  if (condicionFiscalEmisor === CONDICION_FISCAL.RESPONSABLE_INSCRIPTO || condicionFiscalEmisor === "RI") {
    return [
      {
        value: TIPO_COMPROBANTE.FACTURA_A,
        label: "Factura A",
        descripcion: "Discrimina IVA - Para clientes Responsables Inscriptos",
      },
      {
        value: TIPO_COMPROBANTE.FACTURA_B,
        label: "Factura B",
        descripcion: "IVA incluido - Para Consumidor Final y Monotributo",
      },
    ];
  }
  
  // Monotributo o Exento
  return [
    {
      value: TIPO_COMPROBANTE.FACTURA_C,
      label: "Factura C",
      descripcion: "Sin discriminar IVA - Único tipo permitido",
    },
  ];
}