// app/api/auth/login/route.ts
// Hace el login con Supabase desde el servidor y setea la cookie de tenant.
// El LoginForm del cliente llama a este endpoint en vez de llamar
// a supabase.auth.signInWithPassword() directamente.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { crearTenantSession, setTenantCookie } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ ok: false, error: "Email y contraseña requeridos" }, { status: 400 });
    }

    // 1. Login con Supabase
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      return NextResponse.json(
        { ok: false, error: "Email o contraseña incorrectos" },
        { status: 401 }
      );
    }

    // 2. Buscar el tenant del usuario
    const usuarioTenant = await prisma.usuarioTenant.findUnique({
      where: { supabaseId: data.user.id },
      select: { tenantId: true, rol: true, nombre: true, activo: true },
    });

    if (!usuarioTenant || !usuarioTenant.activo) {
      return NextResponse.json({ ok: false, error: "Usuario sin comercio activo", code: "NO_TENANT" }, { status: 403 });
    }

    // 3. Crear y setear la cookie de tenant firmada
    const token = await crearTenantSession({
      tenantId:  usuarioTenant.tenantId,
      usuarioId: data.user.id,
      rol:       usuarioTenant.rol,
      nombre:    usuarioTenant.nombre,
    });

    const response = NextResponse.json({ ok: true });
    setTenantCookie(response, token);

    return response;

  } catch (error) {
    console.error("[API /login]", error);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}