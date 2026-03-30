// app/(app)/historial-ventas/page.tsx

import { Metadata } from "next";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { formatPrecio } from "@/lib/utils";
import { ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";
import Link from "next/link";
import VentasTabla from "@/components/ventas/VentasTabla";
import VentasFiltros from "@/components/ventas/VentasFiltros";
import { ToggleMostrarCanceladas } from "@/components/ventas/ToggleMostrarCanceladas";

export const metadata: Metadata = { title: "Historial de ventas" };

const PAGE_SIZE = 20;

const METODOS_PAGO = ["EFECTIVO", "DEBITO", "CREDITO", "TRANSFERENCIA", "QR", "MERCADOPAGO"];

export default async function HistorialVentasPage({
  searchParams,
}: {
  searchParams: Promise<{
    desde?: string; hasta?: string; metodoPago?: string;
    cliente?: string; page?: string; mostrarCanceladas?: string;
  }>;
}) {
  const headersList = await headers();
  const tenantId    = headersList.get("x-tenant-id")!;
  const rol         = headersList.get("x-user-rol") ?? "EMPLEADO";
  const esEmpleado  = rol === "EMPLEADO";

  const params = await searchParams;

  const desde             = params.desde ?? "";
  const hasta             = params.hasta ?? "";
  const metodoPago        = params.metodoPago ?? "";
  const cliente           = params.cliente ?? "";
  const page              = Math.max(1, parseInt(params.page ?? "1"));
  const mostrarCanceladas = params.mostrarCanceladas === "true";

  const where: any = {
    tenantId,
    cancelado: mostrarCanceladas ? undefined : false,
  };

  if (desde || hasta) {
    where.createdAt = {
      ...(desde && { gte: new Date(desde) }),
      ...(hasta && { lte: new Date(hasta + "T23:59:59") }),
    };
  }
  if (metodoPago) where.metodoPago = metodoPago;
  if (cliente.trim()) {
    where.clienteNombre = { contains: cliente.trim(), mode: "insensitive" };
  }

  const [ventas, total] = await Promise.all([
    prisma.venta.findMany({
      where,
      select: {
        id: true,
        total: true,
        subtotal: true,
        descuento: true,
        metodoPago: true,
        clienteNombre: true,
        clienteDni: true,
        observaciones: true,
        usuarioNombre: true,
        createdAt: true,
        cancelado: true,
        motivoCancelacion: true,
        items: {
          select: {
            id: true,
            nombre: true,
            cantidad: true,
            precioUnit: true,
            subtotal: true,
            producto: { select: { id: true, imagen: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.venta.count({ where }),
  ]);

  // Solo calcular resumen si no es empleado (evita query innecesaria)
  const resumen = !esEmpleado
    ? await prisma.venta.aggregate({
        where,
        _sum:   { total: true },
        _count: { id: true },
      })
    : null;

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const desde_n    = (page - 1) * PAGE_SIZE + 1;
  const hasta_n    = Math.min(page * PAGE_SIZE, total);

  const buildQuery = (newPage: number) => {
    const q = new URLSearchParams();
    if (desde)             q.set("desde",             desde);
    if (hasta)             q.set("hasta",             hasta);
    if (metodoPago)        q.set("metodoPago",        metodoPago);
    if (cliente)           q.set("cliente",           cliente);
    if (mostrarCanceladas) q.set("mostrarCanceladas", "true");
    q.set("page", String(newPage));
    return `?${q.toString()}`;
  };

  const hayFiltros = !!(desde || hasta || metodoPago || cliente);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/ventas" className="text-zinc-500 hover:text-zinc-300">
          Punto de venta
        </Link>
        <span style={{ color: "var(--text-faint)" }}>·</span>
        <Link href="/historial-ventas" className="font-semibold text-red-400">
          Historial de ventas
        </Link>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Historial de ventas
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
          {total} ventas {hayFiltros ? "con los filtros aplicados" : "en total"}
        </p>
      </div>

      {/* Resumen del período — oculto para empleados */}
      {!esEmpleado && resumen && (
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-4">
            <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "var(--text-faint)" }}>
              Ventas
            </p>
            <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
              {resumen._count.id}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "var(--text-faint)" }}>
              Total recaudado
            </p>
            <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
              {formatPrecio(resumen._sum.total ?? 0)}
            </p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <VentasFiltros
        metodosPago={METODOS_PAGO}
        valores={{ desde, hasta, metodoPago, cliente }}
      />

      {/* Toggle mostrar canceladas */}
      <ToggleMostrarCanceladas />

      {/* Tabla */}
      {ventas.length === 0 ? (
        <div className="card py-20 text-center">
          <ShoppingBag className="h-12 w-12 mx-auto mb-4" style={{ color: "var(--text-faint)" }} />
          <h3 className="text-lg font-medium mb-1" style={{ color: "var(--text-primary)" }}>
            Sin ventas
          </h3>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {hayFiltros ? "No hay ventas con esos filtros" : "Todavía no se registraron ventas"}
          </p>
          {hayFiltros && (
            <Link href="/historial-ventas" className="inline-block mt-4 text-sm underline"
              style={{ color: "var(--text-muted)" }}>
              Limpiar filtros
            </Link>
          )}
        </div>
      ) : (
        <VentasTabla ventas={ventas} />
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="card">
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {desde_n}–{hasta_n} de {total} ventas
            </p>
            <div className="flex items-center gap-1">
              {page > 1 ? (
                <Link href={buildQuery(page - 1)} className="btn-ghost px-2 py-1.5">
                  <ChevronLeft className="h-4 w-4" />
                </Link>
              ) : (
                <span className="btn-ghost px-2 py-1.5 opacity-30 cursor-not-allowed">
                  <ChevronLeft className="h-4 w-4" />
                </span>
              )}

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | "...")[]>((acc, p, i, arr) => {
                  if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === "..." ? (
                    <span key={`ellipsis-${i}`} className="px-2 py-1 text-sm"
                      style={{ color: "var(--text-primary)" }}>…</span>
                  ) : (
                    <Link key={p} href={buildQuery(p as number)}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                      style={{
                        background: p === page ? "#DC2626" : "transparent",
                        color:      p === page ? "#ffffff" : "var(--text-secondary)",
                        border:     p === page ? "none" : "1px solid var(--border-base)",
                      }}>
                      {p}
                    </Link>
                  )
                )
              }

              {page < totalPages ? (
                <Link href={buildQuery(page + 1)} className="btn-ghost px-2 py-1.5">
                  <ChevronRight className="h-4 w-4" />
                </Link>
              ) : (
                <span className="btn-ghost px-2 py-1.5 opacity-30 cursor-not-allowed">
                  <ChevronRight className="h-4 w-4" />
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}