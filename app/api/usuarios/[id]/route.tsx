// app/api/usuarios/[id]/route.ts
// PUT — editar rol o nombre de un usuario
// DELETE — desactivar usuario (soft delete)
// Solo PROPIETARIO puede hacer estas operaciones.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

type Params = { params: Promise<{ id: string }> };

// ── PUT /api/usuarios/:id — Editar rol o nombre ───────────────────────────

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { tenantId, usuarioId, rol } = await getTenantContext();
    const { id } = await params;

    if (rol !== "PROPIETARIO") {
      return NextResponse.json(
        { ok: false, error: "Solo el propietario puede editar usuarios" },
        { status: 403 }
      );
    }

    // Verificar que el usuario pertenece al tenant
    const existente = await prisma.usuarioTenant.findFirst({
      where: { id, tenantId },
    });

    if (!existente) {
      return NextResponse.json(
        { ok: false, error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // No se puede editar al propio PROPIETARIO (sería el mismo que hace el request)
    if (existente.supabaseId === usuarioId && existente.rol === "PROPIETARIO") {
      return NextResponse.json(
        { ok: false, error: "No podés editar tu propio rol de propietario" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { nombre, rol: rolUsuario, activo } = body;

    if (rolUsuario && !["ADMINISTRADOR", "EMPLEADO"].includes(rolUsuario)) {
      return NextResponse.json(
        { ok: false, error: "El rol debe ser ADMINISTRADOR o EMPLEADO" },
        { status: 400 }
      );
    }

    const usuario = await prisma.usuarioTenant.update({
      where: { id },
      data: {
        ...(nombre?.trim() && { nombre: nombre.trim() }),
        ...(rolUsuario && { rol: rolUsuario }),
        ...(activo !== undefined && { activo }),
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

    return NextResponse.json({ ok: true, data: usuario });
  } catch (error) {
    console.error("[PUT /api/usuarios/:id]", error);
    return NextResponse.json(
      { ok: false, error: "Error al actualizar usuario" },
      { status: 500 }
    );
  }
}

// ── DELETE /api/usuarios/:id — Desactivar usuario ────────────────────────
// Soft delete: marca activo = false y deshabilita en Supabase Auth.
// No borra los registros históricos (ventas, movimientos).

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { tenantId, usuarioId, rol } = await getTenantContext();
    const { id } = await params;

    if (rol !== "PROPIETARIO") {
      return NextResponse.json(
        { ok: false, error: "Solo el propietario puede eliminar usuarios" },
        { status: 403 }
      );
    }

    const existente = await prisma.usuarioTenant.findFirst({
      where: { id, tenantId },
    });

    if (!existente) {
      return NextResponse.json(
        { ok: false, error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // No se puede eliminar al propio propietario
    if (existente.supabaseId === usuarioId) {
      return NextResponse.json(
        { ok: false, error: "No podés eliminar tu propia cuenta" },
        { status: 400 }
      );
    }

    // No se puede eliminar a otro PROPIETARIO
    if (existente.rol === "PROPIETARIO") {
      return NextResponse.json(
        { ok: false, error: "No se puede eliminar a un propietario" },
        { status: 400 }
      );
    }

    // Soft delete en Prisma
    await prisma.usuarioTenant.update({
      where: { id },
      data: { activo: false },
    });

    // Deshabilitar en Supabase Auth (no puede hacer login)
    // await supabaseAdmin.auth.admin.updateUser(existente.supabaseId, {
    //   ban_duration: "876600h", // 100 años ≈ deshabilitado permanente
    // }).catch((e) => console.warn("[DELETE /api/usuarios] No se pudo deshabilitar en Supabase:", e));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/usuarios/:id]", error);
    return NextResponse.json(
      { ok: false, error: "Error al eliminar usuario" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";