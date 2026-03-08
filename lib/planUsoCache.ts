// lib/planUsoCache.ts
// Cache en memoria para el fetch de /api/plan/uso.
// Evita que el Sidebar haga 3 queries a Prisma en cada navegación.
// TTL: 60 segundos — suficiente para datos que cambian poco.

type PlanUsoData = {
  plan:     string;
  uso:      { productos: number; usuarios: number };
  limites:  Record<string, number | null>;
  trial:    { diasRestantes: number | null; vencidoAt: string | null; vencido: boolean };
};

type CacheEntry = {
  data:      PlanUsoData;
  expiresAt: number;
};

const TTL_MS = 60_000; // 60 segundos

let cache: CacheEntry | null = null;

export function getPlanUsoCache(): PlanUsoData | null {
  if (!cache || Date.now() > cache.expiresAt) return null;
  return cache.data;
}

export function setPlanUsoCache(data: PlanUsoData): void {
  cache = { data, expiresAt: Date.now() + TTL_MS };
}

export function invalidatePlanUsoCache(): void {
  cache = null;
}