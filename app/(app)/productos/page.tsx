// app/(app)/productos/page.tsx

import { Metadata }       from "next";
import { headers }        from "next/headers";
import { unstable_cache } from "next/cache";
import Link               from "next/link";
import { prisma }         from "@/lib/prisma";
import { formatPrecio }   from "@/lib/utils";
import { Plus, Package, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import ProductoAcciones  from "@/components/productos/ProductoAcciones";
import ExportarImportar  from "@/components/productos/ExportarImportar";

export const metadata: Metadata = { title: "Productos" };

const PAGE_SIZE = 20;

const getProductosCached = unstable_cache(
  async (tenantId: string, page: number, busqueda: string, categoriaId: string, soloStockBajo: boolean) => {
    const where: any = { tenantId, activo: true };

    if (soloStockBajo) where.stock = { lte: 5 };
    if (categoriaId)   where.categoriaId = categoriaId;
    if (busqueda.trim()) {
      where.OR = [
        { nombre:         { contains: busqueda, mode: "insensitive" } },
        { codigoProducto: { contains: busqueda, mode: "insensitive" } },
      ];
    }

    const [productos, total] = await Promise.all([
      prisma.producto.findMany({
        where,
        select: {
          id: true, nombre: true, codigoProducto: true,
          precio: true, stock: true, stockMinimo: true,
          unidad: true, imagen: true, categoriaId: true,
          categoria: { select: { id: true, nombre: true } },
        },
        orderBy: { nombre: "asc" },
        skip:    (page - 1) * PAGE_SIZE,
        take:    PAGE_SIZE,
      }),
      prisma.producto.count({ where }),
    ]);

    return { productos, total, totalPages: Math.ceil(total / PAGE_SIZE) };
  },
  ["productos-list"],
  { revalidate: 30, tags: ["productos"] }
);

const getCategoriasCached = unstable_cache(
  async (tenantId: string) =>
    prisma.categoria.findMany({
      where:   { tenantId },
      select:  { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
  ["categorias-list"],
  { revalidate: 120, tags: ["categorias"] }
);

export default async function ProductosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categoriaId?: string; stockBajo?: string; page?: string }>;
}) {
  const headersList   = await headers();
  const tenantId      = headersList.get("x-tenant-id")!;
  const params        = await searchParams;

  const busqueda      = params.q?.trim()      ?? "";
  const categoriaId   = params.categoriaId    ?? "";
  const soloStockBajo = params.stockBajo === "true";
  const page          = Math.max(1, parseInt(params.page ?? "1"));

  const [{ productos, total, totalPages }, categorias] = await Promise.all([
    getProductosCached(tenantId, page, busqueda, categoriaId, soloStockBajo),
    getCategoriasCached(tenantId),
  ]);

  // Construir query string para los links de paginación manteniendo filtros
  const buildQuery = (newPage: number) => {
    const q = new URLSearchParams();
    if (busqueda)      q.set("q", busqueda);
    if (categoriaId)   q.set("categoriaId", categoriaId);
    if (soloStockBajo) q.set("stockBajo", "true");
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
          <Link href="/productos/nuevo" className="btn-primary">
            <Plus className="h-4 w-4" />
            Nuevo producto
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="card p-4">
        <form className="flex flex-wrap gap-3 w-full">
          <input type="search" name="q" defaultValue={busqueda}
            placeholder="Buscar por nombre o código..." className="input-base max-w-xs" />
          <select name="categoriaId" defaultValue={categoriaId} className="input-base max-w-[200px]">
            <option value="">Todas las categorías</option>
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.nombre}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none"
            style={{ color: "var(--text-secondary)" }}>
            <input type="checkbox" name="stockBajo" value="true"
              defaultChecked={soloStockBajo} className="rounded" />
            Solo stock bajo
          </label>
          {/* Reset page al filtrar */}
          <input type="hidden" name="page" value="1" />
          <button type="submit" className="btn-ghost px-4 py-2">Filtrar</button>
          {(busqueda || categoriaId || soloStockBajo) && (
            <Link href="/productos" className="btn-ghost px-4 py-2 text-sm"
              style={{ color: "var(--text-secondary)" }}>
              Limpiar
            </Link>
          )}
        </form>
      </div>

      {/* Tabla */}
      {productos.length === 0 ? (
        <div className="card py-20 text-center">
          <Package className="h-12 w-12 mx-auto mb-4" style={{ color: "var(--text-faint)" }} />
          <h3 className="text-lg font-medium mb-1" style={{ color: "var(--text-primary)" }}>Sin productos</h3>
          <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
            {busqueda ? "No encontramos productos con ese criterio" : "Empezá agregando tu primer producto"}
          </p>
          <Link href="/productos/nuevo" className="inline-flex items-center gap-2 text-sm font-medium"
            style={{ color: "#DC2626" }}>
            <Plus className="h-4 w-4" /> Agregar producto
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ borderBottom: "1px solid var(--border-base)" }}>
                <tr>
                  {["Producto", "Categoría", "Precio", "Stock", "Acciones"].map((h) => (
                    <th key={h}
                      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider
                        ${h === "Precio" || h === "Stock" ? "text-right" : h === "Acciones" ? "text-center" : "text-left"}`}
                      style={{ color: "var(--text-secondary)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {productos.map((producto) => {
                  const stockBajo = producto.stock <= producto.stockMinimo;
                  return (
                    <tr key={producto.id} className="table-row">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {producto.imagen ? (
                            <img src={producto.imagen} alt={producto.nombre}
                              className="h-9 w-9 rounded-lg object-cover flex-shrink-0"
                              style={{ border: "1px solid var(--border-base)" }} />
                          ) : (
                            <div className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ background: "var(--bg-hover)", border: "1px solid var(--border-base)" }}>
                              <Package className="h-4 w-4" style={{ color: "var(--text-secondary)" }} />
                            </div>
                          )}
                          <div>
                            <p className="font-medium" style={{ color: "var(--text-primary)" }}>{producto.nombre}</p>
                            {producto.codigoProducto && (
                              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{producto.codigoProducto}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>
                        {producto.categoria?.nombre ?? <span style={{ color: "var(--text-faint)" }}>—</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold" style={{ color: "var(--text-primary)" }}>
                        {formatPrecio(producto.precio)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={stockBajo ? "badge-danger" : "badge-success"}>
                          {stockBajo && <AlertTriangle className="h-3 w-3 mr-1" />}
                          {producto.stock} {producto.unidad ?? "u."}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <ProductoAcciones productoId={producto.id} productoNombre={producto.nombre} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3"
              style={{ borderTop: "1px solid var(--border-base)" }}>
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

                {/* Páginas */}
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
                          color: p === page ? "#ffffff" : "var(--text-secondary)",
                          border: p === page ? "none" : "1px solid var(--border-base)",
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
          )}
        </div>
      )}
    </div>
  );
}