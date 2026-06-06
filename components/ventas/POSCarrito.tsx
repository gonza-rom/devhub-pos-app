"use client";
// components/ventas/POSCarrito.tsx

import { ShoppingCart, Plus, Minus, Trash2, CreditCard, Banknote, Smartphone, QrCode, ChevronRight, CheckCircle2, AlertCircle, ChevronDown } from "lucide-react";
import { formatPrecio } from "@/lib/utils";
import { fechaHoyAR, horaAhoraAR } from "@/lib/dateAR";

export type ItemCarrito = {
  productoId: string;
  carritoKey: string;
  nombre: string;
  precio: number;
  cantidad: number;
  subtotal: number;
  stock: number;
  imagen?: string | null;
  varianteId?: string;
  talle?: string | null;
  color?: string | null;
};

type MetodoPago = "efectivo" | "debito" | "credito" | "transferencia" | "qr";

const METODOS_PAGO: { value: MetodoPago; label: string; icono: React.ElementType }[] = [
  { value: "efectivo",      label: "Efectivo", icono: Banknote },
  { value: "debito",        label: "Débito",   icono: CreditCard },
  { value: "credito",       label: "Crédito",  icono: CreditCard },
  { value: "transferencia", label: "Transfer", icono: Smartphone },
  { value: "qr",            label: "QR / MP",  icono: QrCode },
];

type Usuario = { id: string; nombre: string; supabaseId: string; activo: boolean };

type Props = {
  carrito: ItemCarrito[];
  onCambiarCantidad: (carritoKey: string, delta: number) => void;
  onEliminar: (carritoKey: string) => void;
  onLimpiar: () => void;
  subtotal: number;
  total: number;
  descuento: number;
  descuentoPct: number;
  recargo: number;
  recargoPct: number;
  vuelto: number;
  onDescuento: (monto: number) => void;
  onDescuentoPct: (pct: number) => void;
  onRecargo: (monto: number) => void;
  onRecargoPct: (pct: number) => void;
  metodoPago: MetodoPago;
  onMetodoPago: (mp: MetodoPago) => void;
  efectivoRecibido: string;
  onEfectivoRecibido: (v: string) => void;
  clienteNombre: string;
  onClienteNombre: (v: string) => void;
  usuarios: Usuario[];
  vendedorId: string;
  onVendedorId: (v: string) => void;
  imprimirTicket: boolean;
  onImprimirTicket: (v: boolean) => void;
  generarFactura: boolean;
  onGenerarFactura: (v: boolean) => void;
  fechaManual: boolean;
  onFechaManual: (v: boolean) => void;
  fechaVenta: string;
  onFechaVenta: (v: string) => void;
  opcionesAbiertas: boolean;
  onOpcionesAbiertas: (v: boolean) => void;
  itemManualNombre: string;
  itemManualPrecio: string;
  onItemManualNombre: (v: string) => void;
  onItemManualPrecio: (v: string) => void;
  onAgregarItemManual: () => void;
  cargando: boolean;
  resultado: "exito" | "error" | null;
  mensajeError: string;
  onVenta: () => void;
  // Colapso
  colapsado: boolean;
  onToggleColapso: () => void;
};

