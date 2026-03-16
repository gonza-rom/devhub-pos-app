"use client";
// components/dashboard/DashboardCharts.tsx
// Chart de barras de ventas últimos 7 días — client component liviano

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";

type DiaVenta = { fecha: string; total: number; cantidad: number };

const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function formatearEje(fecha: string) {
  const d = new Date(fecha + "T12:00:00"); // noon para evitar timezone issues
  return DIAS_CORTOS[d.getDay()];
}

function formatearPrecio(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const data: DiaVenta = payload[0]?.payload;
  return (
    <div
      className="rounded-xl px-4 py-3 text-sm shadow-xl"
      style={{
        background: "#1a1a1a",
        border: "1px solid rgba(255,255,255,0.1)",
        minWidth: 140,
      }}
    >
      <p className="font-semibold mb-1.5" style={{ color: "#f4f4f5" }}>
        {label}
      </p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span style={{ color: "#71717a" }}>Ingresos</span>
          <span className="font-bold" style={{ color: "#DC2626" }}>
            {new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(data.total)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span style={{ color: "#71717a" }}>Ventas</span>
          <span className="font-semibold" style={{ color: "#f4f4f5" }}>
            {data.cantidad}
          </span>
        </div>
      </div>
    </div>
  );
};

export default function DashboardCharts({ ventasPorDia }: { ventasPorDia: DiaVenta[] }) {
  const hoy = new Date().toISOString().split("T")[0];
  const maxTotal = Math.max(...ventasPorDia.map(d => d.total), 1);

  if (ventasPorDia.every(d => d.total === 0)) {
    return (
      <div className="flex items-center justify-center h-40 rounded-xl" style={{ background: "rgba(255,255,255,0.02)" }}>
        <p className="text-sm" style={{ color: "var(--text-faint)" }}>
          Sin ventas en los últimos 7 días
        </p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={ventasPorDia} margin={{ top: 4, right: 4, bottom: 0, left: -10 }} barSize={28}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(255,255,255,0.05)"
          vertical={false}
        />
        <XAxis
          dataKey="fecha"
          tickFormatter={formatearEje}
          tick={{ fontSize: 11, fill: "#71717a" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatearEje2 => formatearPrecio(Number(formatearEje2))}
          tick={{ fontSize: 10, fill: "#52525b" }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)", radius: 6 }} />
        <Bar dataKey="total" radius={[5, 5, 0, 0]}>
          {ventasPorDia.map((entry) => (
            <Cell
              key={entry.fecha}
              fill={
                entry.fecha === hoy
                  ? "#DC2626"
                  : entry.total === maxTotal
                  ? "rgba(220,38,38,0.6)"
                  : "rgba(220,38,38,0.25)"
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}