// app/api/auth/refresh-session/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { crearTenantSession, setTenantCookie } from "@/lib/session";
import { toSlug } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const redirectTo = searchParams.get("redirect") ?? "/dashboard";

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }

    let usuarioTenant = await prisma.usuarioTenant.findUnique({
      where:  { supabaseId: user.id },
      select: { tenantId: true, rol: true, nombre: true, activo: true },
    });

    if (!usuarioTenant) {
      const nombre         = user.user_metadata?.nombre        ?? "Usuario";
      const nombreComercio = user.user_metadata?.nombreComercio ?? "Mi Comercio";

      const base = toSlug(nombreComercio);
      let slug = base, contador = 2;
      while (await prisma.tenant.findUnique({ where: { slug } })) {
        slug = `${base}-${contador++}`;
      }

      const telefono = user.user_metadata?.telefono?.trim() || null;

      await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          nombre: nombreComercio,
          email: user.email!,
          slug,
          plan: "FREE",
          trialVenceAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          telefono,
        },
      });
        await tx.usuarioTenant.create({
          data: {
            tenantId:   tenant.id,
            supabaseId: user.id,
            nombre,
            email:      user.email!,
            rol:        "PROPIETARIO",
          },
        });
        await tx.suscripcion.create({
          data: { tenantId: tenant.id, plan: "FREE", estado: "authorized" },
        });
      });

      usuarioTenant = await prisma.usuarioTenant.findUnique({
        where:  { supabaseId: user.id },
        select: { tenantId: true, rol: true, nombre: true, activo: true },
      });
    }

    if (!usuarioTenant || !usuarioTenant.activo) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }

    const [tenant, suscripcion] = await Promise.all([
      prisma.tenant.findUnique({
        where:  { id: usuarioTenant.tenantId },
        select: { plan: true, trialVenceAt: true, createdAt: true }, // ← agregar campos
      }),
      prisma.suscripcion.findUnique({
        where:  { tenantId: usuarioTenant.tenantId },
        select: { proximoVencimiento: true, estado: true },
      }),
    ]);

    const plan = (tenant?.plan ?? "FREE") as "FREE" | "PRO" | "ENTERPRISE";

    // ← Para FREE usar trialVenceAt, para PRO/ENTERPRISE usar proximoVencimiento
    const planVenceAt =
      plan !== "FREE"
        ? suscripcion?.proximoVencimiento?.getTime() ?? null
        : tenant?.trialVenceAt?.getTime()
          ?? (tenant?.createdAt
            ? new Date(tenant.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000
            : null);

    const token = await crearTenantSession({
      tenantId:  usuarioTenant.tenantId,
      usuarioId: user.id,
      rol:       usuarioTenant.rol,
      nombre:    usuarioTenant.nombre,
      plan,
      planVenceAt,
    });

    const response = NextResponse.redirect(new URL(redirectTo, req.url));
    setTenantCookie(response, token);
    return response;

  } catch (error) {
    console.error("[refresh-session]", error);
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }
}

export const dynamic = "force-dynamic";