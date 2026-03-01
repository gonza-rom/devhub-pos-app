// app/(app)/ventas/page.tsx
import { Metadata } from "next";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import POSClient from "./POSClient";

export const metadata: Metadata = { title: "Ventas — POS" };

export default async function VentasPage() {
  const headersList = await headers();
  const tenantId = headersList.get("x-tenant-id")!;

  const [productos, categorias] = await Promise.all([
    prisma.producto.findMany({
      where: { tenantId, activo: true, stock: { gt: 0 } },
      include: { categoria: { select: { id: true, nombre: true } } },
      orderBy: { nombre: "asc" },
    }),
    prisma.categoria.findMany({
      where: { tenantId },
      orderBy: { nombre: "asc" },
    }),
  ]);

  return <POSClient productos={productos} categorias={categorias} />;
}