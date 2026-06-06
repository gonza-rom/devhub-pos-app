"use client";
// components/ventas/POSCatalogo.tsx

import { useCallback, useRef, useEffect } from "react";
import InfiniteLoader from "react-window-infinite-loader";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Grid = require("react-window").FixedSizeGrid;
import { Search, X, Plus, Package, Tag, Loader2, ScanLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPrecio } from "@/lib/utils";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type ProductoConCategoria = {
  id: string;
  nombre: string;
  precio: number;
  stock: number;
  stockMinimo: number;
  imagen: string | null;
  codigoBarras: string | null;
  codigoProducto: string | null;
  categoriaId: string | null;
  categoria: { id: string; nombre: string } | null;
  tieneVariantes?: boolean;
  unidad: string | null;
};

export type CategoriaSimple = { id: string; nombre: string; hijas?: CategoriaSimple[] };

const MIN_CARD_WIDTH = 160;
export const CARD_HEIGHT = 200;
export const GAP = 6;

type Props = {
  // Datos
  productos: ProductoConCategoria[];
  categorias: CategoriaSimple[];
  carrito: { productoId: string; cantidad: number }[];
  busqueda: string;
  categoriaActiva: string | null;
  // Estados de carga
  buscandoRemoto: boolean;
  cargandoMas: boolean;
  hayMas: boolean;
  // Grid
  gridWidth: number;
  gridHeight: number;
  gridContainerRef: React.RefObject<HTMLDivElement | null>;
  gridRef: React.RefObject<unknown>;
  // Handlers
  onBusqueda: (valor: string) => void;
  onCategoriaChange: (catId: string | null) => void;
  onAgregarProducto: (producto: ProductoConCategoria) => void;
  onEditarProducto: (producto: ProductoConCategoria) => void;
  onCargarMas: () => Promise<void>;
  onAbrirScanner: () => void;
  onAbrirCrearProducto: () => void;
};

