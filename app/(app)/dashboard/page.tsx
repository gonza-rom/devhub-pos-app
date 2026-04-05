// app/(app)/dashboard/page.tsx
// Dashboard con vistas diferenciadas: EMPLEADO vs ADMIN/PROPIETARIO

import { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/tenant";
import { formatPrecio } from "@/lib/utils";
import {
  ShoppingCart, TrendingUp, Package, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Minus, Banknote, Lock, LockOpen,
} from "lucide-react";
import DashboardCharts from "@/components/dashboard/DashboardCharts";

export const metadata: Metadata = { title: "Dashboard" };

// ── Helpers ────────────────────────────────────────────────────────────────

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
}
function startOfWeek(date: Date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay()); // domingo
  return startOfDay(d);
}
function subDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() - n);
  return d;
}

// ── Cache factory ──────────────────────────────────────────────────────────

const getDashboardData = (tenantId: string) =>
  unstable_cache(
    async () => {
      const hoy       = new Date();
      const inicioDia = startOfDay(hoy);
      const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

      // Semana actual vs semana anterior
      const inicioSemanaActual  = startOfWeek(hoy);
      const inicioSemanaAnterior = subDays(inicioSemanaActual, 7);
      const finSemanaAnterior   = new Date(inicioSemanaActual.getTime() - 1);

      const [
        ventasHoy,
        ventasMes,
        ventasSemanaActual,
        ventasSemanaAnterior,
        cantidadProductos,
        productosStockBajo,
        ultimasVentas,
        caja,
        ventasPorDia, // últimos 7 días
      ] = await Promise.all([

        prisma.venta.aggregate({
          where: { tenantId, cancelado: false, createdAt: { gte: inicioDia } },
          _sum: { total: true }, _count: true,
        }).catch(() => ({ _sum: { total: 0 }, _count: 0 })),

        prisma.venta.aggregate({
          where: { tenantId, cancelado: false, createdAt: { gte: inicioMes } },
          _sum: { total: true }, _count: true,
        }).catch(() => ({ _sum: { total: 0 }, _count: 0 })),

        prisma.venta.aggregate({
          where: { tenantId, cancelado: false, createdAt: { gte: inicioSemanaActual } },
          _sum: { total: true }, _count: true,
        }).catch(() => ({ _sum: { total: 0 }, _count: 0 })),

        prisma.venta.aggregate({
          where: { tenantId, cancelado: false, createdAt: { gte: inicioSemanaAnterior, lte: finSemanaAnterior } },
          _sum: { total: true }, _count: true,
        }).catch(() => ({ _sum: { total: 0 }, _count: 0 })),

        prisma.producto.count({
          where: { tenantId, activo: true },
        }).catch(() => 0),

        prisma.producto.count({
          where: { tenantId, activo: true, stock: { lte: prisma.producto.fields.stockMinimo } },
        }).catch(() =>
          // fallback: stock <= 5 (valor por defecto de stockMinimo)
          prisma.producto.count({ where: { tenantId, activo: true, stock: { lte: 5 } } })
        ),

        prisma.venta.findMany({
          where: { tenantId, cancelado: false },
          orderBy: { createdAt: "desc" },
          take: 8,
          select: {
            id: true, total: true, metodoPago: true,
            clienteNombre: true, createdAt: true,
            items: { take: 1, select: { nombre: true } },
          },
        }).catch(() => []),

        prisma.caja.findFirst({
          where: { tenantId },
          orderBy: { abiertaAt: "desc" },
          select: {
            id: true, estado: true, saldoInicial: true,
            abiertaAt: true, cerradaAt: true, usuarioNombre: true,
            turno: true,
            movimientos: {
              select: { tipo: true, monto: true },
            },
          },
        }).catch(() => null),

        // Ventas agrupadas por día (últimos 7 días) — raw query
        prisma.$queryRaw<{ fecha: string; total: number; cantidad: bigint }[]>`
          SELECT
            DATE("createdAt" AT TIME ZONE 'UTC-3')::text AS fecha,
            SUM(total)::float AS total,
            COUNT(*)::bigint  AS cantidad
          FROM "Venta"
          WHERE "tenantId" = ${tenantId}
            AND "cancelado" = false
            AND "createdAt" >= ${subDays(hoy, 6)}
          GROUP BY 1
          ORDER BY 1 ASC
        `.catch(() => []),
      ]);

      // Calcular saldo actual de caja si está abierta
      let saldoCaja = 0;
      if (caja?.estado === "ABIERTA" && caja.movimientos) {
        for (const m of caja.movimientos) {
          if (m.tipo === "APERTURA" || m.tipo === "VENTA_EFECTIVO" || m.tipo === "INGRESO") {
            saldoCaja += m.monto;
          } else if (m.tipo === "EGRESO") {
            saldoCaja -= m.monto;
          }
        }
      }

      // Completar los 7 días aunque no haya ventas
      const diasCompletos: { fecha: string; total: number; cantidad: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = subDays(hoy, i);
        const fechaStr = d.toISOString().split("T")[0];
        const encontrado = ventasPorDia.find(v => v.fecha === fechaStr);
        diasCompletos.push({
          fecha: fechaStr,
          total: encontrado?.total ?? 0,
          cantidad: Number(encontrado?.cantidad ?? 0),
        });
      }

      // Comparativa semana
      const totalActual  = ventasSemanaActual._sum.total  ?? 0;
      const totalAnterior = ventasSemanaAnterior._sum.total ?? 0;
      const diffPct = totalAnterior === 0
        ? null
        : Math.round(((totalActual - totalAnterior) / totalAnterior) * 100);

      return {
        ventasHoy,
        ventasMes,
        cantidadProductos,
        productosStockBajo,
        ultimasVentas,
        caja: caja ? { ...caja, saldoActual: saldoCaja } : null,
        semana: { actual: totalActual, anterior: totalAnterior, diffPct },
        ventasPorDia: diasCompletos,
      };
    },
    [`dashboard-${tenantId}`],
    { tags: [`tenant-${tenantId}`, "dashboard"], revalidate: 30 }
  )();

