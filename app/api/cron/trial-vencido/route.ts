// app/api/cron/trial-vencido/route.ts
// Vercel Cron Job — se ejecuta diariamente a las 9AM AR
// Envía emails a tenants con trial vencido o por vencer (día 5)
// Configurado en vercel.json

import { NextRequest, NextResponse } from "next/server";
import { prisma }                    from "@/lib/prisma";
import { emailTrialVencido, emailTrialPorVencer } from "@/lib/email";

export async function GET(req: NextRequest) {
  // Verificar que el request viene de Vercel Cron
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const ahora    = new Date();
  const enviados = { vencidos: 0, porVencer: 0, errores: 0 };

  try {
    // Buscar tenants en FREE con trial activo
    // Trial = createdAt + 7 días desde la creación del tenant
    // Solo los que no tienen suscripción PRO activa

    const tenants = await prisma.tenant.findMany({
      where: {
        plan:   "FREE",
        activo: true,
      },
      include: {
        suscripcion: true,
        usuarios: {
          where: { rol: "PROPIETARIO", activo: true },
          take:  1,
        },
      },
    });

    for (const tenant of tenants) {
      const propietario = tenant.usuarios[0];
      if (!propietario) continue;

      // Calcular días desde creación (trial de 7 días)
      const msDesdeCreacion = ahora.getTime() - tenant.createdAt.getTime();
      const diasDesdeCreacion = Math.floor(msDesdeCreacion / (1000 * 60 * 60 * 24));
      const diasRestantes = 7 - diasDesdeCreacion;

      // Ya tiene suscripción PRO activa → no enviar
      if (tenant.suscripcion?.plan === "PRO" && tenant.suscripcion?.estado === "authorized") continue;

      // Trial vencido hoy (exactamente día 7)
      if (diasDesdeCreacion === 7) {
        try {
          await emailTrialVencido({
            emailDestino:   propietario.email,
            nombreComercio: tenant.nombre,
            nombreUsuario:  propietario.nombre,
          });
          enviados.vencidos++;
          console.log(`[Cron] Trial vencido → ${propietario.email}`);
        } catch { enviados.errores++; }
      }

      // Trial por vencer — día 5 (quedan 2 días)
      if (diasDesdeCreacion === 5) {
        try {
          await emailTrialPorVencer({
            emailDestino:   propietario.email,
            nombreComercio: tenant.nombre,
            nombreUsuario:  propietario.nombre,
            diasRestantes:  2,
          });
          enviados.porVencer++;
          console.log(`[Cron] Trial por vencer (2 días) → ${propietario.email}`);
        } catch { enviados.errores++; }
      }
    }

    console.log(`[Cron trial-vencido] Resultado:`, enviados);
    return NextResponse.json({ ok: true, ...enviados });

  } catch (error) {
    console.error("[Cron trial-vencido] Error:", error);
    return NextResponse.json({ ok: false, error: "Error en cron" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";