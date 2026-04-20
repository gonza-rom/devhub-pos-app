// app/(app)/productos/page.tsx

import { Metadata }       from "next";
import { headers }        from "next/headers";
import { unstable_cache } from "next/cache";
import Link               from "next/link";
import { prisma }         from "@/lib/prisma";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import ProductosTabla, { NuevoProductoBtn } from "@/components/productos/ProductosTabla";
import ExportarImportar from "@/components/productos/ExportarImportar";

export const metadata: Metadata = { title: "Productos" };

const PAGE_SIZE = 20;

// ── Cached queries ─────────────────────────────────────────────────────────

const getProductosCached = unstable_cache(
  async (tenantId: string, page: number, busqueda: string, categoriaId: string, soloStockBajo: boolean, ordenar: string) => {
    const where: any = { tenantId, activo: true };
    if (soloStockBajo) where.stock = { lte: 5 };
    if (categoriaId === "sin-categoria") {
      where.categoriaId = { equals: null };
    } else if (categoriaId) {
      where.categoriaId = categoriaId;
    }
    if (busqueda.trim()) {
      where.OR = [
        { nombre:         { contains: busqueda, mode: "insensitive" } },
        { codigoProducto: { contains: busqueda, mode: "insensitive" } },
      ];
    }

    let orderBy: any = { nombre: "asc" };
    if (ordenar === "recientes")   orderBy = { createdAt: "desc" };
    if (ordenar === "precio-asc")  orderBy = { precio: "asc" };
    if (ordenar === "precio-desc") orderBy = { precio: "desc" };
    if (ordenar === "stock-asc")   orderBy = { stock: "asc" };

    const [productos, total] = await Promise.all([
      prisma.producto.findMany({
        where,
        select: {
          id: true, nombre: true, codigoProducto: true,
          precio: true,
          stock: true, stockMinimo: true, unidad: true,
          imagen: true, categoriaId: true,
          categoria: { select: { id: true, nombre: true } },
        },
        orderBy,
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.producto.count({ where }),
    ]);
    return { productos, total, totalPages: Math.ceil(total / PAGE_SIZE) };
  },
  ["productos-list"],
  { revalidate: 30, tags: ["productos"] }
);

function aplanarCategorias(
  cats: any[], nivel = 0
): { id: string; nombre: string }[] {
  return cats.flatMap(cat => [
    { id: cat.id, nombre: `${"  ".repeat(nivel)}${nivel > 0 ? "└ " : ""}${cat.nombre}` },
    ...aplanarCategorias(cat.hijas ?? [], nivel + 1),
  ]);
}

const getCategoriasCached = unstable_cache(
  async (tenantId: string) =>
    prisma.categoria.findMany({
      where:   { tenantId, padreId: null }, // solo raíces
      select:  {
        id: true, nombre: true,
        hijas: {
          select: { id: true, nombre: true,
            hijas: { select: { id: true, nombre: true,
              hijas: { select: { id: true, nombre: true } }
            }}
          },
          orderBy: { nombre: "asc" },
        },
      },
      orderBy: { nombre: "asc" },
    }),
  ["categorias-list"],
  { revalidate: 120, tags: ["categorias"] }
);

const getProveedoresCached = unstable_cache(
  async (tenantId: string) =>
    prisma.proveedor.findMany({
      where:   { tenantId },
      select:  { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
  ["proveedores-list"],
  { revalidate: 120, tags: ["proveedores"] }
);

// ── Componente ─────────────────────────────────────────────────────────────

export default async function ProductosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categoriaId?: string; stockBajo?: string; page?: string; ordenar?: string }>;
}) {
  const headersList = await headers();
  const tenantId    = headersList.get("x-tenant-id")!;
  const params      = await searchParams;

  const busqueda      = params.q?.trim()   ?? "";
  const categoriaId   = params.categoriaId ?? "";
  const soloStockBajo = params.stockBajo === "true";
  const page          = Math.max(1, parseInt(params.page ?? "1"));
  const ordenar       = params.ordenar ?? "nombre";

  // ── Obtener slug del tenant para el link al catálogo ──
  const tenant = await prisma.tenant.findUnique({
    where:  { id: tenantId },
    select: { slug: true },
  });

  const [{ productos, total, totalPages }, categorias, proveedores] = await Promise.all([
    getProductosCached(tenantId, page, busqueda, categoriaId, soloStockBajo, ordenar),
    getCategoriasCached(tenantId),
    getProveedoresCached(tenantId),
  ]);

  const buildQuery = (newPage: number) => {
    const q = new URLSearchParams();
    if (busqueda)             q.set("q", busqueda);
    if (categoriaId)          q.set("categoriaId", categoriaId);
    if (soloStockBajo)        q.set("stockBajo", "true");
    if (ordenar !== "nombre") q.set("ordenar", ordenar);
    q.set("page", String(newPage));
    return `?${q.toString()}`;
  };

  const desde = (page - 1) * PAGE_SIZE + 1;
  const hasta = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Productos</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {total} productos en total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportarImportar />
          {/* ── Botón Ver catálogo ── */}
          {tenant?.slug && (
            <a
              href={`/catalogo/${tenant.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors"
              style={{ border: "1px solid var(--border-base)", color: "var(--text-secondary)" }}
            >
              <ExternalLink className="h-4 w-4" />
              Ver catálogo
            </a>
          )}
          <NuevoProductoBtn categorias={categorias} proveedores={proveedores} />
        </div>
      </div>

      {/* Filtros */}
      <div className="card p-4">
        <form className="flex flex-wrap gap-3 w-full">
          <input
            type="search" name="q" defaultValue={busqueda}
            placeholder="Buscar por nombre o código..." className="input-base max-w-xs"
          />
          <select name="categoriaId" defaultValue={categoriaId} className="input-base max-w-[200px]">
            <option value="">Todas las categorías</option>
            <option value="sin-categoria">Sin categoría</option>
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.nombre}</option>
            ))}
          </select>
          <select name="ordenar" defaultValue={ordenar} className="input-base max-w-[180px]">
            <option value="nombre">Nombre A→Z</option>
            <option value="recientes">Más recientes</option>
            <option value="precio-asc">Precio menor</option>
            <option value="precio-desc">Precio mayor</option>
            <option value="stock-asc">Menor stock</option>
          </select>
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none"
            style={{ color: "var(--text-secondary)" }}>
            <input type="checkbox" name="stockBajo" value="true"
              defaultChecked={soloStockBajo} className="rounded" />
            Solo stock bajo
          </label>
          <input type="hidden" name="page" value="1" />
          <button type="submit" className="btn-ghost px-4 py-2">Filtrar</button>
          {(busqueda || categoriaId || soloStockBajo || ordenar !== "nombre") && (
            <Link href="/productos" className="btn-ghost px-4 py-2 text-sm"
              style={{ color: "var(--text-secondary)" }}>
              Limpiar
            </Link>
          )}
        </form>
      </div>

      {/* Tabla */}
      <ProductosTabla
        productos={productos}
        categorias={categorias}
        proveedores={proveedores}
        totalProductos={total}
        ordenar={ordenar}
        filtrosActivos={{ busqueda, categoriaId, soloStockBajo }}
      />

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="card">
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {desde}–{hasta} de {total} productos
            </p>
            <div className="flex items-center gap-1">
              {page > 1 ? (
                <Link href={buildQuery(page - 1)} className="btn-ghost px-2 py-1.5">
                  <ChevronLeft className="h-4 w-4" />
                </Link>
              ) : (
                <span className="btn-ghost px-2 py-1.5 opacity-30 cursor-not-allowed">
                  <ChevronLeft className="h-4 w-4" />
                </span>
              )}

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | "...")[]>((acc, p, i, arr) => {
                  if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === "..." ? (
                    <span key={`ellipsis-${i}`} className="px-2 py-1 text-sm"
                      style={{ color: "var(--text-faint)" }}>…</span>
                  ) : (
                    <Link key={p} href={buildQuery(p as number)}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                      style={{
                        background: p === page ? "#DC2626" : "transparent",
                        color:      p === page ? "#ffffff" : "var(--text-secondary)",
                        border:     p === page ? "none" : "1px solid var(--border-base)",
                      }}>
                      {p}
                    </Link>
                  )
                )
              }

              {page < totalPages ? (
                <Link href={buildQuery(page + 1)} className="btn-ghost px-2 py-1.5">
                  <ChevronRight className="h-4 w-4" />
                </Link>
              ) : (
                <span className="btn-ghost px-2 py-1.5 opacity-30 cursor-not-allowed">
                  <ChevronRight className="h-4 w-4" />
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}