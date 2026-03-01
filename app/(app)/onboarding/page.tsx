// app/onboarding/page.tsx
// Esta página aparece si el user existe en Supabase pero no tiene tenant
// Puede pasar si el registro falló a medias

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Verificar si ya tiene tenant (carrera de condiciones en el registro)
  const usuarioTenant = await prisma.usuarioTenant.findUnique({
    where: { supabaseId: user.id },
  });

  // Si ya tiene tenant, mandar al dashboard
  if (usuarioTenant) redirect("/dashboard");

  // Si llegó acá, el registro falló a medias → mostrar mensaje y cerrar sesión
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">⚠️</div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Cuenta incompleta
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Hubo un problema al crear tu comercio. Por favor registrate de nuevo.
        </p>
        <a
          href="/auth/registro"
          className="inline-block rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
        >
          Volver al registro
        </a>
      </div>
    </div>
  );
}
