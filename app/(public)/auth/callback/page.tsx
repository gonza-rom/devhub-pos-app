// app/(public)/auth/callback/page.tsx
// Maneja el callback de confirmación de email de Supabase (flujo PKCE)

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { toSlug } from "@/lib/utils";

export default async function AuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{
    code?: string;
    token_hash?: string;
    type?: string;
    error?: string;
    error_description?: string;
  }>;
}) {
  const params = await searchParams;

  // Si Supabase mandó un error en la URL
  if (params.error) {
    redirect(`/auth/login?error=${encodeURIComponent(params.error_description ?? params.error)}`);
  }

  const supabase = await createClient();

  // ── Flujo PKCE con `code` ──
  if (params.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (error) {
      redirect(`/auth/login?error=${encodeURIComponent("Link inválido o expirado")}`);
    }
  }
  // ── Flujo OTP con token_hash (fallback) ──
  else if (params.token_hash && params.type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: params.token_hash,
      type: params.type as any,
    });
    if (error) {
      redirect(`/auth/login?error=${encodeURIComponent("Link inválido o expirado")}`);
    }
  } else {
    redirect(`/auth/login?error=${encodeURIComponent("Link inválido o expirado")}`);
  }

  // ── Crear tenant si no existe ──────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const existente = await prisma.usuarioTenant.findUnique({
      where: { supabaseId: user.id },
    });

    if (!existente) {
      const nombre         = user.user_metadata?.nombre        ?? "Usuario";
      const nombreComercio = user.user_metadata?.nombreComercio ?? "Mi Comercio";

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

  redirect("/auth/refresh-session?redirect=/dashboard");
}