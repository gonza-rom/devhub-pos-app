// app/api/caja/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";
import { detectarTurno } from "@/lib/turnos";

type MovCaja = {
  tipo:       string;
  monto:      number;
  metodoPago: string | null;
};

function calcularTotales(movimientos: MovCaja[]) {
  let saldoInicial = 0, totalEfectivo = 0, totalIngresos = 0, totalEgresos = 0;
  let totalTransferencia = 0, totalMercadoPago = 0;
  let totalTarjetaCredito = 0, totalTarjetaDebito = 0;

  for (const m of movimientos) {
    switch (m.tipo) {
      case "APERTURA":       saldoInicial = m.monto; break;
      case "VENTA_EFECTIVO": totalEfectivo += m.monto; break;
      case "INGRESO":        totalIngresos += m.monto; break;
      case "EGRESO":         totalEgresos  += m.monto; break;
      case "VENTA_VIRTUAL": {
        const metodo = (m.metodoPago || "").toUpperCase();
        if (metodo === "TRANSFERENCIA")                                                    totalTransferencia  += m.monto;
        else if (metodo === "QR" || metodo === "MERCADOPAGO" || metodo === "MERCADO_PAGO") totalMercadoPago    += m.monto;
        else if (metodo === "CREDITO" || metodo === "TARJETA_CREDITO")                     totalTarjetaCredito += m.monto;
        else if (metodo === "DEBITO"  || metodo === "TARJETA_DEBITO")                      totalTarjetaDebito  += m.monto;
        break;
      }
    }
  }

  return {
    saldoInicial, totalEfectivo, totalIngresos, totalEgresos,
    totalTransferencia, totalMercadoPago, totalTarjetaCredito, totalTarjetaDebito,
    totalVirtuales: totalTransferencia + totalMercadoPago,
    totalTarjetas:  totalTarjetaCredito + totalTarjetaDebito,
    saldoActual:    saldoInicial + totalEfectivo + totalIngresos - totalEgresos,
  };
}

const SELECT_MOVIMIENTOS = {
  id: true, tipo: true, monto: true, descripcion: true,
  metodoPago: true, ventaId: true, usuarioNombre: true, createdAt: true,
} as const;

export async function GET() {
  try {
    const { tenantId } = await getTenantContext();

    const caja = await prisma.caja.findFirst({
      where: { tenantId, estado: "ABIERTA" },
      select: {
        id: true, saldoInicial: true, usuarioNombre: true,
        abiertaAt: true, estado: true, observaciones: true,
        movimientos: { select: SELECT_MOVIMIENTOS, orderBy: { createdAt: "desc" }, take: 100 },
      },
    });

    if (!caja) {
      const ultima = await prisma.caja.findFirst({
        where:   { tenantId, estado: "CERRADA" },
        select:  {
          id: true, saldoInicial: true, saldoFinal: true,
          saldoContado: true, diferencia: true,
          abiertaAt: true, cerradaAt: true, usuarioNombre: true,
        },
        orderBy: { cerradaAt: "desc" },
      });
      return NextResponse.json({ abierta: false, ultima });
    }

    return NextResponse.json({
      abierta: true,
      caja: { ...caja, ...calcularTotales(caja.movimientos) },
    });
  } catch (error) {
    console.error("[GET /api/caja]", error);
    return NextResponse.json({ error: "Error al obtener caja" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tenantId, usuarioId, nombreUsuario: usuarioNombre } = await getTenantContext();
    const { saldoInicial = 0, observaciones, turno: turnoManual } = await req.json();

    const { turno } = detectarTurno();
    const turnoFinal = turnoManual || turno;

    if (saldoInicial < 0)
      return NextResponse.json({ error: "Saldo inválido" }, { status: 400 });

    const yaAbierta = await prisma.caja.findFirst({
      where: { tenantId, estado: "ABIERTA" }, select: { id: true },
    });
    if (yaAbierta)
      return NextResponse.json({ error: "Ya hay una caja abierta" }, { status: 409 });

    const caja = await prisma.$transaction(async (tx) => {
      const nueva = await tx.caja.create({
        data: { tenantId, usuarioId, usuarioNombre, saldoInicial, turno: turnoFinal, observaciones, estado: "ABIERTA" },
        select: { id: true, saldoInicial: true, turno: true, usuarioNombre: true, abiertaAt: true, estado: true },
      });
      await tx.movimientoCaja.create({
        data: {
          tenantId, cajaId: nueva.id, tipo: "APERTURA", monto: saldoInicial,
          descripcion: `Apertura con $${Number(saldoInicial).toFixed(2)}`,
          usuarioId, usuarioNombre,
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

// PATCH — Cerrar
// saldoFinal   = fondoCambio  (lo que queda en caja para el próximo turno)
// saldoContado = total contado físicamente por el cajero (para referencia / auditoría)
// diferencia   = saldoContado - saldoActual (según movimientos del sistema)
export async function PATCH(req: NextRequest) {
  try {
    const { tenantId, usuarioId, nombreUsuario: usuarioNombre } = await getTenantContext();
    const body = await req.json();

    const saldoContadoTotal: number = body.saldoContado;
    const retiroNum: number         = body.retiro      ?? 0;
    const fondoCambioNum: number    = body.fondoCambio ?? Math.max(0, saldoContadoTotal - retiroNum);
    const observaciones: string | null = body.observaciones ?? null;

    if (saldoContadoTotal === undefined || saldoContadoTotal < 0)
      return NextResponse.json({ error: "Saldo contado inválido" }, { status: 400 });

    const cajaAbierta = await prisma.caja.findFirst({
      where:  { tenantId, estado: "ABIERTA" },
      select: { id: true, movimientos: { select: SELECT_MOVIMIENTOS } },
    });
    if (!cajaAbierta)
      return NextResponse.json({ error: "No hay caja abierta" }, { status: 404 });

    const totales         = calcularTotales(cajaAbierta.movimientos);
    const saldoRealEnCaja = totales.saldoActual;
    const diferencia      = saldoContadoTotal - saldoRealEnCaja;

    const descripcionCierre = [
      `Cierre. Contado: $${saldoContadoTotal.toFixed(2)}`,
      retiroNum > 0 ? `Retiro: $${retiroNum.toFixed(2)}` : null,
      `Fondo cambio: $${fondoCambioNum.toFixed(2)}`,
      `Diferencia: ${diferencia >= 0 ? "+" : ""}$${diferencia.toFixed(2)}`,
    ].filter(Boolean).join(" | ");

    const caja = await prisma.$transaction(async (tx) => {
      const cerrada = await tx.caja.update({
        where: { id: cajaAbierta.id },
        data: {
          estado:       "CERRADA",
          saldoFinal:   fondoCambioNum,    // fondo de cambio = "saldo esperado" del próximo turno
          saldoContado: saldoContadoTotal, // lo que contó el cajero (auditoría)
          diferencia,
          cerradaAt:    new Date(),
          observaciones,
        },
        select: { id: true, saldoFinal: true, saldoContado: true, diferencia: true, cerradaAt: true },
      });

      await tx.movimientoCaja.create({
        data: {
          tenantId, cajaId: cajaAbierta.id, tipo: "CIERRE", monto: saldoRealEnCaja,
          descripcion: descripcionCierre,
          usuarioId, usuarioNombre,
        },
      });

      return cerrada;
    });

    return NextResponse.json({
      caja,
      resumen: { ...totales, saldoContadoTotal, retiro: retiroNum, fondoCambio: fondoCambioNum, diferencia },
    });
  } catch (error) {
    console.error("[PATCH /api/caja]", error);
    return NextResponse.json({ error: "Error al cerrar caja" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";