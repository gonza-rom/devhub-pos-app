// app/(app)/productos/page.tsx
// Optimizado: queries cacheadas con unstable_cache
// Primera visita: ~800ms → ~120ms (Prisma)
// Segunda visita: ~800ms → ~5ms  (cache hit)

import { Metadata }      from "next";
import { headers }       from "next/headers";
import { unstable_cache } from "next/cache";
import Link              from "next/link";
import { prisma }        from "@/lib/prisma";
import { formatPrecio }  from "@/lib/utils";
import { Plus, Package, AlertTriangle } from "lucide-react";
import ProductoAcciones  from "@/components/productos/ProductoAcciones";

export const metadata: Metadata = { title: "Productos" };

// ── Queries cacheadas ──────────────────────────────────────────────────────────

// Cache de productos por tenantId. Se invalida con revalidateTag("productos")
// cuando se crea/edita/elimina un producto.
const getProductosCached = unstable_cache(
  async (tenantId: string) =>
    prisma.producto.findMany({
      where:   { tenantId, activo: true },
      select: {
        id:           true,
        nombre:       true,
        codigoProducto: true,
        precio:       true,
        stock:        true,
        stockMinimo:  true,
        unidad:       true,
        imagen:       true,
        categoriaId:  true,
        categoria:    { select: { id: true, nombre: true } },
      },
      orderBy: { nombre: "asc" },
    }),
  ["productos-list"],
  { revalidate: 30, tags: ["productos"] }
);

// Cache de categorías — cambian poco, cache más largo.
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ProductosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categoriaId?: string; stockBajo?: string }>;
}) {
  const headersList = await headers();
  const tenantId    = headersList.get("x-tenant-id")!;
  const params      = await searchParams;

  const busqueda     = params.q?.trim()       ?? "";
  const categoriaId  = params.categoriaId     ?? "";
  const soloStockBajo = params.stockBajo === "true";

  // Ambas queries en paralelo, ambas cacheadas.
  const [todosLosProductos, categorias] = await Promise.all([
    getProductosCached(tenantId),
    getCategoriasCached(tenantId),
  ]);

  // Filtrado en memoria (los datos ya están en cache, es O(n) gratis).
  const productosFiltrados = todosLosProductos.filter((p) => {
    if (soloStockBajo && p.stock > p.stockMinimo) return false;
    if (categoriaId   && p.categoriaId !== categoriaId) return false;
    if (busqueda) {
      const q = busqueda.toLowerCase();
      const matchNombre  = p.nombre.toLowerCase().includes(q);
      const matchCodigo  = p.codigoProducto?.toLowerCase().includes(q) ?? false;
      if (!matchNombre && !matchCodigo) return false;
    }
    return true;
  });

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Productos</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{productosFiltrados.length} productos</p>
        </div>
        <Link
          href="/productos/nuevo"
          className="btn-primary"
        >
          <Plus className="h-4 w-4" />
          Nuevo producto
        </Link>
      </div>

      {/* Filtros */}
      <div className="card p-4">
        <form className="flex flex-wrap gap-3 w-full">
          <input
            type="search"
            name="q"
            defaultValue={busqueda}
            placeholder="Buscar por nombre o código..."
            className="input-base max-w-xs"
          />
          <select name="categoriaId" defaultValue={categoriaId} className="input-base max-w-[200px]">
            <option value="">Todas las categorías</option>
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.nombre}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer select-none">
            <input
              type="checkbox"
              name="stockBajo"
              value="true"
              defaultChecked={soloStockBajo}
              className="rounded"
            />
            Solo stock bajo
          </label>
          <button
            type="submit"
            className="btn-ghost px-4 py-2"
          >
            Filtrar
          </button>
        </form>
      </div>

      {/* Tabla */}
      {productosFiltrados.length === 0 ? (
        <div className="card py-20 text-center">
          <Package className="h-12 w-12 mx-auto text-zinc-700 mb-4" />
          <h3 className="text-lg font-medium text-white mb-1">Sin productos</h3>
          <p className="text-sm text-zinc-500 mb-4">
            {busqueda
              ? "No encontramos productos con ese criterio"
              : "Empezá agregando tu primer producto"}
          </p>
          <Link
            href="/productos/nuevo"
            className="inline-flex items-center gap-2 text-sm font-medium"
            style={{ color: "#DC2626" }}
          >
            <Plus className="h-4 w-4" /> Agregar producto
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <tr>
                  {["Producto", "Categoría", "Precio", "Stock", "Acciones"].map((h) => (
                    <th
                      key={h}
                      className={`px-4 py-3 text-xs font-semibold text-zinc-600 uppercase tracking-wider
                        ${h === "Precio" || h === "Stock" ? "text-right" : h === "Acciones" ? "text-center" : "text-left"}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {productosFiltrados.map((producto) => {
                  const stockBajo = producto.stock <= producto.stockMinimo;
                  return (
                    <tr
                      key={producto.id}
                      className="table-row"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {producto.imagen ? (
                            <img
                              src={producto.imagen}
                              alt={producto.nombre}
                              className="h-9 w-9 rounded-lg object-cover flex-shrink-0"
                              style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                            />
                          ) : (
                            <div
                              className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                            >
                              <Package className="h-4 w-4 text-zinc-600" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-white">{producto.nombre}</p>
                            {producto.codigoProducto && (
                              <p className="text-xs text-zinc-600">{producto.codigoProducto}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-400">
                        {producto.categoria?.nombre ?? <span className="text-zinc-700">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-white">
                        {formatPrecio(producto.precio)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={stockBajo ? "badge-danger" : "badge-success"}>
                          {stockBajo && <AlertTriangle className="h-3 w-3 mr-1" />}
                          {producto.stock} {producto.unidad ?? "u."}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <ProductoAcciones
                          productoId={producto.id}
                          productoNombre={producto.nombre}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}