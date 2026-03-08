"use client";
// components/ventas/VentasTabla.tsx

import { useState } from "react";
import { ChevronDown, ChevronUp, Package, Receipt } from "lucide-react";
import { formatPrecio } from "@/lib/utils";

type ItemVenta = {
  id:         string;
  nombre:     string;
  cantidad:   number;
  precioUnit: number;
  subtotal:   number;
  producto:   { id: string; imagen: string | null } | null;
};

type Venta = {
  id:            string;
  total:         number;
  subtotal:      number | null;
  descuento:     number | null;
  metodoPago:    string;
  clienteNombre: string | null;
  clienteDni:    string | null;
  observaciones: string | null;
  usuarioNombre: string | null;
  createdAt:     Date | string;
  items:         ItemVenta[];
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
  const [expandido, setExpandido] = useState<string | null>(null);

  function toggle(id: string) {
    setExpandido((prev) => (prev === id ? null : id));
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead style={{ borderBottom: "1px solid var(--border-base)" }}>
            <tr>
              {["Fecha", "Cliente", "Método", "Items", "Total", ""].map((h, i) => (
                <th
                  key={i}
                  className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider
                    ${h === "Total" ? "text-right" : h === "Items" ? "text-center" : "text-left"}`}
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
              // ✅ Array de filas con key en cada <tr>, sin <>
              const filas = [
                <tr
                  key={venta.id}
                  className="table-row cursor-pointer"
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

                  {/* Total */}
                  <td className="px-4 py-3 text-right">
                    <p className="font-bold" style={{ color: "var(--text-primary)" }}>
                      {formatPrecio(venta.total)}
                    </p>
                    {(venta.descuento ?? 0) > 0 && (
                      <p className="text-xs" style={{ color: "#f87171" }}>
                        -{formatPrecio(venta.descuento!)}
                      </p>
                    )}
                  </td>

                  {/* Toggle */}
                  <td className="px-4 py-3">
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
                  </td>
                </tr>,
              ];

              // ✅ Fila de detalle con key propia
              if (abierto) {
                filas.push(
                  <tr key={`${venta.id}-detalle`}>
                    <td colSpan={6} className="px-4 pb-4 pt-0">
                      <div
                        className="rounded-xl overflow-hidden"
                        style={{
                          background: "var(--bg-surface)",
                          border:     "1px solid var(--border-base)",
                        }}
                      >
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
  );
}