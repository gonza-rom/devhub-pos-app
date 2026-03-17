"use client";
// app/(app)/movimientos/page.tsx

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import {
  ArrowLeftRight, ShoppingCart, TrendingUp, TrendingDown, DollarSign,
  Search, X, UserCircle, Ban, AlertTriangle, Calendar, Filter,
  Minus, Plus, Trash2, ChevronLeft, ChevronRight, Package, Tag,
  Edit, Save, CreditCard, Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fechaHoyAR, horaAhoraAR, fmtHora24AR, fmtFechaHoraAR,
  isoAFechaInputAR, isoAHoraInputAR,
} from "@/lib/dateAR";
import { useToast }   from "@/components/toast";
import { useConfirm } from "@/components/toast";

// ── Tipos ─────────────────────────────────────────────────────

type Producto = {
  id: string;
  nombre: string;
  precio: number;
  stock: number;
  stockMinimo: number;
  codigoProducto: string | null;
  imagen: string | null;
  imagenes: string[];
  categoria: { id: string; nombre: string } | null;
};

type Movimiento = {
  id: string;
  productoId: string;
  productoNombre: string;
  tipo: "ENTRADA" | "SALIDA" | "VENTA" | "AJUSTE";
  cantidad: number;
  stockAnterior: number | null;
  stockResultante: number | null;
  motivo: string | null;
  usuarioNombre: string | null;
  cancelado: boolean;
  motivoCancelacion: string | null;
  canceladoAt: string | null;
  ventaId: string | null;
  createdAt: string;
  producto: Producto & { categoria: { id: string; nombre: string } | null };
};

