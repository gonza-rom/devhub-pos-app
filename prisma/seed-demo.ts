// prisma/seed-demo.ts
// Corre con: npx tsx prisma/seed-demo.ts
// Genera datos de demo para el tenant de Gonzalo

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ── Config ──────────────────────────────────────────────────────────────────
const TENANT_ID   = "cmm73k3g70001bmxqiv3z4dpp";
const USUARIO_ID  = "gonza@gmail.com"; // se usa como referencia en ventas

// ── Helpers ──────────────────────────────────────────────────────────────────
const rand     = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randF    = (min: number, max: number) => parseFloat((Math.random() * (max - min) + min).toFixed(2));
const pick     = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const daysAgo  = (n: number) => new Date(Date.now() - n * 86400000);
const hoursAgo = (n: number) => new Date(Date.now() - n * 3600000);

// ── Datos ─────────────────────────────────────────────────────────────────────

const CATEGORIAS = [
  { nombre: "Anillos",      descripcion: "Anillos de todo tipo y materiales" },
  { nombre: "Aros",         descripcion: "Aritos, aros colgantes y de presión" },
  { nombre: "Collares",     descripcion: "Collares y cadenas" },
  { nombre: "Pulseras",     descripcion: "Pulseras y esclavas" },
  { nombre: "Dijes",        descripcion: "Dijes y colgantes sueltos" },
  { nombre: "Sets",         descripcion: "Conjuntos y sets de accesorios" },
  { nombre: "Vinchas",      descripcion: "Vinchas y accesorios de cabello" },
];

