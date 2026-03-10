-- CreateEnum
CREATE TYPE "PlanTipo" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "RolTenant" AS ENUM ('PROPIETARIO', 'ADMINISTRADOR', 'EMPLEADO');

-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('ENTRADA', 'SALIDA', 'VENTA', 'AJUSTE');

-- CreateEnum
CREATE TYPE "TipoMovimientoCaja" AS ENUM ('APERTURA', 'VENTA_EFECTIVO', 'INGRESO', 'EGRESO', 'CIERRE', 'VENTA_VIRTUAL');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "telefono" TEXT,
    "direccion" TEXT,
    "ciudad" TEXT,
    "plan" "PlanTipo" NOT NULL DEFAULT 'FREE',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cuit" TEXT,
    "descripcion" TEXT,
    "facebook" TEXT,
    "instagram" TEXT,
    "provincia" TEXT,
    "sitioWeb" TEXT,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Suscripcion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "plan" "PlanTipo" NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pending',
    "mpPreapprovalId" TEXT,
    "mpSubscriptionId" TEXT,
    "proximoVencimiento" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Suscripcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsuarioTenant" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supabaseId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "rol" "RolTenant" NOT NULL DEFAULT 'EMPLEADO',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsuarioTenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Categoria" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proveedor" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "email" TEXT,
    "direccion" TEXT,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Producto" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "codigoProducto" TEXT,
    "codigoBarras" TEXT,
    "precio" DOUBLE PRECISION NOT NULL,
    "costo" DOUBLE PRECISION,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "stockMinimo" INTEGER NOT NULL DEFAULT 5,
    "unidad" TEXT,
    "imagen" TEXT,
    "imagenes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "categoriaId" TEXT,
    "proveedorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrecioHistorico" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "precioViejo" DOUBLE PRECISION NOT NULL,
    "precioNuevo" DOUBLE PRECISION NOT NULL,
    "motivo" TEXT,
    "usuarioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrecioHistorico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venta" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "subtotal" DOUBLE PRECISION,
    "descuento" DOUBLE PRECISION DEFAULT 0,
    "metodoPago" TEXT NOT NULL,
    "clienteNombre" TEXT,
    "clienteDni" TEXT,
    "observaciones" TEXT,
    "usuarioId" TEXT,
    "usuarioNombre" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Venta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VentaItem" (
    "id" TEXT NOT NULL,
    "ventaId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnit" DOUBLE PRECISION NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "VentaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Movimiento" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "productoNombre" TEXT NOT NULL,
    "tipo" "TipoMovimiento" NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "stockAnterior" INTEGER,
    "stockResultante" INTEGER,
    "motivo" TEXT,
    "ventaId" TEXT,
    "usuarioId" TEXT,
    "usuarioNombre" TEXT,
    "cancelado" BOOLEAN NOT NULL DEFAULT false,
    "motivoCancelacion" TEXT,
    "canceladoPor" TEXT,
    "canceladoAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Movimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Caja" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "usuarioNombre" TEXT,
    "saldoInicial" DOUBLE PRECISION NOT NULL,
    "saldoFinal" DOUBLE PRECISION,
    "saldoContado" DOUBLE PRECISION,
    "diferencia" DOUBLE PRECISION,
    "observaciones" TEXT,
    "abiertaAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cerradaAt" TIMESTAMP(3),
    "estado" TEXT NOT NULL DEFAULT 'ABIERTA',

    CONSTRAINT "Caja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoCaja" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "cajaId" TEXT NOT NULL,
    "tipo" "TipoMovimientoCaja" NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "descripcion" TEXT,
    "ventaId" TEXT,
    "usuarioId" TEXT,
    "usuarioNombre" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metodoPago" TEXT,

    CONSTRAINT "MovimientoCaja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuraciones_afip" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "cuit" TEXT NOT NULL,
    "razonSocial" TEXT,
    "puntoVenta" INTEGER NOT NULL DEFAULT 1,
    "condicionFiscal" TEXT NOT NULL DEFAULT 'MT',
    "certificado" TEXT NOT NULL,
    "clavePrivada" TEXT NOT NULL,
    "ambiente" TEXT NOT NULL DEFAULT 'testing',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "ultimaConexion" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuraciones_afip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comprobantes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ventaId" TEXT,
    "puntoVenta" INTEGER NOT NULL,
    "tipoComprobante" INTEGER NOT NULL,
    "numeroComprobante" INTEGER NOT NULL,
    "cae" TEXT NOT NULL,
    "caeFchVto" TEXT NOT NULL,
    "qrData" TEXT,
    "docTipo" INTEGER NOT NULL DEFAULT 99,
    "docNro" BIGINT NOT NULL DEFAULT 0,
    "clienteNombre" TEXT,
    "clienteEmail" TEXT,
    "clienteDireccion" TEXT,
    "total" DOUBLE PRECISION NOT NULL,
    "neto" DOUBLE PRECISION NOT NULL,
    "iva" DOUBLE PRECISION NOT NULL,
    "descuento" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "importeNoGravado" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "importeExento" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "importeTributos" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monedaId" TEXT NOT NULL DEFAULT 'PES',
    "monedaCotizacion" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "ivaDetalle" JSONB,
    "items" JSONB NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "resultado" TEXT NOT NULL DEFAULT 'A',
    "observaciones" TEXT,
    "concepto" INTEGER NOT NULL DEFAULT 1,
    "metodoPago" TEXT,
    "usuarioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comprobantes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_email_key" ON "Tenant"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE INDEX "Tenant_plan_idx" ON "Tenant"("plan");

