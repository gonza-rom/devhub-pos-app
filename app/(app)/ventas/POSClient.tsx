"use client";
// app/(app)/ventas/POSClient.tsx
// OPTIMIZADO para 1500+ productos con scroll infinito + búsqueda remota
// ✅ TIPOS OPTIMIZADOS - Sin dependencia de Prisma completo

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { debounce } from "lodash";
import {
  ShoppingCart, Search, X, Plus, Minus, Trash2,
  CreditCard, Banknote, Smartphone, QrCode, ChevronRight,
  Package, CheckCircle2, AlertCircle, Tag, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPrecio } from "@/lib/utils";
import TicketPrint from "@/components/ventas/TicketPrint";

// ✅ Tipos optimizados - Solo lo necesario para el POS (sin Prisma)
type ProductoConCategoria = {
  id: string;
  nombre: string;
  precio: number;
  stock: number;
  stockMinimo: number;
  imagen: string | null;
  codigoBarras: string | null;
  codigoProducto: string | null;
  categoriaId: string | null;
  categoria: {
    id: string;
    nombre: string;
  } | null;
};

type CategoriaSimple = {
  id: string;
  nombre: string;
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
  { value: "efectivo",      label: "Efectivo",  icono: Banknote },
  { value: "debito",        label: "Débito",    icono: CreditCard },
  { value: "credito",       label: "Crédito",   icono: CreditCard },
  { value: "transferencia", label: "Transfer",  icono: Smartphone },
  { value: "qr",            label: "QR / MP",   icono: QrCode },
];

type Props = {
  productosIniciales: ProductoConCategoria[];
  categorias: CategoriaSimple[];
  onVentaExitosa?: () => void;
  isModal?: boolean;
  nombreTenant?: string;
  telefonoTenant?: string | null;
  direccionTenant?: string | null;
};

