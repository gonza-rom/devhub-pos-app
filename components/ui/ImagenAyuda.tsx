"use client";
// components/ui/ImagenAyuda.tsx

import { useState } from "react";
import { X, ZoomIn } from "lucide-react";

export function ImagenAyuda({
  src,
  alt,
  nombreArchivo,
}: {
  src: string;
  alt: string;
  nombreArchivo: string;
}) {
  const [zoom, setZoom] = useState(false);
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div
        className="w-full rounded-xl flex flex-col items-center justify-center gap-2 py-8"
        style={{
          border: "1px dashed var(--border-md)",
          background: "var(--bg-surface)",
          color: "var(--text-faint)",
        }}
      >
        <p className="text-xs text-center px-4">
          Captura pendiente — guardá la imagen en{" "}
          <code
            className="px-1.5 py-0.5 rounded"
            style={{ background: "var(--bg-input)", fontSize: "11px" }}
          >
            /public/ayuda/{nombreArchivo}
          </code>
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Imagen con hover de zoom */}
      <div
        className="relative w-full rounded-xl overflow-hidden cursor-zoom-in group"
        style={{ border: "1px solid var(--border-base)" }}
        onClick={() => setZoom(true)}
      >
        <img
          src={src}
          alt={alt}
          className="w-full object-cover rounded-xl transition-transform duration-200 group-hover:scale-[1.01]"
          onError={() => setError(true)}
        />
        {/* Ícono de zoom */}
        <div
          className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}
        >
          <ZoomIn className="h-3 w-3" />
          Ver ampliada
        </div>
      </div>

      {/* Modal de zoom */}
      {zoom && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)" }}
          onClick={() => setZoom(false)}
        >
          <button
            className="absolute top-4 right-4 flex items-center justify-center h-9 w-9 rounded-full"
            style={{ background: "rgba(255,255,255,0.1)", color: "#fff" }}
            onClick={() => setZoom(false)}
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-[90vh] rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}