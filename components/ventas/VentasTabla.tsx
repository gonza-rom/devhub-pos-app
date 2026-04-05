"use client";
// components/ventas/VentasTabla.tsx

import { useState } from "react";
import { ChevronDown, ChevronUp, Package, Receipt, Ban, AlertTriangle, X, CreditCard } from "lucide-react";
import { formatPrecio } from "@/lib/utils";
import { fmtFecha24HoraAR } from "@/lib/dateAR";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";

type ItemVenta = {
  id:         string;
  nombre:     string;
  cantidad:   number;
  precioUnit: number;
  subtotal:   number;
  talle?:     string | null;
  color?:     string | null;
  producto:   { id: string; imagen: string | null } | null;
};

type Venta = {
  id:                string;
  total:             number;
  subtotal:          number | null;
  descuento:         number | null;
  metodoPago:        string;
  clienteNombre:     string | null;
  clienteDni:        string | null;
  observaciones:     string | null;
  usuarioNombre:     string | null;
  createdAt:         Date | string;
  cancelado:         boolean;
  motivoCancelacion: string | null;
  items:             ItemVenta[];
};

type Props = { ventas: Venta[] };

const METODOS_PAGO = ["EFECTIVO", "DEBITO", "CREDITO", "TRANSFERENCIA", "QR", "MERCADOPAGO"];

const METODO_LABEL: Record<string, string> = {
  EFECTIVO:      "Efectivo",
  DEBITO:        "Débito",
  CREDITO:       "Crédito",
  TRANSFERENCIA: "Transferencia",
  QR:            "QR",
  MERCADOPAGO:   "MercadoPago",
};

const METODO_COLOR: Record<string, string> = {
  EFECTIVO:      "rgba(34,197,94,0.15)",
  DEBITO:        "rgba(59,130,246,0.15)",
  CREDITO:       "rgba(168,85,247,0.15)",
  TRANSFERENCIA: "rgba(251,191,36,0.15)",
  QR:            "rgba(20,184,166,0.15)",
  MERCADOPAGO:   "rgba(59,130,246,0.15)",
};

const METODO_TEXT: Record<string, string> = {
  EFECTIVO:      "#22c55e",
  DEBITO:        "#60a5fa",
  CREDITO:       "#c084fc",
  TRANSFERENCIA: "#fbbf24",
  QR:            "#2dd4bf",
  MERCADOPAGO:   "#60a5fa",
};

