"use client";
// app/(app)/estadisticas/page.tsx

import { useEffect, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { TrendingUp, DollarSign, ShoppingCart, Calendar, Package } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Tipos ─────────────────────────────────────────────────────────────────────

type Resumen = {
  ingresoTotal: number;
  totalVentas: number;
  promedioVenta: number;
};

type VentaDia = {
  fecha: string;
  total: number;
  cantidad: number;
};

type VentaMetodo = {
  metodo: string;
  total: number;
  cantidad: number;
};

type VentaCategoria = {
  nombre: string;
  ingreso: number;
  cantidad: number;
};

type VentaMes = {
  mes: string;
  total: number;
  cantidad: number;
};

type ProductoVendido = {
  productoId: string;
  nombre: string;
  categoriaNombre: string | null;
  cantidadVendida: number;
  ingresoGenerado: number;
};

type Estadisticas = {
  resumen: Resumen;
  ventasPorDia: VentaDia[];
  ventasPorMetodo: VentaMetodo[];
  ventasPorCategoria: VentaCategoria[];
  ventasPorMes: VentaMes[];
  productosMasVendidos: ProductoVendido[];
};

// ── Constantes ────────────────────────────────────────────────────────────────

const CHART_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

const PERIODOS = [
  { key: "hoy",       label: "Hoy",              dias: 0   },
  { key: "semana",    label: "Última Semana",     dias: 7   },
  { key: "mes",       label: "Último Mes",        dias: 30  },
  { key: "trimestre", label: "Último Trimestre",  dias: 90  },
  { key: "anio",      label: "Último Año",        dias: 365 },
] as const;

type PeriodoKey = typeof PERIODOS[number]["key"];

// ── Tooltip personalizado ─────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl px-4 py-3 text-sm">
      {label && <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{label}</p>}
      {payload.map((entry: any, i: number) => (
        <p key={i} className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span style={{ color: entry.color }}>{entry.name}:</span>
          <strong className="text-gray-900 dark:text-gray-100">
            {String(entry.name).includes("$") || String(entry.name).toLowerCase().includes("ingreso")
              ? `$${Number(entry.value).toFixed(2)}`
              : entry.value}
          </strong>
        </p>
      ))}
    </div>
  );
};

// ── Componente principal ──────────────────────────────────────────────────────

