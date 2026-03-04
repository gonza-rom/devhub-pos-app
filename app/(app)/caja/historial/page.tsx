"use client";
// app/(app)/caja/historial/page.tsx
// Historial de cierres de caja con detalle por sesión

import { useState, useEffect, useCallback } from "react";
import {
  History, ChevronLeft, ChevronRight, Calendar, Clock,
  TrendingUp, TrendingDown, Banknote, Smartphone, Plus,
  Minus, X, AlertTriangle, CheckCircle, User, Search,
  RefreshCw, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────
type TipoMov = "APERTURA" | "VENTA_EFECTIVO" | "VENTA_VIRTUAL" | "INGRESO" | "EGRESO" | "CIERRE";

type Movimiento = {
  id: string; tipo: TipoMov; monto: number; metodoPago?: string | null;
  descripcion: string | null; usuarioNombre: string | null; createdAt: string;
};

type CajaCerrada = {
  id: string;
  usuarioNombre: string | null;
  saldoInicial: number;
  saldoFinal: number | null;
  saldoContado: number | null;
  diferencia: number | null;
  observaciones: string | null;
  abiertaAt: string;
  cerradaAt: string | null;
  totalEfectivo: number;
  totalVirtuales: number;
  totalIngresos: number;
  totalEgresos: number;
  cantidadVentas: number;
  movimientos: Movimiento[];
};

// ── Helpers ────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);

const fmtFecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-AR", {
    weekday: "short", day: "2-digit", month: "short", year: "numeric",
  });

const fmtHora = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

