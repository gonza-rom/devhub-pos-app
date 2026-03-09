"use client";
// components/ventas/BarcodeScanner.tsx
// SOLUCIÓN SIMPLE: Input manual de código (sin cámara por ahora)

import { useState, useCallback, useEffect, useRef } from "react";
import { X, Camera, Keyboard } from "lucide-react";

type Props = {
  onScanned: (codigo: string) => void;
  onClose: () => void;
};

export default function BarcodeScanner({ onScanned, onClose }: Props) {
  const [codigo, setCodigo] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const beep = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 1200;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } catch {}
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigo.trim()) return;
    
    beep();
    onScanned(codigo.trim());
    setTimeout(() => onClose(), 300);
  };

  // Auto-submit cuando se pega un código
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text').trim();
    if (pastedText) {
      e.preventDefault();
      setCodigo(pastedText);
      
      // Auto-submit después de 100ms (da tiempo al state update)
      setTimeout(() => {
        beep();
        onScanned(pastedText);
        setTimeout(() => onClose(), 300);
      }, 100);
    }
  }, [beep, onScanned, onClose]);

  // Cerrar con ESC
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-base)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: "var(--border-base)" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: "rgba(220,38,38,0.12)" }}
            >
              <Keyboard className="h-4 w-4 text-red-500" />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Ingresar código
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Escribí o escaneá el código de barras
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
            style={{ background: "var(--bg-hover-md)", color: "var(--text-muted)" }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.background = "var(--bg-hover-strong)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.background = "var(--bg-hover-md)")
            }
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label
              htmlFor="codigo"
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--text-secondary)" }}
            >
              Código de barras o producto
            </label>
            <input
              ref={inputRef}
              id="codigo"
              type="text"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              onPaste={handlePaste}
              placeholder="Ejemplo: 7799000011"
              className="input-base w-full text-lg font-mono"
              autoFocus
              autoComplete="off"
            />
            <p className="text-xs mt-2" style={{ color: "var(--text-faint)" }}>
              Escaneá con tu lector o pegá el código (Ctrl+V)
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: "var(--bg-hover-md)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-base)",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.background = "var(--bg-hover-strong)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.background = "var(--bg-hover-md)")
              }
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!codigo.trim()}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
              style={{ background: "#DC2626", color: "#fff" }}
              onMouseEnter={(e) => {
                if (codigo.trim()) ((e.currentTarget as HTMLElement).style.background = "#B91C1C");
              }}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#DC2626")}
            >
              Buscar
            </button>
          </div>
        </form>

        {/* Info */}
        <div
          className="px-6 py-4 border-t"
          style={{
            background: "var(--bg-base)",
            borderColor: "var(--border-base)",
          }}
        >
          <div className="flex items-start gap-3">
            <Camera className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                ¿Tenés un lector de códigos?
              </p>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-faint)" }}>
                Conectalo por USB o Bluetooth y escaneá directamente. El código se ingresará
                automáticamente en el campo.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}