// app/api/auth/registro/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nombreComercio, nombreUsuario, email, password } = body;

    if (!nombreComercio || !nombreUsuario || !email || !password)
      return NextResponse.json({ ok: false, error: "Todos los campos son requeridos" }, { status: 400 });
    if (password.length < 8)
      return NextResponse.json({ ok: false, error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 });

    const supabase = await createServerClient();
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre: nombreUsuario, nombreComercio },  // ← ambos en metadata
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    });

    if (authError) {
      if (authError.message.includes("already registered"))
        return NextResponse.json({ ok: false, error: "Ya existe una cuenta con ese email" }, { status: 409 });
      throw authError;
    }

    if (!authData.user?.identities?.length) {
      return NextResponse.json({ ok: false, error: "Ya existe una cuenta con ese email" }, { status: 409 });
    }

    // Tenant se crea en /auth/callback después de confirmar el email
    return NextResponse.json({ ok: true }, { status: 201 });

  } catch (error) {
    console.error("[API /registro] Error:", error);
    return NextResponse.json({ ok: false, error: "Error interno del servidor" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";