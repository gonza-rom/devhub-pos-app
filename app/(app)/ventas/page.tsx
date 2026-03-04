// app/(app)/ventas/page.tsx
// Pasa nombre, teléfono y dirección del tenant al POSClient para el ticket

import { Metadata }       from "next";
import { headers }        from "next/headers";
import { unstable_cache } from "next/cache";
import { prisma }         from "@/lib/prisma";
import POSClient          from "./POSClient";

export const metadata: Metadata = { title: "Ventas (POS)" };

const getVentasData = unstable_cache(
  async (tenantId: string) => {
    const [tenant, productos, categorias] = await Promise.all([
      prisma.tenant.findUnique({
        where:  { id: tenantId },
        select: { nombre: true, telefono: true, direccion: true },
      }),
      prisma.producto.findMany({
        where:   { tenantId, activo: true, stock: { gt: 0 } },
        select: {
          id: true, nombre: true, descripcion: true, codigoProducto: true,
          codigoBarras: true, precio: true, costo: true, stock: true,
          stockMinimo: true, unidad: true, imagen: true, imagenes: true,
          activo: true, categoriaId: true, proveedorId: true,
          createdAt: true, updatedAt: true, tenantId: true,
          categoria: { select: { id: true, nombre: true } },
        },
        orderBy: { nombre: "asc" },
      }),
      prisma.categoria.findMany({
        where:   { tenantId },
        select:  { id: true, nombre: true },
        orderBy: { nombre: "asc" },
      }),
    ]);
    return { tenant, productos, categorias };
  },
  ["ventas-pos-data"],
  { revalidate: 30, tags: ["productos", "categorias", "tenant-config"] }
);

export default async function VentasPage() {
  const headersList = await headers();
  const tenantId    = headersList.get("x-tenant-id")!;

  const { tenant, productos, categorias } = await getVentasData(tenantId);

  return (
    <POSClient
      productos={productos as any}
      categorias={categorias}
      nombreTenant={tenant?.nombre ?? "Mi comercio"}
      telefonoTenant={tenant?.telefono ?? null}
      direccionTenant={tenant?.direccion ?? null}
    />
  );
}