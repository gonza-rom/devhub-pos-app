// app/(public)/auth/callback/page.tsx
// Supabase redirige aquí después de confirmar el email
// URL: /auth/callback?token_hash=xxx&type=signup

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string; error?: string; error_description?: string }>;
}) {
  const params = await searchParams;

  // Si Supabase mandó un error en la URL
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
      // Email confirmado → ir al dashboard
      redirect("/dashboard");
    }
  }

  // Fallback: algo salió mal
  redirect("/auth/login?error=Link+inválido+o+expirado");
}