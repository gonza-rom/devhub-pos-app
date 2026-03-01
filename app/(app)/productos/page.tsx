// app/(app)/productos/page.tsx
import { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPrecio } from "@/lib/utils";
import { Plus, Package, AlertTriangle } from "lucide-react";
import ProductoAcciones from "@/components/productos/ProductoAcciones";

export const metadata: Metadata = { title: "Productos" };

export default async function ProductosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categoriaId?: string; stockBajo?: string }>;
}) {
  const headersList = await headers();
  const tenantId = headersList.get("x-tenant-id")!;
  const params = await searchParams;

  const busqueda = params.q ?? "";
  const categoriaId = params.categoriaId;
  const soloStockBajo = params.stockBajo === "true";

  const [productos, categorias] = await Promise.all([
    prisma.producto.findMany({
      where: {
        tenantId,
        activo: true,
        ...(categoriaId && { categoriaId }),
        ...(busqueda && {
          OR: [
            { nombre:         { contains: busqueda, mode: "insensitive" } },
            { codigoProducto: { contains: busqueda, mode: "insensitive" } },
          ],
        }),
      },
      include: { categoria: { select: { id: true, nombre: true } } },
      orderBy: { nombre: "asc" },
    }),
    prisma.categoria.findMany({
      where: { tenantId },
      orderBy: { nombre: "asc" },
    }),
  ]);

  const productosFiltrados = soloStockBajo
    ? productos.filter((p) => p.stock <= p.stockMinimo)
    : productos;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Productos</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{productosFiltrados.length} productos</p>
        </div>
        <Link
          href="/productos/nuevo"
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
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
          <select name="categoriaId" defaultValue={categoriaId ?? ""} className="input-base max-w-[200px]">
            <option value="">Todas las categorías</option>
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.nombre}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              name="stockBajo"
              value="true"
              defaultChecked={soloStockBajo}
              className="rounded border-gray-300 text-primary-600"
            />
            Solo stock bajo
          </label>
          <button
            type="submit"
            className="rounded-lg bg-gray-100 dark:bg-gray-700 px-4 py-2 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Filtrar
          </button>
        </form>
      </div>

      {/* Tabla */}
      {productosFiltrados.length === 0 ? (
        <div className="card py-20 text-center">
          <Package className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">Sin productos</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {busqueda ? "No encontramos productos con ese criterio" : "Empezá agregando tu primer producto"}
          </p>
          <Link href="/productos/nuevo" className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium">
            <Plus className="h-4 w-4" /> Agregar producto
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Producto</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Categoría</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Precio</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Stock</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {productosFiltrados.map((producto) => {
                  const stockBajo = producto.stock <= producto.stockMinimo;
                  return (
                    <tr key={producto.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {producto.imagen ? (
                            <img
                              src={producto.imagen}
                              alt={producto.nombre}
                              className="h-9 w-9 rounded-lg object-cover border border-gray-200 dark:border-gray-700"
                            />
                          ) : (
                            <div className="h-9 w-9 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                              <Package className="h-4 w-4 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">{producto.nombre}</p>
                            {producto.codigoProducto && (
                              <p className="text-xs text-gray-400">{producto.codigoProducto}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {producto.categoria?.nombre ?? <span className="text-gray-300 dark:text-gray-600">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-gray-100">
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