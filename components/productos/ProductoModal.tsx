"use client";
// components/productos/ProductoModal.tsx

import { useState, useEffect } from "react";
import { X, Package, Plus, Trash2 } from "lucide-react";
import MultipleImageUpload from "@/components/ui/MultipleImageUpload";
import { useFetch }        from "@/hooks/useFetch";
import { useToast }        from "@/components/toast";
import type { Proveedor, Producto } from "@/types";

// ── Tipos ────────────────────────────────────────────────────

// Tipo local para el árbol de categorías
type CategoriaArbol = {
  id:     string;
  nombre: string;
  hijas?: CategoriaArbol[];
};

type FormData = {
  nombre: string; descripcion: string; codigoProducto: string; codigoBarras: string;
  precio: string; costo: string; stock: string; stockMinimo: string; unidad: string;
  imagen: string; imagenes: string[]; categoriaId: string; proveedorId: string;
  tieneVariantes: boolean; visibleCatalogo: boolean;
};

type Variante = {
  id?:    string;
  talle:  string;
  color:  string;
  stock:  string;
  precio: string;
  activo: boolean;
};

const TALLES = ["XS", "S", "M", "L", "XL", "XXL"];

const FORM_VACIO: FormData = {
  nombre: "", descripcion: "", codigoProducto: "", codigoBarras: "",
  precio: "", costo: "", stock: "0", stockMinimo: "1",
  unidad: "", imagen: "", imagenes: [], categoriaId: "", proveedorId: "",
  tieneVariantes: false, visibleCatalogo: false,
};

function productoToForm(p: Producto): FormData {
  return {
    nombre:          p.nombre,
    descripcion:     p.descripcion    ?? "",
    codigoProducto:  p.codigoProducto ?? "",
    codigoBarras:    p.codigoBarras   ?? "",
    precio:          String(p.precio),
    costo:           p.costo ? String(p.costo) : "",
    stock:           String(p.stock),
    stockMinimo:     String(p.stockMinimo),
    unidad:          p.unidad   ?? "",
    imagen:          p.imagen   ?? "",
    imagenes:        p.imagenes?.length ? p.imagenes : (p.imagen ? [p.imagen] : []),
    categoriaId:     p.categoriaId  ?? "",
    proveedorId:     p.proveedorId  ?? "",
    tieneVariantes:  (p as any).tieneVariantes ?? false,
    visibleCatalogo: (p as any).visibleCatalogo ?? false,
  };
}

// ── Helper: encontrar categoría por id en el árbol ───────────

function encontrarCategoria(cats: CategoriaArbol[], id: string): CategoriaArbol | null {
  for (const cat of cats) {
    if (cat.id === id) return cat;
    const encontrada = encontrarCategoria(cat.hijas ?? [], id);  // ← fix
    if (encontrada) return encontrada;
  }
  return null;
}

function encontrarPadre(cats: CategoriaArbol[], hijaId: string): CategoriaArbol | null {
  for (const cat of cats) {
    const hijas = cat.hijas ?? [];
    if (hijas.some(h => h.id === hijaId)) return cat;
    const encontrado = encontrarPadre(hijas, hijaId);
    if (encontrado) return encontrado;
  }
  return null;
}

// ── Selector de categoría encadenado ─────────────────────────

function SelectorCategoria({
  categorias, value, onChange, disabled,
}: {
  categorias: CategoriaArbol[];
  value:      string;
  onChange:   (id: string) => void;
  disabled?:  boolean;
}) {
  // Encontrar en qué nivel está el value actual
  const esRaiz      = categorias.some(c => c.id === value);
  const padreDeHija = categorias.find(c => (c.hijas ?? []).some(h => h.id === value));

  // padreSeleccionado es:
  // - la categoría raíz si value es raíz con hijas
  // - el padre si value es una hija
  // - null si no hay nada seleccionado
  const padreActual = esRaiz
    ? (categorias.find(c => c.id === value) ?? null)
    : (padreDeHija ?? null);

  const subcategorias = padreActual?.hijas ?? [];

  // Qué mostrar en el primer select
  const valorPrimer = padreActual?.id ?? "";

  // Qué mostrar en el segundo select
  const valorSegundo = !esRaiz && padreDeHija ? value : "";

  function handlePrimerChange(id: string) {
    if (!id) { onChange(""); return; }
    const cat = categorias.find(c => c.id === id);
    // Siempre seleccionar la raíz — el segundo select permite refinar
    onChange(id);
  }

  function handleSegundoChange(id: string) {
    if (!id) {
      // Volver a seleccionar el padre
      onChange(padreActual?.id ?? "");
    } else {
      onChange(id);
    }
  }

  return (
    <div className="space-y-2">
      <select
        value={valorPrimer}
        onChange={e => handlePrimerChange(e.target.value)}
        className="input-base"
      >
        <option value="">Sin categoría</option>
        {categorias.map(c => (
          <option key={c.id} value={c.id}>{c.nombre}</option>
        ))}
      </select>

      {subcategorias.length > 0 && (
        <select
          value={valorSegundo}
          onChange={e => handleSegundoChange(e.target.value)}
          className="input-base"
          style={{ borderColor: "rgba(220,38,38,0.3)" }}
        >
          <option value="">— Todas las de {padreActual?.nombre} —</option>
          {subcategorias.map(h => (
            <option key={h.id} value={h.id}>{h.nombre}</option>
          ))}
        </select>
      )}
    </div>
  );
}
// ── Props ────────────────────────────────────────────────────

