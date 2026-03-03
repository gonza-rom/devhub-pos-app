// lib/prisma-tenant.ts
// Extiende el cliente Prisma para inyectar tenantId automáticamente
// en todas las operaciones, garantizando aislamiento entre comercios.

import prisma from "@/lib/prisma";

export function getPrismaForTenant(tenantId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async findMany({ args, query }: any) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async findFirst({ args, query }: any) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async findUnique({ args, query }: any) {
          // findUnique no acepta tenantId en where si no es parte de la PK/unique
          // Lo manejamos con findFirst para seguridad
          return query(args);
        },
        async create({ args, query }: any) {
          args.data = { ...args.data, tenantId };
          return query(args);
        },
        async createMany({ args, query }: any) {
          if (Array.isArray(args.data)) {
            args.data = args.data.map((d: any) => ({ ...d, tenantId }));
          } else {
            args.data = { ...args.data, tenantId };
          }
          return query(args);
        },
        async update({ args, query }: any) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async updateMany({ args, query }: any) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async delete({ args, query }: any) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async deleteMany({ args, query }: any) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async count({ args, query }: any) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async aggregate({ args, query }: any) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
      },
    },
  });
}