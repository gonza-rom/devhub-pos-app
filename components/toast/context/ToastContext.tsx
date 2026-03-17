"use client";

import { createContext, useContext, useState, useCallback, useRef } from "react";

// ── Types ─────────────────────────────────────────────────────────────────

export type ToastType = "success" | "error" | "warning" | "info" | "loading";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number; // ms — 0 = persistente
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextValue {
  toasts: Toast[];
  toast: (options: Omit<Toast, "id">) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
  // Shortcuts
  success: (title: string, description?: string) => string;
  error: (title: string, description?: string) => string;
  warning: (title: string, description?: string) => string;
  info: (title: string, description?: string) => string;
  loading: (title: string, description?: string) => string;
  // Actualizar un toast existente (útil para loading → success/error)
  update: (id: string, options: Partial<Omit<Toast, "id">>) => void;
  promise: <T>(
    fn: Promise<T>,
    opts: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((err: unknown) => string);
      description?: string;
    }
  ) => Promise<T>;
}

// ── Context ───────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const genId = () => Math.random().toString(36).slice(2, 9);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const dismissAll = useCallback(() => {
    timers.current.forEach((timer) => clearTimeout(timer));
    timers.current.clear();
    setToasts([]);
  }, []);

  const toast = useCallback(
    (options: Omit<Toast, "id">): string => {
      const id = genId();
      const duration =
        options.duration !== undefined
          ? options.duration
          : options.type === "loading"
          ? 0
          : options.type === "error"
          ? 6000
          : 4000;

      setToasts((prev) => {
        // Máximo 5 toasts visibles
        const next = [...prev, { ...options, id, duration }];
        return next.length > 5 ? next.slice(next.length - 5) : next;
      });

      if (duration > 0) {
        const timer = setTimeout(() => dismiss(id), duration);
        timers.current.set(id, timer);
      }

      return id;
    },
    [dismiss]
  );

  const update = useCallback(
    (id: string, options: Partial<Omit<Toast, "id">>) => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...options } : t))
      );

      // Si el update cambia el tipo a no-loading, programar auto-dismiss
      if (options.type && options.type !== "loading") {
        const existing = timers.current.get(id);
        if (existing) clearTimeout(existing);

        const duration =
          options.duration !== undefined
            ? options.duration
            : options.type === "error"
            ? 6000
            : 4000;

        if (duration > 0) {
          const timer = setTimeout(() => dismiss(id), duration);
          timers.current.set(id, timer);
        }
      }
    },
    [dismiss]
  );

  const promise = useCallback(
    async <T,>(
      fn: Promise<T>,
      opts: {
        loading: string;
        success: string | ((data: T) => string);
        error: string | ((err: unknown) => string);
        description?: string;
      }
    ): Promise<T> => {
      const id = toast({
        type: "loading",
        title: opts.loading,
        description: opts.description,
      });

      try {
        const data = await fn;
        const title =
          typeof opts.success === "function" ? opts.success(data) : opts.success;
        update(id, { type: "success", title });
        return data;
      } catch (err) {
        const title =
          typeof opts.error === "function" ? opts.error(err) : opts.error;
        update(id, { type: "error", title });
        throw err;
      }
    },
    [toast, update]
  );

  const value: ToastContextValue = {
    toasts,
    toast,
    dismiss,
    dismissAll,
    success: (title, description) => toast({ type: "success", title, description }),
    error:   (title, description) => toast({ type: "error",   title, description }),
    warning: (title, description) => toast({ type: "warning", title, description }),
    info:    (title, description) => toast({ type: "info",    title, description }),
    loading: (title, description) => toast({ type: "loading", title, description }),
    update,
    promise,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de <ToastProvider>");
  return ctx;
}