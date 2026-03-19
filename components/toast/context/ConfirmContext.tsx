"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { AlertTriangle, Trash2, LogOut, ShieldAlert, X } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────

type ConfirmVariant = "danger" | "warning" | "info";

interface ConfirmOptions {
  title:         string;
  description?:  string;
  confirmLabel?: string;
  cancelLabel?:  string;
  variant?:      ConfirmVariant;
  icon?:         "trash" | "logout" | "shield" | "warning";
}

interface ConfirmState extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

// ── Context ───────────────────────────────────────────────────────────────

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

// ── Config de variantes ───────────────────────────────────────────────────
// Solo guardamos los colores semánticos de acción (danger/warning/info).
// Los colores neutros de superficie los tomamos de las CSS vars en el JSX.

const VARIANT_CONFIG: Record<
  ConfirmVariant,
  { iconBg: string; iconColor: string; btnBg: string; btnHover: string; btnText: string }
> = {
  danger: {
    iconBg:    "rgba(239,68,68,0.12)",
    iconColor: "#f87171",
    btnBg:     "#DC2626",
    btnHover:  "#B91C1C",
    btnText:   "#ffffff",
  },
  warning: {
    iconBg:    "rgba(245,158,11,0.12)",
    iconColor: "#fbbf24",
    btnBg:     "#D97706",
    btnHover:  "#B45309",
    btnText:   "#ffffff",
  },
  info: {
    iconBg:    "rgba(59,130,246,0.12)",
    iconColor: "#60a5fa",
    btnBg:     "#2563EB",
    btnHover:  "#1D4ED8",
    btnText:   "#ffffff",
  },
};

const ICONS = {
  trash:   Trash2,
  logout:  LogOut,
  shield:  ShieldAlert,
  warning: AlertTriangle,
};

// ── Provider ──────────────────────────────────────────────────────────────

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state,   setState]   = useState<ConfirmState | null>(null);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ ...options, resolve });
      requestAnimationFrame(() => setVisible(true));
    });
  }, []);

  const handleConfirm = () => {
    setLoading(true);
    setTimeout(() => {
      state?.resolve(true);
      setLoading(false);
      setVisible(false);
      setTimeout(() => setState(null), 200);
    }, 80);
  };

  const handleCancel = () => {
    state?.resolve(false);
    setVisible(false);
    setTimeout(() => setState(null), 200);
  };

  const variant       = state?.variant ?? "danger";
  const cfg           = VARIANT_CONFIG[variant];
  const IconComponent = ICONS[state?.icon ?? "warning"];

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      {state && (
        <div
          onClick={handleCancel}
          style={{
            position:       "fixed",
            inset:          0,
            zIndex:         10000,
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            padding:        "16px",
            background:     visible ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0)",
            backdropFilter: visible ? "blur(4px)" : "blur(0px)",
            transition:     "background 0.2s ease, backdrop-filter 0.2s ease",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width:        "100%",
              maxWidth:     "400px",
              borderRadius: "18px",
              background:   "var(--bg-surface)",
              border:       "1px solid var(--border-md)",
              boxShadow:    "0 32px 64px rgba(0,0,0,0.5), 0 1px 0 var(--border-subtle) inset",
              overflow:     "hidden",
              opacity:      visible ? 1 : 0,
              transform:    visible ? "scale(1) translateY(0)" : "scale(0.93) translateY(12px)",
              transition:   "opacity 0.22s ease, transform 0.22s cubic-bezier(0.34,1.56,0.64,1)",
            }}
          >
            {/* Header con ícono y cerrar */}
            <div style={{ padding: "24px 24px 0", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div
                style={{
                  width:          "44px",
                  height:         "44px",
                  borderRadius:   "12px",
                  background:     cfg.iconBg,
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "center",
                  flexShrink:     0,
                }}
              >
                <IconComponent size={20} color={cfg.iconColor} />
              </div>
              <button
                onClick={handleCancel}
                style={{
                  background:   "none",
                  border:       "none",
                  cursor:       "pointer",
                  color:        "var(--text-faint)",
                  padding:      "4px",
                  borderRadius: "6px",
                  transition:   "color 0.15s",
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-muted)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-faint)")}
              >
                <X size={16} />
              </button>
            </div>

            {/* Contenido */}
            <div style={{ padding: "16px 24px 24px" }}>
              <h3
                style={{
                  margin:        "0 0 8px",
                  fontSize:      "16px",
                  fontWeight:    700,
                  color:         "var(--text-primary)",
                  fontFamily:    "'Syne', sans-serif",
                  letterSpacing: "-0.01em",
                }}
              >
                {state.title}
              </h3>
              {state.description && (
                <p
                  style={{
                    margin:     "0 0 20px",
                    fontSize:   "13.5px",
                    color:      "var(--text-muted)",
                    lineHeight: "1.6",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {state.description}
                </p>
              )}
              {!state.description && <div style={{ height: "20px" }} />}

              {/* Botones */}
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={handleCancel}
                  style={{
                    flex:         1,
                    padding:      "10px 16px",
                    borderRadius: "10px",
                    border:       "1px solid var(--border-strong)",
                    background:   "var(--bg-hover-md)",
                    color:        "var(--text-secondary)",
                    fontSize:     "13.5px",
                    fontWeight:   600,
                    cursor:       "pointer",
                    fontFamily:   "'DM Sans', sans-serif",
                    transition:   "background 0.15s",
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--bg-hover-md)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--bg-hover-md)")}
                >
                  {state.cancelLabel ?? "Cancelar"}
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  style={{
                    flex:           1,
                    padding:        "10px 16px",
                    borderRadius:   "10px",
                    border:         "none",
                    background:     loading ? "var(--bg-input)" : cfg.btnBg,
                    color:          loading ? "var(--text-muted)" : cfg.btnText,
                    fontSize:       "13.5px",
                    fontWeight:     700,
                    cursor:         loading ? "not-allowed" : "pointer",
                    fontFamily:     "'DM Sans', sans-serif",
                    transition:     "background 0.15s, transform 0.1s",
                    display:        "flex",
                    alignItems:     "center",
                    justifyContent: "center",
                    gap:            "6px",
                  }}
                  onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.background = cfg.btnHover; }}
                  onMouseLeave={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.background = cfg.btnBg; }}
                  onMouseDown={(e)  => { if (!loading) (e.currentTarget as HTMLElement).style.transform = "scale(0.97)"; }}
                  onMouseUp={(e)    => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
                >
                  {loading ? (
                    <span style={{
                      width:          "14px",
                      height:         "14px",
                      border:         "2px solid var(--border-strong)",
                      borderTopColor: "var(--text-primary)",
                      borderRadius:   "50%",
                      animation:      "devhub-spin 0.7s linear infinite",
                      display:        "inline-block",
                    }} />
                  ) : null}
                  {state.confirmLabel ?? "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes devhub-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </ConfirmContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────

export function useConfirm(): (options: ConfirmOptions) => Promise<boolean> {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm debe usarse dentro de <ConfirmProvider>");
  return ctx.confirm;
}