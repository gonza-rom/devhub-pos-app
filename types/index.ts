// types/index.ts
// Tipos TypeScript centralizados del proyecto
// En TypeScript los "tipos" son como descripciones de qué forma tiene un objeto.
// Si Prisma te da un Producto, acá definís cómo se ve ese producto en el front.

import type { Producto, Categoria, Proveedor, Venta, VentaItem, Movimiento, Tenant, UsuarioTenant, PlanTipo, RolTenant, TipoMovimiento } from "@prisma/client";

// Re-exportamos los tipos de Prisma para usarlos en todo el proyecto
export type { Producto, Categoria, Proveedor, Venta, VentaItem, Movimiento, Tenant, UsuarioTenant, PlanTipo, RolTenant, TipoMovimiento };

// ── Tipos extendidos con relaciones ──────────────────────────

// Producto con su categoría y proveedor incluidos
export type ProductoConRelaciones = Producto & {
  categoria: Categoria | null;
  proveedor: Proveedor | null;
};

// Venta con sus items y cada item con su producto
export type VentaConItems = Venta & {
  items: (VentaItem & {
    producto: Pick<Producto, "id" | "nombre" | "imagen">;
  })[];
};

// Movimiento con su producto
export type MovimientoConProducto = Movimiento & {
  producto: Pick<Producto, "id" | "nombre">;
};

// ── Tipos para el carrito del POS ────────────────────────────

export type ItemCarrito = {
  productoId: string;
  nombre: string;
  precio: number;
  cantidad: number;
  subtotal: number;
  stock: number;      // stock disponible para validar
  imagen?: string | null;
};

// ── Tipos para las API Routes ────────────────────────────────

// Respuesta estándar de las APIs
export type ApiResponse<T = null> = {
  ok: boolean;
  data?: T;
  error?: string;
};

// Datos para crear un producto
export type CreateProductoInput = {
  nombre: string;
  descripcion?: string;
  codigoProducto?: string;
  codigoBarras?: string;
  precio: number;
  costo?: number;
  stock: number;
  stockMinimo?: number;
  unidad?: string;
  imagen?: string;
  imagenes?: string[];
  categoriaId?: string;
  proveedorId?: string;
};

// Datos para registrar una venta
export type CreateVentaInput = {
  items: {
    productoId: string;
    cantidad:   number;
    precioUnit: number;
    nombre?:    string;      // ← para items manuales
    varianteId?: string;     // ← variante seleccionada
    talle?:      string | null;
    color?:      string | null;
  }[];
  metodoPago:      string;
  descuento?:      number;
  recargo?:        number;
  clienteNombre?:  string;
  clienteDni?:     string;
  observaciones?:  string;
  vendedorId?:     string;
  vendedorNombre?: string;
  fechaManual?:    string;
};

// Datos para un movimiento manual
export type CreateMovimientoInput = {
  productoId: string;
  tipo: "ENTRADA" | "SALIDA" | "AJUSTE";
  cantidad: number;
  motivo?: string;
};

// ── Tipos para el contexto de sesión ────────────────────────

export type SesionUsuario = {
  supabaseId: string;
  tenantId: string;
  nombre: string;
  email: string;
  rol: RolTenant;
};

// ── Tipos para estadísticas ──────────────────────────────────

export type EstadisticasDashboard = {
  ventasHoy: number;
  totalHoy: number;
  ventasMes: number;
  totalMes: number;
  productosStockBajo: number;
  topProductos: {
    nombre: string;
    cantidad: number;
    total: number;
  }[];
  ventasPorDia: {
    fecha: string;
    total: number;
    cantidad: number;
  }[];
};
