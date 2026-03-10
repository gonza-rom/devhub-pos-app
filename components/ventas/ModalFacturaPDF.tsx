// components/ventas/ModalFacturaPDF.tsx
"use client";

import { useEffect, useState } from "react";
import { Download, Printer, X } from "lucide-react";

interface ModalFacturaPDFProps {
  open: boolean;
  onClose: () => void;
  comprobanteId: string;
}

export function ModalFacturaPDF({
  open,
  onClose,
  comprobanteId,
}: ModalFacturaPDFProps) {
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && comprobanteId) {
      const url = `/api/afip/comprobante/${comprobanteId}/pdf`;
      setPdfUrl(url);
      setLoading(false);
    }
  }, [open, comprobanteId]);

  useEffect(() => {
    // Prevenir scroll del body cuando el modal está abierto
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleDescargar = () => {
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = `factura-${comprobanteId}.pdf`;
    link.click();
  };

  const handleImprimir = () => {
    window.open(pdfUrl, "_blank");
  };

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="w-full max-w-4xl h-[90vh] flex flex-col bg-white dark:bg-zinc-900 rounded-lg shadow-2xl pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Comprobante Generado
            </h2>

            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Cerrar"
            >
              <X className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
            </button>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-2 px-6 py-3 border-b border-zinc-200 dark:border-zinc-800">
            <button
              onClick={handleDescargar}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              <Download className="h-4 w-4" />
              Descargar
            </button>

            <button
              onClick={handleImprimir}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </button>
          </div>

          {/* Visor de PDF */}
          <div className="flex-1 overflow-hidden bg-zinc-100 dark:bg-zinc-950">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-12 w-12 border-4 border-zinc-300 border-t-red-600 rounded-full animate-spin" />
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Cargando comprobante...
                  </p>
                </div>
              </div>
            ) : (
              <iframe
                src={pdfUrl}
                className="w-full h-full border-0"
                title="Factura PDF"
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}