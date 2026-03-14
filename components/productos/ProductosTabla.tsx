"use client";
// components/productos/ProductosTabla.tsx
// ✨ CON SELECCIÓN MASIVA + FILTROS + SELECCIONAR TODOS LOS RESULTADOS

import { useState, useTransition } from "react";
import { useRouter }               from "next/navigation";
import { 
  Package, AlertTriangle, Trash2, CheckSquare, Square, 
  Tag, DollarSign, PackagePlus, Building2, X, Edit
} from "lucide-react";
import { formatPrecio }           from "@/lib/utils";
import { useFetch }               from "@/hooks/useFetch";
import { invalidatePlanUsoCache } from "@/lib/planUsoCache";
import ProductoModal              from "@/components/productos/ProductoModal";
import type { Categoria, Proveedor, Producto } from "@/types";

type ProductoFila = Pick<
  Producto,
  | "id" | "nombre" | "codigoProducto" | "codigoBarras" | "descripcion"
  | "precio" | "costo" | "stock" | "stockMinimo" | "unidad"
  | "imagen" | "imagenes" | "categoriaId" | "proveedorId"
> & { categoria?: { id: string; nombre: string } | null };

type Props = {
  productos:   ProductoFila[];
  categorias:  Pick<Categoria, "id" | "nombre">[];
  proveedores: Pick<Proveedor, "id" | "nombre">[];
  // ✨ NUEVO para selección masiva de todos los resultados:
  totalProductos: number;
  filtrosActivos: {
    busqueda: string;
    categoriaId: string;
    soloStockBajo: boolean;
  };
};

