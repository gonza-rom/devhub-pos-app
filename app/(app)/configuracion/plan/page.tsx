"use client";
// app/(app)/configuracion/plan/page.tsx

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Zap, CheckCircle, Crown, Rocket, MessageCircle, Mail,
  Calendar, AlertTriangle, RefreshCw, Loader2, XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

type Plan = "FREE" | "PRO" | "ENTERPRISE";

type Suscripcion = {
  plan: Plan;
  estado: string;
  proximoVencimiento: string | null;
  diasRestantes: number | null;
  mpPreapprovalId: string | null;
  puedeRenovar: boolean;
};

const PLANES = [
  {
    key: "FREE" as Plan,
    nombre: "Prueba gratuita",
    precio: null,
    descripcion: "Conocé el sistema sin compromiso.",
    duracion: "7 días · acceso completo · sin tarjeta",
    color: "border-gray-300 dark:border-gray-600",
    badge: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300",
    icon: <Zap className="h-5 w-5" />,
    features: ["Todas las funciones Pro", "Sin tarjeta de crédito", "Configuración en minutos"],
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

export default function PlanPage() {
  const searchParams = useSearchParams();
  const [suscripcion, setSuscripcion] = useState<Suscripcion | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPago, setLoadingPago] = useState(false);
  const [loadingCancelar, setLoadingCancelar] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ tipo: "ok" | "error"; msg: string } | null>(null);
  const [confirmarCancelar, setConfirmarCancelar] = useState(false);

  // Resultado al volver de MP
  const resultado = searchParams.get("suscripcion");

  useEffect(() => {
    fetchEstado();
  }, []);

  useEffect(() => {
    if (resultado === "resultado") {
      // Esperar un poco para que el webhook procese
      setTimeout(() => fetchEstado(), 2000);
      mostrarToast("ok", "Procesando tu suscripción... puede tardar unos segundos.");
    }
  }, [resultado]);

  const fetchEstado = async () => {
    try {
      const res = await fetch("/api/suscripcion/estado");
      const data = await res.json();
      if (data.ok) setSuscripcion(data.data);
    } catch {
      setError("Error al cargar el estado de la suscripción");
    } finally {
      setLoading(false);
    }
  };

  const mostrarToast = (tipo: "ok" | "error", msg: string) => {
    setToast({ tipo, msg });
    setTimeout(() => setToast(null), 5000);
  };

  const handleSuscribir = async () => {
    setLoadingPago(true);
    setError("");
    try {
      // Obtener email del usuario actual
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("No se pudo obtener tu email");

      const res = await fetch("/api/suscripcion/crear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);

      // Redirigir a MercadoPago
      window.location.href = data.initPoint;
    } catch (err: any) {
      setError(err.message ?? "Error al iniciar el pago");
      setLoadingPago(false);
    }
  };

  const handleCancelar = async () => {
    setLoadingCancelar(true);
    try {
      const res = await fetch("/api/suscripcion/cancelar", { method: "POST" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      mostrarToast("ok", "Suscripción cancelada. Seguís con acceso hasta el próximo vencimiento.");
      setConfirmarCancelar(false);
      await fetchEstado();
    } catch (err: any) {
      mostrarToast("error", err.message ?? "Error al cancelar");
    } finally {
      setLoadingCancelar(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const planActual = PLANES.find((p) => p.key === suscripcion?.plan);
  const esPro = suscripcion?.plan === "PRO";
  const estaActivo = suscripcion?.estado === "authorized";
  const cancelado = suscripcion?.estado === "cancelled";

  return (
    <div className="space-y-8 max-w-4xl">

      {/* Toast */}
      {toast && (
        <div className={cn(
          "fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl px-5 py-3.5 shadow-xl text-sm font-semibold",
          toast.tipo === "ok" ? "bg-green-600 text-white" : "bg-red-600 text-white"
        )}>
          {toast.tipo === "ok" ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Crown className="h-6 w-6" /> Plan y Suscripción
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Gestioná tu suscripción y conocé todos los planes disponibles
        </p>
      </div>

      {/* Estado actual */}
      {suscripcion && (
        <div className={cn(
          "card p-6 border-l-4",
          esPro && estaActivo ? "border-green-500" :
          esPro && cancelado ? "border-amber-500" :
          "border-gray-400"
        )}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Plan actual</p>
                <span className={cn(
                  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
                  esPro && estaActivo ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" :
                  esPro && cancelado ? "bg-amber-100 text-amber-700" :
                  "bg-gray-100 text-gray-600"
                )}>
                  {esPro && estaActivo ? "✅ Activa" : esPro && cancelado ? "⚠️ Cancelada" : "Free"}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {planActual?.nombre ?? suscripcion.plan}
              </p>

              {suscripcion.proximoVencimiento && (
                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {cancelado ? "Acceso hasta" : "Próximo cobro"}:{" "}
                  {new Date(suscripcion.proximoVencimiento).toLocaleDateString("es-AR")}
                  {suscripcion.diasRestantes !== null && (
                    <span className={cn(
                      "ml-1 font-semibold",
                      suscripcion.diasRestantes <= 3 ? "text-red-500" :
                      suscripcion.diasRestantes <= 7 ? "text-amber-500" : "text-gray-600 dark:text-gray-400"
                    )}>
                      · {suscripcion.diasRestantes === 0 ? "vence hoy" : `${suscripcion.diasRestantes} días`}
                    </span>
                  )}
                </p>
              )}
            </div>

            {/* Acciones */}
            <div className="flex flex-wrap gap-2">
              {/* Botón suscribirse */}
              {(!esPro || cancelado) && (
                <button
                  onClick={handleSuscribir}
                  disabled={loadingPago}
                  className="flex items-center gap-2 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white px-5 py-2.5 text-sm font-semibold transition-colors"
                >
                  {loadingPago ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Redirigiendo a MP...</>
                  ) : (
                    <><Crown className="h-4 w-4" /> Suscribirme al Pro</>
                  )}
                </button>
              )}

              {/* Botón cancelar */}
              {esPro && estaActivo && !cancelado && (
                <button
                  onClick={() => setConfirmarCancelar(true)}
                  className="flex items-center gap-2 rounded-xl border border-red-300 text-red-600 hover:bg-red-50 px-4 py-2.5 text-sm font-medium transition-colors"
                >
                  Cancelar suscripción
                </button>
              )}
            </div>
          </div>

          {/* Alerta próximo vencimiento */}
          {suscripcion.diasRestantes !== null && suscripcion.diasRestantes <= 7 && esPro && estaActivo && (
            <div className="mt-4 flex items-start gap-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Tu suscripción vence en <strong>{suscripcion.diasRestantes} días</strong>. MercadoPago realizará el cobro automático.
              </p>
            </div>
          )}

          {/* Alerta cancelado */}
          {cancelado && suscripcion.diasRestantes !== null && suscripcion.diasRestantes > 0 && (
            <div className="mt-4 flex items-start gap-3 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3">
              <RefreshCw className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700">
                Tu suscripción fue cancelada pero podés seguir usando el plan Pro hasta el{" "}
                <strong>{new Date(suscripcion.proximoVencimiento!).toLocaleDateString("es-AR")}</strong>.{" "}
                <button onClick={handleSuscribir} className="underline font-semibold">Reactivar</button>
              </p>
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
              <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>
      )}

      {/* Planes */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-5">Planes disponibles</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANES.map((plan) => {
            const esActual = plan.key === suscripcion?.plan;
            return (
              <div key={plan.key} className={cn(
                "card p-6 flex flex-col gap-4 relative transition-shadow hover:shadow-md",
                plan.color, esActual && "shadow-md"
              )}>
                {(plan as any).destacado && (
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

                <ul className="space-y-2 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="pt-2">
                  {plan.key === "ENTERPRISE" ? (
                    <div className="flex flex-col gap-2">
                      <a href="https://wa.me/543834946767" target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 rounded-xl bg-green-600 hover:bg-green-700 text-white py-2.5 text-sm font-semibold transition-colors">
                        <MessageCircle className="h-4 w-4" /> WhatsApp
                      </a>
                      <a href="mailto:devhubpos@gmail.com"
                        className="flex items-center justify-center gap-2 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-700 py-2.5 text-sm font-medium transition-colors">
                        <Mail className="h-4 w-4" /> Email
                      </a>
                    </div>
                  ) : esActual ? (
                    <div className="flex items-center justify-center gap-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-500 py-2.5 text-sm font-medium">
                      <CheckCircle className="h-4 w-4 text-green-500" /> Plan actual
                    </div>
                  ) : plan.key === "PRO" ? (
                    <button
                      onClick={handleSuscribir}
                      disabled={loadingPago}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white py-2.5 text-sm font-semibold transition-colors"
                    >
                      {loadingPago ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
                      Suscribirme al Pro
                    </button>
                  ) : (
                    <div className="flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-500 py-2.5 text-sm font-medium">
                      Solo disponible al inicio
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-center text-gray-400 mt-4">
          Precios en pesos argentinos · Se actualizan trimestralmente según inflación
        </p>
      </div>

      {/* Soporte */}
      <div className="card p-5 flex flex-col sm:flex-row items-center gap-4 bg-gray-50 dark:bg-gray-800/50">
        <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-xl flex-shrink-0">
          <MessageCircle className="h-6 w-6 text-green-600" />
        </div>
        <div className="flex-1 text-center sm:text-left">
          <p className="font-semibold text-gray-900 dark:text-gray-100">¿Tenés dudas sobre los planes?</p>
          <p className="text-sm text-gray-500">Respondemos en menos de 24hs.</p>
        </div>
        <div className="flex gap-2">
          <a href="https://wa.me/543834946767" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-xl bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm font-semibold transition-colors">
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </a>
          <a href="mailto:devhubpos@gmail.com"
            className="flex items-center gap-1.5 rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-700 px-4 py-2 text-sm font-medium transition-colors">
            <Mail className="h-4 w-4" /> Email
          </a>
        </div>
      </div>

      {/* Modal confirmar cancelación */}
      {confirmarCancelar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmarCancelar(false)} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white dark:bg-gray-800 shadow-xl p-6 space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mx-auto">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">¿Cancelar suscripción?</h3>
              <p className="text-sm text-gray-500 mt-1">
                MercadoPago dejará de cobrarte, pero mantenés acceso al Plan Pro hasta el próximo vencimiento.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmarCancelar(false)}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                Volver
              </button>
              <button onClick={handleCancelar} disabled={loadingCancelar}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white py-2.5 text-sm font-bold transition-colors">
                {loadingCancelar ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Sí, cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}