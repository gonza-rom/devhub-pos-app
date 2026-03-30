"use client";
// app/(app)/caja/page.tsx
// CAMBIO: Modal de cierre ahora incluye "retiro de billetes" y "fondo de cambio"

import { useState, useEffect, useCallback } from "react";
import {
  LockOpen, Lock, Plus, Minus, RefreshCw, ShoppingCart,
  AlertTriangle, CheckCircle, Clock, Banknote, Smartphone,
  CreditCard, X, Landmark, History, Sunset, Moon, Sunrise,
} from "lucide-react";
import POSClient from "@/app/(app)/ventas/POSClient";
import Link from "next/link";
import { detectarTurno, obtenerTurnosDisponibles, TURNO_ICONS, formatearNombreTurno, type ConfigTurnos } from "@/lib/turnos";
import { useToast }   from "@/components/toast";
import { useConfirm } from "@/components/toast";

type TipoMov = "APERTURA" | "VENTA_EFECTIVO" | "VENTA_VIRTUAL" | "INGRESO" | "EGRESO" | "CIERRE";

interface MovimientoCaja {
  id: string; tipo: TipoMov; monto: number; metodoPago?: string | null;
  descripcion: string | null; usuarioNombre: string | null; createdAt: string;
}
interface CajaData {
  id: string; saldoInicial: number; abiertaAt: string;
  usuarioNombre: string | null; movimientos: MovimientoCaja[];
  saldoInicial_: number; totalEfectivo: number; totalIngresos: number; totalEgresos: number;
  totalTransferencia: number; totalMercadoPago: number;
  totalTarjetaCredito: number; totalTarjetaDebito: number;
  totalVirtuales: number; totalTarjetas: number; saldoActual: number;
  turno: string | null;
}
interface UltimaCaja {
  saldoInicial: number; saldoFinal: number; saldoContado: number;
  diferencia: number; abiertaAt: string; cerradaAt: string;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);
const fmtHora = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
const fmtFecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

const tipoLabel: Record<TipoMov, string> = {
  APERTURA: "Apertura", VENTA_EFECTIVO: "Venta efectivo", VENTA_VIRTUAL: "Venta virtual",
  INGRESO: "Ingreso", EGRESO: "Egreso", CIERRE: "Cierre",
};
const tipoColor: Record<TipoMov, string> = {
  APERTURA: "text-blue-600 bg-blue-50", VENTA_EFECTIVO: "text-green-600 bg-green-50",
  VENTA_VIRTUAL: "text-purple-600 bg-purple-50", INGRESO: "text-emerald-600 bg-emerald-50",
  EGRESO: "text-red-600 bg-red-50", CIERRE: "text-gray-600 bg-gray-100",
};
const esPositivo = (t: TipoMov) => ["APERTURA","VENTA_EFECTIVO","VENTA_VIRTUAL","INGRESO"].includes(t);

