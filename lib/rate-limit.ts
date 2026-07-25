interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

const requestLog = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;

  const timestamps = requestLog.get(key) ?? [];

  const recent = timestamps.filter((t) => t > windowStart);

  if (recent.length >= limit) {
    const oldest = recent[0];
    requestLog.set(key, recent);
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, oldest + windowMs - now),
    };
  }

  recent.push(now);
  requestLog.set(key, recent);

  return {
    allowed: true,
    remaining: limit - recent.length,
    retryAfterMs: 0,
  };
}

export function resetRateLimit(key?: string): void {
  if (key) {
    requestLog.delete(key);
  } else {
    requestLog.clear();
  }
}

export function checkScanRateLimit(userEmail: string): RateLimitResult {
  return checkRateLimit(`scan:${userEmail}`, {
    limit: 10,
    windowMs: 60_000,
  });
}