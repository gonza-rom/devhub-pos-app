// app/(app)/productos/[id]/editar/page.tsx
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import ProductoForm from "@/components/productos/ProductoForm";

export const metadata: Metadata = { title: "Editar producto" };

export default async function EditarProductoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const headersList = await headers();
  const tenantId = headersList.get("x-tenant-id")!;

  const producto = await prisma.producto.findFirst({
    where: { id, tenantId }, // tenantId garantiza que no accedas a productos de otro comercio
  });

  if (!producto) notFound();

  return <ProductoForm producto={producto} />;
}