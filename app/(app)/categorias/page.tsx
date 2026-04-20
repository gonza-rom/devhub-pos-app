"use client";
// app/(app)/categorias/page.tsx

import { useEffect, useState } from "react";
import {
  FolderTree, Plus, Edit, Trash2, AlertTriangle,
  ChevronRight, ChevronDown, Folder, FolderOpen, FolderPlus,
} from "lucide-react";
import { useToast } from "@/components/toast";
import { useConfirm } from "@/components/toast";

// ── Tipos ────────────────────────────────────────────────────

type Categoria = {
  id:          string;
  nombre:      string;
  descripcion: string | null;
  padreId:     string | null;
  _count:      { productos: number };
  hijas:       Categoria[];
};

const FORM_VACIO = { nombre: "", descripcion: "", padreId: "" };

// ── Helper: aplanar árbol para selectores ────────────────────

function aplanarCategorias(cats: Categoria[], nivel = 0): { id: string; nombre: string; nivel: number }[] {
  const resultado: { id: string; nombre: string; nivel: number }[] = [];
  for (const cat of cats) {
    resultado.push({ id: cat.id, nombre: cat.nombre, nivel });
    if (cat.hijas?.length) {
      resultado.push(...aplanarCategorias(cat.hijas, nivel + 1));
    }
  }
  return resultado;
}

// ── Contar todos los productos del árbol ─────────────────────

function contarProductosTotal(cat: Categoria): number {
  return cat._count.productos + (cat.hijas ?? []).reduce((acc, h) => acc + contarProductosTotal(h), 0);
}

// ── Componente de nodo del árbol ─────────────────────────────

