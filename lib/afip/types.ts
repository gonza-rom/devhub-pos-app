// lib/afip/types.ts
// Tipos TypeScript para integración AFIP

// ═══════════════════════════════════════════════════════════════════════════
// ENUMS Y CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

export const TIPO_COMPROBANTE = {
  FACTURA_A: 1,
  FACTURA_B: 6,
  FACTURA_C: 11,
  NOTA_CREDITO_A: 3,
  NOTA_CREDITO_B: 8,
  NOTA_CREDITO_C: 13,
  NOTA_DEBITO_A: 2,
  NOTA_DEBITO_B: 7,
  NOTA_DEBITO_C: 12,
} as const;

export const TIPO_DOCUMENTO = {
  CUIT: 80,
  CUIL: 86,
  DNI: 96,
  PASAPORTE: 94,
  CONSUMIDOR_FINAL: 99,
} as const;

export const CONDICION_FISCAL = {
  RESPONSABLE_INSCRIPTO: "RI",
  MONOTRIBUTO: "MT",
  EXENTO: "EX",
  CONSUMIDOR_FINAL: "CF",
} as const;

export const CONCEPTO = {
  PRODUCTOS: 1,
  SERVICIOS: 2,
  PRODUCTOS_Y_SERVICIOS: 3,
} as const;

export const TIPO_IVA = {
  IVA_0: 3,      // 0%
  IVA_10_5: 4,   // 10.5%
  IVA_21: 5,     // 21%
  IVA_27: 6,     // 27%
  IVA_5: 8,      // 5%
  IVA_2_5: 9,    // 2.5%
} as const;

export const AMBIENTE = {
  TESTING: "testing",
  PRODUCCION: "produccion",
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// INTERFACES - Según documentación de @arcasdk/core
// ═══════════════════════════════════════════════════════════════════════════

export interface ConfiguracionAFIP {
  cuit: number; // CUIT como número sin guiones
  razonSocial?: string;
  puntoVenta: number;
  condicionFiscal: keyof typeof CONDICION_FISCAL;
  certificado: string; // Contenido del .crt
  clavePrivada: string; // Contenido del .key
  ambiente: "testing" | "produccion";
}

export interface ItemComprobante {
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  alicuotaIVA?: number; // 0, 10.5, 21, 27
}

export interface DatosCliente {
  docTipo: number;
  docNro: number;
  nombre?: string;
  email?: string;
  direccion?: string;
}

export interface DetalleIVA {
  Id: number;      // ID según AFIP (3, 4, 5, 6, 8, 9) - MAYÚSCULA según ARCA
  BaseImp: number; // Base imponible - MAYÚSCULA según ARCA
  Importe: number; // Importe IVA - MAYÚSCULA según ARCA
}

// Request según documentación oficial de ARCA SDK
export interface RequestCreateVoucher {
  CantReg: number;      // Cantidad de registros (siempre 1)
  PtoVta: number;       // Punto de venta
  CbteTipo: number;     // Tipo de comprobante
  Concepto: number;     // 1=Productos, 2=Servicios, 3=Ambos
  DocTipo: number;      // Tipo documento cliente
  DocNro: number;       // Número documento (0 para Cons. Final)
  CbteDesde: number;    // Número comprobante desde
  CbteHasta: number;    // Número comprobante hasta (igual a CbteDesde)
  CbteFch: number;      // Fecha YYYYMMDD
  ImpTotal: number;     // Importe total
  ImpTotConc: number;   // Importe no gravado
  ImpNeto: number;      // Importe neto gravado
  ImpOpEx: number;      // Importe exento
  ImpIVA: number;       // Importe IVA
  ImpTrib: number;      // Otros tributos
  MonId: string;        // Moneda (PES, DOL, etc)
  MonCotiz: number;     // Cotización (1 para PES)
  Iva?: DetalleIVA[];   // Detalle IVA (opcional si ImpIVA > 0)
}

// Response según documentación oficial de ARCA SDK
export interface ResponseCreateVoucher {
  CAE: string;          // CAE asignado (14 dígitos)
  CAEFchVto: string;    // Fecha vencimiento CAE (YYYYMMDD)
  Resultado: string;    // "A"=Aprobado, "R"=Rechazado
  Reproceso: string;    // "S" o "N"
  PtoVta: number;
  CbteTipo: number;
  Observaciones?: Array<{ Code: number; Msg: string }>;
}

export interface ComprobanteCompleto {
  id: string;
  puntoVenta: number;
  tipoComprobante: number;
  numeroComprobante: number;
  cae: string;
  caeFchVto: string;
  fecha: Date;
  cliente: DatosCliente;
  items: ItemComprobante[];
  total: number;
  neto: number;
  iva: number;
  descuento: number;
  resultado: string;
  qrData?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

export function obtenerTipoComprobanteSegunCondicion(
  condicionFiscal: string,
  clienteDocTipo: number
): number {
  // RI emite A o B según el cliente
  if (condicionFiscal === CONDICION_FISCAL.RESPONSABLE_INSCRIPTO) {
    // Si cliente es RI (CUIT) → Factura A
    if (clienteDocTipo === TIPO_DOCUMENTO.CUIT) {
      return TIPO_COMPROBANTE.FACTURA_A;
    }
    // Si cliente es Consumidor Final → Factura B
    return TIPO_COMPROBANTE.FACTURA_B;
  }
  
  // Monotributo y Exento solo emiten C
  return TIPO_COMPROBANTE.FACTURA_C;
}

export function calcularIVA(neto: number, alicuota: number = 21): number {
  return Math.round(neto * (alicuota / 100) * 100) / 100;
}

export function obtenerIdIVA(alicuota: number): number {
  switch (alicuota) {
    case 0: return TIPO_IVA.IVA_0;
    case 2.5: return TIPO_IVA.IVA_2_5;
    case 5: return TIPO_IVA.IVA_5;
    case 10.5: return TIPO_IVA.IVA_10_5;
    case 21: return TIPO_IVA.IVA_21;
    case 27: return TIPO_IVA.IVA_27;
    default: return TIPO_IVA.IVA_21; // Default 21%
  }
}

export function formatearCUIT(cuit: string): string {
  // Quita guiones y espacios
  return cuit.replace(/[-\s]/g, '');
}

export function formatearFecha(fecha: Date): string {
  // Formato YYYYMMDD requerido por AFIP
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, '0');
  const day = String(fecha.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

export function nombreTipoComprobante(tipo: number): string {
  const nombres: Record<number, string> = {
    1: "Factura A",
    6: "Factura B",
    11: "Factura C",
    3: "Nota de Crédito A",
    8: "Nota de Crédito B",
    13: "Nota de Crédito C",
    2: "Nota de Débito A",
    7: "Nota de Débito B",
    12: "Nota de Débito C",
  };
  return nombres[tipo] || `Comprobante ${tipo}`;
}

export function nombreTipoDocumento(tipo: number): string {
  const nombres: Record<number, string> = {
    80: "CUIT",
    86: "CUIL",
    96: "DNI",
    94: "Pasaporte",
    99: "Consumidor Final",
  };
  return nombres[tipo] || `Doc ${tipo}`;
}

export function obtenerNombreComprobante(tipo: number): string {
  return nombreTipoComprobante(tipo);
}

export function obtenerNombreTipoDocumento(tipo: number): string {
  return nombreTipoDocumento(tipo);
}