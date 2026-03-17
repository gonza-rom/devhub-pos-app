"use client";
// components/productos/ProductoModal.tsx

import { useState, useEffect } from "react";
import { X, Package } from "lucide-react";
import MultipleImageUpload from "@/components/ui/MultipleImageUpload";
import { useFetch }        from "@/hooks/useFetch";
import { useToast }        from "@/components/toast";
import type { Categoria, Proveedor, Producto } from "@/types";

type FormData = {
  nombre: string; descripcion: string; codigoProducto: string; codigoBarras: string;
  precio: string; costo: string; stock: string; stockMinimo: string; unidad: string;
  imagen: string; imagenes: string[]; categoriaId: string; proveedorId: string;
};

const FORM_VACIO: FormData = {
  nombre: "", descripcion: "", codigoProducto: "", codigoBarras: "",
  precio: "", costo: "", stock: "0", stockMinimo: "5",
  unidad: "", imagen: "", imagenes: [], categoriaId: "", proveedorId: "",
};

function productoToForm(p: Producto): FormData {
  return {
    nombre:         p.nombre,
    descripcion:    p.descripcion    ?? "",
    codigoProducto: p.codigoProducto ?? "",
    codigoBarras:   p.codigoBarras   ?? "",
    precio:         String(p.precio),
    costo:          p.costo ? String(p.costo) : "",
    stock:          String(p.stock),
    stockMinimo:    String(p.stockMinimo),
    unidad:         p.unidad   ?? "",
    imagen:         p.imagen   ?? "",
    imagenes:       p.imagenes ?? [],
    categoriaId:    p.categoriaId  ?? "",
    proveedorId:    p.proveedorId  ?? "",
  };
}

export type Props = {
  producto?:   Producto;
  categorias:  Pick<Categoria, "id" | "nombre">[];
  proveedores: Pick<Proveedor, "id" | "nombre">[];
  onClose:     () => void;
  onGuardado:  (producto: Producto) => void;
};

