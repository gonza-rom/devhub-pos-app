"use client";
// app/(app)/categorias/page.tsx

import { useEffect, useState } from "react";
import { FolderTree, Plus, Edit, Trash2, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/toast";
import { useConfirm } from "@/components/toast";

type Categoria = {
  id: string;
  nombre: string;
  descripcion: string | null;
  _count: { productos: number };
};

const FORM_VACIO = { nombre: "", descripcion: "" };

export default function CategoriasPage() {
  const toast   = useToast();
  const confirm = useConfirm();
  const [categorias, setCategorias]   = useState<Categoria[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [formData, setFormData]       = useState(FORM_VACIO);
  const [guardando, setGuardando]     = useState(false);
  const [errorForm, setErrorForm]     = useState("");

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
        body: JSON.stringify(formData),
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
    setFormData({ nombre: categoria.nombre, descripcion: categoria.descripcion ?? "" });
    setEditingId(categoria.id);
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
    const ok = await confirm({
      title:        `¿Eliminar "${categoria.nombre}"?`,
      description:  categoria._count.productos > 0
        ? `Los ${categoria._count.productos} producto(s) asociados quedarán sin categoría.`
        : "Esta acción no se puede deshacer.",
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <FolderTree className="h-6 w-6" />
            Categorías
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{categorias.length} categorías</p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingId(null);
            setFormData(FORM_VACIO);
            setErrorForm("");
          }}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nueva categoría
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {editingId ? "Editar categoría" : "Nueva categoría"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label-base">Nombre *</label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
                placeholder="Ej: Bebidas"
                className="input-base"
                autoFocus
              />
            </div>
            <div>
              <label className="label-base">Descripción</label>
              <textarea
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                rows={3}
                placeholder="Descripción opcional..."
                className="input-base resize-none"
              />
            </div>
            {errorForm && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2.5">
                <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-600 dark:text-red-400">{errorForm}</p>
              </div>
            )}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={guardando}
                className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {guardando && <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {editingId ? "Guardar cambios" : "Crear categoría"}
              </button>
              <button
                type="button"
                onClick={handleCancelar}
                className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Estado vacío */}
      {categorias.length === 0 ? (
        <div className="card py-20 text-center">
          <FolderTree className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">Sin categorías</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Creá tu primera categoría para organizar los productos
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            <Plus className="h-4 w-4" /> Crear categoría
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categorias.map((categoria) => (
            <div key={categoria.id} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {categoria.nombre}
                  </h3>
                  <span className="mt-1 inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400">
                    {categoria._count.productos} producto{categoria._count.productos !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex gap-1 ml-2 flex-shrink-0">
                  <button
                    onClick={() => handleEditar(categoria)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                    title="Editar"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleEliminar(categoria)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {categoria.descripcion && (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                  {categoria.descripcion}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}