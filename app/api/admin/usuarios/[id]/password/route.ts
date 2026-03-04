// app/api/admin/usuarios/[id]/password/route.ts
// Cambia la contraseña de un usuario via Supabase Admin API
// Solo accesible con cookie de superadmin

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/admin-auth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params; // supabaseId del usuario
    const { password } = await req.json();

    if (!password || password.length < 6) {
      return NextResponse.json(
        { ok: false, error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
      password,
    });

    if (error) {
      console.error("[PATCH /api/admin/usuarios/[id]/password]", error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[PATCH /api/admin/usuarios/[id]/password]", err);
    return NextResponse.json(
      { ok: false, error: "No autorizado" },
      { status: 401 }
    );
  }
}