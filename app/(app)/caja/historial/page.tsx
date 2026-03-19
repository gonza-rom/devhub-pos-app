"use client";
// app/(app)/caja/historial/page.tsx

import { useState, useEffect, useCallback } from "react";
import {
  History, ChevronLeft, ChevronRight, Clock,
  Banknote, Smartphone, X, User, Search,
  RefreshCw, ArrowUpRight, ArrowDownRight, Edit, Trash2,
  ArrowDownLeft,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { fmtFechaAR, fmtHora24AR } from "@/lib/dateAR";
import { useToast }   from "@/components/toast";
import { useConfirm } from "@/components/toast";

type TipoMov = "APERTURA" | "VENTA_EFECTIVO" | "VENTA_VIRTUAL" | "INGRESO" | "EGRESO" | "CIERRE";

type Movimiento = {
  id: string; tipo: TipoMov; monto: number; metodoPago?: string | null;
  descripcion: string | null; usuarioNombre: string | null; createdAt: string;
};

type CajaCerrada = {
  id: string;
  usuarioNombre: string | null;
  turno: string | null;
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

type ModalEdicion = {
  caja: CajaCerrada;
  saldoContado: string;
  observaciones: string;
};

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);

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

// Parsea la descripción del movimiento CIERRE para extraer retiro y fondo de cambio.
// La descripción se genera con toFixed(2) → formato inglés: $1000.00 (punto = decimal, sin separador de miles)
function parsearCierre(descripcion: string | null): { retiro: number | null; fondoCambio: number | null } {
  if (!descripcion) return { retiro: null, fondoCambio: null };
  const retiroMatch      = descripcion.match(/Retiro:\s*\$([\d.]+)/);
  const fondoCambioMatch = descripcion.match(/Fondo cambio:\s*\$([\d.]+)/);
  return {
    retiro:      retiroMatch      ? parseFloat(retiroMatch[1])      : null,
    fondoCambio: fondoCambioMatch ? parseFloat(fondoCambioMatch[1]) : null,
  };
}

function DetalleCaja({ caja, onClose }: { caja: CajaCerrada; onClose: () => void }) {
  const diff = caja.diferencia ?? 0;

  // Buscar el movimiento de cierre para obtener retiro/fondo
  const movCierre = caja.movimientos.find(m => m.tipo === "CIERRE");
  const { retiro, fondoCambio } = parsearCierre(movCierre?.descripcion ?? null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border-strong)" }}>

        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--border-base)" }}>
          <div>
            <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Detalle de cierre</h3>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              {fmtFechaAR(caja.abiertaAt)} · {fmtHora24AR(caja.abiertaAt)} → {caja.cerradaAt ? fmtHora24AR(caja.cerradaAt) : "—"}
              {caja.cerradaAt && <span className="ml-1.5" style={{ color: "var(--text-faint)" }}>({duracion(caja.abiertaAt, caja.cerradaAt)})</span>}
            </p>
          </div>
          <button onClick={onClose} className="transition-colors" style={{ color: "var(--text-muted)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text-primary)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Cajero + turno */}
          <div className="flex items-center gap-3 text-sm flex-wrap" style={{ color: "var(--text-muted)" }}>
            {caja.usuarioNombre && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" style={{ color: "var(--text-faint)" }} />
                Turno de <span className="font-medium ml-1" style={{ color: "var(--text-primary)" }}>{caja.usuarioNombre}</span>
              </div>
            )}
            {caja.turno && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: "var(--bg-input)", color: "var(--text-secondary)", border: "1px solid var(--border-md)" }}>
                {caja.turno === "mañana" && "🌅 Mañana"}
                {caja.turno === "tarde"  && "🌆 Tarde"}
                {caja.turno === "noche"  && "🌙 Noche"}
                {caja.turno === "fuera_horario" && "⚠️ Fuera de horario"}
              </span>
            )}
          </div>

          {/* Resumen numérico */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Saldo inicial",   valor: caja.saldoInicial,  color: "var(--text-secondary)" },
              { label: "Ventas efectivo", valor: caja.totalEfectivo,  color: "#4ade80" },
              { label: "Ingresos",        valor: caja.totalIngresos,  color: "#4ade80" },
              { label: "Egresos",         valor: caja.totalEgresos,   color: "#f87171" },
            ].map(({ label, valor, color }) => (
              <div key={label} className="rounded-xl p-3"
                style={{ background: "var(--bg-hover-md)", border: "1px solid var(--border-base)" }}>
                <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{label}</p>
                <p className="text-base font-semibold" style={{ color }}>{fmt(valor)}</p>
              </div>
            ))}
          </div>

          {/* Virtuales */}
          {caja.totalVirtuales > 0 && (
            <div className="rounded-xl p-4"
              style={{ background: "var(--bg-hover)", border: "1px solid var(--border-subtle)" }}>
              <p className="text-xs mb-2 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Ventas virtuales</p>
              <p className="text-base font-semibold text-purple-400">{fmt(caja.totalVirtuales)}</p>
            </div>
          )}

          {/* ── Cierre con retiro destacado ── */}
          <div className={cn("rounded-xl p-4 space-y-2",
            diff === 0 ? "border border-green-800/50 bg-green-900/10"
            : diff > 0 ? "border border-blue-800/50 bg-blue-900/10"
            : "border border-red-800/50 bg-red-900/10")}>

            <div className="flex justify-between text-sm">
              <span style={{ color: "var(--text-secondary)" }}>Saldo esperado (sistema)</span>
              <span className="font-medium" style={{ color: "var(--text-primary)" }}>{fmt(caja.saldoFinal ?? 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: "var(--text-secondary)" }}>Saldo contado (físico)</span>
              <span className="font-medium" style={{ color: "var(--text-primary)" }}>{fmt(caja.saldoContado ?? 0)}</span>
            </div>
            <div className="flex justify-between text-sm pt-2" style={{ borderTop: "1px solid var(--border-base)" }}>
              <span className="font-semibold" style={{ color: "var(--text-secondary)" }}>Diferencia</span>
              <span className={cn("font-bold text-base",
                diff === 0 ? "text-green-400" : diff > 0 ? "text-blue-400" : "text-red-400")}>
                {diff >= 0 ? "+" : ""}{fmt(diff)}
              </span>
            </div>

            {/* Retiro y fondo de cambio */}
            {(retiro !== null || fondoCambio !== null) && (
              <div className="mt-3 pt-3 space-y-2" style={{ borderTop: "1px solid var(--border-md)" }}>
                {retiro !== null && retiro > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-amber-400">
                      <ArrowDownLeft className="h-3.5 w-3.5" />
                      Retiro (billetes grandes)
                    </span>
                    <span className="font-semibold text-amber-400">− {fmt(retiro)}</span>
                  </div>
                )}
                {fondoCambio !== null && (
                  <div className="flex justify-between text-sm rounded-lg px-3 py-2"
                    style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
                    <span className="text-green-400 font-semibold">Fondo de cambio (próximo turno)</span>
                    <span className="font-bold text-green-400">{fmt(fondoCambio)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Observaciones */}
          {caja.observaciones && (
            <div className="rounded-xl px-4 py-3 text-sm"
              style={{ background: "var(--bg-hover)", border: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
              <p className="text-xs mb-1" style={{ color: "var(--text-faint)" }}>Observaciones</p>
              {caja.observaciones}
            </div>
          )}

          {/* Movimientos */}
          <div>
            <p className="text-xs uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
              Movimientos ({caja.movimientos.length})
            </p>
            <div className="rounded-xl overflow-hidden divide-y"
              style={{ border: "1px solid var(--border-base)" }}>
              {caja.movimientos.length === 0 ? (
                <p className="text-center py-6 text-sm" style={{ color: "var(--text-faint)" }}>Sin movimientos</p>
              ) : caja.movimientos.map((mov) => (
                <div key={mov.id} className="flex items-center gap-3 px-4 py-3"
                  style={{ borderColor: "var(--border-subtle)" }}>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0"
                    style={{
                      background: esPositivo(mov.tipo) ? "rgba(34,197,94,0.12)" : "rgba(220,38,38,0.12)",
                      color:      esPositivo(mov.tipo) ? "#4ade80" : "#f87171",
                      border:     `1px solid ${esPositivo(mov.tipo) ? "rgba(34,197,94,0.2)" : "rgba(220,38,38,0.2)"}`,
                    }}>
                    {tipoLabel[mov.tipo]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate" style={{ color: "var(--text-secondary)" }}>{mov.descripcion ?? "—"}</p>
                    {mov.metodoPago && (
                      <p className="text-xs" style={{ color: "var(--text-faint)" }}>{mov.metodoPago.replace(/_/g, " ")}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={cn("text-sm font-semibold", esPositivo(mov.tipo) ? "text-green-400" : "text-red-400")}>
                      {esPositivo(mov.tipo) ? "+" : "−"}{fmt(mov.monto)}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-faint)" }}>{fmtHora24AR(mov.createdAt)}</p>
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

export default function HistorialCajaPage() {
  const [cajas,   setCajas]   = useState<CajaCerrada[]>([]);
  const [loading, setLoading] = useState(true);
  const [page,    setPage]    = useState(1);
  const [total,   setTotal]   = useState(0);
  const [desde,   setDesde]   = useState("");
  const [hasta,   setHasta]   = useState("");
  const [turnoFiltro,    setTurnoFiltro]    = useState("");
  const [detalle,        setDetalle]        = useState<CajaCerrada | null>(null);
  const [modalEditar,    setModalEditar]    = useState<ModalEdicion | null>(null);
  const [cargandoAccion, setCargandoAccion] = useState(false);

  const toast   = useToast();
  const confirm = useConfirm();
  const limit   = 15;

  const fetchHistorial = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(p), limit: String(limit),
        ...(desde       && { desde }),
        ...(hasta       && { hasta }),
        ...(turnoFiltro && { turno: turnoFiltro }),
      });
      const res  = await fetch(`/api/caja/historial?${params}`);
      const data = await res.json();
      if (data.ok) { setCajas(data.data); setTotal(data.meta.total); setPage(p); }
    } finally {
      setLoading(false);
    }
  }, [desde, hasta, turnoFiltro]);

  useEffect(() => { fetchHistorial(1); }, [fetchHistorial]);

  const handleEditar = async () => {
    if (!modalEditar) return;
    const saldo = parseFloat(modalEditar.saldoContado);
    if (isNaN(saldo) || saldo < 0) { toast.error("Saldo contado inválido"); return; }
    setCargandoAccion(true);
    try {
      const res = await fetch(`/api/caja/historial/${modalEditar.caja.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saldoContado: saldo, observaciones: modalEditar.observaciones.trim() || null }),
      });
      if (res.ok) {
        toast.success("Cierre actualizado correctamente");
        setModalEditar(null);
        fetchHistorial(page);
      } else {
        const err = await res.json();
        toast.error(err.error || "Error al editar");
      }
    } finally {
      setCargandoAccion(false);
    }
  };

  const handleEliminar = async (id: string) => {
    const caja = cajas.find(c => c.id === id);
    const ok = await confirm({
      title:        "¿Eliminar esta caja?",
      description:  `Esta acción no se puede deshacer. Se eliminarán todos los movimientos asociados${caja?.cerradaAt ? ` del ${fmtFechaAR(caja.cerradaAt)}` : ""}.`,
      confirmLabel: "Eliminar",
      cancelLabel:  "Cancelar",
      variant:      "danger",
      icon:         "trash",
    });
    if (!ok) return;
    await toast.promise(
      fetch(`/api/caja/historial/${id}`, { method: "DELETE" })
        .then(r => r.json())
        .then(data => { if (!data.ok) throw new Error(data.error ?? "Error al eliminar"); }),
      {
        loading: "Eliminando sesión de caja...",
        success: "Sesión eliminada correctamente",
        error:   (e: unknown) => (e as Error).message,
      }
    );
    fetchHistorial(page);
  };

  const totalPages     = Math.ceil(total / limit);
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
          <Link href="/caja" className="transition-colors" style={{ color: "var(--text-muted)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text-primary)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}>
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <History className="h-6 w-6" style={{ color: "var(--text-muted)" }} /> Historial de caja
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>{total} sesiones cerradas</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="label-base">Desde</label>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="input-base w-44" />
        </div>
        <div>
          <label className="label-base">Hasta</label>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="input-base w-44" />
        </div>
        <div>
          <label className="label-base">Turno</label>
          <select value={turnoFiltro} onChange={e => setTurnoFiltro(e.target.value)} className="input-base w-44">
            <option value="">Todos</option>
            <option value="mañana">🌅 Mañana</option>
            <option value="tarde">🌆 Tarde</option>
            <option value="noche">🌙 Noche</option>
            <option value="fuera_horario">⚠️ Fuera de horario</option>
          </select>
        </div>
        <button onClick={() => fetchHistorial(1)} className="btn-primary">
          <Search className="h-4 w-4" /> Filtrar
        </button>
        {(desde || hasta || turnoFiltro) && (
          <button onClick={() => { setDesde(""); setHasta(""); setTurnoFiltro(""); }} className="btn-ghost">
            Limpiar
          </button>
        )}
      </div>

      {/* Resumen del período */}
      {cajas.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Efectivo",  valor: totalesPeriodo.efectivo,  icon: Banknote,       color: "text-green-400"   },
            { label: "Virtuales", valor: totalesPeriodo.virtuales, icon: Smartphone,     color: "text-purple-400"  },
            { label: "Ingresos",  valor: totalesPeriodo.ingresos,  icon: ArrowUpRight,   color: "text-emerald-400" },
            { label: "Egresos",   valor: totalesPeriodo.egresos,   icon: ArrowDownRight, color: "text-red-400"     },
          ].map(({ label, valor, icon: Icon, color }) => (
            <div key={label} className="card p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={cn("h-4 w-4", color)} />
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
              </div>
              <p className={cn("text-lg font-bold", color)}>{fmt(valor)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabla */}
      {loading ? (
        <div className="card py-20 flex items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin" style={{ color: "var(--text-faint)" }} />
        </div>
      ) : cajas.length === 0 ? (
        <div className="card py-20 text-center">
          <History className="h-12 w-12 mx-auto mb-4" style={{ color: "var(--text-faint)" }} />
          <p className="font-medium" style={{ color: "var(--text-muted)" }}>Sin historial</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-faint)" }}>No hay cajas cerradas en el período seleccionado</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ borderBottom: "1px solid var(--border-base)" }}>
                <tr>
                  {["Fecha", "Turno", "Efectivo", "Retiro", "Fondo cambio", "Diferencia", "Ventas", "Acciones"].map((h) => (
                    <th key={h} className={cn(
                      "px-4 py-3 text-xs font-semibold uppercase tracking-wider",
                      ["Efectivo", "Retiro", "Fondo cambio", "Diferencia", "Acciones"].includes(h) ? "text-right"
                      : h === "Ventas" ? "text-center" : "text-left"
                    )} style={{ color: "var(--text-faint)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cajas.map((caja) => {
                  const diff = caja.diferencia ?? 0;
                  const movCierre = caja.movimientos.find(m => m.tipo === "CIERRE");
                  const { retiro, fondoCambio } = parsearCierre(movCierre?.descripcion ?? null);

                  return (
                    <tr key={caja.id} className="table-row">
                      <td className="px-4 py-3">
                        <p className="font-medium" style={{ color: "var(--text-primary)" }}>{fmtFechaAR(caja.abiertaAt)}</p>
                        <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: "var(--text-faint)" }}>
                          <Clock className="h-3 w-3" />
                          {fmtHora24AR(caja.abiertaAt)} → {caja.cerradaAt ? fmtHora24AR(caja.cerradaAt) : "—"}
                          {caja.cerradaAt && <span className="ml-1">· {duracion(caja.abiertaAt, caja.cerradaAt)}</span>}
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        {caja.turno ? (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1"
                            style={{ background: "var(--bg-input)", color: "var(--text-secondary)", border: "1px solid var(--border-md)" }}>
                            {caja.turno === "mañana"        && "🌅"}
                            {caja.turno === "tarde"         && "🌆"}
                            {caja.turno === "noche"         && "🌙"}
                            {caja.turno === "fuera_horario" && "⚠️"}
                            <span className="capitalize">{caja.turno.replace("_", " ")}</span>
                          </span>
                        ) : <span style={{ color: "var(--text-faint)" }}>—</span>}
                      </td>

                      <td className="px-4 py-3 text-right text-green-400 font-semibold">
                        {fmt(caja.totalEfectivo)}
                      </td>

                      {/* Retiro */}
                      <td className="px-4 py-3 text-right">
                        {retiro !== null && retiro > 0 ? (
                          <span className="font-semibold text-amber-400">− {fmt(retiro)}</span>
                        ) : (
                          <span style={{ color: "var(--text-faint)" }}>—</span>
                        )}
                      </td>

                      {/* Fondo de cambio */}
                      <td className="px-4 py-3 text-right">
                        {fondoCambio !== null ? (
                          <span className="font-semibold text-green-400">{fmt(fondoCambio)}</span>
                        ) : (
                          <span className="font-semibold text-green-400">{fmt(caja.saldoFinal ?? 0)}</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <span className={cn("font-semibold",
                          diff === 0 ? "" : diff > 0 ? "text-blue-400" : "text-red-400")}
                          style={diff === 0 ? { color: "var(--text-muted)" } : undefined}>
                          {diff >= 0 ? "+" : ""}{fmt(diff)}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{ background: "var(--bg-hover-md)", color: "var(--text-secondary)" }}>
                          {caja.cantidadVentas}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setModalEditar({ caja, saldoContado: String(caja.saldoContado || 0), observaciones: caja.observaciones || "" })}
                            className="text-xs transition-colors flex items-center gap-1"
                            style={{ color: "var(--text-muted)" }}
                            onMouseEnter={e => (e.currentTarget.style.color = "#60a5fa")}
                            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}>
                            <Edit className="h-3 w-3" /> Editar
                          </button>
                          <button
                            onClick={() => handleEliminar(caja.id)}
                            className="text-xs transition-colors flex items-center gap-1"
                            style={{ color: "var(--text-muted)" }}
                            onMouseEnter={e => (e.currentTarget.style.color = "#f87171")}
                            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}>
                            <Trash2 className="h-3 w-3" /> Eliminar
                          </button>
                          <button onClick={() => setDetalle(caja)} className="text-xs transition-colors"
                            style={{ color: "var(--text-faint)" }}
                            onMouseEnter={e => (e.currentTarget.style.color = "var(--text-secondary)")}
                            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-faint)")}>
                            Ver →
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3"
              style={{ borderTop: "1px solid var(--border-subtle)" }}>
              <p className="text-xs" style={{ color: "var(--text-faint)" }}>Página {page} de {totalPages} · {total} sesiones</p>
              <div className="flex gap-2">
                <button onClick={() => fetchHistorial(page - 1)} disabled={page <= 1}
                  className="btn-ghost px-3 py-1.5 text-xs disabled:opacity-30">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={() => fetchHistorial(page + 1)} disabled={page >= totalPages}
                  className="btn-ghost px-3 py-1.5 text-xs disabled:opacity-30">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {detalle && <DetalleCaja caja={detalle} onClose={() => setDetalle(null)} />}

      {modalEditar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => setModalEditar(null)}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-strong)" }}
            onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Editar cierre de caja</h3>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-muted)" }}>Saldo contado</label>
              <input type="number" step="0.01" value={modalEditar.saldoContado}
                onChange={(e) => setModalEditar({ ...modalEditar, saldoContado: e.target.value })}
                className="input-base w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-muted)" }}>Observaciones</label>
              <textarea value={modalEditar.observaciones}
                onChange={(e) => setModalEditar({ ...modalEditar, observaciones: e.target.value })}
                className="input-base w-full" rows={3} />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModalEditar(null)} className="btn-ghost flex-1 py-2">
                Cancelar
              </button>
              <button onClick={handleEditar} disabled={cargandoAccion} className="btn-primary flex-1 py-2 disabled:opacity-50">
                {cargandoAccion ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}