export default function POSCarrito({
  carrito, onCambiarCantidad, onEliminar, onLimpiar,
  subtotal, total, descuento, descuentoPct, recargo, recargoPct, vuelto,
  onDescuento, onDescuentoPct, onRecargo, onRecargoPct,
  metodoPago, onMetodoPago, efectivoRecibido, onEfectivoRecibido,
  clienteNombre, onClienteNombre,
  usuarios, vendedorId, onVendedorId,
  imprimirTicket, onImprimirTicket,
  generarFactura, onGenerarFactura,
  fechaManual, onFechaManual, fechaVenta, onFechaVenta,
  opcionesAbiertas, onOpcionesAbiertas,
  itemManualNombre, itemManualPrecio, onItemManualNombre, onItemManualPrecio, onAgregarItemManual,
  cargando, resultado, mensajeError, onVenta,
  colapsado, onToggleColapso,
}: Props) {

  const cantidadTotal = carrito.reduce((a, i) => a + i.cantidad, 0);

  // ── Vista colapsada ─────────────────────────────────────────────────────────
  if (colapsado) {
    return (
      <div className="flex flex-col h-full items-center py-4 gap-4"
        style={{ background: "var(--bg-surface)", borderLeft: "1px solid var(--border-base)", width: "48px" }}>
        {/* Botón para expandir */}
        <button
          onClick={onToggleColapso}
          className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
          style={{ background: "var(--bg-hover-md)", color: "var(--text-muted)", border: "1px solid var(--border-md)" }}
          title="Mostrar carrito"
        >
          <ChevronRight className="h-4 w-4 rotate-180" />
        </button>

        {/* Badge cantidad */}
        {cantidadTotal > 0 && (
          <button onClick={onToggleColapso} className="flex flex-col items-center gap-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ background: "#DC2626" }}>
              {cantidadTotal > 9 ? "9+" : cantidadTotal}
            </div>
            <span className="text-[10px] font-semibold" style={{ color: "var(--text-muted)", writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
              {formatPrecio(total)}
            </span>
          </button>
        )}

        {/* Ícono carrito */}
        {cantidadTotal === 0 && (
          <ShoppingCart className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
        )}
      </div>
    );
  }

  // ── Vista expandida ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg-surface)" }}>

      {/* Header desktop */}
      <div className="hidden md:flex flex-col border-b flex-shrink-0" style={{ borderColor: "var(--border-base)" }}>
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
            <span className="font-semibold" style={{ color: "var(--text-primary)" }}>Carrito</span>
            {cantidadTotal > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold"
                style={{ background: "rgba(220,38,38,0.8)", color: "#ffffff" }}>
                {cantidadTotal}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {carrito.length > 0 && (
              <button onClick={onLimpiar} className="text-xs transition-colors" style={{ color: "var(--text-muted)" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#f87171")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-muted)")}>
                Limpiar
              </button>
            )}
            {/* Botón colapsar */}
            <button
              onClick={onToggleColapso}
              className="flex h-6 w-6 items-center justify-center rounded-md transition-colors"
              style={{ background: "var(--bg-hover-md)", color: "var(--text-muted)", border: "1px solid var(--border-md)" }}
              title="Ocultar carrito"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Ítem manual */}
        <div className="flex items-center gap-1.5 px-3 pb-2">
          <input type="text" value={itemManualNombre} onChange={e => onItemManualNombre(e.target.value)}
            placeholder="Ítem manual..." className="input-base text-xs flex-1 min-w-0" style={{ padding: "4px 8px" }} />
          <input type="number" value={itemManualPrecio} onChange={e => onItemManualPrecio(e.target.value)}
            placeholder="$" className="input-base text-xs" style={{ width: "64px", padding: "4px 8px" }}
            onWheel={(e) => e.currentTarget.blur()} />
          <button onClick={onAgregarItemManual}
            className="flex h-7 w-7 items-center justify-center rounded-lg font-bold flex-shrink-0"
            style={{ background: "#DC2626", color: "#fff" }}>
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {carrito.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-16 text-center px-6">
            <div className="h-16 w-16 rounded-full flex items-center justify-center mb-4" style={{ background: "var(--bg-hover)" }}>
              <ShoppingCart className="h-7 w-7" style={{ color: "var(--text-muted)" }} />
            </div>
            <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>El carrito está vacío</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-faint)" }}>
              <span className="md:hidden">Tocá "Catálogo" para agregar productos</span>
              <span className="hidden md:inline">Tocá un producto para agregarlo</span>
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
            {carrito.map((item) => (
              <div key={item.carritoKey} className="flex items-center gap-2 px-2 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{item.nombre}</p>
                  <p className="text-xs" style={{ color: "var(--text-faint)" }}>{formatPrecio(item.precio)} c/u</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => onCambiarCantidad(item.carritoKey, -1)}
                    className="flex h-6 w-6 items-center justify-center rounded-md transition-colors"
                    style={{ border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-primary)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-secondary)")}>
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-6 text-center text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{item.cantidad}</span>
                  <button onClick={() => onCambiarCantidad(item.carritoKey, 1)} disabled={item.cantidad >= item.stock}
                    className="flex h-6 w-6 items-center justify-center rounded-md transition-colors disabled:opacity-30"
                    style={{ border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}
                    onMouseEnter={(e) => { if (!e.currentTarget.disabled) (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-secondary)")}>
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold w-16 md:w-20 text-right" style={{ color: "var(--text-primary)" }}>
                    {formatPrecio(item.subtotal)}
                  </span>
                  <button onClick={() => onEliminar(item.carritoKey)} style={{ color: "var(--text-muted)" }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#f87171")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-muted)")}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {carrito.length > 0 && (
        <div className="border-t p-3 space-y-3 flex-shrink-0" style={{ borderColor: "var(--border-base)" }}>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium whitespace-nowrap" style={{ color: "var(--text-muted)" }}>Descuento %</label>
              <input type="number" min="0" max="100" value={descuentoPct || ""} placeholder="0"
                className="input-base text-sm" style={{ width: "70px" }}
                onChange={(e) => onDescuentoPct(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                onWheel={(e) => e.currentTarget.blur()} />
              <label className="text-xs font-medium whitespace-nowrap" style={{ color: "var(--text-muted)" }}>$</label>
              <input type="number" min="0" max={subtotal} value={descuento || ""} placeholder="0"
                className="input-base text-sm" style={{ width: "90px" }}
                onChange={(e) => onDescuento(Math.max(0, parseFloat(e.target.value) || 0))}
                onWheel={(e) => e.currentTarget.blur()} />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium whitespace-nowrap" style={{ color: "var(--text-muted)" }}>Recargo %</label>
              <input type="number" min="0" max="100" value={recargoPct || ""} placeholder="0"
                className="input-base text-sm" style={{ width: "70px" }}
                onChange={(e) => onRecargoPct(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                onWheel={(e) => e.currentTarget.blur()} />
              <label className="text-xs font-medium whitespace-nowrap" style={{ color: "var(--text-muted)" }}>$</label>
              <input type="number" min="0" value={recargo || ""} placeholder="0"
                className="input-base text-sm" style={{ width: "90px" }}
                onChange={(e) => onRecargo(Math.max(0, parseFloat(e.target.value) || 0))}
                onWheel={(e) => e.currentTarget.blur()} />
            </div>
          </div>

          <div className="grid grid-cols-5 gap-1">
            {METODOS_PAGO.map((mp) => {
              const Icon   = mp.icono;
              const activo = metodoPago === mp.value;
              return (
                <button key={mp.value} onClick={() => onMetodoPago(mp.value)}
                  className="flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-center transition-colors"
                  style={{
                    background: activo ? "rgba(220,38,38,0.15)" : "var(--bg-hover)",
                    border:     activo ? "1px solid rgba(220,38,38,0.4)" : "1px solid var(--border-base)",
                    color:      activo ? "#f87171" : "var(--text-muted)",
                  }}>
                  <Icon className="h-4 w-4" />
                  <span className="text-[10px] font-medium leading-tight">{mp.label}</span>
                </button>
              );
            })}
          </div>

          {metodoPago === "efectivo" && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium whitespace-nowrap" style={{ color: "var(--text-muted)" }}>Recibido $</label>
              <input type="number" min={total} value={efectivoRecibido} placeholder={String(total)}
                className="input-base flex-1" onChange={(e) => onEfectivoRecibido(e.target.value)}
                onWheel={(e) => e.currentTarget.blur()} />
            </div>
          )}

          <div className="space-y-1 pt-1 border-t" style={{ borderColor: "var(--border-base)" }}>
            {(descuento > 0 || recargo > 0) && (
              <>
                <div className="flex justify-between text-xs" style={{ color: "var(--text-faint)" }}>
                  <span>Subtotal</span><span>{formatPrecio(subtotal)}</span>
                </div>
                {recargo > 0 && (
                  <div className="flex justify-between text-xs text-orange-400">
                    <span>Recargo</span><span>+ {formatPrecio(recargo)}</span>
                  </div>
                )}
                {descuento > 0 && (
                  <div className="flex justify-between text-xs text-green-400">
                    <span>Descuento</span><span>- {formatPrecio(descuento)}</span>
                  </div>
                )}
              </>
            )}
            <div className="flex justify-between font-bold text-base" style={{ color: "var(--text-primary)" }}>
              <span>Total</span>
              <span className="text-red-400">{formatPrecio(total)}</span>
            </div>
            {metodoPago === "efectivo" && vuelto > 0 && (
              <div className="flex justify-between text-sm font-semibold text-green-400">
                <span>Vuelto</span><span>{formatPrecio(vuelto)}</span>
              </div>
            )}
          </div>

          <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border-base)" }}>
            <button onClick={() => onOpcionesAbiertas(!opcionesAbiertas)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium transition-colors"
              style={{ background: "var(--bg-hover)", color: "var(--text-muted)" }}
              onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"}
              onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"}>
              <span className="flex items-center gap-1.5">
                Opciones
                {(imprimirTicket || generarFactura || fechaManual || clienteNombre || (usuarios.length > 1 && vendedorId)) && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ background: "#DC2626" }}>
                    {[imprimirTicket, generarFactura, fechaManual, !!clienteNombre, !!(usuarios.length > 1 && vendedorId)].filter(Boolean).length}
                  </span>
                )}
              </span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${opcionesAbiertas ? "" : "-rotate-90"}`} />
            </button>

            {opcionesAbiertas && (
              <div className="px-3 py-2.5 space-y-2.5" style={{ borderTop: "1px solid var(--border-base)" }}>
                <input type="text" value={clienteNombre} onChange={(e) => onClienteNombre(e.target.value)}
                  placeholder="Nombre del cliente (opcional)"
                  className="input-base w-full text-xs" style={{ padding: "5px 10px" }} />
                {usuarios.length > 1 && (
                  <select value={vendedorId} onChange={e => onVendedorId(e.target.value)}
                    className="input-base w-full text-xs" style={{ padding: "5px 10px" }}>
                    <option value="">— Vendedor: mi cuenta —</option>
                    {usuarios.map(u => <option key={u.id} value={u.supabaseId}>{u.nombre}</option>)}
                  </select>
                )}
                {[
                  { label: "Generar ticket de venta",            value: imprimirTicket,  setter: onImprimirTicket },
                  { label: "Generar factura electrónica (AFIP)", value: generarFactura,  setter: onGenerarFactura },
                  { label: "Cargar con fecha pasada",            value: fechaManual,     setter: onFechaManual },
                ].map(({ label, value, setter }) => (
                  <label key={label} className="flex items-center gap-2 cursor-pointer select-none" onClick={() => setter(!value)}>
                    <div className="flex h-3.5 w-3.5 items-center justify-center rounded flex-shrink-0"
                      style={{ background: value ? "#DC2626" : "transparent", border: value ? "1px solid #DC2626" : "1px solid var(--border-strong)" }}>
                      {value && (
                        <svg className="h-2 w-2" fill="none" viewBox="0 0 12 12" stroke="#ffffff" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                        </svg>
                      )}
                    </div>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</span>
                  </label>
                ))}
                {fechaManual && (
                  <input type="datetime-local" value={fechaVenta}
                    max={`${fechaHoyAR()}T${horaAhoraAR()}`}
                    onChange={e => onFechaVenta(e.target.value)}
                    className="input-base w-full text-xs" style={{ padding: "5px 10px" }} />
                )}
              </div>
            )}
          </div>

          {resultado === "error" && (
            <div className="flex items-start gap-2 rounded-lg px-2 py-2.5"
              style={{ background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.2)" }}>
              <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-300">{mensajeError}</p>
            </div>
          )}
          {resultado === "exito" && (
            <div className="flex items-center gap-2 rounded-lg px-2 py-2.5"
              style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
              <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
              <p className="text-xs font-medium text-green-300">¡Venta registrada!</p>
            </div>
          )}

          <p className="text-[10px] text-center" style={{ color: "var(--text-faint)" }}>
            Enter para cobrar · Esc para cerrar
          </p>

          <button onClick={onVenta} disabled={cargando || carrito.length === 0 || resultado === "exito"}
            className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "#DC2626", color: "#ffffff" }}
            onMouseEnter={(e) => { if (!cargando) (e.currentTarget as HTMLElement).style.background = "#B91C1C"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#DC2626"; }}>
            {cargando ? (
              <>
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                Cobrar {formatPrecio(total)}
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}