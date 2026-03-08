"use client";
// components/layout/Sidebar.tsx

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFetch } from "@/hooks/useFetch";
import {
  LayoutDashboard, ShoppingCart, Package, ArrowLeftRight,
  BarChart3, Tag, Truck, Settings, Store, Crown, Users, DollarSign,
  ChevronRight, ChevronDown, AlertTriangle, History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ThemeToggle from "@/components/theme/ThemeToggle";
import type { PlanTipo, RolTenant } from "@/types";
import { getPlanUsoCache, setPlanUsoCache } from "@/lib/planUsoCache";


type SubItem = { label: string; href: string; icon?: React.ElementType; soloPropietario?: boolean };
type NavItem = { label: string; href: string; icon: React.ElementType; soloAdmin?: boolean; children?: SubItem[] };

const navItems: NavItem[] = [
  { label: "Dashboard",    href: "/dashboard",    icon: LayoutDashboard },
  // ✅ CAMBIO 1: POS como item simple (sin children)
  { label: "Punto de venta", href: "/ventas", icon: ShoppingCart },
  // ✅ CAMBIO 2: Historial como item separado
  { label: "Historial de ventas", href: "/historial-ventas", icon: History },
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
      { label: "Plan y suscripción", href: "/configuracion/plan",     icon: Crown },
      { label: "Usuarios",           href: "/configuracion/usuarios", icon: Users, soloPropietario: true },
    ],
  },
];

const PLAN_BADGE: Record<PlanTipo, { label: string }> = {
  FREE:       { label: "Free"       },
  PRO:        { label: "Pro"        },
  ENTERPRISE: { label: "Enterprise" },
};

type UsoData = {
  productos: number;
  usuarios:  number;
  trial: { diasRestantes: number | null; vencidoAt: string | null; vencido: boolean } | null;
} | null;

type Props = { nombreTenant: string; plan: PlanTipo; logoUrl?: string | null; rol: RolTenant };

function BarraUso({ label, uso, limite }: { label: string; uso: number; limite: number }) {
  const pct     = Math.min(100, Math.round((uso / limite) * 100));
  const critico = pct >= 90;
  const warning = pct >= 70 && !critico;
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{label}</span>
        <span className="text-[10px] font-semibold tabular-nums"
          style={{ color: critico ? "#f87171" : warning ? "#fbbf24" : "var(--text-muted)" }}>
          {uso}/{limite}
        </span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--border-md)" }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: critico ? "#ef4444" : warning ? "#f59e0b" : "var(--text-faint)" }} />
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

  // Grupos expandidos — arranca con el grupo activo según la ruta
  const [expandidos, setExpandidos] = useState<Set<string>>(() => {
    const inicial = new Set<string>();
    navItems.forEach((item) => {
      if (item.children && pathname.startsWith(item.href)) inicial.add(item.href);
    });
    return inicial;
  });

  const { apiFetch } = useFetch();

  useEffect(() => { setLogoLocal(logoUrl); },        [logoUrl]);
  useEffect(() => { setNombreLocal(nombreTenant); }, [nombreTenant]);

  // Expandir grupo automáticamente si la ruta cambia hacia él
  useEffect(() => {
    navItems.forEach((item) => {
      if (item.children && pathname.startsWith(item.href)) {
        setExpandidos((prev) => new Set(prev).add(item.href));
      }
    });
  }, [pathname]);

