// app/(public)/catalogo/[slug]/not-found.tsx

import Link from "next/link";
import { Store } from "lucide-react";

export default function CatalogoNotFound() {
  return (
    <div style={{ minHeight: "100vh", background: "#fafafa", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ textAlign: "center", maxWidth: 400 }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
          <Store style={{ width: 28, height: 28, color: "#d1d5db" }} />
        </div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#111827", margin: "0 0 0.5rem" }}>
          Negocio no encontrado
        </h1>
        <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: "0 0 2rem", lineHeight: 1.6 }}>
          Este catálogo no existe o fue desactivado.
        </p>
      </div>
    </div>
  );
}