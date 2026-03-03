// lib/utils.ts
// Utilidades generales del proyecto

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Combina clases de Tailwind sin conflictos
// Uso: cn("px-4 py-2", isActive && "bg-green-500", className)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Formatea precio en pesos argentinos
// formatPrecio(1500) => "$1.500"
export function formatPrecio(precio: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(precio);
}

// Formatea fecha
// formatFecha(new Date()) => "28/02/2026 14:35"
export function formatFecha(fecha: Date | string, conHora = true): string {
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  const opciones: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(conHora && { hour: "2-digit", minute: "2-digit" }),
  };
  return d.toLocaleDateString("es-AR", opciones);
}

// Formatea fecha relativa: "hace 5 minutos", "ayer", etc.
export function formatFechaRelativa(fecha: Date | string): string {
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  const ahora = new Date();
  const diff = ahora.getTime() - d.getTime();
  const minutos = Math.floor(diff / 60000);
  const horas = Math.floor(diff / 3600000);
  const dias = Math.floor(diff / 86400000);

  if (minutos < 1) return "ahora";
  if (minutos < 60) return `hace ${minutos} min`;
  if (horas < 24) return `hace ${horas}h`;
  if (dias === 1) return "ayer";
  if (dias < 7) return `hace ${dias} días`;
  return formatFecha(d, false);
}

// Genera slug desde texto
// toSlug("JMR Comercio 2") => "jmr-comercio-2"
export function toSlug(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

// Limites por plan
export const PLAN_LIMITES = {
  FREE:       { productos: 50,       usuarios: 1,  imagenesPorProducto: 3, historialDias: 14  },
  PRO:        { productos: Infinity, usuarios: 10, imagenesPorProducto: 10, historialDias: 365 },
  ENTERPRISE: { productos: Infinity, usuarios: Infinity, imagenesPorProducto: Infinity, historialDias: Infinity },
} as const;

// Métodos de pago disponibles en el POS
export const METODOS_PAGO = [
  { value: "efectivo",      label: "Efectivo",      icono: "💵" },
  { value: "debito",        label: "Débito",        icono: "💳" },
  { value: "credito",       label: "Crédito",       icono: "💳" },
  { value: "transferencia", label: "Transferencia", icono: "📱" },
  { value: "qr",            label: "QR / MP",       icono: "📷" },
] as const;
