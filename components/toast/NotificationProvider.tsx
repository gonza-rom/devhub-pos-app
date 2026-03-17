// components/providers/NotificationProvider.tsx
// Envuelve toda la app con ToastProvider + ConfirmProvider + ToastContainer

"use client";

import { ToastProvider }   from "@/components/toast/context/ToastContext";
import { ConfirmProvider } from "@/components/toast/context/ConfirmContext";
import { ToastContainer }  from "@/components/toast/context/ToastContainer";

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmProvider>
        {children}
        <ToastContainer />
      </ConfirmProvider>
    </ToastProvider>
  );
}