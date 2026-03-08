// scripts/seed-productos-masivo.ts
// Script para crear MUCHOS productos y testear performance bajo carga
// Uso: npx tsx scripts/seed-productos-masivo.ts [cantidad]
// Ejemplo: npx tsx scripts/seed-productos-masivo.ts 500

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const IMAGENES_CLOUDINARY = [
  'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
  'https://res.cloudinary.com/demo/image/upload/v1571218039/samples/food/fish-vegetables.jpg',
  'https://res.cloudinary.com/demo/image/upload/v1571218039/samples/food/pot-mussels.jpg',
  'https://res.cloudinary.com/demo/image/upload/v1571218039/samples/food/spices.jpg',
];

const CATEGORIAS = ['Bebidas', 'Almacén', 'Limpieza', 'Snacks', 'Lácteos'];

const NOMBRES = [
  'Producto', 'Artículo', 'Item', 'Mercadería', 'Provisión',
];

const ADJETIVOS = [
  'Premium', 'Económico', 'Familiar', 'Individual', 'Grande',
  'Chico', 'Mediano', 'Extra', 'Super', 'Mega',
];

async function main() {
  const cantidadProductos = parseInt(process.argv[2]) || 100;
  
  console.log('🚀 Seed MASIVO de productos\n');
  console.log(`📦 Creando ${cantidadProductos} productos de prueba...\n`);

  // Reemplazá con TU email de usuario
const tenant = await prisma.tenant.findFirst({
  where: { email: "leivaanaelizabeth500@gmail.com" }
});
  
  if (!tenant) {
    console.error('❌ No hay tenants. Creá uno desde la app primero.\n');
    process.exit(1);
  }

  console.log(`✅ Tenant: ${tenant.nombre}\n`);

  // Crear categorías
  console.log('📁 Creando categorías...');
  const categoriasMap = new Map<string, string>();
  
  for (const cat of CATEGORIAS) {
    const categoria = await prisma.categoria.upsert({
      where: { tenantId_nombre: { tenantId: tenant.id, nombre: cat } },
      create: { tenantId: tenant.id, nombre: cat },
      update: {},
    });
    categoriasMap.set(cat, categoria.id);
  }
  
  console.log(`✅ ${categoriasMap.size} categorías listas\n`);

  // Crear productos en batch
  console.log('📦 Creando productos...');
  let creados = 0;
  let duplicados = 0;
  const batchSize = 50; // Crear de a 50 para no saturar

  for (let i = 0; i < cantidadProductos; i += batchSize) {
    const batch = [];
    const currentBatchSize = Math.min(batchSize, cantidadProductos - i);

    for (let j = 0; j < currentBatchSize; j++) {
      const idx = i + j;
      const nombre = NOMBRES[idx % NOMBRES.length];
      const adjetivo = ADJETIVOS[idx % ADJETIVOS.length];
      const categoria = Array.from(categoriasMap.keys())[idx % CATEGORIAS.length];
      const categoriaId = categoriasMap.get(categoria)!;

      const producto = {
        tenantId: tenant.id,
        nombre: `${nombre} ${adjetivo} #${idx + 1}`,
        precio: Math.floor(Math.random() * 5000) + 500, // 500-5500
        costo: Math.floor(Math.random() * 3000) + 300,  // 300-3300
        stock: Math.floor(Math.random() * 100) + 10,
        stockMinimo: 5,
        categoriaId,
        imagen: IMAGENES_CLOUDINARY[idx % IMAGENES_CLOUDINARY.length],
        codigoBarras: `7799${String(idx).padStart(6, '0')}`,
        codigoProducto: `PROD-${String(idx).padStart(6, '0')}`,
        activo: true,
      };

      batch.push(producto);
    }

    try {
      // Insertar batch
      await prisma.producto.createMany({
        data: batch,
        skipDuplicates: true,
      });

      creados += currentBatchSize;
      const progreso = Math.floor((creados / cantidadProductos) * 100);
      
      console.log(`  ✓ ${creados}/${cantidadProductos} (${progreso}%)`);

    } catch (error: any) {
      console.error(`  ❌ Error en batch ${i}-${i + currentBatchSize}:`, error.message);
    }
  }

  // Estadísticas finales
  const totalProductos = await prisma.producto.count({ where: { tenantId: tenant.id } });
  
  console.log('\n' + '='.repeat(50));
  console.log(`✅ Seed masivo completado!`);
  console.log(`   📦 ${creados} productos creados`);
  console.log(`   📊 Total en DB: ${totalProductos}`);
  console.log('='.repeat(50) + '\n');

  console.log('🎯 Testear performance:');
  console.log('   1. Abrí /ventas en la app');
  console.log('   2. Abrí DevTools → Network tab');
  console.log('   3. Verificá tiempo de carga (<1s)');
  console.log('   4. Verificá tamaño de imágenes (<50 KB c/u)');
  console.log('   5. Probá el scroll (debe ser fluido)\n');

  console.log('📊 Benchmarks esperados con ' + totalProductos + ' productos:');
  console.log('   Carga inicial: <800ms');
  console.log('   Búsqueda: 1 request después de 350ms');
  console.log('   Scroll: 60 FPS (fluido)');
  console.log('   Imágenes: 15-40 KB cada una\n');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });