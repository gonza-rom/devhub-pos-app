// app/api/productos/[id]/route.ts
// ACTUALIZADO: PUT ahora guarda tieneVariantes y variantes de talle/color

import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { tenantId } = await getTenantContext();
    const { id } = await params;

    const producto = await prisma.producto.findFirst({
      where: { id, tenantId },
      include: {
        categoria: { select: { id: true, nombre: true } },
        proveedor:  { select: { id: true, nombre: true } },
        variantes:  { where: { activo: true }, orderBy: [{ talle: "asc" }, { color: "asc" }] },
      },
    });

    if (!producto)
      return NextResponse.json({ ok: false, error: "Producto no encontrado" }, { status: 404 });

    return NextResponse.json({ ok: true, data: producto });
  } catch (error) {
    console.error("[GET /api/productos/:id]", error);
    return NextResponse.json({ ok: false, error: "Error al obtener producto" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { tenantId, usuarioId } = await getTenantContext();
    const { id } = await params;

    const existente = await prisma.producto.findFirst({ where: { id, tenantId } });
    if (!existente)
      return NextResponse.json({ ok: false, error: "Producto no encontrado" }, { status: 404 });

    const body = await req.json();
    const {
      nombre, descripcion, codigoProducto, codigoBarras,
      precio, costo, stock, stockMinimo, unidad,
      imagen, imagenes, categoriaId, proveedorId,
      tieneVariantes = false,
      variantes = [],
    } = body;

    if (!nombre || !precio || parseFloat(precio) <= 0)
      return NextResponse.json({ ok: false, error: "Nombre y precio son requeridos" }, { status: 400 });

    if (codigoProducto?.trim()) {
      const dup = await prisma.producto.findFirst({
        where: { tenantId, codigoProducto: codigoProducto.trim(), activo: true, NOT: { id } },
      });
      if (dup)
        return NextResponse.json({ ok: false, error: `Código "${codigoProducto}" ya está en uso por: ${dup.nombre}` }, { status: 409 });
    }
    if (codigoBarras?.trim()) {
      const dup = await prisma.producto.findFirst({
        where: { tenantId, codigoBarras: codigoBarras.trim(), activo: true, NOT: { id } },
      });
      if (dup)
        return NextResponse.json({ ok: false, error: `Código de barras ya está en uso por: ${dup.nombre}` }, { status: 409 });
    }

    if (existente.precio !== parseFloat(precio)) {
      await prisma.precioHistorico.create({
        data: {
          tenantId, productoId: id,
          precioViejo: existente.precio,
          precioNuevo: parseFloat(precio),
          motivo: "Actualización manual",
          usuarioId,
        },
      });
    }

    const producto = await prisma.$transaction(async (tx) => {
      // Calcular stock total desde variantes si aplica
      const stockFinal = tieneVariantes
        ? variantes.reduce((acc: number, v: any) => acc + (parseInt(v.stock) || 0), 0)
        : parseInt(stock) || 0;

      const p = await tx.producto.update({
        where: { id },
        data: {
          nombre:         nombre.trim(),
          descripcion:    descripcion?.trim() || null,
          codigoProducto: codigoProducto?.trim() || null,
          codigoBarras:   codigoBarras?.trim() || null,
          precio:         parseFloat(precio),
          costo:          costo ? parseFloat(costo) : null,
          stock:          stockFinal,
          stockMinimo:    parseInt(stockMinimo) || 5,
          unidad:         unidad?.trim() || null,
          imagen:         imagen || (Array.isArray(imagenes) && imagenes[0]) || null,
          imagenes:       Array.isArray(imagenes) ? imagenes : [],
          categoriaId:    categoriaId || null,
          proveedorId:    proveedorId || null,
          tieneVariantes,
          visibleCatalogo: body.visibleCatalogo ?? false,
        },
        include: {
          categoria: { select: { id: true, nombre: true } },
          proveedor:  { select: { id: true, nombre: true } },
        },
      });

      // Sincronizar variantes si el producto las tiene
      if (tieneVariantes && variantes.length > 0) {
      const idsEnviados = variantes.filter((v: any) => v.id).map((v: any) => v.id as string);

      // Solo eliminar las que tenían id y ya no están — si no hay ids enviados, no borrar nada
      if (idsEnviados.length > 0) {
        await tx.productoVariante.deleteMany({
          where: {
            productoId: id,
            id: { notIn: idsEnviados },
          },
        });
      }

      for (const v of variantes) {
        if (v.id) {
          await tx.productoVariante.update({
            where: { id: v.id },
            data: {
              talle:  v.talle || null,
              color:  v.color?.trim() || "",
              stock:  parseInt(v.stock) || 0,
              precio: v.precio ? parseFloat(v.precio) : null,
              activo: v.activo ?? true,
            },
          });
        } else {
          await tx.productoVariante.create({
            data: {
              tenantId,
              productoId: id,
              talle:  v.talle || null,
              color:  v.color?.trim() || "",
              stock:  parseInt(v.stock) || 0,
              precio: v.precio ? parseFloat(v.precio) : null,
              activo: true,
            },
          });
        }
      }
    } else if (!tieneVariantes) {
      await tx.productoVariante.updateMany({
        where: { productoId: id },
        data:  { activo: false },
      });
    }

      // Si se desactivaron variantes, desactivar todas las existentes
      if (!tieneVariantes) {
        await tx.productoVariante.updateMany({
          where: { productoId: id },
          data:  { activo: false },
        });
      }

      return p;
    });

    revalidateTag("dashboard");
    revalidateTag(`tenant-${tenantId}`);
    revalidateTag("productos");

    return NextResponse.json({ ok: true, data: producto });
  } catch (error: any) {
    if (error.code === "P2002")
      return NextResponse.json({ ok: false, error: "Ya existe un producto con ese código" }, { status: 409 });
    console.error("[PUT /api/productos/:id]", error);
    return NextResponse.json({ ok: false, error: "Error al actualizar producto" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { tenantId, rol } = await getTenantContext();
    const { id } = await params;

    if (rol === "EMPLEADO")
      return NextResponse.json({ ok: false, error: "Sin permisos" }, { status: 403 });

    const existente = await prisma.producto.findFirst({ where: { id, tenantId } });
    if (!existente)
      return NextResponse.json({ ok: false, error: "Producto no encontrado" }, { status: 404 });

    await prisma.producto.update({
      where: { id },
      data: { activo: false, codigoProducto: null, codigoBarras: null },
    });

    revalidateTag("dashboard");
    revalidateTag(`tenant-${tenantId}`);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/productos/:id]", error);
    return NextResponse.json({ ok: false, error: "Error al eliminar producto" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { tenantId, usuarioId } = await getTenantContext();
    const { id } = await params;

    const existente = await prisma.producto.findFirst({ where: { id, tenantId } });
    if (!existente)
      return NextResponse.json({ ok: false, error: "Producto no encontrado" }, { status: 404 });

    const body = await req.json();
    const { nombre, codigoProducto, precio, stock } = body;

    if (nombre !== undefined && !nombre.trim())
      return NextResponse.json({ ok: false, error: "El nombre no puede estar vacío" }, { status: 400 });
    if (precio !== undefined && parseFloat(precio) <= 0)
      return NextResponse.json({ ok: false, error: "El precio debe ser mayor a 0" }, { status: 400 });

    if (codigoProducto?.trim() && codigoProducto.trim() !== existente.codigoProducto) {
      const dup = await prisma.producto.findFirst({
        where: { tenantId, codigoProducto: codigoProducto.trim(), activo: true, NOT: { id } },
      });
      if (dup)
        return NextResponse.json({ ok: false, error: `Código "${codigoProducto}" ya está en uso por: ${dup.nombre}` }, { status: 409 });
    }

    if (precio !== undefined && parseFloat(precio) !== existente.precio) {
      await prisma.precioHistorico.create({
        data: {
          tenantId, productoId: id,
          precioViejo: existente.precio,
          precioNuevo: parseFloat(precio),
          motivo: "Edición rápida desde POS",
          usuarioId,
        },
      });
    }

    const producto = await prisma.producto.update({
      where: { id },
      data: {
        ...(nombre         !== undefined && { nombre:         nombre.trim() }),
        ...(codigoProducto !== undefined && { codigoProducto: codigoProducto.trim() || null }),
        ...(precio         !== undefined && { precio:         parseFloat(precio) }),
        ...(stock          !== undefined && { stock:          parseInt(stock) }),
        visibleCatalogo: body.visibleCatalogo ?? false,
      },
    });

    revalidateTag("dashboard");
    revalidateTag(`tenant-${tenantId}`);

    return NextResponse.json({ ok: true, data: producto });
  } catch (error: any) {
    if (error.code === "P2002")
      return NextResponse.json({ ok: false, error: "Ya existe un producto con ese código" }, { status: 409 });
    console.error("[PATCH /api/productos/:id]", error);
    return NextResponse.json({ ok: false, error: "Error al actualizar producto" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";