"use client";
// components/productos/ProductoForm.tsx
// Formulario compartido para CREAR y EDITAR productos.
// - Si recibe `producto` → modo edición (datos precargados, llama PUT)
// - Si no recibe `producto` → modo creación (llama POST)

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Package, AlertCircle, CheckCircle2 } from "lucide-react";
import MultipleImageUpload from "@/components/ui/MultipleImageUpload";
import type { Categoria, Proveedor, Producto } from "@/types";

type FormData = {
  nombre: string;
  descripcion: string;
  codigoProducto: string;
  codigoBarras: string;
  precio: string;
  costo: string;
  stock: string;
  stockMinimo: string;
  unidad: string;
  imagen: string;
  imagenes: string[];
  categoriaId: string;
  proveedorId: string;
};

function productoToForm(p: Producto): FormData {
  return {
    nombre:         p.nombre,
    descripcion:    p.descripcion ?? "",
    codigoProducto: p.codigoProducto ?? "",
    codigoBarras:   p.codigoBarras ?? "",
    precio:         String(p.precio),
    costo:          p.costo ? String(p.costo) : "",
    stock:          String(p.stock),
    stockMinimo:    String(p.stockMinimo),
    unidad:         p.unidad ?? "",
    imagen:         p.imagen ?? "",
    imagenes:       p.imagenes ?? [],
    categoriaId:    p.categoriaId ?? "",
    proveedorId:    p.proveedorId ?? "",
  };
}

const FORM_VACIO: FormData = {
  nombre: "", descripcion: "", codigoProducto: "", codigoBarras: "",
  precio: "", costo: "", stock: "0", stockMinimo: "5",
  unidad: "", imagen: "", imagenes: [], categoriaId: "", proveedorId: "",
};

type Props = {
  producto?: Producto; // si viene → modo edición
};

