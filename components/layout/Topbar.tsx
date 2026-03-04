"use client";
// components/layout/Topbar.tsx

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LogOut, ChevronDown, Settings, Crown, Users, Bell, Menu, X,
  LayoutDashboard, ShoppingCart, Package, ArrowLeftRight,
  BarChart3, Tag, Truck, DollarSign, Store, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { RolTenant, PlanTipo } from "@/types";

/* ── Types ─────────────────────────────────────────────────── */
const ROL_LABEL: Record<RolTenant, string> = {
  PROPIETARIO:   "Propietario",
  ADMINISTRADOR: "Administrador",
  EMPLEADO:      "Empleado",
};
const ROL_COLOR: Record<RolTenant, string> = {
  PROPIETARIO:   "text-amber-400 bg-amber-950/60 border-amber-800/60",
  ADMINISTRADOR: "text-red-400   bg-red-950/60   border-red-800/60",
  EMPLEADO:      "text-zinc-400  bg-zinc-800     border-zinc-700",
};
const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard", ventas: "Ventas (POS)", caja: "Caja",
  productos: "Productos", movimientos: "Movimientos", estadisticas: "Estadísticas",
  categorias: "Categorías", proveedores: "Proveedores",
  configuracion: "Configuración", plan: "Plan", usuarios: "Usuarios",
  nuevo: "Nuevo", editar: "Editar",
};
const PLAN_BADGE: Record<PlanTipo, { label: string; cls: string }> = {
  FREE:       { label: "Free",       cls: "text-zinc-400 bg-zinc-800/80 border-zinc-700" },
  PRO:        { label: "Pro",        cls: "text-red-400  bg-red-950/60  border-red-800/50" },
  ENTERPRISE: { label: "Enterprise", cls: "text-amber-400 bg-amber-950/50 border-amber-800/50" },
};

type SubItem = { label: string; href: string; soloPropietario?: boolean };
type NavItem = { label: string; href: string; icon: React.ElementType; soloAdmin?: boolean; children?: SubItem[] };

const navItems: NavItem[] = [
  { label: "Dashboard",    href: "/dashboard",   icon: LayoutDashboard },
  { label: "Ventas (POS)", href: "/ventas",      icon: ShoppingCart },
  { label: "Caja",         href: "/caja",        icon: DollarSign },
  { label: "Productos",    href: "/productos",   icon: Package },
  { label: "Movimientos",  href: "/movimientos", icon: ArrowLeftRight },
  { label: "Estadísticas", href: "/estadisticas", icon: BarChart3, soloAdmin: true },
  { label: "Categorías",   href: "/categorias",  icon: Tag,   soloAdmin: true },
  { label: "Proveedores",  href: "/proveedores", icon: Truck, soloAdmin: true },
  {
    label: "Configuración", href: "/configuracion", icon: Settings, soloAdmin: true,
    children: [
      { label: "Mi comercio",        href: "/configuracion" },
      { label: "Plan y suscripción", href: "/configuracion/plan" },
      { label: "Usuarios",           href: "/configuracion/usuarios", soloPropietario: true },
    ],
  },
];

/* ── Props ─────────────────────────────────────────────────── */
type Props = {
  nombreUsuario: string;
  emailUsuario:  string;
  rolUsuario:    RolTenant;
  // drawer needs tenant info
  nombreTenant?: string;
  plan?:         PlanTipo;
  logoUrl?:      string | null;
};

