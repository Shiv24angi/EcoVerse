export interface RateLimitConfig {
  windowMs: number;
  max: number;
}

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const stores = new Map<string, RateLimitRecord>();

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of stores) {
      if (record.resetAt <= now) {
        stores.delete(key);
      }
    }
  }, 60000);
}

function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

export function checkRateLimit(req: Request, config: RateLimitConfig) {
  const ip = getClientIp(req);
  const url = new URL(req.url);
  const routeKey = `${req.method}:${url.pathname}`;
  const key = `${ip}:${routeKey}`;
  const now = Date.now();

  let record = stores.get(key);

  if (!record || record.resetAt <= now) {
    record = { count: 0, resetAt: now + config.windowMs };
    stores.set(key, record);
  }

  record.count++;

  const limited = record.count > config.max;
  const remaining = Math.max(0, config.max - record.count);
  const resetIn = record.resetAt - now;

  return { limited, remaining, resetIn };
}