-- CreateIndex
CREATE INDEX "Tenant_activo_idx" ON "Tenant"("activo");

-- CreateIndex
CREATE INDEX "Tenant_createdAt_idx" ON "Tenant"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Suscripcion_tenantId_key" ON "Suscripcion"("tenantId");

-- CreateIndex
CREATE INDEX "Suscripcion_estado_idx" ON "Suscripcion"("estado");

-- CreateIndex
CREATE INDEX "Suscripcion_proximoVencimiento_idx" ON "Suscripcion"("proximoVencimiento");

-- CreateIndex
CREATE UNIQUE INDEX "UsuarioTenant_supabaseId_key" ON "UsuarioTenant"("supabaseId");

-- CreateIndex
CREATE INDEX "UsuarioTenant_tenantId_idx" ON "UsuarioTenant"("tenantId");

-- CreateIndex
CREATE INDEX "UsuarioTenant_supabaseId_idx" ON "UsuarioTenant"("supabaseId");

-- CreateIndex
CREATE INDEX "UsuarioTenant_email_idx" ON "UsuarioTenant"("email");

-- CreateIndex
CREATE INDEX "UsuarioTenant_tenantId_activo_idx" ON "UsuarioTenant"("tenantId", "activo");

-- CreateIndex
CREATE INDEX "UsuarioTenant_tenantId_rol_idx" ON "UsuarioTenant"("tenantId", "rol");

-- CreateIndex
CREATE UNIQUE INDEX "UsuarioTenant_tenantId_email_key" ON "UsuarioTenant"("tenantId", "email");

-- CreateIndex
CREATE INDEX "Categoria_tenantId_idx" ON "Categoria"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_tenantId_nombre_key" ON "Categoria"("tenantId", "nombre");

-- CreateIndex
CREATE INDEX "Proveedor_tenantId_idx" ON "Proveedor"("tenantId");

-- CreateIndex
CREATE INDEX "Proveedor_email_idx" ON "Proveedor"("email");

-- CreateIndex
CREATE INDEX "Producto_tenantId_idx" ON "Producto"("tenantId");

-- CreateIndex
CREATE INDEX "Producto_tenantId_activo_idx" ON "Producto"("tenantId", "activo");