export type Props = {
  producto?:   Producto;
  categorias:  CategoriaArbol[];  // ← ahora recibe el árbol
  proveedores: Pick<{ id: string; nombre: string }, "id" | "nombre">[];
  onClose:     () => void;
  onGuardado:  (producto: Producto) => void;
};

// ── Componente principal ─────────────────────────────────────

export default function ProductoModal({ producto, categorias, proveedores, onClose, onGuardado }: Props) {
  const { apiFetch } = useFetch();
  const toast        = useToast();
  const esEdicion    = !!producto;

  const [form,      setForm]      = useState<FormData>(producto ? productoToForm(producto) : FORM_VACIO);
  const [variantes, setVariantes] = useState<Variante[]>([]);
  const [cargando,  setCargando]  = useState(false);
  const [precioPorVariante, setPrecioPorVariante] = useState(false);

  useEffect(() => {
    if (!esEdicion || !(producto as any).tieneVariantes) return;
    fetch(`/api/productos/${producto!.id}/variantes`)
      .then(r => r.json())
      .then(data => {
        if (data.ok && data.data) {
          setVariantes(data.data.map((v: any) => ({
            id: v.id, talle: v.talle ?? "", color: v.color ?? "",
            stock: String(v.stock), precio: v.precio ? String(v.precio) : "", activo: v.activo,
          })));
        }
      }).catch(() => {});
  }, [esEdicion, producto]);

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
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function agregarVariante() {
    setVariantes(prev => [...prev, { talle: "M", color: "", stock: "0", precio: "", activo: true }]);
  }

  function actualizarVariante(index: number, campo: keyof Variante, valor: string | boolean) {
    setVariantes(prev => prev.map((v, i) => i === index ? { ...v, [campo]: valor } : v));
  }

  function eliminarVariante(index: number) {
    setVariantes(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (form.tieneVariantes) {
      if (variantes.length === 0) {
        toast.error("Agregá al menos una variante", "O desactivá la opción de variantes");
        return;
      }
      if (variantes.some(v => !v.color.trim())) {
        toast.error("Completá el color de todas las variantes");
        return;
      }
    }

    setCargando(true);

    const payload = {
      nombre:          form.nombre.trim(),
      descripcion:     form.descripcion.trim() || undefined,
      codigoProducto:  form.codigoProducto.trim() || undefined,
      codigoBarras:    form.codigoBarras.trim()   || undefined,
      precio:          parseFloat(form.precio),
      costo:           form.costo ? parseFloat(form.costo) : undefined,
      stock:           form.tieneVariantes ? 0 : (parseInt(form.stock) || 0),
      stockMinimo:     parseInt(form.stockMinimo) || 1,
      unidad:          form.unidad.trim() || undefined,
      imagen:          form.imagen || form.imagenes[0] || undefined,
      imagenes:        form.imagenes,
      categoriaId:     form.categoriaId || undefined,
      proveedorId:     form.proveedorId || undefined,
      tieneVariantes:  form.tieneVariantes,
      visibleCatalogo: form.visibleCatalogo,
      variantes: form.tieneVariantes ? variantes.map(v => ({
        id: v.id, talle: v.talle || null, color: v.color.trim(),
        stock: parseInt(v.stock) || 0,
        precio: precioPorVariante && v.precio ? parseFloat(v.precio) : null,
        activo: v.activo,
      })) : [],
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

  const margen = form.precio && form.costo && parseFloat(form.costo) > 0
    ? (((parseFloat(form.precio) - parseFloat(form.costo)) / parseFloat(form.costo)) * 100).toFixed(1)
    : null;

  const stockTotalVariantes = variantes.reduce((acc, v) => acc + (parseInt(v.stock) || 0), 0);

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
            <Package className="h-4 w-4" />
            {esEdicion ? `Editar: ${producto!.nombre}` : "Nuevo producto"}
          </h2>
          <button onClick={() => !cargando && onClose()} style={{ color: "var(--text-faint)" }}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto modal-scroll">
          <form id="producto-form" onSubmit={handleSubmit} className="p-6 space-y-5">

            <MultipleImageUpload
              value={form.imagenes}
              onChange={imagenes => setForm(prev => ({ ...prev, imagenes, imagen: imagenes[0] ?? "" }))}
            />
            <div className="h-px" style={{ background: "var(--border-subtle)" }} />

            {/* Información */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>Información</h3>
              <div>
                <label className="label-base" style={{ color: "var(--text-primary)" }}>Nombre *</label>
                <input type="text" name="nombre" value={form.nombre} onChange={handleChange}
                  required placeholder="Ej: Remera básica" className="input-base" autoFocus />
              </div>
              <div>
                <label className="label-base" style={{ color: "var(--text-primary)" }}>Descripción</label>
                <textarea name="descripcion" value={form.descripcion} onChange={handleChange}
                  rows={2} placeholder="Descripción opcional..." className="input-base resize-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-base" style={{ color: "var(--text-primary)" }}>Código interno</label>
                <input type="text" name="codigoProducto" value={form.codigoProducto} onChange={handleChange}
                  placeholder="Ej: PROD-001" className="input-base" />
              </div>
              <div>
                <label className="label-base" style={{ color: "var(--text-primary)" }}>Código de barras</label>
                <input type="text" name="codigoBarras" value={form.codigoBarras} onChange={handleChange}
                  placeholder="Ej: 7790001234567" className="input-base" />
              </div>
            </div>

            {/* Categoría encadenada + Proveedor */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-base" style={{ color: "var(--text-primary)" }}>Categoría</label>
                <SelectorCategoria
                  categorias={categorias}
                  value={form.categoriaId}
                  onChange={id => setForm(prev => ({ ...prev, categoriaId: id }))}
                />
              </div>
              <div>
                <label className="label-base" style={{ color: "var(--text-primary)" }}>Proveedor</label>
                <select name="proveedorId" value={form.proveedorId} onChange={handleChange} className="input-base">
                  <option value="">Sin proveedor</option>
                  {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
            </div>

            <div className="h-px" style={{ background: "var(--border-subtle)" }} />

            {/* Precios y stock */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>Precios y stock</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-base" style={{ color: "var(--text-primary)" }}>Precio de venta *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--text-faint)" }}>$</span>
                    <input type="number" name="precio" value={form.precio} onChange={handleChange}
                      required min="0" step="0.01" placeholder="0" className="input-base pl-7"
                      onWheel={e => e.currentTarget.blur()} />
                  </div>
                </div>
                <div>
                  <label className="label-base" style={{ color: "var(--text-primary)" }}>Precio de costo</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--text-faint)" }}>$</span>
                    <input type="number" name="costo" value={form.costo} onChange={handleChange}
                      min="0" step="0.01" placeholder="0" className="input-base pl-7"
                      onWheel={e => e.currentTarget.blur()} />
                  </div>
                </div>
              </div>

              {margen !== null && (
                <div className="rounded-lg px-4 py-2 text-sm"
                  style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", color: "#60a5fa" }}>
                  Margen: <strong>{margen}%</strong>
                </div>
              )}

              {!form.tieneVariantes && (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="label-base" style={{ color: "var(--text-primary)" }}>{esEdicion ? "Stock actual" : "Stock inicial"}</label>
                    <input type="number" name="stock" value={form.stock} onChange={handleChange}
                      min="0" className="input-base" onWheel={e => e.currentTarget.blur()} />
                    {esEdicion && <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>Ajustá desde Movimientos</p>}
                  </div>
                  <div>
                    <label className="label-base" style={{ color: "var(--text-primary)" }}>Stock mínimo</label>
                    <input type="number" name="stockMinimo" value={form.stockMinimo} onChange={handleChange}
                      min="0" className="input-base" onWheel={e => e.currentTarget.blur()} />
                    <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>Alerta</p>
                  </div>
                  <div>
                    <label className="label-base" style={{ color: "var(--text-primary)" }}>Unidad</label>
                    <input type="text" name="unidad" value={form.unidad} onChange={handleChange}
                      placeholder="kg, litro, u." className="input-base" />
                  </div>
                </div>
              )}

              {form.tieneVariantes && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label-base" style={{ color: "var(--text-primary)" }}>Stock mínimo</label>
                    <input type="number" name="stockMinimo" value={form.stockMinimo} onChange={handleChange}
                      min="0" className="input-base" onWheel={e => e.currentTarget.blur()} />
                    <p className="text-xs mt-1" style={{ color: "var(--text-faint)" }}>Alerta por variante</p>
                  </div>
                  <div className="flex items-end pb-1">
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                      Stock total: <span className="font-bold" style={{ color: "var(--text-primary)" }}>{stockTotalVariantes}</span> unidades
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="h-px" style={{ background: "var(--border-subtle)" }} />

            {/* Catálogo público */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>Catálogo público</h3>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>Mostrar este producto en el catálogo web</p>
              </div>
              <button type="button"
                onClick={() => setForm(prev => ({ ...prev, visibleCatalogo: !prev.visibleCatalogo }))}
                className="relative flex-shrink-0 h-6 w-11 rounded-full transition-colors duration-200"
                style={{ background: form.visibleCatalogo ? "var(--color-red)" : "rgba(220,38,38,0.3)" }}>
                <span className="absolute top-0.5 h-5 w-5 rounded-full shadow toggle-thumb transition-transform duration-200"
                  style={{ transform: form.visibleCatalogo ? "translateX(22px)" : "translateX(2px)" }} />
              </button>
            </div>

            {/* Variantes */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>Variantes</h3>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-faint)" }}>Activá si el producto tiene talle y/o color</p>
                </div>
                <button type="button"
                  onClick={() => { setForm(prev => ({ ...prev, tieneVariantes: !prev.tieneVariantes })); if (!form.tieneVariantes && variantes.length === 0) agregarVariante(); }}
                  className="relative flex-shrink-0 h-6 w-11 rounded-full transition-colors duration-200"
                  style={{ background: form.tieneVariantes ? "var(--color-red)" : "rgba(220,38,38,0.3)" }}>
                  <span className="absolute top-0.5 h-5 w-5 rounded-full shadow toggle-thumb transition-transform duration-200"
                    style={{ transform: form.tieneVariantes ? "translateX(22px)" : "translateX(2px)" }} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none" style={{ color: "var(--text-muted)" }}>
                  <input type="checkbox" checked={precioPorVariante} onChange={e => setPrecioPorVariante(e.target.checked)} className="rounded" />
                  Precio por variante
                </label>
              </div>

              {form.tieneVariantes && (
                <div className="space-y-3">
                  <div className="grid gap-2 text-xs font-semibold uppercase tracking-wider"
                    style={{ gridTemplateColumns: precioPorVariante ? "90px 110px 80px 120px 32px" : "90px 110px 80px 32px", color: "var(--text-primary)" }}>
                    <span>Talle</span><span>Color</span><span>Stock</span>
                    {precioPorVariante && <span>Precio</span>}
                    <span />
                  </div>
                  {variantes.map((v, i) => (
                    <div key={i} className="grid gap-2 items-center"
                      style={{ gridTemplateColumns: precioPorVariante ? "90px 110px 80px 120px 32px" : "90px 110px 80px 32px" }}>
                      <select value={v.talle} onChange={e => actualizarVariante(i, "talle", e.target.value)} className="input-base text-sm">
                        <option value="">Sin talle</option>
                        {TALLES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <input type="text" value={v.color} onChange={e => actualizarVariante(i, "color", e.target.value)}
                        placeholder="Rojo, Negro..." className="input-base text-sm" />
                      <input type="number" value={v.stock} onChange={e => actualizarVariante(i, "stock", e.target.value)}
                        min="0" className="input-base text-sm" onWheel={e => e.currentTarget.blur()} />
                      {precioPorVariante && (
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: "var(--text-faint)" }}>$</span>
                          <input type="number" value={v.precio} onChange={e => actualizarVariante(i, "precio", e.target.value)}
                            placeholder="0" min="0" className="input-base text-sm pl-5" onWheel={e => e.currentTarget.blur()} />
                        </div>
                      )}
                      <button type="button" onClick={() => eliminarVariante(i)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                        style={{ color: "var(--text-faint)" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#f87171"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--text-faint)"}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={agregarVariante}
                    className="flex items-center gap-2 text-xs font-medium py-2 px-3 rounded-lg w-full justify-center transition-colors"
                    style={{ border: "1px dashed var(--border-md)", color: "var(--text-muted)", background: "transparent" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(220,38,38,0.4)"; (e.currentTarget as HTMLElement).style.color = "#f87171"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-md)"; (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}>
                    <Plus className="h-3.5 w-3.5" /> Agregar variante
                  </button>
                  <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                    El precio de cada variante es opcional. Si lo dejás vacío usa el precio base del producto.
                  </p>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 flex-shrink-0" style={{ borderTop: "1px solid var(--border-base)" }}>
          <button type="button" onClick={() => !cargando && onClose()} disabled={cargando}
            className="flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
            style={{ color: "var(--text-muted)", background: "var(--bg-hover)", border: "1px solid var(--border-base)" }}>
            Cancelar
          </button>
          <button type="submit" form="producto-form" disabled={cargando}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "#DC2626", color: "#ffffff" }}>
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