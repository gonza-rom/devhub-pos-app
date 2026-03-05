"use client";
// hooks/useFetch.ts
// Hook centralizado para fetch con manejo de sesión expirada.
// Cualquier 401 redirige al login con mensaje claro.
//
// USO:
//   const { apiFetch } = useFetch();
//   const data = await apiFetch("/api/productos", { method: "DELETE" });

import { useCallback } from "react";
import { useRouter }   from "next/navigation";

export function useFetch() {
  const router = useRouter();

  const apiFetch = useCallback(
    async (url: string, options?: RequestInit): Promise<Response> => {
      const res = await fetch(url, options);

      if (res.status === 401) {
        // Sesión expirada o cookie inválida — redirigir al login con mensaje
        const params = new URLSearchParams({
          error:    "Tu sesión expiró. Iniciá sesión de nuevo.",
          redirect: window.location.pathname,
        });
        window.location.href = `/auth/login?${params.toString()}`;
        // Lanzar para cortar la ejecución del caller
        throw new Error("SESSION_EXPIRED");
      }

      return res;
    },
    [router]
  );

  return { apiFetch };
}