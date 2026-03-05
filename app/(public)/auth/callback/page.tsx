"use client";
// app/(public)/auth/callback/page.tsx
// Maneja implicit flow: el token viene en el hash #access_token=...

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Suspense } from "react";
import Link from "next/link";
import { CheckCircle2, ArrowRight, Store } from "lucide-react";

function CallbackHandler() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [estado, setEstado] = useState<"cargando" | "activado" | "ya_confirmado">("cargando");

  useEffect(() => {
    async function handleCallback() {
      const error = searchParams.get("error");

      // Si hay error en la URL → la cuenta igual puede estar confirmada
      // mostramos pantalla amigable en vez de "link expirado"
      if (error) {
        setEstado("ya_confirmado");
        return;
      }

      const supabase = createClient();
      const code = searchParams.get("code");

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setEstado("ya_confirmado");
          return;
        }
        // Éxito — generar cookie y redirigir
        window.location.href = "/api/auth/refresh-session?redirect=/dashboard";
        return;
      }

      // Sin code ni error → mostrar pantalla de login
      setEstado("ya_confirmado");
    }

    handleCallback();
  }, [router, searchParams]);

  if (estado === "cargando") {
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

  // Estado "ya_confirmado" o "activado" sin redirect automático
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#0a0a0a",
      padding: "1.5rem", fontFamily: "sans-serif",
    }}>
      <div style={{
        width: "100%", maxWidth: 400, background: "#111111",
        border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20,
        padding: "2.5rem 2rem", textAlign: "center",
        boxShadow: "0 32px 64px rgba(0,0,0,0.6)",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: "1.5rem" }}>
          <div style={{
            width: 36, height: 36, background: "rgba(220,38,38,0.12)",
            border: "1px solid rgba(220,38,38,0.25)", borderRadius: 10,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Store size={18} color="#DC2626" />
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>DevHub POS</span>
        </div>

        {/* Ícono */}
        <div style={{
          width: 64, height: 64, borderRadius: "50%", margin: "0 auto 1.25rem",
          background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <CheckCircle2 size={28} color="#22c55e" />
        </div>

        <h2 style={{ fontSize: "1.375rem", fontWeight: 700, color: "#fff", margin: "0 0 0.5rem" }}>
          ¡Cuenta activada!
        </h2>
        <p style={{ fontSize: "0.875rem", color: "#71717a", margin: "0 0 1.75rem", lineHeight: 1.6 }}>
          Tu cuenta ya está lista. Ingresá con tu email y contraseña para empezar a usar DevHub POS.
        </p>

        <Link href="/auth/login" style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "#DC2626", color: "#fff", textDecoration: "none",
          padding: "11px 24px", borderRadius: 10, fontSize: "0.9375rem",
          fontWeight: 600,
        }}>
          Iniciar sesión <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {