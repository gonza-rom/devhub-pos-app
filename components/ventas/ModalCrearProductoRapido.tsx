// components/ventas/ModalCrearProductoRapido.tsx
"use client";

import { useState } from "react";
import { X, Package, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onProductoCreado: (producto: any) => void;
};

export function ModalCrearProductoRapido({ open, onClose, onProductoCreado }: Props) {
  const [form, setForm] = useState({
    nombre: "",
    codigoProducto: "",
    precio: "",
    stock: "0",
  });
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.nombre.trim()) {
      setError("El nombre es obligatorio");
      return;
    }

    if (!form.precio || parseFloat(form.precio) <= 0) {
      setError("El precio debe ser mayor a 0");
      return;
    }

    setCargando(true);
    setError("");

    try {
      const res = await fetch("/api/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          codigoProducto: form.codigoProducto.trim() || null,
          precio: parseFloat(form.precio),
          stock: parseInt(form.stock) || 0,
          activo: true,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        setError(data.error || "Error al crear el producto");
        return;
      }

      // Producto creado exitosamente
      setExito(true);
      onProductoCreado(data.data);

      // Cerrar después de 1 segundo
      setTimeout(() => {
        onClose();
        // Reset form
        setForm({ nombre: "", codigoProducto: "", precio: "", stock: "0" });
        setExito(false);
      }, 1000);
    } catch (err) {
      setError("Error de conexión");
    } finally {
      setCargando(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 space-y-4"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border-base)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: "rgba(220,38,38,0.15)" }}
            >
              <Package className="h-4 w-4 text-red-400" />
            </div>
            <h3 className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>
              Crear producto rápido
            </h3>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
            style={{ background: "var(--bg-hover)", color: "var(--text-muted)" }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Nombre */}
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>
              Nombre del producto *
            </label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej: Remera negra talle M"
              className="input-base w-full"
              autoFocus
              disabled={cargando || exito}
            />
          </div>

          {/* Código */}
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>
              Código de producto (opcional)
            </label>
            <input
              type="text"
              value={form.codigoProducto}
              onChange={(e) => setForm({ ...form, codigoProducto: e.target.value })}
              placeholder="Ej: REM-001"
              className="input-base w-full"
              disabled={cargando || exito}
            />
          </div>

          {/* Precio y Stock */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>
                Precio *
              </label>
              <input
                type="number"
                value={form.precio}
                onChange={(e) => setForm({ ...form, precio: e.target.value })}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="input-base w-full"
                disabled={cargando || exito}
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>
                Stock inicial
              </label>
              <input
                type="number"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                min="0"
                className="input-base w-full"
                disabled={cargando || exito}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              className="flex items-start gap-2 rounded-lg px-3 py-2.5"
              style={{ background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.2)" }}
            >
              <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-300">{error}</p>
            </div>
          )}

          {/* Éxito */}
          {exito && (
            <div
              className="flex items-center gap-2 rounded-lg px-3 py-2.5"
              style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}
            >
              <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
              <p className="text-xs font-medium text-green-300">¡Producto creado!</p>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}
              disabled={cargando || exito}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: "#DC2626", color: "#fff" }}
              disabled={cargando || exito}
            >
              {cargando ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Creando...
                </>
              ) : exito ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Creado
                </>
              ) : (
                "Crear producto"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}