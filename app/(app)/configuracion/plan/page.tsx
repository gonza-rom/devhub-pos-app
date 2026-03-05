"use client";
// app/(app)/configuracion/plan/page.tsx
// ACTUALIZADO: agrega sección "Uso actual" para plan FREE

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Zap, CheckCircle, Crown, Rocket, MessageCircle, Mail,
  Calendar, AlertTriangle, RefreshCw, Loader2, XCircle,
  Package, Users, Clock, Image, Landmark, Copy, Check,
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

type UsoData = {
  plan: Plan;
  uso: { productos: number; usuarios: number };
  limites: {
    productos: number | null;
    usuarios: number | null;
    historialDias: number | null;
    imagenesPorProducto: number | null;
  };
  trial: {
    diasRestantes: number | null;
    vencidoAt: string | null;
    vencido: boolean;
  };
} | null;

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

// ── Componente barra de uso ───────────────────────────────────

function ItemUso({
  icon: Icon, label, uso, limite, sufijo = "",
}: {
  icon: React.ElementType;
  label: string;
  uso: number;
  limite: number | null;
  sufijo?: string;
}) {
  const ilimitado = limite === null;
  const pct       = ilimitado ? 0 : Math.min(100, Math.round((uso / limite!) * 100));
  const critico   = !ilimitado && pct >= 90;
  const warning   = !ilimitado && pct >= 70 && !critico;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className={cn(
            "p-1.5 rounded-lg",
            critico ? "bg-red-100 dark:bg-red-900/20" :
            warning ? "bg-amber-100 dark:bg-amber-900/20" :
            "bg-gray-100 dark:bg-gray-700"
          )}>
            <Icon className={cn(
              "h-3.5 w-3.5",
              critico ? "text-red-500" : warning ? "text-amber-500" : "text-gray-500"
            )} />
          </div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        </div>
        <span className={cn(
          "text-sm font-semibold tabular-nums",
          critico ? "text-red-500" : warning ? "text-amber-500" : "text-gray-600 dark:text-gray-400"
        )}>
          {ilimitado ? (
            <span className="text-green-600 dark:text-green-400">Ilimitado</span>
          ) : (
            <>{uso}<span className="text-gray-400 font-normal">/{limite}{sufijo}</span></>
          )}
        </span>
      </div>

      {!ilimitado && (
        <div className="h-1.5 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700",
              critico ? "bg-red-500" : warning ? "bg-amber-500" : "bg-primary-500"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────

export default function PlanPage() {
  const searchParams = useSearchParams();
  const [suscripcion, setSuscripcion] = useState<Suscripcion | null>(null);
  const [uso,         setUso]         = useState<UsoData>(null);
  const [loading,     setLoading]     = useState(true);
  const [loadingPago,     setLoadingPago]     = useState(false);
  const [loadingCancelar, setLoadingCancelar] = useState(false);
  const [error,    setError]    = useState("");
  const [toast,    setToast]    = useState<{ tipo: "ok" | "error"; msg: string } | null>(null);
  const [confirmarCancelar,   setConfirmarCancelar]   = useState(false);
  const [modalTransferencia, setModalTransferencia] = useState(false);
  const [copiado,            setCopiado]            = useState<"alias" | "cbu" | null>(null);

  const resultado = searchParams.get("suscripcion");

  useEffect(() => {
    fetchEstado();
    fetchUso();
  }, []);

  useEffect(() => {
    if (resultado === "resultado") {
      setTimeout(() => fetchEstado(), 2000);
      mostrarToast("ok", "Procesando tu suscripción... puede tardar unos segundos.");
    }
  }, [resultado]);

  const fetchEstado = async () => {
    try {
      const res  = await fetch("/api/suscripcion/estado");
      const data = await res.json();
      if (data.ok) setSuscripcion(data.data);
    } catch {
      setError("Error al cargar el estado de la suscripción");
    } finally {
      setLoading(false);
    }
  };

  const fetchUso = async () => {
    try {
      const res  = await fetch("/api/plan/uso");
      const data = await res.json();
      if (data.ok) setUso(data.data);
    } catch {}
  };
  const mostrarToast = (tipo: "ok" | "error", msg: string) => {
    setToast({ tipo, msg });
    setTimeout(() => setToast(null), 5000);
  };

  const handleSuscribir = async () => {
    setLoadingPago(true);
    setError("");
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("No se pudo obtener tu email");

      const res  = await fetch("/api/suscripcion/crear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      window.location.href = data.initPoint;
    } catch (err: any) {
      setError(err.message ?? "Error al iniciar el pago");
      setLoadingPago(false);
    }
  };

  const handleCancelar = async () => {
    setLoadingCancelar(true);
    try {
      const res  = await fetch("/api/suscripcion/cancelar", { method: "POST" });
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

  const copiar = async (texto: string, tipo: "alias" | "cbu") => {
    await navigator.clipboard.writeText(texto);
    setCopiado(tipo);
    setTimeout(() => setCopiado(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const planActual  = PLANES.find((p) => p.key === suscripcion?.plan);
  const esPro       = suscripcion?.plan === "PRO";
  const estaActivo  = suscripcion?.estado === "authorized";
  const cancelado   = suscripcion?.estado === "cancelled";
  const esFree      = suscripcion?.plan === "FREE" || !suscripcion;

  const ALIAS    = "gonza-rom";
  const CBU      = "4530000800017862828905";
  const TITULAR  = "Gonzalo Misael Romero Quispe";
  const MONTO    = "$35.000 ARS";
  const WA_URL   = `https://wa.me/543834946767?text=${encodeURIComponent("Hola! Hice una transferencia para el Plan Pro de DevHub POS. Te mando el comprobante.")}`;

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

      {esFree && uso && (
        <div className="card p-6 space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Uso actual del plan Free</h2>
              <p className="text-xs text-gray-500 mt-0.5">Actualizá al plan Pro para remover todos los límites</p>
            </div>
            {/* Badge días restantes del trial */}
            {uso.trial && (
              <span className={cn(
                "flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border",
                uso.trial.vencido
                  ? "text-red-600 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                  : uso.trial.diasRestantes! <= 2
                  ? "text-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                  : "text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
              )}>
                <Clock className="h-3.5 w-3.5" />
                {uso.trial.vencido
                  ? "Trial vencido"
                  : uso.trial.diasRestantes === 1
                  ? "1 día de trial restante"
                  : `${uso.trial.diasRestantes} días de trial restantes`}
              </span>
            )}
            {/* Alerta límite productos */}
            {uso.uso.productos >= 45 && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-1.5 rounded-full">
                <AlertTriangle className="h-3.5 w-3.5" />
                Cerca del límite
              </span>
            )}
          </div>

          {/* Fecha vencimiento trial */}
          {uso.trial && !uso.trial.vencido && uso.trial.vencidoAt && (
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
              <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
              Tu período de prueba vence el{" "}
              <strong className="text-gray-700 dark:text-gray-300">
                {new Date(uso.trial.vencidoAt).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}
              </strong>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ItemUso
              icon={Package}
              label="Productos activos"
              uso={uso.uso.productos}
              limite={uso.limites.productos}
            />
            <ItemUso
              icon={Users}
              label="Usuarios"
              uso={uso.uso.usuarios}
              limite={uso.limites.usuarios}
            />
            <ItemUso
              icon={Clock}
              label="Historial de ventas"
              uso={0}
              limite={uso.limites.historialDias}
              sufijo=" días"
            />
            <ItemUso
              icon={Image}
              label="Imágenes por producto"
              uso={0}
              limite={uso.limites.imagenesPorProducto}
            />
          </div>

          <div className="pt-1 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Con el plan <strong className="text-gray-700 dark:text-gray-300">Pro</strong> tenés productos ilimitados, hasta 10 usuarios y 365 días de historial.
            </p>
            <button
              onClick={handleSuscribir}
              disabled={loadingPago}
              className="flex-shrink-0 flex items-center gap-2 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white px-5 py-2.5 text-sm font-semibold transition-colors"
            >
              {loadingPago
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Redirigiendo...</>
                : <><Crown className="h-4 w-4" /> Actualizar al Pro</>
              }
            </button>
          </div>
        </div>
      )}

      {/* Estado actual */}
      {suscripcion && (
        <div className={cn(
          "card p-6 border-l-4",
          esPro && estaActivo ? "border-green-500" :
          esPro && cancelado  ? "border-amber-500" :
          "border-gray-400"
        )}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Plan actual</p>
                <span className={cn(
                  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
                  esPro && estaActivo ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" :
                  esPro && cancelado  ? "bg-amber-100 text-amber-700" :
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

            <div className="flex flex-wrap gap-2">
              {(!esPro || cancelado) && (
                <button
                  onClick={handleSuscribir}
                  disabled={loadingPago}
                  className="flex items-center gap-2 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white px-5 py-2.5 text-sm font-semibold transition-colors"
                >
                  {loadingPago
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Redirigiendo a MP...</>
                    : <><Crown className="h-4 w-4" /> Suscribirme al Pro</>
                  }
                </button>
              )}
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

          {suscripcion.diasRestantes !== null && suscripcion.diasRestantes <= 7 && esPro && estaActivo && (
            <div className="mt-4 flex items-start gap-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Tu suscripción vence en <strong>{suscripcion.diasRestantes} días</strong>. MercadoPago realizará el cobro automático.
              </p>
            </div>
          )}

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

      {/* ── Pagar por transferencia (solo si no es PRO activo) ── */}
      {!esPro && (
        <div className="card p-5 flex flex-col sm:flex-row items-center gap-4"
          style={{ background: "rgba(34,197,94,0.04)", border: "1px solid rgba(34,197,94,0.2)" }}>
          <div className="p-3 rounded-xl flex-shrink-0"
            style={{ background: "rgba(34,197,94,0.1)" }}>
            <Landmark className="h-6 w-6 text-green-600" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              ¿Preferís pagar por transferencia?
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Transferí {MONTO}/mes y envianos el comprobante por WhatsApp. Activamos tu plan en minutos.
            </p>
          </div>
          <button
            onClick={() => setModalTransferencia(true)}
            className="flex-shrink-0 flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors text-green-700 dark:text-green-400"
            style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)" }}
          >
            <Landmark className="h-4 w-4" />
            Ver datos bancarios
          </button>
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

      {/* Modal transferencia */}
      {modalTransferencia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalTransferencia(false)} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white dark:bg-gray-800 shadow-xl p-6 space-y-5">

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-green-100 dark:bg-green-900/30 flex-shrink-0">
                <Landmark className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Datos para transferencia</h3>
                <p className="text-xs text-gray-500">Plan Pro · {MONTO}/mes</p>
              </div>
            </div>

            {/* Datos bancarios */}
            <div className="space-y-3">
              {/* Alias */}
              <div className="flex items-center justify-between rounded-xl px-4 py-3"
                style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.08)" }}>
                <div>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Alias</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-0.5">{ALIAS}</p>
                </div>
                <button
                  onClick={() => copiar(ALIAS, "alias")}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                  style={{ background: copiado === "alias" ? "rgba(34,197,94,0.1)" : "rgba(0,0,0,0.06)", color: copiado === "alias" ? "#16a34a" : "#6b7280" }}
                >
                  {copiado === "alias" ? <><Check className="h-3.5 w-3.5" />Copiado</> : <><Copy className="h-3.5 w-3.5" />Copiar</>}
                </button>
              </div>

              {/* CBU */}
              <div className="flex items-center justify-between rounded-xl px-4 py-3"
                style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.08)" }}>
                <div>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">CBU</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-0.5 font-mono tracking-wider">{CBU}</p>
                </div>
                <button
                  onClick={() => copiar(CBU, "cbu")}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex-shrink-0 ml-2"
                  style={{ background: copiado === "cbu" ? "rgba(34,197,94,0.1)" : "rgba(0,0,0,0.06)", color: copiado === "cbu" ? "#16a34a" : "#6b7280" }}
                >
                  {copiado === "cbu" ? <><Check className="h-3.5 w-3.5" />Copiado</> : <><Copy className="h-3.5 w-3.5" />Copiar</>}
                </button>
              </div>

              {/* Titular y monto */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl px-4 py-3" style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.08)" }}>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Titular</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-0.5">{TITULAR}</p>
                </div>
                <div className="rounded-xl px-4 py-3" style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.08)" }}>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Monto</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-0.5">{MONTO}</p>
                </div>
              </div>
            </div>

            {/* Instrucción */}
            <div className="flex items-start gap-2.5 rounded-xl px-4 py-3"
              style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}>
              <MessageCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                Después de transferir, envianos el comprobante por WhatsApp y activamos tu plan <strong>en minutos</strong>.
              </p>
            </div>

            {/* Botones */}
            <div className="flex flex-col gap-2.5">
              <a
                href={WA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-colors"
                style={{ background: "#16a34a" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#15803d"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "#16a34a"}
              >
                <MessageCircle className="h-4 w-4" />
                Enviar comprobante por WhatsApp
              </a>
              <button
                onClick={() => setModalTransferencia(false)}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-600 py-2.5 text-sm font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}