export default function ProductoForm({ producto }: Props) {
  const router = useRouter();
  const esEdicion = !!producto;

  const [form, setForm] = useState<FormData>(
    producto ? productoToForm(producto) : FORM_VACIO
  );
  const [categorias, setCategorias]   = useState<Categoria[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [cargando, setCargando]       = useState(false);
  const [error, setError]             = useState("");
  const [exito, setExito]             = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/categorias").then((r) => r.json()),
      fetch("/api/proveedores").then((r) => r.json()),
    ]).then(([catData, provData]) => {
      setCategorias(catData.data ?? catData ?? []);
      setProveedores(provData.data ?? provData ?? []);
    }).catch(console.error);
  }, []);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCargando(true);

    const payload = {
      nombre:         form.nombre.trim(),
      descripcion:    form.descripcion.trim() || undefined,
      codigoProducto: form.codigoProducto.trim() || undefined,
      codigoBarras:   form.codigoBarras.trim() || undefined,
      precio:         parseFloat(form.precio),
      costo:          form.costo ? parseFloat(form.costo) : undefined,
      stock:          parseInt(form.stock) || 0,
      stockMinimo:    parseInt(form.stockMinimo) || 5,
      unidad:         form.unidad.trim() || undefined,
      imagen:         form.imagen || form.imagenes[0] || undefined,
      imagenes:       form.imagenes,
      categoriaId:    form.categoriaId || undefined,
      proveedorId:    form.proveedorId || undefined,
    };

    try {
      const res = await fetch(
        esEdicion ? `/api/productos/${producto!.id}` : "/api/productos",
        {
          method:  esEdicion ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(payload),
        }
      );

      const data = await res.json();

      if (!data.ok) {
        setError(data.error ?? "Error al guardar el producto");
        return;
      }

      setExito(true);
      setTimeout(() => router.push("/productos"), 1500);
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  // Margen calculado
  const margen =
    form.precio && form.costo && parseFloat(form.costo) > 0
      ? (((parseFloat(form.precio) - parseFloat(form.costo)) / parseFloat(form.costo)) * 100).toFixed(1)
      : null;

  if (exito) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <CheckCircle2 className="h-16 w-16 text-primary-600 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {esEdicion ? "¡Producto actualizado!" : "¡Producto creado!"}
        </h2>
        <p className="text-gray-500 dark:text-gray-400">Volviendo al inventario...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/productos"
          className="flex items-center justify-center h-9 w-9 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {esEdicion ? "Editar producto" : "Nuevo producto"}
          </h1>
          {esEdicion && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{producto!.nombre}</p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Imágenes ── */}
        <div className="card p-5">
          <MultipleImageUpload
            value={form.imagenes}
            onChange={(imagenes) =>
              setForm((prev) => ({ ...prev, imagenes, imagen: imagenes[0] ?? "" }))
            }
          />
        </div>

        {/* ── Info básica ── */}
        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Package className="h-4 w-4" /> Información del producto
          </h2>

          <div>
            <label className="label-base">Nombre *</label>
            <input
              type="text" name="nombre" value={form.nombre}
              onChange={handleChange} required
              placeholder="Ej: Coca Cola 500ml"
              className="input-base"
            />
          </div>

          <div>
            <label className="label-base">Descripción</label>
            <textarea
              name="descripcion" value={form.descripcion}
              onChange={handleChange} rows={3}
              placeholder="Descripción opcional..."
              className="input-base resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-base">Código interno</label>
              <input
                type="text" name="codigoProducto" value={form.codigoProducto}
                onChange={handleChange} placeholder="Ej: PROD-001"
                className="input-base"
              />
            </div>
            <div>
              <label className="label-base">Código de barras</label>
              <input
                type="text" name="codigoBarras" value={form.codigoBarras}
                onChange={handleChange} placeholder="Ej: 7790001234567"
                className="input-base"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-base">Categoría</label>
              <select name="categoriaId" value={form.categoriaId} onChange={handleChange} className="input-base">
                <option value="">Sin categoría</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
              {categorias.length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  <Link href="/categorias" className="underline">Crear categorías primero</Link>
                </p>
              )}
            </div>
            <div>
              <label className="label-base">Proveedor</label>
              <select name="proveedorId" value={form.proveedorId} onChange={handleChange} className="input-base">
                <option value="">Sin proveedor</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ── Precios y stock ── */}
        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Precios y stock</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-base">Precio de venta *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                <input
                  type="number" name="precio" value={form.precio}
                  onChange={handleChange} required min="0" step="0.01"
                  placeholder="0" className="input-base pl-7"
                />
              </div>
            </div>
            <div>
              <label className="label-base">Precio de costo</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                <input
                  type="number" name="costo" value={form.costo}
                  onChange={handleChange} min="0" step="0.01"
                  placeholder="0" className="input-base pl-7"
                />
              </div>
            </div>
          </div>

          {margen !== null && (
            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 px-4 py-2 text-sm text-blue-700 dark:text-blue-400">
              Margen: <strong>{margen}%</strong>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label-base">
                {esEdicion ? "Stock actual" : "Stock inicial"}
              </label>
              <input
                type="number" name="stock" value={form.stock}
                onChange={handleChange} min="0" className="input-base"
              />
              {esEdicion && (
                <p className="text-xs text-gray-400 mt-1">
                  Usá <Link href="/movimientos" className="underline text-primary-600 dark:text-primary-400">Movimientos</Link> para ajustar stock
                </p>
              )}
            </div>
            <div>
              <label className="label-base">Stock mínimo</label>
              <input
                type="number" name="stockMinimo" value={form.stockMinimo}
                onChange={handleChange} min="0" className="input-base"
              />
              <p className="text-xs text-gray-400 mt-1">Alerta de stock bajo</p>
            </div>
            <div>
              <label className="label-base">Unidad</label>
              <input
                type="text" name="unidad" value={form.unidad}
                onChange={handleChange} placeholder="kg, litro, u."
                className="input-base"
              />
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Botones */}
        <div className="flex gap-3 pb-6">
          <Link
            href="/productos"
            className="flex-1 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={cargando}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            {cargando ? (
              <>
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {esEdicion ? "Guardando..." : "Creando..."}
              </>
            ) : (
              esEdicion ? "Guardar cambios" : "Crear producto"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}