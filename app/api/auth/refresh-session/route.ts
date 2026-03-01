// app/api/auth/refresh-session/route.ts
// Se llama cuando el middleware detecta que hay sesión de Supabase
// pero no hay cookie de tenant (cookie expirada o primer login post-deploy).
// Busca el tenant en la DB, genera una nueva cookie y redirige al destino.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { crearTenantSession, setTenantCookie } from "@/lib/session";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const redirectTo = searchParams.get("redirect") ?? "/dashboard";

  try {
    // Obtener el usuario de Supabase
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }

    // Buscar el tenant del usuario en la DB
    const usuarioTenant = await prisma.usuarioTenant.findUnique({
      where: { supabaseId: user.id },
      select: { tenantId: true, rol: true, nombre: true, activo: true },
    });

    if (!usuarioTenant || !usuarioTenant.activo) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }

    // Crear nueva cookie firmada
    const token = await crearTenantSession({
      tenantId:  usuarioTenant.tenantId,
      usuarioId: user.id,
      rol:       usuarioTenant.rol,
      nombre:    usuarioTenant.nombre,
    });

    const response = NextResponse.redirect(new URL(redirectTo, req.url));
    setTenantCookie(response, token);

    return response;

  } catch (error) {
    console.error("[refresh-session]", error);
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }
}