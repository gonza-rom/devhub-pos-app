"use client";
// components/layout/Sidebar.tsx
// ACTUALIZADO: muestra barras de uso del plan FREE bajo el badge

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ShoppingCart, Package, ArrowLeftRight,
  BarChart3, Tag, Truck, Settings, Store, Crown, Users, DollarSign,
  ChevronRight, ChevronDown, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlanTipo, RolTenant } from "@/types";

type SubItem = { label: string; href: string; soloPropietario?: boolean };
type NavItem = { label: string; href: string; icon: React.ElementType; soloAdmin?: boolean; children?: SubItem[] };

const navItems: NavItem[] = [
  { label: "Dashboard",    href: "/dashboard",    icon: LayoutDashboard },
  { label: "Ventas (POS)", href: "/ventas",       icon: ShoppingCart },
  { label: "Caja",         href: "/caja",         icon: DollarSign },
  { label: "Productos",    href: "/productos",    icon: Package },
  { label: "Movimientos",  href: "/movimientos",  icon: ArrowLeftRight },
  { label: "Estadísticas", href: "/estadisticas", icon: BarChart3, soloAdmin: true },
  { label: "Categorías",   href: "/categorias",   icon: Tag,   soloAdmin: true },
  { label: "Proveedores",  href: "/proveedores",  icon: Truck, soloAdmin: true },
  {
    label: "Configuración", href: "/configuracion", icon: Settings, soloAdmin: true,
    children: [
      { label: "Mi comercio",        href: "/configuracion" },
      { label: "Plan y suscripción", href: "/configuracion/plan" },
      { label: "Usuarios",           href: "/configuracion/usuarios", soloPropietario: true },
    ],
  },
];

const PLAN_BADGE: Record<PlanTipo, { label: string; cls: string }> = {
  FREE:       { label: "Free",       cls: "text-zinc-400 bg-zinc-800/80 border-zinc-700" },
  PRO:        { label: "Pro",        cls: "text-red-400  bg-red-950/60  border-red-800/50" },
  ENTERPRISE: { label: "Enterprise", cls: "text-amber-400 bg-amber-950/50 border-amber-800/50" },
};

type UsoData = {
  productos: number;
  usuarios: number;
  trial: { diasRestantes: number | null; vencidoAt: string | null; vencido: boolean } | null;
} | null;
type Props   = { nombreTenant: string; plan: PlanTipo; logoUrl?: string | null; rol: RolTenant };

