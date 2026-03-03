import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const { secret } = await req.json();

  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Clave incorrecta" }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set("devhub-admin-session", process.env.ADMIN_SECRET!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8, // 8 horas
    path: "/",
  });

  return NextResponse.json({ ok: true });
}