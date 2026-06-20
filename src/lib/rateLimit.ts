/**
 * Simple sliding-window rate limiter.
 * Uses Redis when REDIS_URL is configured (recommended for multi-instance
 * Vercel deployments), otherwise falls back to an in-memory map which is
 * fine for a single-region, low-traffic deployment (100-500 users).
 */
import Redis from 'ioredis';

let redis: Redis | null = null;
if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1, lazyConnect: true });
  redis.connect().catch(() => {
    // Redis unavailable - silently fall back to in-memory limiting.
    redis = null;
  });
}

interface Bucket {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, Bucket>();

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

const DEFAULT_MAX = Number(process.env.RATE_LIMIT_MAX || 100);
const DEFAULT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);

export async function rateLimit(
  key: string,
  max: number = DEFAULT_MAX,
  windowMs: number = DEFAULT_WINDOW_MS,
): Promise<RateLimitResult> {
  const now = Date.now();

  if (redis && redis.status === 'ready') {
    const redisKey = `ratelimit:${key}`;
    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.pexpire(redisKey, windowMs);
    }
    const ttl = await redis.pttl(redisKey);
    return {
      success: count <= max,
      remaining: Math.max(0, max - count),
      resetAt: now + (ttl > 0 ? ttl : windowMs),
    };
  }

  // In-memory fallback
  const bucket = memoryStore.get(key);
  if (!bucket || bucket.resetAt < now) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: max - 1, resetAt: now + windowMs };
  }

  bucket.count += 1;
  return {
    success: bucket.count <= max,
    remaining: Math.max(0, max - bucket.count),
    resetAt: bucket.resetAt,
  };
}

/** Helper to build a rate-limit key from an IP + route action. */
export function rateLimitKey(ip: string, action: string): string {
  return `${action}:${ip}`;
}

/** Cleans stale in-memory buckets periodically (no-op in serverless, useful for long-running dev server). */
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of memoryStore.entries()) {
    if (bucket.resetAt < now) memoryStore.delete(key);
  }
}, 5 * 60_000);