export default function POSClient({
  productosIniciales,
  categorias,
  onVentaExitosa,
  isModal,
  nombreTenant = "Mi comercio",
  telefonoTenant,
  direccionTenant,
}: Props) {
  // Estados principales
  const [productos, setProductos] = useState<ProductoConCategoria[]>(productosIniciales);
  const [busqueda, setBusqueda] = useState("");
  const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null);
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("efectivo");
  const [descuento, setDescuento] = useState(0);
  const [clienteNombre, setClienteNombre] = useState("");
  
  // Estados de carga
  const [cargando, setCargando] = useState(false);
  const [buscandoRemoto, setBuscandoRemoto] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [hayMas, setHayMas] = useState(true);
  const [pagina, setPagina] = useState(1);
  
  // Estados de venta
  const [resultado, setResultado] = useState<"exito" | "error" | null>(null);
  const [mensajeError, setMensajeError] = useState("");
  const [efectivoRecibido, setEfectivoRecibido] = useState("");
  const [ticketVenta, setTicketVenta] = useState<any | null>(null);
  const [imprimirTicket, setImprimirTicket] = useState(true);
  const [tabMobile, setTabMobile] = useState<"catalogo" | "carrito">("catalogo");
  
  // Refs
  const observerTarget = useRef<HTMLDivElement>(null);

  // ✅ Búsqueda remota con debounce
  const buscarProductosRemoto = useCallback(
    debounce(async (termino: string, categoria: string | null) => {
      if (!termino && !categoria) {
        setProductos(productosIniciales);
        setHayMas(true);
        setPagina(1);
        return;
      }

      setBuscandoRemoto(true);
      try {
        const params = new URLSearchParams({
          modo: 'pos',
          activos: 'true',
          page: '1',
          pageSize: '50',
        });
        
        if (termino) params.set('busqueda', termino);
        if (categoria) params.set('categoriaId', categoria);

        const res = await fetch(`/api/productos?${params}`);
        const data = await res.json();
        
        if (data.ok) {
          setProductos(data.productos || []);
          setHayMas(data.meta?.hasNext || false);
          setPagina(1);
        }
      } catch (error) {
        console.error('Error búsqueda:', error);
      } finally {
        setBuscandoRemoto(false);
      }
    }, 350),
    [productosIniciales]
  );

  // ✅ Cargar más productos (scroll infinito)
  const cargarMasProductos = useCallback(async () => {
    if (cargandoMas || !hayMas || busqueda || categoriaActiva) return;

    setCargandoMas(true);
    try {
      const params = new URLSearchParams({
        modo: 'pos',
        activos: 'true',
        page: String(pagina + 1),
        pageSize: '30',
      });

      const res = await fetch(`/api/productos?${params}`);
      const data = await res.json();
      
      if (data.ok && data.productos?.length > 0) {
        setProductos(prev => [...prev, ...data.productos]);
        setHayMas(data.meta?.hasNext || false);
        setPagina(prev => prev + 1);
      } else {
        setHayMas(false);
      }
    } catch (error) {
      console.error('Error cargando más:', error);
    } finally {
      setCargandoMas(false);
    }
  }, [cargandoMas, hayMas, pagina, busqueda, categoriaActiva]);

  // ✅ Intersection Observer para scroll infinito
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hayMas && !cargandoMas && !busqueda && !categoriaActiva) {
          cargarMasProductos();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hayMas, cargandoMas, cargarMasProductos, busqueda, categoriaActiva]);

  // ✅ Handler de búsqueda
  const handleBusqueda = useCallback((valor: string) => {
    setBusqueda(valor);
    buscarProductosRemoto(valor, categoriaActiva);
  }, [categoriaActiva, buscarProductosRemoto]);

  // ✅ Handler de categoría
  const handleCategoriaChange = useCallback((catId: string | null) => {
    setCategoriaActiva(catId);
    buscarProductosRemoto(busqueda, catId);
  }, [busqueda, buscarProductosRemoto]);

  // Funciones del carrito (sin cambios)
  const agregarAlCarrito = useCallback((producto: ProductoConCategoria) => {
    setCarrito((prev) => {
      const existente = prev.find((i) => i.productoId === producto.id);
      if (existente) {
        if (existente.cantidad >= producto.stock) return prev;
        return prev.map((i) =>
          i.productoId === producto.id
            ? { ...i, cantidad: i.cantidad + 1, subtotal: (i.cantidad + 1) * i.precio }
            : i
        );
      }
      return [...prev, {
        productoId: producto.id,
        nombre: producto.nombre,
        precio: producto.precio,
        cantidad: 1,
        subtotal: producto.precio,
        stock: producto.stock,
        imagen: producto.imagen,
      }];
    });
  }, []);

  const cambiarCantidad = useCallback((productoId: string, delta: number) => {
    setCarrito((prev) =>
      prev.map((i) => {
        if (i.productoId !== productoId) return i;
        const nuevaCantidad = i.cantidad + delta;
        if (nuevaCantidad <= 0) return null as any;
        if (nuevaCantidad > i.stock) return i;
        return { ...i, cantidad: nuevaCantidad, subtotal: nuevaCantidad * i.precio };
      }).filter(Boolean)
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

  const subtotal = carrito.reduce((acc, i) => acc + i.subtotal, 0);
  const total = Math.max(0, subtotal - descuento);
  const cantidadTotal = carrito.reduce((a, i) => a + i.cantidad, 0);
  const vuelto = metodoPago === "efectivo" && efectivoRecibido
    ? parseFloat(efectivoRecibido) - total : 0;

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
        if (imprimirTicket) {
          setTicketVenta({
            id: data.data?.id ?? "000000",
            createdAt: data.data?.createdAt ?? new Date().toISOString(),
            total,
            subtotal,
            descuento,
            metodoPago,
            clienteNombre: clienteNombre.trim() || null,
            usuarioNombre: data.data?.usuarioNombre ?? null,
            items: carrito.map(i => ({
              nombre: i.nombre,
              cantidad: i.cantidad,
              precioUnit: i.precio,
              subtotal: i.subtotal,
            })),
          });
        }
        setTimeout(() => {
          limpiarCarrito();
          setResultado(null);
          onVentaExitosa?.();
        }, 1200);
      }
    } catch {
      setMensajeError("Error de conexión");
      setResultado("error");
    } finally {
      setCargando(false);
    }
  }

  /* ─── Panel Catálogo ─────────────────────────────────────── */
  const panelCatalogo = (
    <div className="flex flex-col h-full min-w-0 overflow-hidden" style={{ background: "var(--bg-base)" }}>
      {/* Buscador */}
      <div className="p-3 md:p-4 border-b flex-shrink-0" style={{ background: "var(--bg-surface)", borderColor: "var(--border-base)" }}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--text-primary)" }} />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => handleBusqueda(e.target.value)}
            placeholder="Buscar producto o código..."
            className="input-base pl-9 pr-9 w-full"
            autoFocus
          />
          {busqueda && (
            <button
              onClick={() => handleBusqueda("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--text-primary)" }}
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {buscandoRemoto && (
            <div className="absolute right-10 top-1/2 -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--text-muted)" }} />
            </div>
          )}
        </div>
      </div>

      {/* Categorías */}
      {categorias.length > 0 && (
        <div
          className="flex gap-2 px-3 md:px-4 py-2.5 overflow-x-auto border-b flex-shrink-0 scrollbar-hide"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border-base)" }}
        >
          <button
            onClick={() => handleCategoriaChange(null)}
            className={cn(
              "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
              !categoriaActiva ? "bg-red-600 text-white" : ""
            )}
            style={
              !categoriaActiva
                ? {}
                : { background: "var(--bg-hover-md)", border: "1px solid var(--border-md)", color: "var(--text-secondary)" }
            }
          >
            Todos
          </button>
          {categorias.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoriaChange(categoriaActiva === cat.id ? null : cat.id)}
              className={cn(
                "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                categoriaActiva === cat.id ? "bg-red-600 text-white" : ""
              )}
              style={
                categoriaActiva === cat.id
                  ? {}
                  : { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-secondary)" }
              }
            >
              <Tag className="h-3 w-3" />
              {cat.nombre}
            </button>
          ))}
        </div>
      )}

      {/* Grid de productos */}
      <div className="flex-1 overflow-y-auto p-3 md:p-4">
        {buscandoRemoto && productos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <Loader2 className="h-12 w-12 animate-spin mb-3" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
              Buscando productos...
            </p>
          </div>
        ) : productos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <Package className="h-12 w-12 mb-3" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
              Sin productos
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-faint)" }}>
              {busqueda ? "Probá con otro término" : "No hay productos disponibles"}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 md:gap-3">
              {productos.map((producto) => {
                const enCarrito = carrito.find((i) => i.productoId === producto.id);
                const stockBajo = producto.stock <= producto.stockMinimo;
                return (
                  <button
                    key={producto.id}
                    onClick={() => agregarAlCarrito(producto)}
                    className="relative flex flex-col rounded-xl p-2.5 md:p-3 text-left transition-all active:scale-95"
                    style={{
                      background: enCarrito ? "rgba(220,38,38,0.12)" : "var(--bg-card)",
                      border: enCarrito ? "1px solid rgba(220,38,38,0.4)" : "1px solid var(--border-base)",
                    }}
                    onMouseEnter={(e) => {
                      if (!enCarrito) (e.currentTarget as HTMLElement).style.borderColor = "var(--border-strong)";
                    }}
                    onMouseLeave={(e) => {
                      if (!enCarrito) (e.currentTarget as HTMLElement).style.borderColor = "var(--border-base)";
                    }}
                  >
                    <div
                      className="mb-2 flex items-center justify-center h-14 md:h-16 rounded-lg overflow-hidden w-full"
                      style={{ background: "var(--bg-hover-md)" }}
                    >
                      {producto.imagen ? (
                        <img
                          src={producto.imagen?.replace("/upload/", "/upload/f_auto,q_auto,w_200/")}
                          alt={producto.nombre}
                          loading="lazy"
                          className="h-full w-full object-cover rounded-lg"
                        />
                      ) : (
                        <Package className="h-6 w-6 md:h-7 md:w-7" style={{ color: "var(--text-muted)" }} />
                      )}
                    </div>
                    <p className="text-xs font-semibold line-clamp-2 leading-tight mb-1" style={{ color: "var(--text-primary)" }}>
                      {producto.nombre}
                    </p>
                    <p className="text-sm font-bold text-red-400 mt-auto">{formatPrecio(producto.precio)}</p>
                    {stockBajo && (
                      <span
                        className="absolute top-2 right-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                        style={{
                          background: "rgba(245,158,11,0.15)",
                          color: "#fbbf24",
                          border: "1px solid rgba(245,158,11,0.3)",
                        }}
                      >
                        {producto.stock}
                      </span>
                    )}
                    {enCarrito && (
                      <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow">
                        {enCarrito.cantidad}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Sentinel para scroll infinito */}
            {!busqueda && !categoriaActiva && (
              <div ref={observerTarget} className="h-20 flex items-center justify-center">
                {cargandoMas && (
                  <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Cargando más productos...</span>
                  </div>
                )}
                {!hayMas && productos.length > 30 && (
                  <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                    No hay más productos
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  /* ─── Panel Carrito (sin cambios) ──────────────────────────────────────── */
  const panelCarrito = (
    <div className="flex flex-col h-full" style={{ background: "var(--bg-surface)" }}>
      {/* Header */}
      <div
        className="hidden md:flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: "var(--border-base)" }}
      >
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
          <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
            Carrito
          </span>
          {cantidadTotal > 0 && (
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold"
              style={{ background: "rgba(220,38,38,0.8)", color: "#ffffff" }}
            >
              {cantidadTotal}
            </span>
          )}
        </div>
        {carrito.length > 0 && (
          <button
            onClick={limpiarCarrito}
            className="text-xs transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#f87171")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-muted)")}
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto">
        {carrito.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-16 text-center px-6">
            <div className="h-16 w-16 rounded-full flex items-center justify-center mb-4" style={{ background: "var(--bg-hover)" }}>
              <ShoppingCart className="h-7 w-7" style={{ color: "var(--text-muted)" }} />
            </div>
            <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
              El carrito está vacío
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-faint)" }}>
              <span className="md:hidden">Tocá "Catálogo" para agregar productos</span>
              <span className="hidden md:inline">Tocá un producto para agregarlo</span>
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
            {carrito.map((item) => (
              <div key={item.productoId} className="flex items-center gap-2 px-3 md:px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                    {item.nombre}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                    {formatPrecio(item.precio)} c/u
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => cambiarCantidad(item.productoId, -1)}
                    className="flex h-6 w-6 items-center justify-center rounded-md transition-colors"
                    style={{ border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-primary)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-secondary)")}
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-6 text-center text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {item.cantidad}
                  </span>
                  <button
                    onClick={() => cambiarCantidad(item.productoId, 1)}
                    disabled={item.cantidad >= item.stock}
                    className="flex h-6 w-6 items-center justify-center rounded-md transition-colors disabled:opacity-30"
                    style={{ border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}
                    onMouseEnter={(e) => {
                      if (!e.currentTarget.disabled) (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
                    }}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-secondary)")}
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold w-16 md:w-20 text-right" style={{ color: "var(--text-primary)" }}>
                    {formatPrecio(item.subtotal)}
                  </span>
                  <button
                    onClick={() => eliminarDelCarrito(item.productoId)}
                    style={{ color: "var(--text-muted)" }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#f87171")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-muted)")}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer con totales y pago */}
      {carrito.length > 0 && (
        <div className="border-t p-3 md:p-4 space-y-3 flex-shrink-0" style={{ borderColor: "var(--border-base)" }}>
          <input
            type="text"
            value={clienteNombre}
            onChange={(e) => setClienteNombre(e.target.value)}
            placeholder="Nombre del cliente (opcional)"
            className="input-base w-full"
          />

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
              Descuento $
            </label>
            <input
              type="number"
              min="0"
              max={subtotal}
              value={descuento || ""}
              onChange={(e) => setDescuento(Math.max(0, parseFloat(e.target.value) || 0))}
              placeholder="0"
              className="input-base flex-1"
            />
          </div>

          <div>
            <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>
              Método de pago
            </p>
            <div className="grid grid-cols-5 gap-1.5">
              {METODOS_PAGO.map((mp) => {
                const Icon = mp.icono;
                const activo = metodoPago === mp.value;
                return (
                  <button
                    key={mp.value}
                    onClick={() => setMetodoPago(mp.value)}
                    className="flex flex-col items-center gap-1 py-2 rounded-lg text-center transition-colors"
                    style={{
                      background: activo ? "rgba(220,38,38,0.15)" : "var(--bg-hover)",
                      border: activo ? "1px solid rgba(220,38,38,0.4)" : "1px solid var(--border-base)",
                      color: activo ? "#f87171" : "var(--text-muted)",
                    }}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-[10px] font-medium leading-tight">{mp.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {metodoPago === "efectivo" && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                Recibido $
              </label>
              <input
                type="number"
                min={total}
                value={efectivoRecibido}
                onChange={(e) => setEfectivoRecibido(e.target.value)}
                placeholder={String(total)}
                className="input-base flex-1"
              />
            </div>
          )}

          <div className="space-y-1 pt-2 border-t" style={{ borderColor: "var(--border-base)" }}>
            {descuento > 0 && (
              <>
                <div className="flex justify-between text-sm" style={{ color: "var(--text-faint)" }}>
                  <span>Subtotal</span>
                  <span>{formatPrecio(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-green-400">
                  <span>Descuento</span>
                  <span>- {formatPrecio(descuento)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between font-bold text-lg" style={{ color: "var(--text-primary)" }}>
              <span>Total</span>
              <span className="text-red-400">{formatPrecio(total)}</span>
            </div>
            {metodoPago === "efectivo" && vuelto > 0 && (
              <div className="flex justify-between text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
                <span>Vuelto</span>
                <span>{formatPrecio(vuelto)}</span>
              </div>
            )}
          </div>

          <label
            className="flex items-center gap-2.5 cursor-pointer select-none py-1"
            onClick={() => setImprimirTicket((v) => !v)}
          >
            <div
              className="flex h-4 w-4 items-center justify-center rounded flex-shrink-0"
              style={{
                background: imprimirTicket ? "#DC2626" : "transparent",
                border: imprimirTicket ? "1px solid #DC2626" : "1px solid var(--border-strong)",
              }}
            >
              {imprimirTicket && (
                <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 12 12" stroke="#ffffff" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                </svg>
              )}
            </div>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              Generar ticket de venta
            </span>
          </label>

          {resultado === "error" && (
            <div
              className="flex items-start gap-2 rounded-lg px-3 py-2.5"
              style={{ background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.2)" }}
            >
              <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-300">{mensajeError}</p>
            </div>
          )}
          {resultado === "exito" && (
            <div
              className="flex items-center gap-2 rounded-lg px-3 py-2.5"
              style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}
            >
              <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
              <p className="text-xs font-medium text-green-300">¡Venta registrada!</p>
            </div>
          )}

          <button
            onClick={handleVenta}
            disabled={cargando || carrito.length === 0 || resultado === "exito"}
            className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "#DC2626", color: "#ffffff" }}
            onMouseEnter={(e) => {
              if (!cargando) (e.currentTarget as HTMLElement).style.background = "#B91C1C";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "#DC2626";
            }}
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
  );

  const alturaBase = isModal ? "h-full" : "h-[calc(100vh-3.5rem)]";

  return (
    <>
      {/* DESKTOP */}
      <div className={cn("hidden md:flex gap-0 overflow-hidden", alturaBase, !isModal && "-m-4 md:-m-6")}>
        <div className="flex flex-col flex-1 min-w-0 border-r overflow-hidden" style={{ borderColor: "var(--border-base)" }}>
          {panelCatalogo}
        </div>
        <div className="flex flex-col w-80 xl:w-96 flex-shrink-0 overflow-hidden">{panelCarrito}</div>
      </div>

      {/* MOBILE */}
      <div className={cn("flex flex-col md:hidden overflow-hidden", alturaBase, !isModal && "-mx-4")}>
        <div className="flex flex-shrink-0" style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border-base)" }}>
          <button
            onClick={() => setTabMobile("catalogo")}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors"
            style={{
              color: tabMobile === "catalogo" ? "#f87171" : "#71717a",
              borderBottom: tabMobile === "catalogo" ? "2px solid #DC2626" : "2px solid transparent",
            }}
          >
            <Package className="h-4 w-4" />
            Catálogo
          </button>
          <button
            onClick={() => setTabMobile("carrito")}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors relative"
            style={{
              color: tabMobile === "carrito" ? "#f87171" : "#71717a",
              borderBottom: tabMobile === "carrito" ? "2px solid #DC2626" : "2px solid transparent",
            }}
          >
            <ShoppingCart className="h-4 w-4" />
            Carrito
            {cantidadTotal > 0 && (
              <span className="absolute top-2 right-[calc(50%-36px)] flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white leading-none">
                {cantidadTotal > 9 ? "9+" : cantidadTotal}
              </span>
            )}
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          {tabMobile === "catalogo" && panelCatalogo}
          {tabMobile === "carrito" && panelCarrito}
        </div>

        {tabMobile === "catalogo" && cantidadTotal > 0 && (
          <div className="flex-shrink-0 p-3 border-t" style={{ background: "var(--bg-surface)", borderColor: "var(--border-base)" }}>
            <button
              onClick={() => setTabMobile("carrito")}
              className="w-full flex items-center justify-between rounded-xl px-4 py-3 text-sm font-bold text-white"
              style={{ background: "#DC2626" }}
            >
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Ver carrito ({cantidadTotal})
              </div>
              <span>{formatPrecio(total)}</span>
            </button>
          </div>
        )}
      </div>

      {ticketVenta && (
        <TicketPrint
          venta={ticketVenta}
          nombreTenant={nombreTenant}
          telefonoTenant={telefonoTenant}
          direccionTenant={direccionTenant}
          onClose={() => setTicketVenta(null)}
        />
      )}
    </>
  );
}