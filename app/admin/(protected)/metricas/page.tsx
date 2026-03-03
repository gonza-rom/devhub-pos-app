import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export default async function MetricasPage() {
  await requireAdmin();

  const [
    totalTenants,
    tenantActivos,
    totalUsuarios,
    totalVentas,
    totalProductos,
    tenantsPorPlan,
    tenantsRecientes,
  ] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { activo: true } }),
    prisma.usuarioTenant.count(),
    prisma.venta.count(),
    prisma.producto.count(),
    prisma.tenant.groupBy({
      by: ["plan"],
      _count: { id: true },
    }),
    prisma.tenant.findMany({
      where: { activo: true },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        nombre: true,
        slug: true,
        plan: true,
        createdAt: true,
        _count: { select: { ventas: true } },
      },
    }),
  ]);

  const planMap = Object.fromEntries(
    tenantsPorPlan.map((p) => [p.plan, p._count.id])
  );

  const statsGlobales = [
    { label: "Tenants totales", value: totalTenants },
    { label: "Tenants activos", value: tenantActivos },
    { label: "Usuarios totales", value: totalUsuarios },
    { label: "Ventas totales", value: totalVentas.toLocaleString("es-AR") },
    { label: "Productos cargados", value: totalProductos.toLocaleString("es-AR") },
  ];

  const PLAN_BADGE: Record<string, string> = {
    FREE: "bg-zinc-800 text-zinc-400",
    PRO: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    ENTERPRISE: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-zinc-100">Métricas globales</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Vista general de la plataforma</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-5 gap-3 mb-8">
        {statsGlobales.map((s) => (
          <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-2xl font-semibold text-zinc-100">{s.value}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Distribución por plan */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-sm font-medium text-zinc-300 mb-4">Distribución por plan</h2>
          <div className="space-y-3">
            {["FREE", "PRO", "ENTERPRISE"].map((plan) => {
              const count = planMap[plan] ?? 0;
              const pct = totalTenants > 0 ? Math.round((count / totalTenants) * 100) : 0;
              return (
                <div key={plan}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${PLAN_BADGE[plan]}`}>
                      {plan}
                    </span>
                    <span className="text-zinc-400 text-sm">{count} <span className="text-zinc-600">({pct}%)</span></span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-zinc-500 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tenants recientes */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800">
            <h2 className="text-sm font-medium text-zinc-300">Últimos registros</h2>
          </div>
          <div className="divide-y divide-zinc-800">
            {tenantsRecientes.map((t) => (
              <div key={t.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-200">{t.nombre}</p>
                  <p className="text-xs text-zinc-500 font-mono">{t.slug}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${PLAN_BADGE[t.plan] ?? PLAN_BADGE.FREE}`}>
                    {t.plan}
                  </span>
                  <p className="text-xs text-zinc-600 mt-0.5">
                    {new Date(t.createdAt).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}