// app/(public)/catalogo/[slug]/page.tsx
// Server Component — consulta Prisma directamente, sin fetch interno

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import CatalogoClient from "./CatalogoClient";

type Props = { params: Promise<{ slug: string }> };

async function getCatalogo(slug: string) {
  const tenant = await prisma.tenant.findUnique({
    where:  { slug },
    select: {
      id:          true,
      nombre:      true,
      logoUrl:     true,
      telefono:    true,
      direccion:   true,
      ciudad:      true,
      descripcion: true,
      instagram:   true,
      facebook:    true,
    },
  });

  if (!tenant) return null;

  const productos = await prisma.producto.findMany({
    where: {
      tenantId:        tenant.id,
      activo:          true,
      visibleCatalogo: true,
    },
    select: {
      id:          true,
      nombre:      true,
      descripcion: true,
      precio:      true,
      imagen:      true,
      imagenes:    true,
      categoria:   { select: { id: true, nombre: true } },
    },
    orderBy: { nombre: "asc" },
  });

  const categorias = [...new Map(
    productos
      .filter(p => p.categoria)
      .map(p => [p.categoria!.id, p.categoria!])
  ).values()];

  return { tenant, productos, categorias };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug }  = await params;
  const catalogo  = await getCatalogo(slug);
  if (!catalogo) return { title: "Catálogo no encontrado" };
  return {
    title:       `${catalogo.tenant.nombre} — Catálogo`,
    description: catalogo.tenant.descripcion ?? `Catálogo de productos de ${catalogo.tenant.nombre}`,
    openGraph: {
      title:  catalogo.tenant.nombre,
      images: catalogo.tenant.logoUrl ? [catalogo.tenant.logoUrl] : [],
    },
  };
}

export default async function CatalogoPage({ params }: Props) {
  const { slug } = await params;
  const catalogo = await getCatalogo(slug);
  if (!catalogo) notFound();

  return (
    <CatalogoClient
      tenant={catalogo.tenant}
      productos={catalogo.productos}
      categorias={catalogo.categorias}
    />
  );
}