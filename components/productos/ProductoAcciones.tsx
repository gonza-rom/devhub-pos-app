"use client";
// components/productos/ProductoAcciones.tsx
// Botones Editar + Eliminar para cada fila de la tabla de productos.
// Es client component para manejar el modal y el fetch DELETE.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2, AlertTriangle } from "lucide-react";

type Props = {
  productoId: string;
  productoNombre: string;
};

export default function ProductoAcciones({ productoId, productoNombre }: Props) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleEliminar() {
    setEliminando(true);
    setError("");

    try {
      const res = await fetch(`/api/productos/${productoId}`, { method: "DELETE" });
      const data = await res.json();

      if (!data.ok) {
        setError(data.error ?? "Error al eliminar");
        setEliminando(false);
        return;
      }

      setModalAbierto(false);
      router.refresh(); // recarga la tabla sin navegar
    } catch {
      setError("Error de conexión");
      setEliminando(false);
    }
  }

  return (
    <>
      {/* Botones en la fila */}
      <div className="flex items-center justify-center gap-3">
        <Link
          href={`/productos/${productoId}/editar`}
          className="text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
        >
          Editar
        </Link>
        <button
          onClick={() => setModalAbierto(true)}
          className="text-xs font-medium text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors"
        >
          Eliminar
        </button>
      </div>

      {/* Modal de confirmación */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !eliminando && setModalAbierto(false)}
          />

          {/* Card del modal */}
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white dark:bg-gray-800 shadow-xl p-6 space-y-4">
            {/* Ícono */}
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 mx-auto">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>

            {/* Texto */}
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                ¿Eliminar producto?
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Vas a desactivar{" "}
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  {productoNombre}
                </span>
                . No va a aparecer más en el inventario ni en el POS.
              </p>
            </div>

            {/* Error */}
            {error && (
              <p className="text-center text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* Botones */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setModalAbierto(false)}
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
                  <>
                    <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    Sí, eliminar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}