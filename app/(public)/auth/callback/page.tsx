// app/(public)/auth/callback/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { toSlug } from "@/lib/utils";

export default async function AuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string; error?: string; error_description?: string }>;
}) {
  const params = await searchParams;

  if (params.error) {
    redirect(`/auth/login?error=${encodeURIComponent(params.error_description ?? params.error)}`);
  }

  if (params.token_hash && params.type) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      token_hash: params.token_hash,
      type: params.type as any,
    });

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Verificar si ya tiene tenant (evitar duplicados si el link se abre dos veces)
        const existente = await prisma.usuarioTenant.findUnique({
          where: { supabaseId: user.id },
        });

        if (!existente) {
          const nombre         = user.user_metadata?.nombre        ?? "Usuario";
          const nombreComercio = user.user_metadata?.nombreComercio ?? "Mi Comercio";

          // Generar slug único
          const base = toSlug(nombreComercio);
          let slug = base, contador = 2;
          while (await prisma.tenant.findUnique({ where: { slug } })) {
            slug = `${base}-${contador++}`;
          }

          await prisma.$transaction(async (tx) => {
            const tenant = await tx.tenant.create({
              data: { nombre: nombreComercio, email: user.email!, slug, plan: "FREE" },
            });
            await tx.usuarioTenant.create({
              data: {
                tenantId:   tenant.id,
                supabaseId: user.id,
                nombre,
                email:      user.email!,
                rol:        "PROPIETARIO",
              },
            });
            await tx.suscripcion.create({
              data: { tenantId: tenant.id, plan: "FREE", estado: "authorized" },
            });
          });
        }
      }

      redirect("/dashboard");
    }
  }

  redirect("/auth/login?error=Link+inválido+o+expirado");
}
