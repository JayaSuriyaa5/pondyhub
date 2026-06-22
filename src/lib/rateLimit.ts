/**
 * Minimal in-memory rate limiter.
 *
 * NOTE: This works correctly for a single Node.js process (fine for an MVP
 * / single-instance deployment). If you later scale to multiple instances
 * behind a load balancer, replace this with a shared store (e.g. Redis +
 * a sliding-window algorithm) so limits are enforced consistently across
 * instances. The interface below is intentionally small so swapping the
 * implementation later doesn't require touching call sites.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Periodically clear stale buckets so this Map doesn't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}, 60_000);

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * @param key Unique identifier for the caller + action, e.g. `login:1.2.3.4`
 * @param limit Max requests allowed within the window
 * @param windowMs Window size in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count, resetAt: existing.resetAt };
}

/**
 * Extracts a best-effort client IP from a NextRequest's headers.
 * Falls back to "unknown" if no proxy headers are present (e.g. local dev).
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}
