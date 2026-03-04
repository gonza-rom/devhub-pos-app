// lib/mercadopago.ts

const MP_BASE = "https://api.mercadopago.com";

function getAccessToken(): string {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) throw new Error("MP_ACCESS_TOKEN no está definido en .env.local");
  return token;
}

export type MPPreapprovalStatus = "pending" | "authorized" | "paused" | "cancelled";

export type MPPreapproval = {
  id: string;
  status: MPPreapprovalStatus;
  payer_id?: number;
  next_payment_date?: string;
  init_point: string;
  external_reference?: string;
  auto_recurring: {
    frequency: number;
    frequency_type: "months" | "days";
    transaction_amount: number;
    currency_id: string;
  };
};

export type MPPayment = {
  id: number;
  status: "approved" | "rejected" | "pending" | "cancelled" | "in_process";
  preapproval_id?: string;
  transaction_amount: number;
  date_approved?: string;
};

export type MPWebhookBody = {
  type: "payment" | "subscription_preapproval" | string;
  action?: string;
  data: { id: string };
};

export const PLAN_PRO = {
  monto: 20,
  moneda: "ARS",
  nombre: "Plan Pro — DevHub POS",
};

export type CreatePreapprovalInput = {
  tenantId: string;
  tenantNombre: string;
  payerEmail: string;
  backUrl: string;
};

export async function createPreapproval(input: CreatePreapprovalInput): Promise<MPPreapproval> {
  const appUrl    = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) throw new Error("NEXT_PUBLIC_APP_URL no está definido en .env");

  const startDate = new Date().toISOString();
  const endDate   = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 5).toISOString();

  const body = {
    reason:             `${PLAN_PRO.nombre} · ${input.tenantNombre}`,
    external_reference: input.tenantId,
    payer_email:        input.payerEmail,
    auto_recurring: {
      frequency:          1,
      frequency_type:     "months",
      transaction_amount: PLAN_PRO.monto,
      currency_id:        PLAN_PRO.moneda,
      start_date:         startDate,
      end_date:           endDate,
    },
    // ✅ Usar siempre NEXT_PUBLIC_APP_URL — nunca hardcodear túneles locales
    back_url:         `${appUrl}/configuracion/plan?suscripcion=resultado`,
    notification_url: `${appUrl}/api/webhooks/mercadopago`,
    status:           "pending",
  };

  console.log("[MP] Creando preapproval para tenant:", input.tenantId);
  console.log("[MP] notification_url:", body.notification_url);

  const res = await fetch(`${MP_BASE}/preapproval`, {
    method:  "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization:  `Bearer ${getAccessToken()}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("[MP] Error creando preapproval:", data);
    throw new Error(data.message ?? "Error al crear suscripción en MercadoPago");
  }
  return data as MPPreapproval;
}

export async function getPreapproval(id: string): Promise<MPPreapproval> {
  const res = await fetch(`${MP_BASE}/preapproval/${id}`, {
    headers: { Authorization: `Bearer ${getAccessToken()}` },
    cache:   "no-store",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Error al obtener preapproval");
  return data as MPPreapproval;
}

export async function cancelPreapproval(id: string): Promise<void> {
  const res = await fetch(`${MP_BASE}/preapproval/${id}`, {
    method:  "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization:  `Bearer ${getAccessToken()}`,
    },
    body: JSON.stringify({ status: "cancelled" }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message ?? "Error al cancelar suscripción");
  }
}

export async function getPayment(id: string): Promise<MPPayment> {
  const res = await fetch(`${MP_BASE}/v1/payments/${id}`, {
    headers: { Authorization: `Bearer ${getAccessToken()}` },
    cache:   "no-store",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Error al obtener pago");
  return data as MPPayment;
}

export async function verifyWebhookSignature(
  xSignature: string,
  xRequestId: string,
  dataId: string
): Promise<boolean> {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("[MP] MP_WEBHOOK_SECRET no definido — saltando verificación");
    return true;
  }
  try {
    const parts = xSignature.split(",");
    const ts    = parts.find((p) => p.startsWith("ts="))?.replace("ts=", "").trim();
    const v1    = parts.find((p) => p.startsWith("v1="))?.replace("v1=", "").trim();
    if (!ts || !v1) return false;

    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const buf      = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest));
    const computed = Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return computed === v1;
  } catch {
    return false;
  }
}

export function calcularProximoVencimiento(): Date {
  const fecha = new Date();
  fecha.setMonth(fecha.getMonth() + 1);
  return fecha;
}