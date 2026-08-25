"use client";
// app/(public)/error.tsx — Error boundary para /auth y /catalogo

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <div style={{ minHeight: "100vh", background: "#fafafa", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ textAlign: "center", maxWidth: 400 }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
          <AlertTriangle style={{ width: 28, height: 28, color: "#ef4444" }} />
        </div>

        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#111827", margin: "0 0 0.5rem" }}>
          Algo salió mal
        </h1>
        <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: "0 0 0.375rem", lineHeight: 1.6 }}>
          Ocurrió un error inesperado. Podés intentar de nuevo.
        </p>
        {error?.digest && (
          <p style={{ fontSize: "0.75rem", color: "#d1d5db", margin: "0 0 2rem", fontFamily: "monospace" }}>
            ID: {error.digest}
          </p>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 24 }}>
          <button onClick={reset}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "#111827", border: "none", borderRadius: 12, color: "#fff", fontSize: "0.875rem", fontWeight: 700, cursor: "pointer" }}>
            <RefreshCw style={{ width: 15, height: 15 }} />
            Intentar de nuevo
          </button>
          <a href="/"
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "#f3f4f6", borderRadius: 12, color: "#374151", fontSize: "0.875rem", fontWeight: 700, textDecoration: "none" }}>
            <Home style={{ width: 15, height: 15 }} />
            Ir al inicio
          </a>
        </div>
      </div>
    </div>
  );
}
