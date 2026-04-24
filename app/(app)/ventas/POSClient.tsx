"use client";
// app/(app)/ventas/POSClient.tsx
// OPTIMIZADO con react-window para 1500+ productos

import { useState, useCallback, useEffect, useRef, useLayoutEffect } from "react";
import { debounce } from "lodash";
import InfiniteLoader from "react-window-infinite-loader";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Grid = require("react-window").FixedSizeGrid;
import {
  ShoppingCart, Search, X, Plus, Minus, Trash2,
  CreditCard, Banknote, Smartphone, QrCode, ChevronRight,
  Package, CheckCircle2, AlertCircle, Tag, Loader2,
  ScanLine, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPrecio } from "@/lib/utils";
import TicketPrint from "@/components/ventas/TicketPrint";
import BarcodeScanner from "@/components/ventas/BarcodeScanner";
import { ModalFacturaPDF } from "@/components/ventas/ModalFacturaPDF";
import { ModalSeleccionFactura, DatosFactura } from "@/components/ventas/ModalSeleccionFactura";
import { useConfigAFIP } from "@/hooks/UseConfigAFIP";
import { ModalCrearProductoRapido } from "@/components/ventas/ModalCrearProductoRapido";
import { fechaHoyAR, horaAhoraAR } from "@/lib/dateAR";
import { useToast } from "@/components/toast";


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
  tieneVariantes?: boolean;
  unidad: string | null;

};

type CategoriaSimple = { id: string; nombre: string; hijas?: CategoriaSimple[] };

type Variante = {
  id: string;
  talle: string | null;
  color: string;
  stock: number;
  precio: number | null;
};

