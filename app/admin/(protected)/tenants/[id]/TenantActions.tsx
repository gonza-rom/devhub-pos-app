"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  tenant: { id: string; plan: string; activo: boolean };
};

const PLANES = ["FREE", "PRO", "ENTERPRISE"] as const;

export default function TenantActions({ tenant }: Props) {
  const [plan, setPlan] = useState(tenant.plan);
  const [activo, setActivo] = useState(tenant.activo);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSave() {
    setLoading(true);
    await fetch(`/api/tenants/${tenant.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, activo }),
    });
    setLoading(false);
    router.refresh();
  }

  const changed = plan !== tenant.plan || activo !== tenant.activo;

  return (
    <div className="flex items-center gap-3">
      {/* Plan selector */}
      <select
        value={plan}
        onChange={(e) => setPlan(e.target.value)}
        className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-zinc-500"
      >
        {PLANES.map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>

      {/* Toggle activo */}
      <button
        onClick={() => setActivo(!activo)}
        className={`text-xs px-3 py-2 rounded-lg border transition-colors ${
          activo
            ? "bg-green-500/10 border-green-500/20 text-green-400 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400"
            : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-zinc-100"
        }`}
      >
        {activo ? "Activo" : "Inactivo"}
      </button>

      {/* Guardar */}
      {changed && (
        <button
          onClick={handleSave}
          disabled={loading}
          className="bg-zinc-100 hover:bg-white text-zinc-900 text-xs font-medium rounded-lg px-3 py-2 transition-colors disabled:opacity-50"
        >
          {loading ? "Guardando..." : "Guardar"}
        </button>
      )}
    </div>
  );
}