function BarraUso({ label, uso, limite }: { label: string; uso: number; limite: number }) {
  const pct     = Math.min(100, Math.round((uso / limite) * 100));
  const critico = pct >= 90;
  const warning = pct >= 70 && !critico;

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-zinc-500">{label}</span>
        <span className={cn(
          "text-[10px] font-semibold tabular-nums",
          critico ? "text-red-400" : warning ? "text-amber-400" : "text-zinc-400"
        )}>
          {uso}/{limite}
        </span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            critico ? "bg-red-500" : warning ? "bg-amber-500" : "bg-zinc-500"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function Sidebar({ nombreTenant, plan, logoUrl, rol }: Props) {
  const pathname      = usePathname();
  const esAdmin       = rol === "ADMINISTRADOR" || rol === "PROPIETARIO";
  const esPropietario = rol === "PROPIETARIO";
  const badge         = PLAN_BADGE[plan];

  const [logoLocal,   setLogoLocal]   = useState<string | null | undefined>(logoUrl);
  const [nombreLocal, setNombreLocal] = useState(nombreTenant);
  const [uso,         setUso]         = useState<UsoData>(null);

  useEffect(() => { setLogoLocal(logoUrl); },        [logoUrl]);
  useEffect(() => { setNombreLocal(nombreTenant); }, [nombreTenant]);

  useEffect(() => {
    if (plan !== "FREE") return;
    fetch("/api/plan/uso")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setUso({ ...d.data.uso, trial: d.data.trial }); })
      .catch(() => {});
  }, [plan]);

  useEffect(() => {
    const onLogo   = (e: Event) => { setLogoLocal((e as CustomEvent).detail.url); };
    const onConfig = (e: Event) => {
      const { nombre, logoUrl: l } = (e as CustomEvent).detail;
      if (nombre) setNombreLocal(nombre);
      if (l !== undefined) setLogoLocal(l);
    };
    window.addEventListener("tenant-logo-updated",   onLogo);
    window.addEventListener("tenant-config-updated", onConfig);
    return () => {
      window.removeEventListener("tenant-logo-updated",   onLogo);
      window.removeEventListener("tenant-config-updated", onConfig);
    };
  }, []);

  const items = navItems.filter((i) => !i.soloAdmin || esAdmin);
  const productosAlerta = plan === "FREE" && uso !== null && uso.productos >= 45;

  return (
    <aside
      className="hidden md:flex flex-col w-64 h-screen flex-shrink-0"
      style={{ background: "#0f0f0f", borderRight: "1px solid rgba(255,255,255,0.07)" }}
    >
      {/* ── Brand ── */}
      <div
        className="flex items-center gap-3 px-5 py-5 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="relative flex-shrink-0">
          <div
            className="h-9 w-9 rounded-lg overflow-hidden flex items-center justify-center"
            style={{
              background: logoLocal ? "transparent" : "rgba(220,38,38,0.15)",
              border: "1px solid rgba(220,38,38,0.3)",
            }}
          >
            {logoLocal
              ? <img src={logoLocal} alt={nombreLocal} className="h-9 w-9 object-cover" />
              : <Store className="h-4 w-4" style={{ color: "#DC2626" }} />
            }
          </div>
          <span
            className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2"
            style={{ background: "#22c55e", borderColor: "#0f0f0f" }}
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white leading-tight">{nombreLocal}</p>
          <span className={cn(
            "inline-flex items-center gap-1 mt-1 text-[10px] px-1.5 py-0.5 rounded font-semibold tracking-wide uppercase border",
            badge.cls
          )}>
            {plan === "PRO" && <Crown className="h-2.5 w-2.5" />}
            {badge.label}
          </span>
        </div>
      </div>

      {/* ── Uso FREE ── */}
      {plan === "FREE" && uso !== null && (
        <div
          className="px-4 py-3 space-y-2 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          {/* Días restantes del trial */}
          {uso.trial && (
            <div className={cn(
              "flex items-center justify-between rounded-lg px-2.5 py-1.5 mb-1",
              uso.trial.vencido
                ? "bg-red-950/40 border border-red-800/40"
                : uso.trial.diasRestantes! <= 2
                ? "bg-amber-950/40 border border-amber-800/40"
                : "bg-zinc-800/60 border border-zinc-700/40"
            )}>
              <span className="text-[10px] text-zinc-400">Trial</span>
              <span className={cn(
                "text-[10px] font-bold",
                uso.trial.vencido ? "text-red-400" :
                uso.trial.diasRestantes! <= 2 ? "text-amber-400" : "text-zinc-300"
              )}>
                {uso.trial.vencido
                  ? "Vencido"
                  : uso.trial.diasRestantes === 1
                  ? "1 día restante"
                  : `${uso.trial.diasRestantes} días restantes`}
              </span>
            </div>
          )}

          <BarraUso label="Productos" uso={uso.productos} limite={50} />
          <BarraUso label="Usuarios"  uso={uso.usuarios}  limite={1}  />

          {productosAlerta && (
            <Link
              href="/configuracion/plan"
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-medium text-amber-400 transition-colors"
              style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}
            >
              <AlertTriangle className="h-3 w-3 flex-shrink-0" />
              Cerca del límite · Actualizá tu plan
            </Link>
          )}
        </div>
      )}

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5 sidebar-scroll">
        {items.map((item) => {
          const Icon         = item.icon;
          const activoSimple = !item.children && (pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/")));
          const activoGroup  = !!item.children && pathname.startsWith(item.href);
          const activo       = activoSimple || activoGroup;

          return (
            <div key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 select-none",
                  activo ? "text-white" : "text-zinc-300 hover:text-white"
                )}
                style={activo ? {
                  background: "rgba(220,38,38,0.14)",
                  border:     "1px solid rgba(220,38,38,0.28)",
                } : {
                  border: "1px solid transparent",
                }}
                onMouseEnter={e => { if (!activo) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }}
                onMouseLeave={e => { if (!activo) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                {activo && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-full"
                    style={{ background: "#DC2626" }}
                  />
                )}
                <Icon className={cn(
                  "h-4 w-4 flex-shrink-0 transition-colors",
                  activo ? "text-red-500" : "text-zinc-500 group-hover:text-zinc-300"
                )} />
                <span className="flex-1 truncate">{item.label}</span>
                {item.children ? (
                  <ChevronDown className={cn(
                    "h-3.5 w-3.5 transition-transform duration-200",
                    activoGroup ? "text-red-500" : "rotate-[-90deg] text-zinc-600"
                  )} />
                ) : activo ? (
                  <ChevronRight className="h-3.5 w-3.5 text-red-500/60" />
                ) : null}
              </Link>

              {item.children && activoGroup && (
                <div
                  className="ml-3 mt-0.5 mb-1 pl-3 space-y-0.5"
                  style={{ borderLeft: "1px solid rgba(220,38,38,0.2)" }}
                >
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
                            "flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-150",
                            subActivo ? "text-red-400" : "text-zinc-400 hover:text-zinc-100"
                          )}
                          style={subActivo ? { background: "rgba(220,38,38,0.08)" } : undefined}
                          onMouseEnter={e => { if (!subActivo) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                          onMouseLeave={e => { if (!subActivo) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                        >
                          {sub.href === "/configuracion/plan"     && <Crown className="h-3 w-3 text-amber-500 flex-shrink-0" />}
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

      {/* ── Footer ── */}
      <div
        className="px-5 py-4 flex-shrink-0"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-2">
          <div className="h-1 w-1 rounded-full bg-red-600" />
          <p className="text-[11px] text-zinc-700 font-medium">DevHub POS © 2026</p>
        </div>
      </div>
    </aside>
  );
}