// app/api/auth/refresh-plan/route.ts
// Regenera la cookie de sesión con el plan actualizado.
// El front lo llama después de un pago exitoso para que el middleware
// vea el nuevo plan inmediatamente sin esperar al próximo login.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { crearTenantSession, setTenantCookie, getTenantSessionFromCookies } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    // Verificar que hay sesión activa
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

    const session = await getTenantSessionFromCookies();
    if (!session) return NextResponse.json({ ok: false, error: "Sin sesión de tenant" }, { status: 401 });

    // Leer el plan actualizado de la DB
    const [tenant, suscripcion] = await Promise.all([
      prisma.tenant.findUnique({
        where:  { id: session.tenantId },
        select: { plan: true },
      }),
      prisma.suscripcion.findUnique({
        where:  { tenantId: session.tenantId },
        select: { proximoVencimiento: true },
      }),
    ]);

    const plan = (tenant?.plan ?? "FREE") as "FREE" | "PRO" | "ENTERPRISE";
    const planVenceAt = suscripcion?.proximoVencimiento
      ? new Date(suscripcion.proximoVencimiento).getTime()
      : null;

    // Regenerar cookie con el plan nuevo
    const token = await crearTenantSession({
      tenantId:   session.tenantId,
      usuarioId:  session.usuarioId,
      rol:        session.rol,
      nombre:     session.nombre,
      plan,
      planVenceAt,
    });

    const response = NextResponse.json({ ok: true, plan });
    setTenantCookie(response, token);
    return response;

  } catch (error) {
    console.error("[refresh-plan]", error);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";