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
ALTER TABLE "configuraciones_afip" ADD CONSTRAINT "configuraciones_afip_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comprobantes" ADD CONSTRAINT "comprobantes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comprobantes" ADD CONSTRAINT "comprobantes_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE SET NULL ON UPDATE CASCADE;