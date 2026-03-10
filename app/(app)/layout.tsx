// app/(app)/layout.tsx
import { redirect }       from "next/navigation";
import { unstable_cache } from "next/cache";
import { createClient }   from "@/lib/supabase/server";
import { prisma }         from "@/lib/prisma";
import Sidebar            from "@/components/layout/Sidebar";
import Topbar             from "@/components/layout/Topbar";

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
    { revalidate: 60, tags: ["afip-config"] }  // ← tag genérico
  )();

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

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
        />
        <main
          className="flex-1 overflow-y-auto p-4 md:p-6"
          style={{ background: "var(--bg-base)" }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}