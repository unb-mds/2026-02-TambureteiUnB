/**
 * Rate limiter em memoria com limpeza automatica de entradas expiradas
 * e limite rigido de chaves para evitar vazamento de memoria (OOM) sob rajadas.
 */

export interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface RateLimitCheckResult {
  limited: boolean;
  remaining: number;
  retryAfterSeconds: number;
  resetAt: number;
}

export class BoundedMemoryRateLimiter {
  private readonly store = new Map<string, RateLimitEntry>();
  private readonly maxEntries: number;

  constructor(maxEntries: number = 5000) {
    this.maxEntries = Math.max(50, maxEntries);
  }

  private prune(now: number): void {
    if (this.store.size < this.maxEntries) {
      return;
    }

    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.resetAt) {
        this.store.delete(key);
      }
    }

    while (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey === undefined) break;
      this.store.delete(oldestKey);
    }
  }

  check(
    key: string,
    maxRequests: number,
    windowMs: number,
    now: number = Date.now()
  ): RateLimitCheckResult {
    const existing = this.store.get(key);

    if (!existing || now >= existing.resetAt) {
      this.store.delete(key);
      this.prune(now);
      const resetAt = now + windowMs;
      this.store.set(key, { count: 1, resetAt });
      return {
        limited: false,
        remaining: Math.max(0, maxRequests - 1),
        retryAfterSeconds: 0,
        resetAt,
      };
    }

    if (existing.count >= maxRequests) {
      return {
        limited: true,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
        resetAt: existing.resetAt,
      };
    }

    existing.count += 1;
    // Atualiza a ordem para comportamento LRU
    this.store.delete(key);
    this.store.set(key, existing);

    return {
      limited: false,
      remaining: Math.max(0, maxRequests - existing.count),
      retryAfterSeconds: 0,
      resetAt: existing.resetAt,
    };
  }

  size(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }
}

/**
 * Extrai o IP real do cliente priorizando headers confiaveis de Cloudflare/Nginx
 * e evitando confiar no primeiro salto de x-forwarded-for (facilmente forjavel).
 */
export function extractClientIp(headers: Pick<Headers, "get">): string {
  const cfIp = headers.get("cf-connecting-ip")?.trim();
  if (cfIp) return cfIp.slice(0, 64);

  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 64);

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length > 0) {
      return parts[parts.length - 1].slice(0, 64);
    }
  }

  return "127.0.0.1";
}
