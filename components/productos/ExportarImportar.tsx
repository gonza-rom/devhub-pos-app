"use client";
// components/productos/ExportarImportar.tsx
// Botones: Exportar productos (CSV) + Importar productos (CSV)
// Se agrega en la página de productos junto al botón "Nuevo producto"

import { useState, useRef } from "react";
import { Download, Upload, X, CheckCircle2, AlertCircle, FileText } from "lucide-react";

export default function ExportarImportar() {
  const [modalImportar, setModalImportar] = useState(false);
  const [archivo,        setArchivo]       = useState<File | null>(null);
  const [importando,     setImportando]    = useState(false);
  const [resultado,      setResultado]     = useState<{ creados: number; errores: number; detallesError: string[] } | null>(null);
  const [exportando,     setExportando]    = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Exportar ─────────────────────────────────────────────
  async function handleExportar() {
    setExportando(true);
    try {
      const res = await fetch("/api/productos/exportar");
      if (!res.ok) throw new Error("Error al exportar");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `productos_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    } finally {
      setExportando(false);
    }
  }

  // ── Importar ─────────────────────────────────────────────
  function handleArchivoSeleccionado(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setArchivo(file);
    setResultado(null);
  }

  async function handleImportar() {
    if (!archivo) return;
    setImportando(true);
    setResultado(null);
    try {
      const fd = new FormData();
      fd.append("archivo", archivo);
      const res  = await fetch("/api/productos/importar", { method: "POST", body: fd });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setResultado({ creados: data.creados, errores: data.errores, detallesError: data.detallesError ?? [] });
      if (data.creados > 0) window.location.reload();
    } catch (err: any) {
      setResultado({ creados: 0, errores: 1, detallesError: [err.message ?? "Error al importar"] });
    } finally {
      setImportando(false);
    }
  }

  function cerrarModal() {
    setModalImportar(false);
    setArchivo(null);
    setResultado(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  // ── Template CSV ──────────────────────────────────────────
  function descargarTemplate() {
    const BOM = "\uFEFF";
    const csv = BOM + [
      "nombre;precio;costo;stock;stock_minimo;unidad;codigo_producto;codigo_barras;descripcion;categoria",
      '"Coca Cola 500ml";1500;800;50;5;u.;COC-001;;Gaseosa cola 500ml;Bebidas',
      '"Agua Mineral 500ml";800;400;30;5;u.;AGU-001;;;Bebidas',
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "template_productos.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      {/* Botones inline */}
      <div className="flex gap-2">
        <button onClick={handleExportar} disabled={exportando}
          className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50"
          style={{ borderColor: "rgba(255,255,255,0.12)", color: "#a1a1aa", background: "rgba(255,255,255,0.04)" }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"}
        >
          <Download className="h-4 w-4" />
          {exportando ? "Exportando..." : "Exportar CSV"}
        </button>

        <button onClick={() => setModalImportar(true)}
          className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
          style={{ borderColor: "rgba(255,255,255,0.12)", color: "#a1a1aa", background: "rgba(255,255,255,0.04)" }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"}
        >
          <Upload className="h-4 w-4" />
          Importar CSV
        </button>
      </div>

      {/* Modal importar */}
      {modalImportar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={cerrarModal} />
          <div className="relative z-10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.1)" }}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Upload className="h-4 w-4 text-zinc-400" /> Importar productos
              </h3>
              <button onClick={cerrarModal} className="text-zinc-500 hover:text-zinc-200 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Template */}
              <div className="rounded-xl p-4 space-y-2"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <p className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-zinc-500" /> Formato CSV requerido
                </p>
                <p className="text-xs text-zinc-500">
                  Columnas obligatorias: <span className="text-zinc-300 font-mono">nombre, precio</span>
                </p>
                <p className="text-xs text-zinc-500">
                  Opcionales: codigo_producto, codigo_barras, costo, stock, stock_minimo, unidad, descripcion, categoria
                </p>
                <button onClick={descargarTemplate}
                  className="text-xs text-red-400 hover:text-red-300 underline transition-colors mt-1">
                  Descargar template de ejemplo
                </button>
              </div>

              {/* Upload zone */}
              <label htmlFor="csv-upload"
                className="flex flex-col items-center justify-center gap-3 rounded-xl p-6 cursor-pointer transition-colors"
                style={{ border: "2px dashed rgba(255,255,255,0.1)" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(220,38,38,0.4)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)"}
              >
                <input id="csv-upload" ref={inputRef} type="file" accept=".csv"
                  onChange={handleArchivoSeleccionado} className="hidden" />
                <Upload className="h-8 w-8 text-zinc-600" />
                {archivo
                  ? <p className="text-sm font-medium text-zinc-300">{archivo.name}</p>
                  : <p className="text-sm text-zinc-500">Hacé click para seleccionar un archivo .csv</p>
                }
              </label>

              {/* Resultado */}
              {resultado && (
                <div className={`rounded-xl p-4 space-y-2 ${resultado.creados > 0 ? "bg-green-950/40 border border-green-800/40" : "bg-red-950/40 border border-red-800/40"}`}>
                  {resultado.creados > 0 && (
                    <p className="text-sm font-semibold text-green-400 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" /> {resultado.creados} productos importados correctamente
                    </p>
                  )}
                  {resultado.errores > 0 && (
                    <p className="text-sm font-semibold text-red-400 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" /> {resultado.errores} filas con error
                    </p>
                  )}
                  {resultado.detallesError.length > 0 && (
                    <ul className="mt-2 space-y-0.5 max-h-28 overflow-y-auto">
                      {resultado.detallesError.map((e, i) => (
                        <li key={i} className="text-xs text-red-400 font-mono">{e}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <button onClick={cerrarModal}
                className="flex-1 rounded-xl py-2.5 text-sm font-medium text-zinc-400 transition-colors"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"}
              >
                {resultado?.creados ? "Cerrar" : "Cancelar"}
              </button>
              <button onClick={handleImportar} disabled={!archivo || importando || !!resultado?.creados}
                className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white transition-colors disabled:opacity-40"
                style={{ background: "#DC2626" }}
                onMouseEnter={e => { if (!e.currentTarget.disabled) (e.currentTarget as HTMLElement).style.background = "#b91c1c"; }}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "#DC2626"}
              >
                {importando ? "Importando..." : "Importar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}