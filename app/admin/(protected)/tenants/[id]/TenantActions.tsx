"use client";
// app/admin/(protected)/tenants/[id]/TenantActions.tsx

import { useState } from "react";
import { useRouter } from "next/navigation";

type Usuario = {
  id: string;
  supabaseId: string;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
};

type Props = {
  tenant: { id: string; plan: string; activo: boolean };
  usuarios: Usuario[];
};

const PLANES = ["FREE", "PRO", "ENTERPRISE"] as const;

/* ── Modal cambio de contraseña ── */
function PasswordModal({
  usuario,
  onClose,
}: {
  usuario: Usuario;
  onClose: () => void;
}) {
  const [password, setPassword]   = useState("");
  const [mostrar,  setMostrar]    = useState(false);
  const [loading,  setLoading]    = useState(false);
  const [ok,       setOk]         = useState(false);
  const [error,    setError]      = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setOk(false);

    const res  = await fetch(`/api/admin/usuarios/${usuario.supabaseId}/password`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ password }),
    });
    const data = await res.json();

    if (data.ok) {
      setOk(true);
      setTimeout(onClose, 1200);
    } else {
      setError(data.error ?? "Error al cambiar contraseña");
    }
    setLoading(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 space-y-5"
        style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        {/* Header */}
        <div>
          <h3 className="text-base font-semibold text-zinc-100">Cambiar contraseña</h3>
          <p className="text-sm text-zinc-500 mt-0.5">
            Usuario: <span className="text-zinc-300">{usuario.nombre}</span>
            <span className="text-zinc-600 ml-1">({usuario.email})</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
              Nueva contraseña
            </label>
            <div className="relative">
              <input
                type={mostrar ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
                className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 rounded-lg px-4 py-2.5 pr-10 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setMostrar(!mostrar)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors text-xs"
              >
                {mostrar ? "Ocultar" : "Ver"}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {ok && (
            <p className="text-green-400 text-xs bg-green-400/10 border border-green-400/20 rounded-lg px-3 py-2">
              ✓ Contraseña actualizada correctamente
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || ok}
              className="flex-1 bg-zinc-100 hover:bg-white text-zinc-900 text-sm font-medium rounded-lg px-4 py-2.5 transition-colors disabled:opacity-50"
            >
              {loading ? "Guardando..." : "Cambiar contraseña"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Componente principal ── */
export default function TenantActions({ tenant, usuarios }: Props) {
  const [plan,     setPlan]     = useState(tenant.plan);
  const [activo,   setActivo]   = useState(tenant.activo);
  const [loading,  setLoading]  = useState(false);
  const [modalUser, setModalUser] = useState<Usuario | null>(null);
  const router = useRouter();

  async function handleSave() {
    setLoading(true);
    await fetch(`/api/admin/tenants/${tenant.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ plan, activo }),
    });
    setLoading(false);
    router.refresh();
  }

  const changed = plan !== tenant.plan || activo !== tenant.activo;

  return (
    <>
      {/* ── Controles del tenant ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-zinc-500"
        >
          {PLANES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

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

      {/* ── Tabla de usuarios con botón cambiar contraseña ── */}
      {usuarios.length > 0 && (
        <div
          className="mt-6 rounded-xl overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="px-5 py-3.5 border-b border-zinc-800">
            <h3 className="text-sm font-medium text-zinc-300">Usuarios del comercio</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-800">
              <tr>
                {["Usuario", "Rol", "Estado", ""].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-2.5 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {usuarios.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-800/20 transition-colors">
                  <td className="px-5 py-3">
                    <p className="text-zinc-200 font-medium">{u.nombre}</p>
                    <p className="text-zinc-500 text-xs">{u.email}</p>
                  </td>
                  <td className="px-5 py-3 text-zinc-400 text-xs uppercase tracking-wide">
                    {u.rol}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs ${u.activo ? "text-green-400" : "text-zinc-500"}`}>
                      {u.activo ? "● Activo" : "○ Inactivo"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => setModalUser(u)}
                      className="text-xs text-zinc-400 hover:text-zinc-100 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg px-3 py-1.5 transition-colors"
                    >
                      Cambiar contraseña
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal ── */}
      {modalUser && (
        <PasswordModal
          usuario={modalUser}
          onClose={() => setModalUser(null)}
        />
      )}
    </>
  );
}