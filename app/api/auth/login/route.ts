// app/api/auth/login/route.ts
// Optimizado: solo hace Supabase auth. El tenant lo lee el layout desde cache.
// Antes: Supabase auth + Prisma query = ~800ms
// Ahora: solo Supabase auth = ~350-500ms

import { NextRequest, NextResponse } from "next/server";
import { createClient }              from "@/lib/supabase/server";

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

    // ✅ Nada más. Supabase ya seteó la cookie de sesión.
    // El layout hace getTenantCached(user.id) que estará en cache
    // desde el primer load, o tarda ~50ms si es primera vez.
    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error("[POST /api/auth/login]", err);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}