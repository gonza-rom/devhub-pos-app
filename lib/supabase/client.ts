// lib/supabase/client.ts
// Cliente Supabase para Client Components (browser)
// autoRefreshToken: true → refresca el access token automáticamente antes de que expire

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: true,   // refresca el token 1 minuto antes de expirar
        persistSession:   true,   // guarda la sesión en localStorage
        detectSessionInUrl: false,
      },
    }
  );
}