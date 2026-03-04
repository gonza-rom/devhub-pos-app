// app/(app)/layout.tsx
import { redirect }       from "next/navigation";
import { unstable_cache } from "next/cache";
import { createClient }   from "@/lib/supabase/server";
import { prisma }         from "@/lib/prisma";
import Sidebar            from "@/components/layout/Sidebar";
import Topbar             from "@/components/layout/Topbar";

// Cache del tenant por supabaseId — ~0ms en cache hit.
// Invalidar con: revalidateTag("tenant-config") al guardar configuración.
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

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  // getUser() verifica el JWT localmente (sin red) cuando la cookie es reciente.
  // Solo va a Supabase si el token necesita refresh (~cada 1h).
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const ut = await getTenantCached(user.id);
  if (!ut?.activo) redirect("/onboarding");

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#0f0f0f" }}>
      <Sidebar
        nombreTenant={ut.tenant.nombre}
        plan={ut.tenant.plan}
        logoUrl={ut.tenant.logoUrl}
        rol={ut.rol}
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
        <main className="flex-1 overflow-y-auto p-4 md:p-6" style={{ background: "#0f0f0f" }}>
          {children}
        </main>
      </div>
    </div>
  );
}