function NodoCategoria({
  categoria,
  nivel,
  todasPlanas,
  onEditar,
  onEliminar,
  onAgregarHija,
}: {
  categoria:    Categoria;
  nivel:        number;
  todasPlanas:  { id: string; nombre: string; nivel: number }[];
  onEditar:     (cat: Categoria) => void;
  onEliminar:   (cat: Categoria) => void;
  onAgregarHija:(cat: Categoria) => void;
}) {
  const [expandido, setExpandido] = useState(nivel === 0);
  const tieneHijas = categoria.hijas?.length > 0;
  const totalProductos = contarProductosTotal(categoria);

  return (
    <div>
      <div
        className="group flex items-center gap-2 rounded-xl px-3 py-2.5 transition-colors"
        style={{
          marginLeft: nivel * 20,
          background: "var(--bg-card)",
          border: "1px solid var(--border-base)",
          marginBottom: 6,
        }}
      >
        {/* Expandir/colapsar */}
        <button
          onClick={() => tieneHijas && setExpandido(v => !v)}
          className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-md transition-colors"
          style={{ color: tieneHijas ? "var(--text-secondary)" : "transparent", cursor: tieneHijas ? "pointer" : "default" }}
        >
          {tieneHijas
            ? expandido
              ? <ChevronDown className="h-4 w-4" />
              : <ChevronRight className="h-4 w-4" />
            : <span className="h-4 w-4" />
          }
        </button>

        {/* Ícono carpeta */}
        <div className="flex-shrink-0" style={{ color: nivel === 0 ? "#DC2626" : "#f87171" }}>
          {tieneHijas && expandido
            ? <FolderOpen className="h-4 w-4" />
            : <Folder className="h-4 w-4" />
          }
        </div>

        {/* Nombre y contador */}
        <div className="flex-1 min-w-0">
          <span className="font-medium text-sm truncate" style={{ color: "var(--text-primary)" }}>
            {categoria.nombre}
          </span>
          {categoria.descripcion && (
            <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-faint)" }}>
              {categoria.descripcion}
            </p>
          )}
        </div>

        {/* Badge productos */}
        <span className="flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full"
          style={{ background: "rgba(220,38,38,0.1)", color: "#DC2626" }}>
          {totalProductos} prod.
        </span>

        {/* Acciones */}
        <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onAgregarHija(categoria)}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
            style={{ color: "var(--text-faint)" }}
            title="Agregar subcategoría"
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#22c55e"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--text-faint)"}
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onEditar(categoria)}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
            style={{ color: "var(--text-faint)" }}
            title="Editar"
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--text-faint)"}
          >
            <Edit className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onEliminar(categoria)}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
            style={{ color: "var(--text-faint)" }}
            title="Eliminar"
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#f87171"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--text-faint)"}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Hijas */}
      {tieneHijas && expandido && (
        <div>
          {categoria.hijas.map(hija => (
            <NodoCategoria
              key={hija.id}
              categoria={hija}
              nivel={nivel + 1}
              todasPlanas={todasPlanas}
              onEditar={onEditar}
              onEliminar={onEliminar}
              onAgregarHija={onAgregarHija}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────

export default function CategoriasPage() {
  const toast   = useToast();
  const confirm = useConfirm();

  const [categorias,  setCategorias]  = useState<Categoria[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [editingId,   setEditingId]   = useState<string | null>(null);
  const [formData,    setFormData]    = useState(FORM_VACIO);
  const [guardando,   setGuardando]   = useState(false);
  const [errorForm,   setErrorForm]   = useState("");

  useEffect(() => { fetchCategorias(); }, []);

  async function fetchCategorias() {
    try {
      const res  = await fetch("/api/categorias");
      const data = await res.json();
      setCategorias(data.data ?? []);
    } catch {
      toast.error("Error al cargar categorías");
    } finally {
      setLoading(false);
    }
  }

  const todasPlanas = aplanarCategorias(categorias);

  // Contar total de categorías (incluyendo hijas)
  function contarTotal(cats: Categoria[]): number {
    return cats.reduce((acc, c) => acc + 1 + contarTotal(c.hijas ?? []), 0);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setErrorForm("");

    const url    = editingId ? `/api/categorias/${editingId}` : "/api/categorias";
    const method = editingId ? "PUT" : "POST";

    await toast.promise(
      fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre:      formData.nombre,
          descripcion: formData.descripcion,
          padreId:     formData.padreId || null,
        }),
      }).then(async (res) => {
        const data = await res.json();
        if (!data.ok) throw new Error(data.error ?? "Error al guardar");
        return data;
      }),
      {
        loading: editingId ? "Actualizando categoría..." : "Creando categoría...",
        success: editingId ? "Categoría actualizada" : "Categoría creada",
        error:   (err: unknown) => (err instanceof Error ? err.message : "Error al guardar"),
      }
    ).then(() => {
      handleCancelar();
      fetchCategorias();
    }).catch((err: unknown) => {
      setErrorForm(err instanceof Error ? err.message : "Error al guardar");
    }).finally(() => {
      setGuardando(false);
    });
  }

  function handleEditar(categoria: Categoria) {
    setFormData({
      nombre:      categoria.nombre,
      descripcion: categoria.descripcion ?? "",
      padreId:     categoria.padreId ?? "",
    });
    setEditingId(categoria.id);
    setErrorForm("");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleAgregarHija(padre: Categoria) {
    setFormData({ nombre: "", descripcion: "", padreId: padre.id });
    setEditingId(null);
    setErrorForm("");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleCancelar() {
    setShowForm(false);
    setEditingId(null);
    setFormData(FORM_VACIO);
    setErrorForm("");
  }

  async function handleEliminar(categoria: Categoria) {
    const tieneHijas   = (categoria.hijas?.length ?? 0) > 0;
    const totalProds   = contarProductosTotal(categoria);
    const descripcion  = [
      tieneHijas && `Las ${categoria.hijas.length} subcategoría(s) pasarán a ser categorías raíz.`,
      totalProds > 0 && `${totalProds} producto(s) quedarán sin categoría.`,
      "Esta acción no se puede deshacer.",
    ].filter(Boolean).join(" ");

    const ok = await confirm({
      title:        `¿Eliminar "${categoria.nombre}"?`,
      description:  descripcion,
      confirmLabel: "Eliminar",
      cancelLabel:  "Cancelar",
      variant:      "danger",
      icon:         "trash",
    });
    if (!ok) return;

    await toast.promise(
      fetch(`/api/categorias/${categoria.id}`, { method: "DELETE" }).then(async (res) => {
        const data = await res.json();
        if (!data.ok) throw new Error(data.error ?? "Error al eliminar");
        return data;
      }),
      {
        loading: "Eliminando categoría...",
        success: "Categoría eliminada",
        error:   (err: unknown) => (err instanceof Error ? err.message : "Error al eliminar"),
      }
    ).then(() => fetchCategorias()).catch(() => {});
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalCategorias = contarTotal(categorias);

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <FolderTree className="h-6 w-6" />
            Categorías
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {totalCategorias} categorías en total
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingId(null);
            setFormData(FORM_VACIO);
            setErrorForm("");
          }}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors"
          style={{ background: "#DC2626" }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#b91c1c"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "#DC2626"}
        >
          <Plus className="h-4 w-4" />
          Nueva categoría
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="card p-6 space-y-4">
          <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
            {editingId ? "Editar categoría" : formData.padreId
              ? `Nueva subcategoría de: ${todasPlanas.find(c => c.id === formData.padreId)?.nombre}`
              : "Nueva categoría"
            }
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Categoría padre */}
            <div>
              <label className="label-base" style={{ color: "var(--text-primary)" }}>
                Categoría padre <span style={{ color: "var(--text-faint)" }}>(opcional)</span>
              </label>
              <select
                value={formData.padreId}
                onChange={e => setFormData({ ...formData, padreId: e.target.value })}
                className="input-base"
                disabled={guardando}
              >
                <option value="">— Sin padre (categoría raíz) —</option>
                {todasPlanas
                  .filter(c => c.id !== editingId) // no puede ser su propio padre
                  .map(c => (
                    <option key={c.id} value={c.id}>
                      {"  ".repeat(c.nivel)}{c.nivel > 0 ? "└ " : ""}{c.nombre}
                    </option>
                  ))
                }
              </select>
            </div>

            {/* Nombre */}
            <div>
              <label className="label-base" style={{ color: "var(--text-primary)" }}>Nombre *</label>
              <input
                type="text"
                value={formData.nombre}
                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                required
                placeholder="Ej: Remeras"
                className="input-base"
                autoFocus
                disabled={guardando}
              />
            </div>

            {/* Descripción */}
            <div>
              <label className="label-base" style={{ color: "var(--text-primary)" }}>Descripción</label>
              <textarea
                value={formData.descripcion}
                onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                rows={2}
                placeholder="Descripción opcional..."
                className="input-base resize-none"
                disabled={guardando}
              />
            </div>

            {errorForm && (
              <div className="flex items-center gap-2 rounded-xl px-3 py-2.5"
                style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)" }}>
                <AlertTriangle className="h-4 w-4 flex-shrink-0" style={{ color: "#f87171" }} />
                <p className="text-sm" style={{ color: "#f87171" }}>{errorForm}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button type="submit" disabled={guardando}
                className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50"
                style={{ background: "#DC2626" }}>
                {guardando && <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {editingId ? "Guardar cambios" : "Crear categoría"}
              </button>
              <button type="button" onClick={handleCancelar}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
                style={{ border: "1px solid var(--border-base)", color: "var(--text-secondary)", background: "var(--bg-hover)" }}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Estado vacío */}
      {categorias.length === 0 ? (
        <div className="card py-20 text-center">
          <FolderTree className="h-12 w-12 mx-auto mb-4" style={{ color: "var(--text-faint)" }} />
          <h3 className="text-lg font-medium mb-1" style={{ color: "var(--text-primary)" }}>Sin categorías</h3>
          <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
            Creá tu primera categoría para organizar los productos
          </p>
          <button onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 text-sm font-medium"
            style={{ color: "#DC2626" }}>
            <Plus className="h-4 w-4" /> Crear categoría
          </button>
        </div>
      ) : (
        <div className="space-y-1">
          {categorias.map(categoria => (
            <NodoCategoria
              key={categoria.id}
              categoria={categoria}
              nivel={0}
              todasPlanas={todasPlanas}
              onEditar={handleEditar}
              onEliminar={handleEliminar}
              onAgregarHija={handleAgregarHija}
            />
          ))}
        </div>
      )}
    </div>
  );
}