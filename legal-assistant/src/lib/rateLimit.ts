// A very small in-memory rate limiter (MVP only).
// It remembers recent request times per visitor. It resets when the server
// restarts, and on serverless hosting each instance has its own memory, so
// treat it as basic protection for a demo, not a production-grade limiter.

const hits = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs = 60_000
): { ok: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);

  if (recent.length >= limit) {
    hits.set(key, recent);
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((recent[0] + windowMs - now) / 1000)
    );
    return { ok: false, retryAfterSeconds };
  }

  recent.push(now);
  hits.set(key, recent);

  // Tidy up occasionally so the map doesn't grow forever.
  if (hits.size > 1000) {
    for (const [k, times] of hits) {
      if (times.every((t) => now - t >= windowMs)) hits.delete(k);
    }
  }
  return { ok: true, retryAfterSeconds: 0 };
}