export default function ProductosTabla({ 
  productos, 
  categorias, 
  proveedores,
  totalProductos,
  filtrosActivos,
}: Props) {
  const router       = useRouter();
  const { apiFetch } = useFetch();
  const [, startTransition] = useTransition();

  // ═══════════════════════════════════════════════════════════════
  // SELECCIÓN MASIVA
  // ═══════════════════════════════════════════════════════════════
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [modoSeleccion, setModoSeleccion] = useState<"pagina" | "todos">("pagina");
  const [accionMasiva, setAccionMasiva] = useState<
    "categoria" | "proveedor" | "stock" | "precio" | null
  >(null);

  // Estados para modals de edición masiva
  const [cargandoMasivo, setCargandoMasivo] = useState(false);
  const [errorMasivo, setErrorMasivo] = useState("");
  
  const [nuevaCategoria, setNuevaCategoria] = useState("");
  const [nuevoProveedor, setNuevoProveedor] = useState("");
  
  const [ajusteStock, setAjusteStock] = useState<"sumar" | "restar" | "establecer">("establecer");
  const [valorStock, setValorStock] = useState("");
  
  const [ajustePrecio, setAjustePrecio] = useState<"porcentaje" | "fijo">("porcentaje");
  const [valorPrecio, setValorPrecio] = useState("");

  // ═══════════════════════════════════════════════════════════════
  // MODAL INDIVIDUAL
  // ═══════════════════════════════════════════════════════════════
  const [modal, setModal] = useState<{ abierto: boolean; producto: ProductoFila | undefined }>({
    abierto: false, producto: undefined,
  });

  const [confirmEliminar, setConfirmEliminar] = useState<{
    abierto: boolean; producto: ProductoFila | null; cargando: boolean; error: string;
  }>({ abierto: false, producto: null, cargando: false, error: "" });

  // ═══════════════════════════════════════════════════════════════
  // FUNCIONES DE SELECCIÓN
  // ═══════════════════════════════════════════════════════════════
  const toggleSeleccion = (id: string) => {
    setSeleccionados(prev => {
      const nuevo = new Set(prev);
      if (nuevo.has(id)) {
        nuevo.delete(id);
      } else {
        nuevo.add(id);
      }
      return nuevo;
    });
  };

  const toggleTodos = () => {
    if (modoSeleccion === "todos") {
      // Deseleccionar todos
      setSeleccionados(new Set());
      setModoSeleccion("pagina");
    } else if (seleccionados.size === productos.length) {
      // Ya seleccionó todos de la página, ofrecer seleccionar TODOS
      setModoSeleccion("todos");
    } else {
      // Seleccionar todos de la página
      setSeleccionados(new Set(productos.map(p => p.id)));
      setModoSeleccion("pagina");
    }
  };

  const limpiarSeleccion = () => {
    setSeleccionados(new Set());
    setModoSeleccion("pagina");
    setAccionMasiva(null);
    setNuevaCategoria("");
    setNuevoProveedor("");
    setValorStock("");
    setValorPrecio("");
    setErrorMasivo("");
  };

  // ═══════════════════════════════════════════════════════════════
  // FUNCIONES DE ACCIONES MASIVAS
  // ═══════════════════════════════════════════════════════════════
  const aplicarCambioCategoria = async () => {
    if (!nuevaCategoria) return;
    
    setCargandoMasivo(true);
    setErrorMasivo("");
    try {
      const payload = modoSeleccion === "todos"
        ? {
            accion: "categoria",
            valor: nuevaCategoria,
            filtros: filtrosActivos,
          }
        : {
            accion: "categoria",
            valor: nuevaCategoria,
            ids: Array.from(seleccionados),
          };

      const res = await apiFetch("/api/productos/masivo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      
      limpiarSeleccion();
      invalidatePlanUsoCache();
      startTransition(() => router.refresh());
    } catch (err: any) {
      setErrorMasivo(err.message || "Error al actualizar");
    } finally {
      setCargandoMasivo(false);
    }
  };

  const aplicarCambioProveedor = async () => {
    if (!nuevoProveedor) return;
    
    setCargandoMasivo(true);
    setErrorMasivo("");
    try {
      const payload = modoSeleccion === "todos"
        ? {
            accion: "proveedor",
            valor: nuevoProveedor,
            filtros: filtrosActivos,
          }
        : {
            accion: "proveedor",
            valor: nuevoProveedor,
            ids: Array.from(seleccionados),
          };

      const res = await apiFetch("/api/productos/masivo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      
      limpiarSeleccion();
      invalidatePlanUsoCache();
      startTransition(() => router.refresh());
    } catch (err: any) {
      setErrorMasivo(err.message || "Error al actualizar");
    } finally {
      setCargandoMasivo(false);
    }
  };

  const aplicarCambioStock = async () => {
    if (!valorStock) return;
    
    setCargandoMasivo(true);
    setErrorMasivo("");
    try {
      const payload = modoSeleccion === "todos"
        ? {
            accion: "stock",
            tipo: ajusteStock,
            valor: parseFloat(valorStock),
            filtros: filtrosActivos,
          }
        : {
            accion: "stock",
            tipo: ajusteStock,
            valor: parseFloat(valorStock),
            ids: Array.from(seleccionados),
          };

      const res = await apiFetch("/api/productos/masivo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      
      limpiarSeleccion();
      invalidatePlanUsoCache();
      startTransition(() => router.refresh());
    } catch (err: any) {
      setErrorMasivo(err.message || "Error al actualizar");
    } finally {
      setCargandoMasivo(false);
    }
  };

  const aplicarCambioPrecio = async () => {
    if (!valorPrecio) return;
    
    setCargandoMasivo(true);
    setErrorMasivo("");
    try {
      const payload = modoSeleccion === "todos"
        ? {
            accion: "precio",
            tipo: ajustePrecio,
            valor: parseFloat(valorPrecio),
            filtros: filtrosActivos,
          }
        : {
            accion: "precio",
            tipo: ajustePrecio,
            valor: parseFloat(valorPrecio),
            ids: Array.from(seleccionados),
          };

      const res = await apiFetch("/api/productos/masivo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      
      limpiarSeleccion();
      invalidatePlanUsoCache();
      startTransition(() => router.refresh());
    } catch (err: any) {
      setErrorMasivo(err.message || "Error al actualizar");
    } finally {
      setCargandoMasivo(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // FUNCIONES INDIVIDUALES (existentes)
  // ═══════════════════════════════════════════════════════════════
  function cerrarModal() { setModal({ abierto: false, producto: undefined }); }

  function handleGuardado() {
    invalidatePlanUsoCache();
    cerrarModal();
    startTransition(() => router.refresh());
  }

  async function handleEliminar() {
    if (!confirmEliminar.producto) return;
    setConfirmEliminar(prev => ({ ...prev, cargando: true, error: "" }));
    try {
      const res  = await apiFetch(`/api/productos/${confirmEliminar.producto.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) {
        setConfirmEliminar(prev => ({ ...prev, cargando: false, error: data.error ?? "Error al eliminar" }));
        return;
      }
      invalidatePlanUsoCache();
      setConfirmEliminar({ abierto: false, producto: null, cargando: false, error: "" });
      startTransition(() => router.refresh());
    } catch (err: any) {
      if (err?.message !== "SESSION_EXPIRED" && err?.message !== "PLAN_VENCIDO") {
        setConfirmEliminar(prev => ({ ...prev, cargando: false, error: "Error de conexión" }));
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  if (productos.length === 0) {
    return (
      <div className="card py-20 text-center">
        <Package className="h-12 w-12 mx-auto mb-4" style={{ color: "var(--text-faint)" }} />
        <h3 className="text-lg font-medium mb-1" style={{ color: "var(--text-primary)" }}>Sin productos</h3>
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
          Empezá agregando tu primer producto
        </p>
        <button onClick={() => setModal({ abierto: true, producto: undefined })}
          className="inline-flex items-center gap-2 text-sm font-medium" style={{ color: "#DC2626" }}>
          + Agregar producto
        </button>
        {modal.abierto && (
          <ProductoModal categorias={categorias} proveedores={proveedores}
            onClose={cerrarModal} onGuardado={handleGuardado} />
        )}
      </div>
    );
  }

  const todosSeleccionados = seleccionados.size === productos.length;
  const algunosSeleccionados = seleccionados.size > 0 && seleccionados.size < productos.length;

  return (
    <>
      {/* BARRA DE ACCIONES MASIVAS */}
      {seleccionados.size > 0 && (
        <div className="card p-4 mb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5" style={{ color: "#DC2626" }} />
                <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {modoSeleccion === "todos" 
                    ? `${totalProductos} seleccionados (todos)` 
                    : `${seleccionados.size} seleccionado${seleccionados.size !== 1 ? "s" : ""}`
                  }
                </span>
              </div>
              <button
                onClick={limpiarSeleccion}
                className="text-xs font-medium transition-colors"
                style={{ color: "var(--text-muted)" }}
              >
                Limpiar selección
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setAccionMasiva("categoria")}
                className="btn-ghost px-3 py-2 text-xs"
              >
                <Tag className="h-4 w-4" />
                Categoría
              </button>
              <button
                onClick={() => setAccionMasiva("proveedor")}
                className="btn-ghost px-3 py-2 text-xs"
              >
                <Building2 className="h-4 w-4" />
                Proveedor
              </button>
              <button
                onClick={() => setAccionMasiva("stock")}
                className="btn-ghost px-3 py-2 text-xs"
              >
                <PackagePlus className="h-4 w-4" />
                Stock
              </button>
              <button
                onClick={() => setAccionMasiva("precio")}
                className="btn-ghost px-3 py-2 text-xs"
              >
                <DollarSign className="h-4 w-4" />
                Precio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✨ BANNER: Seleccionar todos los resultados */}
      {seleccionados.size === productos.length && modoSeleccion === "pagina" && totalProductos > productos.length && (
        <div className="card p-4 mb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Los <strong>{productos.length}</strong> productos de esta página están seleccionados.
            </p>
            <button
              onClick={() => setModoSeleccion("todos")}
              className="text-sm font-medium underline"
              style={{ color: "#DC2626" }}
            >
              Seleccionar todos los <strong>{totalProductos}</strong> resultados
            </button>
          </div>
        </div>
      )}

      {/* ✨ BANNER: Todos los resultados seleccionados */}
      {modoSeleccion === "todos" && (
        <div className="card p-4 mb-4" style={{ background: "rgba(220,38,38,0.08)", borderColor: "#DC2626" }}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm font-semibold" style={{ color: "#DC2626" }}>
              Todos los <strong>{totalProductos}</strong> resultados están seleccionados
            </p>
            <button
              onClick={() => {
                setModoSeleccion("pagina");
                setSeleccionados(new Set(productos.map(p => p.id)));
              }}
              className="text-sm font-medium underline"
              style={{ color: "#DC2626" }}
            >
              Volver a seleccionar solo esta página
            </button>
          </div>
        </div>
      )}

      {/* TABLA */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ borderBottom: "1px solid var(--border-base)" }}>
              <tr>
                {/* ✨ CHECKBOX SELECCIONAR TODOS */}
                <th className="px-4 py-3 w-12">
                  <button
                    onClick={toggleTodos}
                    className="flex items-center justify-center w-full transition-colors"
                  >
                    {todosSeleccionados || modoSeleccion === "todos" ? (
                      <CheckSquare className="h-5 w-5" style={{ color: "#DC2626" }} />
                    ) : algunosSeleccionados ? (
                      <div className="h-5 w-5 rounded border-2 flex items-center justify-center"
                        style={{ borderColor: "#DC2626", background: "#DC2626" }}>
                        <div className="h-2 w-2 bg-white" />
                      </div>
                    ) : (
                      <Square className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
                    )}
                  </button>
                </th>

                {["Producto", "Categoría", "Precio", "Stock", "Acciones"].map((h) => (
                  <th key={h}
                    className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider
                      ${h === "Precio" || h === "Stock" ? "text-right" : h === "Acciones" ? "text-center" : "text-left"}`}
                    style={{ color: "var(--text-secondary)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {productos.map((producto) => {
                const stockBajo = producto.stock <= producto.stockMinimo;
                const estaSeleccionado = seleccionados.has(producto.id);

                return (
                  <tr key={producto.id} className="table-row">
                    {/* ✨ CHECKBOX POR FILA */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleSeleccion(producto.id)}
                        className="flex items-center justify-center w-full transition-colors"
                      >
                        {estaSeleccionado || modoSeleccion === "todos" ? (
                          <CheckSquare className="h-5 w-5" style={{ color: "#DC2626" }} />
                        ) : (
                          <Square className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
                        )}
                      </button>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {producto.imagen ? (
                          <img src={producto.imagen?.replace('/upload/', '/upload/f_auto,q_auto,w_200/')} 
                            alt={producto.nombre}
                            loading="lazy"
                            className="h-9 w-9 rounded-lg object-cover flex-shrink-0"
                            style={{ border: "1px solid var(--border-base)" }} />
                        ) : (
                          <div className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: "var(--bg-hover)", border: "1px solid var(--border-base)" }}>
                            <Package className="h-4 w-4" style={{ color: "var(--text-secondary)" }} />
                          </div>
                        )}
                        <div>
                          <p className="font-medium" style={{ color: "var(--text-primary)" }}>{producto.nombre}</p>
                          {producto.codigoProducto && (
                            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{producto.codigoProducto}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>
                      {producto.categoria?.nombre ?? <span style={{ color: "var(--text-faint)" }}>—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold" style={{ color: "var(--text-primary)" }}>
                      {formatPrecio(producto.precio)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={stockBajo ? "badge-danger" : "badge-success"}>
                        {stockBajo && <AlertTriangle className="h-3 w-3 mr-1" />}
                        {producto.stock} {producto.unidad ?? "u."}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-3">
                        <button onClick={() => setModal({ abierto: true, producto })}
                          className="text-xs font-medium transition-colors" style={{ color: "var(--text-muted)" }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"}>
                          Editar
                        </button>
                        <button onClick={() => setConfirmEliminar({ abierto: true, producto, cargando: false, error: "" })}
                          className="text-xs font-medium transition-colors" style={{ color: "#f87171" }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#fca5a5"}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#f87171"}>
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL EDICIÓN MASIVA - CATEGORÍA */}
      {accionMasiva === "categoria" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4"
            style={{ background: "var(--bg-card)" }}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                Cambiar categoría
              </h3>
              <button onClick={() => setAccionMasiva(null)}>
                <X className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
              </button>
            </div>

            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Cambiar la categoría de <strong>
                {modoSeleccion === "todos" ? totalProductos : seleccionados.size}
              </strong> producto{(modoSeleccion === "todos" ? totalProductos : seleccionados.size) !== 1 ? "s" : ""}
            </p>

            <div>
              <label className="label-base">Nueva categoría</label>
              <select
                value={nuevaCategoria}
                onChange={(e) => setNuevaCategoria(e.target.value)}
                className="input-base"
              >
                <option value="">Seleccionar categoría</option>
                {categorias.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                ))}
              </select>
            </div>

            {errorMasivo && (
              <p className="text-sm text-red-600">{errorMasivo}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setAccionMasiva(null)}
                className="flex-1 btn-ghost"
              >
                Cancelar
              </button>
              <button
                onClick={aplicarCambioCategoria}
                disabled={!nuevaCategoria || cargandoMasivo}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                {cargandoMasivo ? "Aplicando..." : "Aplicar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDICIÓN MASIVA - PROVEEDOR */}
      {accionMasiva === "proveedor" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4"
            style={{ background: "var(--bg-card)" }}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                Cambiar proveedor
              </h3>
              <button onClick={() => setAccionMasiva(null)}>
                <X className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
              </button>
            </div>

            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Cambiar el proveedor de <strong>
                {modoSeleccion === "todos" ? totalProductos : seleccionados.size}
              </strong> producto{(modoSeleccion === "todos" ? totalProductos : seleccionados.size) !== 1 ? "s" : ""}
            </p>

            <div>
              <label className="label-base">Nuevo proveedor</label>
              <select
                value={nuevoProveedor}
                onChange={(e) => setNuevoProveedor(e.target.value)}
                className="input-base"
              >
                <option value="">Seleccionar proveedor</option>
                {proveedores.map((prov) => (
                  <option key={prov.id} value={prov.id}>{prov.nombre}</option>
                ))}
              </select>
            </div>

            {errorMasivo && (
              <p className="text-sm text-red-600">{errorMasivo}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setAccionMasiva(null)}
                className="flex-1 btn-ghost"
              >
                Cancelar
              </button>
              <button
                onClick={aplicarCambioProveedor}
                disabled={!nuevoProveedor || cargandoMasivo}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                {cargandoMasivo ? "Aplicando..." : "Aplicar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDICIÓN MASIVA - STOCK */}
      {accionMasiva === "stock" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4"
            style={{ background: "var(--bg-card)" }}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                Ajustar stock
              </h3>
              <button onClick={() => setAccionMasiva(null)}>
                <X className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
              </button>
            </div>

            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Ajustar el stock de <strong>
                {modoSeleccion === "todos" ? totalProductos : seleccionados.size}
              </strong> producto{(modoSeleccion === "todos" ? totalProductos : seleccionados.size) !== 1 ? "s" : ""}
            </p>

            <div>
              <label className="label-base">Tipo de ajuste</label>
              <select
                value={ajusteStock}
                onChange={(e) => setAjusteStock(e.target.value as any)}
                className="input-base"
              >
                <option value="establecer">Establecer stock en</option>
                <option value="sumar">Sumar al stock actual</option>
                <option value="restar">Restar del stock actual</option>
              </select>
            </div>

            <div>
              <label className="label-base">Cantidad</label>
              <input
                type="number"
                min="0"
                value={valorStock}
                onChange={(e) => setValorStock(e.target.value)}
                className="input-base"
                placeholder="0"
              />
            </div>

            {errorMasivo && (
              <p className="text-sm text-red-600">{errorMasivo}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setAccionMasiva(null)}
                className="flex-1 btn-ghost"
              >
                Cancelar
              </button>
              <button
                onClick={aplicarCambioStock}
                disabled={!valorStock || cargandoMasivo}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                {cargandoMasivo ? "Aplicando..." : "Aplicar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDICIÓN MASIVA - PRECIO */}
      {accionMasiva === "precio" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4"
            style={{ background: "var(--bg-card)" }}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                Ajustar precios
              </h3>
              <button onClick={() => setAccionMasiva(null)}>
                <X className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
              </button>
            </div>

            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Ajustar el precio de <strong>
                {modoSeleccion === "todos" ? totalProductos : seleccionados.size}
              </strong> producto{(modoSeleccion === "todos" ? totalProductos : seleccionados.size) !== 1 ? "s" : ""}
            </p>

            <div>
              <label className="label-base">Tipo de ajuste</label>
              <select
                value={ajustePrecio}
                onChange={(e) => setAjustePrecio(e.target.value as any)}
                className="input-base"
              >
                <option value="porcentaje">Aumentar/Reducir por porcentaje</option>
                <option value="fijo">Establecer precio fijo</option>
              </select>
            </div>

            <div>
              <label className="label-base">
                {ajustePrecio === "porcentaje" ? "Porcentaje (+ o -)" : "Nuevo precio"}
              </label>
              <div className="relative">
                {ajustePrecio === "porcentaje" ? (
                  <>
                    <input
                      type="number"
                      value={valorPrecio}
                      onChange={(e) => setValorPrecio(e.target.value)}
                      className="input-base pr-8"
                      placeholder="Ej: 10 para +10%, -15 para -15%"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm"
                      style={{ color: "var(--text-muted)" }}>%</span>
                  </>
                ) : (
                  <>
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium"
                      style={{ color: "var(--text-muted)" }}>$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={valorPrecio}
                      onChange={(e) => setValorPrecio(e.target.value)}
                      className="input-base pl-8"
                      placeholder="0.00"
                    />
                  </>
                )}
              </div>
              {ajustePrecio === "porcentaje" && (
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  Ejemplo: 10 = +10% | -20 = -20%
                </p>
              )}
            </div>

            {errorMasivo && (
              <p className="text-sm text-red-600">{errorMasivo}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setAccionMasiva(null)}
                className="flex-1 btn-ghost"
              >
                Cancelar
              </button>
              <button
                onClick={aplicarCambioPrecio}
                disabled={!valorPrecio || cargandoMasivo}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                {cargandoMasivo ? "Aplicando..." : "Aplicar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALS INDIVIDUALES (existentes) */}
      {modal.abierto && (
        <ProductoModal producto={modal.producto as Producto | undefined}
          categorias={categorias} proveedores={proveedores}
          onClose={cerrarModal} onGuardado={handleGuardado} />
      )}

      {confirmEliminar.abierto && confirmEliminar.producto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 backdrop-blur-sm" style={{ background: "rgba(0,0,0,0.65)" }}
            onClick={() => !confirmEliminar.cargando && setConfirmEliminar(prev => ({ ...prev, abierto: false }))} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl shadow-xl p-6 space-y-4"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-md)" }}>
            <div className="flex h-12 w-12 items-center justify-center rounded-full mx-auto"
              style={{ background: "rgba(220,38,38,0.12)", border: "1px solid rgba(220,38,38,0.25)" }}>
              <Trash2 className="h-5 w-5" style={{ color: "#f87171" }} />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>¿Eliminar producto?</h3>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Vas a desactivar{" "}
                <span className="font-semibold" style={{ color: "var(--text-secondary)" }}>
                  {confirmEliminar.producto.nombre}
                </span>
                . No aparecerá más en el inventario ni en el POS.
              </p>
            </div>
            {confirmEliminar.error && (
              <p className="text-center text-xs rounded-lg px-3 py-2"
                style={{ color: "#f87171", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)" }}>
                {confirmEliminar.error}
              </p>
            )}
            <div className="flex gap-3 pt-1">
              <button onClick={() => setConfirmEliminar(prev => ({ ...prev, abierto: false }))}
                disabled={confirmEliminar.cargando}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
                style={{ color: "var(--text-muted)", background: "var(--bg-hover)", border: "1px solid var(--border-base)" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-hover-md)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"}>
                Cancelar
              </button>
              <button onClick={handleEliminar} disabled={confirmEliminar.cargando}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "#DC2626", color: "#ffffff" }}
                onMouseEnter={e => { if (!e.currentTarget.disabled) (e.currentTarget as HTMLElement).style.background = "#b91c1c"; }}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "#DC2626"}>
                {confirmEliminar.cargando
                  ? <><div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Eliminando...</>
                  : <><Trash2 className="h-3.5 w-3.5" />Sí, eliminar</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTE BOTÓN NUEVO PRODUCTO (sin cambios)
// ═══════════════════════════════════════════════════════════════
export function NuevoProductoBtn({
  categorias, proveedores,
}: {
  categorias:  Pick<Categoria, "id" | "nombre">[];
  proveedores: Pick<Proveedor, "id" | "nombre">[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [abierto, setAbierto] = useState(false);

  function handleGuardado() {
    invalidatePlanUsoCache();
    setAbierto(false);
    startTransition(() => router.refresh());
  }

  return (
    <>
      <button onClick={() => setAbierto(true)} className="btn-primary">
        <span style={{ fontSize: "1rem", lineHeight: 1 }}>+</span>
        Nuevo producto
      </button>
      {abierto && (
        <ProductoModal categorias={categorias} proveedores={proveedores}
          onClose={() => setAbierto(false)} onGuardado={handleGuardado} />
      )}
    </>
  );
}