type ItemCarrito = {
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

type TicketVenta = {
  id: string;
  createdAt: string;
  total: number;
  subtotal: number;
  descuento: number;
  metodoPago: string;
  clienteNombre: string | null;
  usuarioNombre: string | null;
  items: { nombre: string; cantidad: number; precioUnit: number; subtotal: number }[];
};

type Usuario = { id: string; nombre: string; supabaseId: string; activo: boolean };

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
const CARD_HEIGHT    = 200;
const GAP            = 6;

// Cache de productos por clave (categoría + búsqueda) — persiste entre renders
const _productosCache: Record<string, { productos: ProductoConCategoria[]; ts: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 min

function ModalVariante({ producto, variantes, cargando, onConfirmar, onCerrar }: {
  producto: ProductoConCategoria;
  variantes: Variante[];
  cargando: boolean;
  onConfirmar: (variante: Variante) => void;
  onCerrar: () => void;
}) {
  const talles  = [...new Set(variantes.map(v => v.talle).filter(Boolean))] as string[];
  const colores = [...new Set(variantes.map(v => v.color).filter(Boolean))];

  const [talleSeleccionado, setTalleSeleccionado] = useState<string | null>(talles[0] ?? null);
  const [colorSeleccionado, setColorSeleccionado] = useState<string | null>(colores[0] ?? null);

  const varianteSeleccionada = variantes.find(v =>
    (talles.length === 0 || v.talle === talleSeleccionado) && v.color === colorSeleccionado
  );
  const precioMostrar = varianteSeleccionada?.precio ?? producto.precio;
  const stockMostrar  = varianteSeleccionada?.stock ?? 0;
  const coloresDisponibles = talleSeleccionado
    ? [...new Set(variantes.filter(v => v.talle === talleSeleccionado).map(v => v.color))]
    : colores;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} onClick={onCerrar}>
      <div className="w-full max-w-sm rounded-2xl p-5 space-y-4"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border-base)" }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {producto.imagen && (
              <img src={producto.imagen} alt={producto.nombre}
                className="h-12 w-12 rounded-lg object-cover flex-shrink-0"
                style={{ border: "1px solid var(--border-base)" }} />
            )}
            <div>
              <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{producto.nombre}</h3>
              <p className="text-sm font-semibold text-red-400">{formatPrecio(precioMostrar)}</p>
            </div>
          </div>
          <button onClick={onCerrar} style={{ color: "var(--text-faint)" }}><X className="h-5 w-5" /></button>
        </div>

        {cargando ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--text-muted)" }} />
          </div>
        ) : (
          <>
            {talles.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>Talle</p>
                <div className="flex flex-wrap gap-2">
                  {talles.map(talle => {
                    const disponible = variantes.some(v => v.talle === talle && v.stock > 0);
                    const activo     = talleSeleccionado === talle;
                    return (
                      <button key={talle}
                        onClick={() => {
                          setTalleSeleccionado(talle);
                          const coloresParaTalle = variantes.filter(v => v.talle === talle).map(v => v.color);
                          if (colorSeleccionado && !coloresParaTalle.includes(colorSeleccionado))
                            setColorSeleccionado(coloresParaTalle[0] ?? null);
                        }}
                        disabled={!disponible}
                        className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ background: activo ? "#DC2626" : "var(--bg-hover-md)", color: activo ? "#ffffff" : "var(--text-secondary)", border: activo ? "1px solid #DC2626" : "1px solid var(--border-base)" }}>
                        {talle}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {colores.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>Color</p>
                <div className="flex flex-wrap gap-2">
                  {coloresDisponibles.map(color => {
                    const disponible = variantes.some(v => v.color === color && (talles.length === 0 || v.talle === talleSeleccionado) && v.stock > 0);
                    const activo = colorSeleccionado === color;
                    return (
                      <button key={color} onClick={() => setColorSeleccionado(color)} disabled={!disponible}
                        className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ background: activo ? "#DC2626" : "var(--bg-hover-md)", color: activo ? "#ffffff" : "var(--text-secondary)", border: activo ? "1px solid #DC2626" : "1px solid var(--border-base)" }}>
                        {color}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="rounded-lg px-3 py-2 text-sm" style={{ background: "var(--bg-hover)", border: "1px solid var(--border-base)" }}>
              {varianteSeleccionada
                ? <p style={{ color: stockMostrar > 0 ? "var(--text-secondary)" : "#f87171" }}>{stockMostrar > 0 ? `Stock disponible: ${stockMostrar}` : "Sin stock para esta combinación"}</p>
                : <p style={{ color: "var(--text-faint)" }}>Seleccioná talle y color</p>
              }
            </div>

            <button onClick={() => varianteSeleccionada && stockMostrar > 0 && onConfirmar(varianteSeleccionada)}
              disabled={!varianteSeleccionada || stockMostrar === 0}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "#DC2626", color: "#ffffff" }}>
              <ShoppingCart className="h-4 w-4" />
              Agregar al carrito — {formatPrecio(precioMostrar)}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const UNIDADES_PESO = ["kg", "g", "gr", "gramo", "kilo", "litro", "lt", "l"];

function esPorPeso(unidad: string | null | undefined) {
  return UNIDADES_PESO.includes((unidad ?? "").toLowerCase().trim());
}

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

  const toast = useToast();

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
  const [ticketVenta,      setTicketVenta]      = useState<TicketVenta | null>(null);
  const [imprimirTicket, setImprimirTicket] = useState(() => {
    if (typeof window === "undefined") return true;
    const guardado = localStorage.getItem("pos_imprimir_ticket");
    return guardado === null ? true : guardado === "true";
  });
  const [tabMobile,        setTabMobile]        = useState<"catalogo" | "carrito">("catalogo");
  const [scannerAbierto,   setScannerAbierto]   = useState(false);
  const [descuentoPct,    setDescuentoPct]    = useState(0);
  const [ajusteRedondeo,  setAjusteRedondeo]  = useState(0);
  const [recargo,         setRecargo]         = useState(0);
  const [recargoPct,      setRecargoPct]      = useState(0);

  // Refs
  const gridContainerRef      = useRef<HTMLDivElement>(null);
  const gridRef               = useRef<unknown>(null);
  const busquedaRef           = useRef("");
  const categoriaActivaRef    = useRef<string | null>(null);
  const productosInicialesRef = useRef(productosIniciales);

  const [gridWidth,  setGridWidth]  = useState(1200);
  const [gridHeight, setGridHeight] = useState(750);

  const [generarFactura,      setGenerarFactura]      = useState(false);
  const [comprobanteGenerado, setComprobanteGenerado] = useState<string | null>(null);
  const [modalFacturaAbierto, setModalFacturaAbierto] = useState(false);

  const [productoEditando, setProductoEditando] = useState<ProductoConCategoria | null>(null);
  const [editando,         setEditando]         = useState(false);
  const [formEdicion,      setFormEdicion]      = useState({ stock: "", precio: "", nombre: "", codigoProducto: "" });

  // Vendedor
  const [usuarios,   setUsuarios]   = useState<Usuario[]>([]);
  const [vendedorId, setVendedorId] = useState<string>("");

  // Fecha manual
  const [fechaManual, setFechaManual] = useState(false);
  const [fechaVenta,  setFechaVenta]  = useState(fechaHoyAR);

  // Item manual
  const [itemManualNombre, setItemManualNombre] = useState("");
  const [itemManualPrecio, setItemManualPrecio] = useState("");

  const [modalCrearProducto, setModalCrearProducto] = useState(false);
  const [opcionesAbiertas,   setOpcionesAbiertas]   = useState(false);

  //Variante
  const [modalVariante,     setModalVariante]     = useState<ProductoConCategoria | null>(null);
  const [variantesModal,    setVariantesModal]    = useState<Variante[]>([]);
  const [cargandoVariantes, setCargandoVariantes] = useState(false);

  //PESO
  const [modalPeso, setModalPeso] = useState<ProductoConCategoria | null>(null);
  const [pesoIngresado, setPesoIngresado] = useState("");
  const [precioAjustado, setPrecioAjustado] = useState<string>("");

  // ── Columnas dinámicas ──────────────────────────────────────────────────────

  const columnCount   = Math.max(2, Math.min(8, Math.floor(gridWidth / (MIN_CARD_WIDTH + GAP))));
  const totalGapWidth = GAP * (columnCount + 1);
  const cardWidth     = Math.floor((gridWidth - totalGapWidth) / columnCount);

  useEffect(() => {
    fetch("/api/usuarios")
      .then(r => r.json())
      .then(d => { if (d.ok) setUsuarios(d.data.filter((u: Usuario) => u.activo)); })
      .catch(() => {});
  }, []);

  // Prefetch de todas las categorías en background al montar
  useEffect(() => {
    const prefetchCategorias = async () => {
      for (const cat of categorias) {
        const cacheKey = `${cat.id}|`;
        if (_productosCache[cacheKey]) continue;
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
    const t = setTimeout(prefetchCategorias, 1500);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    const updateSize = () => {
      const el = gridContainerRef.current;
      if (!el) return;
      const rect    = el.getBoundingClientRect();
      const offsetW = el.offsetWidth;
      const offsetH = el.offsetHeight;
      const clientW = el.clientWidth;
      const clientH = el.clientHeight;
      const w = Math.floor(Math.min(rect.width || 9999, offsetW || 9999, clientW || 9999, 1200));
      const h = Math.floor(rect.height || offsetH || clientH || 0);
      if (w > 100) setGridWidth(w);
      if (h > 100) setGridHeight(h);
    };

    requestAnimationFrame(updateSize);
    const timers = [0, 50, 100, 200, 400, 800].map(delay =>
      setTimeout(() => requestAnimationFrame(updateSize), delay)
    );
    const el = gridContainerRef.current;
    let ro: ResizeObserver | null = null;
    if (el) {
      ro = new ResizeObserver((entries) => {
        requestAnimationFrame(() => {
          for (const entry of entries) {
            const w = Math.floor(entry.contentRect.width);
            const h = Math.floor(entry.contentRect.height);
            if (w > 100) setGridWidth(w);
            if (h > 100) setGridHeight(h);
          }
        });
      });
      ro.observe(el);
    }
    const handleResize = () => requestAnimationFrame(updateSize);
    window.addEventListener("resize", handleResize);
    return () => {
      timers.forEach(clearTimeout);
      ro?.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (!isModal) return;
    const timers = [100, 300].map(delay =>
      setTimeout(() => {
        const el = gridContainerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        if (rect.width  > 100) setGridWidth(Math.floor(rect.width));
        if (rect.height > 100) setGridHeight(Math.floor(rect.height));
      }, delay)
    );
    return () => timers.forEach(clearTimeout);
  }, [isModal]);

  useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    // Ignorar si el foco está en un input, textarea o select
    const tag = (e.target as HTMLElement).tagName;
    const enInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

    // Escape — cerrar modales en orden de prioridad
    if (e.key === "Escape") {
      if (scannerAbierto)       { setScannerAbierto(false);    return; }
      if (modalFacturaAbierto)  { setModalFacturaAbierto(false); return; }
      if (productoEditando)     { setProductoEditando(null);   return; }
      if (modalCrearProducto)   { setModalCrearProducto(false); return; }
    }

    // Enter — confirmar venta (solo si no está en un input y hay items en el carrito)
    if (e.key === "Enter" && !enInput) {
      if (carrito.length > 0 && !cargando && resultado !== "exito") {
        e.preventDefault();
        handleVenta();
      }
    }
  };

  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}, [
  scannerAbierto, modalFacturaAbierto, productoEditando,
  modalCrearProducto, carrito, cargando, resultado,
]);
  // ── Búsqueda remota con debounce ────────────────────────────────────────────

  const abortRef = useRef<AbortController | null>(null);

  const buscarProductosRemoto = useRef(
    debounce(async (termino: string, categoria: string | null) => {
      if (!termino && !categoria) {
        abortRef.current?.abort();
        setProductos(productosInicialesRef.current);
        setBuscandoRemoto(false);
        setHayMas(true);
        setPagina(1);
        return;
      }
      const cacheKey = `${categoria ?? ""}|${termino}`;
      const cached   = _productosCache[cacheKey];
      if (cached && Date.now() - cached.ts < CACHE_TTL) {
        setProductos(cached.productos);
        setHayMas(false);
        setPagina(1);
        return;
      }
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      setBuscandoRemoto(true);
      try {
        const params = new URLSearchParams({ modo: "pos", activos: "true", page: "1", pageSize: "100" });
        if (termino)   params.set("busqueda",    termino);
        if (categoria) params.set("categoriaId", categoria);
        const res  = await fetch(`/api/productos?${params}`, { signal: abortRef.current.signal });
        const data = await res.json();
        if (data.ok) {
          const prods = data.productos || [];
          _productosCache[cacheKey] = { productos: prods, ts: Date.now() };
          setProductos(prods);
          setHayMas(false);
          setPagina(1);
        }
      } catch (error: unknown) {
        if ((error as { name?: string })?.name !== "AbortError") {
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
        modo: "pos", activos: "true",
        page: String(pagina + 1), pageSize: "30",
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
    if (producto.stock <= 0 && !producto.tieneVariantes) return;

    
    if (producto.tieneVariantes) {
    setModalVariante(producto);
    setCargandoVariantes(true);
    fetch(`/api/productos/${producto.id}/variantes`)
      .then(r => r.json())
      .then(data => { if (data.ok) setVariantesModal(data.data); })
      .catch(() => toast.error("Error al cargar variantes"))
      .finally(() => setCargandoVariantes(false));
    return;
  }
    if (esPorPeso(producto.unidad)) {
      setModalPeso(producto);
      setPesoIngresado("");
      setPrecioAjustado("");
      return;
    }
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
          carritoKey: producto.id,  // ← agregar (productos normales no se repiten)
          nombre:     producto.nombre,
          precio:     producto.precio,
          cantidad:   1,
          subtotal:   producto.precio,
          stock:      producto.stock,
          imagen:     producto.imagen,
        },
      ];
    });
  }, [toast]);


  const agregarVarianteAlCarrito = useCallback((producto: ProductoConCategoria, variante: Variante) => {
  const precio = variante.precio ?? producto.precio;
  const clave  = `${producto.id}_${variante.id}`;
  const nombre = [producto.nombre, variante.talle, variante.color].filter(Boolean).join(" — ");

  setCarrito((prev) => {
    const existente = prev.find(i => i.varianteId === variante.id);
    if (existente) {
      if (existente.cantidad >= variante.stock) return prev;
      return prev.map(i => i.varianteId === variante.id
        ? { ...i, cantidad: i.cantidad + 1, subtotal: (i.cantidad + 1) * i.precio }
        : i
      );
    }
    return [...prev, {
      productoId: clave, varianteId: variante.id, nombre, precio,carritoKey: clave,
      cantidad: 1, subtotal: precio, stock: variante.stock,
      imagen: producto.imagen, talle: variante.talle, color: variante.color,
    }];
  });

  setModalVariante(null);
  setVariantesModal([]);
}, []);

  const cambiarCantidad = useCallback((carritoKey: string, delta: number) => {
    setCarrito((prev) =>
      prev
        .map((i) => {
          if (i.carritoKey !== carritoKey) return i;  // ← cambiar
          const nuevaCantidad = i.cantidad + delta;
          if (nuevaCantidad <= 0) return null as unknown as ItemCarrito;
          if (nuevaCantidad > i.stock) return i;
          return { ...i, cantidad: nuevaCantidad, subtotal: nuevaCantidad * i.precio };
        })
        .filter(Boolean),
    );
  }, []);

  const eliminarDelCarrito = useCallback((carritoKey: string) => {
    setCarrito((prev) => prev.filter((i) => i.carritoKey !== carritoKey));
  }, []);

  const limpiarCarrito = useCallback(() => {
    setCarrito([]);
    setDescuento(0);
    setClienteNombre("");
    setEfectivoRecibido("");
    setVendedorId("");
    setFechaManual(false);
    setFechaVenta("");
    setItemManualNombre("");
    setItemManualPrecio("");
    setDescuentoPct(0);
    setAjusteRedondeo(0);
    setRecargo(0);
    setRecargoPct(0);
  }, []);

  const handleCodigoEscaneado = useCallback((codigo: string) => {
    const producto = productos.find(
      p => p.codigoBarras === codigo || p.codigoProducto === codigo
    );
    if (producto) {
      agregarAlCarrito(producto);
      toast.success(`${producto.nombre} agregado`, `Stock restante: ${producto.stock - 1}`);
    } else {
      setBusqueda(codigo);
      buscarProductosRemoto(codigo, null);
      setScannerAbierto(false);
      toast.info("Buscando producto...", `Código: ${codigo}`);
    }
  }, [productos, agregarAlCarrito, buscarProductosRemoto, toast]);

  // ── Totales ─────────────────────────────────────────────────────────────────

  const subtotal      = carrito.reduce((acc, i) => acc + i.subtotal, 0);
  const total         = Math.max(0, subtotal + recargo - descuento);
  const cantidadTotal = carrito.reduce((a, i) => a + i.cantidad, 0);
  const vuelto        =
    metodoPago === "efectivo" && efectivoRecibido
      ? parseFloat(efectivoRecibido) - total
      : 0;

  const { config: configAFIP } = useConfigAFIP();

  // ── Venta ───────────────────────────────────────────────────────────────────

  async function handleVenta(datosFacturaParam?: DatosFactura | null) {
    if (carrito.length === 0) return;

    if (generarFactura && !datosFacturaParam) {
      setModalFacturaAbierto(true);
      return;
    }

    setCargando(true);
    setResultado(null);
    setMensajeError("");

    // Toast de loading
    const toastId = toast.loading("Registrando venta...");

    try {
      const res = await fetch("/api/ventas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: carrito.map((i) => ({
            productoId:  i.varianteId ? i.productoId.split("_")[0] : i.productoId,
              varianteId:  i.varianteId,
              cantidad:    i.cantidad,
              precioUnit:  i.precio,
              talle:       i.talle,
              color:       i.color,
              ...(i.productoId.startsWith("manual_") && { nombre: i.nombre }),
            })),
          metodoPago,
          descuento,
          recargo,
          clienteNombre:  clienteNombre.trim() || undefined,
          vendedorId:     vendedorId || undefined,
          vendedorNombre: usuarios.find(u => u.supabaseId === vendedorId)?.nombre || undefined,
          fechaManual:    fechaManual && fechaVenta ? fechaVenta : undefined,
        }),
      });

      if (res.status === 401) {
        toast.update(toastId, { type: "error", title: "Sesión expirada", description: "Iniciá sesión nuevamente" });
        window.location.href = `/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`;
        return;
      }

      const data = await res.json();

      if (!data.ok) {
        const msg = data.error ?? "Error al registrar la venta";
        setMensajeError(msg);
        setResultado("error");
        toast.update(toastId, { type: "error", title: "Error en la venta", description: msg });
      } else {
        setResultado("exito");
        const ventaId = data.data?.id;

        // Construir descripción del toast de éxito
        const metodosLabel: Record<string, string> = {
          efectivo: "Efectivo", debito: "Débito", credito: "Crédito",
          transferencia: "Transferencia", qr: "QR / MP",
        };
        const descToast = [
          formatPrecio(total),
          metodosLabel[metodoPago] ?? metodoPago,
          clienteNombre.trim() ? `· ${clienteNombre.trim()}` : "",
          descuento > 0 ? `· Desc. ${formatPrecio(descuento)}` : "",
        ].filter(Boolean).join(" ");

        toast.update(toastId, { type: "success", title: "¡Venta registrada!", description: descToast });

        if (imprimirTicket) {
          setTicketVenta({
            id:            ventaId ?? "000000",
            createdAt:     data.data?.createdAt ?? new Date().toISOString(),
            total,
            subtotal,
            descuento,
            metodoPago,
            clienteNombre: clienteNombre.trim() || null,
            usuarioNombre: data.data?.usuarioNombre ?? null,
            items: carrito.map((i) => ({
              nombre:     i.nombre,
              cantidad:   i.cantidad,
              precioUnit: i.precio,
              subtotal:   i.subtotal,
            })),
          });
        }

        if (generarFactura && datosFacturaParam) {
          const facturaToastId = toast.loading("Generando factura AFIP...");
          try {
            const resFactura = await fetch("/api/afip/facturar", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ventaId,
                tipoComprobante: datosFacturaParam.tipoComprobante,
                cliente: {
                  docTipo:      datosFacturaParam.clienteDocTipo,
                  docNro:       datosFacturaParam.clienteDocNro,
                  nombre:       datosFacturaParam.clienteNombre,
                  direccion:    datosFacturaParam.clienteDireccion,
                  condicionIVA: datosFacturaParam.clienteCondicionIVA,
                },
                items: carrito.map((item) => ({
                  descripcion:    item.nombre,
                  cantidad:       item.cantidad,
                  precioUnitario: item.precio,
                  subtotal:       item.subtotal,
                })),
                total,
                descuento,
                metodoPago,
              }),
            });
            if (resFactura.ok) {
              const dataFactura = await resFactura.json();
              setComprobanteGenerado(dataFactura.comprobante.id);
              toast.update(facturaToastId, { type: "success", title: "Factura generada", description: `CAE: ${dataFactura.comprobante.cae}` });
            } else {
              const errFactura = await resFactura.json();
              toast.update(facturaToastId, { type: "error", title: "Error al facturar", description: errFactura.error ?? "Revisá la configuración AFIP" });
            }
          } catch (error) {
            console.error("Error factura AFIP:", error);
            toast.update(facturaToastId, { type: "error", title: "Error al conectar con AFIP" });
          }
        }

        setTimeout(() => {
          limpiarCarrito();
          setResultado(null);
          onVentaExitosa?.();
        }, 1200);
      }
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message?.includes("fetch")
        ? "Sin conexión. Verificá tu internet."
        : "Error al registrar la venta";
      setMensajeError(msg);
      toast.update(toastId, { type: "error", title: "Error al registrar la venta", description: msg });
    } finally {
      setCargando(false);
    }
  }

  const handleConfirmarFactura = (datos: DatosFactura) => {
    setModalFacturaAbierto(false);
    handleVenta(datos);
  };

  // ── Edición rápida de producto desde el POS ─────────────────────────────────

  const handleGuardarEdicion = async () => {
    if (!productoEditando) return;
    setEditando(true);
    try {
      const res = await fetch(`/api/productos/${productoEditando.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stock:          parseInt(formEdicion.stock) || 0,
          precio:         parseFloat(formEdicion.precio) || 0,
          nombre:         formEdicion.nombre.trim(),
          codigoProducto: formEdicion.codigoProducto.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        const actualizar = (lista: ProductoConCategoria[]) =>
          lista.map(p => p.id === productoEditando.id
            ? {
                ...p,
                stock:          parseInt(formEdicion.stock) || 0,
                precio:         parseFloat(formEdicion.precio) || 0,
                nombre:         formEdicion.nombre.trim(),
                codigoProducto: formEdicion.codigoProducto.trim() || null,
              }
            : p
          );
        setProductos(actualizar);
        productosInicialesRef.current = actualizar(productosInicialesRef.current);
        setProductoEditando(null);
        toast.success("Producto actualizado", formEdicion.nombre.trim());
      } else {
        toast.error("No se pudo actualizar", data.error ?? "Intentá de nuevo");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setEditando(false);
    }
  };

  const handleProductoCreado = useCallback((nuevoProducto: ProductoConCategoria & { activo?: boolean }) => {
    const productoConCategoria: ProductoConCategoria = {
      id:             nuevoProducto.id,
      nombre:         nuevoProducto.nombre,
      precio:         nuevoProducto.precio,
      stock:          nuevoProducto.stock,
      stockMinimo:    nuevoProducto.stockMinimo || 5,
      imagen:         nuevoProducto.imagen,
      codigoBarras:   nuevoProducto.codigoBarras,
      codigoProducto: nuevoProducto.codigoProducto,
      categoriaId:    nuevoProducto.categoriaId,
      categoria:      nuevoProducto.categoria || null,
      unidad:         nuevoProducto.unidad ?? null,
    };
    setProductos((prev) => [productoConCategoria, ...prev]);
    productosInicialesRef.current = [productoConCategoria, ...productosInicialesRef.current];
    agregarAlCarrito(productoConCategoria);
    toast.success("Producto creado", nuevoProducto.nombre);
  }, [agregarAlCarrito, toast]);

  // ── Cell del grid ───────────────────────────────────────────────────────────

  const Cell = useCallback(
    ({ columnIndex, rowIndex, style }: { columnIndex: number; rowIndex: number; style: React.CSSProperties }) => {
      const index = rowIndex * columnCount + columnIndex;
      if (index >= productos.length) return <div style={style} />;

      const producto  = productos[index];
      const enCarrito = carrito.find((i) => i.productoId === producto.id);
      const stockBajo = producto.stock <= producto.stockMinimo;

      return (
        <div style={{ ...style, padding: GAP / 2, boxSizing: "border-box" }}>
          <button
            onClick={() => agregarAlCarrito(producto)}
            className="relative flex flex-col rounded-lg p-2 text-left transition-all active:scale-95 w-full h-full overflow-hidden"
            style={{
              background: enCarrito ? "rgba(220,38,38,0.12)" : "var(--bg-card)",
              border:     enCarrito ? "1px solid rgba(220,38,38,0.4)" : "1px solid var(--border-base)",
            }}
            onMouseEnter={(e) => {
              if (!enCarrito) (e.currentTarget as HTMLElement).style.borderColor = "var(--border-strong)";
            }}
            onMouseLeave={(e) => {
              if (!enCarrito) (e.currentTarget as HTMLElement).style.borderColor = "var(--border-base)";
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

            <p className="text-base font-semibold line-clamp-2 leading-tight mb-1" style={{ color: "var(--text-primary)" }}>
              {producto.nombre}
            </p>
            <p className="text-base font-bold text-red-400 mt-1">{formatPrecio(producto.precio)}</p>
            {producto.tieneVariantes && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full mt-1 inline-block"
                style={{ background: "rgba(168,85,247,0.15)", color: "#c084fc", border: "1px solid rgba(168,85,247,0.3)" }}>
                Talles/Colores
              </span>
            )}
            <div className="flex items-center justify-between mt-0.5 gap-1">
              <span className="text-xs font-mono truncate" style={{ color: "var(--text-primary)" }}>
                {producto.codigoProducto || ""}
              </span>
              <div className="flex items-center gap-1 flex-shrink-0">
                {producto.stock > 0 && (
                  <span className="text-xs" style={{ color: "var(--text-primary)" }}>
                    Stock: {producto.stock}
                  </span>
                )}
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setProductoEditando(producto);
                    setFormEdicion({
                      stock:          String(producto.stock),
                      precio:         String(producto.precio),
                      nombre:         producto.nombre,
                      codigoProducto: producto.codigoProducto || "",
                    });
                  }}
                  className="flex h-4 w-6 items-center justify-center rounded flex-shrink-0 cursor-pointer"
                  style={{ background: "var(--bg-hover-md)", color: "var(--text-muted)" }}
                >
                  <svg className="h-5.5 w-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.5-6.5a2 2 0 012.828 2.828L11.828 15.828A2 2 0 0111 16H9v-2a2 2 0 01.172-.768z" />
                  </svg>
                </span>
              </div>
            </div>

            {/* Badge stock */}
            {producto.stock <= 0 ? (
              <span
                className="absolute top-2 right-2 text-xs font-medium px-1.5 py-0.5 rounded-full"
                style={{ background: "rgba(220,38,38,0.15)", color: "#f87171", border: "1px solid rgba(220,38,38,0.3)" }}
              >
                Sin stock
              </span>
            ) : stockBajo ? (
              <span
                className="absolute top-2 right-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.3)" }}
              >
                {producto.stock}
              </span>
            ) : null}

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
    [columnCount, cardWidth, productos, carrito, agregarAlCarrito],
  );

  // ── Panel Catálogo ──────────────────────────────────────────────────────────

  const itemCount = hayMas ? productos.length + 30 : productos.length;
  const rowCount  = Math.ceil(itemCount / columnCount);

  const panelCatalogo = (
    <div className="flex flex-col h-full min-w-0 overflow-hidden" style={{ background: "var(--bg-base)" }}>
      <div
        className="p-2 md:p-3 border-b flex-shrink-0"
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
              <button onClick={() => handleBusqueda("")} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-primary)" }}>
                <X className="h-4 w-4" />
              </button>
            )}
            {buscandoRemoto && (
              <div className="absolute right-10 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--text-muted)" }} />
              </div>
            )}
          </div>

          <button
            onClick={() => setModalCrearProducto(true)}
            className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{ background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.3)", color: "#f87171" }}
            title="Crear producto rápido"
          >
            <Plus className="h-3.5 w-3.5" />
            Nuevo
          </button>

          <button
            onClick={() => setScannerAbierto(true)}
            className="flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
            style={{ background: "var(--bg-hover-md)", border: "1px solid var(--border-md)", color: "var(--text-secondary)" }}
            title="Escanear código de barras"
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(220,38,38,0.4)"; (e.currentTarget as HTMLElement).style.color = "#DC2626"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-md)"; (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
          >
            <ScanLine className="h-4 w-4" />
          </button>
        </div>
      </div>

      {categorias.length > 0 && (
        <div
          className="flex gap-2 px-2 md:px-3 py-2 overflow-x-auto border-b flex-shrink-0 scrollbar-hide"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border-base)" }}
        >
          <button
            onClick={() => handleCategoriaChange(null)}
            className={cn("flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors", !categoriaActiva ? "bg-red-600 text-white" : "")}
            style={!categoriaActiva ? {} : { background: "var(--bg-hover-md)", border: "1px solid var(--border-md)", color: "var(--text-secondary)" }}
          >
            Todos
          </button>
          {categorias.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoriaChange(categoriaActiva === cat.id ? null : cat.id)}
              className={cn("flex-shrink-0 flex items-center gap-1.5 px-2 py-1.5 rounded-full text-xs font-medium transition-colors", categoriaActiva === cat.id ? "bg-red-600 text-white" : "")}
              style={categoriaActiva === cat.id ? {} : { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-secondary)" }}
            >
              <Tag className="h-3 w-3" />
              {cat.nombre}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 relative" style={{ minHeight: 0 }} ref={gridContainerRef}>
        {buscandoRemoto && productos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <Loader2 className="h-12 w-12 animate-spin mb-3" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>Buscando productos...</p>
          </div>
        ) : productos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <Package className="h-12 w-12 mb-3" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>Sin productos</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-faint)" }}>
              {busqueda ? "Probá con otro término" : "No hay productos disponibles"}
            </p>
          </div>
        ) : (
          <InfiniteLoader
            isItemLoaded={(index) => !hayMas || index < productos.length}
            itemCount={itemCount}
            loadMoreItems={cargarMasProductos}
            threshold={15}
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
                onItemsRendered={(gridProps: { visibleRowStartIndex: number; visibleRowStopIndex: number }) => {
                  (onItemsRendered as (args: { visibleStartIndex: number; visibleStopIndex: number }) => void)({
                    visibleStartIndex: gridProps.visibleRowStartIndex * columnCount,
                    visibleStopIndex:  gridProps.visibleRowStopIndex  * columnCount + columnCount - 1,
                  });
                }}
                style={{ overflowX: "hidden", overflowY: "auto" }}
              >
                {Cell}
              </Grid>
            )}
          </InfiniteLoader>
        )}

        {cargandoMas && (
          <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full z-10"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-md)", boxShadow: "0 4px 24px rgba(0,0,0,0.12)", color: "var(--text-secondary)" }}
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

        <div className="flex items-center gap-1.5 px-3 pb-2">
          <input
            type="text"
            value={itemManualNombre}
            onChange={e => setItemManualNombre(e.target.value)}
            placeholder="Ítem manual..."
            className="input-base text-xs flex-1 min-w-0"
            style={{ padding: "4px 8px" }}
          />
          <input
            type="number"
            value={itemManualPrecio}
            onChange={e => setItemManualPrecio(e.target.value)}
            placeholder="$"
            className="input-base text-xs"
            style={{ width: "64px", padding: "4px 8px" }}
            onWheel={(e) => e.currentTarget.blur()}
          />
          <button
            onClick={() => {
              const precio = parseFloat(itemManualPrecio) || 0;
              if (!itemManualNombre.trim()) return;
              setCarrito(prev => [...prev, {
                productoId: `manual_${Date.now()}`,
                carritoKey: `manual_${Date.now()}`,  // ← agregar (mismo valor está bien)
                nombre:     itemManualNombre.trim(),
                precio,
                cantidad:   1,
                subtotal:   precio,
                stock:      999,
              }]);
              setItemManualNombre("");
              setItemManualPrecio("");
            }}
            className="flex h-7 w-7 items-center justify-center rounded-lg font-bold flex-shrink-0"
            style={{ background: "#DC2626", color: "#fff" }}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

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
                  <button onClick={() => cambiarCantidad(item.carritoKey, -1)}
                    className="flex h-6 w-6 items-center justify-center rounded-md transition-colors"
                    style={{ border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-primary)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-secondary)")}>
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-6 text-center text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{item.cantidad}</span>
                  <button onClick={() => cambiarCantidad(item.carritoKey, 1)}
                    disabled={item.cantidad >= item.stock}
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
                  <button onClick={() => eliminarDelCarrito(item.productoId)}
                    style={{ color: "var(--text-muted)" }}
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

      {carrito.length > 0 && (
        <div className="border-t p-3 space-y-3 flex-shrink-0" style={{ borderColor: "var(--border-base)" }}>
          {/* Descuento */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium whitespace-nowrap" style={{ color: "var(--text-muted)" }}>Descuento %</label>
            <input
              type="number" min="0" max="100"
              value={descuentoPct || ""}
              onChange={(e) => {
                const pct = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                setDescuentoPct(pct);
                setDescuento(Math.round((subtotal * pct) / 100));
              }}
              placeholder="0" className="input-base text-sm" style={{ width: "70px" }}
              onWheel={(e) => e.currentTarget.blur()}
            />
            <label className="text-xs font-medium whitespace-nowrap" style={{ color: "var(--text-muted)" }}>$ </label>
            <input
              type="number" min="0" max={subtotal}
              value={descuento || ""}
              onChange={(e) => {
                const monto = Math.max(0, parseFloat(e.target.value) || 0);
                setDescuento(monto);
                setDescuentoPct(subtotal > 0 ? Math.round((monto / subtotal) * 100) : 0);
              }}
              placeholder="0" className="input-base text-sm" style={{ width: "90px" }}
              onWheel={(e) => e.currentTarget.blur()}
            />
          </div>

          {/* Recargo */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium whitespace-nowrap" style={{ color: "var(--text-muted)" }}>Recargo %</label>
            <input
              type="number" min="0" max="100"
              value={recargoPct || ""}
              onChange={(e) => {
                const pct = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                setRecargoPct(pct);
                setRecargo(Math.round((subtotal * pct) / 100));
              }}
              placeholder="0" className="input-base text-sm" style={{ width: "70px" }}
              onWheel={(e) => e.currentTarget.blur()}
            />
            <label className="text-xs font-medium whitespace-nowrap" style={{ color: "var(--text-muted)" }}>$ </label>
            <input
              type="number" min="0"
              value={recargo || ""}
              onChange={(e) => {
                const monto = Math.max(0, parseFloat(e.target.value) || 0);
                setRecargo(monto);
                setRecargoPct(subtotal > 0 ? Math.round((monto / subtotal) * 100) : 0);
              }}
              placeholder="0" className="input-base text-sm" style={{ width: "90px" }}
              onWheel={(e) => e.currentTarget.blur()}
            />
          </div>
        </div>

          <div className="grid grid-cols-5 gap-1">
            {METODOS_PAGO.map((mp) => {
              const Icon   = mp.icono;
              const activo = metodoPago === mp.value;
              return (
                <button key={mp.value} onClick={() => setMetodoPago(mp.value)}
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
              <input type="number" min={total} value={efectivoRecibido}
                onChange={(e) => setEfectivoRecibido(e.target.value)}
                placeholder={String(total)} className="input-base flex-1"
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
            <button
              onClick={() => setOpcionesAbiertas(v => !v)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium transition-colors"
              style={{ background: "var(--bg-hover)", color: "var(--text-muted)" }}
              onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"}
              onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"}
            >
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
                <input type="text" value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)}
                  placeholder="Nombre del cliente (opcional)"
                  className="input-base w-full text-xs" style={{ padding: "5px 10px" }} />

                {/* Vendedor */}
                {usuarios.length > 1 && (
                  <select value={vendedorId} onChange={e => setVendedorId(e.target.value)}
                    className="input-base w-full text-xs" style={{ padding: "5px 10px" }}>
                    <option value="">— Vendedor: mi cuenta —</option>
                    {usuarios.map(u => <option key={u.id} value={u.supabaseId}>{u.nombre}</option>)}
                  </select>
                )}

                {/* Checkboxes */}
                {[
                  { label: "Generar ticket de venta", value: imprimirTicket, setter: (v: boolean) => {
                    setImprimirTicket(v);
                    localStorage.setItem("pos_imprimir_ticket", String(v));
                  }},
                  { label: "Generar factura electrónica (AFIP)", value: generarFactura, setter: setGenerarFactura },
                  { label: "Cargar con fecha pasada",            value: fechaManual,    setter: (v: boolean) => { setFechaManual(v); setFechaVenta(v ? `${fechaHoyAR()}T${horaAhoraAR()}` : ""); } },
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

                {/* Fecha si está activada */}
                {fechaManual && (
                  <input type="datetime-local" value={fechaVenta}
                    max={`${fechaHoyAR()}T${horaAhoraAR()}`}
                    onChange={e => setFechaVenta(e.target.value)}
                    className="input-base w-full text-xs" style={{ padding: "5px 10px" }} />
                )}
              </div>
            )}
          </div>

          {/* Feedback inline — se mantiene para referencia visual inmediata en el carrito */}
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
          {/* Botón cobrar */}
          <button
            onClick={() => handleVenta()}
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

  // ── Peso ────────────────────────────────────────────────────────────────────
  function confirmarPeso() {
    if (!modalPeso) return;
    const peso = parseFloat(pesoIngresado.replace(",", "."));
    if (!peso || peso <= 0) return;

    const precioCalculado = Math.round(modalPeso.precio * peso * 100) / 100;
    // Tomar el precio ajustado del estado, si está vacío o es 0 usar el calculado
    const precioFinal = parseFloat(precioAjustado) > 0 
      ? parseFloat(precioAjustado) 
      : precioCalculado;

    const nombre = `${modalPeso.nombre} (${peso} ${modalPeso.unidad ?? "kg"})`;

    setCarrito(prev => [...prev, {
      productoId: modalPeso.id,                        // ← ID real
      carritoKey: `${modalPeso.id}_${Date.now()}`,     // ← clave única
      nombre,
      precio:   precioFinal,
      cantidad: 1,
      subtotal: precioFinal,
      stock:    999,
      imagen:   modalPeso.imagen,
    }]);

    setModalPeso(null);
    setPesoIngresado("");
    setPrecioAjustado("");
  }
    
  // ── Layout ──────────────────────────────────────────────────────────────────

  const alturaBase = isModal ? "h-full" : "h-[calc(100vh-4rem)] sm:h-[calc(100vh-3.5rem)]";

  return (
    <>
      {/* DESKTOP */}
      <div className={cn("hidden md:flex overflow-hidden", alturaBase, !isModal && "-m-4 md:-m-6")}>
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden" style={{ borderRight: "1px solid var(--border-base)" }}>
          {panelCatalogo}
        </div>
        <div className="flex flex-col w-72 lg:w-64 xl:w-96 flex-shrink-0 overflow-hidden">
          {panelCarrito}
        </div>
      </div>

      {/* MOBILE */}
      <div className={cn("flex flex-col md:hidden overflow-hidden", alturaBase, !isModal && "-mx-4")}>
        <div className="flex flex-shrink-0" style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border-base)" }}>
          <button onClick={() => setTabMobile("catalogo")}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors"
            style={{ color: tabMobile === "catalogo" ? "#f87171" : "#71717a", borderBottom: tabMobile === "catalogo" ? "2px solid #DC2626" : "2px solid transparent" }}>
            <Package className="h-4 w-4" />
            Catálogo
          </button>
          <button onClick={() => setTabMobile("carrito")}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors relative"
            style={{ color: tabMobile === "carrito" ? "#f87171" : "#71717a", borderBottom: tabMobile === "carrito" ? "2px solid #DC2626" : "2px solid transparent" }}>
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
          <div className="flex-shrink-0 p-3 border-t" style={{ background: "var(--bg-surface)", borderColor: "var(--border-base)" }}>
            <button onClick={() => setTabMobile("carrito")}
              className="w-full flex items-center justify-between rounded-xl px-4 py-3 text-sm font-bold text-white"
              style={{ background: "#DC2626" }}>
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

      {scannerAbierto && (
        <BarcodeScanner onScanned={handleCodigoEscaneado} onClose={() => setScannerAbierto(false)} />
      )}

      {ticketVenta && (
        <TicketPrint
          venta={ticketVenta}
          nombreTenant={nombreTenant}
          telefonoTenant={telefonoTenant}
          direccionTenant={direccionTenant}
          onClose={() => setTicketVenta(null)}
        />
      )}

      {modalFacturaAbierto && configAFIP && (
        <ModalSeleccionFactura
          open={modalFacturaAbierto}
          onClose={() => setModalFacturaAbierto(false)}
          onConfirmar={handleConfirmarFactura}
          condicionFiscalEmisor={configAFIP.condicionFiscal}
          total={total}
        />
      )}

      {comprobanteGenerado && (
        <ModalFacturaPDF
          open={!!comprobanteGenerado}
          onClose={() => setComprobanteGenerado(null)}
          comprobanteId={comprobanteGenerado}
        />
      )}

      {/* Modal edición producto */}
      {productoEditando && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setProductoEditando(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-5 space-y-4"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-base)" }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Editar producto</h3>
            {[
              { label: "Nombre",   key: "nombre",         type: "text"   },
              { label: "Código",   key: "codigoProducto", type: "text"   },
              { label: "Precio $", key: "precio",         type: "number" },
              { label: "Stock",    key: "stock",          type: "number" },
            ].map(({ label, key, type }) => (
              <div key={key}>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>{label}</label>
                <input
                  type={type}
                  value={formEdicion[key as keyof typeof formEdicion]}
                  onChange={e => setFormEdicion(prev => ({ ...prev, [key]: e.target.value }))}
                  className="input-base w-full"
                />
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <button onClick={() => setProductoEditando(null)}
                className="flex-1 py-2 rounded-xl text-sm font-medium"
                style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}>
                Cancelar
              </button>
              <button onClick={handleGuardarEdicion} disabled={editando}
                className="flex-1 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
                style={{ background: "#DC2626", color: "#fff" }}>
                {editando ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Peso Producto */}
      {modalPeso && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={() => setModalPeso(null)}
        >
          <div
            className="w-full max-w-xs rounded-2xl p-5 space-y-4"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-base)" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                  {modalPeso.nombre}
                </h3>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-faint)" }}>
                  {formatPrecio(modalPeso.precio)} / {modalPeso.unidad ?? "kg"}
                </p>
              </div>
              <button onClick={() => setModalPeso(null)} style={{ color: "var(--text-faint)" }}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>
                Peso ({modalPeso.unidad ?? "kg"})
              </label>
              <input
                type="number"
                value={pesoIngresado}
                onChange={e => {
                  setPesoIngresado(e.target.value);
                  const p = parseFloat(e.target.value.replace(",", "."));
                  if (p > 0) {
                    const calculado = Math.round(modalPeso.precio * p * 100) / 100;
                    setPrecioAjustado(String(calculado));
                  } else {
                    setPrecioAjustado("");
                  }
                }}
                onKeyDown={e => e.key === "Enter" && confirmarPeso()}
                placeholder="0.000"
                step="0.001"
                min="0"
                className="input-base w-full text-lg text-center font-bold"
                autoFocus
                onWheel={e => e.currentTarget.blur()}
              />
            </div>

            {/* ← AQUÍ, después del input de peso */}
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: "¼ kg", valor: 0.25 },
                { label: "½ kg", valor: 0.5 },
                { label: "¾ kg", valor: 0.75 },
                { label: "1 kg",  valor: 1 },
              ].map(({ label, valor }) => (
                <button
                  key={valor}
                  onClick={() => {
                    setPesoIngresado(String(valor));
                    const calculado = Math.round(modalPeso.precio * valor * 100) / 100;
                    setPrecioAjustado(String(calculado));
                  }}
                  className="py-2 rounded-lg text-xs font-bold transition-all"
                  style={{
                    background: pesoIngresado === String(valor)
                      ? "rgba(220,38,38,0.2)"
                      : "var(--bg-hover-md)",
                    border: pesoIngresado === String(valor)
                      ? "1px solid rgba(220,38,38,0.5)"
                      : "1px solid var(--border-base)",
                    color: pesoIngresado === String(valor)
                      ? "#f87171"
                      : "var(--text-secondary)",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {pesoIngresado && parseFloat(pesoIngresado.replace(",", ".")) > 0 && (
              <div
                className="rounded-xl px-4 py-3 space-y-2"
                style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)" }}
              >
                <p className="text-xs text-center" style={{ color: "var(--text-faint)" }}>
                  Sugerido: {formatPrecio(Math.round(modalPeso.precio * parseFloat(pesoIngresado.replace(",", ".")) * 100) / 100)}
                </p>
                <div>
                  <label className="text-xs font-medium block mb-1 text-center" style={{ color: "var(--text-muted)" }}>
                    Precio final $
                  </label>
                  <input
                    type="number"
                    value={precioAjustado}
                    onChange={e => {
                      setPrecioAjustado(e.target.value);
                      // Recalcular el peso en base al precio ajustado
                      const precioNuevo = parseFloat(e.target.value);
                      if (precioNuevo > 0 && modalPeso.precio > 0) {
                        const pesoEquivalente = Math.round((precioNuevo / modalPeso.precio) * 1000) / 1000;
                        setPesoIngresado(String(pesoEquivalente));
                      }
                    }}
                    onKeyDown={e => e.key === "Enter" && confirmarPeso()}
                    placeholder={String(Math.round(modalPeso.precio * parseFloat(pesoIngresado.replace(",", ".")) * 100) / 100)}
                    step="1"
                    min="0"
                    className="input-base w-full text-2xl text-center font-bold"
                    style={{ color: "#f87171" }}
                    onWheel={e => e.currentTarget.blur()}
                  />
                </div>
              </div>
            )}

            <button
              onClick={confirmarPeso}
              disabled={!pesoIngresado || parseFloat(pesoIngresado.replace(",", ".")) <= 0}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold disabled:opacity-40"
              style={{ background: "#DC2626", color: "#ffffff" }}
            >
              <ShoppingCart className="h-4 w-4" />
              Agregar — {pesoIngresado && parseFloat(pesoIngresado) > 0
                ? formatPrecio(parseFloat(precioAjustado) > 0 
                    ? parseFloat(precioAjustado) 
                    : Math.round(modalPeso.precio * parseFloat(pesoIngresado) * 100) / 100)
                : "$0"
              }
            </button>
          </div>
        </div>
      )}
      <ModalCrearProductoRapido
        open={modalCrearProducto}
        onClose={() => setModalCrearProducto(false)}
        onProductoCreado={handleProductoCreado}
        categorias={categorias}
      />
      {modalVariante && (
        <ModalVariante
          producto={modalVariante}
          variantes={variantesModal}
          cargando={cargandoVariantes}
          onConfirmar={(variante) => agregarVarianteAlCarrito(modalVariante, variante)}
          onCerrar={() => { setModalVariante(null); setVariantesModal([]); }}
        />
      )}
    </>
  );
}