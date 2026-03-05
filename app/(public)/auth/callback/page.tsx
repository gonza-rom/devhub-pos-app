"use client";
// app/(public)/auth/callback/page.tsx
// Maneja implicit flow: el token viene en el hash #access_token=...

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Suspense } from "react";

function CallbackHandler() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    async function handleCallback() {
      // ── Error en query params ──
      const error            = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");
      if (error) {
        router.replace(`/auth/login?error=${encodeURIComponent(errorDescription ?? error)}`);
        return;
      }

      const supabase = createClient();

      // ── Implicit flow: token en el hash #access_token=...&refresh_token=... ──
      const hash = window.location.hash;
      if (hash && hash.includes("access_token")) {
        // Supabase lee el hash automáticamente al llamar getSession()
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
          router.replace(`/auth/login?error=${encodeURIComponent("Link inválido o expirado")}`);
          return;
        }

        window.location.href = "/api/auth/refresh-session?redirect=/dashboard";
        return;
      }

      // ── PKCE flow: token en query param ?code= ──
      const code = searchParams.get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          router.replace(`/auth/login?error=${encodeURIComponent("Link inválido o expirado")}`);
          return;
        }
        window.location.href = "/api/auth/refresh-session?redirect=/dashboard";
        return;
      }

      // ── Nada encontrado ──
      router.replace(`/auth/login?error=${encodeURIComponent("Link inválido o expirado")}`);
    }

    handleCallback();
  }, [router, searchParams]);

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#0a0a0a",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 40, height: 40, margin: "0 auto 1rem",
          border: "3px solid rgba(220,38,38,0.25)",
          borderTopColor: "#DC2626", borderRadius: "50%",
          animation: "spin 0.7s linear infinite",
        }} />
        <p style={{ color: "#71717a", fontSize: "0.875rem", fontFamily: "sans-serif" }}>
          Confirmando tu cuenta...
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <CallbackHandler />
    </Suspense>
  );
}