export default function POSCatalogo({
  productos,
  categorias,
  carrito,
  busqueda,
  categoriaActiva,
  buscandoRemoto,
  cargandoMas,
  hayMas,
  gridWidth,
  gridHeight,
  gridContainerRef,
  gridRef,
  onBusqueda,
  onCategoriaChange,
  onAgregarProducto,
  onEditarProducto,
  onCargarMas,
  onAbrirScanner,
  onAbrirCrearProducto,
}: Props) {

  const columnCount   = Math.max(2, Math.min(8, Math.floor(gridWidth / (MIN_CARD_WIDTH + GAP))));
  const totalGapWidth = GAP * (columnCount + 1);
  const cardWidth     = Math.floor((gridWidth - totalGapWidth) / columnCount);
  const itemCount     = hayMas ? productos.length + 30 : productos.length;
  const rowCount      = Math.ceil(itemCount / columnCount);

  const Cell = useCallback(
    ({ columnIndex, rowIndex, style }: { columnIndex: number; rowIndex: number; style: React.CSSProperties }) => {
      const index = rowIndex * columnCount + columnIndex;
      if (index >= productos.length) return <div style={style} />;

      const producto  = productos[index];
      const enCarrito = carrito.find((i) => i.productoId === producto.id);
      const stockBajo = producto.stock <= producto.stockMinimo;

      return (
        <div style={{ ...style, padding: GAP / 2, boxSizing: "border-box" }}>
          <button
            onClick={() => onAgregarProducto(producto)}
            className="relative flex flex-col rounded-lg p-2 text-left transition-all active:scale-95 w-full h-full overflow-hidden"
            style={{
              background: enCarrito ? "rgba(220,38,38,0.12)" : "var(--bg-card)",
              border:     enCarrito ? "1px solid rgba(220,38,38,0.4)" : "1px solid var(--border-base)",
            }}
            onMouseEnter={(e) => { if (!enCarrito) (e.currentTarget as HTMLElement).style.borderColor = "var(--border-strong)"; }}
            onMouseLeave={(e) => { if (!enCarrito) (e.currentTarget as HTMLElement).style.borderColor = "var(--border-base)"; }}
          >
            {/* Imagen */}
            <div className="mb-2 flex items-center justify-center rounded-lg overflow-hidden w-full flex-shrink-0"
              style={{ background: "var(--bg-hover-md)", height: "72px" }}>
              {producto.imagen ? (
                <img
                  src={producto.imagen.replace("/upload/", "/upload/f_auto,q_auto,w_200/")}
                  alt={producto.nombre}
                  loading="lazy"
                  className="h-full w-full object-cover rounded-lg"
                />
              ) : (
                <Package className="h-6 w-6" style={{ color: "var(--text-muted)" }} />
              )}
            </div>

            <p className="text-base font-semibold line-clamp-2 leading-tight mb-1" style={{ color: "var(--text-primary)" }}>
              {producto.nombre}
            </p>
            <p className="text-base font-bold text-red-400 mt-1">{formatPrecio(producto.precio)}</p>

            {producto.tieneVariantes && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full mt-1 inline-block"
                style={{ background: "rgba(168,85,247,0.15)", color: "#c084fc", border: "1px solid rgba(168,85,247,0.3)" }}>
                Talles/Colores
              </span>
            )}

            <div className="flex items-center justify-between mt-0.5 gap-1">
              <span className="text-xs font-mono truncate" style={{ color: "var(--text-primary)" }}>
                {producto.codigoProducto || ""}
              </span>
              <div className="flex items-center gap-1 flex-shrink-0">
                {producto.stock > 0 && (
                  <span className="text-xs" style={{ color: "var(--text-primary)" }}>
                    Stock: {producto.stock}
                  </span>
                )}
                <span
                  onClick={(e) => { e.stopPropagation(); onEditarProducto(producto); }}
                  className="flex h-4 w-6 items-center justify-center rounded flex-shrink-0 cursor-pointer"
                  style={{ background: "var(--bg-hover-md)", color: "var(--text-muted)" }}
                >
                  <svg className="h-5.5 w-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.5-6.5a2 2 0 012.828 2.828L11.828 15.828A2 2 0 0111 16H9v-2a2 2 0 01.172-.768z" />
                  </svg>
                </span>
              </div>
            </div>

            {/* Badges */}
            {producto.stock <= 0 ? (
              <span className="absolute top-2 right-2 text-xs font-medium px-1.5 py-0.5 rounded-full"
                style={{ background: "rgba(220,38,38,0.15)", color: "#f87171", border: "1px solid rgba(220,38,38,0.3)" }}>
                Sin stock
              </span>
            ) : stockBajo ? (
              <span className="absolute top-2 right-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.3)" }}>
                {producto.stock}
              </span>
            ) : null}

            {enCarrito && (
              <span className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-white"
                style={{ background: "#DC2626", boxShadow: "0 0 0 2px var(--bg-card)" }}>
                {enCarrito.cantidad}
              </span>
            )}
          </button>
        </div>
      );
    },
    [columnCount, cardWidth, productos, carrito, onAgregarProducto, onEditarProducto],
  );

  return (
    <div className="flex flex-col h-full min-w-0 overflow-hidden" style={{ background: "var(--bg-base)" }}>

      {/* Buscador */}
      <div className="p-2 md:p-3 border-b flex-shrink-0"
        style={{ background: "var(--bg-surface)", borderColor: "var(--border-base)" }}>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--text-primary)" }} />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => onBusqueda(e.target.value)}
              placeholder="Buscar producto o código..."
              className="input-base pl-9 pr-9 w-full"
              autoFocus
            />
            {busqueda && (
              <button onClick={() => onBusqueda("")} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-primary)" }}>
                <X className="h-4 w-4" />
              </button>
            )}
            {buscandoRemoto && (
              <div className="absolute right-10 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--text-muted)" }} />
              </div>
            )}
          </div>

          <button
            onClick={onAbrirCrearProducto}
            className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{ background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.3)", color: "#f87171" }}
            title="Crear producto rápido"
          >
            <Plus className="h-3.5 w-3.5" />
            Nuevo
          </button>

          <button
            onClick={onAbrirScanner}
            className="flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
            style={{ background: "var(--bg-hover-md)", border: "1px solid var(--border-md)", color: "var(--text-secondary)" }}
            title="Escanear código de barras"
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(220,38,38,0.4)"; (e.currentTarget as HTMLElement).style.color = "#DC2626"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-md)"; (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
          >
            <ScanLine className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Categorías */}
      {categorias.length > 0 && (
        <div className="flex gap-2 px-2 md:px-3 py-2 overflow-x-auto border-b flex-shrink-0 scrollbar-hide"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border-base)" }}>
          <button
            onClick={() => onCategoriaChange(null)}
            className={cn("flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors", !categoriaActiva ? "bg-red-600 text-white" : "")}
            style={!categoriaActiva ? {} : { background: "var(--bg-hover-md)", border: "1px solid var(--border-md)", color: "var(--text-secondary)" }}
          >
            Todos
          </button>
          {categorias.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onCategoriaChange(categoriaActiva === cat.id ? null : cat.id)}
              className={cn("flex-shrink-0 flex items-center gap-1.5 px-2 py-1.5 rounded-full text-xs font-medium transition-colors", categoriaActiva === cat.id ? "bg-red-600 text-white" : "")}
              style={categoriaActiva === cat.id ? {} : { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-secondary)" }}
            >
              <Tag className="h-3 w-3" />
              {cat.nombre}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      <div className="flex-1 relative" style={{ minHeight: 0 }} ref={gridContainerRef}>
        {buscandoRemoto && productos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <Loader2 className="h-12 w-12 animate-spin mb-3" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>Buscando productos...</p>
          </div>
        ) : productos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <Package className="h-12 w-12 mb-3" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>Sin productos</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-faint)" }}>
              {busqueda ? "Probá con otro término" : "No hay productos disponibles"}
            </p>
          </div>
        ) : (
          <InfiniteLoader
            isItemLoaded={(index) => !hayMas || index < productos.length}
            itemCount={itemCount}
            loadMoreItems={onCargarMas}
            threshold={15}
          >
            {({ onItemsRendered }) => (
              <Grid
                ref={gridRef}
                columnCount={columnCount}
                columnWidth={cardWidth + GAP}
                height={gridHeight}
                rowCount={rowCount}
                rowHeight={CARD_HEIGHT}
                width={gridWidth}
                onItemsRendered={(gridProps: { visibleRowStartIndex: number; visibleRowStopIndex: number }) => {
                  (onItemsRendered as (args: { visibleStartIndex: number; visibleStopIndex: number }) => void)({
                    visibleStartIndex: gridProps.visibleRowStartIndex * columnCount,
                    visibleStopIndex:  gridProps.visibleRowStopIndex  * columnCount + columnCount - 1,
                  });
                }}
                style={{ overflowX: "hidden", overflowY: "auto" }}
              >
                {Cell}
              </Grid>
            )}
          </InfiniteLoader>
        )}

        {cargandoMas && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full z-10"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-md)", boxShadow: "0 4px 24px rgba(0,0,0,0.12)", color: "var(--text-secondary)" }}>
            <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: "#DC2626" }} />
            <span className="text-xs font-medium">Cargando productos...</span>
          </div>
        )}
      </div>
    </div>
  );
}