"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LockOpen, Lock, Plus, Minus, RefreshCw, ShoppingCart,
  AlertTriangle, CheckCircle, Clock, Banknote, Smartphone, CreditCard, X, Search, Landmark, History
} from "lucide-react";
import POSClient from "@/app/(app)/ventas/POSClient";
import Link from "next/link";

type TipoMov = "APERTURA" | "VENTA_EFECTIVO" | "VENTA_VIRTUAL" | "INGRESO" | "EGRESO" | "CIERRE";
type MetodoPago = "EFECTIVO" | "TRANSFERENCIA" | "MERCADO_PAGO" | "TARJETA_CREDITO" | "TARJETA_DEBITO";

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
}
interface UltimaCaja {
  saldoInicial: number; saldoFinal: number; saldoContado: number;
  diferencia: number; abiertaAt: string; cerradaAt: string;
}
interface Producto {
  id: string; nombre: string; precio: number; stock: number;
  imagen?: string | null; codigoBarras?: string | null;
}
interface ItemCarrito { producto: Producto; cantidad: number; }

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);
const fmtHora = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
const fmtFecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

const METODOS: { value: MetodoPago; label: string; icon: string }[] = [
  { value: "EFECTIVO",        label: "Efectivo",        icon: "💵" },
  { value: "TRANSFERENCIA",   label: "Transferencia",   icon: "🏦" },
  { value: "MERCADO_PAGO",    label: "Mercado Pago",    icon: "📱" },
  { value: "TARJETA_DEBITO",  label: "Tarjeta Débito",  icon: "💳" },
  { value: "TARJETA_CREDITO", label: "Tarjeta Crédito", icon: "💳" },
];

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

  const [saldoInicial, setSaldoInicial] = useState("");
  const [obsApertura,  setObsApertura]  = useState("");
  const [saldoContado, setSaldoContado] = useState("");
  const [obsCierre,    setObsCierre]    = useState("");
  const [montoMov,     setMontoMov]     = useState("");
  const [descMov,      setDescMov]      = useState("");

  // POS
  const [prodCaja,    setProdCaja]    = useState<any[]>([]);
  const [catsCaja,    setCatsCaja]    = useState<any[]>([]);
  const [loadingProd, setLoadingProd] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const fetchEstado = useCallback(async () => {
    try {
      const res = await fetch("/api/caja");
      const data = await res.json();
      if (data.abierta) { setCaja(data.caja); setEstado("abierta"); }
      else { setUltima(data.ultima ?? null); setEstado("cerrada"); }
    } catch { setEstado("cerrada"); }
  }, []);

  useEffect(() => { fetchEstado(); }, [fetchEstado]);

    // Cargar productos para el POS
    useEffect(() => {
    if (!modalVenta) return;
    setLoadingProd(true);
    Promise.all([
        fetch("/api/productos?limit=200&activo=true").then(r => r.json()),
        fetch("/api/categorias").then(r => r.json()),
    ]).then(([prod, cats]) => {
        setProdCaja(prod.data ?? prod ?? []);
        setCatsCaja(cats.data ?? cats ?? []);
    }).finally(() => setLoadingProd(false));
    }, [modalVenta]);



  const abrirCaja = async () => {
    const monto = parseFloat(saldoInicial);
    if (isNaN(monto) || monto < 0) { setError("Ingresá un saldo inicial válido"); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/caja", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saldoInicial: monto, observaciones: obsApertura || null }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setModalApertura(false); setSaldoInicial(""); setObsApertura("");
      await fetchEstado();
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  const cerrarCaja = async () => {
    const monto = parseFloat(saldoContado);
    if (isNaN(monto) || monto < 0) { setError("Ingresá el saldo contado"); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/caja", { method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saldoContado: monto, observaciones: obsCierre || null }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setModalCierre(false); setSaldoContado(""); setObsCierre("");
      await fetchEstado();
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  const registrarMovimiento = async () => {
    const monto = parseFloat(montoMov);
    if (isNaN(monto) || monto <= 0) { setError("El monto debe ser mayor a 0"); return; }
    if (!descMov.trim()) { setError("La descripción es obligatoria"); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/caja/movimientos", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: modalMovimiento, monto, descripcion: descMov }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setModalMovimiento(null); setMontoMov(""); setDescMov("");
      await fetchEstado();
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  if (estado === "loading") return (
    <div className="flex items-center justify-center min-h-[400px]">
      <RefreshCw className="w-8 h-8 animate-spin text-gray-600" />
    </div>
  );

  // ── CERRADA ───────────────────────────────────────────────────
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
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
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

      {error && <ErrorBanner mensaje={error} />}

      <button onClick={() => { setError(null); setModalApertura(true); }}
        className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-4 rounded-xl transition-colors text-lg">
        <LockOpen className="w-5 h-5" /> Abrir caja
      </button>

      <Link
        href="/caja/historial"
        className="w-full flex items-center justify-center gap-2 text-sm font-medium text-gray-800 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-300 py-3 transition-colors"
      >
        <History className="w-4 h-4" />
        Ver historial de cierres
      </Link>

      {modalApertura && (
        <Modal title="Abrir caja" onClose={() => setModalApertura(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Saldo inicial en efectivo</label>
              <InputMoneda value={saldoInicial} onChange={setSaldoInicial} autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones <span className="text-gray-600">(opcional)</span></label>
              <input type="text" value={obsApertura} onChange={(e) => setObsApertura(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Ej: Turno mañana" />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <BotonesModal onCancel={() => setModalApertura(false)} onConfirm={abrirCaja} loading={loading} labelConfirm="Abrir caja" colorConfirm="green" />
          </div>
        </Modal>
      )}
    </div>
  );

  // ── ABIERTA ───────────────────────────────────────────────────
  const diferenciaCierre = saldoContado !== "" && !isNaN(parseFloat(saldoContado))
    ? parseFloat(saldoContado) - (caja?.saldoActual ?? 0) : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse inline-block" />
            <h1 className="text-2xl font-bold text-gray-900">Caja abierta</h1>
          </div>
          <p className="text-sm text-gray-600 mt-0.5 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Desde {caja ? fmtFecha(caja.abiertaAt) : ""}
            {caja?.usuarioNombre && ` · ${caja.usuarioNombre}`}
          </p>
        </div>
        <button onClick={() => { setError(null); setModalCierre(true); }}
          className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 font-semibold px-4 py-2 rounded-lg transition-colors border border-red-200">
          <Lock className="w-4 h-4" /> Cerrar caja
        </button>
      </div>

      {error && <ErrorBanner mensaje={error} />}

      {/* Panel principal dividido */}
<div className="grid md:grid-cols-2 gap-4">

  {/* EFECTIVO */}
  <div className="bg-white border-2 border-green-200 rounded-xl overflow-hidden">
    <div className="bg-green-600 px-5 py-3 flex items-center gap-2">
      <Banknote className="w-5 h-5 text-white" />
      <h2 className="font-semibold text-white">Efectivo en caja</h2>
    </div>
    <div className="p-5 space-y-3">
      <FilaCaja num="1" label="Saldo inicial"     valor={fmt(caja?.saldoInicial  ?? 0)} sub="Apertura del turno"  color="text-gray-700" />
      <FilaCaja num="2" label="(+) Ventas efec."  valor={`+ ${fmt(caja?.totalEfectivo  ?? 0)}`} sub="Ingresos del turno"  color="text-green-700" />
      <FilaCaja num="+" label="(+) Ingresos"      valor={`+ ${fmt(caja?.totalIngresos ?? 0)}`} sub="Ingresos manuales"   color="text-green-700" />
      <FilaCaja num="3" label="(-) Gastos/Retiros" valor={`- ${fmt(caja?.totalEgresos ?? 0)}`} sub="Salidas de capital"  color="text-red-700" />
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
  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
    <div className="bg-gray-700 px-5 py-3 flex items-center gap-2">
      <Smartphone className="w-5 h-5 text-white" />
      <h2 className="font-semibold text-white">Ventas virtuales</h2>
      <span className="ml-auto text-xs text-gray-300">No afectan la caja física</span>
    </div>
    <div className="p-5 space-y-3">
      <FilaCaja label="Transferencia"     valor={fmt(caja?.totalTransferencia ?? 0)} color="text-purple-700" icon={<Landmark   className="w-3.5 h-3.5" />} />
      <FilaCaja label="Mercado Pago / QR" valor={fmt(caja?.totalMercadoPago   ?? 0)} color="text-purple-700" icon={<Smartphone className="w-3.5 h-3.5" />} />
      <div className="border-t border-gray-200 pt-3">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-4 h-4 text-gray-600" />
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Tarjetas</p>
            <span className="text-xs text-gray-600 ml-auto">Acred. diferida</span>
          </div>
          <FilaCaja label="Débito"  valor={fmt(caja?.totalTarjetaDebito  ?? 0)} color="text-blue-700" icon={<CreditCard className="w-3.5 h-3.5" />} />
          <FilaCaja label="Crédito" valor={fmt(caja?.totalTarjetaCredito ?? 0)} color="text-blue-700" icon={<CreditCard className="w-3.5 h-3.5" />} />
        </div>
      </div>
      <div className="border-t border-gray-200 pt-3">
        <div className="flex justify-between items-center">
          <p className="text-sm font-semibold text-gray-700">Total virtual</p>
          <p className="text-lg font-bold text-gray-800">{fmt((caja?.totalVirtuales ?? 0) + (caja?.totalTarjetas ?? 0))}</p>
        </div>
      </div>
    </div>
  </div>

</div>
      {/* Botones acción */}
      <div className="grid grid-cols-3 gap-3">
        <button onClick={() => { setError(null); setModalVenta(true); }}
          className="flex flex-col items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white font-semibold py-4 rounded-xl transition-colors">
          <ShoppingCart className="w-5 h-5" />
          <span className="text-sm">Cobrar venta</span>
        </button>
        <button onClick={() => { setError(null); setMontoMov(""); setDescMov(""); setModalMovimiento("INGRESO"); }}
          className="flex flex-col items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold py-4 rounded-xl transition-colors">
          <Plus className="w-5 h-5" />
          <span className="text-sm">Ingreso manual</span>
        </button>
        <button onClick={() => { setError(null); setMontoMov(""); setDescMov(""); setModalMovimiento("EGRESO"); }}
          className="flex flex-col items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-semibold py-4 rounded-xl transition-colors">
          <Minus className="w-5 h-5" />
          <span className="text-sm">Gasto / Retiro</span>
        </button>
      </div>

      {/* Movimientos del día */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Movimientos del día</h2>
          <span className="text-sm text-gray-600">{caja?.movimientos.length ?? 0} registros</span>
        </div>
        <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
          {!caja?.movimientos.length ? (
            <p className="text-center text-gray-600 py-8 text-sm">Sin movimientos aún</p>
          ) : caja.movimientos.map((mov) => (
            <div key={mov.id} className="flex items-center gap-3 px-6 py-3">
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

      {/* ── Modal Cobrar Venta ── */}
      {modalVenta && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-0">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Cobrar venta</h3>
                <button
                onClick={() => { setModalVenta(false); setError(null); }}
                className="text-gray-600 hover:text-gray-600 transition-colors"
                >
                <X className="w-5 h-5" />
                </button>
            </div>
            <div className="flex-1 overflow-hidden">
                {loadingProd ? (
                <div className="flex items-center justify-center h-full">
                    <RefreshCw className="w-8 h-8 animate-spin text-gray-600" />
                </div>
                ) : (
                <POSClient
                    productos={prodCaja}
                    categorias={catsCaja}
                    isModal
                    onVentaExitosa={() => {
                        setModalVenta(false);
                        fetchEstado();
                    }}
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
            {error && <p className="text-sm text-red-600">{error}</p>}
            <BotonesModal onCancel={() => setModalMovimiento(null)} onConfirm={registrarMovimiento}
              loading={loading} labelConfirm="Confirmar" colorConfirm={modalMovimiento === "INGRESO" ? "emerald" : "red"} />
          </div>
        </Modal>
      )}

      {/* Modal cierre */}
      {modalCierre && (
        <Modal title="Cerrar caja" onClose={() => setModalCierre(false)}>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Saldo inicial</span><span className="font-medium">{fmt(caja?.saldoInicial ?? 0)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Ventas efectivo</span><span className="font-medium text-green-700">+{fmt(caja?.totalEfectivo ?? 0)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Ingresos</span><span className="font-medium text-green-700">+{fmt(caja?.totalIngresos ?? 0)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Gastos/Retiros</span><span className="font-medium text-red-700">−{fmt(caja?.totalEgresos ?? 0)}</span></div>
              <div className="flex justify-between border-t border-gray-200 pt-2 font-semibold">
                <span>Saldo esperado</span><span>{fmt(caja?.saldoActual ?? 0)}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">¿Cuánto contás en caja?</label>
              <InputMoneda value={saldoContado} onChange={setSaldoContado} autoFocus />
            </div>
            {diferenciaCierre !== null && (
              <div className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium ${
                diferenciaCierre === 0 ? "bg-green-50 text-green-700" : diferenciaCierre > 0 ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-700"}`}>
                {diferenciaCierre === 0 ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                {diferenciaCierre === 0 ? "Sin diferencias ✓" : diferenciaCierre > 0 ? `Sobrante: +${fmt(diferenciaCierre)}` : `Faltante: ${fmt(diferenciaCierre)}`}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones <span className="text-gray-600">(opcional)</span></label>
              <input type="text" value={obsCierre} onChange={(e) => setObsCierre(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Notas del cierre..." />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <BotonesModal onCancel={() => setModalCierre(false)} onConfirm={cerrarCaja}
              loading={loading} labelConfirm="Cerrar caja" colorConfirm="red" />
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
      <div className="flex items-center gap-2">
        {num && <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 text-xs flex items-center justify-center font-semibold flex-shrink-0">{num}</span>}
        {icon && <span className="text-gray-600 flex-shrink-0">{icon}</span>}
        <div>
          <p className="text-xs font-medium text-gray-700">{label}</p>
          {sub && <p className="text-xs text-gray-600">{sub}</p>}
        </div>
      </div>
      <p className={`text-sm font-semibold ${color}`}>{valor}</p>
    </div>
  );
}

function InputMoneda({ value, onChange, autoFocus }: {
  value: string; onChange: (v: string) => void; autoFocus?: boolean;
}) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 font-medium">$</span>
      <input type="number" min="0" step="0.01" value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-lg"
        placeholder="0.00" autoFocus={autoFocus} />
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function ErrorBanner({ mensaje }: { mensaje: string }) {
  return (
    <div className="flex items-center gap-2 bg-red-50 text-red-700 rounded-lg px-4 py-3 text-sm">
      <AlertTriangle className="w-4 h-4 flex-shrink-0" />{mensaje}
    </div>
  );
}