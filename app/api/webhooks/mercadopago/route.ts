// app/api/webhooks/mercadopago/route.ts
// Recibe notificaciones de MercadoPago sobre pagos y suscripciones.
//
// Para probarlo en local:
//   npx localtunnel --port 3000 --subdomain devhubpos
//   Configurar la URL del webhook en MP: https://devhubpos.loca.lt/api/webhooks/mercadopago

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyWebhookSignature,
  getPreapproval,
  getPayment,
  calcularProximoVencimiento,
  type MPWebhookBody,
} from "@/lib/mercadopago";

// MP requiere que respondas 200 rápido, incluso si procesás en background
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as MPWebhookBody;

    // ── Verificar firma ──────────────────────────────────────
    const xSignature = req.headers.get("x-signature") ?? "";
    const xRequestId = req.headers.get("x-request-id") ?? "";
    const dataId = body.data?.id ?? "";

    const firmaValida = await verifyWebhookSignature(xSignature, xRequestId, dataId);
    if (!firmaValida) {
      console.warn("[Webhook MP] Firma inválida");
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    console.log(`[Webhook MP] type=${body.type} action=${body.action} id=${dataId}`);

    // ── Procesar según el tipo ───────────────────────────────

    if (body.type === "subscription_preapproval") {
      await handlePreapproval(dataId);
    } else if (body.type === "payment") {
      await handlePayment(dataId);
    }

    // Siempre responder 200 a MP
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Webhook MP] Error:", err);
    // Igual devolvemos 200 para que MP no reintente infinitamente
    return NextResponse.json({ ok: true });
  }
}

// ── Handler: cambio de estado en el preapproval ───────────────────────────────

async function handlePreapproval(preapprovalId: string) {
  try {
    const preapproval = await getPreapproval(preapprovalId);
    const tenantId = preapproval.external_reference;

    if (!tenantId) {
      console.warn("[Webhook MP] Preapproval sin external_reference:", preapprovalId);
      return;
    }

    console.log(`[Webhook MP] Preapproval ${preapprovalId} → status=${preapproval.status} tenant=${tenantId}`);

    switch (preapproval.status) {
      case "authorized": {
        // ✅ Pago aprobado → activar Plan Pro
        const proximoVencimiento = calcularProximoVencimiento();

        await prisma.$transaction([
          prisma.tenant.update({
            where: { id: tenantId },
            data: { plan: "PRO", activo: true },
          }),
          prisma.suscripcion.upsert({
            where: { tenantId },
            update: {
              plan: "PRO",
              estado: "authorized",
              mpPreapprovalId: preapprovalId,
              proximoVencimiento,
            },
            create: {
              tenantId,
              plan: "PRO",
              estado: "authorized",
              mpPreapprovalId: preapprovalId,
              proximoVencimiento,
            },
          }),
        ]);

        console.log(`[Webhook MP] ✅ Tenant ${tenantId} activado en Plan Pro`);
        break;
      }

      case "paused":
        case "cancelled": {
        // Sin gracia — cortar acceso inmediatamente
        await prisma.$transaction([
            prisma.tenant.update({
            where: { id: tenantId },
            data: { plan: "FREE" },
            }),
            prisma.suscripcion.update({
            where: { tenantId },
            data: {
                estado: preapproval.status,
                mpPreapprovalId: preapprovalId,
            },
            }),
        ]);
        console.log(`[Webhook MP] ⛔ Tenant ${tenantId} bajado a FREE inmediatamente`);
        break;
        }

      default:
        console.log(`[Webhook MP] Estado no manejado: ${preapproval.status}`);
    }
  } catch (err) {
    console.error("[Webhook MP] handlePreapproval error:", err);
    throw err;
  }
}

// ── Handler: pago individual (cada cobro mensual) ─────────────────────────────

async function handlePayment(paymentId: string) {
  try {
    const payment = await getPayment(paymentId);

    if (!payment.preapproval_id) return; // pago no relacionado a suscripción

    const suscripcion = await prisma.suscripcion.findFirst({
      where: { mpPreapprovalId: payment.preapproval_id },
    });

    if (!suscripcion) {
      console.warn("[Webhook MP] No se encontró suscripción para preapproval:", payment.preapproval_id);
      return;
    }

    console.log(
      `[Webhook MP] Pago ${paymentId} → status=${payment.status} tenant=${suscripcion.tenantId}`
    );

    if (payment.status === "approved") {
      // Renovación mensual exitosa → extender vencimiento
      const proximoVencimiento = calcularProximoVencimiento();

      await prisma.$transaction([
        prisma.tenant.update({
          where: { id: suscripcion.tenantId },
          data: { plan: "PRO", activo: true },
        }),
        prisma.suscripcion.update({
          where: { tenantId: suscripcion.tenantId },
          data: {
            estado: "authorized",
            proximoVencimiento,
          },
        }),
      ]);

      console.log(
        `[Webhook MP] ✅ Renovación exitosa. Tenant ${suscripcion.tenantId} activo hasta ${proximoVencimiento.toISOString()}`
      );
    } else if (payment.status === "rejected") {
      // Pago rechazado → dejamos el estado pero no cortamos aún
      // MP reintentará. Si definitivamente falla, vendrá un evento del preapproval.
      await prisma.suscripcion.update({
        where: { tenantId: suscripcion.tenantId },
        data: { estado: "pending" },
      });
      console.warn(`[Webhook MP] ⚠️ Pago rechazado para tenant ${suscripcion.tenantId}`);
    }
  } catch (err) {
    console.error("[Webhook MP] handlePayment error:", err);
    throw err;
  }
}

// GET — para que MP pueda hacer health check del endpoint
export async function GET() {
  return NextResponse.json({ ok: true, service: "DevHub POS Webhook" });
}