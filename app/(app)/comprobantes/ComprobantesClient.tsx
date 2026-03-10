"use client";

import { useState, useEffect } from "react";
import { 
  Search, FileText, Download, Eye, Calendar, 
  Filter, ChevronLeft, ChevronRight, Loader2,
  CheckCircle2, XCircle, AlertCircle
} from "lucide-react";
import { formatPrecio } from "@/lib/utils";
import { obtenerNombreComprobante, obtenerNombreTipoDocumento } from "@/lib/afip/types";
import { ModalFacturaPDF } from "@/components/ventas/ModalFacturaPDF";

interface Comprobante {
  id: string;
  puntoVenta: number;
  tipoComprobante: number;
  numeroComprobante: number;
  cae: string;
  caeFchVto: string;
  fecha: string;
  clienteNombre: string | null;
  docTipo: number;
  docNro: string;
  total: number;
  neto: number;
  iva: number;
  resultado: string;
  metodoPago: string | null;
  createdAt: string;
}

export function ComprobantesClient() {
  const [comprobantes, setComprobantes] = useState<Comprobante[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [tipoComprobante, setTipoComprobante] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [resultado, setResultado] = useState("");

  // Modal PDF
  const [comprobanteSeleccionado, setComprobanteSeleccionado] = useState<string | null>(null);

  // Cargar comprobantes
  useEffect(() => {
    const fetchComprobantes = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: "20",
        });

        if (busqueda) params.set("busqueda", busqueda);
        if (tipoComprobante) params.set("tipoComprobante", tipoComprobante);
        if (fechaDesde) params.set("fechaDesde", fechaDesde);
        if (fechaHasta) params.set("fechaHasta", fechaHasta);
        if (resultado) params.set("resultado", resultado);

        const res = await fetch(`/api/afip/comprobante?${params}`);
        const data = await res.json();

        if (data.ok) {
          setComprobantes(data.comprobantes);
          setTotalPages(data.meta.totalPages);
          setTotal(data.meta.total);
        }
      } catch (error) {
        console.error("Error cargando comprobantes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchComprobantes();
  }, [page, busqueda, tipoComprobante, fechaDesde, fechaHasta, resultado]);

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString("es-AR");
  };

  const formatearNumeroComprobante = (pv: number, num: number) => {
    return `${String(pv).padStart(4, "0")}-${String(num).padStart(8, "0")}`;
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Búsqueda */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar por CAE, número o cliente..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>

          {/* Tipo de comprobante */}
          <select
            value={tipoComprobante}
            onChange={(e) => {
              setTipoComprobante(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
          >
            <option value="">Todos los tipos</option>
            <option value="1">Factura A</option>
            <option value="6">Factura B</option>
            <option value="11">Factura C</option>
            <option value="3">Nota de Crédito A</option>
            <option value="8">Nota de Crédito B</option>
          </select>

          {/* Resultado */}
          <select
            value={resultado}
            onChange={(e) => {
              setResultado(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
          >
            <option value="">Todos los estados</option>
            <option value="A">Aprobados</option>
            <option value="R">Rechazados</option>
          </select>
        </div>

        {/* Fechas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              Desde
            </label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => {
                setFechaDesde(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              Hasta
            </label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => {
                setFechaHasta(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>
        </div>

        {/* Limpiar filtros */}
        {(busqueda || tipoComprobante || fechaDesde || fechaHasta || resultado) && (
          <button
            onClick={() => {
              setBusqueda("");
              setTipoComprobante("");
              setFechaDesde("");
              setFechaHasta("");
              setResultado("");
              setPage(1);
            }}
            className="mt-3 text-xs text-red-600 hover:text-red-700 font-medium"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Resultados */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        {/* Header */}
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {total} comprobante{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Tabla */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
          </div>
        ) : comprobantes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FileText className="h-12 w-12 text-zinc-300 dark:text-zinc-700 mb-3" />
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              No se encontraron comprobantes
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
              Probá ajustando los filtros de búsqueda
            </p>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                  <tr className="text-left text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Número</th>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">CAE</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {comprobantes.map((comp) => (
                    <tr 
                      key={comp.id}
                      className="text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400">
                          {obtenerNombreComprobante(comp.tipoComprobante)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {formatearNumeroComprobante(comp.puntoVenta, comp.numeroComprobante)}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                        {formatearFecha(comp.fecha)}
                      </td>
                      <td className="px-4 py-3">
                        {comp.clienteNombre || (
                          <span className="text-zinc-400 dark:text-zinc-600">
                            Consumidor Final
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        {formatPrecio(comp.total)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                        {comp.cae}
                      </td>
                      <td className="px-4 py-3">
                        {comp.resultado === "A" ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Aprobado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                            <XCircle className="h-3.5 w-3.5" />
                            Rechazado
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setComprobanteSeleccionado(comp.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Ver PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-zinc-200 dark:divide-zinc-800">
              {comprobantes.map((comp) => (
                <div key={comp.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400">
                        {obtenerNombreComprobante(comp.tipoComprobante)}
                      </span>
                      <p className="font-mono text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                        {formatearNumeroComprobante(comp.puntoVenta, comp.numeroComprobante)}
                      </p>
                    </div>
                    {comp.resultado === "A" ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>

                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-zinc-600 dark:text-zinc-400">Fecha:</span>
                      <span className="font-medium">{formatearFecha(comp.fecha)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600 dark:text-zinc-400">Cliente:</span>
                      <span className="font-medium">
                        {comp.clienteNombre || "Consumidor Final"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600 dark:text-zinc-400">Total:</span>
                      <span className="font-bold">{formatPrecio(comp.total)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setComprobanteSeleccionado(comp.id)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-red-600 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                    Ver Comprobante
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-200 dark:border-zinc-800">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </button>

            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              Página {page} de {totalPages}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Modal PDF */}
      {comprobanteSeleccionado && (
        <ModalFacturaPDF
          open={!!comprobanteSeleccionado}
          onClose={() => setComprobanteSeleccionado(null)}
          comprobanteId={comprobanteSeleccionado}
        />
      )}
    </div>
  );
}