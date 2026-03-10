// hooks/useConfigAFIP.ts
// Hook para obtener configuración AFIP del tenant

import { useState, useEffect } from "react";

interface ConfigAFIP {
  activo: boolean;
  condicionFiscal: string;
  puntoVenta: number;
  ambiente: string;
}

export function useConfigAFIP() {
  const [config, setConfig] = useState<ConfigAFIP | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch("/api/afip/config");
        const data = await res.json();
        
        if (data.ok && data.config) {
          setConfig({
            activo: data.config.activo,
            condicionFiscal: data.config.condicionFiscal,
            puntoVenta: data.config.puntoVenta,
            ambiente: data.config.ambiente,
          });
        } else {
          setConfig(null);
        }
      } catch (error) {
        console.error("Error obteniendo config AFIP:", error);
        setConfig(null);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  return { config, loading };
}