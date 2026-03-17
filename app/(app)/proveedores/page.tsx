"use client";
// app/(app)/proveedores/page.tsx

import { useEffect, useState } from "react";
import { Truck, Plus, Edit, Trash2, Mail, Phone, MapPin, FileText } from "lucide-react";
import { useToast }   from "@/components/toast";
import { useConfirm } from "@/components/toast";

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

  const toast   = useToast();
  const confirm = useConfirm();

  useEffect(() => { fetchProveedores(); }, []);

  async function fetchProveedores() {
    try {
      const res  = await fetch("/api/proveedores");
      const data = await res.json();
      setProveedores(data.data ?? []);
    } catch {
      toast.error("Error al cargar proveedores");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setErrorForm("");

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

      toast.success(editingId ? "Proveedor actualizado" : "Proveedor creado");
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
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleCancelar() {
    setShowForm(false);
    setEditingId(null);
    setFormData(FORM_VACIO);
    setErrorForm("");
  }

  async function handleEliminar(proveedor: Proveedor) {
    const ok = await confirm({
      title:        `¿Eliminar "${proveedor.nombre}"?`,
      description:  proveedor._count.productos > 0
        ? `Los ${proveedor._count.productos} producto(s) asociados quedarán sin proveedor. Esta acción no se puede deshacer.`
        : "Esta acción no se puede deshacer.",
      confirmLabel: "Eliminar",
      cancelLabel:  "Cancelar",
      variant:      "danger",
      icon:         "trash",
    });
    if (!ok) return;

    await toast.promise(
      fetch(`/api/proveedores/${proveedor.id}`, { method: "DELETE" })
        .then(r => r.json())
        .then(data => {
          if (!data.ok) throw new Error(data.error ?? "Error al eliminar");
        }),
      {
        loading: "Eliminando proveedor...",
        success: "Proveedor eliminado",
        error:   (e: unknown) => (e as Error).message,
      }
    );
    fetchProveedores();
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
                    onClick={() => handleEliminar(proveedor)}
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
    </div>
  );
}