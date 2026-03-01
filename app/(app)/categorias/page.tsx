"use client";
// app/(app)/categorias/page.tsx

import { useEffect, useState } from "react";
import { FolderTree, Plus, Edit, Trash2, AlertTriangle, CheckCircle2, X } from "lucide-react";

type Categoria = {
  id: string;
  nombre: string;
  descripcion: string | null;
  _count: { productos: number };
};

const FORM_VACIO = { nombre: "", descripcion: "" };

export default function CategoriasPage() {
  const [categorias, setCategorias]   = useState<Categoria[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [formData, setFormData]       = useState(FORM_VACIO);
  const [guardando, setGuardando]     = useState(false);
  const [errorForm, setErrorForm]     = useState("");
  const [exitoForm, setExitoForm]     = useState("");

  // Modal de confirmación para eliminar
  const [modalEliminar, setModalEliminar] = useState<Categoria | null>(null);
  const [eliminando, setEliminando]       = useState(false);
  const [errorEliminar, setErrorEliminar] = useState("");

  useEffect(() => { fetchCategorias(); }, []);

  async function fetchCategorias() {
    try {
      const res  = await fetch("/api/categorias");
      const data = await res.json();
      setCategorias(data.data ?? []);
    } catch {
      console.error("Error al cargar categorías");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setErrorForm("");
    setExitoForm("");

    const url    = editingId ? `/api/categorias/${editingId}` : "/api/categorias";
    const method = editingId ? "PUT" : "POST";

    try {
      const res  = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (!data.ok) {
        setErrorForm(data.error ?? "Error al guardar");
        return;
      }

      setExitoForm(editingId ? "Categoría actualizada" : "Categoría creada");
      handleCancelar();
      fetchCategorias();
    } catch {
      setErrorForm("Error de conexión");
    } finally {
      setGuardando(false);
    }
  }

  function handleEditar(categoria: Categoria) {
    setFormData({ nombre: categoria.nombre, descripcion: categoria.descripcion ?? "" });
    setEditingId(categoria.id);
    setErrorForm("");
    setExitoForm("");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleCancelar() {
    setShowForm(false);
    setEditingId(null);
    setFormData(FORM_VACIO);
    setErrorForm("");
  }

  async function handleEliminar() {
    if (!modalEliminar) return;
    setEliminando(true);
    setErrorEliminar("");

    try {
      const res  = await fetch(`/api/categorias/${modalEliminar.id}`, { method: "DELETE" });
      const data = await res.json();

      if (!data.ok) {
        setErrorEliminar(data.error ?? "Error al eliminar");
        return;
      }

      setModalEliminar(null);
      fetchCategorias();
    } catch {
      setErrorEliminar("Error de conexión");
    } finally {
      setEliminando(false);
    }
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

      {/* Mensaje de éxito global */}
      {exitoForm && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3">
          <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
          <p className="text-sm font-medium text-green-600 dark:text-green-400">{exitoForm}</p>
        </div>
      )}

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
            <div
              key={categoria.id}
              className="card p-5 hover:shadow-md transition-shadow"
            >
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
                    onClick={() => { setModalEliminar(categoria); setErrorEliminar(""); }}
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

      {/* Modal de confirmación para eliminar */}
      {modalEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !eliminando && setModalEliminar(null)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white dark:bg-gray-800 shadow-xl p-6 space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 mx-auto">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">¿Eliminar categoría?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Vas a eliminar{" "}
                <span className="font-semibold text-gray-700 dark:text-gray-300">{modalEliminar.nombre}</span>.
                {modalEliminar._count.productos > 0 && (
                  <> Los {modalEliminar._count.productos} producto(s) asociados quedarán sin categoría.</>
                )}
              </p>
            </div>
            {errorEliminar && (
              <p className="text-center text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                {errorEliminar}
              </p>
            )}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setModalEliminar(null)}
                disabled={eliminando}
                className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleEliminar}
                disabled={eliminando}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {eliminando ? (
                  <><div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Eliminando...</>
                ) : (
                  <><Trash2 className="h-3.5 w-3.5" /> Sí, eliminar</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}