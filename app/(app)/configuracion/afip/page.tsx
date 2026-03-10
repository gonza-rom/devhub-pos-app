// app/(app)/configuracion/afip/page.tsx
// Página para configurar la integración con AFIP

import { getTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import ConfiguracionAFIPClient from "./ConfiguracionAFIPClient";

export default async function ConfiguracionAFIPPage() {
  const { tenantId } = await getTenantContext();

  // Obtener configuración existente
  const config = await prisma.configuracionAFIP.findUnique({
    where: { tenantId },
  });

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { cuit: true, nombre: true },
  });

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Configuración AFIP
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Configurá la integración con AFIP/ARCA para emitir facturas electrónicas
        </p>
      </div>

      <ConfiguracionAFIPClient
        configInicial={config ? {
          id: config.id,
          cuit: config.cuit,
          razonSocial: config.razonSocial,
          puntoVenta: config.puntoVenta,
          condicionFiscal: config.condicionFiscal,
          ambiente: config.ambiente,
          activo: config.activo,
          certificado: config.certificado,
          clavePrivada: config.clavePrivada,
          ultimaConexion: config.ultimaConexion?.toISOString() || null, // ← FIX: || null
        } : null}
        tenantCuit={tenant?.cuit}
        tenantNombre={tenant?.nombre}
      />
    </div>
  );
}