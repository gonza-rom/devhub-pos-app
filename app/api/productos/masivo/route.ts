// app/api/productos/masivo/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";
import { revalidateTag } from "next/cache";

export async function PATCH(req: NextRequest) {
  try {
    const { tenantId } = await getTenantContext();
    const body = await req.json();

    const { ids, filtros, accion, valor, tipo } = body;

    // ═══════════════════════════════════════════════════════════
    // Determinar qué productos actualizar
    // ═══════════════════════════════════════════════════════════
    let whereClause: any = { tenantId, activo: true };

    if (filtros) {
      if (filtros.soloStockBajo) {
        whereClause.stock = { lte: 5 };
      }
      if (filtros.categoriaId === "sin-categoria") {
        whereClause.categoriaId = null;
      } else if (filtros.categoriaId) {
        whereClause.categoriaId = filtros.categoriaId;
      }
      if (filtros.busqueda?.trim()) {
        whereClause.OR = [
          { nombre: { contains: filtros.busqueda, mode: "insensitive" } },
          { codigoProducto: { contains: filtros.busqueda, mode: "insensitive" } },
        ];
      }
    } else if (ids && Array.isArray(ids) && ids.length > 0) {
      whereClause.id = { in: ids };

      const countProductos = await prisma.producto.count({ where: whereClause });
      if (countProductos !== ids.length) {
        return NextResponse.json(
          { ok: false, error: "Productos no encontrados" },
          { status: 404 }
        );
      }
    } else {
      return NextResponse.json(
        { ok: false, error: "Debe proporcionar IDs o filtros" },
        { status: 400 }
      );
    }

    // ═══════════════════════════════════════════════════════════
    // Aplicar acciones
    // ═══════════════════════════════════════════════════════════
    let resultado: { count: number };

    switch (accion) {
      // ───────────────────────────────────────────────────────
      // CAMBIAR CATEGORÍA — soporta null para quitar categoría
      // ───────────────────────────────────────────────────────
      case "categoria": {
        // valor === null  → quitar categoría (Sin categoría)
        // valor === string → asignar categoría existente
        if (valor === undefined) {
          return NextResponse.json(
            { ok: false, error: "Debe seleccionar una opción" },
            { status: 400 }
          );
        }

        if (valor !== null) {
          // Solo validar existencia si se asigna una categoría real
          const categoria = await prisma.categoria.findFirst({
            where: { id: valor, tenantId },
          });
          if (!categoria) {
            return NextResponse.json(
              { ok: false, error: "Categoría no encontrada" },
              { status: 404 }
            );
          }
        }

        resultado = await prisma.producto.updateMany({
          where: whereClause,
          data: { categoriaId: valor ?? null },
        });
        break;
      }

      // ───────────────────────────────────────────────────────
      // CAMBIAR PROVEEDOR
      // ───────────────────────────────────────────────────────
      case "proveedor": {
        if (!valor) {
          return NextResponse.json(
            { ok: false, error: "Debe seleccionar un proveedor" },
            { status: 400 }
          );
        }

        const proveedor = await prisma.proveedor.findFirst({
          where: { id: valor, tenantId },
        });
        if (!proveedor) {
          return NextResponse.json(
            { ok: false, error: "Proveedor no encontrado" },
            { status: 404 }
          );
        }

        resultado = await prisma.producto.updateMany({
          where: whereClause,
          data: { proveedorId: valor },
        });
        break;
      }

      // ───────────────────────────────────────────────────────
      // AJUSTAR STOCK
      // ───────────────────────────────────────────────────────
      case "stock": {
        if (valor === undefined || valor === null) {
          return NextResponse.json(
            { ok: false, error: "Debe ingresar un valor" },
            { status: 400 }
          );
        }

        const valorStock = parseFloat(valor);
        if (isNaN(valorStock)) {
          return NextResponse.json(
            { ok: false, error: "Valor de stock inválido" },
            { status: 400 }
          );
        }

        if (tipo === "establecer") {
          if (valorStock < 0) {
            return NextResponse.json(
              { ok: false, error: "El stock no puede ser negativo" },
              { status: 400 }
            );
          }
          resultado = await prisma.producto.updateMany({
            where: whereClause,
            data: { stock: valorStock },
          });
        } else if (tipo === "sumar" || tipo === "restar") {
          const productos = await prisma.producto.findMany({
            where: whereClause,
            select: { id: true, stock: true },
          });

          const operacion = tipo === "sumar" ? 1 : -1;

          await Promise.all(
            productos.map((p) =>
              prisma.producto.update({
                where: { id: p.id },
                data: { stock: Math.max(0, p.stock + valorStock * operacion) },
              })
            )
          );

          resultado = { count: productos.length };
        } else {
          return NextResponse.json(
            { ok: false, error: "Tipo de ajuste de stock inválido" },
            { status: 400 }
          );
        }
        break;
      }

      // ───────────────────────────────────────────────────────
      // AJUSTAR PRECIO
      // ───────────────────────────────────────────────────────
      case "precio": {
        if (valor === undefined || valor === null) {
          return NextResponse.json(
            { ok: false, error: "Debe ingresar un valor" },
            { status: 400 }
          );
        }

        const valorPrecio = parseFloat(valor);
        if (isNaN(valorPrecio)) {
          return NextResponse.json(
            { ok: false, error: "Valor de precio inválido" },
            { status: 400 }
          );
        }

        if (tipo === "fijo") {
          if (valorPrecio < 0) {
            return NextResponse.json(
              { ok: false, error: "El precio no puede ser negativo" },
              { status: 400 }
            );
          }
          resultado = await prisma.producto.updateMany({
            where: whereClause,
            data: { precio: valorPrecio },
          });
        } else if (tipo === "porcentaje") {
          const productos = await prisma.producto.findMany({
            where: whereClause,
            select: { id: true, precio: true },
          });

          await Promise.all(
            productos.map((p) => {
              const nuevoPrecio = p.precio + (p.precio * valorPrecio) / 100;
              return prisma.producto.update({
                where: { id: p.id },
                data: { precio: Math.max(0, nuevoPrecio) },
              });
            })
          );

          resultado = { count: productos.length };
        } else {
          return NextResponse.json(
            { ok: false, error: "Tipo de ajuste de precio inválido" },
            { status: 400 }
          );
        }
        break;
      }

      case "catalogo": {
        resultado = await prisma.producto.updateMany({
          where: whereClause,
          data:  { visibleCatalogo: Boolean(body.valor) },
        });
        break;
      }
      
      default:
        return NextResponse.json(
          { ok: false, error: "Acción no válida" },
          { status: 400 }
        );
    }

    revalidateTag("productos");

    return NextResponse.json({
      ok: true,
      actualizados: resultado.count,
    });
  } catch (err: any) {
    console.error("Error en acción masiva:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Error al procesar la acción" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";