// ── Componentes UI ─────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon: Icon, color = "text-zinc-400", accent,
}: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; color?: string; accent?: string;
}) {
  return (
    <div className="card p-5 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "var(--text-faint)" }}>
          {label}
        </p>
        <p className="text-2xl font-bold truncate" style={{ color: "var(--text-primary)" }}>
          {value}
        </p>
        {sub && (
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{sub}</p>
        )}
      </div>
      <div
        className="flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center"
        style={{ background: accent ?? "rgba(255,255,255,0.05)" }}
      >
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
    </div>
  );
}

function ComparativaChip({ diffPct }: { diffPct: number | null }) {
  if (diffPct === null) return <span className="text-xs" style={{ color: "var(--text-faint)" }}>Sin datos previos</span>;
  const sube = diffPct >= 0;
  const Icon = diffPct === 0 ? Minus : sube ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full"
      style={{
        background: diffPct === 0
          ? "rgba(255,255,255,0.06)"
          : sube ? "rgba(34,197,94,0.12)" : "rgba(220,38,38,0.12)",
        color: diffPct === 0 ? "var(--text-muted)" : sube ? "#4ade80" : "#f87171",
      }}
    >
      <Icon className="h-3 w-3" />
      {diffPct === 0 ? "Igual" : `${Math.abs(diffPct)}%`}
    </span>
  );
}

