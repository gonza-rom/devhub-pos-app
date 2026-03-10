// components/pos/ModalSeleccionFactura.tsx
"use client";

import { useState, useEffect } from "react";
import { X, AlertCircle, CheckCircle2 } from "lucide-react";
import { TIPO_DOCUMENTO } from "@/lib/afip/types";
import { 
  determinarTipoComprobante, 
  obtenerTiposComprobantePermitidos 
} from "@/lib/afip/helpers";

interface ModalSeleccionFacturaProps {
  open: boolean;
  onClose: () => void;
  onConfirmar: (datos: DatosFactura) => void;
  condicionFiscalEmisor: string;
  total: number;
}

export interface DatosFactura {
  tipoComprobante: number;
  clienteDocTipo: number;
  clienteDocNro: string;
  clienteNombre?: string;
  clienteDireccion?: string;
  clienteCondicionIVA?: string;
}

export function ModalSeleccionFactura({
  open,
  onClose,
  onConfirmar,
  condicionFiscalEmisor,
  total,
}: ModalSeleccionFacturaProps) {
  const [tipoComprobante, setTipoComprobante] = useState<number | null>(null);
  const [docTipo, setDocTipo] = useState<number>(TIPO_DOCUMENTO.DNI);
  const [docNro, setDocNro] = useState("");
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [condicionIVA, setCondicionIVA] = useState("Consumidor Final");

  const tiposPermitidos = obtenerTiposComprobantePermitidos(condicionFiscalEmisor);

  // Auto-seleccionar si solo hay una opción
  useEffect(() => {
    if (tiposPermitidos.length === 1) {
      setTipoComprobante(tiposPermitidos[0].value);
    }
  }, [tiposPermitidos]);

  // Auto-determinar tipo según documento
  useEffect(() => {
    if (docNro && condicionFiscalEmisor === "RI") {
      const tipoAuto = determinarTipoComprobante(
        condicionFiscalEmisor,
        docTipo,
        condicionIVA
      );
      setTipoComprobante(tipoAuto);
    }
  }, [docTipo, docNro, condicionFiscalEmisor, condicionIVA]);

  const handleConfirmar = () => {
    if (!tipoComprobante) return;

    onConfirmar({
      tipoComprobante,
      clienteDocTipo: docTipo,
      clienteDocNro: docNro || "0",
      clienteNombre: nombre.trim() || undefined,
      clienteDireccion: direccion.trim() || undefined,
      clienteCondicionIVA: condicionIVA,
    });

    // Reset
    setDocNro("");
    setNombre("");
    setDireccion("");
  };

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const tipoSeleccionado = tiposPermitidos.find((t) => t.value === tipoComprobante);

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-lg shadow-2xl pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Datos para Factura Electrónica
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
            </button>
          </div>

          {/* Contenido */}
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Tipo de comprobante */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Tipo de Comprobante *
              </label>
              <div className="space-y-2">
                {tiposPermitidos.map((tipo) => (
                  <button
                    key={tipo.value}
                    onClick={() => setTipoComprobante(tipo.value)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                      tipoComprobante === tipo.value
                        ? "border-red-500 bg-red-50 dark:bg-red-950/20"
                        : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 flex-shrink-0 ${
                          tipoComprobante === tipo.value
                            ? "border-red-500 bg-red-500"
                            : "border-zinc-300 dark:border-zinc-600"
                        }`}
                      >
                        {tipoComprobante === tipo.value && (
                          <div className="h-2 w-2 rounded-full bg-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {tipo.label}
                        </p>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                          {tipo.descripcion}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Info box según tipo seleccionado */}
            {tipoSeleccionado && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-800 dark:text-blue-300">
                  {tipoSeleccionado.value === 1
                    ? "Para clientes Responsables Inscriptos con CUIT"
                    : tipoSeleccionado.value === 6
                    ? "Para Consumidor Final (DNI) o Monotributo"
                    : "Único tipo de comprobante permitido"}
                </p>
              </div>
            )}

            {/* Tipo de documento */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Tipo de Documento
              </label>
              <select
                value={docTipo}
                onChange={(e) => setDocTipo(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value={TIPO_DOCUMENTO.DNI}>DNI</option>
                <option value={TIPO_DOCUMENTO.CUIT}>CUIT</option>
                <option value={TIPO_DOCUMENTO.CUIL}>CUIL</option>
                <option value={TIPO_DOCUMENTO.PASAPORTE}>Pasaporte</option>
                <option value={TIPO_DOCUMENTO.CONSUMIDOR_FINAL}>
                  Consumidor Final (sin doc)
                </option>
              </select>
            </div>

            {/* Número de documento */}
            {docTipo !== TIPO_DOCUMENTO.CONSUMIDOR_FINAL && (
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Número de Documento *
                </label>
                <input
                  type="text"
                  value={docNro}
                  onChange={(e) => setDocNro(e.target.value.replace(/\D/g, ""))}
                  placeholder={docTipo === TIPO_DOCUMENTO.CUIT ? "20123456789" : "12345678"}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  maxLength={docTipo === TIPO_DOCUMENTO.CUIT ? 11 : 8}
                />
              </div>
            )}

            {/* Nombre (opcional) */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Nombre o Razón Social (opcional)
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Juan Pérez"
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            {/* Condición IVA (para Factura A) */}
            {tipoComprobante === 1 && (
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Condición IVA
                </label>
                <select
                  value={condicionIVA}
                  onChange={(e) => setCondicionIVA(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="Responsable Inscripto">Responsable Inscripto</option>
                  <option value="Monotributo">Monotributo</option>
                  <option value="Exento">Exento</option>
                  <option value="Consumidor Final">Consumidor Final</option>
                </select>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmar}
              disabled={!tipoComprobante || (docTipo !== TIPO_DOCUMENTO.CONSUMIDOR_FINAL && !docNro)}
              className="px-6 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Confirmar y Facturar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}