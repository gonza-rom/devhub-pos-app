"use client";
// app/(public)/auth/loading/page.tsx
// Pantalla de transición entre login y dashboard.
// Muestra spinner mientras refresh-session setea la cookie del tenant.

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function LoadingHandler() {
  const searchParams = useSearchParams();
  const redirectTo   = searchParams.get("redirect") ?? "/dashboard";

  useEffect(() => {
    // Pequeño delay para que el spinner sea visible (evita flash)
    const timer = setTimeout(() => {
      window.location.href = `/api/auth/refresh-session?redirect=${encodeURIComponent(redirectTo)}`;
    }, 300);
    return () => clearTimeout(timer);
  }, [redirectTo]);

  return null;
}

export default function AuthLoadingPage() {
  return (
    <Suspense fallback={null}>
      <LoadingHandler />
      <div style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a0a",
        gap: "1.5rem",
        fontFamily: "sans-serif",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36,
            background: "rgba(220,38,38,0.12)",
            border: "1px solid rgba(220,38,38,0.25)",
            borderRadius: 10,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em" }}>
            DevHub POS
          </span>
        </div>

        {/* Spinner */}
        <div style={{
          width: 36, height: 36,
          border: "3px solid rgba(220,38,38,0.2)",
          borderTopColor: "#DC2626",
          borderRadius: "50%",
          animation: "spin 0.7s linear infinite",
        }} />

        <p style={{ fontSize: "0.8125rem", color: "#52525b", margin: 0 }}>
          Cargando tu cuenta...
        </p>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </Suspense>
  );
}