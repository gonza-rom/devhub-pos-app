// app/(app)/layout.tsx
import { redirect }       from "next/navigation";
import { unstable_cache } from "next/cache";
import { createClient }   from "@/lib/supabase/server";
import { prisma }         from "@/lib/prisma";
import { headers }        from "next/headers";
import Sidebar            from "@/components/layout/Sidebar";
import Topbar             from "@/components/layout/Topbar";
import Link               from "next/link";
import { AlertTriangle }  from "lucide-react";
import { SessionKeepAlive } from "@/components/Supabase/SessionKeepAlive";


const getTenantCached = unstable_cache(
  async (supabaseId: string) =>
    prisma.usuarioTenant.findUnique({
      where:  { supabaseId },
      select: {
        nombre: true,
        rol:    true,
        activo: true,
        tenant: { select: { nombre: true, plan: true, logoUrl: true } },
      },
    }),
  ["layout-tenant"],
  { revalidate: 60, tags: ["tenant-config"] }
);

const getAFIPActivoCached = (supabaseId: string) =>
  unstable_cache(
    async () => {
      const ut = await prisma.usuarioTenant.findUnique({
        where:  { supabaseId },
        select: { tenantId: true },
      });
      if (!ut) return false;
      const config = await prisma.configuracionAFIP.findUnique({
        where:  { tenantId: ut.tenantId },
        select: { activo: true },
      });
      return !!config?.activo;
    },
    [`layout-afip-${supabaseId}`],
    { revalidate: 60, tags: ["afip-config"] }
  )();

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const headersList = await headers();
  const trialVencido = headersList.get("x-trial-vencido") === "1";

  const [ut, tieneAFIP] = await Promise.all([
    getTenantCached(user.id),
    getAFIPActivoCached(user.id),
  ]);

  if (!ut?.activo) redirect("/onboarding");

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-base)" }}>
      <Sidebar
        nombreTenant={ut.tenant.nombre}
        plan={ut.tenant.plan}
        logoUrl={ut.tenant.logoUrl}
        rol={ut.rol}
        tieneAFIP={tieneAFIP}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar
          nombreUsuario={ut.nombre}
          emailUsuario={user.email ?? ""}
          rolUsuario={ut.rol}
          nombreTenant={ut.tenant.nombre}
          plan={ut.tenant.plan}
          logoUrl={ut.tenant.logoUrl}
          tieneAFIP={tieneAFIP}  // ← agregar esta línea
        />

        {/* ── Banner trial vencido ── */}
        {trialVencido && (
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 flex-shrink-0"
            style={{ background: "rgba(220,38,38,0.1)", borderBottom: "1px solid rgba(220,38,38,0.3)" }}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                Tu período de prueba gratuito ha vencido. No podés cargar nuevos productos ni ventas.
              </p>
            </div>
            <Link
              href="/configuracion/plan"
              className="flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg text-white transition-colors"
              style={{ background: "#DC2626" }}
            >
              Suscribirme al Pro →
            </Link>
          </div>
        )}

        <main
          className="flex-1 overflow-y-auto p-4 md:p-6"
          style={{ background: "var(--bg-base)" }}
        >
          <SessionKeepAlive />
          {children}
        </main>
      </div>
    </div>
  );
}