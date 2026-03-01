// app/api/auth/registro/route.ts
// Crea el usuario en Supabase Auth + el Tenant y UsuarioTenant en Prisma
// Es una transaction: si algo falla, todo se revierte

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";
import { toSlug } from "@/lib/utils";

// Usamos el service role para crear el user en Supabase desde el servidor
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nombreComercio, nombreUsuario, email, password } = body;

    // Validaciones básicas
    if (!nombreComercio || !nombreUsuario || !email || !password) {
      return NextResponse.json({ ok: false, error: "Todos los campos son requeridos" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ ok: false, error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 });
    }

    // 1. Crear user en Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Sin verificación por email en desarrollo
    });

    if (authError) {
      if (authError.message.includes("already registered")) {
        return NextResponse.json({ ok: false, error: "Ya existe una cuenta con ese email" }, { status: 409 });
      }
      throw authError;
    }

    const supabaseUserId = authData.user.id;

    // 2. Crear Tenant + UsuarioTenant en Prisma (transacción)
    const slug = await generarSlugUnico(nombreComercio);

    await prisma.$transaction(async (tx) => {
      // Crear el tenant (el comercio)
      const tenant = await tx.tenant.create({
        data: {
          nombre: nombreComercio,
          email,
          slug,
          plan: "FREE",
        },
      });

      // Crear el usuario vinculado al tenant como PROPIETARIO
      await tx.usuarioTenant.create({
        data: {
          tenantId: tenant.id,
          supabaseId: supabaseUserId,
          nombre: nombreUsuario,
          email,
          rol: "PROPIETARIO",
        },
      });

      // Crear la suscripción FREE inicial
      await tx.suscripcion.create({
        data: {
          tenantId: tenant.id,
          plan: "FREE",
          estado: "authorized",
        },
      });
    });

    return NextResponse.json({ ok: true }, { status: 201 });

  } catch (error) {
    console.error("[API /registro] Error:", error);
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// Genera un slug único. Si "jmr" ya existe, prueba "jmr-2", "jmr-3", etc.
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
