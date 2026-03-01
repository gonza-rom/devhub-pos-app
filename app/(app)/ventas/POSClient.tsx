"use client";
// app/(app)/ventas/POSClient.tsx

import { useState, useMemo, useCallback } from "react";
import {
  ShoppingCart, Search, X, Plus, Minus, Trash2,
  CreditCard, Banknote, Smartphone, QrCode, ChevronRight,
  Package, CheckCircle2, AlertCircle, Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPrecio } from "@/lib/utils";
import type { Producto, Categoria } from "@/types";

type ProductoConCategoria = Producto & {
  categoria: Pick<Categoria, "id" | "nombre"> | null;
};

type ItemCarrito = {
  productoId: string;
  nombre: string;
  precio: number;
  cantidad: number;
  subtotal: number;
  stock: number;
  imagen?: string | null;
};

type MetodoPago = "efectivo" | "debito" | "credito" | "transferencia" | "qr";

const METODOS_PAGO: { value: MetodoPago; label: string; icono: React.ElementType }[] = [
  { value: "efectivo",      label: "Efectivo",      icono: Banknote },
  { value: "debito",        label: "Débito",        icono: CreditCard },
  { value: "credito",       label: "Crédito",       icono: CreditCard },
  { value: "transferencia", label: "Transfer",      icono: Smartphone },
  { value: "qr",            label: "QR / MP",       icono: QrCode },
];

type Props = {
  productos: ProductoConCategoria[];
  categorias: Pick<Categoria, "id" | "nombre">[];
};

