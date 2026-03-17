"use client";

import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2, XCircle, AlertTriangle, Info, X, Loader2,
} from "lucide-react";
import { useToast, type Toast, type ToastType } from "./ToastContext";

// ── Config por tipo ───────────────────────────────────────────────────────

const CONFIG: Record<
  ToastType,
  {
    icon: React.ElementType;
    iconColor: string;
    barColor: string;
    bg: string;
    border: string;
    spin?: boolean;
  }
> = {
  success: {
    icon:      CheckCircle2,
    iconColor: "#4ade80",
    barColor:  "#22c55e",
    bg:        "rgba(34,197,94,0.07)",
    border:    "rgba(34,197,94,0.2)",
  },
  error: {
    icon:      XCircle,
    iconColor: "#f87171",
    barColor:  "#ef4444",
    bg:        "rgba(239,68,68,0.07)",
    border:    "rgba(239,68,68,0.2)",
  },
  warning: {
    icon:      AlertTriangle,
    iconColor: "#fbbf24",
    barColor:  "#f59e0b",
    bg:        "rgba(245,158,11,0.07)",
    border:    "rgba(245,158,11,0.2)",
  },
  info: {
    icon:      Info,
    iconColor: "#60a5fa",
    barColor:  "#3b82f6",
    bg:        "rgba(59,130,246,0.07)",
    border:    "rgba(59,130,246,0.2)",
  },
  loading: {
    icon:      Loader2,
    iconColor: "#a1a1aa",
    barColor:  "#71717a",
    bg:        "rgba(255,255,255,0.04)",
    border:    "rgba(255,255,255,0.1)",
    spin:      true,
  },
};

// ── Toast individual ──────────────────────────────────────────────────────

function ToastItem({ toast }: { toast: Toast }) {
  const { dismiss } = useToast();
  const [visible,  setVisible]  = useState(false);
  const [exiting,  setExiting]  = useState(false);
  const [progress, setProgress] = useState(100);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef    = useRef<number>(0);
  const pausedRef   = useRef(false);
  const elapsed     = useRef(0);

  const cfg      = CONFIG[toast.type];
  const Icon     = cfg.icon;
  const duration = toast.duration ?? (toast.type === "loading" ? 0 : toast.type === "error" ? 6000 : 4000);

  // Entrada
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  // Barra de progreso
  useEffect(() => {
    if (duration === 0) return;

    const tick = 50; // ms
    startRef.current = Date.now();

    intervalRef.current = setInterval(() => {
      if (pausedRef.current) return;
      elapsed.current = Date.now() - startRef.current;
      const remaining = Math.max(0, 1 - elapsed.current / duration);
      setProgress(remaining * 100);
    }, tick);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [duration]);

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(() => dismiss(toast.id), 280);
  };

  const pauseProgress = () => {
    pausedRef.current = true;
  };

  const resumeProgress = () => {
    pausedRef.current = false;
    // Re-ajustar el startRef para que el tiempo pausado no cuente
    startRef.current = Date.now() - elapsed.current;
  };

  return (
    <div
      onMouseEnter={pauseProgress}
      onMouseLeave={resumeProgress}
      style={{
        position:        "relative",
        width:           "420px",
        maxWidth:        "calc(100vw - 32px)",
        borderRadius:    "14px",
        overflow:        "hidden",
        background:      cfg.bg,
        border:          `1px solid ${cfg.border}`,
        backdropFilter:  "blur(16px)",
        boxShadow:       "0 4px 6px -1px rgba(0,0,0,0.3), 0 20px 40px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.06) inset",
        cursor:          "default",
        // Animación: entra desde arriba, sale hacia arriba
        opacity:         exiting ? 0 : visible ? 1 : 0,
        transform:       exiting
          ? "translateY(-14px) scale(0.95)"
          : visible
          ? "translateY(0) scale(1)"
          : "translateY(-20px) scale(0.96)",
        transition:      exiting
          ? "opacity 0.22s ease, transform 0.22s cubic-bezier(0.4,0,1,1)"
          : "opacity 0.3s ease, transform 0.3s cubic-bezier(0.34,1.4,0.64,1)",
      }}
    >
      {/* Barra de progreso */}
      {duration > 0 && (
        <div
          style={{
            position:   "absolute",
            bottom:     0,
            left:       0,
            height:     "2px",
            width:      `${progress}%`,
            background: cfg.barColor,
            transition: "width 0.05s linear",
            opacity:    0.6,
          }}
        />
      )}

      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "14px 16px" }}>
        {/* Ícono */}
        <div
          style={{
            flexShrink: 0,
            width:      "20px",
            height:     "20px",
            marginTop:  "1px",
          }}
        >
          <Icon
            size={20}
            color={cfg.iconColor}
            style={cfg.spin ? { animation: "devhub-spin 1s linear infinite" } : undefined}
          />
        </div>

        {/* Contenido */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              margin:     0,
              fontSize:   "13.5px",
              fontWeight: 600,
              lineHeight: "1.4",
              color:      "#f4f4f5",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {toast.title}
          </p>
          {toast.description && (
            <p
              style={{
                margin:     "3px 0 0",
                fontSize:   "12.5px",
                color:      "#a1a1aa",
                lineHeight: "1.5",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {toast.description}
            </p>
          )}
          {toast.action && (
            <button
              onClick={() => {
                toast.action!.onClick();
                handleDismiss();
              }}
              style={{
                marginTop:    "8px",
                padding:      "3px 10px",
                borderRadius: "6px",
                border:       `1px solid ${cfg.border}`,
                background:   "rgba(255,255,255,0.06)",
                color:        cfg.iconColor,
                fontSize:     "12px",
                fontWeight:   600,
                cursor:       "pointer",
                fontFamily:   "'DM Sans', sans-serif",
              }}
            >
              {toast.action.label}
            </button>
          )}
        </div>

        {/* Cerrar */}
        {toast.type !== "loading" && (
          <button
            onClick={handleDismiss}
            style={{
              flexShrink:   0,
              background:   "none",
              border:       "none",
              cursor:       "pointer",
              color:        "#52525b",
              padding:      "2px",
              borderRadius: "4px",
              display:      "flex",
              alignItems:   "center",
              transition:   "color 0.15s",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#a1a1aa")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#52525b")}
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Contenedor principal ──────────────────────────────────────────────────

export function ToastContainer() {
  const { toasts } = useToast();

  return (
    <>
      <style>{`
        @keyframes devhub-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      <div
        aria-live="polite"
        aria-label="Notificaciones"
        style={{
          position:        "fixed",
          top:             "20px",
          left:            "50%",
          transform:       "translateX(-50%)",
          zIndex:          9999,
          display:         "flex",
          flexDirection:   "column",
          alignItems:      "center",
          gap:             "8px",
          width:           "420px",
          maxWidth:        "calc(100vw - 32px)",
          pointerEvents:   toasts.length ? "auto" : "none",
        }}
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} />
        ))}
      </div>
    </>
  );
}