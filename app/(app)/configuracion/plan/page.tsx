"use client";
// app/(app)/configuracion/plan/page.tsx

import { useEffect, useState } from "react";
import {
  Zap, CheckCircle, Crown, Rocket, MessageCircle, Mail,
  Calendar, AlertTriangle, ExternalLink, RefreshCw, XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Plan = "TRIAL" | "PRO" | "ENTERPRISE";

type Suscripcion = {
  plan: Plan;
  estado: "ACTIVA" | "VENCIDA" | "CANCELADA" | "TRIAL";
  fechaInicio: string;
  fechaVencimiento: string | null;
  diasRestantes: number | null;
  autoRenovar: boolean;
};

const PLANES = [
  {
    key: "TRIAL" as Plan,
    nombre: "Prueba gratuita",
    precio: null,
    descripcion: "Conocé el sistema sin compromiso.",
    duracion: "7 días · acceso completo · sin tarjeta",
    color: "border-gray-300 dark:border-gray-600",
    badge: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300",
    icon: <Zap className="h-5 w-5" />,
    features: [
      "Todas las funciones Pro",
      "Sin tarjeta de crédito",
      "Configuración en minutos",
      "Soporte incluido",
    ],
  },
  {
    key: "PRO" as Plan,
    nombre: "Pro",
    precio: "$35.000",
    descripcion: "Para comercios que quieren control total.",
    duracion: "por mes · hasta 3 usuarios",
    color: "border-primary-500 ring-2 ring-primary-500/20",
    badge: "bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300",
    icon: <Crown className="h-5 w-5" />,
    features: [
      "Productos ilimitados",
      "Hasta 3 usuarios",
      "Reportes avanzados",
      "Alertas de stock",
      "Soporte prioritario",
      "Backups diarios",
    ],
    destacado: true,
  },
  {
    key: "ENTERPRISE" as Plan,
    nombre: "Enterprise",
    precio: "A consultar",
    descripcion: "Para comercios medianos con múltiples sucursales.",
    duracion: "usuarios ilimitados · multi-sucursal",
    color: "border-amber-400 dark:border-amber-500",
    badge: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
    icon: <Rocket className="h-5 w-5" />,
    features: [
      "Base de datos dedicada",
      "Usuarios ilimitados",
      "Multi-sucursal",
      "API e integraciones",
      "Onboarding dedicado",
      "Soporte 24/7",
    ],
  },
];

function BadgeEstado({ estado }: { estado: Suscripcion["estado"] }) {
  const map = {
    ACTIVA:    "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
    TRIAL:     "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
    VENCIDA:   "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
    CANCELADA: "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400",
  };
  const labels = { ACTIVA: "Activa", TRIAL: "En prueba", VENCIDA: "Vencida", CANCELADA: "Cancelada" };
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold", map[estado])}>
      {labels[estado]}
    </span>
  );
}