-- CreateIndex
CREATE INDEX "Producto_tenantId_categoriaId_idx" ON "Producto"("tenantId", "categoriaId");

-- CreateIndex
CREATE INDEX "Producto_tenantId_nombre_idx" ON "Producto"("tenantId", "nombre");

-- CreateIndex
CREATE INDEX "Producto_tenantId_stock_idx" ON "Producto"("tenantId", "stock");

-- CreateIndex
CREATE INDEX "Producto_tenantId_activo_nombre_idx" ON "Producto"("tenantId", "activo", "nombre");

-- CreateIndex
CREATE INDEX "Producto_codigoBarras_idx" ON "Producto"("codigoBarras");

-- CreateIndex
CREATE INDEX "Producto_tenantId_activo_stock_idx" ON "Producto"("tenantId", "activo", "stock");

-- CreateIndex
CREATE INDEX "Producto_categoriaId_idx" ON "Producto"("categoriaId");

-- CreateIndex
CREATE INDEX "Producto_proveedorId_idx" ON "Producto"("proveedorId");

-- CreateIndex
CREATE UNIQUE INDEX "Producto_tenantId_codigoProducto_key" ON "Producto"("tenantId", "codigoProducto");

-- CreateIndex
CREATE UNIQUE INDEX "Producto_tenantId_codigoBarras_key" ON "Producto"("tenantId", "codigoBarras");

-- CreateIndex
CREATE INDEX "PrecioHistorico_tenantId_idx" ON "PrecioHistorico"("tenantId");

-- CreateIndex
CREATE INDEX "PrecioHistorico_productoId_idx" ON "PrecioHistorico"("productoId");

-- CreateIndex
CREATE INDEX "PrecioHistorico_createdAt_idx" ON "PrecioHistorico"("createdAt");

-- CreateIndex
CREATE INDEX "Venta_tenantId_idx" ON "Venta"("tenantId");

-- CreateIndex
CREATE INDEX "Venta_tenantId_metodoPago_idx" ON "Venta"("tenantId", "metodoPago");

-- CreateIndex
CREATE INDEX "Venta_tenantId_usuarioId_idx" ON "Venta"("tenantId", "usuarioId");

-- CreateIndex
CREATE INDEX "Venta_clienteNombre_idx" ON "Venta"("clienteNombre");

-- CreateIndex
CREATE INDEX "Venta_clienteDni_idx" ON "Venta"("clienteDni");

-- CreateIndex
CREATE INDEX "Venta_tenantId_createdAt_idx" ON "Venta"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "Venta_tenantId_metodoPago_createdAt_idx" ON "Venta"("tenantId", "metodoPago", "createdAt");

