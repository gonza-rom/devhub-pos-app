"use client";
// components/layout/Sidebar.tsx
// Sidebar de navegación principal del app

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  ArrowLeftRight,
  BarChart3,
  Tag,
  Truck,
  Settings,
  ChevronRight,
  Store,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlanTipo, RolTenant } from "@/types";

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  soloAdmin?: boolean; // Solo visible para ADMINISTRADOR y PROPIETARIO
};

const navItems: NavItem[] = [
  { label: "Dashboard",    href: "/dashboard",    icon: LayoutDashboard },
  { label: "Ventas (POS)", href: "/ventas",       icon: ShoppingCart },
  { label: "Productos",    href: "/productos",     icon: Package },
  { label: "Movimientos",  href: "/movimientos",   icon: ArrowLeftRight },
  { label: "Estadísticas", href: "/estadisticas",  icon: BarChart3,  soloAdmin: true },
  { label: "Categorías",   href: "/categorias",    icon: Tag,        soloAdmin: true },
  { label: "Proveedores",  href: "/proveedores",   icon: Truck,      soloAdmin: true },
  { label: "Configuración",href: "/configuracion", icon: Settings,   soloAdmin: true },
];

const PLAN_BADGE: Record<PlanTipo, { label: string; color: string }> = {
  FREE:       { label: "Free",       color: "text-gray-500 bg-gray-100 dark:bg-gray-700 dark:text-gray-400" },
  STARTER:    { label: "Starter",    color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400" },
  PRO:        { label: "Pro",        color: "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400" },
  ENTERPRISE: { label: "Enterprise", color: "text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400" },
};

type Props = {
  nombreTenant: string;
  plan: PlanTipo;
  logoUrl?: string | null;
  rol: RolTenant;
};

export default function Sidebar({ nombreTenant, plan, logoUrl, rol }: Props) {
  const pathname = usePathname();
  const esAdmin = rol === "ADMINISTRADOR" || rol === "PROPIETARIO";
  const badge = PLAN_BADGE[plan];

  const itemsFiltrados = navItems.filter(
    (item) => !item.soloAdmin || esAdmin
  );

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 h-screen">
      {/* Logo / Nombre del tenant */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-200 dark:border-gray-800">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white flex-shrink-0">
          {logoUrl ? (
            <img src={logoUrl} alt={nombreTenant} className="h-9 w-9 rounded-lg object-cover" />
          ) : (
            <Store className="h-5 w-5" />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
            {nombreTenant}
          </p>
          <span className={cn("inline-block text-xs px-1.5 py-0.5 rounded font-medium", badge.color)}>
            {badge.label}
          </span>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {itemsFiltrados.map((item) => {
          const Icon = item.icon;
          const activo = pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                activo
                  ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 flex-shrink-0",
                  activo ? "text-primary-600 dark:text-primary-400" : "text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300"
                )}
              />
              <span className="flex-1">{item.label}</span>
              {activo && <ChevronRight className="h-4 w-4 text-primary-400" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer del sidebar */}
      <div className="px-3 py-3 border-t border-gray-200 dark:border-gray-800">
        <p className="text-xs text-gray-400 dark:text-gray-600 text-center">
          DevHub POS © 2026
        </p>
      </div>
    </aside>
  );
}