export default function VentasTabla({ ventas }: Props) {
  const router = useRouter();
  const toast  = useToast();

  const [expandido,         setExpandido]         = useState<string | null>(null);

  // — Cancelar —
  const [modalCancelar,     setModalCancelar]     = useState<Venta | null>(null);
  const [motivoCancelacion, setMotivoCancelacion] = useState("");
  const [cancelando,        setCancelando]        = useState(false);

  // — Cambiar método de pago —
  const [modalMetodoPago,   setModalMetodoPago]   = useState<Venta | null>(null);
  const [nuevoMetodo,       setNuevoMetodo]       = useState("");
  const [cambiandoMetodo,   setCambiandoMetodo]   = useState(false);

  function toggle(id: string) {
    setExpandido((prev) => (prev === id ? null : id));
  }

  // ── Cancelar venta ────────────────────────────────────────────────────
  async function confirmarCancelacion() {
    if (!modalCancelar) return;
    setCancelando(true);
    const toastId = toast.loading("Cancelando venta...");
    try {
      const res  = await fetch(`/api/ventas/${modalCancelar.id}/cancelar`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ motivoCancelacion: motivoCancelacion || "Cancelado por administrador" }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.update(toastId, { type: "error", title: "Error al cancelar", description: data.error ?? "Intentá de nuevo" });
        return;
      }
      toast.update(toastId, {
        type:        "success",
        title:       "Venta cancelada",
        description: `Stock restaurado · ${formatPrecio(modalCancelar.total)}`,
      });
      setModalCancelar(null);
      setMotivoCancelacion("");
      router.refresh();
    } catch {
      toast.update(toastId, { type: "error", title: "Error de conexión" });
    } finally {
      setCancelando(false);
    }
  }

  // ── Cambiar método de pago ────────────────────────────────────────────
  function abrirModalMetodo(venta: Venta, e: React.MouseEvent) {
    e.stopPropagation();
    setNuevoMetodo(venta.metodoPago); // pre-seleccionar el actual
    setModalMetodoPago(venta);
  }

  async function confirmarCambioMetodo() {
    if (!modalMetodoPago || !nuevoMetodo) return;
    if (nuevoMetodo === modalMetodoPago.metodoPago) {
      const toastId = toast.loading("Sin cambios");
      toast.update(toastId, { type: "warning", title: "Sin cambios", description: "El método de pago ya es el mismo" });
      return;
    }

    // ✅ Guardar ANTES del fetch, porque el modal se cierra y pierde la referencia
    const metodoAnterior = modalMetodoPago.metodoPago;
    const metodoNuevoLabel = METODO_LABEL[nuevoMetodo] ?? nuevoMetodo;

    setCambiandoMetodo(true);
    const toastId = toast.loading("Actualizando método de pago...");
    try {
      const res  = await fetch(`/api/ventas/${modalMetodoPago.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ metodoPago: nuevoMetodo }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.update(toastId, { type: "error", title: "Error al actualizar", description: data.error ?? "Intentá de nuevo" });
        return;
      }
      toast.update(toastId, {
        type:        data.cajaYaCerrada ? "warning" : "success",
        title:       "Método de pago actualizado",
        description: data.cajaYaCerrada
          ? `${METODO_LABEL[metodoAnterior]} → ${metodoNuevoLabel} · La caja ya estaba cerrada, no se modificó`
          : `${METODO_LABEL[metodoAnterior]} → ${metodoNuevoLabel}`,
      });
      setModalMetodoPago(null);
      router.refresh();
    } catch {
      toast.update(toastId, { type: "error", title: "Error de conexión" });
    } finally {
      setCambiandoMetodo(false);
    }
  }

  return (
    <>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ borderBottom: "1px solid var(--border-base)" }}>
              <tr>
                {["Fecha", "Cliente", "Método", "Items", "Estado", "Total", ""].map((h, i) => (
                  <th
                    key={i}
                    className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider
                      ${h === "Total" ? "text-right" : h === "Items" || h === "Estado" ? "text-center" : "text-left"}`}
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ventas.map((venta) => {
                const abierto = expandido === venta.id;
                const filas = [
                  <tr
                    key={venta.id}
                    className={`table-row cursor-pointer ${venta.cancelado ? "opacity-60" : ""}`}
                    onClick={() => toggle(venta.id)}
                  >
                    {/* Fecha */}
                    <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>
                      <div className="flex items-center gap-2">
                        <Receipt className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--text-faint)" }} />
                        <span className="whitespace-nowrap">
                          {fmtFecha24HoraAR(
                            typeof venta.createdAt === "string"
                              ? venta.createdAt
                              : venta.createdAt.toISOString()
                          )}
                        </span>
                      </div>
                      {venta.usuarioNombre && (
                        <p className="text-xs mt-0.5 pl-5" style={{ color: "var(--text-faint)" }}>
                          {venta.usuarioNombre}
                        </p>
                      )}
                    </td>

                    {/* Cliente */}
                    <td className="px-4 py-3">
                      {venta.clienteNombre ? (
                        <div>
                          <p className="font-medium" style={{ color: "var(--text-primary)" }}>
                            {venta.clienteNombre}
                          </p>
                          {venta.clienteDni && (
                            <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                              DNI {venta.clienteDni}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: "var(--text-faint)" }}>—</span>
                      )}
                    </td>

                    {/* Método */}
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{
                          background: METODO_COLOR[venta.metodoPago] ?? "rgba(150,150,150,0.12)",
                          color:      METODO_TEXT[venta.metodoPago]  ?? "var(--text-muted)",
                        }}
                      >
                        {METODO_LABEL[venta.metodoPago] ?? venta.metodoPago}
                      </span>
                    </td>

                    {/* Cantidad items */}
                    <td className="px-4 py-3 text-center" style={{ color: "var(--text-primary)" }}>
                      {venta.items.length} {venta.items.length === 1 ? "item" : "items"}
                    </td>

                    {/* Estado */}
                    <td className="px-4 py-3 text-center">
                      {venta.cancelado ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
                          <Ban className="h-3 w-3" /> Cancelada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                          ✓ Activa
                        </span>
                      )}
                    </td>

                    {/* Total */}
                    <td className="px-4 py-3 text-right">
                      <p className={`font-bold ${venta.cancelado ? "line-through" : ""}`} style={{ color: "var(--text-primary)" }}>
                        {formatPrecio(venta.total)}
                      </p>
                      {(venta.descuento ?? 0) > 0 && (
                        <p className="text-xs" style={{ color: "#f87171" }}>
                          -{formatPrecio(venta.descuento!)}
                        </p>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {!venta.cancelado && (
                          <>
                            {/* ── Cambiar método de pago ── */}
                            <button
                              onClick={(e) => abrirModalMetodo(venta, e)}
                              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors"
                              style={{
                                color:  "#60a5fa",
                                border: "1px solid rgba(96,165,250,0.3)",
                              }}
                              title="Cambiar método de pago"
                            >
                              <CreditCard className="h-3 w-3" />
                              <span className="hidden sm:inline">Pago</span>
                            </button>

                            {/* ── Cancelar ── */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setModalCancelar(venta);
                                setMotivoCancelacion("");
                              }}
                              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              style={{ border: "1px solid rgba(220,38,38,0.3)" }}
                            >
                              <Ban className="h-3 w-3" />
                              <span className="hidden sm:inline">Cancelar</span>
                            </button>
                          </>
                        )}
                        <button
                          className="flex items-center justify-center h-7 w-7 rounded-lg transition-colors"
                          style={{
                            background: abierto ? "rgba(220,38,38,0.1)" : "var(--bg-hover)",
                            color:      abierto ? "#f87171" : "var(--text-faint)",
                          }}
                          onClick={(e) => { e.stopPropagation(); toggle(venta.id); }}
                        >
                          {abierto ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>,
                ];

                if (abierto) {
                  filas.push(
                    <tr key={`${venta.id}-detalle`}>
                      <td colSpan={7} className="px-4 pb-4 pt-0">
                        <div
                          className="rounded-xl overflow-hidden"
                          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-base)" }}
                        >
                          {venta.cancelado && venta.motivoCancelacion && (
                            <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
                              <p className="text-xs text-red-600 dark:text-red-400">
                                <strong>Motivo cancelación:</strong> {venta.motivoCancelacion}
                              </p>
                            </div>
                          )}
                          <table className="w-full text-xs">
                            <thead>
                              <tr style={{ borderBottom: "1px solid var(--border-base)" }}>
                                {["Producto", "Precio unit.", "Cantidad", "Subtotal"].map((h, i) => (
                                  <th
                                    key={i}
                                    className={`px-4 py-2 font-semibold uppercase tracking-wider ${i > 0 ? "text-right" : "text-left"}`}
                                    style={{ color: "var(--text-primary)" }}
                                  >
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {venta.items.map((item) => (
                                <tr key={item.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                                  <td className="px-4 py-2.5">
                                    <div className="flex items-center gap-2 text-sm">
                                      {item.producto?.imagen ? (
                                        <img
                                          src={item.producto.imagen.replace("/upload/", "/upload/f_auto,q_auto,w_200/")}
                                          alt={item.nombre}
                                          loading="lazy"
                                          className="h-7 w-7 rounded-md object-cover flex-shrink-0"
                                          style={{ border: "1px solid var(--border-base)" }}
                                        />
                                      ) : (
                                        <div
                                          className="h-7 w-7 rounded-md flex items-center justify-center flex-shrink-0"
                                          style={{ background: "var(--bg-hover)", border: "1px solid var(--border-base)" }}
                                        >
                                          <Package className="h-3.5 w-3.5" style={{ color: "var(--text-faint)" }} />
                                        </div>
                                      )}
                                      <div>
                                        <span style={{ color: "var(--text-primary)" }}>{item.nombre}</span>
                                        {(item.talle || item.color) && (
                                          <div className="flex gap-1 mt-0.5">
                                            {item.talle && (
                                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                                                style={{ background: "rgba(168,85,247,0.15)", color: "#c084fc", border: "1px solid rgba(168,85,247,0.3)" }}>
                                                {item.talle}
                                              </span>
                                            )}
                                            {item.color && (
                                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                                                style={{ background: "rgba(168,85,247,0.15)", color: "#c084fc", border: "1px solid rgba(168,85,247,0.3)" }}>
                                                {item.color}
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-2.5 text-right text-base" style={{ color: "var(--text-secondary)" }}>
                                    {formatPrecio(item.precioUnit)}
                                  </td>
                                  <td className="px-4 py-2.5 text-right text-sm" style={{ color: "var(--text-secondary)" }}>
                                    x{item.cantidad}
                                  </td>
                                  <td className="px-4 py-2.5 text-right font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                                    {formatPrecio(item.subtotal)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>

                          <div
                            className="flex items-center justify-between px-4 py-3"
                            style={{ borderTop: "1px solid var(--border-base)" }}
                          >
                            <div>
                              {venta.observaciones && (
                                <p className="text-xs italic" style={{ color: "var(--text-faint)" }}>
                                  "{venta.observaciones}"
                                </p>
                              )}
                            </div>
                            <div className="text-right space-y-0.5">
                              {(venta.descuento ?? 0) > 0 && (
                                <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                                  Subtotal: {formatPrecio(venta.subtotal ?? venta.total)}
                                  {" · "}Descuento:{" "}
                                  <span style={{ color: "#f87171" }}>-{formatPrecio(venta.descuento!)}</span>
                                </p>
                              )}
                              <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                                Total: {formatPrecio(venta.total)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return filas;
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal: Cambiar método de pago ─────────────────────────────────── */}
      {modalMetodoPago && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !cambiandoMetodo && setModalMetodoPago(null)}
          />
          <div
            className="relative z-10 w-full max-w-md rounded-2xl shadow-xl p-6 space-y-4"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-base)" }}
          >
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full flex-shrink-0" style={{ background: "rgba(96,165,250,0.12)" }}>
                <CreditCard className="h-6 w-6" style={{ color: "#60a5fa" }} />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                  Cambiar método de pago
                </h2>
                <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
                  Si hay una caja abierta, el movimiento se actualizará automáticamente.
                </p>
              </div>
              <button onClick={() => setModalMetodoPago(null)} style={{ color: "var(--text-muted)" }}>
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Resumen de la venta */}
            <div
              className="rounded-xl p-4 text-sm space-y-1"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border-base)" }}
            >
              <p className="font-medium" style={{ color: "var(--text-primary)" }}>
                Venta #{modalMetodoPago.id.slice(0, 8).toUpperCase()}
              </p>
              <p style={{ color: "var(--text-muted)" }}>
                {fmtFecha24HoraAR(
                  typeof modalMetodoPago.createdAt === "string"
                    ? modalMetodoPago.createdAt
                    : modalMetodoPago.createdAt.toISOString()
                )}
              </p>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs" style={{ color: "var(--text-faint)" }}>Método actual:</span>
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
                  style={{
                    background: METODO_COLOR[modalMetodoPago.metodoPago] ?? "rgba(150,150,150,0.12)",
                    color:      METODO_TEXT[modalMetodoPago.metodoPago]  ?? "var(--text-muted)",
                  }}
                >
                  {METODO_LABEL[modalMetodoPago.metodoPago] ?? modalMetodoPago.metodoPago}
                </span>
              </div>
              <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                {formatPrecio(modalMetodoPago.total)}
              </p>
            </div>

            {/* Select nuevo método */}
            <div>
              <label className="text-xs font-medium block mb-2" style={{ color: "var(--text-muted)" }}>
                Nuevo método de pago
              </label>
              <div className="grid grid-cols-3 gap-2">
                {METODOS_PAGO.map((metodo) => {
                  const seleccionado = nuevoMetodo === metodo;
                  return (
                    <button
                      key={metodo}
                      onClick={() => setNuevoMetodo(metodo)}
                      disabled={cambiandoMetodo}
                      className="rounded-xl py-2.5 px-3 text-xs font-semibold transition-all disabled:opacity-50"
                      style={{
                        background: seleccionado
                          ? (METODO_COLOR[metodo] ?? "rgba(96,165,250,0.15)")
                          : "var(--bg-surface)",
                        color: seleccionado
                          ? (METODO_TEXT[metodo] ?? "#60a5fa")
                          : "var(--text-secondary)",
                        border: seleccionado
                          ? `1.5px solid ${METODO_TEXT[metodo] ?? "#60a5fa"}`
                          : "1px solid var(--border-base)",
                      }}
                    >
                      {METODO_LABEL[metodo]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={confirmarCambioMetodo}
                disabled={cambiandoMetodo || nuevoMetodo === modalMetodoPago.metodoPago}
                className="flex-1 rounded-xl py-2.5 text-sm font-bold transition-colors disabled:opacity-40"
                style={{ background: "#2563eb", color: "#fff" }}
              >
                {cambiandoMetodo ? "Actualizando..." : "Confirmar cambio"}
              </button>
              <button
                onClick={() => setModalMetodoPago(null)}
                disabled={cambiandoMetodo}
                className="flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
                style={{
                  background: "var(--bg-hover)",
                  color:      "var(--text-secondary)",
                  border:     "1px solid var(--border-base)",
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Cancelar venta ─────────────────────────────────────────── */}
      {modalCancelar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !cancelando && setModalCancelar(null)}
          />
          <div
            className="relative z-10 w-full max-w-md rounded-2xl shadow-xl p-6 space-y-4"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-base)" }}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full flex-shrink-0" style={{ background: "rgba(220,38,38,0.12)" }}>
                <AlertTriangle className="h-6 w-6" style={{ color: "#f87171" }} />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Cancelar venta</h2>
                <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
                  Esto restaurará el stock de todos los productos vendidos.
                </p>
              </div>
              <button onClick={() => setModalCancelar(null)} style={{ color: "var(--text-muted)" }}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-xl p-4 text-sm space-y-1" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-base)" }}>
              <p className="font-medium" style={{ color: "var(--text-primary)" }}>
                Venta #{modalCancelar.id.slice(0, 8).toUpperCase()}
              </p>
              <p style={{ color: "var(--text-muted)" }}>
                {fmtFecha24HoraAR(
                  typeof modalCancelar.createdAt === "string"
                    ? modalCancelar.createdAt
                    : modalCancelar.createdAt.toISOString()
                )}
              </p>
              <p className="text-lg font-bold text-red-400">
                {formatPrecio(modalCancelar.total)}
              </p>
              <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                {modalCancelar.items.length} {modalCancelar.items.length === 1 ? "producto" : "productos"}
              </p>
            </div>

            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>
                Motivo de cancelación (opcional)
              </label>
              <input
                type="text"
                value={motivoCancelacion}
                onChange={(e) => setMotivoCancelacion(e.target.value)}
                placeholder="Ej: Error en el registro, devolución del cliente..."
                className="input-base w-full"
                disabled={cancelando}
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={confirmarCancelacion}
                disabled={cancelando}
                className="flex-1 rounded-xl py-2.5 text-sm font-bold transition-colors disabled:opacity-50"
                style={{ background: "#DC2626", color: "#fff" }}
              >
                {cancelando ? "Cancelando..." : "Sí, cancelar venta"}
              </button>
              <button
                onClick={() => setModalCancelar(null)}
                disabled={cancelando}
                className="flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
                style={{ background: "var(--bg-hover)", color: "var(--text-secondary)", border: "1px solid var(--border-base)" }}
              >
                No, volver
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}