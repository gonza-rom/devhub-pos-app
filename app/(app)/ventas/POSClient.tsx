"use client";
// app/(app)/ventas/POSClient.tsx
// OPTIMIZADO con react-window para 1500+ productos

import { useState, useCallback, useEffect, useRef, useLayoutEffect } from "react";
import { debounce } from "lodash";
// eslint-disable-next-line @typescript-eslint/no-var-requires
import {
  ShoppingCart, X,
  Package, Loader2,
  ScanLine, 
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
import POSCatalogo from "@/components/ventas/POSCatalogo";
import POSCarrito  from "@/components/ventas/POSCarrito";


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


type Props = {
  productosIniciales: ProductoConCategoria[];
  categorias: CategoriaSimple[];
  onVentaExitosa?: () => void;
  isModal?: boolean;
  nombreTenant?: string;
  telefonoTenant?: string | null;
  direccionTenant?: string | null;
};

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

  const [carritoColapsado, setCarritoColapsado] = useState(false);

  // ── Columnas dinámicas ──────────────────────────────────────────────────────

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

  // ── Panel Catálogo ──────────────────────────────────────────────────────────

const panelCatalogo = (
  <POSCatalogo
    productos={productos}
    categorias={categorias}
    carrito={carrito.map(i => ({ productoId: i.productoId, cantidad: i.cantidad }))}
    busqueda={busqueda}
    categoriaActiva={categoriaActiva}
    buscandoRemoto={buscandoRemoto}
    cargandoMas={cargandoMas}
    hayMas={hayMas}
    gridWidth={gridWidth}
    gridHeight={gridHeight}
    gridContainerRef={gridContainerRef}
    gridRef={gridRef}
    onBusqueda={handleBusqueda}
    onCategoriaChange={handleCategoriaChange}
    onAgregarProducto={agregarAlCarrito}
    onEditarProducto={(p) => { setProductoEditando(p); setFormEdicion({ stock: String(p.stock), precio: String(p.precio), nombre: p.nombre, codigoProducto: p.codigoProducto || "" }); }}
    onCargarMas={cargarMasProductos}
    onAbrirScanner={() => setScannerAbierto(true)}
    onAbrirCrearProducto={() => setModalCrearProducto(true)}
  />
);

const panelCarrito = (
  <POSCarrito
    carrito={carrito}
    onCambiarCantidad={cambiarCantidad}
    onEliminar={eliminarDelCarrito}
    onLimpiar={limpiarCarrito}
    subtotal={subtotal}
    total={total}
    descuento={descuento}
    descuentoPct={descuentoPct}
    recargo={recargo}
    recargoPct={recargoPct}
    vuelto={vuelto}
    onDescuento={(m) => { setDescuento(m); setDescuentoPct(subtotal > 0 ? Math.round((m / subtotal) * 100) : 0); }}
    onDescuentoPct={(p) => { setDescuentoPct(p); setDescuento(Math.round((subtotal * p) / 100)); }}
    onRecargo={(m) => { setRecargo(m); setRecargoPct(subtotal > 0 ? Math.round((m / subtotal) * 100) : 0); }}
    onRecargoPct={(p) => { setRecargoPct(p); setRecargo(Math.round((subtotal * p) / 100)); }}
    metodoPago={metodoPago}
    onMetodoPago={setMetodoPago}
    efectivoRecibido={efectivoRecibido}
    onEfectivoRecibido={setEfectivoRecibido}
    clienteNombre={clienteNombre}
    onClienteNombre={setClienteNombre}
    usuarios={usuarios}
    vendedorId={vendedorId}
    onVendedorId={setVendedorId}
    imprimirTicket={imprimirTicket}
    onImprimirTicket={(v) => { setImprimirTicket(v); localStorage.setItem("pos_imprimir_ticket", String(v)); }}
    generarFactura={generarFactura}
    onGenerarFactura={setGenerarFactura}
    fechaManual={fechaManual}
    onFechaManual={(v) => { setFechaManual(v); setFechaVenta(v ? `${fechaHoyAR()}T${horaAhoraAR()}` : ""); }}
    fechaVenta={fechaVenta}
    onFechaVenta={setFechaVenta}
    opcionesAbiertas={opcionesAbiertas}
    onOpcionesAbiertas={setOpcionesAbiertas}
    itemManualNombre={itemManualNombre}
    itemManualPrecio={itemManualPrecio}
    onItemManualNombre={setItemManualNombre}
    onItemManualPrecio={setItemManualPrecio}
    colapsado={carritoColapsado}
    onToggleColapso={() => setCarritoColapsado(v => !v)}
    onAgregarItemManual={() => {
      const precio = parseFloat(itemManualPrecio) || 0;
      if (!itemManualNombre.trim()) return;
      const ts = Date.now();
      setCarrito(prev => [...prev, { productoId: `manual_${ts}`, carritoKey: `manual_${ts}`, nombre: itemManualNombre.trim(), precio, cantidad: 1, subtotal: precio, stock: 999 }]);
      setItemManualNombre(""); setItemManualPrecio("");
    }}
    cargando={cargando}
    resultado={resultado}
    mensajeError={mensajeError}
    onVenta={() => handleVenta()}
  />
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
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden"
      style={{ borderRight: "1px solid var(--border-base)" }}>
        {panelCatalogo}
      </div>
        <div className={cn(
            "flex-shrink-0 overflow-hidden transition-all duration-200",
            carritoColapsado ? "w-12" : "w-72 lg:w-72 xl:w-96"
          )}>
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