function CajaCard({ caja }: { caja: NonNullable<Awaited<ReturnType<typeof getDashboardData>>["caja"]> }) {
  const abierta = caja.estado === "ABIERTA";
  return (
    <div
      className="card p-5"
      style={{ borderColor: abierta ? "rgba(34,197,94,0.25)" : "var(--border-base)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
          Estado de caja
        </p>
        <span
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
          style={{
            background: abierta ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.05)",
            color: abierta ? "#4ade80" : "var(--text-primary)",
          }}
        >
          {abierta
            ? <><LockOpen className="h-3 w-3" /> Abierta</>
            : <><Lock className="h-3 w-3" /> Cerrada</>
          }
        </span>
      </div>

      {abierta ? (
        <div className="space-y-2">
          <div className="flex items-end justify-between">
            <span className="text-xs" style={{ color: "var(--text-primary)" }}>Saldo efectivo</span>
            <span className="text-xl font-bold text-green-400">{formatPrecio(caja.saldoActual)}</span>
          </div>
          {caja.turno && (
            <p className="text-xs" style={{ color: "var(--text-primary)" }}>
              {caja.turno === "mañana" && "🌅 Turno mañana"}
              {caja.turno === "tarde" && "🌆 Turno tarde"}
              {caja.turno === "noche" && "🌙 Turno noche"}
              {caja.turno === "fuera_horario" && "⚠️ Fuera de horario"}
              {caja.usuarioNombre && ` · ${caja.usuarioNombre}`}
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {caja.cerradaAt
            ? `Cerrada el ${new Date(caja.cerradaAt).toLocaleDateString("es-AR")}`
            : "Sin sesión reciente"
          }
        </p>
      )}
    </div>
  );
}

function UltimasVentas({ ventas }: { ventas: Awaited<ReturnType<typeof getDashboardData>>["ultimasVentas"] }) {
  if (!ventas.length) return (
    <div className="card py-10 text-center">
      <ShoppingCart className="h-8 w-8 mx-auto mb-2" style={{ color: "var(--text-faint)" }} />
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>Sin ventas registradas</p>
    </div>
  );

  const metodoPagoLabel: Record<string, string> = {
    EFECTIVO: "Efectivo",
    TRANSFERENCIA: "Transferencia",
    MERCADO_PAGO: "Mercado Pago",
    QR: "QR",
    TARJETA_DEBITO: "Débito",
    TARJETA_CREDITO: "Crédito",
    DEBITO: "Débito",
    CREDITO: "Crédito",
  };

  return (
    <div className="card overflow-hidden">
      <div
        className="px-5 py-3.5 flex items-center justify-between"
        style={{ borderBottom: "1px solid var(--border-base)" }}
      >
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Últimas ventas
        </h2>
        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
          {ventas.length} registros
        </span>
      </div>
      <div className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
        {ventas.map((v) => (
          <div key={v.id} className="flex items-center gap-3 px-5 py-3">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(220,38,38,0.1)" }}
            >
              <ShoppingCart className="h-3.5 w-3.5 text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                {v.clienteNombre ?? v.items[0]?.nombre ?? "Venta"}
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {metodoPagoLabel[v.metodoPago] ?? v.metodoPago} ·{" "}
                {new Date(v.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Argentina/Buenos_Aires" })}
              </p>
            </div>
            <span className="text-sm font-bold flex-shrink-0" style={{ color: "var(--text-primary)" }}>
              {formatPrecio(v.total)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  let tenantId: string;
  try {
    tenantId = await getTenantId();
  } catch {
    redirect("/auth/login");
  }

  const headersList = await headers();
  const rol = headersList.get("x-user-rol") ?? "EMPLEADO";
  const esAdmin = rol === "PROPIETARIO" || rol === "ADMINISTRADOR";

  const data = await getDashboardData(tenantId);
  const {
    ventasHoy, ventasMes, cantidadProductos,
    productosStockBajo, ultimasVentas, caja,
    semana, ventasPorDia,
  } = data;

  const hoy = new Date();
  const diasSemana = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const meses = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

  return (
    <div className="space-y-6 max-w-6xl">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          {esAdmin ? "Dashboard" : "Mi turno"}
        </h1>
        <p className="text-sm mt-0.5 capitalize" style={{ color: "var(--text-muted)" }}>
          {diasSemana[hoy.getDay()]}, {hoy.getDate()} de {meses[hoy.getMonth()]} de {hoy.getFullYear()}
        </p>
      </div>

      {/* ── VISTA EMPLEADO ─────────────────────────────────────── */}
      {!esAdmin && (
        <>
          {/* Stats principales */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label="Ventas hoy"
              value={String(ventasHoy._count)}
              sub={formatPrecio(ventasHoy._sum.total ?? 0)}
              icon={ShoppingCart}
              color="text-blue-400"
              accent="rgba(59,130,246,0.12)"
            />
            <StatCard
              label="Recaudado hoy"
              value={formatPrecio(ventasHoy._sum.total ?? 0)}
              sub={`${ventasHoy._count} transacciones`}
              icon={Banknote}
              color="text-green-400"
              accent="rgba(34,197,94,0.12)"
            />
            <StatCard
              label="Stock bajo"
              value={String(productosStockBajo)}
              sub="productos por reponer"
              icon={AlertTriangle}
              color={productosStockBajo > 0 ? "text-amber-400" : "text-zinc-400"}
              accent={productosStockBajo > 0 ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.05)"}
            />
          </div>
          <div className="space-y-4">
              {caja && <CajaCard caja={caja} />}
          </div>

          {/* Últimas ventas */}
          <UltimasVentas ventas={ultimasVentas} />
        </>
      )}

      {/* ── VISTA ADMIN / PROPIETARIO ──────────────────────────── */}
      {esAdmin && (
        <>
          {/* Fila 1: Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Ventas hoy"
              value={String(ventasHoy._count)}
              sub={formatPrecio(ventasHoy._sum.total ?? 0)}
              icon={ShoppingCart}
              color="text-blue-400"
              accent="rgba(59,130,246,0.12)"
            />
            <StatCard
              label="Ingresos del mes"
              value={formatPrecio(ventasMes._sum.total ?? 0)}
              sub={`${ventasMes._count} ventas`}
              icon={TrendingUp}
              color="text-green-400"
              accent="rgba(34,197,94,0.12)"
            />
            <StatCard
              label="Productos activos"
              value={String(cantidadProductos)}
              sub="en inventario"
              icon={Package}
              color="text-purple-400"
              accent="rgba(168,85,247,0.12)"
            />
            <StatCard
              label="Stock bajo"
              value={String(productosStockBajo)}
              sub="por reponer"
              icon={AlertTriangle}
              color={productosStockBajo > 0 ? "text-amber-400" : "text-zinc-400"}
              accent={productosStockBajo > 0 ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.05)"}
            />
          </div>

          {/* Fila 2: Gráfico + Caja + Comparativa */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Gráfico 7 días — ocupa 2 columnas */}
            <div className="lg:col-span-2 card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    Ventas — últimos 7 días
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    Esta semana vs semana anterior{" "}
                    <ComparativaChip diffPct={semana.diffPct} />
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs" style={{ color: "var(--text-faint)" }}>Semana actual</p>
                  <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                    {formatPrecio(semana.actual)}
                  </p>
                </div>
              </div>
              {/* Client component para el chart */}
              <DashboardCharts ventasPorDia={ventasPorDia} />
            </div>

            {/* Columna derecha: Caja + comparativa detalle */}
            <div className="space-y-4">
              {caja && <CajaCard caja={caja} />}

              {/* Comparativa semana */}
              <div className="card p-5">
                <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: "var(--text-primary)" }}>
                  Semana anterior
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span style={{ color: "var(--text-muted)" }}>Esta semana</span>
                    <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                      {formatPrecio(semana.actual)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: "var(--text-muted)" }}>Semana pasada</span>
                    <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                      {formatPrecio(semana.anterior)}
                    </span>
                  </div>
                  <div
                    className="pt-2 flex justify-between text-sm"
                    style={{ borderTop: "1px solid var(--border-base)" }}
                  >
                    <span style={{ color: "var(--text-muted)" }}>Diferencia</span>
                    <span
                      className="font-bold"
                      style={{
                        color: semana.actual >= semana.anterior ? "#4ade80" : "#f87171",
                      }}
                    >
                      {semana.actual >= semana.anterior ? "+" : ""}
                      {formatPrecio(semana.actual - semana.anterior)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Fila 3: Últimas ventas */}
          <UltimasVentas ventas={ultimasVentas} />
        </>
      )}
    </div>
  );
}