// 100 productos distribuidos entre categorías
const PRODUCTOS_BASE = [
  // ANILLOS (18)
  { nombre: "Anillo liso plateado", cat: "Anillos", precio: 2500, costo: 800,  stock: 45 },
  { nombre: "Anillo liso dorado",   cat: "Anillos", precio: 2800, costo: 900,  stock: 38 },
  { nombre: "Anillo ajustable flor",cat: "Anillos", precio: 3200, costo: 1000, stock: 30 },
  { nombre: "Anillo corazón plata", cat: "Anillos", precio: 3500, costo: 1100, stock: 22 },
  { nombre: "Anillo luna dorado",   cat: "Anillos", precio: 3800, costo: 1200, stock: 18 },
  { nombre: "Anillo infinito",      cat: "Anillos", precio: 2900, costo: 950,  stock: 35 },
  { nombre: "Anillo triple aro",    cat: "Anillos", precio: 4500, costo: 1500, stock: 12 },
  { nombre: "Anillo piedra celeste",cat: "Anillos", precio: 4200, costo: 1400, stock: 20 },
  { nombre: "Anillo piedra verde",  cat: "Anillos", precio: 4200, costo: 1400, stock: 15 },
  { nombre: "Anillo estrella",      cat: "Anillos", precio: 3100, costo: 1000, stock: 28 },
  { nombre: "Anillo serpiente",     cat: "Anillos", precio: 5500, costo: 1800, stock: 8  },
  { nombre: "Anillo minimalista",   cat: "Anillos", precio: 2200, costo: 700,  stock: 50 },
  { nombre: "Anillo boho plata",    cat: "Anillos", precio: 3600, costo: 1150, stock: 17 },
  { nombre: "Anillo hoja dorado",   cat: "Anillos", precio: 3300, costo: 1050, stock: 24 },
  { nombre: "Anillo geométrico",    cat: "Anillos", precio: 3700, costo: 1200, stock: 19 },
  { nombre: "Anillo mariposa",      cat: "Anillos", precio: 4100, costo: 1350, stock: 14 },
  { nombre: "Anillo perla",         cat: "Anillos", precio: 4800, costo: 1600, stock: 10 },
  { nombre: "Anillo ojo turco",     cat: "Anillos", precio: 3900, costo: 1250, stock: 21 },

  // AROS (20)
  { nombre: "Aritos argolla chica plata", cat: "Aros", precio: 2200, costo: 700,  stock: 55 },
  { nombre: "Aritos argolla chica dorada",cat: "Aros", precio: 2400, costo: 800,  stock: 48 },
  { nombre: "Aritos argolla grande",     cat: "Aros", precio: 2800, costo: 900,  stock: 42 },
  { nombre: "Aros colgante estrella",    cat: "Aros", precio: 3500, costo: 1100, stock: 30 },
  { nombre: "Aros colgante luna",        cat: "Aros", precio: 3800, costo: 1200, stock: 25 },
  { nombre: "Aros colgante corazón",     cat: "Aros", precio: 3600, costo: 1150, stock: 28 },
  { nombre: "Aros perla blanca",         cat: "Aros", precio: 4200, costo: 1400, stock: 20 },
  { nombre: "Aros perla negra",          cat: "Aros", precio: 4200, costo: 1400, stock: 18 },
  { nombre: "Aros tejidos dorados",      cat: "Aros", precio: 3900, costo: 1250, stock: 22 },
  { nombre: "Aros piedra turquesa",      cat: "Aros", precio: 4500, costo: 1500, stock: 15 },
  { nombre: "Aros piedra rosada",        cat: "Aros", precio: 4500, costo: 1500, stock: 16 },
  { nombre: "Aros triángulo dorado",     cat: "Aros", precio: 3200, costo: 1050, stock: 32 },
  { nombre: "Aros flor esmaltada",       cat: "Aros", precio: 5500, costo: 1800, stock: 10 },
  { nombre: "Aros pendiente largo",      cat: "Aros", precio: 5000, costo: 1700, stock: 12 },
  { nombre: "Aros mariposa plata",       cat: "Aros", precio: 3700, costo: 1200, stock: 24 },
  { nombre: "Aros ojo turco",            cat: "Aros", precio: 3300, costo: 1050, stock: 27 },
  { nombre: "Aros hoja dorada",          cat: "Aros", precio: 4000, costo: 1300, stock: 19 },
  { nombre: "Aros minimal plata",        cat: "Aros", precio: 1800, costo: 600,  stock: 60 },
  { nombre: "Aros clip sin agujero",     cat: "Aros", precio: 2600, costo: 850,  stock: 35 },
  { nombre: "Aros geométrico negro",     cat: "Aros", precio: 4800, costo: 1600, stock: 11 },

  // COLLARES (18)
  { nombre: "Collar cadena fina plata",  cat: "Collares", precio: 4500, costo: 1500, stock: 30 },
  { nombre: "Collar cadena fina dorada", cat: "Collares", precio: 4800, costo: 1600, stock: 28 },
  { nombre: "Collar perlas naturales",   cat: "Collares", precio: 8500, costo: 2800, stock: 10 },
  { nombre: "Collar choker terciopelo",  cat: "Collares", precio: 3200, costo: 1000, stock: 22 },
  { nombre: "Collar choker cadena",      cat: "Collares", precio: 3800, costo: 1200, stock: 25 },
  { nombre: "Collar corazón plata",      cat: "Collares", precio: 5500, costo: 1800, stock: 18 },
  { nombre: "Collar luna dorado",        cat: "Collares", precio: 5800, costo: 1900, stock: 15 },
  { nombre: "Collar ojo turco",          cat: "Collares", precio: 4200, costo: 1400, stock: 20 },
  { nombre: "Collar layered doble",      cat: "Collares", precio: 6500, costo: 2200, stock: 12 },
  { nombre: "Collar layered triple",     cat: "Collares", precio: 8000, costo: 2600, stock: 8  },
  { nombre: "Collar piedra amatista",    cat: "Collares", precio: 6800, costo: 2300, stock: 9  },
  { nombre: "Collar gargantilla rígida", cat: "Collares", precio: 5200, costo: 1750, stock: 14 },
  { nombre: "Collar boho flecos",        cat: "Collares", precio: 4600, costo: 1550, stock: 17 },
  { nombre: "Collar mariposa",           cat: "Collares", precio: 5000, costo: 1700, stock: 16 },
  { nombre: "Collar inicial personaliz", cat: "Collares", precio: 7500, costo: 2500, stock: 11 },
  { nombre: "Collar estrella doble",     cat: "Collares", precio: 6200, costo: 2100, stock: 13 },
  { nombre: "Collar perla solitaria",    cat: "Collares", precio: 4900, costo: 1650, stock: 19 },
  { nombre: "Collar infinity plata",     cat: "Collares", precio: 5600, costo: 1850, stock: 16 },

  // PULSERAS (18)
  { nombre: "Pulsera cadena fina plata",  cat: "Pulseras", precio: 3200, costo: 1050, stock: 38 },
  { nombre: "Pulsera cadena fina dorada", cat: "Pulseras", precio: 3500, costo: 1150, stock: 32 },
  { nombre: "Pulsera esclava plata",      cat: "Pulseras", precio: 4200, costo: 1400, stock: 25 },
  { nombre: "Pulsera esclava dorada",     cat: "Pulseras", precio: 4500, costo: 1500, stock: 22 },
  { nombre: "Pulsera charm corazón",      cat: "Pulseras", precio: 5500, costo: 1800, stock: 15 },
  { nombre: "Pulsera charm estrella",     cat: "Pulseras", precio: 5200, costo: 1750, stock: 18 },
  { nombre: "Pulsera tejida plata",       cat: "Pulseras", precio: 3800, costo: 1250, stock: 28 },
  { nombre: "Pulsera tejida dorada",      cat: "Pulseras", precio: 4100, costo: 1350, stock: 24 },
  { nombre: "Pulsera perlas",             cat: "Pulseras", precio: 4800, costo: 1600, stock: 16 },
  { nombre: "Pulsera ojo turco",          cat: "Pulseras", precio: 3600, costo: 1200, stock: 30 },
  { nombre: "Pulsera hilo ajustable",     cat: "Pulseras", precio: 1800, costo: 600,  stock: 55 },
  { nombre: "Pulsera boho dijes",         cat: "Pulseras", precio: 4400, costo: 1450, stock: 20 },
  { nombre: "Pulsera piedra labradorita", cat: "Pulseras", precio: 5800, costo: 1900, stock: 12 },
  { nombre: "Pulsera luna plata",         cat: "Pulseras", precio: 4600, costo: 1550, stock: 17 },
  { nombre: "Pulsera infinito",           cat: "Pulseras", precio: 3300, costo: 1100, stock: 27 },
  { nombre: "Pulsera flor esmaltada",     cat: "Pulseras", precio: 5000, costo: 1700, stock: 14 },
  { nombre: "Pulsera minimal geométrica", cat: "Pulseras", precio: 3900, costo: 1300, stock: 21 },
  { nombre: "Pulsera multicapa boho",     cat: "Pulseras", precio: 6500, costo: 2200, stock: 10 },

  // DIJES (10)
  { nombre: "Dije corazón plata",  cat: "Dijes", precio: 2200, costo: 700,  stock: 40 },
  { nombre: "Dije corazón dorado", cat: "Dijes", precio: 2400, costo: 800,  stock: 35 },
  { nombre: "Dije luna plata",     cat: "Dijes", precio: 2500, costo: 820,  stock: 38 },
  { nombre: "Dije estrella",       cat: "Dijes", precio: 2300, costo: 750,  stock: 42 },
  { nombre: "Dije mariposa",       cat: "Dijes", precio: 2800, costo: 900,  stock: 30 },
  { nombre: "Dije ojo turco",      cat: "Dijes", precio: 2600, costo: 850,  stock: 36 },
  { nombre: "Dije flor",           cat: "Dijes", precio: 2700, costo: 880,  stock: 33 },
  { nombre: "Dije letra inicial",  cat: "Dijes", precio: 3500, costo: 1150, stock: 25 },
  { nombre: "Dije elefante",       cat: "Dijes", precio: 3200, costo: 1050, stock: 28 },
  { nombre: "Dije árbol de vida",  cat: "Dijes", precio: 3800, costo: 1250, stock: 20 },

  // SETS (8)
  { nombre: "Set collar + aros plata",    cat: "Sets", precio: 8500,  costo: 2800, stock: 12 },
  { nombre: "Set collar + aros dorado",   cat: "Sets", precio: 9000,  costo: 3000, stock: 10 },
  { nombre: "Set 3 piezas plata",         cat: "Sets", precio: 12000, costo: 4000, stock: 7  },
  { nombre: "Set 3 piezas dorado",        cat: "Sets", precio: 12500, costo: 4200, stock: 6  },
  { nombre: "Set novia perlas",           cat: "Sets", precio: 18000, costo: 6000, stock: 4  },
  { nombre: "Set boho completo",          cat: "Sets", precio: 14000, costo: 4700, stock: 5  },
  { nombre: "Set minimalista plata",      cat: "Sets", precio: 10500, costo: 3500, stock: 8  },
  { nombre: "Set fiesta cristales",       cat: "Sets", precio: 16000, costo: 5500, stock: 4  },

  // VINCHAS (8)
  { nombre: "Vincha perlas blancas",     cat: "Vinchas", precio: 4500, costo: 1500, stock: 18 },
  { nombre: "Vincha flores secas",       cat: "Vinchas", precio: 5500, costo: 1800, stock: 12 },
  { nombre: "Vincha satén básica",       cat: "Vinchas", precio: 2800, costo: 900,  stock: 30 },
  { nombre: "Vincha metálica dorada",    cat: "Vinchas", precio: 3500, costo: 1150, stock: 22 },
  { nombre: "Vincha crochet bohemia",    cat: "Vinchas", precio: 4200, costo: 1400, stock: 16 },
  { nombre: "Vincha lazo novia",         cat: "Vinchas", precio: 6000, costo: 2000, stock: 8  },
  { nombre: "Vincha aro resina",         cat: "Vinchas", precio: 3800, costo: 1250, stock: 20 },
  { nombre: "Vincha pedrería",           cat: "Vinchas", precio: 7500, costo: 2500, stock: 6  },
];

