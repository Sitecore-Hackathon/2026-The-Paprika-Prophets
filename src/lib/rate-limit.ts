/**
 * Simple in-memory rate limiter for API routes.
 *
 * Each key (e.g. IP or tenant) gets a sliding window of request timestamps.
 * Not suitable for multi-instance deployments — use Redis-backed limiter if
 * the app is scaled horizontally.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < 60_000);
    if (entry.timestamps.length === 0) store.delete(key);
  }
}, 300_000);

/**
 * Check whether a request should be rate-limited.
 *
 * @param key   Unique caller identifier (IP, tenant ID, etc.)
 * @param limit Max requests allowed in the window.
 * @param windowMs Window duration in milliseconds (default: 60 s).
 * @returns `{ allowed, remaining, retryAfterMs }`.
 */
export function rateLimit(
  key: string,
  limit: number = 10,
  windowMs: number = 60_000,
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  let entry = store.get(key);

  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= limit) {
    const oldest = entry.timestamps[0];
    const retryAfterMs = windowMs - (now - oldest);
    return { allowed: false, remaining: 0, retryAfterMs };
  }

  entry.timestamps.push(now);
  return {
    allowed: true,
    remaining: limit - entry.timestamps.length,
    retryAfterMs: 0,
  };
}
