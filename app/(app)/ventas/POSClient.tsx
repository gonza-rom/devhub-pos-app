"use client";
// app/(app)/ventas/POSClient.tsx
// OPTIMIZADO con react-window para 1500+ productos
// FIX: ref propio en Grid, Cell con useCallback, sin overflow:auto, retry en resize

import { useState, useCallback, useEffect, useRef } from "react";
import { debounce } from "lodash";
import InfiniteLoader from "react-window-infinite-loader";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Grid = require("react-window").FixedSizeGrid;
import {
  ShoppingCart, Search, X, Plus, Minus, Trash2,
  CreditCard, Banknote, Smartphone, QrCode, ChevronRight,
  Package, CheckCircle2, AlertCircle, Tag, Loader2,
  ScanLine,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPrecio } from "@/lib/utils";
import TicketPrint from "@/components/ventas/TicketPrint";
import BarcodeScanner from "@/components/ventas/BarcodeScanner";


// ─── Tipos ────────────────────────────────────────────────────────────────────

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
  categoria: { id: string; nombre: string } | null;
};

type CategoriaSimple = { id: string; nombre: string };

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
  { value: "efectivo",      label: "Efectivo", icono: Banknote },
  { value: "debito",        label: "Débito",   icono: CreditCard },
  { value: "credito",       label: "Crédito",  icono: CreditCard },
  { value: "transferencia", label: "Transfer", icono: Smartphone },
  { value: "qr",            label: "QR / MP",  icono: QrCode },
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

// ─── Configuración del grid ───────────────────────────────────────────────────

const MIN_CARD_WIDTH = 160;
const CARD_HEIGHT    = 165;
const GAP            = 8;