/* ══════════════════════════════════════════════════════════════
   TOPBAR
══════════════════════════════════════════════════════════════ */
export default function Topbar({
  nombreUsuario, emailUsuario, rolUsuario,
  nombreTenant = "Mi comercio", plan = "FREE", logoUrl,
}: Props) {
  const [menuAbierto,    setMenuAbierto]    = useState(false);
  const [drawerAbierto,  setDrawerAbierto]  = useState(false);
  const [cargandoLogout, setCargandoLogout] = useState(false);
  const router   = useRouter();
  const pathname = usePathname();

  const esAdmin       = rolUsuario === "ADMINISTRADOR" || rolUsuario === "PROPIETARIO";
  const esPropietario = rolUsuario === "PROPIETARIO";

  // Close drawer on route change
  useEffect(() => { setDrawerAbierto(false); }, [pathname]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = drawerAbierto ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerAbierto]);

  // Breadcrumb
  const segments = pathname.split("/").filter(Boolean);
  const crumbs   = segments.map((seg, i) => ({
    label:  ROUTE_LABELS[seg] ?? seg,
    href:   "/" + segments.slice(0, i + 1).join("/"),
    isLast: i === segments.length - 1,
  }));

  async function handleLogout() {
    setCargandoLogout(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/auth/login");
    router.refresh();
  }

  const initials = nombreUsuario.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const badge    = PLAN_BADGE[plan];

  return (
    <>
      {/* ── Header bar ─────────────────────────────────────── */}
      <header
        className="flex h-14 items-center justify-between px-4 md:px-5 flex-shrink-0"
        style={{ background: "#0f0f0f", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        {/* Left */}
        <div className="flex items-center gap-3 min-w-0">

          {/* Hamburger — mobile only */}
          <button
            onClick={() => setDrawerAbierto(true)}
            className="md:hidden flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
            style={{ border: "1px solid rgba(255,255,255,0.08)" }}
            aria-label="Abrir menú"
          >
            <Menu className="h-4 w-4 text-zinc-300" />
          </button>

          {/* Mobile: tenant name */}
          <span className="md:hidden text-sm font-semibold text-white truncate max-w-[140px]">
            {nombreTenant}
          </span>

          {/* Desktop: breadcrumb */}
          <nav className="hidden md:flex items-center gap-1.5">
            {crumbs.map((crumb, i) => (
              <span key={crumb.href} className="flex items-center gap-1.5">
                {i > 0 && <ChevronDown className="h-3 w-3 text-zinc-700 -rotate-90" />}
                {crumb.isLast
                  ? <span className="text-sm font-semibold text-white">{crumb.label}</span>
                  : <Link href={crumb.href} className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">{crumb.label}</Link>
                }
              </span>
            ))}
          </nav>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">

          {/* Bell */}
          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
            style={{ border: "1px solid rgba(255,255,255,0.07)" }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
          >
            <Bell className="h-4 w-4 text-zinc-500" />
          </button>

          {/* User dropdown */}
          <div className="relative">
            <button
              onClick={() => setMenuAbierto(!menuAbierto)}
              className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 transition-colors"
              style={{ border: "1px solid rgba(255,255,255,0.07)" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
            >
              <div
                className="flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-bold text-white flex-shrink-0"
                style={{ background: "rgba(220,38,38,0.85)" }}
              >
                {initials}
              </div>
              <div className="hidden md:flex flex-col items-start leading-none">
                <span className="text-[13px] font-medium text-white">{nombreUsuario}</span>
                <span className="text-[11px] text-zinc-500 mt-0.5">{ROL_LABEL[rolUsuario]}</span>
              </div>
              <ChevronDown className={cn("h-3.5 w-3.5 text-zinc-600 transition-transform duration-200", menuAbierto && "rotate-180")} />
            </button>

            {menuAbierto && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuAbierto(false)} />
                <div
                  className="absolute right-0 top-full mt-2 z-20 w-60 rounded-xl py-1.5 overflow-hidden"
                  style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 16px 40px rgba(0,0,0,0.6)" }}
                >
                  {/* User info */}
                  <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-white flex-shrink-0"
                           style={{ background: "rgba(220,38,38,0.85)" }}>{initials}</div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-white truncate">{nombreUsuario}</p>
                        <p className="text-[11px] text-zinc-500 truncate mt-0.5">{emailUsuario}</p>
                      </div>
                    </div>
                    <span className={cn("inline-flex items-center mt-2.5 text-[10px] px-2 py-0.5 rounded font-semibold tracking-wide uppercase border", ROL_COLOR[rolUsuario])}>
                      {ROL_LABEL[rolUsuario]}
                    </span>
                  </div>

                  {esAdmin && (
                    <div className="py-1.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                      <DDItem href="/configuracion"        icon={Settings} label="Mi comercio"        onClick={() => setMenuAbierto(false)} />
                      <DDItem href="/configuracion/plan"   icon={Crown}    label="Plan y suscripción" onClick={() => setMenuAbierto(false)} iconColor="text-amber-500" />
                      {esPropietario && <DDItem href="/configuracion/usuarios" icon={Users} label="Usuarios" onClick={() => setMenuAbierto(false)} />}
                    </div>
                  )}

                  <div className="py-1.5">
                    <button
                      onClick={handleLogout}
                      disabled={cargandoLogout}
                      className="flex w-full items-center gap-2.5 px-4 py-2 text-[13px] font-medium disabled:opacity-50 transition-colors"
                      style={{ color: "#f87171" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(220,38,38,0.08)"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                    >
                      <LogOut className="h-4 w-4 flex-shrink-0" />
                      {cargandoLogout ? "Cerrando sesión..." : "Cerrar sesión"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Mobile Drawer ───────────────────────────────────── */}
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 md:hidden transition-opacity duration-300",
          drawerAbierto ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
        onClick={() => setDrawerAbierto(false)}
      />

      {/* Drawer panel */}
      <div
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-72 flex flex-col md:hidden transition-transform duration-300 ease-out",
          drawerAbierto ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ background: "#0f0f0f", borderRight: "1px solid rgba(255,255,255,0.07)" }}
      >
        {/* Drawer header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="h-8 w-8 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0"
              style={{ background: logoUrl ? "transparent" : "rgba(220,38,38,0.15)", border: "1px solid rgba(220,38,38,0.3)" }}
            >
              {logoUrl
                ? <img src={logoUrl} alt={nombreTenant} className="h-8 w-8 object-cover" />
                : <Store className="h-4 w-4" style={{ color: "#DC2626" }} />
              }
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate max-w-[160px]">{nombreTenant}</p>
              <span className={cn("inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-semibold tracking-wide uppercase border", badge.cls)}>
                {plan === "PRO" && <Crown className="h-2.5 w-2.5" />}
                {badge.label}
              </span>
            </div>
          </div>

          <button
            onClick={() => setDrawerAbierto(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors"
            style={{ border: "1px solid rgba(255,255,255,0.08)" }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Drawer nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {navItems
            .filter((item) => !item.soloAdmin || esAdmin)
            .map((item) => {
              const Icon         = item.icon;
              const activoSimple = !item.children && (pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/")));
              const activoGroup  = !!item.children && pathname.startsWith(item.href);
              const activo       = activoSimple || activoGroup;

              return (
                <div key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                      activo ? "text-white" : "text-zinc-300"
                    )}
                    style={activo ? {
                      background: "rgba(220,38,38,0.14)",
                      border:     "1px solid rgba(220,38,38,0.28)",
                    } : { border: "1px solid transparent" }}
                    onMouseEnter={e => { if (!activo) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }}
                    onMouseLeave={e => { if (!activo) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    {activo && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-full" style={{ background: "#DC2626" }} />
                    )}
                    <Icon className={cn("h-4 w-4 flex-shrink-0", activo ? "text-red-500" : "text-zinc-500")} />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.children
                      ? <ChevronDown className={cn("h-3.5 w-3.5", activoGroup ? "text-red-500" : "rotate-[-90deg] text-zinc-600")} />
                      : activo ? <ChevronRight className="h-3.5 w-3.5 text-red-500/60" /> : null
                    }
                  </Link>

                  {item.children && activoGroup && (
                    <div className="ml-3 mt-0.5 mb-1 pl-3 space-y-0.5" style={{ borderLeft: "1px solid rgba(220,38,38,0.2)" }}>
                      {item.children
                        .filter((s) => !s.soloPropietario || esPropietario)
                        .map((sub) => {
                          const subActivo = sub.href === "/configuracion"
                            ? pathname === "/configuracion"
                            : pathname.startsWith(sub.href);
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              className={cn(
                                "flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                                subActivo ? "text-red-400" : "text-zinc-400"
                              )}
                              style={subActivo ? { background: "rgba(220,38,38,0.08)" } : undefined}
                              onMouseEnter={e => { if (!subActivo) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                              onMouseLeave={e => { if (!subActivo) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                            >
                              {sub.href === "/configuracion/plan" && <Crown className="h-3 w-3 text-amber-500 flex-shrink-0" />}
                              {sub.href === "/configuracion/usuarios" && <Users className="h-3 w-3 flex-shrink-0" />}
                              {sub.label}
                            </Link>
                          );
                        })}
                    </div>
                  )}
                </div>
              );
            })}
        </nav>

        {/* Drawer footer */}
        <div
          className="px-5 py-4 flex-shrink-0"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <button
            onClick={handleLogout}
            disabled={cargandoLogout}
            className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
            style={{ color: "#f87171", border: "1px solid rgba(220,38,38,0.2)" }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(220,38,38,0.08)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            {cargandoLogout ? "Cerrando sesión..." : "Cerrar sesión"}
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Dropdown item ── */
function DDItem({ href, icon: Icon, label, onClick, iconColor }: {
  href: string; icon: React.ElementType; label: string; onClick: () => void; iconColor?: string;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium text-zinc-400 transition-colors"
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; (e.currentTarget as HTMLElement).style.color = "#fff"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#a1a1aa"; }}
    >
      <Icon className={cn("h-4 w-4 flex-shrink-0 text-zinc-600", iconColor)} />
      {label}
    </Link>
  );
}