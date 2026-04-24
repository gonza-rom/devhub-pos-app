# DevHub POS

Sistema de gestión y punto de venta SaaS multi-tenant para comercios modernos. Gestión de productos, inventario, ventas, caja y reportes — todo en la nube.

🌐 **Landing:** [devhub-pos.vercel.app](https://pos.devhub.com.ar/)
🚀 **App:** [devhub-pos-app.vercel.app](https://app.pos.devhub.com.ar/)

---

## Stack

- **Framework:** Next.js 15 (App Router)
- **Auth:** Supabase Auth (PKCE flow, confirmación por email via Resend)
- **DB:** PostgreSQL via Prisma ORM (Supabase)
- **Pagos:** MercadoPago Subscriptions (Preapproval recurrente)
- **Storage:** Cloudinary (logos e imágenes de productos)
- **Deploy:** Vercel
- **Analytics:** Vercel Analytics
- **Email:** Resend (SMTP via Supabase)
- **Landing:** Astro (repositorio separado)

---

## Arquitectura multi-tenant

Cada comercio es un **Tenant** aislado. El aislamiento se garantiza en dos capas:

1. **Middleware:** lee la cookie JWT firmada (`devhub-tenant-session`) e inyecta `x-tenant-id`, `x-user-id`, `x-user-rol` y `x-user-nombre` en todos los headers de cada request. Sin cookie válida → redirect a login.
2. **API Routes:** todas las queries a Prisma incluyen `where: { tenantId }` usando `getTenantContext()` de `lib/tenant.ts`.

```
Usuario → Middleware (JWT cookie) → API Route → Prisma (tenantId filter) → DB
```

---

## Estructura del proyecto

```
app/
├── (public)/
│   └── auth/                   # Login, registro, callback, recuperar, loading
├── (app)/                      # App protegida (layout con Sidebar + Topbar)
│   ├── dashboard/
│   ├── ventas/                 # POS (POSClient.tsx — responsive con tabs mobile)
│   ├── productos/
│   ├── caja/
│   ├── movimientos/
│   ├── estadisticas/
│   ├── categorias/
│   ├── proveedores/
│   └── configuracion/
│       ├── plan/               # Suscripción MercadoPago
│       └── usuarios/
├── api/
│   ├── auth/                   # login, logout, registro, refresh-session
│   ├── ventas/
│   ├── productos/
│   ├── usuarios/
│   ├── plan/uso/               # Barras de uso FREE
│   ├── suscripcion/            # crear, cancelar, estado
│   └── webhooks/
│       └── mercadopago/        # Webhook con verificación HMAC x-signature
lib/
├── supabase/                   # server.ts, client.ts, middleware.ts
├── session.ts                  # JWT firmado con jose (cookie devhub-tenant-session)
├── tenant.ts                   # getTenantContext(), verificarLimiteProductos()
├── mercadopago.ts              # createPreapproval, verifyWebhookSignature
├── prisma.ts
└── utils.ts                    # cn, formatPrecio, PLAN_LIMITES, toSlug
components/
├── layout/
│   ├── Sidebar.tsx             # Barras de uso FREE, trial countdown
│   └── Topbar.tsx              # Mobile drawer, breadcrumb, user dropdown
└── ventas/
    └── TicketPrint.tsx
prisma/
└── schema.prisma
```

---

## Funcionalidades

### Punto de Venta (POS)
- Interfaz táctil optimizada para velocidad, responsive con tabs en mobile
- Búsqueda y filtro de productos por nombre, código y categoría en tiempo real
- Carrito con múltiples items, cantidades y descuentos por venta
- Múltiples métodos de pago (efectivo, débito, crédito, transferencia, QR/MP)
- Cálculo automático de vuelto para pagos en efectivo
- Generación e impresión de ticket de venta en PDF
- Integración automática con caja abierta

### Inventario
- Alta, edición y baja de productos (soft delete)
- Imágenes con Cloudinary (múltiples por producto)
- Código de producto y código de barras (único por tenant)
- Control de stock con mínimo configurable y alertas visuales
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
- Historial de sesiones con modal de detalle

### Estadísticas
- Dashboard en tiempo real con cache (revalidación por tag)
- Ventas del día, semana y mes
- Productos más vendidos, márgenes y ganancia neta
- Métodos de pago más usados

### Multi-usuario
- Roles: PROPIETARIO, ADMINISTRADOR, EMPLEADO
- Permisos específicos por rol
- Gestión de usuarios por tenant con límites por plan

### Planes y Suscripciones

| Plan | Precio | Productos | Usuarios | Historial |
|---|---|---|---|---|
| FREE | Gratis (7 días) | 50 | 1 | 14 días |
| PRO | $35.000 ARS/mes | Ilimitados | 10 | 365 días |
| ENTERPRISE | A consultar | Ilimitados | Ilimitados | Ilimitados |

Los límites se definen en `lib/utils.ts` → `PLAN_LIMITES` y se aplican server-side en cada POST.

Flujo automático con MercadoPago Preapproval:
1. Usuario inicia pago → se crea preapproval → redirige al checkout de MP
2. MP cobra mensualmente de forma automática con reintentos
3. Webhooks activan/desactivan el tenant según el estado del pago

---

## Flujo de autenticación

```
Registro → Email confirmación (Resend) → /auth/callback
                                               ↓
                                     exchangeCodeForSession (PKCE)
                                               ↓
                                     /api/auth/refresh-session
                                               ↓
                                     Crea tenant en Prisma (si no existe)
                                     Firma JWT con tenantId + plan
                                     Setea cookie devhub-tenant-session
                                               ↓
                                          /dashboard

Login → /api/auth/login
             ↓
         signInWithPassword (Supabase)
         Crea tenant si no existe (fallback)
             ↓
         /auth/loading (spinner de transición)
             ↓
         /api/auth/refresh-session
             ↓
         /dashboard
```

---

## Seguridad

- **Webhook MP:** verifica firma HMAC `x-signature` en cada request. Rechaza si no viene la firma o si `MP_WEBHOOK_SECRET` no está definido en producción.
- **Tenant isolation:** `getTenantContext()` lanza error si los headers del middleware no están presentes.
- **JWT cookie:** `httpOnly`, `secure`, `sameSite: lax`, firmado con `jose` HS256, expira en 7 días.
- **Límites de plan:** validados server-side en cada POST de productos y usuarios.
- **Bloqueo por plan vencido:** el middleware redirige a `/configuracion/plan` si el plan PRO/ENTERPRISE expiró, sin queries a DB (lee `planVenceAt` del JWT).

---

## Variables de entorno

```env
# Base de datos (Supabase)
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Sesión
SESSION_SECRET=                     # string aleatorio 32+ chars

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx

# MercadoPago
MP_ACCESS_TOKEN=APP_USR-xxx         # TEST-xxx en desarrollo
MP_WEBHOOK_SECRET=xxx               # Dashboard MP → Webhooks → Secret
MP_TEST_PAYER_EMAIL=                # Solo en desarrollo/sandbox

# App
NEXT_PUBLIC_APP_URL=https://devhub-pos-app.vercel.app  # sin trailing slash
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

# Sincronizar schema y generar cliente
npx prisma db push
npx prisma generate

# Correr en desarrollo
npm run dev
```

---

## Webhook MercadoPago en desarrollo local

Exponer el puerto local con localtunnel:

```bash
npx localtunnel --port 3000
```

Configurar la URL en:
- `.env.local` → `NEXT_PUBLIC_APP_URL=https://tu-url.loca.lt`
- Panel de MP → Tu app → Webhooks → `https://tu-url.loca.lt/api/webhooks/mercadopago`

Eventos que maneja el webhook:
- `subscription_preapproval` → activa/desactiva el tenant según estado del preapproval
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

## Contacto

📧 [devhubpos@gmail.com](mailto:devhubpos@gmail.com)
💬 [WhatsApp](https://wa.me/543834946767)