export default function PlanPage() {
  const [suscripcion, setSuscripcion] = useState<Suscripcion | null>(null);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    fetchSuscripcion();
  }, []);

  const fetchSuscripcion = async () => {
    try {
      const res  = await fetch("/api/configuracion/plan");
      const data = await res.json();
      setSuscripcion(data.data ?? data);
    } catch {
      console.error("Error al cargar suscripción");
    } finally {
      setLoading(false);
    }
  };

  const planActual = PLANES.find((p) => p.key === suscripcion?.plan);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Crown className="h-6 w-6" /> Plan y Suscripción
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Gestioná tu suscripción y conocé todos los planes disponibles
        </p>
      </div>

      {/* ── Estado actual ── */}
      {suscripcion && (
        <div className={cn(
          "card p-6 border-l-4",
          suscripcion.estado === "ACTIVA"    ? "border-green-500" :
          suscripcion.estado === "TRIAL"     ? "border-blue-500"  :
          suscripcion.estado === "VENCIDA"   ? "border-red-500"   : "border-gray-400"
        )}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Plan actual</p>
                <BadgeEstado estado={suscripcion.estado} />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {planActual?.nombre ?? suscripcion.plan}
              </p>
              {suscripcion.fechaVencimiento && (
                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Vence el {new Date(suscripcion.fechaVencimiento).toLocaleDateString("es-AR")}
                  {suscripcion.diasRestantes !== null && (
                    <span className={cn(
                      "ml-1 font-semibold",
                      suscripcion.diasRestantes <= 3 ? "text-red-500" :
                      suscripcion.diasRestantes <= 7 ? "text-amber-500" : "text-gray-600 dark:text-gray-400"
                    )}>
                      · {suscripcion.diasRestantes === 0 ? "vence hoy" : `${suscripcion.diasRestantes} días restantes`}
                    </span>
                  )}
                </p>
              )}
            </div>

            {/* Acciones */}
            <div className="flex flex-wrap gap-2">
              {(suscripcion.estado === "VENCIDA" || suscripcion.estado === "CANCELADA") && (
                <a href="https://wa.me/5491112345678?text=Hola%2C%20quiero%20renovar%20mi%20plan%20Pro"
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm font-semibold transition-colors">
                  <RefreshCw className="h-4 w-4" /> Renovar plan
                </a>
              )}
              {suscripcion.estado === "TRIAL" && (
                <a href="https://wa.me/5491112345678?text=Hola%2C%20quiero%20suscribirme%20al%20plan%20Pro"
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 text-sm font-semibold transition-colors">
                  <Crown className="h-4 w-4" /> Suscribirme al Pro
                </a>
              )}
            </div>
          </div>

          {/* Alerta vencimiento próximo */}
          {suscripcion.diasRestantes !== null && suscripcion.diasRestantes <= 7 && suscripcion.estado === "ACTIVA" && (
            <div className="mt-4 flex items-start gap-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Tu suscripción vence en <strong>{suscripcion.diasRestantes} días</strong>. Contactanos para renovar y no perder el acceso.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Planes ── */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-5">
          Planes disponibles
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANES.map((plan) => {
            const esActual = plan.key === suscripcion?.plan;
            return (
              <div key={plan.key} className={cn(
                "card p-6 flex flex-col gap-4 relative transition-shadow hover:shadow-md",
                plan.color,
                esActual && "shadow-md"
              )}>
                {plan.destacado && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm whitespace-nowrap">
                      Más popular
                    </span>
                  </div>
                )}

                {esActual && (
                  <div className="absolute -top-3 right-4">
                    <span className="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm whitespace-nowrap">
                      Plan actual
                    </span>
                  </div>
                )}

                {/* Cabecera */}
                <div>
                  <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold mb-3", plan.badge)}>
                    {plan.icon} {plan.nombre}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{plan.descripcion}</p>
                  <div className="mt-3">
                    {plan.precio ? (
                      <>
                        <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">{plan.precio}</span>
                        {plan.key !== "ENTERPRISE" && (
                          <p className="text-xs text-gray-400 mt-0.5">{plan.duracion}</p>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">Gratis</span>
                        <p className="text-xs text-gray-400 mt-0.5">{plan.duracion}</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-2 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <div className="pt-2">
                  {plan.key === "ENTERPRISE" ? (
                    <div className="flex flex-col gap-2">
                      <a href="https://wa.me/5491112345678?text=Hola%2C%20quiero%20info%20sobre%20Enterprise"
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 rounded-xl bg-green-600 hover:bg-green-700 text-white py-2.5 text-sm font-semibold transition-colors">
                        <MessageCircle className="h-4 w-4" /> Hablar por WhatsApp
                      </a>
                      <a href="mailto:hola@devhubpos.com?subject=Consulta Enterprise"
                        className="flex items-center justify-center gap-2 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 py-2.5 text-sm font-medium transition-colors">
                        <Mail className="h-4 w-4" /> Enviar email
                      </a>
                    </div>
                  ) : esActual ? (
                    <div className="flex items-center justify-center gap-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 py-2.5 text-sm font-medium cursor-default">
                      <CheckCircle className="h-4 w-4 text-green-500" /> Plan actual
                    </div>
                  ) : plan.key === "PRO" ? (
                    <a href="https://wa.me/5491112345678?text=Hola%2C%20quiero%20suscribirme%20al%20plan%20Pro"
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white py-2.5 text-sm font-semibold transition-colors">
                      <Crown className="h-4 w-4" /> Suscribirme al Pro
                    </a>
                  ) : (
                    <div className="flex items-center justify-center gap-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 py-2.5 text-sm font-medium cursor-default">
                      Solo disponible al inicio
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-4">
          Precios en pesos argentinos · Se actualizan trimestralmente según inflación
        </p>
      </div>

      {/* ── Respondemos en 24hs ── */}
      <div className="card p-5 flex flex-col sm:flex-row items-center gap-4 bg-gray-50 dark:bg-gray-800/50">
        <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-xl flex-shrink-0">
          <MessageCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
        <div className="flex-1 text-center sm:text-left">
          <p className="font-semibold text-gray-900 dark:text-gray-100">¿Tenés dudas sobre los planes?</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Respondemos en menos de 24hs por WhatsApp o email.</p>
        </div>
        <div className="flex gap-2">
          <a href="https://wa.me/5491112345678" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-xl bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm font-semibold transition-colors">
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </a>
          <a href="mailto:hola@devhubpos.com"
            className="flex items-center gap-1.5 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 text-sm font-medium transition-colors">
            <Mail className="h-4 w-4" /> Email
          </a>
        </div>
      </div>

    </div>
  );
}