const METODOS_PAGO  = ["EFECTIVO", "EFECTIVO", "EFECTIVO", "TRANSFERENCIA", "MERCADO_PAGO", "TARJETA_DEBITO"];
const CLIENTES      = [
  "María García", "Laura Rodríguez", "Sofía Martínez", "Valentina López",
  "Camila Fernández", "Lucía Pérez", "Florencia Gómez", "Agustina Torres",
  "Natalia Sánchez", "Carla Ruiz", null, null, null, // null = sin nombre
];
const VENDEDORES    = ["Gonza", "Vale", "Sofi"];
const TURNOS        = ["mañana", "tarde", "noche", "mañana", "tarde"];

async function main() {
  console.log("🌱 Iniciando seed de demo...\n");

  // ── 1. Verificar tenant ──────────────────────────────────────────────────
  const tenant = await prisma.tenant.findUnique({ where: { id: TENANT_ID } });
  if (!tenant) {
    throw new Error(`❌ Tenant ${TENANT_ID} no encontrado. Verificá el ID.`);
  }
  console.log(`✅ Tenant: ${tenant.nombre}`);

  // ── 2. Limpiar datos existentes del tenant (opcional) ────────────────────
  console.log("🧹 Limpiando datos anteriores...");
  await prisma.movimientoCaja.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.caja.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.comprobante.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.movimiento.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.ventaItem.deleteMany({ where: { venta: { tenantId: TENANT_ID } } });
  await prisma.venta.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.producto.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.categoria.deleteMany({ where: { tenantId: TENANT_ID } });
  console.log("✅ Datos limpiados\n");

  // ── 3. Categorías ────────────────────────────────────────────────────────
  console.log("📁 Creando categorías...");
  const categoriasCreadas: Record<string, string> = {};
  for (const cat of CATEGORIAS) {
    const c = await prisma.categoria.create({
      data: { tenantId: TENANT_ID, nombre: cat.nombre, descripcion: cat.descripcion },
    });
    categoriasCreadas[cat.nombre] = c.id;
  }
  console.log(`✅ ${CATEGORIAS.length} categorías creadas\n`);

  // ── 4. Productos ─────────────────────────────────────────────────────────
  console.log("📦 Creando 100 productos...");
  const productosCreados: Array<{ id: string; nombre: string; precio: number; stock: number; categoriaId: string }> = [];
  
  for (let i = 0; i < PRODUCTOS_BASE.length; i++) {
    const p = PRODUCTOS_BASE[i];
    const codigo = `ACC-${String(i + 1).padStart(4, "0")}`;
    
    const producto = await prisma.producto.create({
      data: {
        tenantId:      TENANT_ID,
        nombre:        p.nombre,
        precio:        p.precio,
        costo:         p.costo,
        stock:         p.stock,
        stockMinimo:   5,
        categoriaId:   categoriasCreadas[p.cat],
        codigoProducto: codigo,
        activo:        true,
      },
    });
    productosCreados.push({
      id:         producto.id,
      nombre:     producto.nombre,
      precio:     producto.precio,
      stock:      p.stock,
      categoriaId: categoriasCreadas[p.cat],
    });
  }
  console.log(`✅ ${productosCreados.length} productos creados\n`);

  // ── 5. Movimientos de stock (entradas históricas) ────────────────────────
  console.log("📊 Creando movimientos de stock...");
  let totalMovs = 0;
  
  for (const prod of productosCreados) {
    // Entrada inicial (hace 60-90 días)
    await prisma.movimiento.create({
      data: {
        tenantId:       TENANT_ID,
        productoId:     prod.id,
        productoNombre: prod.nombre,
        tipo:           "ENTRADA",
        cantidad:       rand(50, 120),
        stockAnterior:  0,
        stockResultante: rand(50, 120),
        motivo:         "Stock inicial - compra a proveedor",
        usuarioNombre:  "Gonza",
        createdAt:      daysAgo(rand(60, 90)),
      },
    });
    totalMovs++;

    // Algunas entradas adicionales (reposición)
    if (Math.random() > 0.4) {
      const cantRepos = rand(20, 50);
      await prisma.movimiento.create({
        data: {
          tenantId:       TENANT_ID,
          productoId:     prod.id,
          productoNombre: prod.nombre,
          tipo:           "ENTRADA",
          cantidad:       cantRepos,
          stockAnterior:  prod.stock,
          stockResultante: prod.stock + cantRepos,
          motivo:         "Reposición de stock",
          usuarioNombre:  pick(VENDEDORES),
          createdAt:      daysAgo(rand(5, 30)),
        },
      });
      totalMovs++;
    }
  }
  console.log(`✅ ${totalMovs} movimientos de stock creados\n`);

  // ── 6. Ventas (últimos 45 días) ──────────────────────────────────────────
  console.log("🛒 Creando ventas...");
  let totalVentas = 0;
  let totalItems  = 0;

  // Generar entre 3-8 ventas por día los últimos 45 días
  for (let dia = 44; dia >= 0; dia--) {
    const cantVentas = rand(2, 8);
    
    for (let v = 0; v < cantVentas; v++) {
      const metodoPago    = pick(METODOS_PAGO);
      const clienteNombre = pick(CLIENTES);
      const vendedor      = pick(VENDEDORES);
      const horaVenta     = rand(9, 21);
      const fechaVenta    = new Date(daysAgo(dia).setHours(horaVenta, rand(0, 59), 0, 0));

      // Entre 1 y 4 items por venta
      const cantItems = rand(1, 4);
      const itemsVenta: Array<{ productoId: string; nombre: string; cantidad: number; precioUnit: number; subtotal: number }> = [];
      const productosUsados = new Set<string>();

      for (let it = 0; it < cantItems; it++) {
        let prod: typeof productosCreados[0];
        // Evitar duplicar producto en la misma venta
        let intentos = 0;
        do {
          prod = pick(productosCreados);
          intentos++;
        } while (productosUsados.has(prod.id) && intentos < 20);
        
        if (productosUsados.has(prod.id)) continue;
        productosUsados.add(prod.id);

        const cantidad = rand(1, 3);
        itemsVenta.push({
          productoId: prod.id,
          nombre:     prod.nombre,
          cantidad,
          precioUnit: prod.precio,
          subtotal:   prod.precio * cantidad,
        });
      }

      if (itemsVenta.length === 0) continue;

      const subtotal  = itemsVenta.reduce((s, i) => s + i.subtotal, 0);
      const descuento = Math.random() > 0.85 ? Math.floor(subtotal * 0.10) : 0;
      const total     = subtotal - descuento;

      // Algunas ventas canceladas (3%)
      const cancelado = Math.random() < 0.03;

      const venta = await prisma.venta.create({
        data: {
          tenantId:      TENANT_ID,
          total,
          subtotal,
          descuento,
          metodoPago,
          clienteNombre,
          usuarioNombre: vendedor,
          cancelado,
          canceladoAt:   cancelado ? fechaVenta : null,
          motivoCancelacion: cancelado ? "Devolución del cliente" : null,
          createdAt:     fechaVenta,
          items: {
            create: itemsVenta.map(i => ({
              productoId: i.productoId,
              nombre:     i.nombre,
              cantidad:   i.cantidad,
              precioUnit: i.precioUnit,
              subtotal:   i.subtotal,
            })),
          },
        },
      });

      // Movimientos de stock por venta (solo si no cancelada)
      if (!cancelado) {
        for (const item of itemsVenta) {
          await prisma.movimiento.create({
            data: {
              tenantId:       TENANT_ID,
              productoId:     item.productoId,
              productoNombre: item.nombre,
              tipo:           "VENTA",
              cantidad:       item.cantidad,
              stockAnterior:  rand(10, 50),
              stockResultante: rand(5, 45),
              ventaId:        venta.id,
              usuarioNombre:  vendedor,
              createdAt:      fechaVenta,
            },
          });
        }
      }

      totalVentas++;
      totalItems += itemsVenta.length;
    }
  }
  console.log(`✅ ${totalVentas} ventas creadas (${totalItems} items)\n`);

  // ── 7. Cajas (últimos 30 días) ───────────────────────────────────────────
  console.log("💰 Creando sesiones de caja...");
  let totalCajas = 0;

  for (let dia = 29; dia >= 1; dia--) {
    // 1 o 2 turnos por día
    const turnos = Math.random() > 0.3 ? ["mañana", "tarde"] : ["mañana"];
    
    for (const turno of turnos) {
      const horaApertura  = turno === "mañana" ? 8 : 17;
      const horaCierre    = turno === "mañana" ? 13 : 22;
      const fechaApertura = new Date(daysAgo(dia).setHours(horaApertura, rand(0, 30), 0, 0));
      const fechaCierre   = new Date(daysAgo(dia).setHours(horaCierre,   rand(0, 30), 0, 0));
      const vendedor      = pick(VENDEDORES);
      const saldoInicial  = rand(5000, 20000);

      // Calcular ventas en efectivo del turno (simulado)
      const totalEfectivo  = randF(15000, 80000);
      const totalIngreso   = Math.random() > 0.7 ? randF(2000, 10000) : 0;
      const totalEgreso    = Math.random() > 0.6 ? randF(1000, 8000)  : 0;
      const saldoFinal     = saldoInicial + totalEfectivo + totalIngreso - totalEgreso;
      const diferencia     = randF(-500, 500);
      const saldoContado   = parseFloat((saldoFinal + diferencia).toFixed(2));

      const caja = await prisma.caja.create({
        data: {
          tenantId:      TENANT_ID,
          usuarioNombre: vendedor,
          turno,
          saldoInicial,
          saldoFinal:    parseFloat(saldoFinal.toFixed(2)),
          saldoContado,
          diferencia:    parseFloat(diferencia.toFixed(2)),
          estado:        "CERRADA",
          abiertaAt:     fechaApertura,
          cerradaAt:     fechaCierre,
          observaciones: Math.random() > 0.8 ? "Todo normal en el turno" : null,
        },
      });

      // Movimientos de la caja
      type MovCajaItem = {
        tipo:        "APERTURA" | "VENTA_EFECTIVO" | "VENTA_VIRTUAL" | "INGRESO" | "EGRESO" | "CIERRE";
        monto:       number;
        descripcion: string;
        createdAt:   Date;
      };
      const movsCaja: MovCajaItem[] = [
        {
          tipo:        "APERTURA",
          monto:       saldoInicial,
          descripcion: `Apertura con $${saldoInicial.toLocaleString("es-AR")}`,
          createdAt:   fechaApertura,
        },
      ];

      // Ventas en efectivo (varias)
      const cantVentasEf = rand(3, 12);
      let acumulado = 0;
      for (let ve = 0; ve < cantVentasEf; ve++) {
        const monto = randF(2000, 15000);
        acumulado += monto;
        if (acumulado > totalEfectivo) break;
        movsCaja.push({
          tipo:        "VENTA_EFECTIVO" as const,
          monto,
          descripcion: `Venta efectivo`,
          createdAt:   new Date(fechaApertura.getTime() + rand(10, 280) * 60000),
        });
      }

      // Ventas virtuales
      if (Math.random() > 0.4) {
        movsCaja.push({
          tipo:        "VENTA_VIRTUAL" as const,
          monto:       randF(3000, 25000),
          descripcion: "Ventas virtuales / transferencias",
          createdAt:   new Date(fechaApertura.getTime() + rand(30, 200) * 60000),
        });
      }

      // Ingreso manual
      if (totalIngreso > 0) {
        movsCaja.push({
          tipo:        "INGRESO" as const,
          monto:       totalIngreso,
          descripcion: "Ingreso por depósito bancario",
          createdAt:   new Date(fechaApertura.getTime() + rand(60, 180) * 60000),
        });
      }

      // Egreso
      if (totalEgreso > 0) {
        movsCaja.push({
          tipo:        "EGRESO" as const,
          monto:       totalEgreso,
          descripcion: pick(["Pago a proveedor", "Retiro propietario", "Gasto insumos", "Pago limpieza"]),
          createdAt:   new Date(fechaApertura.getTime() + rand(90, 240) * 60000),
        });
      }

      // Cierre
      movsCaja.push({
        tipo:        "CIERRE" as const,
        monto:       parseFloat(saldoFinal.toFixed(2)),
        descripcion: `Cierre. Contado: $${saldoContado.toLocaleString("es-AR")} | Diferencia: ${diferencia >= 0 ? "+" : ""}$${diferencia.toFixed(2)}`,
        createdAt:   fechaCierre,
      });

      await prisma.movimientoCaja.createMany({
        data: movsCaja.map(m => ({
          tenantId:      TENANT_ID,
          cajaId:        caja.id,
          tipo:          m.tipo,
          monto:         m.monto,
          descripcion:   m.descripcion,
          usuarioNombre: vendedor,
          createdAt:     m.createdAt,
        })),
      });

      totalCajas++;
    }
  }

  // Caja abierta HOY (turno mañana activo)
  const cajaHoyApertura = new Date();
  cajaHoyApertura.setHours(8, 30, 0, 0);
  const saldoHoy = rand(8000, 15000);

  const cajaAbierta = await prisma.caja.create({
    data: {
      tenantId:      TENANT_ID,
      usuarioNombre: "Gonza",
      turno:         "mañana",
      saldoInicial:  saldoHoy,
      estado:        "ABIERTA",
      abiertaAt:     cajaHoyApertura,
    },
  });

  // Algunos movimientos de la caja de hoy
  await prisma.movimientoCaja.create({
    data: {
      tenantId:      TENANT_ID,
      cajaId:        cajaAbierta.id,
      tipo:          "APERTURA",
      monto:         saldoHoy,
      descripcion:   `Apertura con $${saldoHoy.toLocaleString("es-AR")}`,
      usuarioNombre: "Gonza",
    },
  });

  const ventasHoy = rand(2, 5);
  for (let vh = 0; vh < ventasHoy; vh++) {
    const monto = randF(3000, 18000);
    await prisma.movimientoCaja.create({
      data: {
        tenantId:      TENANT_ID,
        cajaId:        cajaAbierta.id,
        tipo:          rand(0, 1) === 0 ? "VENTA_EFECTIVO" : "VENTA_VIRTUAL",
        monto,
        descripcion:   "Venta del día",
        usuarioNombre: "Gonza",
        createdAt:     hoursAgo(rand(1, 5)),
      },
    });
  }

  console.log(`✅ ${totalCajas + 1} sesiones de caja creadas (${totalCajas} cerradas + 1 abierta hoy)\n`);

  // ── 8. Resumen final ─────────────────────────────────────────────────────
  const [cats, prods, ventas, movs, cajas] = await Promise.all([
    prisma.categoria.count({ where: { tenantId: TENANT_ID } }),
    prisma.producto.count({ where: { tenantId: TENANT_ID } }),
    prisma.venta.count({ where: { tenantId: TENANT_ID } }),
    prisma.movimiento.count({ where: { tenantId: TENANT_ID } }),
    prisma.caja.count({ where: { tenantId: TENANT_ID } }),
  ]);

  console.log("═══════════════════════════════════════");
  console.log("✅ SEED COMPLETADO");
  console.log("═══════════════════════════════════════");
  console.log(`   Categorías:  ${cats}`);
  console.log(`   Productos:   ${prods}`);
  console.log(`   Ventas:      ${ventas}`);
  console.log(`   Movimientos: ${movs}`);
  console.log(`   Cajas:       ${cajas}`);
  console.log("═══════════════════════════════════════");
  console.log("\n🎉 Datos listos para mostrar al cliente!\n");
}

main()
  .catch((e) => { console.error("❌ Error:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });