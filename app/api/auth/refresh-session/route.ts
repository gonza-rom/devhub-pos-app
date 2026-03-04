// app/api/auth/refresh-session/route.ts
// ACTUALIZADO: incluye plan y planVenceAt en la cookie de sesión

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { crearTenantSession, setTenantCookie } from "@/lib/session";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const redirectTo = searchParams.get("redirect") ?? "/dashboard";

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }

    const usuarioTenant = await prisma.usuarioTenant.findUnique({
      where:  { supabaseId: user.id },
      select: { tenantId: true, rol: true, nombre: true, activo: true },
    });

    if (!usuarioTenant || !usuarioTenant.activo) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }

    // ✅ Obtener plan y vencimiento para incluirlos en la cookie
    const [tenant, suscripcion] = await Promise.all([
      prisma.tenant.findUnique({
        where:  { id: usuarioTenant.tenantId },
        select: { plan: true },
      }),
      prisma.suscripcion.findUnique({
        where:  { tenantId: usuarioTenant.tenantId },
        select: { proximoVencimiento: true, estado: true },
      }),
    ]);

    const plan = (tenant?.plan ?? "FREE") as "FREE" | "PRO" | "ENTERPRISE";
    const planVenceAt = suscripcion?.proximoVencimiento
      ? new Date(suscripcion.proximoVencimiento).getTime()
      : null;

    const token = await crearTenantSession({
      tenantId:  usuarioTenant.tenantId,
      usuarioId: user.id,
      rol:       usuarioTenant.rol,
      nombre:    usuarioTenant.nombre,
      plan,
      planVenceAt,
    });

    const response = NextResponse.redirect(new URL(redirectTo, req.url));
    setTenantCookie(response, token);
    return response;

  } catch (error) {
    console.error("[refresh-session]", error);
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }
}

export const dynamic = "force-dynamic";