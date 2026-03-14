// app/api/caja/historial/route.ts
// Devuelve el historial de cajas cerradas con paginación
// ✅ FIXED: Filtrar por turno y devolver campo turno
 
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";
 
export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await getTenantContext();
    const { searchParams } = new URL(req.url);
 
    const page  = parseInt(searchParams.get("page")  ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const desde = searchParams.get("desde");
    const hasta = searchParams.get("hasta");
    const turno = searchParams.get("turno");  // ✨ NUEVO
 
    const where: any = {
      tenantId,
      estado: "CERRADA",
      ...(desde || hasta ? {
        abiertaAt: {
          ...(desde && { gte: new Date(desde) }),
          ...(hasta && { lte: new Date(hasta + "T23:59:59") }),
        },
      } : {}),
      ...(turno && { turno }),  // ✨ NUEVO: Filtrar por turno
    };
 
    const [cajas, total] = await Promise.all([
      prisma.caja.findMany({
        where,
        select: {  // ✨ SELECT EXPLÍCITO
          id: true,
          usuarioNombre: true,
          turno: true,  // ✨ NUEVO
          saldoInicial: true,
          saldoFinal: true,
          saldoContado: true,
          diferencia: true,
          observaciones: true,
          abiertaAt: true,
          cerradaAt: true,
          movimientos: {
            select: {
              id: true, 
              tipo: true, 
              monto: true,
              metodoPago: true, 
              descripcion: true,
              usuarioNombre: true, 
              createdAt: true,
            },
            orderBy: { createdAt: "asc" },
            take: 100,
          },
        },
        orderBy: { cerradaAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.caja.count({ where }),
    ]);
 
    // Calcular totales por caja
    const cajasConTotales = cajas.map((caja) => {
      const movs = caja.movimientos;
      const totalEfectivo  = movs.filter(m => m.tipo === "VENTA_EFECTIVO").reduce((s, m) => s + m.monto, 0);
      const totalVirtuales = movs.filter(m => m.tipo === "VENTA_VIRTUAL").reduce((s, m) => s + m.monto, 0);
      const totalIngresos  = movs.filter(m => m.tipo === "INGRESO").reduce((s, m) => s + m.monto, 0);
      const totalEgresos   = movs.filter(m => m.tipo === "EGRESO").reduce((s, m) => s + m.monto, 0);
      const cantidadVentas = movs.filter(m => m.tipo === "VENTA_EFECTIVO" || m.tipo === "VENTA_VIRTUAL").length;
 
      return {
        id:             caja.id,
        usuarioNombre:  caja.usuarioNombre,
        turno:          caja.turno,  // ✨ NUEVO
        saldoInicial:   caja.saldoInicial,
        saldoFinal:     caja.saldoFinal,
        saldoContado:   caja.saldoContado,
        diferencia:     caja.diferencia,
        observaciones:  caja.observaciones,
        abiertaAt:      caja.abiertaAt,
        cerradaAt:      caja.cerradaAt,
        totalEfectivo,
        totalVirtuales,
        totalIngresos,
        totalEgresos,
        cantidadVentas,
        movimientos:    movs,
      };
    });
 
    return NextResponse.json({
      ok:   true,
      data: cajasConTotales,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
 
  } catch (err: any) {
    console.error("[GET /api/caja/historial]", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tenantId, usuarioId, nombreUsuario: usuarioNombre } = await getTenantContext();
    const { saldoInicial = 0, observaciones } = await req.json();
 
    // ✨ NUEVO: Obtener el saldo contado de la última caja cerrada
    const ultimaCajaCerrada = await prisma.caja.findFirst({
      where: { tenantId, estado: "CERRADA" },
      select: { saldoContado: true },
      orderBy: { cerradaAt: "desc" },
    });
 
    // ✨ NUEVO: Usar saldo heredado o el proporcionado
    const saldoInicialFinal = ultimaCajaCerrada?.saldoContado ?? saldoInicial;
 
    // Validación
    if (saldoInicialFinal < 0) {
      return NextResponse.json({ error: "Saldo inválido" }, { status: 400 });
    }
 
    // Verificar caja abierta
    const yaAbierta = await prisma.caja.findFirst({
      where:  { tenantId, estado: "ABIERTA" },
      select: { id: true },
    });
    if (yaAbierta) {
      return NextResponse.json({ error: "Ya hay una caja abierta" }, { status: 409 });
    }
 
    const caja = await prisma.$transaction(async (tx) => {
      const nueva = await tx.caja.create({
        data: { 
          tenantId, 
          usuarioId, 
          usuarioNombre, 
          saldoInicial: saldoInicialFinal,  // ← USAR SALDO HEREDADO
          observaciones, 
          estado: "ABIERTA" 
        },
        select: { 
          id: true, 
          saldoInicial: true, 
          usuarioNombre: true, 
          abiertaAt: true, 
          estado: true 
        },
      });
      
      await tx.movimientoCaja.create({
        data: {
          tenantId, 
          cajaId: nueva.id, 
          tipo: "APERTURA", 
          monto: saldoInicialFinal,
          descripcion: ultimaCajaCerrada 
            ? `Apertura con $${saldoInicialFinal.toFixed(2)} (heredado del cierre anterior)`
            : `Apertura con $${saldoInicialFinal.toFixed(2)}`,
          usuarioId, 
          usuarioNombre,
        },
      });
      
      return nueva;
    });
 
    return NextResponse.json({ caja }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/caja]", error);
    return NextResponse.json({ error: "Error al abrir caja" }, { status: 500 });
  }
}


export const dynamic = "force-dynamic";