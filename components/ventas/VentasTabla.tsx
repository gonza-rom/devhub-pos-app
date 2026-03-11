"use client";
// components/ventas/VentasTabla.tsx

import { useState } from "react";
import { ChevronDown, ChevronUp, Package, Receipt, Ban, AlertTriangle, X } from "lucide-react";
import { formatPrecio } from "@/lib/utils";
import { useRouter } from "next/navigation";

type ItemVenta = {
  id:         string;
  nombre:     string;
  cantidad:   number;
  precioUnit: number;
  subtotal:   number;
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

function formatFecha(fecha: Date | string) {
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

export default function VentasTabla({ ventas }: Props) {
  const router = useRouter();
  const [expandido, setExpandido] = useState<string | null>(null);
  const [modalCancelar, setModalCancelar] = useState<Venta | null>(null);
  const [motivoCancelacion, setMotivoCancelacion] = useState("");
  const [cancelando, setCancelando] = useState(false);
  const [error, setError] = useState("");

  function toggle(id: string) {
    setExpandido((prev) => (prev === id ? null : id));
  }

  async function confirmarCancelacion() {
    if (!modalCancelar) return;
    
    setCancelando(true);
    setError("");
    
    try {
      const res = await fetch(`/api/ventas/${modalCancelar.id}/cancelar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          motivoCancelacion: motivoCancelacion || "Cancelado por administrador",
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        setError(data.error ?? "Error al cancelar venta");
        return;
      }

      // Cerrar modal y refrescar
      setModalCancelar(null);
      setMotivoCancelacion("");
      router.refresh();
    } catch (err) {
      setError("Error de conexión");
    } finally {
      setCancelando(false);
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
                      ${h === "Total" ? "text-right" : h === "Items" ? "text-center" : h === "Estado" ? "text-center" : "text-left"}`}
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
                        <span className="whitespace-nowrap">{formatFecha(venta.createdAt)}</span>
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
                    <td className="px-4 py-3 text-center" style={{ color: "var(--text-muted)" }}>
                      {venta.items.length} {venta.items.length === 1 ? "item" : "items"}
                    </td>

                    {/* Estado */}
                    <td className="px-4 py-3 text-center">
                      {venta.cancelado ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
                          <Ban className="h-3 w-3" />
                          Cancelada
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

                    {/* Toggle + Botón cancelar */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {!venta.cancelado && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setModalCancelar(venta);
                              setMotivoCancelacion("");
                              setError("");
                            }}
                            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            style={{ border: "1px solid rgba(220,38,38,0.3)" }}
                          >
                            <Ban className="h-3 w-3" />
                            Cancelar
                          </button>
                        )}
                        <button
                          className="flex items-center justify-center h-7 w-7 rounded-lg transition-colors"
                          style={{
                            background: abierto ? "rgba(220,38,38,0.1)" : "var(--bg-hover)",
                            color:      abierto ? "#f87171" : "var(--text-faint)",
                          }}
                          onClick={(e) => { e.stopPropagation(); toggle(venta.id); }}
                        >
                          {abierto
                            ? <ChevronUp className="h-3.5 w-3.5" />
                            : <ChevronDown className="h-3.5 w-3.5" />
                          }
                        </button>
                      </div>
                    </td>
                  </tr>,
                ];

                // Fila de detalle
                if (abierto) {
                  filas.push(
                    <tr key={`${venta.id}-detalle`}>
                      <td colSpan={7} className="px-4 pb-4 pt-0">
                        <div
                          className="rounded-xl overflow-hidden"
                          style={{
                            background: "var(--bg-surface)",
                            border:     "1px solid var(--border-base)",
                          }}
                        >
                          {/* Motivo cancelación si existe */}
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
                                    style={{ color: "var(--text-faint)" }}
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
                                    <div className="flex items-center gap-2">
                                      {item.producto?.imagen ? (
                                        <img
                                          src={item.producto.imagen?.replace('/upload/', '/upload/f_auto,q_auto,w_200/')}
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
                                      <span style={{ color: "var(--text-primary)" }}>{item.nombre}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-2.5 text-right" style={{ color: "var(--text-secondary)" }}>
                                    {formatPrecio(item.precioUnit)}
                                  </td>
                                  <td className="px-4 py-2.5 text-right" style={{ color: "var(--text-secondary)" }}>
                                    x{item.cantidad}
                                  </td>
                                  <td className="px-4 py-2.5 text-right font-semibold" style={{ color: "var(--text-primary)" }}>
                                    {formatPrecio(item.subtotal)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>

                          {/* Footer detalle */}
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
                                  {" · "}
                                  Descuento:{" "}
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

      {/* Modal cancelar venta */}
      {modalCancelar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !cancelando && setModalCancelar(null)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 shadow-xl p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-full flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Cancelar Venta</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Esto restaurará el stock de todos los productos vendidos.
                </p>
              </div>
              <button onClick={() => setModalCancelar(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-4 text-sm space-y-1">
              <p className="font-medium text-gray-900 dark:text-gray-100">
                Venta #{modalCancelar.id.slice(0, 8)}
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                {formatFecha(modalCancelar.createdAt)}
              </p>
              <p className="text-lg font-bold text-red-600 dark:text-red-400">
                {formatPrecio(modalCancelar.total)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {modalCancelar.items.length} {modalCancelar.items.length === 1 ? "producto" : "productos"}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Motivo de cancelación (opcional)
              </label>
              <input
                type="text"
                value={motivoCancelacion}
                onChange={(e) => setMotivoCancelacion(e.target.value)}
                placeholder="Ej: Error en el registro, devolución del cliente..."
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            {error && (
              <p className="mb-3 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={confirmarCancelacion}
                disabled={cancelando}
                className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white py-2.5 text-sm font-bold transition-colors"
              >
                {cancelando ? "Cancelando..." : "Sí, cancelar venta"}
              </button>
              <button
                onClick={() => setModalCancelar(null)}
                className="flex-1 rounded-xl bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 py-2.5 text-sm transition-colors"
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