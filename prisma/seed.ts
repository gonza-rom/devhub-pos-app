// prisma/seed.ts
// Crea un tenant de prueba "JMR" con datos de ejemplo
// Uso: npm run db:seed

import { PrismaClient, PlanTipo, RolTenant, TipoMovimiento } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed...");

  // ── 1. Crear tenant JMR ──────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { slug: "jmr" },
    update: {},
    create: {
      nombre: "JMR Comercio",
      email: "jmr@devhubpos.com",
      slug: "jmr",
      telefono: "3833000000",
      ciudad: "Catamarca",
      plan: PlanTipo.FREE,
    },
  });
  console.log(`✅ Tenant creado: ${tenant.nombre} (ID: ${tenant.id})`);

  // ── 2. Crear categorías ──────────────────────────────────────
  const categorias = await Promise.all([
    prisma.categoria.upsert({
      where: { tenantId_nombre: { tenantId: tenant.id, nombre: "Bebidas" } },
      update: {},
      create: { tenantId: tenant.id, nombre: "Bebidas" },
    }),
    prisma.categoria.upsert({
      where: { tenantId_nombre: { tenantId: tenant.id, nombre: "Snacks" } },
      update: {},
      create: { tenantId: tenant.id, nombre: "Snacks" },
    }),
    prisma.categoria.upsert({
      where: { tenantId_nombre: { tenantId: tenant.id, nombre: "Limpieza" } },
      update: {},
      create: { tenantId: tenant.id, nombre: "Limpieza" },
    }),
  ]);
  console.log(`✅ Categorías creadas: ${categorias.length}`);

  // ── 3. Crear proveedor ───────────────────────────────────────
  const proveedor = await prisma.proveedor.create({
    data: {
      tenantId: tenant.id,
      nombre: "Distribuidora Norte",
      telefono: "3833111222",
    },
  }).catch(() => null);
  console.log(`✅ Proveedor creado`);

  // ── 4. Crear productos ───────────────────────────────────────
  const productos = [
    { nombre: "Coca Cola 500ml", precio: 1500, stock: 50, stockMinimo: 10, categoriaId: categorias[0].id },
    { nombre: "Agua Mineral 1L", precio: 800, stock: 80, stockMinimo: 20, categoriaId: categorias[0].id },
    { nombre: "Papas Fritas 100g", precio: 1200, stock: 30, stockMinimo: 10, categoriaId: categorias[1].id },
    { nombre: "Alfajor Triple", precio: 900, stock: 45, stockMinimo: 10, categoriaId: categorias[1].id },
    { nombre: "Jabón Líquido 500ml", precio: 2500, stock: 20, stockMinimo: 5, categoriaId: categorias[2].id },
  ];

  for (const prod of productos) {
    await prisma.producto.create({
      data: { tenantId: tenant.id, ...prod },
    }).catch(() => null); // Ignorar si ya existe
  }
  console.log(`✅ Productos creados: ${productos.length}`);

  console.log("\n🎉 Seed completado!");
  console.log(`   Tenant ID: ${tenant.id}`);
  console.log(`   Slug: ${tenant.slug}`);
  console.log(`   Para crear un usuario, registrate en /auth/registro`);
  console.log(`   y en el webhook de registro usá el tenantId: ${tenant.id}`);
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