type Paginacion = {
  page: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

type ItemCarrito = {
  productoId: string | null;
  nombre: string;
  precioUnit: number;
  cantidad: number;
  stock: number;
  imagen: string | null;
  esManual: boolean;
  id?: string;
};

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const PAGE_SIZE_POS = 12;

// ── Componente principal ──────────────────────────────────────

export default function MovimientosPage() {
  const toast   = useToast();
  const confirm = useConfirm();

  // ── Historial ──
  const [movimientos, setMovimientos]   = useState<Movimiento[]>([]);
  const [loading, setLoading]           = useState(true);
  const [paginacion, setPaginacion]     = useState<Paginacion>({ page: 1, total: 0, totalPages: 1, hasNext: false, hasPrev: false });
  const [paginaActual, setPaginaActual] = useState(1);

  const [modoFormulario, setModoFormulario] = useState<"ENTRADA" | "SALIDA" | "VENTA" | null>(null);

  // ── Formulario ENTRADA / SALIDA ──
  const [busquedaProducto, setBusquedaProducto]       = useState("");
  const busquedaDebounced                             = useDebounce(busquedaProducto, 350);
  const [sugerencias, setSugerencias]                 = useState<Producto[]>([]);
  const [mostrarSugerencias, setMostrarSugerencias]   = useState(false);
  const [buscandoSugerencias, setBuscandoSugerencias] = useState(false);
  const [formData, setFormData] = useState({
    productoId: "", productoNombre: "",
    cantidad: "", motivo: "",
    fecha:    fechaHoyAR(),
    hora:     horaAhoraAR(),
    horaAuto: true,
  });

  // ── POS (VENTA) ──
  const [posProductos, setPosProductos]         = useState<Producto[]>([]);
  const [posTotalPaginas, setPosTotalPaginas]   = useState(1);
  const [posPaginaActual, setPosPaginaActual]   = useState(1);
  const [posLoading, setPosLoading]             = useState(false);
  const [posBusqueda, setPosBusqueda]           = useState("");
  const posBusquedaDebounced                    = useDebounce(posBusqueda, 400);
  const [carrito, setCarrito]                   = useState<ItemCarrito[]>([]);
  const [metodoPago, setMetodoPago]             = useState("EFECTIVO");
  const [clienteNombre, setClienteNombre]       = useState("");
  const [clienteDni, setClienteDni]             = useState("");
  const [fechaVenta, setFechaVenta]             = useState(fechaHoyAR());
  const [horaVenta, setHoraVenta]               = useState(horaAhoraAR());
  const [horaVentaAuto, setHoraVentaAuto]       = useState(true);
  const [procesandoVenta, setProcesandoVenta]   = useState(false);

  // ── Modal ítem manual POS ──
  const [modalManual, setModalManual]       = useState(false);
  const [itemManualDesc, setItemManualDesc] = useState("");
  const [itemManualPrecio, setItemManualPrecio] = useState("");
  const [itemManualCant, setItemManualCant] = useState("1");

  // ── Modales editar / cancelar ──
  const [modalEditar,      setModalEditar]      = useState<Movimiento | null>(null);
  const [editForm,         setEditForm]         = useState({ cantidad: "", motivo: "", fecha: "", hora: "" });
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [editError,        setEditError]        = useState("");

  // ── Filtros historial ──
  const [busquedaInput,      setBusquedaInput]      = useState("");
  const [mostrarFiltros,     setMostrarFiltros]     = useState(false);
  const [filtroFechaInicio,  setFiltroFechaInicio]  = useState("");
  const [filtroFechaFin,     setFiltroFechaFin]     = useState("");
  const [filtroTipo,         setFiltroTipo]         = useState("");
  const [submitError,        setSubmitError]        = useState("");

  // ── Fetch movimientos ──────────────────────────────────────
  const fetchMovimientos = useCallback(async (pagina = 1) => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/movimientos?page=${pagina}&pageSize=15`);
      const data = await res.json();
      setMovimientos(data.data ?? []);
      setPaginacion(data.meta ?? { page: 1, total: 0, totalPages: 1, hasNext: false, hasPrev: false });
      setPaginaActual(pagina);
    } catch { console.error("Error al cargar movimientos"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchMovimientos(); }, [fetchMovimientos]);

  // ── POS — productos ────────────────────────────────────────
  const fetchPosProductos = useCallback(async (pagina = 1, busq = "") => {
    setPosLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pagina), pageSize: String(PAGE_SIZE_POS) });
      if (busq.trim()) params.set("busqueda", busq.trim());
      const res  = await fetch(`/api/productos?${params}`);
      const data = await res.json();
      setPosProductos(data.data ?? data.productos ?? []);
      setPosTotalPaginas(data.meta?.totalPages ?? data.pagination?.totalPages ?? 1);
    } catch { console.error("Error cargando productos POS"); }
    finally { setPosLoading(false); }
  }, []);

  useEffect(() => {
    if (modoFormulario === "VENTA") fetchPosProductos(1, "");
  }, [modoFormulario, fetchPosProductos]);

  useEffect(() => {
    if (modoFormulario !== "VENTA") return;
    setPosPaginaActual(1);
    fetchPosProductos(1, posBusquedaDebounced);
  }, [posBusquedaDebounced, modoFormulario, fetchPosProductos]);

  // ── POS — carrito ──────────────────────────────────────────
  const agregarAlCarrito = (producto: Producto) => {
    setCarrito((prev) => {
      const existente = prev.find((i) => i.productoId === producto.id);
      if (existente) {
        if (existente.cantidad >= producto.stock) return prev;
        return prev.map((i) => i.productoId === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      }
      if (producto.stock === 0) return prev;
      return [...prev, {
        productoId: producto.id,
        nombre:     producto.nombre,
        precioUnit: producto.precio,
        cantidad:   1,
        stock:      producto.stock,
        imagen:     producto.imagenes?.[0] ?? producto.imagen ?? null,
        esManual:   false,
      }];
    });
  };

  const agregarItemManual = () => {
    const precio = parseFloat(itemManualPrecio);
    const cant   = parseInt(itemManualCant);
    if (!itemManualDesc.trim() || !precio || precio <= 0 || !cant || cant <= 0) return;
    const idTemp = `manual_${Date.now()}_${Math.random()}`;
    setCarrito((prev) => [...prev, {
      id: idTemp, productoId: null,
      nombre:     itemManualDesc.trim(),
      precioUnit: precio, cantidad: cant,
      stock:      Infinity, imagen: null, esManual: true,
    }]);
    setItemManualDesc(""); setItemManualPrecio(""); setItemManualCant("1");
    setModalManual(false);
  };

  const actualizarCantidad = (itemId: string, nuevaCantidad: number) => {
    if (nuevaCantidad <= 0) {
      setCarrito((prev) => prev.filter((i) => (i.esManual ? i.id : i.productoId) !== itemId));
      return;
    }
    setCarrito((prev) => prev.map((i) => {
      if ((i.esManual ? i.id : i.productoId) !== itemId) return i;
      if (!i.esManual && nuevaCantidad > i.stock) return i;
      return { ...i, cantidad: nuevaCantidad };
    }));
  };

  const eliminarDelCarrito = (itemId: string) =>
    setCarrito((prev) => prev.filter((i) => (i.esManual ? i.id : i.productoId) !== itemId));

  const calcularTotal = () => carrito.reduce((s, i) => s + i.precioUnit * i.cantidad, 0);

  // ── POS — finalizar venta ──────────────────────────────────
  const finalizarVenta = async () => {
    if (!carrito.length) return;
    setProcesandoVenta(true);

    await toast.promise(
      (async () => {
        const payload = {
          items: carrito.map((i) =>
            i.esManual
              ? { esManual: true, descripcion: i.nombre, precioUnit: i.precioUnit, cantidad: i.cantidad }
              : { productoId: i.productoId, precioUnit: i.precioUnit, cantidad: i.cantidad }
          ),
          metodoPago,
          clienteNombre: clienteNombre || undefined,
          clienteDni:    clienteDni    || undefined,
          fecha: fechaVenta,
          hora:  horaVentaAuto ? null : horaVenta,
        };
        const res = await fetch("/api/ventas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error);

        setCarrito([]);
        setClienteNombre(""); setClienteDni("");
        setMetodoPago("EFECTIVO");
        setFechaVenta(fechaHoyAR());
        setHoraVenta(horaAhoraAR());
        setHoraVentaAuto(true);
        setPosBusqueda("");
        fetchMovimientos();
        setTimeout(() => setModoFormulario(null), 1500);
      })(),
      {
        loading: "Registrando venta...",
        success: `Venta registrada · $${calcularTotal().toFixed(2)}`,
        error:   (e: unknown) => (e as Error).message,
      }
    ).finally(() => setProcesandoVenta(false));
  };

  // ── Formulario ENTRADA / SALIDA ────────────────────────────
  useEffect(() => {
    if (!busquedaDebounced.trim()) { setSugerencias([]); setMostrarSugerencias(false); return; }
    (async () => {
      setBuscandoSugerencias(true);
      try {
        const res  = await fetch(`/api/productos?busqueda=${encodeURIComponent(busquedaDebounced)}&pageSize=8`);
        const data = await res.json();
        const lista: Producto[] = data.data ?? data.productos ?? [];
        setSugerencias(lista);
        setMostrarSugerencias(lista.length > 0);
      } catch {} finally { setBuscandoSugerencias(false); }
    })();
  }, [busquedaDebounced]);

  const seleccionarProducto = (p: Producto) => {
    setFormData((prev) => ({ ...prev, productoId: p.id, productoNombre: p.nombre }));
    setBusquedaProducto(p.nombre);
    setMostrarSugerencias(false);
  };

  const limpiarSeleccion = () => {
    setFormData((prev) => ({ ...prev, productoId: "", productoNombre: "" }));
    setBusquedaProducto("");
  };

  const handleSubmitMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productoId) { setSubmitError("Seleccioná un producto"); return; }
    setSubmitError("");

    await toast.promise(
      fetch("/api/movimientos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productoId: formData.productoId,
          tipo:       modoFormulario,
          cantidad:   parseInt(formData.cantidad),
          motivo:     formData.motivo || undefined,
        }),
      }).then(async r => {
        const data = await r.json();
        if (!data.ok) throw new Error(data.error ?? "Error al registrar");
        cerrarFormulario();
        fetchMovimientos();
      }),
      {
        loading: modoFormulario === "ENTRADA" ? "Registrando entrada..." : "Registrando salida...",
        success: modoFormulario === "ENTRADA" ? "Entrada de stock registrada" : "Salida de stock registrada",
        error:   (e: unknown) => (e as Error).message,
      }
    );
  };

  // ── Cancelar movimiento ────────────────────────────────────
  const handleCancelarMovimiento = async (movimiento: Movimiento) => {
    const tipoLabel = movimiento.tipo === "ENTRADA" ? "entrada"
      : movimiento.tipo === "VENTA" ? "venta"
      : "salida";

    const ok = await confirm({
      title:        "¿Cancelar este movimiento?",
      description:  `Se revertirá la ${tipoLabel} de ${movimiento.cantidad} unidades de "${movimiento.productoNombre}". ${
        movimiento.tipo === "ENTRADA"
          ? `El stock bajará ${movimiento.cantidad} unidades.`
          : `El stock subirá ${movimiento.cantidad} unidades.`
      }`,
      confirmLabel: "Sí, cancelar movimiento",
      cancelLabel:  "No, volver",
      variant:      "danger",
      icon:         "warning",
    });
    if (!ok) return;

    await toast.promise(
      fetch(`/api/movimientos/${movimiento.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivoCancelacion: "Cancelado por administrador" }),
      }).then(async r => {
        const data = await r.json();
        if (!data.ok) throw new Error(data.error ?? "Error al cancelar");
        fetchMovimientos(paginaActual);
      }),
      {
        loading: "Cancelando movimiento...",
        success: "Movimiento cancelado y stock revertido",
        error:   (e: unknown) => (e as Error).message,
      }
    );
  };

  // ── Editar movimiento ──────────────────────────────────────
  const abrirEdicion = (m: Movimiento) => {
    if (m.cancelado) return;
    setModalEditar(m);
    setEditForm({
      cantidad: String(m.cantidad),
      motivo:   m.motivo ?? "",
      fecha:    isoAFechaInputAR(m.createdAt),
      hora:     isoAHoraInputAR(m.createdAt),
    });
    setEditError("");
  };

  const guardarEdicion = async () => {
    if (!modalEditar || !editForm.cantidad || parseInt(editForm.cantidad) <= 0) {
      setEditError("La cantidad debe ser mayor a 0"); return;
    }
    setGuardandoEdicion(true); setEditError("");
    try {
      const res  = await fetch(`/api/movimientos/${modalEditar.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cantidad: parseInt(editForm.cantidad), motivo: editForm.motivo }),
      });
      const data = await res.json();
      if (!data.ok) { setEditError(data.error ?? "Error"); return; }
      setModalEditar(null);
      toast.success("Movimiento actualizado", `${modalEditar.productoNombre} · ${editForm.cantidad} u.`);
      fetchMovimientos(paginaActual);
    } catch { setEditError("Error de conexión"); }
    finally { setGuardandoEdicion(false); }
  };

  // ── Exportar CSV ───────────────────────────────────────────
  function exportarVentasCSV(movs: Movimiento[]) {
    const ventas = movs.filter((m) => m.tipo === "VENTA" && !m.cancelado);
    if (!ventas.length) {
      toast.warning("Sin ventas para exportar", "No hay ventas en el rango de filtros actual");
      return;
    }

    const SEP        = ";";
    const encabezado = ["fecha", "producto", "codigo", "categoria", "cantidad", "stock_resultante", "usuario", "venta_id"];
    const filas      = ventas.map((m) => [
      fmtFechaHoraAR(m.createdAt),
      m.productoNombre,
      m.producto?.codigoProducto ?? "",
      m.producto?.categoria?.nombre ?? "",
      m.cantidad,
      m.stockResultante ?? "",
      m.usuarioNombre ?? "",
      m.ventaId ?? "",
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(SEP));

    const csv  = "\uFEFF" + [encabezado.join(SEP), ...filas].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `ventas_${fechaHoyAR()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado", `${ventas.length} ventas exportadas`);
  }

  // ── Filtros historial (client-side) ───────────────────────
  const movimientosFiltrados = movimientos.filter((m) => {
    if (busquedaInput.trim()) {
      const t              = busquedaInput.toLowerCase();
      const matchNombre    = m.productoNombre.toLowerCase().includes(t);
      const matchCategoria = m.producto?.categoria?.nombre?.toLowerCase().includes(t) ?? false;
      const matchMotivo    = (m.motivo ?? "").toLowerCase().includes(t);
      if (!matchNombre && !matchCategoria && !matchMotivo) return false;
    }
    if (filtroFechaInicio && isoAFechaInputAR(m.createdAt) < filtroFechaInicio) return false;
    if (filtroFechaFin   && isoAFechaInputAR(m.createdAt) > filtroFechaFin)     return false;
    if (filtroTipo && m.tipo !== filtroTipo) return false;
    return true;
  });

  const hayFiltrosActivos = busquedaInput || filtroFechaInicio || filtroFechaFin || filtroTipo;

  const limpiarFiltros = () => {
    setBusquedaInput(""); setFiltroFechaInicio(""); setFiltroFechaFin(""); setFiltroTipo("");
  };

  const cerrarFormulario = () => {
    setModoFormulario(null);
    setCarrito([]);
    setPosBusqueda("");
    setBusquedaProducto("");
    setSubmitError("");
    setFormData({
      productoId: "", productoNombre: "",
      cantidad: "", motivo: "",
      fecha:    fechaHoyAR(),
      hora:     horaAhoraAR(),
      horaAuto: true,
    });
  };

  // ── Render ─────────────────────────────────────────────────
  if (loading && movimientos.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <ArrowLeftRight className="h-6 w-6" /> Movimientos de Stock
          </h1>
          <p className="text-sm text-zinc-300 dark:text-zinc-300">{paginacion.total} registros totales</p>
        </div>

        {!modoFormulario && (
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setModoFormulario("VENTA")}
              className="flex items-center gap-2 rounded-lg bg-green-600 hover:bg-green-700 px-3 py-2 text-sm font-semibold text-white transition-colors">
              <DollarSign className="h-4 w-4" /> Nueva Venta
            </button>
            <button onClick={() => setModoFormulario("ENTRADA")}
              className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-2 text-sm font-semibold text-white transition-colors">
              <TrendingUp className="h-4 w-4" /> Entrada de Stock
            </button>
            <button onClick={() => setModoFormulario("SALIDA")}
              className="flex items-center gap-2 rounded-lg bg-orange-500 hover:bg-orange-600 px-3 py-2 text-sm font-semibold text-white transition-colors">
              <TrendingDown className="h-4 w-4" /> Salida de Stock
            </button>
            <button
              onClick={() => exportarVentasCSV(movimientosFiltrados)}
              className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
              style={{ borderColor: "rgba(255,255,255,0.12)", color: "#a1a1aa", background: "rgba(255,255,255,0.04)" }}
            >
              <Download className="h-4 w-4" /> Exportar ventas
            </button>
          </div>
        )}
      </div>

      {/* ── FORMULARIO POS (VENTA) ── */}
      {modoFormulario === "VENTA" && (
        <div className="card overflow-hidden">
          <div className="bg-green-600 px-6 py-4 flex items-center justify-between">
            <h2 className="text-white font-bold text-xl flex items-center gap-2">
              <DollarSign className="h-6 w-6" /> Registrar Venta
            </h2>
            <button onClick={cerrarFormulario} className="text-white/80 hover:text-white transition-colors">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Panel izquierdo — catálogo */}
            <div className="lg:col-span-2 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input type="text" placeholder="Buscar producto por nombre o código..."
                  value={posBusqueda} onChange={(e) => setPosBusqueda(e.target.value)}
                  className="input-base pl-10" autoFocus />
                {posBusqueda && (
                  <button onClick={() => setPosBusqueda("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {posTotalPaginas > 1 && (
                <div className="flex items-center justify-between text-sm text-zinc-300">
                  <span>Página {posPaginaActual}/{posTotalPaginas}</span>
                  <div className="flex gap-1">
                    <button onClick={() => { const p = Math.max(1, posPaginaActual - 1); setPosPaginaActual(p); fetchPosProductos(p, posBusquedaDebounced); }}
                      disabled={posPaginaActual === 1}
                      className="p-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-40">
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button onClick={() => { const p = Math.min(posTotalPaginas, posPaginaActual + 1); setPosPaginaActual(p); fetchPosProductos(p, posBusquedaDebounced); }}
                      disabled={posPaginaActual === posTotalPaginas}
                      className="p-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-40">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {posLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="rounded-lg border dark:border-gray-700 p-3 animate-pulse">
                      <div className="w-full h-20 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded mb-1" />
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                    </div>
                  ))}
                </div>
              ) : posProductos.length === 0 ? (
                <div className="text-center py-12 text-zinc-300">
                  <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  No se encontraron productos
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[460px] overflow-y-auto pr-1">
                  {posProductos.map((producto) => {
                    const enCarrito = carrito.find((i) => i.productoId === producto.id);
                    return (
                      <div key={producto.id}
                        onClick={() => producto.stock > 0 && agregarAlCarrito(producto)}
                        className={cn(
                          "relative border dark:border-gray-700 rounded-xl p-2 transition-all",
                          producto.stock === 0
                            ? "bg-gray-50 dark:bg-gray-900/50 cursor-not-allowed opacity-60"
                            : "hover:shadow-md hover:border-green-400 cursor-pointer bg-white dark:bg-gray-800",
                          enCarrito && "border-green-400 ring-1 ring-green-400"
                        )}
                      >
                        <div className="relative w-full h-20 mb-2 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                          {(producto.imagenes?.[0] ?? producto.imagen) ? (
                            <Image src={producto.imagenes?.[0] ?? producto.imagen!}
                              alt={producto.nombre} fill className="object-cover" sizes="120px" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-8 w-8 text-gray-400" />
                            </div>
                          )}
                          {producto.stock === 0 && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <span className="text-white text-xs font-bold bg-red-600 px-1.5 py-0.5 rounded">SIN STOCK</span>
                            </div>
                          )}
                          {enCarrito && (
                            <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-[10px] font-bold text-white shadow">
                              {enCarrito.cantidad}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 leading-tight">{producto.nombre}</p>
                        {producto.codigoProducto && (
                          <p className="text-xs text-primary-600 dark:text-primary-400 font-medium truncate">{producto.codigoProducto}</p>
                        )}
                        <p className="text-sm font-bold text-green-600 dark:text-green-400 mt-0.5">${producto.precio.toFixed(2)}</p>
                        <p className={cn("text-xs mt-0.5", producto.stock <= producto.stockMinimo && producto.stock > 0 ? "text-orange-500" : "text-zinc-300")}>
                          Stock: {producto.stock}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Panel derecho — carrito y pago */}
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-3">
                <h3 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" /> Carrito ({carrito.length})
                </h3>
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {carrito.length === 0 ? (
                    <p className="text-sm text-zinc-300 text-center py-4">Seleccioná productos del catálogo</p>
                  ) : carrito.map((item) => {
                    const itemId = item.esManual ? item.id! : item.productoId!;
                    return (
                      <div key={itemId} className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg p-2 shadow-sm">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate flex items-center gap-1">
                            {item.esManual && <Tag className="h-3 w-3 text-orange-500 flex-shrink-0" />}
                            {item.nombre}
                          </p>
                          <p className="text-xs text-zinc-300">${item.precioUnit.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => actualizarCantidad(itemId, item.cantidad - 1)}
                            className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 p-0.5 rounded">
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-5 text-center text-xs font-bold">{item.cantidad}</span>
                          <button onClick={() => actualizarCantidad(itemId, item.cantidad + 1)}
                            className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 p-0.5 rounded">
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <p className="text-xs font-bold text-green-600 dark:text-green-400 w-14 text-right whitespace-nowrap">
                          ${(item.precioUnit * item.cantidad).toFixed(2)}
                        </p>
                        <button onClick={() => eliminarDelCarrito(itemId)} className="text-red-500 hover:text-red-700 flex-shrink-0">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div className="border-t dark:border-gray-600 pt-2 flex justify-between items-center font-bold">
                  <span className="text-gray-800 dark:text-gray-100">TOTAL:</span>
                  <span className="text-green-600 dark:text-green-400 text-xl">${calcularTotal().toFixed(2)}</span>
                </div>
              </div>

              <button onClick={() => setModalManual(true)}
                className="w-full border-2 border-dashed border-orange-300 dark:border-orange-600 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors">
                <Tag className="h-4 w-4" /> + Ítem manual (Varios)
              </button>

              <div>
                <label className="label-base flex items-center gap-1"><CreditCard className="h-4 w-4" /> Método de Pago</label>
                <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} className="input-base">
                  <option value="EFECTIVO">💵 Efectivo</option>
                  <option value="TARJETA_DEBITO">💳 Débito</option>
                  <option value="TARJETA_CREDITO">💳 Crédito</option>
                  <option value="TRANSFERENCIA">🏦 Transferencia</option>
                  <option value="QR">📱 QR</option>
                </select>
              </div>

              <div>
                <label className="label-base flex items-center gap-1"><Calendar className="h-4 w-4" /> Fecha</label>
                <input type="date" value={fechaVenta} onChange={(e) => setFechaVenta(e.target.value)}
                  max={fechaHoyAR()} className="input-base" />
              </div>

              <div>
                <label className="label-base">🕐 Hora</label>
                <div className="flex gap-2">
                  <input type="time" value={horaVenta}
                    onChange={(e) => { setHoraVenta(e.target.value); setHoraVentaAuto(false); }}
                    disabled={horaVentaAuto} className="input-base flex-1 disabled:opacity-50" />
                  <button type="button"
                    onClick={() => { setHoraVenta(horaAhoraAR()); setHoraVentaAuto((p) => !p); }}
                    className={cn("px-3 py-2 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap",
                      horaVentaAuto ? "bg-green-600 text-white border-green-600" : "bg-white dark:bg-gray-700 text-gray-400 border-gray-300 dark:border-gray-600")}>
                    {horaVentaAuto ? "⚡ Ahora" : "Manual"}
                  </button>
                </div>
              </div>

              <div>
                <label className="label-base flex items-center gap-1"><UserCircle className="h-4 w-4" /> Cliente (opcional)</label>
                <input type="text" placeholder="Nombre" value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} className="input-base mb-2" />
                <input type="text" placeholder="DNI" value={clienteDni} onChange={(e) => setClienteDni(e.target.value)} className="input-base" />
              </div>

              <button onClick={finalizarVenta} disabled={carrito.length === 0 || procesandoVenta}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-3 font-bold transition-colors">
                <DollarSign className="h-5 w-5" />
                {procesandoVenta ? "Procesando..." : `Confirmar Venta — $${calcularTotal().toFixed(2)}`}
              </button>

              <button onClick={cerrarFormulario}
                className="w-full rounded-xl bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 py-2 text-sm transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FORMULARIO ENTRADA / SALIDA ── */}
      {(modoFormulario === "ENTRADA" || modoFormulario === "SALIDA") && (
        <form onSubmit={handleSubmitMovimiento} className="card overflow-hidden">
          <div className={cn("px-6 py-4 flex items-center justify-between",
            modoFormulario === "ENTRADA" ? "bg-blue-600" : "bg-orange-500")}>
            <h2 className="text-white font-bold text-xl flex items-center gap-2">
              {modoFormulario === "ENTRADA"
                ? <><TrendingUp className="h-6 w-6" /> Entrada de Stock</>
                : <><TrendingDown className="h-6 w-6" /> Salida de Stock</>}
            </h2>
            <button type="button" onClick={cerrarFormulario} className="text-white/80 hover:text-white transition-colors">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div className="relative">
              <label className="label-base">Buscar Producto *</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input type="text" value={busquedaProducto}
                  onChange={(e) => { setBusquedaProducto(e.target.value); if (formData.productoId) limpiarSeleccion(); }}
                  placeholder="Nombre, código interno o código de barras..."
                  className="input-base pl-10 pr-10" autoFocus />
                {buscandoSugerencias && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {busquedaProducto && !buscandoSugerencias && (
                  <button type="button" onClick={limpiarSeleccion} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {mostrarSugerencias && sugerencias.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                  {sugerencias.map((p) => (
                    <button key={p.id} type="button" onClick={() => seleccionarProducto(p)}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-600 border-b dark:border-gray-600 last:border-b-0">
                      <div className="font-medium text-gray-900 dark:text-gray-100">{p.nombre}</div>
                      <div className="text-xs text-zinc-300">
                        {p.codigoProducto && `Código: ${p.codigoProducto} · `}
                        Stock: {p.stock} · Precio: ${p.precio.toFixed(2)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label-base">Cantidad *</label>
                <input type="number" value={formData.cantidad}
                  onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                  required min="1" className="input-base" />
              </div>
              <div>
                <label className="label-base flex items-center gap-1"><Calendar className="h-4 w-4" /> Fecha *</label>
                <input type="date" value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  required max={fechaHoyAR()} className="input-base" />
              </div>
              <div>
                <label className="label-base">🕐 Hora</label>
                <div className="flex gap-2">
                  <input type="time" value={formData.hora}
                    onChange={(e) => setFormData({ ...formData, hora: e.target.value, horaAuto: false })}
                    disabled={formData.horaAuto} className="input-base flex-1 disabled:opacity-50" />
                  <button type="button"
                    onClick={() => setFormData({ ...formData, horaAuto: !formData.horaAuto, hora: horaAhoraAR() })}
                    className={cn("px-3 py-2 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap",
                      formData.horaAuto ? "bg-blue-600 text-white border-blue-600" : "bg-white dark:bg-gray-700 text-gray-400 border-gray-300 dark:border-gray-600")}>
                    {formData.horaAuto ? "⚡ Ahora" : "Manual"}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="label-base">Motivo</label>
              <input type="text" value={formData.motivo}
                onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                placeholder="Ej: Compra a proveedor, devolución..." className="input-base" />
            </div>

            {submitError && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2">
                <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button type="submit"
                className={cn("flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white transition-colors",
                  modoFormulario === "ENTRADA" ? "bg-blue-600 hover:bg-blue-700" : "bg-orange-500 hover:bg-orange-600")}>
                Registrar {modoFormulario === "ENTRADA" ? "Entrada" : "Salida"}
              </button>
              <button type="button" onClick={cerrarFormulario}
                className="rounded-xl border border-gray-200 dark:border-gray-700 px-6 py-2.5 text-sm font-semibold text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ── FILTROS + BÚSQUEDA + HISTORIAL ── */}
      <div className="card p-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input type="text" placeholder="Filtrar por producto, categoría o motivo..."
              value={busquedaInput} onChange={(e) => setBusquedaInput(e.target.value)}
              className="input-base pl-10 pr-9" />
            {busquedaInput && (
              <button onClick={() => setBusquedaInput("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors whitespace-nowrap relative">
            <Filter className="h-4 w-4" /> Filtros
            {hayFiltrosActivos && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-primary-600" />}
          </button>
        </div>

        {mostrarFiltros && (
          <div className="border-t dark:border-gray-700 pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label-base">Fecha desde</label>
                <input type="date" value={filtroFechaInicio} onChange={(e) => setFiltroFechaInicio(e.target.value)} className="input-base" />
              </div>
              <div>
                <label className="label-base">Fecha hasta</label>
                <input type="date" value={filtroFechaFin} onChange={(e) => setFiltroFechaFin(e.target.value)} className="input-base" />
              </div>
              <div>
                <label className="label-base">Tipo</label>
                <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="input-base">
                  <option value="">Todos</option>
                  <option value="ENTRADA">Entrada</option>
                  <option value="SALIDA">Salida</option>
                  <option value="VENTA">Venta</option>
                  <option value="AJUSTE">Ajuste</option>
                </select>
              </div>
            </div>
            {hayFiltrosActivos && (
              <button onClick={limpiarFiltros} className="flex items-center gap-2 text-sm text-zinc-300 hover:text-gray-300 transition-colors">
                <X className="h-4 w-4" /> Limpiar filtros
              </button>
            )}
          </div>
        )}

        <div className="flex items-center justify-between border-t dark:border-gray-700 pt-3">
          <p className="text-sm text-zinc-300">
            {movimientosFiltrados.length} de {movimientos.length} mostrados · {paginacion.total} totales
          </p>
          {paginacion.totalPages > 1 && (
            <div className="flex gap-1">
              <button onClick={() => fetchMovimientos(paginaActual - 1)} disabled={!paginacion.hasPrev}
                className="p-1.5 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-40">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-3 py-1 text-sm font-medium text-gray-500 dark:text-gray-300">
                {paginacion.page}/{paginacion.totalPages}
              </span>
              <button onClick={() => fetchMovimientos(paginaActual + 1)} disabled={!paginacion.hasNext}
                className="p-1.5 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-40">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── TABLA DE HISTORIAL ── */}
      {movimientosFiltrados.length === 0 ? (
        <div className="card py-20 text-center">
          <ArrowLeftRight className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-900 dark:text-gray-100">No hay movimientos</p>
          {hayFiltrosActivos && (
            <button onClick={limpiarFiltros} className="mt-3 text-sm text-primary-600 hover:underline">Limpiar filtros</button>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  {["Fecha", "Producto", "Tipo", "Cantidad", "Motivo", "Usuario", "Stock", "Precio", "Acciones"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-zinc-300 dark:text-gray-400 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {movimientosFiltrados.map((m) => (
                  <tr key={m.id} className={cn("hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors", m.cancelado && "opacity-50")}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-xs text-zinc-300">{isoAFechaInputAR(m.createdAt)}</p>
                      <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{fmtHora24AR(m.createdAt)}</p>
                      {m.cancelado && (
                        <div className="text-[10px] text-red-500 mt-0.5">
                          Cancelado {m.canceladoAt ? isoAFechaInputAR(m.canceladoAt) : ""}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{m.productoNombre}</p>
                      {m.producto?.codigoProducto && (
                        <p className="text-xs text-primary-600 dark:text-primary-400">{m.producto.codigoProducto}</p>
                      )}
                      {m.producto?.categoria && (
                        <p className="text-xs text-gray-400">{m.producto.categoria.nombre}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {m.cancelado ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 dark:bg-gray-700 text-zinc-300">
                          <Ban className="h-3 w-3" /> Cancelado
                        </span>
                      ) : m.tipo === "ENTRADA" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                          <TrendingUp className="h-3 w-3" /> Entrada
                        </span>
                      ) : m.tipo === "VENTA" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                          <DollarSign className="h-3 w-3" /> Venta
                        </span>
                      ) : m.tipo === "AJUSTE" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300">
                          Ajuste
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
                          <TrendingDown className="h-3 w-3" /> Salida
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={cn("text-sm font-bold",
                        m.cancelado ? "text-gray-400 line-through" :
                        m.tipo === "ENTRADA" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                        {m.tipo === "ENTRADA" ? "+" : "-"}{m.cantidad}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-300 max-w-[160px]">
                      {m.cancelado && m.motivoCancelacion
                        ? <span className="text-red-500">↩ {m.motivoCancelacion}</span>
                        : (m.motivo ?? <span className="text-zinc-300">Sin motivo</span>)}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-300 whitespace-nowrap">
                      {m.usuarioNombre
                        ? <span className="flex items-center gap-1"><UserCircle className="h-3.5 w-3.5" />{m.usuarioNombre}</span>
                        : "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {m.stockResultante ?? "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs">
                      {m.tipo === "VENTA" && m.ventaId
                        ? <span className="text-green-600 dark:text-green-400 font-semibold">Venta</span>
                        : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {!m.cancelado ? (
                        <div className="flex gap-1.5">
                          <button onClick={() => abrirEdicion(m)}
                            className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-700 px-2 py-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                            <Edit className="h-3 w-3" /> Editar
                          </button>
                          <button onClick={() => handleCancelarMovimiento(m)}
                            className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 px-2 py-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            <Ban className="h-3 w-3" /> Cancelar
                          </button>
                        </div>
                      ) : <span className="text-xs text-gray-400 italic">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL EDITAR MOVIMIENTO ── */}
      {modalEditar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !guardandoEdicion && setModalEditar(null)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 shadow-xl p-6">
            <div className="flex items-start gap-3 mb-5">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full flex-shrink-0">
                <Edit className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Editar Movimiento</h2>
                <p className="text-sm text-zinc-300 mt-0.5">Producto: {modalEditar.productoNombre}</p>
              </div>
              <button onClick={() => setModalEditar(null)} className="text-gray-400"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label-base">Cantidad *</label>
                <input type="number" value={editForm.cantidad} onChange={(e) => setEditForm({ ...editForm, cantidad: e.target.value })}
                  min="1" className="input-base" />
              </div>
              <div>
                <label className="label-base">Motivo</label>
                <input type="text" value={editForm.motivo} onChange={(e) => setEditForm({ ...editForm, motivo: e.target.value })}
                  placeholder="Opcional" className="input-base" />
              </div>
              {editError && (
                <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{editError}</p>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={guardarEdicion} disabled={guardandoEdicion}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2.5 text-sm font-semibold transition-colors">
                <Save className="h-4 w-4" /> {guardandoEdicion ? "Guardando..." : "Guardar Cambios"}
              </button>
              <button onClick={() => setModalEditar(null)}
                className="flex-1 rounded-xl bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 text-gray-800 dark:text-gray-100 py-2.5 text-sm transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL ÍTEM MANUAL POS ── */}
      {modalManual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModalManual(false)} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white dark:bg-gray-800 shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Tag className="h-5 w-5 text-orange-500" /> Ítem manual — Varios
              </h2>
              <button onClick={() => setModalManual(false)} className="text-gray-400"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-xs text-zinc-300 mb-4">
              Se registra como ítem de la venta pero <strong>no descuenta stock</strong>.
            </p>
            <div className="space-y-3">
              <div>
                <label className="label-base">Descripción *</label>
                <input type="text" placeholder="Ej: Anillos, aritos, varios..."
                  value={itemManualDesc} onChange={(e) => setItemManualDesc(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && agregarItemManual()}
                  autoFocus className="input-base" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-base">Precio *</label>
                  <input type="number" placeholder="0.00" value={itemManualPrecio}
                    onChange={(e) => setItemManualPrecio(e.target.value)} min="0" step="0.01" className="input-base" />
                </div>
                <div>
                  <label className="label-base">Cantidad *</label>
                  <input type="number" value={itemManualCant}
                    onChange={(e) => setItemManualCant(e.target.value)} min="1" className="input-base" />
                </div>
              </div>
              {itemManualPrecio && itemManualCant && (
                <p className="text-sm text-center font-semibold text-orange-600 dark:text-orange-400">
                  Subtotal: ${(parseFloat(itemManualPrecio || "0") * parseInt(itemManualCant || "1")).toFixed(2)}
                </p>
              )}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={agregarItemManual}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white py-2.5 text-sm font-bold transition-colors">
                <Plus className="h-4 w-4" /> Agregar al carrito
              </button>
              <button onClick={() => setModalManual(false)}
                className="flex-1 rounded-xl bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 text-gray-800 dark:text-gray-100 py-2.5 text-sm transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}