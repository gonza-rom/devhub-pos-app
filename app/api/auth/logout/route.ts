// app/api/auth/logout/route.ts
// Cierra la sesión de Supabase y borra la cookie de tenant.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deleteTenantCookie } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();

    const response = NextResponse.json({ ok: true });
    deleteTenantCookie(response);

    return response;

  } catch (error) {
    console.error("[API /logout]", error);
    // Borrar la cookie igual, aunque falle el signOut de Supabase
    const response = NextResponse.json({ ok: true });
    deleteTenantCookie(response);
    return response;
  }
}

export const dynamic = "force-dynamic";