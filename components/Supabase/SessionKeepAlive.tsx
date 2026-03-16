// components/Supabase/SessionKeepAlive.tsx
// Componente invisible que mantiene la sesión viva.
// Se agrega UNA sola vez en el layout de la app.

"use client";

import { useSessionKeepAlive } from "@/hooks/useSessionKeepAlive";

export function SessionKeepAlive() {
  useSessionKeepAlive();
  return null;
}