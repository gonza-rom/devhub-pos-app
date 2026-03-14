// lib/turnos.ts
// Sistema de turnos con lucide-react icons

import { Sunrise, Sunset, Moon, AlertTriangle } from "lucide-react";

export type Turno = "mañana" | "tarde" | "noche" | "fuera_horario";

export interface ConfigTurnos {
  mañana: { inicio: string; fin: string; activo: boolean };
  tarde: { inicio: string; fin: string; activo: boolean };
  noche?: { inicio: string; fin: string; activo: boolean };
}

// Configuración por defecto
export const TURNOS_DEFAULT: ConfigTurnos = {
  mañana: { inicio: "08:30", fin: "13:00", activo: true },
  tarde: { inicio: "17:30", fin: "22:00", activo: true },
};

/**
 * Detecta el turno actual según la hora
 */
export function detectarTurno(
  fecha: Date = new Date(),
  config: ConfigTurnos = TURNOS_DEFAULT
): {
  turno: Turno;
  label: string;
  horario: string;
  icon: "sunrise" | "sunset" | "moon" | "alert";
} {
  const hora = fecha.getHours();
  const minuto = fecha.getMinutes();
  const tiempoActual = hora * 60 + minuto;

  const parseHora = (h: string): number => {
    const [hh, mm] = h.split(":").map(Number);
    return hh * 60 + mm;
  };

  // Verificar turno mañana
  if (config.mañana.activo) {
    const inicio = parseHora(config.mañana.inicio);
    const fin = parseHora(config.mañana.fin);
    
    if (tiempoActual >= inicio && tiempoActual < fin) {
      return {
        turno: "mañana",
        label: "Turno Mañana",
        horario: `${config.mañana.inicio} - ${config.mañana.fin}`,
        icon: "sunrise",
      };
    }
  }

  // Verificar turno tarde
  if (config.tarde.activo) {
    const inicio = parseHora(config.tarde.inicio);
    const fin = parseHora(config.tarde.fin);
    
    if (tiempoActual >= inicio && tiempoActual < fin) {
      return {
        turno: "tarde",
        label: "Turno Tarde",
        horario: `${config.tarde.inicio} - ${config.tarde.fin}`,
        icon: "sunset",
      };
    }
  }

  // Verificar turno noche (si existe)
  if (config.noche?.activo) {
    const inicio = parseHora(config.noche.inicio);
    const fin = parseHora(config.noche.fin);
    
    // Si cruza medianoche (ej: 22:00 - 08:30)
    if (inicio > fin) {
      if (tiempoActual >= inicio || tiempoActual < fin) {
        return {
          turno: "noche",
          label: "Turno Noche",
          horario: `${config.noche.inicio} - ${config.noche.fin}`,
          icon: "moon",
        };
      }
    } else {
      if (tiempoActual >= inicio && tiempoActual < fin) {
        return {
          turno: "noche",
          label: "Turno Noche",
          horario: `${config.noche.inicio} - ${config.noche.fin}`,
          icon: "moon",
        };
      }
    }
  }

  // Fuera de horario
  return {
    turno: "fuera_horario",
    label: "Fuera de horario",
    horario: "—",
    icon: "alert",
  };
}

/**
 * Obtiene lista de turnos disponibles
 */
export function obtenerTurnosDisponibles(
  config: ConfigTurnos = TURNOS_DEFAULT
): Array<{
  value: Turno;
  label: string;
  horario: string;
  icon: "sunrise" | "sunset" | "moon";
}> {
  const turnos: Array<{
    value: Turno;
    label: string;
    horario: string;
    icon: "sunrise" | "sunset" | "moon";
  }> = [];

  if (config.mañana.activo) {
    turnos.push({
      value: "mañana",
      label: "Mañana",
      horario: `${config.mañana.inicio} - ${config.mañana.fin}`,
      icon: "sunrise",
    });
  }

  if (config.tarde.activo) {
    turnos.push({
      value: "tarde",
      label: "Tarde",
      horario: `${config.tarde.inicio} - ${config.tarde.fin}`,
      icon: "sunset",
    });
  }

  if (config.noche?.activo) {
    turnos.push({
      value: "noche",
      label: "Noche",
      horario: `${config.noche.inicio} - ${config.noche.fin}`,
      icon: "moon",
    });
  }

  return turnos;
}

/**
 * Mapeo de iconos por tipo de turno
 */
export const TURNO_ICONS = {
  sunrise: Sunrise,
  sunset: Sunset,
  moon: Moon,
  alert: AlertTriangle,
} as const;

/**
 * Formatea el nombre del turno para mostrar
 */
export function formatearNombreTurno(turno: string | null): string {
  if (!turno) return "—";
  return turno.charAt(0).toUpperCase() + turno.slice(1).replace("_", " ");
}