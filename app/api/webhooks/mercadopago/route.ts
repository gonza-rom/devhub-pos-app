// app/api/webhooks/mercadopago/route.ts

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

export async function POST(req: NextRequest) {
  try {
    const xSignature = req.headers.get("x-signature") ?? "";
    const xRequestId = req.headers.get("x-request-id") ?? "";
    const body: MPWebhookBody = await req.json();
    const dataId = body.data?.id ?? "";

    console.log("[MP Webhook] Recibido:", body.type, body.action, dataId);

    // ── Verificación de firma obligatoria ────────────────────────────────
    // Rechazar si no viene la firma O si la firma es inválida.
    // En desarrollo sin MP_WEBHOOK_SECRET configurado, verifyWebhookSignature
    // devuelve true para no bloquear el desarrollo local.
    if (!xSignature) {
      console.warn("[MP Webhook] Request sin x-signature — rechazado");
      return NextResponse.json({ error: "Firma requerida" }, { status: 401 });
    }

    const valid = await verifyWebhookSignature(xSignature, xRequestId, dataId);
    if (!valid) {
      console.warn("[MP Webhook] Firma inválida — rechazado");
      return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
    }
    // ─────────────────────────────────────────────────────────────────────

    if (body.type === "subscription_preapproval") {
      const preapproval = await getPreapproval(dataId);

      let suscripcion = await prisma.suscripcion.findFirst({
        where: { mpPreapprovalId: preapproval.id },
      });

      if (!suscripcion && preapproval.external_reference) {
        suscripcion = await prisma.suscripcion.findFirst({
          where: { tenantId: preapproval.external_reference },
        });
        if (suscripcion) {
          await prisma.suscripcion.update({
            where: { tenantId: suscripcion.tenantId },
            data:  { mpPreapprovalId: preapproval.id },
          });
        }
      }

      const tenantId = suscripcion?.tenantId ?? preapproval.external_reference;
      if (!tenantId) {
        console.warn("[MP Webhook] No se pudo determinar el tenantId");
        return NextResponse.json({ ok: true });
      }

      const esPro      = preapproval.status === "authorized";
      const nuevoVence = esPro ? calcularProximoVencimiento() : null;

      await prisma.$transaction([
        prisma.suscripcion.update({
          where: { tenantId },
          data: {
            estado:             preapproval.status,
            plan:               esPro ? "PRO" : "FREE",
            proximoVencimiento: nuevoVence,
          },
        }),
        prisma.tenant.update({
          where: { id: tenantId },
          data:  { plan: esPro ? "PRO" : "FREE" },
        }),
      ]);

      revalidateTag("tenant-config");
      revalidateTag(`tenant-${tenantId}`);
      revalidateTag("dashboard");

      console.log(`[MP Webhook] Tenant ${tenantId} → plan: ${esPro ? "PRO" : "FREE"} (${preapproval.status})`);
    }

    if (body.type === "payment") {
      const payment = await getPayment(dataId);
      console.log("[MP Webhook] Pago:", payment.id, payment.status);

      if (payment.status === "approved" && payment.preapproval_id) {
        const suscripcion = await prisma.suscripcion.findFirst({
          where: { mpPreapprovalId: payment.preapproval_id },
        });

        if (suscripcion) {
          const nuevoVence = calcularProximoVencimiento();
          await prisma.$transaction([
            prisma.suscripcion.update({
              where: { tenantId: suscripcion.tenantId },
              data:  { estado: "authorized", plan: "PRO", proximoVencimiento: nuevoVence },
            }),
            prisma.tenant.update({
              where: { id: suscripcion.tenantId },
              data:  { plan: "PRO" },
            }),
          ]);

          revalidateTag("tenant-config");
          revalidateTag(`tenant-${suscripcion.tenantId}`);
          revalidateTag("dashboard");

          console.log(`[MP Webhook] Pago aprobado → tenant ${suscripcion.tenantId} activado PRO`);
        }
      }
    }

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error("[MP Webhook] Error:", error);
    return NextResponse.json({ ok: true }); // siempre 200 para que MP no reintente
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "DevHub POS Webhook" });
}

export const dynamic = "force-dynamic";