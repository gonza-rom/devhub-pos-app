// app/(app)/layout.tsx
// Layout de todas las rutas protegidas: sidebar + topbar + contenido

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Verificar sesión (el middleware ya lo hace, pero acá también para el layout)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Obtener datos del usuario y tenant
  const usuarioTenant = await prisma.usuarioTenant.findUnique({
    where: { supabaseId: user.id },
    include: {
      tenant: {
        select: { id: true, nombre: true, plan: true, logoUrl: true },
      },
    },
  });

  if (!usuarioTenant) redirect("/onboarding");

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* Sidebar */}
      <Sidebar
        nombreTenant={usuarioTenant.tenant.nombre}
        plan={usuarioTenant.tenant.plan}
        logoUrl={usuarioTenant.tenant.logoUrl}
        rol={usuarioTenant.rol}
      />

      {/* Contenido principal */}
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
