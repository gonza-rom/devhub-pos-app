import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import TenantActions from "./TenantActions";

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      suscripcion: true,
      _count: { select: { usuarios: true, productos: true, ventas: true, movimientos: true } },
      usuarios: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, nombre: true, email: true, rol: true, activo: true, createdAt: true },
      },
    },
  });

  if (!tenant) notFound();

  const stats = [
    { label: "Usuarios", value: tenant._count.usuarios },
    { label: "Productos", value: tenant._count.productos },
    { label: "Ventas", value: tenant._count.ventas },
    { label: "Movimientos", value: tenant._count.movimientos },
  ];

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">
            {tenant.nombre}
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5 font-mono">{tenant.slug}</p>
        </div>
        <TenantActions tenant={{ id: tenant.id, plan: tenant.plan, activo: tenant.activo }} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-2xl font-semibold text-zinc-100">{s.value}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-6">
        <h2 className="text-sm font-medium text-zinc-300 mb-4">Información del tenant</h2>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-zinc-500 text-xs uppercase tracking-wider mb-1">ID</dt>
            <dd className="text-zinc-200 font-mono text-xs">{tenant.id}</dd>
          </div>
          <div>
            <dt className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Plan</dt>
            <dd className="text-zinc-200">{tenant.plan}</dd>
          </div>
          <div>
            <dt className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Estado</dt>
            <dd className={tenant.activo ? "text-green-400" : "text-zinc-500"}>
              {tenant.activo ? "Activo" : "Inactivo"}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Registrado</dt>
            <dd className="text-zinc-200">
              {new Date(tenant.createdAt).toLocaleDateString("es-AR", {
                day: "2-digit", month: "short", year: "numeric"
              })}
            </dd>
          </div>
        </dl>
      </div>

      {/* Usuarios recientes */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800">
          <h2 className="text-sm font-medium text-zinc-300">Usuarios recientes</h2>
        </div>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-zinc-800">
            {tenant.usuarios.map((u) => (
              <tr key={u.id} className="px-5">
                <td className="px-5 py-3">
                  <p className="text-zinc-200 font-medium">{u.nombre}</p>
                  <p className="text-zinc-500 text-xs">{u.email}</p>
                </td>
                <td className="px-5 py-3 text-zinc-400 text-xs uppercase">{u.rol}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs ${u.activo ? "text-green-400" : "text-zinc-500"}`}>
                    {u.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}