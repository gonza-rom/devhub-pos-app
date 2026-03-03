// app/(app)/configuracion/usuarios/layout.tsx
// Server Component — no necesita "use client"

import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function UsuariosLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const rol = headersList.get("x-user-rol");

  if (rol !== "PROPIETARIO") {
    redirect("/configuracion");
  }

  return <>{children}</>;
}