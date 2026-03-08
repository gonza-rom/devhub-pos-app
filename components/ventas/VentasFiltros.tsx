    "use client";
// components/ventas/VentasFiltros.tsx
// Filtros del historial de ventas.
// Usa navegación por URL (searchParams) igual que ProductosPage.

import { useRouter } from "next/navigation";
import { useState }  from "react";
import { Search, X } from "lucide-react";

type Props = {
  metodosPago: string[];
  valores: {
    desde:      string;
    hasta:      string;
    metodoPago: string;
    cliente:    string;
  };
};

export default function VentasFiltros({ metodosPago, valores }: Props) {
  const router = useRouter();
  const [form, setForm] = useState(valores);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = new URLSearchParams();
    if (form.desde)      q.set("desde",      form.desde);
    if (form.hasta)      q.set("hasta",      form.hasta);
    if (form.metodoPago) q.set("metodoPago", form.metodoPago);
    if (form.cliente)    q.set("cliente",    form.cliente);
    q.set("page", "1");
    router.push(`/ventas?${q.toString()}`);
  }

  function handleLimpiar() {
    setForm({ desde: "", hasta: "", metodoPago: "", cliente: "" });
    router.push("/ventas");
  }

  const hayFiltros = !!(form.desde || form.hasta || form.metodoPago || form.cliente);

  return (
    <div className="card p-4">
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">

        {/* Desde */}
        <div className="flex flex-col gap-1">
          <label className="label-base">Desde</label>
          <input
            type="date" name="desde" value={form.desde} onChange={handleChange}
            className="input-base"
            style={{ minWidth: "140px" }}
          />
        </div>

        {/* Hasta */}
        <div className="flex flex-col gap-1">
          <label className="label-base">Hasta</label>
          <input
            type="date" name="hasta" value={form.hasta} onChange={handleChange}
            className="input-base"
            style={{ minWidth: "140px" }}
          />
        </div>

        {/* Método de pago */}
        <div className="flex flex-col gap-1">
          <label className="label-base">Método de pago</label>
          <select name="metodoPago" value={form.metodoPago} onChange={handleChange}
            className="input-base" style={{ minWidth: "160px" }}>
            <option value="">Todos</option>
            {metodosPago.map(m => (
              <option key={m} value={m}>{m.charAt(0) + m.slice(1).toLowerCase()}</option>
            ))}
          </select>
        </div>

        {/* Cliente */}
        <div className="flex flex-col gap-1 flex-1" style={{ minWidth: "160px" }}>
          <label className="label-base">Cliente</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5"
              style={{ color: "var(--text-faint)" }} />
            <input
              type="text" name="cliente" value={form.cliente} onChange={handleChange}
              placeholder="Nombre del cliente..." className="input-base pl-8"
            />
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-2 items-end pb-0.5">
          <button type="submit" className="btn-ghost px-4 py-2">
            Filtrar
          </button>
          {hayFiltros && (
            <button
              type="button"
              onClick={handleLimpiar}
              className="flex items-center gap-1.5 btn-ghost px-3 py-2 text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              <X className="h-3.5 w-3.5" />
              Limpiar
            </button>
          )}
        </div>
      </form>
    </div>
  );
}