export default function CajaPage() {
  const [estado, setEstado] = useState<"loading"|"abierta"|"cerrada">("loading");
  const [caja, setCaja] = useState<CajaData | null>(null);
  const [ultima, setUltima] = useState<UltimaCaja | null>(null);

  const [modalApertura,   setModalApertura]   = useState(false);
  const [modalCierre,     setModalCierre]     = useState(false);
  const [modalMovimiento, setModalMovimiento] = useState<"INGRESO"|"EGRESO"|null>(null);
  const [modalVenta,      setModalVenta]      = useState(false);

  const [saldoInicial,  setSaldoInicial]  = useState("");
  const [obsApertura,   setObsApertura]   = useState("");

  // ── Campos del cierre ─────────────────────────────────────────
  const [saldoContado,  setSaldoContado]  = useState("");   // lo que hay en caja (contado físicamente)
  const [retiro,        setRetiro]        = useState("");   // billetes grandes que se llevan
  const [obsCierre,     setObsCierre]     = useState("");

  const [montoMov,     setMontoMov]     = useState("");
  const [descMov,      setDescMov]      = useState("");

  const [categorias,  setCategorias]  = useState<any[]>([]);
  const [prodCaja,    setProdCaja]    = useState<any[]>([]);
  const [loadingProd, setLoadingProd] = useState(false);
  const [loading,     setLoading]     = useState(false);

  const [saldoSugerido,     setSaldoSugerido]     = useState<number | null>(null);
  const [turnoSeleccionado, setTurnoSeleccionado] = useState("");
  const [turnoDetectado,    setTurnoDetectado]    = useState<{
    turno: string; label: string; horario: string;
    icon: "sunrise" | "sunset" | "moon" | "alert";
  } | null>(null);
  const [configTurnos, setConfigTurnos] = useState<ConfigTurnos | undefined>(undefined);

  const toast   = useToast();
  const confirm = useConfirm();

  const fetchEstado = useCallback(async () => {
    try {
      const res = await fetch("/api/caja");
      const data = await res.json();
      if (data.abierta) { setCaja(data.caja); setEstado("abierta"); }
      else { setUltima(data.ultima ?? null); setEstado("cerrada"); }
    } catch { setEstado("cerrada"); }
  }, []);

  useEffect(() => { fetchEstado(); }, [fetchEstado]);

  useEffect(() => {
    if (modalVenta) {
      setLoadingProd(true);
      cargarDatos().finally(() => setLoadingProd(false));
    }
  }, [modalVenta]);

  useEffect(() => {
    fetch('/api/productos?solo=categorias')
      .then(r => r.json())
      .then(d => { if (d.ok && d.data) setCategorias(d.data); })
      .catch(err => console.error('Error cargando categorías:', err));
  }, []);

  useEffect(() => {
    if (estado === "cerrada" && ultima) setSaldoSugerido(ultima.saldoContado);
  }, [estado, ultima]);

  useEffect(() => {
    if (modalApertura) {
      fetch("/api/configuracion/turnos")
        .then(r => r.json())
        .then(configData => {
          const config = configData.ok ? configData.data : undefined;
          setConfigTurnos(config);
          const turno = detectarTurno(new Date(), config);
          setTurnoDetectado(turno);
          setTurnoSeleccionado(turno.turno);
        })
        .catch(console.error);

      fetch("/api/caja/saldo-sugerido")
        .then(r => r.json())
        .then(d => { if (d.ok && d.saldoSugerido !== null) setSaldoSugerido(d.saldoSugerido); })
        .catch(console.error);
    }
  }, [modalApertura]);

  const cargarDatos = async () => {
    try {
      const [cajaRes, prodRes, catRes] = await Promise.all([
        fetch("/api/caja"),
        fetch("/api/productos?modo=pos&activos=true&pageSize=100"),
        fetch("/api/productos?solo=categorias"),
      ]);
      const [cajaData, prodData, catData] = await Promise.all([
        cajaRes.json(), prodRes.json(), catRes.json(),
      ]);
      if (cajaData.abierta && cajaData.caja) setCaja(cajaData.caja);
      if (prodData.ok && prodData.productos)  setProdCaja(prodData.productos);
      if (catData.ok  && catData.data)        setCategorias(catData.data);
    } catch (err) { console.error("Error cargando datos:", err); }
  };

  useEffect(() => { cargarDatos(); }, []);

  // ── Derivados del cierre ────────────────────────────────────────
  const saldoContadoNum  = parseFloat(saldoContado) || 0;
  const retiroNum        = parseFloat(retiro)       || 0;
  const fondoCambio      = Math.max(0, saldoContadoNum - retiroNum);
  const diferenciaCierre = saldoContado !== ""
    ? saldoContadoNum - (caja?.saldoActual ?? 0)
    : null;

  // ── Abrir caja ──────────────────────────────────────────────────
  const abrirCaja = async () => {
    const monto = parseFloat(saldoInicial);
    if (isNaN(monto) || monto < 0) {
      toast.error("Saldo inicial inválido", "Ingresá un monto mayor o igual a 0");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/caja", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saldoInicial: monto, turno: turnoSeleccionado, observaciones: obsApertura || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Caja abierta", `Turno ${formatearNombreTurno(turnoSeleccionado)} · Saldo inicial: ${fmt(monto)}`);
      setModalApertura(false);
      setSaldoInicial("");
      setObsApertura("");
      setTurnoSeleccionado("");
      await fetchEstado();
    } catch (e: any) {
      toast.error("Error al abrir caja", e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Cerrar caja ─────────────────────────────────────────────────
  const cerrarCaja = async () => {
    const monto = parseFloat(saldoContado);
    if (isNaN(monto) || monto < 0) {
      toast.error("Saldo contado inválido", "Ingresá el monto que contás en caja");
      return;
    }

    const diferencia = monto - (caja?.saldoActual ?? 0);
    if (diferencia !== 0) {
      const ok = await confirm({
        title:        diferencia < 0 ? "Hay un faltante en caja" : "Hay un sobrante en caja",
        description:  `${diferencia < 0 ? "Faltante" : "Sobrante"}: ${fmt(Math.abs(diferencia))}. ¿Confirmás el cierre de todas formas?`,
        confirmLabel: "Sí, cerrar caja",
        cancelLabel:  "Revisar",
        variant:      diferencia < 0 ? "danger" : "warning",
        icon:         "warning",
      });
      if (!ok) return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/caja", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saldoContado: monto,
          retiro:       retiroNum,
          fondoCambio,
          observaciones: obsCierre || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const diffLabel = diferencia === 0
        ? "Sin diferencias"
        : diferencia > 0
        ? `Sobrante: +${fmt(diferencia)}`
        : `Faltante: ${fmt(diferencia)}`;

      toast.success(
        "Caja cerrada",
        retiroNum > 0
          ? `${diffLabel} · Retiro: ${fmt(retiroNum)} · Fondo cambio: ${fmt(fondoCambio)}`
          : diffLabel,
      );
      setModalCierre(false);
      setSaldoContado("");
      setRetiro("");
      setObsCierre("");
      await fetchEstado();
    } catch (e: any) {
      toast.error("Error al cerrar caja", e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Movimiento manual ───────────────────────────────────────────
  const registrarMovimiento = async () => {
    const monto = parseFloat(montoMov);
    if (isNaN(monto) || monto <= 0) {
      toast.error("El monto debe ser mayor a 0");
      return;
    }
    if (!descMov.trim()) {
      toast.error("La descripción es obligatoria");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/caja/movimientos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: modalMovimiento, monto, descripcion: descMov }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(
        modalMovimiento === "INGRESO" ? "Ingreso registrado" : "Gasto registrado",
        `${fmt(monto)} · ${descMov}`
      );
      setModalMovimiento(null);
      setMontoMov("");
      setDescMov("");
      await fetchEstado();
    } catch (e: any) {
      toast.error("Error al registrar movimiento", e.message);
    } finally {
      setLoading(false);
    }
  };

  if (estado === "loading") return (
    <div className="flex items-center justify-center min-h-[400px]">
      <RefreshCw className="w-8 h-8 animate-spin text-gray-600" />
    </div>
  );

  // ── CERRADA ─────────────────────────────────────────────────────
  if (estado === "cerrada") return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
          <Lock className="w-8 h-8 text-gray-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Caja cerrada</h1>
        <p className="text-gray-600 mt-1">No hay ninguna sesión activa</p>
      </div>

      {ultima && (
        <div className="rounded-xl p-6 mb-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border-base)" }}>
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">Última sesión</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-gray-600">Apertura</p><p className="font-medium">{fmtFecha(ultima.abiertaAt)}</p></div>
            <div><p className="text-gray-600">Cierre</p><p className="font-medium">{fmtFecha(ultima.cerradaAt)}</p></div>
            <div><p className="text-gray-600">Saldo esperado</p><p className="font-medium">{fmt(ultima.saldoFinal)}</p></div>
            <div><p className="text-gray-600">Saldo contado</p><p className="font-medium">{fmt(ultima.saldoContado)}</p></div>
            <div className="col-span-2">
              <p className="text-gray-600">Diferencia</p>
              <p className={`font-semibold text-lg ${ultima.diferencia === 0 ? "text-green-600" : ultima.diferencia > 0 ? "text-blue-600" : "text-red-600"}`}>
                {ultima.diferencia >= 0 ? "+" : ""}{fmt(ultima.diferencia)}
              </p>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setModalApertura(true)}
        className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-4 rounded-xl transition-colors text-lg"
      >
        <LockOpen className="w-5 h-5" /> Abrir caja
      </button>

      <Link href="/caja/historial" className="w-full flex items-center justify-center gap-2 text-sm font-medium text-gray-800 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-300 py-3 transition-colors">
        <History className="w-4 h-4" /> Ver historial de cierres
      </Link>

      {modalApertura && (
        <Modal title="Abrir caja" onClose={() => setModalApertura(false)}>
          <div className="space-y-4">
            {saldoSugerido !== null && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <Banknote className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">Fondo de cambio del último cierre</p>
                    <p className="text-xs text-blue-700 mt-0.5">Este es el cambio que quedó en caja al cerrar el turno anterior</p>
                    <button
                      onClick={() => setSaldoInicial(String(saldoSugerido))}
                      className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-800 underline"
                    >
                      Usar {fmt(saldoSugerido)} como saldo inicial
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Turno</label>
              {turnoDetectado && (
                <div className={`mb-3 p-3 rounded-lg ${
                  turnoDetectado.turno === "fuera_horario"
                    ? "bg-yellow-50 border border-yellow-200"
                    : "bg-green-50 border border-green-200"
                }`}>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const Icon = TURNO_ICONS[turnoDetectado.icon];
                      return <Icon className={`h-5 w-5 ${turnoDetectado.turno === "fuera_horario" ? "text-yellow-700" : "text-green-700"}`} />;
                    })()}
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${turnoDetectado.turno === "fuera_horario" ? "text-yellow-900" : "text-green-900"}`}>
                        {turnoDetectado.label}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                {obtenerTurnosDisponibles(configTurnos).map((t) => {
                  const Icon = TURNO_ICONS[t.icon];
                  return (
                    <button key={t.value} type="button" onClick={() => setTurnoSeleccionado(t.value)}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                        turnoSeleccionado === t.value ? "border-green-500 bg-green-50" : "border-gray-300 bg-white hover:border-gray-400"
                      }`}>
                      <Icon className="h-6 w-6 mb-1 text-gray-700" />
                      <span className="text-xs font-medium text-gray-700">{t.label}</span>
                      <span className="text-[10px] text-gray-500">{t.horario}</span>
                    </button>
                  );
                })}
                <button type="button" onClick={() => setTurnoSeleccionado("fuera_horario")}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all col-span-2 ${
                    turnoSeleccionado === "fuera_horario" ? "border-yellow-500 bg-yellow-50" : "border-gray-300 bg-white hover:border-gray-400"
                  }`}>
                  <AlertTriangle className="h-6 w-6 mb-1 text-gray-700" />
                  <span className="text-xs font-medium text-gray-700">Fuera de horario</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Saldo inicial en efectivo</label>
              <InputMoneda value={saldoInicial} onChange={setSaldoInicial} autoFocus
                placeholder={saldoSugerido !== null ? String(saldoSugerido) : "0.00"} />
              <p className="text-xs text-gray-500 mt-1">
                {saldoSugerido !== null
                  ? `Fondo de cambio del turno anterior: ${fmt(saldoSugerido)}`
                  : "Ingresá el efectivo con el que abrís la caja"}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observaciones <span className="text-gray-400">(opcional)</span>
              </label>
              <input type="text" value={obsApertura} onChange={(e) => setObsApertura(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Ej: Turno mañana" />
            </div>

            <BotonesModal onCancel={() => setModalApertura(false)} onConfirm={abrirCaja}
              loading={loading} labelConfirm="Abrir caja" colorConfirm="green" />
          </div>
        </Modal>
      )}
    </div>
  );

  // ── ABIERTA ─────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto px-3 md:px-4 py-4 md:py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse inline-block" />
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Caja abierta</h1>
            {caja?.turno && (
              <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium inline-flex items-center gap-1">
                {caja.turno === "mañana"        && <Sunrise className="h-3 w-3" />}
                {caja.turno === "tarde"         && <Sunset className="h-3 w-3" />}
                {caja.turno === "noche"         && <Moon className="h-3 w-3" />}
                {caja.turno === "fuera_horario" && <AlertTriangle className="h-3 w-3" />}
                {formatearNombreTurno(caja.turno)}
              </span>
            )}
          </div>
          <p className="text-xs md:text-sm text-gray-600 mt-0.5 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Desde {caja ? fmtFecha(caja.abiertaAt) : ""}
            {caja?.usuarioNombre && ` · ${caja.usuarioNombre}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/caja/historial"
            className="flex items-center gap-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold px-4 py-2 rounded-lg transition-colors border border-zinc-300">
            <History className="w-4 h-4" /> Historial
          </Link>
          <button onClick={() => setModalCierre(true)}
            className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 font-semibold px-4 py-2 rounded-lg transition-colors border border-red-200">
            <Lock className="w-4 h-4" /> Cerrar caja
          </button>
        </div>
      </div>

      {/* Panel principal */}
      <div className="grid lg:grid-cols-2 gap-4 py-4">
        {/* EFECTIVO */}
        <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-card)", border: "4px solid rgba(41, 134, 75, 0.3)" }}>
          <div className="px-3 md:px-4 py-2.5 flex items-center gap-2">
            <Banknote className="w-5 h-5 text-white" />
            <h2 className="font-semibold text-xl">Efectivo en caja</h2>
          </div>
          <div className="p-3 md:p-4 space-y-2.5">
            <FilaCaja num="1" label="Saldo inicial"      valor={fmt(caja?.saldoInicial   ?? 0)} sub="Apertura del turno"  color="text-gray-700" />
            <FilaCaja num="2" label="(+) Ventas efec."   valor={`+ ${fmt(caja?.totalEfectivo  ?? 0)}`} sub="Ingresos del turno"  color="text-green-700" />
            <FilaCaja num="+" label="(+) Ingresos"       valor={`+ ${fmt(caja?.totalIngresos ?? 0)}`} sub="Ingresos manuales"   color="text-green-700" />
            <FilaCaja num="3" label="(-) Gastos/Retiros" valor={`- ${fmt(caja?.totalEgresos  ?? 0)}`} sub="Salidas de capital"  color="text-red-700" />
            <div className="border-t border-gray-200 pt-3 mt-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 font-medium">4. (=) En caja</p>
                  <p className="text-xs text-gray-600">Saldo esperado actual</p>
                </div>
                <p className="text-2xl font-bold text-green-700">{fmt(caja?.saldoActual ?? 0)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* VIRTUAL */}
        <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-card)", border: "4px solid rgba(46, 133, 78, 0.3)" }}>
          <div className="px-5 py-3 flex items-center gap-2" style={{ background: "#6b7280", color: "#ffffff" }}>
            <Smartphone className="w-5 h-5" />
            <h2 className="font-semibold text-xl">Ventas virtuales</h2>
            <span className="ml-auto text-lg text-white/8 font-semibold">No afectan la caja física</span>
          </div>
          <div className="p-5 space-y-3">
            <FilaCaja label="Transferencia"     valor={fmt(caja?.totalTransferencia ?? 0)} color="text-purple-700" icon={<Landmark   className="w-3.5 h-3.5" />} />
            <FilaCaja label="Mercado Pago / QR" valor={fmt(caja?.totalMercadoPago   ?? 0)} color="text-purple-700" icon={<Smartphone className="w-3.5 h-3.5" />} />
            <div className="pt-3" style={{ borderTop: "1px solid var(--border-base)" }}>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="w-4 h-4 text-gray-600" />
                  <p className="text-base font-semibold text-gray-600 uppercase tracking-wide">Tarjetas</p>
                  <span className="text-base text-gray-600 ml-auto">Acred. diferida</span>
                </div>
                <FilaCaja label="Débito"  valor={fmt(caja?.totalTarjetaDebito  ?? 0)} color="text-blue-700" icon={<CreditCard className="w-3.5 h-3.5" />} />
                <FilaCaja label="Crédito" valor={fmt(caja?.totalTarjetaCredito ?? 0)} color="text-blue-700" icon={<CreditCard className="w-3.5 h-3.5" />} />
              </div>
            </div>
            <div className="rounded-lg p-3" style={{ background: "var(--bg-surface)" }}>
              <div className="flex justify-between items-center">
                <p className="text-sm font-semibold text-gray-700">Total virtual</p>
                <p className="text-lg font-bold text-gray-800">{fmt((caja?.totalVirtuales ?? 0) + (caja?.totalTarjetas ?? 0))}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Botones acción */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3 py-2.5">
        <button onClick={() => setModalVenta(true)}
          className="flex flex-col items-center justify-center gap-1.5 font-semibold py-3 md:py-4 transition-colors rounded-xl"
          style={{ background: "#16a34a", color: "#ffffff" }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#15803d"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "#16a34a"}>
          <ShoppingCart className="w-5 h-5" />
          <span className="text-sm">Cobrar venta</span>
        </button>
        <button onClick={() => { setMontoMov(""); setDescMov(""); setModalMovimiento("INGRESO"); }}
          className="flex flex-col items-center justify-center gap-1.5 font-semibold py-4 rounded-xl transition-colors"
          style={{ background: "rgba(16,185,129,0.12)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(16,185,129,0.2)"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(16,185,129,0.12)"}>
          <Plus className="w-5 h-5" />
          <span className="text-sm">Ingreso manual</span>
        </button>
        <button onClick={() => { setMontoMov(""); setDescMov(""); setModalMovimiento("EGRESO"); }}
          className="flex flex-col items-center justify-center gap-1.5 font-semibold py-4 rounded-xl transition-colors"
          style={{ background: "rgba(220,38,38,0.12)", color: "#ef4444", border: "1px solid rgba(220,38,38,0.3)" }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(220,38,38,0.2)"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(220,38,38,0.12)"}>
          <Minus className="w-5 h-5" />
          <span className="text-sm">Gasto / Retiro</span>
        </button>
      </div>

      {/* Movimientos del día */}
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border-base)" }}>
        <div className="px-3 md:px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Movimientos del día</h2>
          <span className="text-sm text-gray-600">{caja?.movimientos.length ?? 0} registros</span>
        </div>
        <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
          {!caja?.movimientos.length ? (
            <p className="text-center text-gray-600 py-8 text-sm">Sin movimientos aún</p>
          ) : caja.movimientos.map((mov) => (
            <div key={mov.id} className="flex items-center gap-2 md:gap-3 px-3 md:px-5 py-2.5">
              <span className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${tipoColor[mov.tipo]}`}>
                {tipoLabel[mov.tipo]}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 truncate">{mov.descripcion ?? "—"}</p>
                {mov.metodoPago && mov.tipo === "VENTA_VIRTUAL" && (
                  <p className="text-xs text-gray-600">{mov.metodoPago.replace("_", " ")}</p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`text-sm font-semibold ${esPositivo(mov.tipo) ? "text-green-700" : "text-red-700"}`}>
                  {esPositivo(mov.tipo) ? "+" : "−"}{fmt(mov.monto)}
                </p>
                <p className="text-xs text-gray-600">{fmtHora(mov.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Cobrar Venta */}
      {modalVenta && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full h-full max-w-[1920px] max-h-[1080px] flex flex-col rounded-xl overflow-hidden shadow-2xl"
            style={{ background: "var(--bg-surface)" }}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b flex-shrink-0"
              style={{ borderColor: "var(--border-base)" }}>
              <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Cobrar venta</h3>
              <button onClick={() => setModalVenta(false)}
                className="flex items-center justify-center h-8 w-8 rounded-lg transition-colors"
                style={{ background: "var(--bg-hover)", color: "var(--text-muted)" }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {loadingProd ? (
                <div className="flex items-center justify-center h-full">
                  <RefreshCw className="w-8 h-8 animate-spin" style={{ color: "var(--text-muted)" }} />
                </div>
              ) : (
                <POSClient
                  productosIniciales={prodCaja}
                  categorias={categorias}
                  isModal={true}
                  onVentaExitosa={cargarDatos}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal movimiento manual */}
      {modalMovimiento && (
        <Modal title={modalMovimiento === "INGRESO" ? "Ingreso manual" : "Gasto / Retiro"} onClose={() => setModalMovimiento(null)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
              <InputMoneda value={montoMov} onChange={setMontoMov} autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <input type="text" value={descMov} onChange={(e) => setDescMov(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder={modalMovimiento === "INGRESO" ? "Ej: Depósito, cobro extra..." : "Ej: Pago proveedor, retiro propietario..."} />
            </div>
            <BotonesModal onCancel={() => setModalMovimiento(null)} onConfirm={registrarMovimiento}
              loading={loading} labelConfirm="Confirmar" colorConfirm={modalMovimiento === "INGRESO" ? "emerald" : "red"} />
          </div>
        </Modal>
      )}

      {/* ── Modal cierre — con retiro y fondo de cambio ── */}
      {modalCierre && (
        <Modal title="Cerrar caja" onClose={() => { setModalCierre(false); setSaldoContado(""); setRetiro(""); setObsCierre(""); }}>
          <div className="space-y-4">

            {/* Resumen esperado */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Saldo inicial</span><span className="font-medium">{fmt(caja?.saldoInicial ?? 0)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Ventas efectivo</span><span className="font-medium text-green-700">+{fmt(caja?.totalEfectivo ?? 0)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Ingresos</span><span className="font-medium text-green-700">+{fmt(caja?.totalIngresos ?? 0)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Gastos/Retiros</span><span className="font-medium text-red-700">−{fmt(caja?.totalEgresos ?? 0)}</span></div>
              <div className="flex justify-between border-t border-gray-200 pt-2 font-semibold">
                <span>Saldo esperado</span><span>{fmt(caja?.saldoActual ?? 0)}</span>
              </div>
            </div>

            {/* Paso 1: Contar */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                1. ¿Cuánto contás en caja? *
              </label>
              <InputMoneda value={saldoContado} onChange={setSaldoContado} autoFocus />
            </div>

            {/* Diferencia */}
            {diferenciaCierre !== null && (
              <div className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium ${
                diferenciaCierre === 0 ? "bg-green-50 text-green-700" : diferenciaCierre > 0 ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-700"}`}>
                {diferenciaCierre === 0 ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                {diferenciaCierre === 0 ? "Sin diferencias ✓" : diferenciaCierre > 0 ? `Sobrante: +${fmt(diferenciaCierre)}` : `Faltante: ${fmt(diferenciaCierre)}`}
              </div>
            )}

            {/* Paso 2: Retiro */}
            {saldoContado !== "" && (
              <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.25)" }}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    2. ¿Cuánto retirás? (billetes grandes)
                  </label>
                  <InputMoneda value={retiro} onChange={setRetiro} placeholder="0.00" />
                  <p className="text-xs text-gray-500 mt-1">
                    Dejá en 0 si no retirás nada
                  </p>
                </div>

                {/* Resumen fondo de cambio */}
                <div className="rounded-lg px-4 py-3 flex items-center justify-between"
                  style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
                  <div>
                    <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Fondo de cambio</p>
                    <p className="text-xs text-green-600 mt-0.5">Queda en caja para el próximo turno</p>
                  </div>
                  <p className="text-xl font-bold text-green-700">{fmt(fondoCambio)}</p>
                </div>
              </div>
            )}

            {/* Observaciones */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observaciones <span className="text-gray-400">(opcional)</span>
              </label>
              <input type="text" value={obsCierre} onChange={(e) => setObsCierre(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Notas del cierre..." />
            </div>

            <BotonesModal
              onCancel={() => { setModalCierre(false); setSaldoContado(""); setRetiro(""); setObsCierre(""); }}
              onConfirm={cerrarCaja}
              loading={loading}
              labelConfirm="Cerrar caja"
              colorConfirm="red"
            />
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Sub-componentes ─────────────────────────────────────────────
function FilaCaja({ num, label, valor, sub, color, icon }: {
  num?: string; label: string; valor: string; sub?: string; color: string; icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
        {num  && <span className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-gray-100 text-gray-600 text-[10px] md:text-base flex items-center justify-center font-semibold flex-shrink-0">{num}</span>}
        {icon && <span className="text-gray-600 flex-shrink-0">{icon}</span>}
        <div className="min-w-0">
          <p className="text-base font-medium text-gray-700 truncate">{label}</p>
          {sub && <p className="text-[10px] md:text-xs text-gray-600 truncate">{sub}</p>}
        </div>
      </div>
      <p className={`text-base md:text-base font-semibold ${color} flex-shrink-0`}>{valor}</p>
    </div>
  );
}

function InputMoneda({ value, onChange, autoFocus, placeholder = "0.00" }: {
  value: string; onChange: (v: string) => void; autoFocus?: boolean; placeholder?: string;
}) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 font-medium">$</span>
      <input type="number" min="0" step="0.01" value={value} onChange={(e) => onChange(e.target.value)}
      className="input-base w-full pl-8 pr-4 py-3 text-lg"
      placeholder={placeholder} autoFocus={autoFocus}
      onWheel={(e) => e.currentTarget.blur()} />
    </div>
  );
}

function BotonesModal({ onCancel, onConfirm, loading, labelConfirm, colorConfirm }: {
  onCancel: () => void; onConfirm: () => void; loading: boolean;
  labelConfirm: string; colorConfirm: "green" | "emerald" | "red";
}) {
  const bg = { green: "bg-green-600 hover:bg-green-700", emerald: "bg-emerald-600 hover:bg-emerald-700", red: "bg-red-600 hover:bg-red-700" }[colorConfirm];
  return (
    <div className="flex gap-3 pt-2">
      <button onClick={onCancel} className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium">Cancelar</button>
      <button onClick={onConfirm} disabled={loading} className={`flex-1 py-3 text-white rounded-lg font-semibold disabled:opacity-50 transition-colors ${bg}`}>
        {loading ? "Guardando..." : labelConfirm}
      </button>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col"
        style={{ background: "var(--bg-card)" }}>
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--border-base)" }}>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-900 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto flex-1 modal-scroll">{children}</div>
      </div>
    </div>
  );
}