-- CreateIndex
CREATE INDEX "Venta_tenantId_createdAt_desc_idx" ON "Venta"("tenantId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "VentaItem_ventaId_idx" ON "VentaItem"("ventaId");

-- CreateIndex
CREATE INDEX "VentaItem_productoId_idx" ON "VentaItem"("productoId");

-- CreateIndex
CREATE INDEX "VentaItem_productoId_ventaId_idx" ON "VentaItem"("productoId", "ventaId");

-- CreateIndex
CREATE INDEX "VentaItem_ventaId_productoId_idx" ON "VentaItem"("ventaId", "productoId");

-- CreateIndex
CREATE INDEX "Movimiento_tenantId_idx" ON "Movimiento"("tenantId");

-- CreateIndex
CREATE INDEX "Movimiento_tenantId_productoId_idx" ON "Movimiento"("tenantId", "productoId");

-- CreateIndex
CREATE INDEX "Movimiento_tenantId_tipo_idx" ON "Movimiento"("tenantId", "tipo");

-- CreateIndex
CREATE INDEX "Movimiento_tenantId_cancelado_createdAt_idx" ON "Movimiento"("tenantId", "cancelado", "createdAt");

-- CreateIndex
CREATE INDEX "Movimiento_productoId_createdAt_idx" ON "Movimiento"("productoId", "createdAt");

-- CreateIndex
CREATE INDEX "Movimiento_ventaId_idx" ON "Movimiento"("ventaId");

-- CreateIndex
CREATE INDEX "Movimiento_tenantId_tipo_createdAt_idx" ON "Movimiento"("tenantId", "tipo", "createdAt");

-- CreateIndex
CREATE INDEX "Movimiento_tenantId_createdAt_idx" ON "Movimiento"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "Movimiento_tenantId_createdAt_desc_idx" ON "Movimiento"("tenantId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Caja_tenantId_idx" ON "Caja"("tenantId");

-- CreateIndex
CREATE INDEX "Caja_tenantId_estado_idx" ON "Caja"("tenantId", "estado");

-- CreateIndex
CREATE INDEX "Caja_tenantId_abiertaAt_idx" ON "Caja"("tenantId", "abiertaAt");

-- CreateIndex
CREATE INDEX "Caja_tenantId_estado_abiertaAt_idx" ON "Caja"("tenantId", "estado", "abiertaAt");

-- CreateIndex
CREATE INDEX "Caja_tenantId_cerradaAt_desc_idx" ON "Caja"("tenantId", "cerradaAt" DESC);

-- CreateIndex
CREATE INDEX "MovimientoCaja_cajaId_idx" ON "MovimientoCaja"("cajaId");

-- CreateIndex
CREATE INDEX "MovimientoCaja_tenantId_idx" ON "MovimientoCaja"("tenantId");

-- CreateIndex
CREATE INDEX "MovimientoCaja_tenantId_createdAt_idx" ON "MovimientoCaja"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "MovimientoCaja_cajaId_tipo_idx" ON "MovimientoCaja"("cajaId", "tipo");

-- CreateIndex
CREATE INDEX "MovimientoCaja_ventaId_idx" ON "MovimientoCaja"("ventaId");

-- CreateIndex
CREATE INDEX "MovimientoCaja_cajaId_createdAt_idx" ON "MovimientoCaja"("cajaId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "configuraciones_afip_tenantId_key" ON "configuraciones_afip"("tenantId");

-- CreateIndex
CREATE INDEX "configuraciones_afip_tenantId_idx" ON "configuraciones_afip"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "comprobantes_ventaId_key" ON "comprobantes"("ventaId");

-- CreateIndex
CREATE INDEX "comprobantes_tenantId_idx" ON "comprobantes"("tenantId");

-- CreateIndex
CREATE INDEX "comprobantes_ventaId_idx" ON "comprobantes"("ventaId");

-- CreateIndex
CREATE INDEX "comprobantes_cae_idx" ON "comprobantes"("cae");

-- CreateIndex
CREATE INDEX "comprobantes_fecha_idx" ON "comprobantes"("fecha");

-- CreateIndex
CREATE INDEX "comprobantes_numeroComprobante_puntoVenta_tipoComprobante_idx" ON "comprobantes"("numeroComprobante", "puntoVenta", "tipoComprobante");

-- AddForeignKey
ALTER TABLE "Suscripcion" ADD CONSTRAINT "Suscripcion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioTenant" ADD CONSTRAINT "UsuarioTenant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Categoria" ADD CONSTRAINT "Categoria_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proveedor" ADD CONSTRAINT "Proveedor_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrecioHistorico" ADD CONSTRAINT "PrecioHistorico_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrecioHistorico" ADD CONSTRAINT "PrecioHistorico_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentaItem" ADD CONSTRAINT "VentaItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentaItem" ADD CONSTRAINT "VentaItem_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Caja" ADD CONSTRAINT "Caja_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_cajaId_fkey" FOREIGN KEY ("cajaId") REFERENCES "Caja"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuraciones_afip" ADD CONSTRAINT "configuraciones_afip_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comprobantes" ADD CONSTRAINT "comprobantes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comprobantes" ADD CONSTRAINT "comprobantes_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

