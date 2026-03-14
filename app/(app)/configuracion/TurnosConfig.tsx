"use client";
// app/(app)/configuracion/TurnosConfig.tsx

import { useState, useEffect } from "react";
import { Clock, Save, AlertCircle, CheckCircle } from "lucide-react";
import type { ConfigTurnos } from "@/lib/turnos";
import { TURNOS_DEFAULT } from "@/lib/turnos";

export default function TurnosConfig() {
  const [config, setConfig] = useState<ConfigTurnos>(TURNOS_DEFAULT);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  useEffect(() => {
    cargarConfig();
  }, []);

  const cargarConfig = async () => {
    try {
      const res = await fetch("/api/configuracion/turnos");
      const data = await res.json();
      if (data.ok) {
        setConfig(data.data);
      }
    } catch (err) {
      console.error("Error cargando configuración:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGuardar = async () => {
    setGuardando(true);
    try {
      const res = await fetch("/api/configuracion/turnos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (res.ok) {
        setMensaje({ tipo: "ok", texto: "Configuración guardada correctamente" });
      } else {
        throw new Error("Error al guardar");
      }
    } catch (err) {
      setMensaje({ tipo: "error", texto: "Error al guardar la configuración" });
    } finally {
      setGuardando(false);
      setTimeout(() => setMensaje(null), 3000);
    }
  };

  const updateTurno = (
    turno: "mañana" | "tarde" | "noche",
    campo: "inicio" | "fin" | "activo",
    valor: string | boolean
  ) => {
    setConfig((prev) => ({
      ...prev,
      [turno]: {
        ...prev[turno],
        [campo]: valor,
      },
    }));
  };

  if (loading) {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-center py-8">
          <div className="spinner h-8 w-8" />
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-2">
            <Clock className="h-4 w-4" /> Configuración de Turnos
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Define los horarios de trabajo de tu comercio
          </p>
        </div>
        <button
          onClick={handleGuardar}
          disabled={guardando}
          className="btn-primary"
        >
          <Save className="h-4 w-4" />
          {guardando ? "Guardando..." : "Guardar"}
        </button>
      </div>

      {mensaje && (
        <div
          className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${
            mensaje.tipo === "ok"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {mensaje.tipo === "ok" ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          {mensaje.texto}
        </div>
      )}

      <div className="space-y-4">
        {/* Turno Mañana */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={config.mañana.activo}
                onChange={(e) => updateTurno("mañana", "activo", e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Turno Mañana
            </label>
          </div>
          {config.mañana.activo && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-base">Hora inicio</label>
                <input
                  type="time"
                  value={config.mañana.inicio}
                  onChange={(e) => updateTurno("mañana", "inicio", e.target.value)}
                  className="input-base"
                />
              </div>
              <div>
                <label className="label-base">Hora fin</label>
                <input
                  type="time"
                  value={config.mañana.fin}
                  onChange={(e) => updateTurno("mañana", "fin", e.target.value)}
                  className="input-base"
                />
              </div>
            </div>
          )}
        </div>

        {/* Turno Tarde */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={config.tarde.activo}
                onChange={(e) => updateTurno("tarde", "activo", e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Turno Tarde
            </label>
          </div>
          {config.tarde.activo && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-base">Hora inicio</label>
                <input
                  type="time"
                  value={config.tarde.inicio}
                  onChange={(e) => updateTurno("tarde", "inicio", e.target.value)}
                  className="input-base"
                />
              </div>
              <div>
                <label className="label-base">Hora fin</label>
                <input
                  type="time"
                  value={config.tarde.fin}
                  onChange={(e) => updateTurno("tarde", "fin", e.target.value)}
                  className="input-base"
                />
              </div>
            </div>
          )}
        </div>

        {/* Turno Noche (opcional) */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={config.noche?.activo ?? false}
                onChange={(e) => {
                  if (e.target.checked) {
                    setConfig((prev) => ({
                      ...prev,
                      noche: { inicio: "22:00", fin: "08:30", activo: true },
                    }));
                  } else {
                    setConfig((prev) => ({
                      ...prev,
                      noche: undefined,
                    }));
                  }
                }}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Turno Noche
            </label>
          </div>
          {config.noche?.activo && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-base">Hora inicio</label>
                  <input
                    type="time"
                    value={config.noche.inicio}
                    onChange={(e) => updateTurno("noche", "inicio", e.target.value)}
                    className="input-base"
                  />
                </div>
                <div>
                  <label className="label-base">Hora fin</label>
                  <input
                    type="time"
                    value={config.noche.fin}
                    onChange={(e) => updateTurno("noche", "fin", e.target.value)}
                    className="input-base"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Si el turno noche cruza medianoche (ej: 22:00 - 08:30), el sistema lo detectará automáticamente
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}