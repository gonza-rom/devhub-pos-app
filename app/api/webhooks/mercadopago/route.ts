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
import { emailPagoFallido } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const xSignature = req.headers.get("x-signature") ?? "";
    const xRequestId = req.headers.get("x-request-id") ?? "";
    const body: MPWebhookBody = await req.json();
    const dataId = body.data?.id ?? "";

    console.log("[MP Webhook] Recibido:", body.type, body.action, dataId);

    if (!xSignature) {
      console.warn("[MP Webhook] Request sin x-signature — rechazado");
      return NextResponse.json({ error: "Firma requerida" }, { status: 401 });
    }

    const valid = await verifyWebhookSignature(xSignature, xRequestId, dataId);
    if (!valid) {
      console.warn("[MP Webhook] Firma inválida — rechazado");
      return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
    }

    // ── Suscripción ───────────────────────────────────────────
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

      const tenantId    = suscripcion?.tenantId ?? preapproval.external_reference;
      if (!tenantId) {
        console.warn("[MP Webhook] No se pudo determinar el tenantId");
        return NextResponse.json({ ok: true });
      }

      const esPro       = preapproval.status === "authorized";
      const eraProAntes = suscripcion?.plan === "PRO";
      const nuevoVence  = esPro ? calcularProximoVencimiento() : null;

      await prisma.$transaction([
        prisma.suscripcion.update({
          where: { tenantId },
          data:  { estado: preapproval.status, plan: esPro ? "PRO" : "FREE", proximoVencimiento: nuevoVence },
        }),
        prisma.tenant.update({
          where: { id: tenantId },
          data:  { plan: esPro ? "PRO" : "FREE" },
        }),
      ]);

      revalidateTag("tenant-config");
      revalidateTag(`tenant-${tenantId}`);
      revalidateTag("dashboard");

      // Email pago fallido: era PRO y la suscripción fue cancelada o pausada
      if (eraProAntes && !esPro && ["cancelled", "paused"].includes(preapproval.status)) {
        const [tenant, propietario] = await Promise.all([
          prisma.tenant.findUnique({ where: { id: tenantId } }),
          prisma.usuarioTenant.findFirst({ where: { tenantId, rol: "PROPIETARIO", activo: true } }),
        ]);
        if (tenant && propietario) {
          await emailPagoFallido({
            emailDestino:   propietario.email,
            nombreComercio: tenant.nombre,
            nombreUsuario:  propietario.nombre,
          });
          console.log(`[MP Webhook] Email pago fallido → ${propietario.email}`);
        }
      }

      console.log(`[MP Webhook] Tenant ${tenantId} → ${esPro ? "PRO" : "FREE"} (${preapproval.status})`);
    }

    // ── Pago individual ───────────────────────────────────────
    if (body.type === "payment") {
      const payment = await getPayment(dataId);
      console.log("[MP Webhook] Pago:", payment.id, payment.status);

      // Pago aprobado → activar PRO
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
          console.log(`[MP Webhook] Pago aprobado → tenant ${suscripcion.tenantId} PRO`);
        }
      }

      // Pago rechazado → email aviso
      if (payment.status === "rejected" && payment.preapproval_id) {
        const suscripcion = await prisma.suscripcion.findFirst({
          where: { mpPreapprovalId: payment.preapproval_id },
        });
        if (suscripcion) {
          const [tenant, propietario] = await Promise.all([
            prisma.tenant.findUnique({ where: { id: suscripcion.tenantId } }),
            prisma.usuarioTenant.findFirst({ where: { tenantId: suscripcion.tenantId, rol: "PROPIETARIO", activo: true } }),
          ]);
          if (tenant && propietario) {
            await emailPagoFallido({
              emailDestino:   propietario.email,
              nombreComercio: tenant.nombre,
              nombreUsuario:  propietario.nombre,
            });
            console.log(`[MP Webhook] Email pago rechazado → ${propietario.email}`);
          }
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