// Cache de productos por clave (categoría + búsqueda) — persiste entre renders
const _productosCache: Record<string, { productos: any[]; ts: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 min

// ─── Componente principal ─────────────────────────────────────────────────────

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
  const [productos,       setProductos]       = useState<ProductoConCategoria[]>(productosIniciales);
  const [busqueda,        setBusqueda]        = useState("");
  const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null);
  const [carrito,         setCarrito]         = useState<ItemCarrito[]>([]);
  const [metodoPago,      setMetodoPago]      = useState<MetodoPago>("efectivo");
  const [descuento,       setDescuento]       = useState(0);
  const [clienteNombre,   setClienteNombre]   = useState("");

  // Estados de carga
  const [buscandoRemoto, setBuscandoRemoto] = useState(false);
  const [cargandoMas,    setCargandoMas]    = useState(false);
  const [hayMas,         setHayMas]         = useState(true);
  const [pagina,         setPagina]         = useState(1);

  // Estados de venta
  const [cargando,         setCargando]         = useState(false);
  const [resultado,        setResultado]        = useState<"exito" | "error" | null>(null);
  const [mensajeError,     setMensajeError]     = useState("");
  const [efectivoRecibido, setEfectivoRecibido] = useState("");
  const [ticketVenta,      setTicketVenta]      = useState<any | null>(null);
  const [imprimirTicket,   setImprimirTicket]   = useState(true);
  const [tabMobile,        setTabMobile]        = useState<"catalogo" | "carrito">("catalogo");
  const [scannerAbierto, setScannerAbierto] = useState(false);
  
  // Refs
  const gridContainerRef   = useRef<HTMLDivElement>(null);
  const gridRef            = useRef<any>(null);
  const busquedaRef        = useRef("");
  const categoriaActivaRef = useRef<string | null>(null);
  const productosInicialesRef = useRef(productosIniciales);

  const [gridWidth,  setGridWidth]  = useState(800); // valor inicial razonable, se corrige en useEffect
  const [gridHeight, setGridHeight] = useState(600);

  // ── Columnas dinámicas ──────────────────────────────────────────────────────

  const columnCount = Math.max(2, Math.floor((gridWidth - GAP) / (MIN_CARD_WIDTH + GAP)));
  const cardWidth   = Math.floor((gridWidth - GAP * (columnCount + 1)) / columnCount);

  // ── FIX 2: useEffect con retry de 100 ms para que el layout termine ────────

  // Prefetch de todas las categorías en background al montar
  useEffect(() => {
    const prefetchCategorias = async () => {
      for (const cat of categorias) {
        const cacheKey = `${cat.id}|`;
        if (_productosCache[cacheKey]) continue; // ya cacheado
        // Esperar un poco entre requests para no saturar la DB
        await new Promise(r => setTimeout(r, 400));
        try {
          const params = new URLSearchParams({
            modo: "pos", activos: "true", page: "1", pageSize: "100",
            categoriaId: cat.id,
          });
          const res  = await fetch(`/api/productos?${params}`);
          const data = await res.json();
          if (data.ok) {
            _productosCache[cacheKey] = { productos: data.productos || [], ts: Date.now() };
          }
        } catch { /* silencioso */ }
      }
    };
    // Delay inicial para no competir con el render principal
    const t = setTimeout(prefetchCategorias, 1500);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = gridContainerRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width  > 50) setGridWidth(width);
        if (height > 50) setGridHeight(height);  // ignorar mediciones espurias de 0
      }
    });

    ro.observe(el);

    // Medición inicial con fallback al padre si el propio elemento mide 0
    const measureEl = () => {
      const w = el.offsetWidth  || el.parentElement?.offsetWidth  || 800;
      const h = el.offsetHeight || el.parentElement?.offsetHeight || 600;
      if (w > 50) setGridWidth(w);
      if (h > 50) setGridHeight(h);
    };

    measureEl();
    // Retry por si el layout flex no terminó aún
    setTimeout(measureEl, 0);
    setTimeout(measureEl, 100);

    return () => ro.disconnect();
  }, []);

  // ── Búsqueda remota con debounce ────────────────────────────────────────────
  // Usamos refs para busqueda/categoria para evitar closures obsoletos en debounce

  // AbortController para cancelar requests anteriores
  const abortRef = useRef<AbortController | null>(null);

  const buscarProductosRemoto = useRef(
    debounce(async (termino: string, categoria: string | null) => {
      // Sin filtros: volver a productos iniciales sin fetch
      if (!termino && !categoria) {
        abortRef.current?.abort();
        setProductos(productosInicialesRef.current);
        setBuscandoRemoto(false);
        setHayMas(true);
        setPagina(1);
        return;
      }

      // Cache hit — respuesta instantánea
      const cacheKey = `${categoria ?? ""}|${termino}`;
      const cached = _productosCache[cacheKey];
      if (cached && Date.now() - cached.ts < CACHE_TTL) {
        setProductos(cached.productos);
        setHayMas(false);
        setPagina(1);
        return;
      }

      // Cancelar request anterior si sigue en vuelo
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setBuscandoRemoto(true);
      try {
        const params = new URLSearchParams({
          modo: "pos",
          activos: "true",
          page: "1",
          pageSize: "100",
        });
        if (termino)   params.set("busqueda",    termino);
        if (categoria) params.set("categoriaId", categoria);

        const res  = await fetch(`/api/productos?${params}`, {
          signal: abortRef.current.signal,
        });
        const data = await res.json();

        if (data.ok) {
          const prods = data.productos || [];
          _productosCache[cacheKey] = { productos: prods, ts: Date.now() };
          setProductos(prods);
          setHayMas(false);
          setPagina(1);
        }
      } catch (error: any) {
        if (error?.name !== "AbortError") {
          console.error("Error búsqueda:", error);
        }
      } finally {
        setBuscandoRemoto(false);
      }
    }, 300)
  ).current;

  // ── Scroll infinito ─────────────────────────────────────────────────────────

  const cargarMasProductos = useCallback(async () => {
    if (cargandoMas || !hayMas || busqueda || categoriaActiva) return;

    setCargandoMas(true);
    try {
      const params = new URLSearchParams({
        modo: "pos",
        activos: "true",
        page: String(pagina + 1),
        pageSize: "30",
      });

      const res  = await fetch(`/api/productos?${params}`);
      const data = await res.json();

      if (data.ok && data.productos?.length > 0) {
        setProductos((prev) => [...prev, ...data.productos]);
        setHayMas(data.meta?.hasNext || false);
        setPagina((prev) => prev + 1);
      } else {
        setHayMas(false);
      }
    } catch (error) {
      console.error("Error cargando más:", error);
    } finally {
      setCargandoMas(false);
    }
  }, [cargandoMas, hayMas, pagina, busqueda, categoriaActiva]);

  // ── Handlers de búsqueda / categoría ───────────────────────────────────────

  const handleBusqueda = useCallback((valor: string) => {
    busquedaRef.current = valor;
    setBusqueda(valor);
    buscarProductosRemoto(valor, categoriaActivaRef.current);
  }, [buscarProductosRemoto]);

  const handleCategoriaChange = useCallback((catId: string | null) => {
    categoriaActivaRef.current = catId;
    setCategoriaActiva(catId);
    buscarProductosRemoto(busquedaRef.current, catId);
  }, [buscarProductosRemoto]);

  // ── Carrito ─────────────────────────────────────────────────────────────────

  const agregarAlCarrito = useCallback((producto: ProductoConCategoria) => {
    setCarrito((prev) => {
      const existente = prev.find((i) => i.productoId === producto.id);
      if (existente) {
        if (existente.cantidad >= producto.stock) return prev;
        return prev.map((i) =>
          i.productoId === producto.id
            ? { ...i, cantidad: i.cantidad + 1, subtotal: (i.cantidad + 1) * i.precio }
            : i,
        );
      }
      return [
        ...prev,
        {
          productoId: producto.id,
          nombre:     producto.nombre,
          precio:     producto.precio,
          cantidad:   1,
          subtotal:   producto.precio,
          stock:      producto.stock,
          imagen:     producto.imagen,
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
        .filter(Boolean),
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


    const handleCodigoEscaneado = useCallback((codigo: string) => {
    const producto = productos.find(
      p => p.codigoBarras === codigo || p.codigoProducto === codigo
    );
    if (producto) {
      agregarAlCarrito(producto);
    } else {
      setBusqueda(codigo);
      buscarProductosRemoto(codigo, null);
      setScannerAbierto(false);
    }
  }, [productos, agregarAlCarrito, buscarProductosRemoto]);
  // ── Totales ─────────────────────────────────────────────────────────────────

  const subtotal      = carrito.reduce((acc, i) => acc + i.subtotal, 0);
  const total         = Math.max(0, subtotal - descuento);
  const cantidadTotal = carrito.reduce((a, i) => a + i.cantidad, 0);
  const vuelto        =
    metodoPago === "efectivo" && efectivoRecibido
      ? parseFloat(efectivoRecibido) - total
      : 0;

  // ── Venta ───────────────────────────────────────────────────────────────────

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
            cantidad:   i.cantidad,
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
            id:           data.data?.id ?? "000000",
            createdAt:    data.data?.createdAt ?? new Date().toISOString(),
            total,
            subtotal,
            descuento,
            metodoPago,
            clienteNombre: clienteNombre.trim() || null,
            usuarioNombre: data.data?.usuarioNombre ?? null,
            items: carrito.map((i) => ({
              nombre:    i.nombre,
              cantidad:  i.cantidad,
              precioUnit: i.precio,
              subtotal:  i.subtotal,
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

  // ── FIX 3: Cell con useCallback + dependencias correctas ───────────────────
  // Así react-window NO desmonta/monta las celdas en cada render del padre.

  const Cell = useCallback(
    ({ columnIndex, rowIndex, style }: { columnIndex: number; rowIndex: number; style: React.CSSProperties }) => {
      const index = rowIndex * columnCount + columnIndex;

      if (index >= productos.length) return <div style={style} />;

      const producto   = productos[index];
      const enCarrito  = carrito.find((i) => i.productoId === producto.id);
      const stockBajo  = producto.stock <= producto.stockMinimo;

      return (
        <div style={{ ...style, padding: GAP / 2, boxSizing: 'border-box' }}>
          <button
            onClick={() => agregarAlCarrito(producto)}
            className="relative flex flex-col rounded-xl p-2.5 text-left transition-all active:scale-95 w-full h-full overflow-hidden"
            style={{
              background: enCarrito ? "rgba(220,38,38,0.12)" : "var(--bg-card)",
              border:     enCarrito ? "1px solid rgba(220,38,38,0.4)" : "1px solid var(--border-base)",
            }}
            onMouseEnter={(e) => {
              if (!enCarrito)
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border-strong)";
            }}
            onMouseLeave={(e) => {
              if (!enCarrito)
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border-base)";
            }}
          >
            {/* Imagen */}
            <div
              className="mb-2 flex items-center justify-center rounded-lg overflow-hidden w-full flex-shrink-0"
              style={{ background: "var(--bg-hover-md)", height: "72px" }}
            >
              {producto.imagen ? (
                <img
                  src={producto.imagen.replace("/upload/", "/upload/f_auto,q_auto,w_200/")}
                  alt={producto.nombre}
                  loading="lazy"
                  className="h-full w-full object-cover rounded-lg"
                />
              ) : (
                <Package className="h-6 w-6" style={{ color: "var(--text-muted)" }} />
              )}
            </div>

            <p
              className="text-xs font-semibold line-clamp-2 leading-tight mb-1"
              style={{ color: "var(--text-primary)" }}
            >
              {producto.nombre}
            </p>
            <p className="text-sm font-bold text-red-400 mt-1">{formatPrecio(producto.precio)}</p>

            {/* Badge stock bajo */}
            {stockBajo && (
              <span
                className="absolute top-2 right-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                style={{
                  background: "rgba(245,158,11,0.15)",
                  color:      "#fbbf24",
                  border:     "1px solid rgba(245,158,11,0.3)",
                }}
              >
                {producto.stock}
              </span>
            )}

            {/* Badge cantidad en carrito */}
            {enCarrito && (
              <span
                className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-white"
                style={{ background: "#DC2626", boxShadow: "0 0 0 2px var(--bg-card)" }}
              >
                {enCarrito.cantidad}
              </span>
            )}
          </button>
        </div>
      );
    },
    // dependencias: lo que usa Cell
    [columnCount, cardWidth, productos, carrito, agregarAlCarrito],
  );

  // ── Panel Catálogo ──────────────────────────────────────────────────────────

  const itemCount  = hayMas ? productos.length + 30 : productos.length;
  const rowCount   = Math.ceil(itemCount / columnCount);

  const panelCatalogo = (
    <div className="flex flex-col h-full min-w-0 overflow-hidden" style={{ background: "var(--bg-base)" }}>

      {/* Buscador */}
      <div
        className="p-3 md:p-4 border-b flex-shrink-0"
        style={{ background: "var(--bg-surface)", borderColor: "var(--border-base)" }}
      >
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
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
          {/* Botón scanner */}
          <button
            onClick={() => {
              console.log("🔍 click scanner");
              setScannerAbierto(true)}}
            className="flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
            style={{
              background: "var(--bg-hover-md)",
              border: "1px solid var(--border-md)",
              color: "var(--text-secondary)",
            }}
            title="Escanear código de barras"
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(220,38,38,0.4)";
              (e.currentTarget as HTMLElement).style.color = "#DC2626";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--border-md)";
              (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
            }}
          >
            <ScanLine className="h-4 w-4" />
          </button>
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
              !categoriaActiva ? "bg-red-600 text-white" : "",
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
                categoriaActiva === cat.id ? "bg-red-600 text-white" : "",
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

      {/* Grid Virtualizado */}
      <div className="flex-1 relative" style={{ minHeight: 0, overflow: "hidden" }} ref={gridContainerRef}>
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
          <InfiniteLoader
            isItemLoaded={(index) => !hayMas || index < productos.length}
            itemCount={itemCount}
            loadMoreItems={cargarMasProductos}
            threshold={5}
          >
            {({ onItemsRendered }) => (
              <Grid
                ref={gridRef}
                columnCount={columnCount}
                columnWidth={cardWidth + GAP}
                height={gridHeight}
                rowCount={rowCount}
                rowHeight={CARD_HEIGHT}
                width={gridWidth}
                  onItemsRendered={(gridProps: any) => {
                    (onItemsRendered as any)({
                      visibleStartIndex: gridProps.visibleRowStartIndex * columnCount,
                      visibleStopIndex: gridProps.visibleRowStopIndex * columnCount + columnCount - 1,
                    });
                  }}
                  style={{ overflowX: "hidden" }}
                >
                  {Cell}
                </Grid>
              )}
          </InfiniteLoader>
        )}

        {/* Indicador carga al final */}
        {cargandoMas && (
          <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full z-10"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-md)",
              boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
              color: "var(--text-secondary)",
            }}
          >
            <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: "#DC2626" }} />
            <span className="text-xs font-medium">Cargando productos...</span>
          </div>
        )}
      </div>
    </div>
  );

  // ── Panel Carrito ───────────────────────────────────────────────────────────

  const panelCarrito = (
    <div className="flex flex-col h-full" style={{ background: "var(--bg-surface)" }}>

      {/* Header */}
      <div
        className="hidden md:flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: "var(--border-base)" }}
      >
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
          <span className="font-semibold" style={{ color: "var(--text-primary)" }}>Carrito</span>
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
            <div
              className="h-16 w-16 rounded-full flex items-center justify-center mb-4"
              style={{ background: "var(--bg-hover)" }}
            >
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
                    onMouseEnter={(e) => { if (!e.currentTarget.disabled) (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-secondary)")}
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-sm font-bold w-16 md:w-20 text-right"
                    style={{ color: "var(--text-primary)" }}
                  >
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

      {/* Footer: totales + pago */}
      {carrito.length > 0 && (
        <div
          className="border-t p-3 md:p-4 space-y-3 flex-shrink-0"
          style={{ borderColor: "var(--border-base)" }}
        >
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

          {/* Métodos de pago */}
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>Método de pago</p>
            <div className="grid grid-cols-5 gap-1.5">
              {METODOS_PAGO.map((mp) => {
                const Icon   = mp.icono;
                const activo = metodoPago === mp.value;
                return (
                  <button
                    key={mp.value}
                    onClick={() => setMetodoPago(mp.value)}
                    className="flex flex-col items-center gap-1 py-2 rounded-lg text-center transition-colors"
                    style={{
                      background: activo ? "rgba(220,38,38,0.15)" : "var(--bg-hover)",
                      border:     activo ? "1px solid rgba(220,38,38,0.4)" : "1px solid var(--border-base)",
                      color:      activo ? "#f87171" : "var(--text-muted)",
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

          {/* Totales */}
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

          {/* Checkbox ticket */}
          <label
            className="flex items-center gap-2.5 cursor-pointer select-none py-1"
            onClick={() => setImprimirTicket((v) => !v)}
          >
            <div
              className="flex h-4 w-4 items-center justify-center rounded flex-shrink-0"
              style={{
                background: imprimirTicket ? "#DC2626" : "transparent",
                border:     imprimirTicket ? "1px solid #DC2626" : "1px solid var(--border-strong)",
              }}
            >
              {imprimirTicket && (
                <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 12 12" stroke="#ffffff" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                </svg>
              )}
            </div>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Generar ticket de venta</span>
          </label>

          {/* Feedback */}
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

          {/* Botón cobrar */}
          <button
            onClick={handleVenta}
            disabled={cargando || carrito.length === 0 || resultado === "exito"}
            className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "#DC2626", color: "#ffffff" }}
            onMouseEnter={(e) => { if (!cargando) (e.currentTarget as HTMLElement).style.background = "#B91C1C"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#DC2626"; }}
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

 // ── Layout ──────────────────────────────────────────────────────────────────

  const alturaBase = isModal ? "h-full" : "h-[calc(100vh-3.5rem)]";

  return (
    <>
      {/* DESKTOP */}
      <div className={cn("hidden md:flex overflow-hidden", alturaBase, !isModal && "-m-4 md:-m-6")}>
        <div
          className="flex flex-col flex-1 min-w-0 overflow-hidden"
          style={{ borderRight: "1px solid var(--border-base)" }}
        >
          {panelCatalogo}
        </div>
        <div className="flex flex-col w-80 xl:w-96 flex-shrink-0 overflow-hidden">
          {panelCarrito}
        </div>
      </div>

      {/* MOBILE */}
      <div className={cn("flex flex-col md:hidden overflow-hidden", alturaBase, !isModal && "-mx-4")}>
        <div
          className="flex flex-shrink-0"
          style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border-base)" }}
        >
          <button
            onClick={() => setTabMobile("catalogo")}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors"
            style={{
              color:        tabMobile === "catalogo" ? "#f87171" : "#71717a",
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
              color:        tabMobile === "carrito" ? "#f87171" : "#71717a",
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
          {tabMobile === "carrito"  && panelCarrito}
        </div>

        {tabMobile === "catalogo" && cantidadTotal > 0 && (
          <div
            className="flex-shrink-0 p-3 border-t"
            style={{ background: "var(--bg-surface)", borderColor: "var(--border-base)" }}
          >
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

      {/* FAB scanner — solo mobile */}
      {tabMobile === "catalogo" && (
        <button
          onClick={() => setScannerAbierto(true)}
          className="fixed bottom-24 right-4 md:hidden flex h-12 w-12 items-center justify-center rounded-full z-40"
          style={{ background: "#DC2626", color: "#fff", boxShadow: "0 4px 20px rgba(220,38,38,0.4)" }}
        >
          <ScanLine className="h-5 w-5" />
        </button>
      )}

      {/* Scanner modal */}
      {scannerAbierto && (
        <BarcodeScanner
          onScanned={handleCodigoEscaneado}
          onClose={() => setScannerAbierto(false)}
        />
      )}

      {/* Ticket */}
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