// lib/nav.ts
// Definición centralizada de la navegación.
// Importar desde acá en Sidebar.tsx y Topbar.tsx para evitar duplicación.

import {
  LayoutDashboard, ShoppingCart, Package, ArrowLeftRight,
  BarChart3, Tag, Truck, Settings, Crown, Users, DollarSign,
  History, FileText,HelpCircle,
} from "lucide-react";
import type { RolTenant } from "@/types";

// ── Tipos ────────────────────────────────────────────────────

export type SubItem = {
  label:           string;
  href:            string;
  icon?:           React.ElementType;
  soloPropietario?: boolean;
};

export type NavItem = {
  label:      string;
  href:       string;
  icon:       React.ElementType;
  soloAdmin?: boolean;
  soloAFIP?:  boolean;
  children?:  SubItem[];
};

// ── Definición de items ──────────────────────────────────────

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",           href: "/dashboard",        icon: LayoutDashboard },
  { label: "Punto de venta",      href: "/ventas",           icon: ShoppingCart },
  { label: "Historial de ventas", href: "/historial-ventas", icon: History },
  { label: "Caja",                href: "/caja",             icon: DollarSign },
  { label: "Productos",           href: "/productos",        icon: Package },
  { label: "Movimientos",         href: "/movimientos",      icon: ArrowLeftRight },
  { label: "Estadísticas",        href: "/estadisticas",     icon: BarChart3,  soloAdmin: true },
  { label: "Categorías",          href: "/categorias",       icon: Tag,        soloAdmin: true },
  { label: "Proveedores",         href: "/proveedores",      icon: Truck,      soloAdmin: true },
  { label: "Comprobantes",        href: "/comprobantes",     icon: FileText,   soloAdmin: true, soloAFIP: true },
  { label: "Ayuda",               href: "/ayuda",            icon: HelpCircle },
  {
    label: "Configuración", href: "/configuracion", icon: Settings, soloAdmin: true,
    children: [
      { label: "Mi comercio",        href: "/configuracion" },
      { label: "Plan y suscripción", href: "/configuracion/plan",     icon: Crown },
      { label: "Usuarios",           href: "/configuracion/usuarios", icon: Users, soloPropietario: true },
      { label: "Configuración AFIP", href: "/configuracion/afip",     icon: FileText },
    ],
  },
];

// ── Labels para breadcrumb (Topbar) ─────────────────────────

export const ROUTE_LABELS: Record<string, string> = {
  dashboard:         "Dashboard",
  ventas:            "Punto de venta",
  "historial-ventas": "Historial de ventas",
  caja:              "Caja",
  productos:         "Productos",
  movimientos:       "Movimientos",
  estadisticas:      "Estadísticas",
  categorias:        "Categorías",
  proveedores:       "Proveedores",
  comprobantes:      "Comprobantes",
  configuracion:     "Configuración",
  plan:              "Plan y suscripción",
  usuarios:          "Usuarios",
  afip:              "Configuración AFIP",
  nuevo:             "Nuevo",
  editar:            "Editar",
};

// ── Helper: filtra items según rol y features ────────────────

export function filtrarNavItems(
  items:     NavItem[],
  rol:       RolTenant,
  tieneAFIP: boolean = false,
): NavItem[] {
  const esAdmin = rol === "ADMINISTRADOR" || rol === "PROPIETARIO";
  return items
    .filter((i) => !i.soloAdmin || esAdmin)
    .filter((i) => !i.soloAFIP  || tieneAFIP);
}