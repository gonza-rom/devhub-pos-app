"use client";
// app/(app)/proveedores/page.tsx

import { useEffect, useState } from "react";
import { Truck, Plus, Edit, Trash2, Mail, Phone, MapPin, FileText, AlertTriangle, CheckCircle2 } from "lucide-react";

type Proveedor = {
  id: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  notas: string | null;
  _count: { productos: number };
};

const FORM_VACIO = { nombre: "", telefono: "", email: "", direccion: "", notas: "" };

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [formData, setFormData]       = useState(FORM_VACIO);
  const [guardando, setGuardando]     = useState(false);
  const [errorForm, setErrorForm]     = useState("");
  const [exitoForm, setExitoForm]     = useState("");

  // Modal de confirmación para eliminar
  const [modalEliminar, setModalEliminar] = useState<Proveedor | null>(null);
  const [eliminando, setEliminando]       = useState(false);
  const [errorEliminar, setErrorEliminar] = useState("");

  useEffect(() => { fetchProveedores(); }, []);

  async function fetchProveedores() {
    try {
      const res  = await fetch("/api/proveedores");
      const data = await res.json();
      setProveedores(data.data ?? []);
    } catch {
      console.error("Error al cargar proveedores");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setErrorForm("");
    setExitoForm("");

    const url    = editingId ? `/api/proveedores/${editingId}` : "/api/proveedores";
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

      setExitoForm(editingId ? "Proveedor actualizado" : "Proveedor creado");
      handleCancelar();
      fetchProveedores();
    } catch {
      setErrorForm("Error de conexión");
    } finally {
      setGuardando(false);
    }
  }

  function handleEditar(proveedor: Proveedor) {
    setFormData({
      nombre:    proveedor.nombre,
      telefono:  proveedor.telefono  ?? "",
      email:     proveedor.email     ?? "",
      direccion: proveedor.direccion ?? "",
      notas:     proveedor.notas     ?? "",
    });
    setEditingId(proveedor.id);
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
      const res  = await fetch(`/api/proveedores/${modalEliminar.id}`, { method: "DELETE" });
      const data = await res.json();

      if (!data.ok) {
        setErrorEliminar(data.error ?? "Error al eliminar");
        return;
      }

      setModalEliminar(null);
      fetchProveedores();
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
            <Truck className="h-6 w-6" />
            Proveedores
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{proveedores.length} proveedores</p>
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
          Nuevo proveedor
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
            {editingId ? "Editar proveedor" : "Nuevo proveedor"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label-base">Nombre *</label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
                placeholder="Ej: Distribuidora Norte"
                className="input-base"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label-base">Teléfono</label>
                <input
                  type="tel"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  placeholder="Ej: 3833 123456"
                  className="input-base"
                />
              </div>
              <div>
                <label className="label-base">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="proveedor@email.com"
                  className="input-base"
                />
              </div>
            </div>

            <div>
              <label className="label-base">Dirección</label>
              <input
                type="text"
                value={formData.direccion}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                placeholder="Ej: Av. Güemes 1234, Catamarca"
                className="input-base"
              />
            </div>

            <div>
              <label className="label-base">Notas</label>
              <textarea
                value={formData.notas}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                rows={2}
                placeholder="Observaciones, condiciones de pago, etc."
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
                {editingId ? "Guardar cambios" : "Crear proveedor"}
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
      {proveedores.length === 0 ? (
        <div className="card py-20 text-center">
          <Truck className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">Sin proveedores</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Agregá tus proveedores para asociarlos a los productos
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            <Plus className="h-4 w-4" /> Crear proveedor
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {proveedores.map((proveedor) => (
            <div key={proveedor.id} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {proveedor.nombre}
                  </h3>
                  <span className="mt-1 inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400">
                    {proveedor._count.productos} producto{proveedor._count.productos !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex gap-1 ml-2 flex-shrink-0">
                  <button
                    onClick={() => handleEditar(proveedor)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                    title="Editar"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => { setModalEliminar(proveedor); setErrorEliminar(""); }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                {proveedor.telefono && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{proveedor.telefono}</span>
                  </div>
                )}
                {proveedor.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{proveedor.email}</span>
                  </div>
                )}
                {proveedor.direccion && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{proveedor.direccion}</span>
                  </div>
                )}
                {proveedor.notas && (
                  <div className="flex items-start gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <FileText className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{proveedor.notas}</span>
                  </div>
                )}
              </div>
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
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">¿Eliminar proveedor?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Vas a eliminar{" "}
                <span className="font-semibold text-gray-700 dark:text-gray-300">{modalEliminar.nombre}</span>.
                {modalEliminar._count.productos > 0 && (
                  <> Los {modalEliminar._count.productos} producto(s) asociados quedarán sin proveedor.</>
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