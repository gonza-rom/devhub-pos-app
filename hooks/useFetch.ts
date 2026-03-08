"use client";
// hooks/useFetch.ts

import { useCallback } from "react";

export function useFetch() {
  const apiFetch = useCallback(
    async (url: string, options?: RequestInit): Promise<Response> => {
      const res = await fetch(url, options);

      if (res.status === 401) {
        const params = new URLSearchParams({
          error:    "Tu sesión expiró. Iniciá sesión de nuevo.",
          redirect: window.location.pathname,
        });
        window.location.href = `/auth/login?${params.toString()}`;
        throw new Error("SESSION_EXPIRED");
      }

      if (res.status === 402) {
        window.location.href = "/configuracion/plan?motivo=vencido";
        throw new Error("PLAN_VENCIDO");
      }

      return res;
    },
    [] // ✅ sin dependencias — window.location no es estado de React
  );

  return { apiFetch };
}