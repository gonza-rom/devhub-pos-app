import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

const PLAN_BADGE: Record<string, string> = {
  FREE: "bg-zinc-800 text-zinc-400",
  PRO: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  ENTERPRISE: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
};

export default async function TenantsPage() {
  await requireAdmin();

  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { usuarios: true, productos: true, ventas: true } },
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Comercios</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{tenants.length} tenants registrados</p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Comercio</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Slug</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Plan</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Usuarios</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Productos</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Ventas</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {tenants.map((t) => (
              <tr key={t.id} className="hover:bg-zinc-800/30 transition-colors">
                <td className="px-4 py-3">
                  <span className="text-zinc-100 font-medium">{t.nombre}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-zinc-400 font-mono text-xs">{t.slug}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${PLAN_BADGE[t.plan] ?? PLAN_BADGE.FREE}`}>
                    {t.plan}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-zinc-400">{t._count.usuarios}</td>
                <td className="px-4 py-3 text-right text-zinc-400">{t._count.productos}</td>
                <td className="px-4 py-3 text-right text-zinc-400">{t._count.ventas}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1.5 text-xs ${t.activo ? "text-green-400" : "text-zinc-500"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${t.activo ? "bg-green-400" : "bg-zinc-600"}`} />
                    {t.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/tenants/${t.id}`}
                    className="text-xs text-zinc-400 hover:text-zinc-100 transition-colors"
                  >
                    Ver →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {tenants.length === 0 && (
          <div className="py-12 text-center text-zinc-500 text-sm">
            No hay tenants registrados
          </div>
        )}
      </div>
    </div>
  );
}