export default function ProductoModal({ producto, categorias, proveedores, onClose, onGuardado }: Props) {
  const { apiFetch } = useFetch();
  const toast        = useToast();
  const esEdicion    = !!producto;

  const [form,     setForm]     = useState<FormData>(producto ? productoToForm(producto) : FORM_VACIO);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape" && !cargando) onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [cargando, onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);

    const payload = {
      nombre:         form.nombre.trim(),
      descripcion:    form.descripcion.trim() || undefined,
      codigoProducto: form.codigoProducto.trim() || undefined,
      codigoBarras:   form.codigoBarras.trim()   || undefined,
      precio:         parseFloat(form.precio),
      costo:          form.costo ? parseFloat(form.costo) : undefined,
      stock:          parseInt(form.stock)       || 0,
      stockMinimo:    parseInt(form.stockMinimo) || 5,
      unidad:         form.unidad.trim() || undefined,
      imagen:         form.imagen || form.imagenes[0] || undefined,
      imagenes:       form.imagenes,
      categoriaId:    form.categoriaId || undefined,
      proveedorId:    form.proveedorId || undefined,
    };

    const toastId = toast.loading(esEdicion ? "Guardando cambios..." : "Creando producto...");
    try {
      const res  = await apiFetch(
        esEdicion ? `/api/productos/${producto!.id}` : "/api/productos",
        { method: esEdicion ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
      );
      const data = await res.json();

      if (!data.ok) {
        toast.update(toastId, { type: "error", title: "Error al guardar", description: data.error ?? "Intentá de nuevo" });
        return;
      }

      toast.update(toastId, {
        type:        "success",
        title:       esEdicion ? "Producto actualizado" : "Producto creado",
        description: form.nombre.trim(),
      });
      setTimeout(() => { onGuardado(data.data); onClose(); }, 600);
    } catch (err: any) {
      if (err?.message !== "SESSION_EXPIRED" && err?.message !== "PLAN_VENCIDO") {
        toast.update(toastId, { type: "error", title: "Error de conexión", description: "Intentá de nuevo" });
      }
    } finally {
      setCargando(false);
    }
  }

  const margen =
    form.precio && form.costo && parseFloat(form.costo) > 0
      ? (((parseFloat(form.precio) - parseFloat(form.costo)) / parseFloat(form.costo)) * 100).toFixed(1)
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: "rgba(0,0,0,0.65)" }}
        onClick={() => !cargando && onClose()} />

      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-md)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--border-base)" }}>
          <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Package className="h-4 w-4" style={{ color: "var(--text-faint)" }} />
            {esEdicion ? `Editar: ${producto!.nombre}` : "Nuevo producto"}
          </h2>
          <button onClick={() => !cargando && onClose()} style={{ color: "var(--text-faint)" }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--text-faint)"}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <form id="producto-form" onSubmit={handleSubmit} className="p-6 space-y-5">
            <MultipleImageUpload
              value={form.imagenes}
              onChange={(imagenes) => setForm((prev) => ({ ...prev, imagenes, imagen: imagenes[0] ?? "" }))}
            />
            <div className="h-px" style={{ background: "var(--border-subtle)" }} />

            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>Información</h3>
              <div>
                <label className="label-base">Nombre *</label>
                <input type="text" name="nombre" value={form.nombre} onChange={handleChange}
                  required placeholder="Ej: Coca Cola 500ml" className="input-base" autoFocus />
              </div>
              <div>
                <label className="label-base">Descripción</label>
                <textarea name="descripcion" value={form.descripcion} onChange={handleChange}
                  rows={2} placeholder="Descripción opcional..." className="input-base resize-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-base">Código interno</label>
                <input type="text" name="codigoProducto" value={form.codigoProducto} onChange={handleChange}
                  placeholder="Ej: PROD-001" className="input-base" />
              </div>
              <div>
                <label className="label-base">Código de barras</label>
                <input type="text" name="codigoBarras" value={form.codigoBarras} onChange={handleChange}
                  placeholder="Ej: 7790001234567" className="input-base" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-base">Categoría</label>
                <select name="categoriaId" value={form.categoriaId} onChange={handleChange} className="input-base">
                  <option value="">Sin categoría</option>
                  {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="label-base">Proveedor</label>
                <select name="proveedorId" value={form.proveedorId} onChange={handleChange} className="input-base">
                  <option value="">Sin proveedor</option>
                  {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
            </div>

            <div className="h-px" style={{ background: "var(--border-subtle)" }} />

            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>Precios y stock</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-base">Precio de venta *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--text-faint)" }}>$</span>
                    <input type="number" name="precio" value={form.precio} onChange={handleChange}
                      required min="0" step="0.01" placeholder="0" className="input-base pl-7" />
                  </div>
                </div>
                <div>
                  <label className="label-base">Precio de costo</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--text-faint)" }}>$</span>
                    <input type="number" name="costo" value={form.costo} onChange={handleChange}
                      min="0" step="0.01" placeholder="0" className="input-base pl-7" />
                  </div>
                </div>
              </div>

              {margen !== null && (
                <div className="rounded-lg px-4 py-2 text-sm"
                  style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", color: "#60a5fa" }}>
                  Margen: <strong>{margen}%</strong>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label-base">{esEdicion ? "Stock actual" : "Stock inicial"}</label>
                  <input type="number" name="stock" value={form.stock} onChange={handleChange} min="0" className="input-base" />
                  {esEdicion && <p className="text-xs mt-1" style={{ color: "var(--text-faint)" }}>Ajustá desde Movimientos</p>}
                </div>
                <div>
                  <label className="label-base">Stock mínimo</label>
                  <input type="number" name="stockMinimo" value={form.stockMinimo} onChange={handleChange} min="0" className="input-base" />
                  <p className="text-xs mt-1" style={{ color: "var(--text-faint)" }}>Alerta</p>
                </div>
                <div>
                  <label className="label-base">Unidad</label>
                  <input type="text" name="unidad" value={form.unidad} onChange={handleChange}
                    placeholder="kg, litro, u." className="input-base" />
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 flex-shrink-0" style={{ borderTop: "1px solid var(--border-base)" }}>
          <button type="button" onClick={() => !cargando && onClose()} disabled={cargando}
            className="flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
            style={{ color: "var(--text-muted)", background: "var(--bg-hover)", border: "1px solid var(--border-base)" }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-hover-md)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"}>
            Cancelar
          </button>
          <button type="submit" form="producto-form" disabled={cargando}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "#DC2626", color: "#ffffff" }}
            onMouseEnter={e => { if (!e.currentTarget.disabled) (e.currentTarget as HTMLElement).style.background = "#b91c1c"; }}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "#DC2626"}>
            {cargando
              ? <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{esEdicion ? "Guardando..." : "Creando..."}</>
              : esEdicion ? "Guardar cambios" : "Crear producto"
            }
          </button>
        </div>
      </div>
    </div>
  );
}