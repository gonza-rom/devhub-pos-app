// app/not-found.tsx — Página 404 global

import Link from "next/link";
import { Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#0a0a0a", padding: "1.5rem",
    }}>
      <div style={{ textAlign: "center", maxWidth: 420 }}>

        {/* 404 grande */}
        <p style={{
          fontSize: "7rem", fontWeight: 800, color: "rgba(220,38,38,0.15)",
          margin: 0, lineHeight: 1, letterSpacing: "-0.05em",
          userSelect: "none",
        }}>
          404
        </p>

        {/* Ícono */}
        <div style={{
          width: 56, height: 56, borderRadius: "50%", margin: "-1rem auto 1.5rem",
          background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Search style={{ width: 24, height: 24, color: "#DC2626" }} />
        </div>

        {/* Texto */}
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#fff", margin: "0 0 0.5rem" }}>
          Página no encontrada
        </h1>
        <p style={{ fontSize: "0.875rem", color: "#71717a", margin: "0 0 2rem" }}>
          La página que buscás no existe o fue movida.
        </p>

        {/* Botón */}
        <Link
          href="/dashboard"
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "10px 24px", background: "#DC2626", border: "none",
            borderRadius: 10, color: "#fff", fontSize: "0.875rem",
            fontWeight: 600, textDecoration: "none",
          }}
        >
          <Home style={{ width: 15, height: 15 }} />
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}