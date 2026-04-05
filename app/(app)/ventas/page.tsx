// app/(app)/ventas/page.tsx
// Server Component - Carga solo 30 productos iniciales
// El resto se carga con scroll infinito desde el cliente

import { getTenantContext } from "@/lib/tenant";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import POSClient from "./POSClient";

const SELECT_PRODUCTO_POS = {
  id: true,
  nombre: true,
  precio: true,
  stock: true,
  stockMinimo: true,
  imagen: true,
  codigoBarras: true,
  codigoProducto: true,
  categoriaId: true,
  tieneVariantes: true,
  categoria: {
    select: { id: true, nombre: true },
  },
};

const getVentasData = cache(async (tenantId: string) => {
  return unstable_cache(
    async () => {
      const [tenant, productos, categorias] = await Promise.all([
        prisma.tenant.findUnique({
          where: { id: tenantId },
          select: {
            id: true,
            nombre: true,
            telefono: true,
            direccion: true,
          },
        }),

        // ✅ Solo 30 productos iniciales (los más recientes o más vendidos)
        prisma.producto.findMany({
          where: {
              tenantId,
              activo: true,
              OR: [
                { stock: { gt: 0 } },
                { tieneVariantes: true },  // ← incluir aunque stock sea 0
              ],
            },
          select: SELECT_PRODUCTO_POS,
          orderBy: { createdAt: "desc" }, // Los más recientes primero
          take: 30, // Solo 30 iniciales
        }),

        prisma.categoria.findMany({
          where: { tenantId },
          select: { id: true, nombre: true },
          orderBy: { nombre: "asc" },
        }),
      ]);

      return { tenant, productos, categorias };
    },
    [`ventas-pos-${tenantId}`],
    {
      revalidate: 30,
      tags: [`tenant-${tenantId}`, "productos", "categorias"],
    }
  )();
});

export default async function VentasPage() {
  const { tenantId } = await getTenantContext();
  const { tenant, productos, categorias } = await getVentasData(tenantId);

  if (!tenant) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-red-400">Tenant no encontrado</p>
      </div>
    );
  }

  return (
    <POSClient
      productosIniciales={productos}
      categorias={categorias}
      nombreTenant={tenant.nombre}
      telefonoTenant={tenant.telefono}
      direccionTenant={tenant.direccion}
    />
  );
}

export const dynamic = "force-dynamic";