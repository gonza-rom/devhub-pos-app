"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function ToggleMostrarCanceladas() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const mostrarCanceladas = searchParams.get("mostrarCanceladas") === "true";
  const desde = searchParams.get("desde") || "";
  const hasta = searchParams.get("hasta") || "";
  const metodoPago = searchParams.get("metodoPago") || "";
  const cliente = searchParams.get("cliente") || "";

  const handleChange = (checked: boolean) => {
    const q = new URLSearchParams();
    if (desde) q.set("desde", desde);
    if (hasta) q.set("hasta", hasta);
    if (metodoPago) q.set("metodoPago", metodoPago);
    if (cliente) q.set("cliente", cliente);
    if (checked) q.set("mostrarCanceladas", "true");
    router.push(`/historial-ventas?${q.toString()}`);
  };

  return (
    <div className="card p-3">
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={mostrarCanceladas}
          onChange={(e) => handleChange(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
        />
        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Mostrar ventas canceladas
        </span>
      </label>
    </div>
  );
}