// hooks/useSessionKeepAlive.ts
// Mantiene la sesión viva en PCs de caja que están abiertas mucho tiempo.
// Refresca el token de Supabase + la cookie de tenant cada 25 minutos.
// También refresca cuando la pestaña vuelve a estar visible (ej: monitor que
// se apagó y volvió).

"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// Refrescar cada 25 minutos (el token dura 1 hora, así siempre hay margen)
const INTERVALO_MS = 25 * 60 * 1000;

export function useSessionKeepAlive() {
  useEffect(() => {
    const supabase = createClient();

    const refrescar = async () => {
      try {
        // 1. Pedir a Supabase que refresque el access token
        const { error } = await supabase.auth.refreshSession();

        if (error) {
          // Token de refresh también expiró → sesión realmente muerta
          console.warn("[SessionKeepAlive] Sesión expirada, redirigiendo...");
          window.location.href = `/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`;
          return;
        }

        // 2. Refrescar la cookie de tenant con el nuevo token
        await fetch("/api/auth/refresh-plan", { method: "POST" });

      } catch {
        // Error de red silencioso — no interrumpir al cajero
        // En la próxima venta se detectará si la sesión expiró
      }
    };

    // Arrancar el intervalo
    const intervalo = setInterval(refrescar, INTERVALO_MS);

    // Refrescar también cuando la pestaña vuelve a estar activa
    // (cubre el caso de monitor apagado, PC dormida, etc.)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refrescar();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);
}