// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { toSlug } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "Email y contraseña requeridos" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      return NextResponse.json(
        { ok: false, error: "Email o contraseña incorrectos" },
        { status: 401 }
      );
    }

    if (!data.user.email_confirmed_at) {
      return NextResponse.json(
        { ok: false, error: "Confirmá tu email antes de ingresar. Revisá tu bandeja de entrada." },
        { status: 401 }
      );
    }

    // ── Crear tenant si no existe (callback falló pero email ya confirmado) ──
    const existente = await prisma.usuarioTenant.findUnique({
      where: { supabaseId: data.user.id },
    });

    if (!existente) {
      const nombre         = data.user.user_metadata?.nombre        ?? "Usuario";
      const nombreComercio = data.user.user_metadata?.nombreComercio ?? "Mi Comercio";

      const base = toSlug(nombreComercio);
      let slug = base, contador = 2;
      while (await prisma.tenant.findUnique({ where: { slug } })) {
        slug = `${base}-${contador++}`;
      }

      await prisma.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
          data: { nombre: nombreComercio, email: data.user.email!, slug, plan: "FREE" },
        });
        await tx.usuarioTenant.create({
          data: {
            tenantId:   tenant.id,
            supabaseId: data.user.id,
            nombre,
            email:      data.user.email!,
            rol:        "PROPIETARIO",
          },
        });
        await tx.suscripcion.create({
          data: { tenantId: tenant.id, plan: "FREE", estado: "authorized" },
        });
      });
    }

    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error("[POST /api/auth/login]", err);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}