export default function POSClient({ productos, categorias }: Props) {
  const [busqueda, setBusqueda] = useState("");
  const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null);
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("efectivo");
  const [descuento, setDescuento] = useState(0);
  const [clienteNombre, setClienteNombre] = useState("");
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<"exito" | "error" | null>(null);
  const [mensajeError, setMensajeError] = useState("");
  const [efectivoRecibido, setEfectivoRecibido] = useState("");

  // ── Filtrado de productos ───────────────────────────────────

  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      const matchBusqueda =
        !busqueda ||
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (p.codigoProducto ?? "").toLowerCase().includes(busqueda.toLowerCase()) ||
        (p.codigoBarras ?? "").toLowerCase().includes(busqueda.toLowerCase());
      const matchCategoria = !categoriaActiva || p.categoriaId === categoriaActiva;
      return matchBusqueda && matchCategoria;
    });
  }, [productos, busqueda, categoriaActiva]);

  // ── Operaciones del carrito ─────────────────────────────────

  const agregarAlCarrito = useCallback((producto: ProductoConCategoria) => {
    setCarrito((prev) => {
      const existente = prev.find((i) => i.productoId === producto.id);
      if (existente) {
        if (existente.cantidad >= producto.stock) return prev; // Sin stock extra
        return prev.map((i) =>
          i.productoId === producto.id
            ? { ...i, cantidad: i.cantidad + 1, subtotal: (i.cantidad + 1) * i.precio }
            : i
        );
      }
      return [
        ...prev,
        {
          productoId: producto.id,
          nombre: producto.nombre,
          precio: producto.precio,
          cantidad: 1,
          subtotal: producto.precio,
          stock: producto.stock,
          imagen: producto.imagen,
        },
      ];
    });
  }, []);

  const cambiarCantidad = useCallback((productoId: string, delta: number) => {
    setCarrito((prev) =>
      prev
        .map((i) => {
          if (i.productoId !== productoId) return i;
          const nuevaCantidad = i.cantidad + delta;
          if (nuevaCantidad <= 0) return null as any;
          if (nuevaCantidad > i.stock) return i;
          return { ...i, cantidad: nuevaCantidad, subtotal: nuevaCantidad * i.precio };
        })
        .filter(Boolean)
    );
  }, []);

  const eliminarDelCarrito = useCallback((productoId: string) => {
    setCarrito((prev) => prev.filter((i) => i.productoId !== productoId));
  }, []);

  const limpiarCarrito = useCallback(() => {
    setCarrito([]);
    setDescuento(0);
    setClienteNombre("");
    setEfectivoRecibido("");
  }, []);

  // ── Totales ─────────────────────────────────────────────────

  const subtotal = carrito.reduce((acc, i) => acc + i.subtotal, 0);
  const total = Math.max(0, subtotal - descuento);
  const vuelto =
    metodoPago === "efectivo" && efectivoRecibido
      ? parseFloat(efectivoRecibido) - total
      : 0;

  // ── Registrar venta ─────────────────────────────────────────

  async function handleVenta() {
    if (carrito.length === 0) return;
    setCargando(true);
    setResultado(null);
    setMensajeError("");

    try {
      const res = await fetch("/api/ventas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: carrito.map((i) => ({
            productoId: i.productoId,
            cantidad: i.cantidad,
            precioUnit: i.precio,
          })),
          metodoPago,
          descuento,
          clienteNombre: clienteNombre.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        setMensajeError(data.error ?? "Error al registrar la venta");
        setResultado("error");
      } else {
        setResultado("exito");
        setTimeout(() => {
          limpiarCarrito();
          setResultado(null);
        }, 2000);
      }
    } catch {
      setMensajeError("Error de conexión");
      setResultado("error");
    } finally {
      setCargando(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-3.5rem)] gap-0 -m-4 md:-m-6 overflow-hidden">

      {/* ── Panel izquierdo: Catálogo ── */}
      <div className="flex flex-col flex-1 min-w-0 bg-gray-50 dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800">

        {/* Buscador */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar producto o código..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              autoFocus
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Categorías */}
        {categorias.length > 0 && (
          <div className="flex gap-2 px-4 py-3 overflow-x-auto border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 scrollbar-hide">
            <button
              onClick={() => setCategoriaActiva(null)}
              className={cn(
                "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                !categoriaActiva
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              )}
            >
              Todos
            </button>
            {categorias.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoriaActiva(categoriaActiva === cat.id ? null : cat.id)}
                className={cn(
                  "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                  categoriaActiva === cat.id
                    ? "bg-primary-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                )}
              >
                <Tag className="h-3 w-3" />
                {cat.nombre}
              </button>
            ))}
          </div>
        )}

        {/* Grid de productos */}
        <div className="flex-1 overflow-y-auto p-4">
          {productosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <Package className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Sin productos</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {busqueda ? "Probá con otro término" : "No hay productos con stock disponible"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
              {productosFiltrados.map((producto) => {
                const enCarrito = carrito.find((i) => i.productoId === producto.id);
                const stockBajo = producto.stock <= producto.stockMinimo;

                return (
                  <button
                    key={producto.id}
                    onClick={() => agregarAlCarrito(producto)}
                    className={cn(
                      "relative flex flex-col rounded-xl border bg-white dark:bg-gray-800 p-3 text-left transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0",
                      enCarrito
                        ? "border-primary-400 dark:border-primary-600 ring-1 ring-primary-400 dark:ring-primary-600"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    )}
                  >
                    {/* Imagen o ícono */}
                    <div className="mb-2 flex items-center justify-center h-16 rounded-lg bg-gray-50 dark:bg-gray-700/50 overflow-hidden">
                      {producto.imagen ? (
                        <img
                          src={producto.imagen}
                          alt={producto.nombre}
                          className="h-full w-full object-cover rounded-lg"
                        />
                      ) : (
                        <Package className="h-7 w-7 text-gray-300 dark:text-gray-600" />
                      )}
                    </div>

                    {/* Info */}
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 leading-tight mb-1">
                      {producto.nombre}
                    </p>
                    <p className="text-sm font-bold text-primary-600 dark:text-primary-400 mt-auto">
                      {formatPrecio(producto.precio)}
                    </p>

                    {/* Stock badge */}
                    {stockBajo && (
                      <span className="absolute top-2 right-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                        {producto.stock}
                      </span>
                    )}

                    {/* Cantidad en carrito */}
                    {enCarrito && (
                      <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-[10px] font-bold text-white shadow">
                        {enCarrito.cantidad}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Panel derecho: Carrito ── */}
      <div className="flex flex-col w-80 xl:w-96 bg-white dark:bg-gray-900 flex-shrink-0">

        {/* Header carrito */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              Carrito
            </span>
            {carrito.length > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30 text-xs font-bold text-primary-700 dark:text-primary-400">
                {carrito.reduce((a, i) => a + i.cantidad, 0)}
              </span>
            )}
          </div>
          {carrito.length > 0 && (
            <button
              onClick={limpiarCarrito}
              className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Items del carrito */}
        <div className="flex-1 overflow-y-auto">
          {carrito.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center px-6">
              <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <ShoppingCart className="h-7 w-7 text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                El carrito está vacío
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Tocá un producto para agregarlo
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {carrito.map((item) => (
                <div key={item.productoId} className="flex items-center gap-3 px-4 py-3">
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {item.nombre}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatPrecio(item.precio)} c/u
                    </p>
                  </div>

                  {/* Controles cantidad */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => cambiarCantidad(item.productoId, -1)}
                      className="flex h-6 w-6 items-center justify-center rounded-md border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-6 text-center text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {item.cantidad}
                    </span>
                    <button
                      onClick={() => cambiarCantidad(item.productoId, 1)}
                      disabled={item.cantidad >= item.stock}
                      className="flex h-6 w-6 items-center justify-center rounded-md border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Subtotal + eliminar */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100 w-20 text-right">
                      {formatPrecio(item.subtotal)}
                    </span>
                    <button
                      onClick={() => eliminarDelCarrito(item.productoId)}
                      className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer: totales + pago */}
        {carrito.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-800 p-4 space-y-4">

            {/* Cliente (opcional) */}
            <div>
              <input
                type="text"
                value={clienteNombre}
                onChange={(e) => setClienteNombre(e.target.value)}
                placeholder="Nombre del cliente (opcional)"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Descuento */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                Descuento $
              </label>
              <input
                type="number"
                min="0"
                max={subtotal}
                value={descuento || ""}
                onChange={(e) => setDescuento(Math.max(0, parseFloat(e.target.value) || 0))}
                placeholder="0"
                className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Método de pago */}
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Método de pago</p>
              <div className="grid grid-cols-5 gap-1.5">
                {METODOS_PAGO.map((mp) => {
                  const Icon = mp.icono;
                  return (
                    <button
                      key={mp.value}
                      onClick={() => setMetodoPago(mp.value)}
                      className={cn(
                        "flex flex-col items-center gap-1 py-2 rounded-lg border text-center transition-colors",
                        metodoPago === mp.value
                          ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400"
                          : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-[10px] font-medium leading-tight">{mp.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Efectivo recibido */}
            {metodoPago === "efectivo" && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  Recibido $
                </label>
                <input
                  type="number"
                  min={total}
                  value={efectivoRecibido}
                  onChange={(e) => setEfectivoRecibido(e.target.value)}
                  placeholder={String(total)}
                  className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            )}

            {/* Totales */}
            <div className="space-y-1 pt-1 border-t border-gray-100 dark:border-gray-800">
              {descuento > 0 && (
                <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                  <span>Subtotal</span>
                  <span>{formatPrecio(subtotal)}</span>
                </div>
              )}
              {descuento > 0 && (
                <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                  <span>Descuento</span>
                  <span>- {formatPrecio(descuento)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg text-gray-900 dark:text-gray-100">
                <span>Total</span>
                <span className="text-primary-600 dark:text-primary-400">{formatPrecio(total)}</span>
              </div>
              {metodoPago === "efectivo" && vuelto > 0 && (
                <div className="flex justify-between text-sm font-semibold text-blue-600 dark:text-blue-400">
                  <span>Vuelto</span>
                  <span>{formatPrecio(vuelto)}</span>
                </div>
              )}
            </div>

            {/* Feedback de resultado */}
            {resultado === "error" && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2.5">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-600 dark:text-red-400">{mensajeError}</p>
              </div>
            )}

            {resultado === "exito" && (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-3 py-2.5">
                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                <p className="text-xs font-medium text-green-600 dark:text-green-400">
                  ¡Venta registrada!
                </p>
              </div>
            )}

            {/* Botón cobrar */}
            <button
              onClick={handleVenta}
              disabled={cargando || carrito.length === 0 || resultado === "exito"}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-bold text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
            >
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
    </div>
  );
}