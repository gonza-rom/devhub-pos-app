// app/api/auth/registro/route.ts
// ACTUALIZADO: incluye plan y planVenceAt en la cookie de sesión

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";
import { toSlug } from "@/lib/utils";
import { crearTenantSession, setTenantCookie } from "@/lib/session";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nombreComercio, nombreUsuario, email, password } = body;

    if (!nombreComercio || !nombreUsuario || !email || !password)
      return NextResponse.json({ ok: false, error: "Todos los campos son requeridos" }, { status: 400 });
    if (password.length < 8)
      return NextResponse.json({ ok: false, error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 });

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      if (authError.message.includes("already registered"))
        return NextResponse.json({ ok: false, error: "Ya existe una cuenta con ese email" }, { status: 409 });
      throw authError;
    }

    const supabaseUserId = authData.user.id;
    const slug = await generarSlugUnico(nombreComercio);

    const { tenant, usuarioTenant } = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { nombre: nombreComercio, email, slug, plan: "FREE" },
      });
      const usuarioTenant = await tx.usuarioTenant.create({
        data: { tenantId: tenant.id, supabaseId: supabaseUserId, nombre: nombreUsuario, email, rol: "PROPIETARIO" },
      });
      await tx.suscripcion.create({
        data: { tenantId: tenant.id, plan: "FREE", estado: "authorized" },
      });
      return { tenant, usuarioTenant };
    });

    // ✅ FREE nunca vence — planVenceAt = null
    const token = await crearTenantSession({
      tenantId:   tenant.id,
      usuarioId:  supabaseUserId,
      rol:        usuarioTenant.rol,
      nombre:     usuarioTenant.nombre,
      plan:       "FREE",
      planVenceAt: null,
    });

    const response = NextResponse.json({ ok: true }, { status: 201 });
    setTenantCookie(response, token);
    return response;

  } catch (error) {
    console.error("[API /registro] Error:", error);
    return NextResponse.json({ ok: false, error: "Error interno del servidor" }, { status: 500 });
  }
}

async function generarSlugUnico(nombre: string): Promise<string> {
  const base = toSlug(nombre);
  let slug = base;
  let contador = 2;
  while (await prisma.tenant.findUnique({ where: { slug } })) {
    slug = `${base}-${contador}`;
    contador++;
  }
  return slug;
}

export const dynamic = "force-dynamic";