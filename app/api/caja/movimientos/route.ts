import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

export async function POST(req: NextRequest) {
  try {
    const { tenantId, usuarioId, nombreUsuario: usuarioNombre } = await getTenantContext();
    const { tipo, monto, descripcion } = await req.json();
    if (!["INGRESO", "EGRESO"].includes(tipo))
      return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
    if (!monto || monto <= 0)
      return NextResponse.json({ error: "Monto debe ser mayor a 0" }, { status: 400 });
    if (!descripcion?.trim())
      return NextResponse.json({ error: "Descripción obligatoria" }, { status: 400 });

    const cajaAbierta = await prisma.caja.findFirst({ where: { tenantId, estado: "ABIERTA" } });
    if (!cajaAbierta) return NextResponse.json({ error: "No hay caja abierta" }, { status: 404 });

    const movimiento = await prisma.movimientoCaja.create({
      data: { tenantId, cajaId: cajaAbierta.id, tipo, monto,
        descripcion: descripcion.trim(), usuarioId, usuarioNombre },
    });
    return NextResponse.json({ movimiento }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Error al registrar movimiento" }, { status: 500 });
  }
}