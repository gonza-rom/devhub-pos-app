// app/(app)/ventas/page.tsx
// OPTIMIZADO: Select mínimo para el POS — solo lo necesario

import { Metadata }       from "next";
import { headers }        from "next/headers";
import { unstable_cache } from "next/cache";
import { prisma }         from "@/lib/prisma";
import POSClient          from "./POSClient";
import Link               from "next/link";

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
        // ✅ SOLO lo necesario para el POS
        select: {
          id: true,
          nombre: true,
          precio: true,
          stock: true,
          stockMinimo: true,
          imagen: true,           // Solo imagen principal
          codigoProducto: true,   // Para búsqueda
          codigoBarras: true,     // Para búsqueda
          categoriaId: true,
          categoria: { select: { id: true, nombre: true } },
        },
        orderBy: { nombre: "asc" },
        take: 200, // ✅ Límite: los 200 primeros productos (ordenados alfabéticamente)
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
    <div className="space-y-4">
      {/* Breadcrumb opcional */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/ventas" className="font-semibold text-red-400">
          Punto de venta
        </Link>
        <span style={{ color: "var(--text-faint)" }}>·</span>
        <Link href="/historial-ventas" className="text-zinc-500 hover:text-zinc-300">
          Ver historial
        </Link>
      </div>
    <POSClient
      productos={productos as any}
      categorias={categorias}
      nombreTenant={tenant?.nombre ?? "Mi comercio"}
      telefonoTenant={tenant?.telefono ?? null}
      direccionTenant={tenant?.direccion ?? null}
    />
  </div>
  );
}