useEffect(() => {
  if (plan !== "FREE") return;

  // Usar cache si está vigente
  const cached = getPlanUsoCache();
  if (cached) {
    setUso({ ...cached.uso, trial: cached.trial });
    return;
  }

  apiFetch("/api/plan/uso")
    .then((r) => r.json())
    .then((d) => {
      if (d.ok) {
        setPlanUsoCache(d.data);
        setUso({ ...d.data.uso, trial: d.data.trial });
      }
    })
    .catch((err) => {
      if (err?.message !== "SESSION_EXPIRED") console.error(err);
    });
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

  function toggleGrupo(href: string) {
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(href)) next.delete(href);
      else next.add(href);
      return next;
    });
  }

  const items           = navItems.filter((i) => !i.soloAdmin || esAdmin);
  const productosAlerta = plan === "FREE" && uso !== null && uso.productos >= 45;

  return (
    <aside
      className="hidden md:flex flex-col w-64 h-screen flex-shrink-0"
      style={{ background: "var(--bg-surface)", borderRight: "1px solid var(--border-base)", transition: "background 0.2s ease" }}
    >
      {/* ── Brand ── */}
      <div className="flex items-center gap-3 px-5 py-5 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border-base)" }}>
        <div className="relative flex-shrink-0">
          <div className="h-9 w-9 rounded-lg overflow-hidden flex items-center justify-center"
            style={{ background: logoLocal ? "transparent" : "rgba(220,38,38,0.15)", border: "1px solid rgba(220,38,38,0.3)" }}>
            {logoLocal
              ? <img src={logoLocal} alt={nombreLocal} className="h-9 w-9 object-cover" />
              : <Store className="h-4 w-4" style={{ color: "#DC2626" }} />}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2"
            style={{ background: "#22c55e", borderColor: "var(--bg-surface)" }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight" style={{ color: "var(--text-primary)" }}>
            {nombreLocal}
          </p>
          <span className="inline-flex items-center gap-1 mt-1 text-[10px] px-1.5 py-0.5 rounded font-semibold tracking-wide uppercase border"
            style={{ color: "var(--text-primary)", background: "var(--bg-hover-md)", borderColor: "var(--border-md)" }}>
            {plan === "PRO" && <Crown className="h-2.5 w-2.5" />}
            {badge.label}
          </span>
        </div>
      </div>

      {/* ── Uso FREE ── */}
      {plan === "FREE" && uso !== null && (
        <div className="px-4 py-3 space-y-2 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          {uso.trial && (
            <div className="flex items-center justify-between rounded-lg px-2.5 py-1.5 mb-1"
              style={
                uso.trial.vencido
                  ? { background: "rgba(220,38,38,0.1)",  border: "1px solid rgba(220,38,38,0.25)" }
                  : uso.trial.diasRestantes! <= 2
                  ? { background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)" }
                  : { background: "var(--bg-hover-md)",   border: "1px solid var(--border-base)" }
              }>
              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Trial</span>
              <span className="text-[10px] font-bold"
                style={{ color: uso.trial.vencido ? "#f87171" : uso.trial.diasRestantes! <= 2 ? "#fbbf24" : "var(--text-secondary)" }}>
                {uso.trial.vencido ? "Vencido" : uso.trial.diasRestantes === 1 ? "1 día restante" : `${uso.trial.diasRestantes} días restantes`}
              </span>
            </div>
          )}
          <BarraUso label="Productos" uso={uso.productos} limite={50} />
          <BarraUso label="Usuarios"  uso={uso.usuarios}  limite={1}  />
          {productosAlerta && (
            <Link href="/configuracion/plan"
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-medium text-amber-400 transition-colors"
              style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
              <AlertTriangle className="h-3 w-3 flex-shrink-0" />
              Cerca del límite · Actualizá tu plan
            </Link>
          )}
        </div>
      )}

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5 sidebar-scroll">
        {items.map((item) => {
          const Icon          = item.icon;
          const estaExpandido = expandidos.has(item.href);
          const activoSimple  = !item.children && (pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/")));
          const activoGroup   = !!item.children && pathname.startsWith(item.href);
          const activo        = activoSimple || activoGroup;

          return (
            <div key={item.href}>
              {/* ── Fila del item ── */}
              <div
                className="relative flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 select-none"
                style={activo
                  ? { color: "var(--text-primary)", background: "rgba(220,38,38,0.14)", border: "1px solid rgba(220,38,38,0.28)" }
                  : { color: "var(--text-primary)", border: "1px solid transparent" }
                }
                onMouseEnter={e => { if (!activo) (e.currentTarget as HTMLElement).style.background = "var(--bg-hover-md)"; }}
                onMouseLeave={e => { if (!activo) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                {activo && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-full"
                    style={{ background: "#DC2626" }} />
                )}

                {/* Icono + label → siempre navega */}
                <Link
                  href={item.children ? item.children[0].href : item.href}
                  className="flex items-center gap-3 flex-1 min-w-0"
                >
                  <Icon className="h-4 w-4 flex-shrink-0"
                    style={{ color: activo ? "#ef4444" : "var(--color-red)" }} />
                  <span className="flex-1 truncate">{item.label}</span>
                </Link>

                {/* Flecha → solo despliega, NO navega */}
                {item.children ? (
                  <button
                    onClick={() => toggleGrupo(item.href)}
                    className="flex items-center justify-center h-6 w-6 rounded flex-shrink-0 transition-colors"
                    style={{ color: activo ? "#ef4444" : "var(--text-secondary)" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = activo ? "#ef4444" : "var(--text-secondary)"}
                  >
                    <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", !estaExpandido && "-rotate-90")} />
                  </button>
                ) : activo ? (
                  <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "rgba(220,38,38,0.6)" }} />
                ) : null}
              </div>

              {/* ── Subitems ── */}
              {item.children && estaExpandido && (
                <div className="ml-3 mt-0.5 mb-1 pl-3 space-y-0.5"
                  style={{ borderLeft: "1px solid rgba(220,38,38,0.2)" }}>
                  {item.children
                    .filter((s) => !s.soloPropietario || esPropietario)
                    .map((sub) => {
                      const SubIcon   = sub.icon;
                      const subActivo =
                        sub.href === "/configuracion"  ? pathname === "/configuracion"  :
                        pathname.startsWith(sub.href);

                      return (
                        <Link key={sub.href} href={sub.href}
                          className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-150"
                          style={subActivo
                            ? { color: "#f87171", background: "rgba(220,38,38,0.08)" }
                            : { color: "var(--text-primary)" }
                          }
                          onMouseEnter={e => {
                            if (!subActivo) {
                              (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)";
                              (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
                            }
                          }}
                          onMouseLeave={e => {
                            if (!subActivo) {
                              (e.currentTarget as HTMLElement).style.background = "transparent";
                              (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
                            }
                          }}
                        >
                          {SubIcon && (
                            <SubIcon className="h-3 w-3 flex-shrink-0"
                              style={{ color: subActivo ? "#f87171" : "var(--color-red)" }} />
                          )}
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
      <div className="px-3 py-3 flex-shrink-0 space-y-1"
        style={{ borderTop: "1px solid var(--border-subtle)" }}>
        <ThemeToggle />
        <div className="flex items-center gap-2 px-3 py-1">
          <div className="h-1 w-1 rounded-full bg-red-600 flex-shrink-0" />
          <p className="text-[11px] font-medium" style={{ color: "var(--text-faint)" }}>DevHub POS © 2026</p>
        </div>
      </div>
    </aside>
  );
}