export default function EstadisticasPage() {
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [fechaInicio, setFechaInicio]   = useState("");
  const [fechaFin, setFechaFin]         = useState("");
  const [periodo, setPeriodo]           = useState<PeriodoKey>("mes");

  // Fechas por defecto al montar
  useEffect(() => {
    const hoy    = new Date();
    const hace30 = new Date();
    hace30.setDate(hoy.getDate() - 30);
    setFechaFin(hoy.toISOString().split("T")[0]);
    setFechaInicio(hace30.toISOString().split("T")[0]);
  }, []);

  // Fetch cuando cambian fechas
  useEffect(() => {
    if (fechaInicio && fechaFin) fetchEstadisticas();
  }, [fechaInicio, fechaFin]);

  const fetchEstadisticas = async () => {
    setLoading(true);
    setError("");
    try {
      const res  = await fetch(`/api/estadisticas?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al cargar estadísticas");

      // La API devuelve { ok: true, data: { ... } }
      const d = data.data ?? data;
      const normalizado: Estadisticas = {
        resumen:              d.resumen              ?? { ingresoTotal: 0, totalVentas: 0, promedioVenta: 0 },
        ventasPorDia:         d.ventasPorDia         ?? [],
        ventasPorMetodo:      d.ventasPorMetodo      ?? [],
        ventasPorCategoria:   d.ventasPorCategoria   ?? [],
        ventasPorMes:         d.ventasPorMes         ?? [],
        productosMasVendidos: d.productosMasVendidos ?? [],
      };

      setEstadisticas(normalizado);
    } catch (err: any) {
      setError(err.message ?? "Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const cambiarPeriodo = (key: PeriodoKey) => {
    setPeriodo(key);
    const hoy    = new Date();
    const inicio = new Date();
    const p      = PERIODOS.find((x) => x.key === key)!;
    if (p.dias === 0) {
      setFechaInicio(hoy.toISOString().split("T")[0]);
    } else {
      inicio.setDate(hoy.getDate() - p.dias);
      setFechaInicio(inicio.toISOString().split("T")[0]);
    }
    setFechaFin(hoy.toISOString().split("T")[0]);
  };

  // ── Estados de carga / error ──
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="h-10 w-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Cargando estadísticas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
        <p className="text-lg font-semibold text-red-600 dark:text-red-400">{error}</p>
        <button onClick={fetchEstadisticas}
          className="rounded-lg bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 text-sm font-semibold transition-colors">
          Reintentar
        </button>
      </div>
    );
  }

  if (!estadisticas) return null;

  const {
    resumen, ventasPorDia, ventasPorMetodo,
    ventasPorCategoria, ventasPorMes, productosMasVendidos,
  } = estadisticas;

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <TrendingUp className="h-6 w-6" /> Estadísticas de Ventas
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {fechaInicio} → {fechaFin}
        </p>
      </div>

      {/* ── Selector de período ── */}
      <div className="card p-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          {PERIODOS.map((p) => (
            <button key={p.key} onClick={() => cambiarPeriodo(p.key)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                periodo === p.key
                  ? "bg-primary-600 text-white shadow-sm"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              )}>
              {p.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t dark:border-gray-700 pt-4">
          <div>
            <label className="label-base flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> Fecha Inicio
            </label>
            <input type="date" value={fechaInicio}
              onChange={(e) => { setFechaInicio(e.target.value); setPeriodo("mes"); }}
              max={fechaFin} className="input-base" />
          </div>
          <div>
            <label className="label-base flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> Fecha Fin
            </label>
            <input type="date" value={fechaFin}
              onChange={(e) => { setFechaFin(e.target.value); setPeriodo("mes"); }}
              min={fechaInicio} max={new Date().toISOString().split("T")[0]} className="input-base" />
          </div>
        </div>
      </div>

      {/* ── Tarjetas de resumen ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 border-l-4 border-green-500 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ingresos Totales</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              ${resumen.ingresoTotal.toFixed(2)}
            </p>
          </div>
          <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-xl flex-shrink-0">
            <DollarSign className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
        </div>

        <div className="card p-5 border-l-4 border-blue-500 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total de Ventas</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              {resumen.totalVentas}
            </p>
          </div>
          <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-xl flex-shrink-0">
            <ShoppingCart className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        <div className="card p-5 border-l-4 border-purple-500 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Promedio por Venta</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              ${resumen.promedioVenta.toFixed(2)}
            </p>
          </div>
          <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-xl flex-shrink-0">
            <TrendingUp className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
      </div>

      {/* ── Gráficos ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Ventas por día */}
        {ventasPorDia.length > 0 && (
          <div className="card p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-5 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary-500" /> Ventas por Día
            </h2>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={ventasPorDia} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.2)" />
                <XAxis dataKey="fecha" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="total"    stroke={CHART_COLORS[0]} name="Ingresos ($)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="cantidad" stroke={CHART_COLORS[1]} name="N° Ventas"    strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Métodos de pago */}
        {ventasPorMetodo.length > 0 && (
          <div className="card p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-5">Métodos de Pago</h2>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={ventasPorMetodo} cx="50%" cy="50%"
                  labelLine={false}
                  label={({ metodo, percent }: any) => `${metodo} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={95} dataKey="total">
                  {ventasPorMetodo.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Ventas por categoría */}
        {ventasPorCategoria.length > 0 && (
          <div className="card p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-5">Ventas por Categoría</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={ventasPorCategoria} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.2)" />
                <XAxis dataKey="nombre" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="ingreso" fill={CHART_COLORS[0]} name="Ingresos ($)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Ventas por mes */}
        {ventasPorMes.length > 0 && (
          <div className="card p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-5">Ventas Mensuales</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={ventasPorMes} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.2)" />
                <XAxis dataKey="mes" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="total" fill={CHART_COLORS[1]} name="Ingresos ($)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── Top 10 productos ── */}
      {productosMasVendidos.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Package className="h-4 w-4 text-primary-500" /> Top 10 Productos Más Vendidos
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  {["#", "Producto", "Categoría", "Cantidad Vendida", "Ingreso Generado"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {productosMasVendidos.map((item, i) => (
                <tr key={item.productoId ?? `manual-${i}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="px-5 py-3.5 font-bold text-gray-400 dark:text-gray-500 w-10">{i + 1}</td>
                  <td className="px-5 py-3.5 font-medium text-gray-900 dark:text-gray-100">{item.nombre}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                      {item.categoriaNombre ?? "Sin categoría"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-gray-900 dark:text-gray-100">
                    {item.cantidadVendida} <span className="text-xs font-normal text-gray-400">u.</span>
                  </td>
                  <td className="px-5 py-3.5 font-bold text-green-600 dark:text-green-400">
                    ${item.ingresoGenerado.toFixed(2)}
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Estado vacío */}
      {!ventasPorDia.length && !productosMasVendidos.length && (
        <div className="card py-20 text-center">
          <TrendingUp className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-lg font-medium text-gray-900 dark:text-gray-100">Sin datos para este período</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Intentá seleccionar un rango de fechas diferente.</p>
        </div>
      )}

    </div>
  );
}