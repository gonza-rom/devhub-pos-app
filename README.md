# DevHub POS — SaaS Multi-Tenant

Sistema de punto de venta SaaS. Cada comercio (tenant) tiene su POS, inventario y estadísticas de forma aislada.

## Stack
- **Next.js 15** (App Router)
- **Supabase** (Auth + PostgreSQL)
- **Prisma 5** (ORM)
- **Tailwind CSS 3**
- **TypeScript**

---

## 🚀 Setup inicial (paso a paso)

### 1. Crear proyecto en Supabase
1. Entrar a [supabase.com](https://supabase.com) → New project
2. Guardar la contraseña de la DB
3. Ir a **Settings → API** y copiar:
   - `Project URL`
   - `anon public` key
   - `service_role` key
4. Ir a **Settings → Database** → Connection string:
   - Copiar la URL con **"Transaction pooler"** (puerto 6543) → es el `DATABASE_URL`
   - Copiar la URL con **"Session pooler"** (puerto 5432) → es el `DIRECT_URL`

### 2. Clonar y configurar
```bash
# Clonar
git clone https://github.com/tu-usuario/devhub-pos.git
cd devhub-pos

# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env.local
# Editar .env.local con los datos de Supabase
```

### 3. Configurar la base de datos
```bash
# Generar el cliente de Prisma
npm run db:generate

# Aplicar el schema a Supabase
npm run db:push

# (Opcional) Cargar datos de prueba
npm run db:seed
```

### 4. Correr en desarrollo
```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

---

## 📁 Estructura del proyecto

```
devhub-pos/
├── app/
│   ├── (public)/          # Login, registro (sin auth)
│   ├── (app)/             # Dashboard, POS, productos, etc. (con auth)
│   ├── (admin)/           # Super-admin de la plataforma
│   └── api/               # API Routes
├── components/
│   ├── layout/            # Sidebar, Topbar
│   ├── ui/                # Botones, inputs, modales
│   ├── productos/         # Formularios de productos
│   └── ventas/            # POS, carrito
├── lib/
│   ├── prisma.ts          # Cliente Prisma singleton
│   ├── supabase/          # Clientes de Supabase (server/client)
│   ├── tenant.ts          # Helpers de tenant
│   └── utils.ts           # Helpers generales
├── prisma/
│   ├── schema.prisma      # Schema completo
│   └── seed.ts            # Datos de prueba
├── types/
│   └── index.ts           # TypeScript types
└── middleware.ts           # Auth + tenant injection
```

---

## 🔐 Cómo funciona la autenticación

1. El usuario se registra en `/auth/registro` → se crea un **Tenant** + **UsuarioTenant** en la DB
2. Al hacer login, Supabase devuelve una sesión con cookies HTTP-only
3. El **middleware** intercepta cada request:
   - Si no hay sesión → redirige a `/auth/login`
   - Si hay sesión → busca el `tenantId` del usuario en Prisma y lo inyecta en los headers
4. Todas las API Routes leen el `tenantId` del header → **aislamiento garantizado**

---

## 💡 TypeScript para principiantes

TypeScript es JavaScript con tipos. Los tipos son "descripción de qué forma tiene un dato".

```typescript
// JavaScript
function sumar(a, b) { return a + b }

// TypeScript — especificás qué tipo son a y b
function sumar(a: number, b: number): number { return a + b }
```

En este proyecto vas a ver mucho:
- `string` — texto
- `number` — número
- `boolean` — true/false
- `string | null` — puede ser texto o null
- `Promise<X>` — es asíncrono y devuelve X

Si el editor te marca un error rojo, casi siempre es que el tipo no coincide. Los errores de TypeScript son tus amigos: te dicen el problema antes de que llegue a producción.

---

## 📝 Comandos útiles

```bash
npm run dev          # Desarrollo
npm run build        # Build de producción
npm run db:generate  # Regenerar cliente Prisma después de cambiar el schema
npm run db:push      # Aplicar cambios del schema a la DB (sin migración)
npm run db:migrate   # Crear una migración formal
npm run db:studio    # Abrir Prisma Studio (GUI de la DB)
npm run db:seed      # Cargar datos de prueba
```
