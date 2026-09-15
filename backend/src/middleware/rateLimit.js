/**
 * Tiny in-memory auth rate limiter (PRD §37).
 * Better Auth already rate-limits its own /api/auth/* endpoints; this guards
 * the thin PRD /auth/* aliases so they can't be used to bypass those caps.
 *
 * Per-IP sliding window. Defaults are intentionally strict for writes.
 */
const buckets = new Map();

function prune() {
  const now = Date.now();
  for (const [key, entry] of buckets) {
    if (now > entry.resetAt) buckets.delete(key);
  }
  // Prevent unbounded growth if behind a shared NAT.
  if (buckets.size > 20000) {
    const overflow = buckets.size - 20000;
    let n = 0;
    for (const key of buckets.keys()) {
      buckets.delete(key);
      if (++n >= overflow) break;
    }
  }
}

export function authRateLimit({ windowMs = 60_000, max = 20 } = {}) {
  return (req, res, next) => {
    prune();
    const ip =
      req.ip ??
      req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() ??
      req.socket?.remoteAddress ??
      "unknown";
    const key = `${ip}:${req.path}`;
    const now = Date.now();
    let entry = buckets.get(key);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
    }
    entry.count += 1;
    buckets.set(key, entry);

    const remaining = Math.max(0, max - entry.count);
    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(remaining));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > max) {
      const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json({
        error: "Too many attempts. Please try again shortly.",
      });
    }
    next();
  };
}

/** Strict preset for login/register per PRD §37. */
export const strictAuthLimit = () => authRateLimit({ windowMs: 60_000, max: 20 });
