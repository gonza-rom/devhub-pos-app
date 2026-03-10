// app/(app)/comprobantes/page.tsx

import { getTenantContext } from "@/lib/tenant";
import { ComprobantesClient } from "./ComprobantesClient";

export const metadata = {
  title: "Comprobantes | DevHub POS",
  description: "Historial de comprobantes AFIP",
};

export default async function ComprobantesPage() {
  const { tenantId } = await getTenantContext();

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Comprobantes AFIP
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          Historial de facturas y comprobantes electrónicos
        </p>
      </div>

      <ComprobantesClient />
    </div>
  );
}