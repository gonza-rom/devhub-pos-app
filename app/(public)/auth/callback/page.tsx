"use client";
// app/(public)/auth/callback/page.tsx
// Maneja el callback de Supabase desde el cliente
// El flujo PKCE necesita acceso al localStorage del browser

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Suspense } from "react";

function CallbackHandler() {
  const router     = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    async function handleCallback() {
      const error            = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");
      const code             = searchParams.get("code");

      if (error) {
        router.replace(`/auth/login?error=${encodeURIComponent(errorDescription ?? error)}`);
        return;
      }

      if (code) {
        const supabase = createClient();
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          router.replace(`/auth/login?error=${encodeURIComponent("Link inválido o expirado")}`);
          return;
        }
      }

      // Sesión establecida en el cliente → crear tenant + cookie de sesión
      // refresh-session es un endpoint GET que lee la sesión de Supabase,
      // crea el tenant si no existe y setea la cookie de tenant
      window.location.href = "/api/auth/refresh-session?redirect=/dashboard";
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