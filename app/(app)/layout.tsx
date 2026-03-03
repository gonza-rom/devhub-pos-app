// app/(app)/layout.tsx
// OPTIMIZADO: caché de 30s en la query del layout para no ir a DB en cada navegación

import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";

// Cache de 30 segundos por supabaseId
// Se invalida automáticamente con revalidateTag("tenant-config") cuando el usuario guarda cambios
const getTenantData = unstable_cache(
  async (supabaseId: string) => {
    return prisma.usuarioTenant.findUnique({
      where: { supabaseId },
      include: {
        tenant: {
          select: { id: true, nombre: true, plan: true, logoUrl: true },
        },
      },
    });
  },
  ["tenant-layout"],
  {
    revalidate: 30,
    tags:       ["tenant-config"],
  }
);

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const usuarioTenant = await getTenantData(user.id);

  if (!usuarioTenant) redirect("/onboarding");

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar
        nombreTenant={usuarioTenant.tenant.nombre}
        plan={usuarioTenant.tenant.plan}
        logoUrl={usuarioTenant.tenant.logoUrl}
        rol={usuarioTenant.rol}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar
          nombreUsuario={usuarioTenant.nombre}
          emailUsuario={user.email ?? ""}
          rolUsuario={usuarioTenant.rol}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}