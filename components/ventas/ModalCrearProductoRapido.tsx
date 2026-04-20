// components/ventas/ModalCrearProductoRapido.tsx
"use client";

import { useState, useEffect } from "react";
import { X, Package, Loader2 } from "lucide-react";
import { useToast } from "@/components/toast";

// ── Tipos ────────────────────────────────────────────────────

type CategoriaArbol = {
  id:     string;
  nombre: string;
  hijas?:  CategoriaArbol[];
};

type Props = {
  open:             boolean;
  onClose:          () => void;
  onProductoCreado: (producto: any) => void;
  categorias?:      CategoriaArbol[];
};

// ── Selector de categoría encadenado ─────────────────────────

function SelectorCategoria({
  categorias, value, onChange,disabled,
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

// ── Componente principal ─────────────────────────────────────

export function ModalCrearProductoRapido({ open, onClose, onProductoCreado, categorias = [] }: Props) {
  const toast = useToast();

  const [form, setForm] = useState({
    nombre: "", codigoProducto: "", precio: "", stock: "0", categoriaId: "",
  });
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.nombre.trim()) { toast.error("El nombre es obligatorio"); return; }
    if (!form.precio || parseFloat(form.precio) <= 0) { toast.error("El precio debe ser mayor a 0"); return; }

    setCargando(true);

    await toast.promise(
      fetch("/api/productos", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre:         form.nombre.trim(),
          codigoProducto: form.codigoProducto.trim() || null,
          precio:         parseFloat(form.precio),
          stock:          parseInt(form.stock) || 0,
          categoriaId:    form.categoriaId || null,
          activo:         true,
        }),
      }).then(async (res) => {
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "Error al crear el producto");
        onProductoCreado(data.data);
        setTimeout(() => {
          onClose();
          setForm({ nombre: "", codigoProducto: "", precio: "", stock: "0", categoriaId: "" });
        }, 800);
        return data;
      }),
      {
        loading: "Creando producto...",
        success: `"${form.nombre.trim()}" creado correctamente`,
        error:   (e: unknown) => (e instanceof Error ? e.message : "Error al crear el producto"),
      }
    ).finally(() => { setCargando(false); });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl p-6 space-y-4"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border-base)" }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: "rgba(220,38,38,0.15)" }}>
              <Package className="h-4 w-4 text-red-400" />
            </div>
            <h3 className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>
              Crear producto rápido
            </h3>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
            style={{ background: "var(--bg-hover)", color: "var(--text-muted)" }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>
              Nombre del producto *
            </label>
            <input type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej: Remera negra talle M" className="input-base w-full" autoFocus disabled={cargando} />
          </div>

          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>
              Código de producto (opcional)
            </label>
            <input type="text" value={form.codigoProducto} onChange={e => setForm({ ...form, codigoProducto: e.target.value })}
              placeholder="Ej: REM-001" className="input-base w-full" disabled={cargando} />
          </div>

          {/* Categoría encadenada */}
          {categorias.length > 0 && (
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>
                Categoría (opcional)
              </label>
              <SelectorCategoria
                categorias={categorias}
                value={form.categoriaId}
                onChange={id => setForm({ ...form, categoriaId: id })}
                disabled={cargando}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>Precio *</label>
              <input type="number" value={form.precio} onChange={e => setForm({ ...form, precio: e.target.value })}
                placeholder="0.00" min="0" step="0.01" className="input-base w-full"
                onWheel={e => e.currentTarget.blur()} disabled={cargando} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>Stock inicial</label>
              <input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })}
                min="0" className="input-base w-full" onWheel={e => e.currentTarget.blur()} disabled={cargando} />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} disabled={cargando}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}>
              Cancelar
            </button>
            <button type="submit" disabled={cargando}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: "#DC2626", color: "#fff" }}>
              {cargando ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Creando...</> : "Crear producto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}