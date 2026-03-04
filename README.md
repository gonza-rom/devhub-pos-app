# DevHub POS

Sistema de gestión y punto de venta SaaS multi-tenant para comercios modernos.

🌐 **Landing:** [devhub-pos.vercel.app](https://devhub-pos.vercel.app)  
🚀 **App:** [app.devhubpos.com](https://app.devhubpos.com)

---

## Stack

- **Framework:** Next.js 14 (App Router)
- **Base de datos:** PostgreSQL (Supabase)
- **ORM:** Prisma
- **Auth:** Supabase Auth
- **Storage:** Cloudinary (imágenes de productos)
- **Pagos:** MercadoPago (suscripciones recurrentes / Preapproval)
- **Landing:** Astro (repositorio separado)
- **Deploy:** Vercel

---

## Arquitectura

Multi-tenant por `tenantId`. Cada comercio tiene sus propios datos completamente aislados. El middleware inyecta `x-tenant-id`, `x-user-id`, `x-user-rol` y `x-user-nombre` en cada request desde la cookie de sesión, sin queries adicionales a la DB.
```
devhub-pos-app/
├── app/
│   ├── (auth)/               # Login, Register
│   ├── (app)/                # App principal (protegida)
│   │   ├── pos/              # Punto de venta
│   │   ├── inventario/       # Gestión de productos
│   │   ├── movimientos/      # Historial de stock
│   │   ├── estadisticas/     # Dashboard y reportes
│   │   ├── categorias/       # Categorías de productos
│   │   ├── proveedores/      # Gestión de proveedores
│   │   ├── caja/             # Apertura y cierre de caja
│   │   └── configuracion/
│   │       ├── plan/         # Suscripción y planes
│   │       └── ...           # Datos del negocio, usuarios
│   └── api/
│       ├── productos/
│       ├── ventas/
│       ├── movimientos/
│       ├── categorias/
│       ├── proveedores/
│       ├── caja/
│       ├── usuarios/
│       ├── suscripcion/
│       │   ├── crear/        # Inicia preapproval en MP
│       │   ├── cancelar/     # Cancela suscripción
│       │   └── estado/       # Estado actual del plan
│       └── webhooks/
│           └── mercadopago/  # Recibe eventos de MP
├── lib/
│   ├── tenant.ts             # getTenantContext(), getTenantId()
│   ├── mercadopago.ts        # Cliente MP, preapproval, webhooks
│   ├── prisma.ts
│   └── utils.ts              # PLAN_LIMITES, helpers
└── prisma/
    └── schema.prisma
```

---

## Funcionalidades

### Punto de Venta (POS)
- Interfaz táctil optimizada para velocidad
- Búsqueda y filtro de productos en tiempo real
- Carrito con múltiples items y cantidades
- Descuentos por venta
- Múltiples métodos de pago (efectivo, tarjeta, transferencia, MP, etc.)
- Integración automática con caja

### Inventario
- Alta, edición y baja de productos (soft delete)
- Imágenes con Cloudinary (múltiples por producto)
- Código de producto y código de barras (único por tenant)
- Control de stock con mínimo configurable
- Alertas visuales de stock bajo
- Historial de cambios de precio

### Movimientos de Stock
- Tipos: ENTRADA, SALIDA, VENTA, AJUSTE
- Historial completo con filtros
- Cancelación de movimientos con motivo

### Caja
- Apertura con saldo inicial
- Registro automático de ventas en efectivo y virtuales
- Ingresos y egresos manuales
- Cierre con conteo físico y cálculo de diferencia
- Historial de sesiones

### Estadísticas
- Dashboard en tiempo real
- Ventas del día, semana y mes
- Productos más vendidos
- Márgenes y ganancia neta
- Métodos de pago más usados

### Multi-usuario
- Roles: PROPIETARIO, ADMINISTRADOR, EMPLEADO
- Permisos específicos por rol
- Gestión de usuarios por tenant

### Planes y Suscripciones

| Plan | Precio | Detalle |
|------|--------|---------|
| FREE | Gratis | 7 días de prueba, acceso completo |
| PRO | $35.000/mes ARS | Productos ilimitados, hasta 3 usuarios |
| ENTERPRISE | A consultar | Multi-sucursal, usuarios ilimitados |

Flujo automático con MercadoPago Preapproval:
1. Usuario inicia pago → se crea preapproval → redirige al checkout de MP
2. MP cobra mensualmente de forma automática con reintentos
3. Webhooks activan/desactivan el tenant según el estado del pago

---

## Variables de entorno
```bash
# Base de datos (Supabase)
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx

# MercadoPago
MP_ACCESS_TOKEN=TEST-xxx         # APP_USR-xxx en producción
MP_WEBHOOK_SECRET=tu-secret-aqui
MP_TEST_PAYER_EMAIL=             # Solo en desarrollo/sandbox

# App
NEXT_PUBLIC_APP_URL=https://app.devhubpos.com
```

---

## Instalación
```bash
# Clonar e instalar
git clone https://github.com/tu-usuario/devhub-pos-app
cd devhub-pos-app
npm install

# Variables de entorno
cp .env.example .env.local
# Completar .env.local con tus credenciales

# Sincronizar schema
npx prisma db push
npx prisma generate

# Correr en desarrollo
npm run dev
```

---

## Webhook MercadoPago (desarrollo local)

Exponer el puerto local con localtunnel:
```bash
npx localtunnel --port 3000
```

Configurar la URL en:
- `.env.local` → `NEXT_PUBLIC_APP_URL=https://tu-url.loca.lt`
- Panel de MP → Tu app → Webhooks → `https://tu-url.loca.lt/api/webhooks/mercadopago`

Eventos que maneja el webhook:
- `subscription_preapproval` → activa/desactiva el tenant
- `payment` → renueva el vencimiento en cobros mensuales exitosos

---

## Scripts
```bash
npm run dev           # Desarrollo
npm run build         # Build producción
npm run start         # Servidor producción
npx prisma studio     # UI para explorar la DB
npx prisma db push    # Sincronizar schema
```

---

## Pendientes

- [ ] Middleware de bloqueo para tenants con plan vencido
- [ ] Historial de ventas con filtros y búsqueda
- [ ] Impresión / exportación de tickets
- [ ] Exportación de reportes (Excel/PDF)
- [ ] Notificaciones de stock bajo por email
- [ ] Recuperación de contraseña
- [ ] Mobile / PWA

---

## Contacto

📧 [devhubpos@gmail.com](mailto:devhubpos@gmail.com)  
💬 [WhatsApp](https://wa.me/543834946767)