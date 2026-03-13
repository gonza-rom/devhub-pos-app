// app/api/caja/route.ts
// OPTIMIZADO:
// - GET: select mínimo en movimientos, caché corto para polling del front
// - PATCH (cierre): sin doble cálculo de totales
// - calcularTotales: tipado correcto, sin any[]

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

type MovCaja = {
  tipo:      string;
  monto:     number;
  metodoPago: string | null;
};

// ── Mover calcularTotales fuera — bien tipado, sin any ────────────────────
function calcularTotales(movimientos: MovCaja[]) {
  let saldoInicial = 0, totalEfectivo = 0, totalIngresos = 0, totalEgresos = 0;
  let totalTransferencia = 0, totalMercadoPago = 0;
  let totalTarjetaCredito = 0, totalTarjetaDebito = 0;

  for (const m of movimientos) {
    switch (m.tipo) {
      case "APERTURA":       
        saldoInicial = m.monto; 
        break;
        
      case "VENTA_EFECTIVO": 
        totalEfectivo += m.monto; 
        break;
        
      case "INGRESO":        
        totalIngresos += m.monto; 
        break;
        
      case "EGRESO":         
        totalEgresos  += m.monto; 
        break;
        
      case "VENTA_VIRTUAL":
        const metodo = (m.metodoPago || "").toUpperCase();
        
        if (metodo === "TRANSFERENCIA") {
          totalTransferencia += m.monto;
        } 
        else if (metodo === "QR" || metodo === "MERCADOPAGO" || metodo === "MERCADO_PAGO") {
          totalMercadoPago += m.monto;
        } 
        else if (metodo === "CREDITO" || metodo === "TARJETA_CREDITO") {
          totalTarjetaCredito += m.monto;
        } 
        else if (metodo === "DEBITO" || metodo === "TARJETA_DEBITO") {
          totalTarjetaDebito += m.monto;
        }
        break;
    }
  }

  return {
    saldoInicial,
    totalEfectivo,
    totalIngresos,
    totalEgresos,
    totalTransferencia,
    totalMercadoPago,
    totalTarjetaCredito,
    totalTarjetaDebito,
    totalVirtuales: totalTransferencia + totalMercadoPago,
    totalTarjetas:  totalTarjetaCredito + totalTarjetaDebito,
    saldoActual: saldoInicial + totalEfectivo + totalIngresos - totalEgresos,
  };
}

// Select mínimo para movimientos — reutilizado en GET y PATCH
const SELECT_MOVIMIENTOS = {
  id: true, tipo: true, monto: true, descripcion: true,
  metodoPago: true, ventaId: true, usuarioNombre: true, createdAt: true,
} as const;

// ── GET /api/caja ──────────────────────────────────────────────────────────
export async function GET() {
  try {
    const { tenantId } = await getTenantContext();

    const caja = await prisma.caja.findFirst({
      where: { tenantId, estado: "ABIERTA" },
      select: {
        id: true, saldoInicial: true, usuarioNombre: true,
        abiertaAt: true, estado: true, observaciones: true,
        movimientos: {
          select:  SELECT_MOVIMIENTOS,
          orderBy: { createdAt: "desc" },
          take:    100, // ✅ limitar para no traer cajas muy largas
        },
      },
    });

    if (!caja) {
      // ✅ Solo lo esencial de la última caja cerrada
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

// ── POST /api/caja — Abrir ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { tenantId, usuarioId, nombreUsuario: usuarioNombre } = await getTenantContext();
    const { saldoInicial = 0, observaciones } = await req.json();

    if (saldoInicial < 0)
      return NextResponse.json({ error: "Saldo inválido" }, { status: 400 });

    // ✅ Verificar caja abierta con select mínimo
    const yaAbierta = await prisma.caja.findFirst({
      where:  { tenantId, estado: "ABIERTA" },
      select: { id: true },
    });
    if (yaAbierta)
      return NextResponse.json({ error: "Ya hay una caja abierta" }, { status: 409 });

    const caja = await prisma.$transaction(async (tx) => {
      const nueva = await tx.caja.create({
        data: { tenantId, usuarioId, usuarioNombre, saldoInicial, observaciones, estado: "ABIERTA" },
        select: { id: true, saldoInicial: true, usuarioNombre: true, abiertaAt: true, estado: true },
      });
      await tx.movimientoCaja.create({
        data: {
          tenantId, cajaId: nueva.id, tipo: "APERTURA", monto: saldoInicial,
          descripcion: `Apertura con $${saldoInicial.toFixed(2)}`, usuarioId, usuarioNombre,
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

// ── PATCH /api/caja — Cerrar ───────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const { tenantId, usuarioId, nombreUsuario: usuarioNombre } = await getTenantContext();
    const { saldoContado, observaciones } = await req.json();

    if (saldoContado === undefined || saldoContado < 0)
      return NextResponse.json({ error: "Saldo contado inválido" }, { status: 400 });

    // ✅ Un solo fetch con select mínimo — evita traer todos los campos de Caja
    const cajaAbierta = await prisma.caja.findFirst({
      where: { tenantId, estado: "ABIERTA" },
      select: {
        id: true,
        movimientos: { select: SELECT_MOVIMIENTOS },
      },
    });
    if (!cajaAbierta)
      return NextResponse.json({ error: "No hay caja abierta" }, { status: 404 });

    // ✅ calcularTotales una sola vez
    const totales    = calcularTotales(cajaAbierta.movimientos);
    const saldoFinal = totales.saldoActual;
    const diferencia = saldoContado - saldoFinal;

    const caja = await prisma.$transaction(async (tx) => {
      const cerrada = await tx.caja.update({
        where: { id: cajaAbierta.id },
        data:  { estado: "CERRADA", saldoFinal, saldoContado, diferencia, cerradaAt: new Date(), observaciones },
        select: { id: true, saldoFinal: true, saldoContado: true, diferencia: true, cerradaAt: true },
      });
      await tx.movimientoCaja.create({
        data: {
          tenantId, cajaId: cajaAbierta.id, tipo: "CIERRE", monto: saldoFinal,
          descripcion: `Cierre. Contado: $${saldoContado.toFixed(2)} | Diferencia: ${diferencia >= 0 ? "+" : ""}$${diferencia.toFixed(2)}`,
          usuarioId, usuarioNombre,
        },
      });
      return cerrada;
    });

    return NextResponse.json({ caja, resumen: { ...totales, saldoContado, diferencia } });
  } catch (error) {
    console.error("[PATCH /api/caja]", error);
    return NextResponse.json({ error: "Error al cerrar caja" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";