"use client";
// app/error.tsx — Error global de Next.js

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#0a0a0a", padding: "1.5rem",
    }}>
      <div style={{ textAlign: "center", maxWidth: 420 }}>

        {/* Ícono */}
        <div style={{
          width: 64, height: 64, borderRadius: "50%", margin: "0 auto 1.5rem",
          background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <AlertTriangle style={{ width: 28, height: 28, color: "#DC2626" }} />
        </div>

        {/* Texto */}
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#fff", margin: "0 0 0.5rem" }}>
          Algo salió mal
        </h1>
        <p style={{ fontSize: "0.875rem", color: "#71717a", margin: "0 0 0.375rem" }}>
          Ocurrió un error inesperado. Podés intentar de nuevo.
        </p>
        {error?.digest && (
          <p style={{ fontSize: "0.75rem", color: "#3f3f46", marginBottom: "2rem", fontFamily: "monospace" }}>
            ID: {error.digest}
          </p>
        )}

        {/* Botones */}
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", marginTop: "2rem" }}>
          <button
            onClick={reset}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 20px", background: "#DC2626", border: "none",
              borderRadius: 10, color: "#fff", fontSize: "0.875rem",
              fontWeight: 600, cursor: "pointer",
            }}
          >
            <RefreshCw style={{ width: 15, height: 15 }} />
            Intentar de nuevo
          </button>
          <a
            href="/dashboard"
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 20px", background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10, color: "#a1a1aa", fontSize: "0.875rem",
              fontWeight: 600, textDecoration: "none",
            }}
          >
            <Home style={{ width: 15, height: 15 }} />
            Ir al inicio
          </a>
        </div>
      </div>
    </div>
  );
}