"use client";
// components/productos/ProductosTabla.tsx

import { useState, useTransition } from "react";
import { useRouter }               from "next/navigation";
import { Package, AlertTriangle, Trash2 } from "lucide-react";
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
};

export default function ProductosTabla({ productos, categorias, proveedores }: Props) {
  const router       = useRouter();
  const { apiFetch } = useFetch();
  const [, startTransition] = useTransition();

  const [modal, setModal] = useState<{ abierto: boolean; producto: ProductoFila | undefined }>({
    abierto: false, producto: undefined,
  });

  const [confirmEliminar, setConfirmEliminar] = useState<{
    abierto: boolean; producto: ProductoFila | null; cargando: boolean; error: string;
  }>({ abierto: false, producto: null, cargando: false, error: "" });

  function cerrarModal() { setModal({ abierto: false, producto: undefined }); }

  function handleGuardado() {
    invalidatePlanUsoCache(); // ✅ crea producto → puede cambiar el contador FREE
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
      invalidatePlanUsoCache(); // ✅ elimina producto → baja el contador FREE
      setConfirmEliminar({ abierto: false, producto: null, cargando: false, error: "" });
      startTransition(() => router.refresh());
    } catch (err: any) {
      if (err?.message !== "SESSION_EXPIRED" && err?.message !== "PLAN_VENCIDO") {
        setConfirmEliminar(prev => ({ ...prev, cargando: false, error: "Error de conexión" }));
      }
    }
  }

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

  return (
    <>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ borderBottom: "1px solid var(--border-base)" }}>
              <tr>
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
                return (
                  <tr key={producto.id} className="table-row">
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
    invalidatePlanUsoCache(); // ✅
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