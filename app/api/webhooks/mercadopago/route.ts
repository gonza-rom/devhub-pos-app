// app/api/webhooks/mercadopago/route.ts
// ARREGLADO: conflicto de merge resuelto
// Este archivo es el webhook que MP llama cuando cambia el estado de una suscripción.

import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  getPreapproval,
  getPayment,
  verifyWebhookSignature,
  calcularProximoVencimiento,
  type MPWebhookBody,
} from "@/lib/mercadopago";

// POST — MP llama este endpoint cuando hay un evento de suscripción o pago
export async function POST(req: NextRequest) {
  try {
    // Verificar firma HMAC si está configurada
    const xSignature = req.headers.get("x-signature") ?? "";
    const xRequestId = req.headers.get("x-request-id") ?? "";

    const body: MPWebhookBody = await req.json();
    const dataId = body.data?.id ?? "";

    console.log("[MP Webhook] Recibido:", body.type, body.action, dataId);

    if (xSignature) {
      const valid = await verifyWebhookSignature(xSignature, xRequestId, dataId);
      if (!valid) {
        console.warn("[MP Webhook] Firma inválida");
        return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
      }
    }

    // ── Evento de suscripción (preapproval) ──────────────────────────────
    if (body.type === "subscription_preapproval") {
      const preapproval = await getPreapproval(dataId);

      const suscripcion = await prisma.suscripcion.findFirst({
        where: { mpPreapprovalId: preapproval.id },
      });

      if (!suscripcion) {
        // Buscar por external_reference (tenantId)
        const byRef = preapproval.external_reference
          ? await prisma.suscripcion.findFirst({
              where: { tenantId: preapproval.external_reference },
            })
          : null;

        if (!byRef) {
          console.warn("[MP Webhook] Suscripción no encontrada para preapproval:", dataId);
          return NextResponse.json({ ok: true }); // siempre 200 para que MP no reintente
        }

        // Asociar el preapprovalId si no estaba
        await prisma.suscripcion.update({
          where: { tenantId: byRef.tenantId },
          data: { mpPreapprovalId: preapproval.id },
        });
      }

      const tenantId = suscripcion?.tenantId ?? preapproval.external_reference;
      if (!tenantId) {
        console.warn("[MP Webhook] No se pudo determinar el tenantId");
        return NextResponse.json({ ok: true });
      }

      const nuevoEstado = preapproval.status; // "authorized" | "paused" | "cancelled" | "pending"
      const esPro = nuevoEstado === "authorized";

      await prisma.$transaction([
        prisma.suscripcion.update({
          where: { tenantId },
          data: {
            estado:              nuevoEstado,
            plan:                esPro ? "PRO" : "FREE",
            proximoVencimiento:  esPro ? calcularProximoVencimiento() : null,
          },
        }),
        prisma.tenant.update({
          where: { id: tenantId },
          data: { plan: esPro ? "PRO" : "FREE" },
        }),
      ]);

      // ✅ Invalidar cache del layout y tenant-config para reflejar el nuevo plan
      revalidateTag("tenant-config");
      revalidateTag(`tenant-${tenantId}`);

      console.log(`[MP Webhook] Tenant ${tenantId} actualizado a plan: ${esPro ? "PRO" : "FREE"} (estado: ${nuevoEstado})`);
    }

    // ── Evento de pago ────────────────────────────────────────────────────
    if (body.type === "payment") {
      const payment = await getPayment(dataId);
      console.log("[MP Webhook] Pago recibido:", payment.id, payment.status);

      if (payment.status === "approved" && payment.preapproval_id) {
        const suscripcion = await prisma.suscripcion.findFirst({
          where: { mpPreapprovalId: payment.preapproval_id },
        });

        if (suscripcion) {
          await prisma.$transaction([
            prisma.suscripcion.update({
              where: { tenantId: suscripcion.tenantId },
              data: {
                estado:             "authorized",
                plan:               "PRO",
                proximoVencimiento: calcularProximoVencimiento(),
              },
            }),
            prisma.tenant.update({
              where: { id: suscripcion.tenantId },
              data: { plan: "PRO" },
            }),
          ]);

          revalidateTag("tenant-config");
          revalidateTag(`tenant-${suscripcion.tenantId}`);

          console.log(`[MP Webhook] Pago aprobado — tenant ${suscripcion.tenantId} activado PRO`);
        }
      }
    }

    // Siempre responder 200 — MP reintenta si recibe 4xx/5xx
    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error("[MP Webhook] Error:", error);
    // Responder 200 igual para evitar reintentos de MP con el mismo payload roto
    return NextResponse.json({ ok: true });
  }
}

// GET — health check para que MP pueda verificar que el endpoint existe
export async function GET() {
  return NextResponse.json({ ok: true, service: "DevHub POS Webhook" });
}

export const dynamic = "force-dynamic";