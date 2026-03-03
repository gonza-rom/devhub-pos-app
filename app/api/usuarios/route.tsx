// app/api/usuarios/route.ts
// CRUD de usuarios del tenant.
// Solo PROPIETARIO puede acceder (verificado por el layout y acá también).

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── GET /api/usuarios — Listar usuarios del tenant ────────────────────────

export async function GET() {
  try {
    const { tenantId, rol } = await getTenantContext();

    if (rol !== "PROPIETARIO" && rol !== "ADMINISTRADOR") {
      return NextResponse.json({ ok: false, error: "Sin permisos" }, { status: 403 });
    }

    const [usuarios, tenant] = await Promise.all([
      prisma.usuarioTenant.findMany({
        where: { tenantId },
        select: { id: true, nombre: true, email: true, rol: true, activo: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { plan: true },
      }),
    ]);

    return NextResponse.json({ ok: true, data: usuarios, plan: tenant?.plan ?? "FREE" });
  } catch (error) {
    console.error("[GET /api/usuarios]", error);
    return NextResponse.json({ ok: false, error: "Error al obtener usuarios" }, { status: 500 });
  }
}

// ── POST /api/usuarios — Crear/invitar usuario ────────────────────────────
// Crea el user en Supabase Auth y lo vincula al tenant actual.
// Solo PROPIETARIO puede crear usuarios.

export async function POST(req: NextRequest) {
  try {
    const { tenantId, rol } = await getTenantContext();

    if (rol !== "PROPIETARIO") {
      return NextResponse.json(
        { ok: false, error: "Solo el propietario puede agregar usuarios" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { nombre, email, password, rol: rolUsuario } = body;

    if (!nombre?.trim() || !email?.trim() || !password || !rolUsuario) {
      return NextResponse.json(
        { ok: false, error: "Faltan campos: nombre, email, password, rolUsuario" },
        { status: 400 }
      );
    }

    if (!["ADMINISTRADOR", "EMPLEADO"].includes(rolUsuario)) {
      return NextResponse.json(
        { ok: false, error: "El rol debe ser ADMINISTRADOR o EMPLEADO" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { ok: false, error: "La contraseña debe tener al menos 8 caracteres" },
        { status: 400 }
      );
    }

    // Verificar límite de usuarios según plan
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true, _count: { select: { usuarios: { where: { activo: true } } } } },
    });

    const LIMITES: Record<string, number> = {
      FREE: 1, STARTER: 3, PRO: 10, ENTERPRISE: Infinity,
    };
    const limite = LIMITES[tenant?.plan ?? "FREE"];
    const actual = tenant?._count.usuarios ?? 0;

    if (actual >= limite) {
      return NextResponse.json(
        {
          ok: false,
          error: `Límite de usuarios alcanzado (${actual}/${limite}). Actualizá tu plan para agregar más.`,
        },
        { status: 403 }
      );
    }

    // Verificar que el email no esté ya en el tenant
    const existeEnTenant = await prisma.usuarioTenant.findFirst({
      where: { tenantId, email: email.trim().toLowerCase() },
    });
    if (existeEnTenant) {
      return NextResponse.json(
        { ok: false, error: "Ya existe un usuario con ese email en este comercio" },
        { status: 409 }
      );
    }

    // Crear user en Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
    });

    if (authError) {
      if (authError.message.includes("already registered")) {
        return NextResponse.json(
          { ok: false, error: "Ya existe una cuenta de Supabase con ese email" },
          { status: 409 }
        );
      }
      throw authError;
    }

    // Crear UsuarioTenant en Prisma
    const usuario = await prisma.usuarioTenant.create({
      data: {
        tenantId,
        supabaseId: authData.user.id,
        nombre: nombre.trim(),
        email: email.trim().toLowerCase(),
        rol: rolUsuario,
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ ok: true, data: usuario }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/usuarios]", error);
    return NextResponse.json(
      { ok: false, error: error.message ?? "Error al crear usuario" },
      { status: 500 }
    );
  }
}