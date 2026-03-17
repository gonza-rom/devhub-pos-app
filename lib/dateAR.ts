// lib/dateAR.ts
// Helper centralizado para fechas en Argentina (UTC-3, sin DST).
// Usar SIEMPRE en lugar de new Date() cuando se necesite la hora local.

const TZ = "America/Argentina/Buenos_Aires";

/** Fecha y hora actual en Argentina como objeto Date (UTC internamente, pero representado en AR) */
export function ahoraAR(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
}

/** "YYYY-MM-DD" en Argentina */
export function fechaHoyAR(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ }); // en-CA = YYYY-MM-DD
}

/** "HH:MM" en Argentina */
export function horaAhoraAR(): string {
  return new Date().toLocaleTimeString("en-GB", {
    timeZone: TZ,
    hour:     "2-digit",
    minute:   "2-digit",
  });
}

/** Formatea un ISO string a "07:11 p. m." estilo Argentina */
export function fmtHoraAR(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-AR", {
    timeZone: TZ,
    hour:     "2-digit",
    minute:   "2-digit",
    hour12:   true,
  });
}

/** Formatea un ISO string a "lun. 16 mar. 2026" */
export function fmtFechaAR(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", {
    timeZone: TZ,
    weekday:  "short",
    day:      "2-digit",
    month:    "short",
    year:     "numeric",
  });
}

/** Formatea un ISO string a "16/03/2026 07:11 p. m." */
export function fmtFechaHoraAR(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", {
    timeZone: TZ,
    day:      "2-digit",
    month:    "2-digit",
    year:     "numeric",
    hour:     "2-digit",
    minute:   "2-digit",
    hour12:   true,
  });
}

/** Formatea un ISO string a "07:11" en 24hs */
export function fmtHora24AR(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-AR", {
    timeZone: TZ,
    hour:     "2-digit",
    minute:   "2-digit",
    hour12:   false,
  });
}

/** Formatea un ISO string a "16/03/2026 19:11" (fecha + hora 24hs) */
export function fmtFecha24HoraAR(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", {
    timeZone: TZ,
    day:      "2-digit",
    month:    "2-digit",
    year:     "numeric",
    hour:     "2-digit",
    minute:   "2-digit",
    hour12:   false,
  });
}

/** Convierte un ISO string a "YYYY-MM-DD" en AR (para inputs date) */
export function isoAFechaInputAR(iso: string): string {
  return new Date(iso)
    .toLocaleDateString("en-CA", { timeZone: TZ }); // en-CA = YYYY-MM-DD
}

/** Convierte un ISO string a "HH:MM" en AR (para inputs time) */
export function isoAHoraInputAR(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    timeZone: TZ,
    hour:     "2-digit",
    minute:   "2-digit",
  });
}