const duracion = (desde: string, hasta: string) => {
  const diff = new Date(hasta).getTime() - new Date(desde).getTime();
  const h    = Math.floor(diff / 3600000);
  const m    = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const tipoLabel: Record<TipoMov, string> = {
  APERTURA: "Apertura", VENTA_EFECTIVO: "Venta efectivo",
  VENTA_VIRTUAL: "Venta virtual", INGRESO: "Ingreso",
  EGRESO: "Egreso", CIERRE: "Cierre",
};

const esPositivo = (t: TipoMov) =>
  ["APERTURA", "VENTA_EFECTIVO", "VENTA_VIRTUAL", "INGRESO"].includes(t);

// ── Componente detalle de caja ─────────────────────────────────
function DetalleCaja({ caja, onClose }: { caja: CajaCerrada; onClose: () => void }) {
  const diff = caja.diferencia ?? 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
        style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div>
            <h3 className="text-base font-semibold text-zinc-100">Detalle de cierre</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              {fmtFecha(caja.abiertaAt)} · {fmtHora(caja.abiertaAt)} → {caja.cerradaAt ? fmtHora(caja.cerradaAt) : "—"}
              {caja.cerradaAt && (
                <span className="ml-1.5 text-zinc-600">({duracion(caja.abiertaAt, caja.cerradaAt)})</span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Info cajero */}
          {caja.usuarioNombre && (
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <User className="h-4 w-4 text-zinc-600" />
              Turno de <span className="text-zinc-200 font-medium ml-1">{caja.usuarioNombre}</span>
            </div>
          )}

          {/* Resumen numérico */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Saldo inicial",     valor: caja.saldoInicial,   color: "text-zinc-300" },
              { label: "Ventas efectivo",   valor: caja.totalEfectivo,  color: "text-green-400" },
              { label: "Ingresos",          valor: caja.totalIngresos,  color: "text-green-400" },
              { label: "Egresos",           valor: caja.totalEgresos,   color: "text-red-400" },
            ].map(({ label, valor, color }) => (
              <div
                key={label}
                className="rounded-xl p-3"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <p className="text-xs text-zinc-500 mb-1">{label}</p>
                <p className={cn("text-base font-semibold", color)}>{fmt(valor)}</p>
              </div>
            ))}
          </div>

          {/* Virtuales */}
          {caja.totalVirtuales > 0 && (
            <div
              className="rounded-xl p-4"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wider">Ventas virtuales</p>
              <p className="text-base font-semibold text-purple-400">{fmt(caja.totalVirtuales)}</p>
            </div>
          )}

          {/* Cierre */}
          <div
            className={cn(
              "rounded-xl p-4 space-y-2",
              diff === 0
                ? "border border-green-800/50 bg-green-900/10"
                : diff > 0
                ? "border border-blue-800/50 bg-blue-900/10"
                : "border border-red-800/50 bg-red-900/10"
            )}
          >
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Saldo esperado</span>
              <span className="text-zinc-200 font-medium">{fmt(caja.saldoFinal ?? 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Saldo contado</span>
              <span className="text-zinc-200 font-medium">{fmt(caja.saldoContado ?? 0)}</span>
            </div>
            <div
              className="flex justify-between text-sm pt-2"
              style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
            >
              <span className="text-zinc-300 font-semibold">Diferencia</span>
              <span className={cn(
                "font-bold text-base",
                diff === 0 ? "text-green-400" : diff > 0 ? "text-blue-400" : "text-red-400"
              )}>
                {diff >= 0 ? "+" : ""}{fmt(diff)}
              </span>
            </div>
          </div>

          {/* Observaciones */}
          {caja.observaciones && (
            <div
              className="rounded-xl px-4 py-3 text-sm text-zinc-400"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <p className="text-xs text-zinc-600 mb-1">Observaciones</p>
              {caja.observaciones}
            </div>
          )}

          {/* Movimientos */}
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">
              Movimientos ({caja.movimientos.length})
            </p>
            <div
              className="rounded-xl overflow-hidden divide-y"
              style={{ border: "1px solid rgba(255,255,255,0.07)", borderColor: "rgba(255,255,255,0.07)" }}
            >
              {caja.movimientos.length === 0 ? (
                <p className="text-center text-zinc-600 py-6 text-sm">Sin movimientos</p>
              ) : caja.movimientos.map((mov) => (
                <div
                  key={mov.id}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ borderColor: "rgba(255,255,255,0.05)" }}
                >
                  <span
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0"
                    style={{
                      background: esPositivo(mov.tipo) ? "rgba(34,197,94,0.12)" : "rgba(220,38,38,0.12)",
                      color: esPositivo(mov.tipo) ? "#4ade80" : "#f87171",
                      border: `1px solid ${esPositivo(mov.tipo) ? "rgba(34,197,94,0.2)" : "rgba(220,38,38,0.2)"}`,
                    }}
                  >
                    {tipoLabel[mov.tipo]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-300 truncate">{mov.descripcion ?? "—"}</p>
                    {mov.metodoPago && (
                      <p className="text-xs text-zinc-600">{mov.metodoPago.replace(/_/g, " ")}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={cn(
                      "text-sm font-semibold",
                      esPositivo(mov.tipo) ? "text-green-400" : "text-red-400"
                    )}>
                      {esPositivo(mov.tipo) ? "+" : "−"}{fmt(mov.monto)}
                    </p>
                    <p className="text-xs text-zinc-600">{fmtHora(mov.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page principal ─────────────────────────────────────────────
export default function HistorialCajaPage() {
  const [cajas,   setCajas]   = useState<CajaCerrada[]>([]);
  const [loading, setLoading] = useState(true);
  const [page,    setPage]    = useState(1);
  const [total,   setTotal]   = useState(0);
  const [desde,   setDesde]   = useState("");
  const [hasta,   setHasta]   = useState("");
  const [detalle, setDetalle] = useState<CajaCerrada | null>(null);

  const limit = 15;

  const fetchHistorial = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page:  String(p),
        limit: String(limit),
        ...(desde && { desde }),
        ...(hasta && { hasta }),
      });
      const res  = await fetch(`/api/caja/historial?${params}`);
      const data = await res.json();
      if (data.ok) {
        setCajas(data.data);
        setTotal(data.meta.total);
        setPage(p);
      }
    } finally {
      setLoading(false);
    }
  }, [desde, hasta]);

  useEffect(() => { fetchHistorial(1); }, [fetchHistorial]);

  const totalPages = Math.ceil(total / limit);

  // Totales del período visible
  const totalesPeriodo = cajas.reduce((acc, c) => ({
    efectivo:  acc.efectivo  + c.totalEfectivo,
    virtuales: acc.virtuales + c.totalVirtuales,
    ingresos:  acc.ingresos  + c.totalIngresos,
    egresos:   acc.egresos   + c.totalEgresos,
    ventas:    acc.ventas    + c.cantidadVentas,
  }), { efectivo: 0, virtuales: 0, ingresos: 0, egresos: 0, ventas: 0 });

  return (
    <div className="space-y-5 max-w-5xl">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/caja"
            className="text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <History className="h-6 w-6 text-zinc-400" />
              Historial de caja
            </h1>
            <p className="text-sm text-zinc-500 mt-0.5">{total} sesiones cerradas</p>
          </div>
        </div>
      </div>

      {/* Filtros por fecha */}
      <div
        className="card p-4 flex flex-wrap items-end gap-3"
      >
        <div>
          <label className="label-base">Desde</label>
          <input
            type="date"
            value={desde}
            onChange={e => setDesde(e.target.value)}
            className="input-base w-44"
          />
        </div>
        <div>
          <label className="label-base">Hasta</label>
          <input
            type="date"
            value={hasta}
            onChange={e => setHasta(e.target.value)}
            className="input-base w-44"
          />
        </div>
        <button
          onClick={() => fetchHistorial(1)}
          className="btn-primary"
        >
          <Search className="h-4 w-4" />
          Filtrar
        </button>
        {(desde || hasta) && (
          <button
            onClick={() => { setDesde(""); setHasta(""); }}
            className="btn-ghost"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Resumen del período */}
      {cajas.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Efectivo",   valor: totalesPeriodo.efectivo,  icon: Banknote,    color: "text-green-400" },
            { label: "Virtuales",  valor: totalesPeriodo.virtuales, icon: Smartphone,  color: "text-purple-400" },
            { label: "Ingresos",   valor: totalesPeriodo.ingresos,  icon: ArrowUpRight, color: "text-emerald-400" },
            { label: "Egresos",    valor: totalesPeriodo.egresos,   icon: ArrowDownRight, color: "text-red-400" },
          ].map(({ label, valor, icon: Icon, color }) => (
            <div key={label} className="card p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={cn("h-4 w-4", color)} />
                <p className="text-xs text-zinc-500">{label}</p>
              </div>
              <p className={cn("text-lg font-bold", color)}>{fmt(valor)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabla */}
      {loading ? (
        <div className="card py-20 flex items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-zinc-600" />
        </div>
      ) : cajas.length === 0 ? (
        <div className="card py-20 text-center">
          <History className="h-12 w-12 mx-auto text-zinc-700 mb-4" />
          <p className="text-zinc-400 font-medium">Sin historial</p>
          <p className="text-zinc-600 text-sm mt-1">No hay cajas cerradas en el período seleccionado</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <tr>
                  {["Fecha", "Turno", "Efectivo", "Virtuales", "Diferencia", "Ventas", ""].map((h) => (
                    <th
                      key={h}
                      className={cn(
                        "px-4 py-3 text-xs font-semibold text-zinc-600 uppercase tracking-wider",
                        h === "Efectivo" || h === "Virtuales" || h === "Diferencia"
                          ? "text-right"
                          : h === "Ventas" ? "text-center"
                          : "text-left"
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cajas.map((caja) => {
                  const diff = caja.diferencia ?? 0;
                  return (
                    <tr
                      key={caja.id}
                      className="table-row cursor-pointer"
                      onClick={() => setDetalle(caja)}
                    >
                      <td className="px-4 py-3">
                        <p className="text-zinc-200 font-medium">{fmtFecha(caja.abiertaAt)}</p>
                        <p className="text-xs text-zinc-600 flex items-center gap-1 mt-0.5">
                          <Clock className="h-3 w-3" />
                          {fmtHora(caja.abiertaAt)} → {caja.cerradaAt ? fmtHora(caja.cerradaAt) : "—"}
                          {caja.cerradaAt && (
                            <span className="ml-1">· {duracion(caja.abiertaAt, caja.cerradaAt)}</span>
                          )}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-zinc-400">
                        {caja.usuarioNombre ?? <span className="text-zinc-700">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-green-400 font-semibold">
                        {fmt(caja.totalEfectivo)}
                      </td>
                      <td className="px-4 py-3 text-right text-purple-400 font-semibold">
                        {fmt(caja.totalVirtuales)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={cn(
                          "font-semibold",
                          diff === 0 ? "text-zinc-400" : diff > 0 ? "text-blue-400" : "text-red-400"
                        )}>
                          {diff >= 0 ? "+" : ""}{fmt(diff)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{ background: "rgba(255,255,255,0.06)", color: "#a1a1aa" }}
                        >
                          {caja.cantidadVentas}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs text-zinc-600 hover:text-zinc-300">Ver →</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
            >
              <p className="text-xs text-zinc-600">
                Página {page} de {totalPages} · {total} sesiones
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchHistorial(page - 1)}
                  disabled={page <= 1}
                  className="btn-ghost px-3 py-1.5 text-xs disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => fetchHistorial(page + 1)}
                  disabled={page >= totalPages}
                  className="btn-ghost px-3 py-1.5 text-xs disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal detalle */}
      {detalle && (
        <DetalleCaja caja={detalle} onClose={() => setDetalle(null)} />
      )}
    </div>
  );
}