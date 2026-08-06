/**
 * In-memory rate limiting for public API endpoints (Issue #459).
 *
 * A sliding-window counter keyed per (route path + client identifier). It runs
 * in Next.js middleware (Edge runtime) before any route handler, so abusive
 * clients are rejected with HTTP 429 before they can hit the database or the
 * Open Food Facts / Climatiq upstreams.
 *
 * The store is an in-process Map: it is intentionally simple and dependency
 * free. Each server instance enforces its own budget (fine for a first defense
 * layer and for serverless deployments where instances are short-lived). For a
 * globally shared budget across many instances, swap the store for an external
 * one (e.g. Upstash Redis) without changing the public API of this module.
 *
 * Authenticated requests could be keyed by `x-user-email` instead of the IP;
 * the current implementation uses the client IP because the email is only
 * available after token verification, which happens later in the middleware.
 */

import { NextResponse } from 'next/server';

export interface RateLimitRule {
  /** Window length in milliseconds. */
  windowMs: number;
  /** Maximum number of requests allowed within the window. */
  max: number;
}

export type RateLimitBucket = 'default' | 'auth';

export interface RateLimitResult {
  /** True when the request is allowed, false when it should be rejected. */
  success: boolean;
  limit: number;
  remaining: number;
  /** Epoch ms at which the current window expires. */
  resetAt: number;
  /** How long (ms) the client must wait before retrying. */
  retryAfterMs: number;
}

/**
 * Per-bucket rules. Auth endpoints get a tighter budget to slow down
 * credential-stuffing / brute-force attempts; the rest of the API gets a
 * generous budget that comfortably fits the legitimate client's polling.
 */
export const RATE_LIMIT_RULES: Record<RateLimitBucket, RateLimitRule> = {
  default: { windowMs: 60_000, max: 120 },
  auth: { windowMs: 60_000, max: 30 },
};

/**
 * Sliding-window counter. Records the timestamp of every accepted hit and
 * counts how many hits fell inside the last `windowMs`. Rejects when the count
 * reaches `max`, and computes the retry delay from the oldest hit in the window
 * so a client knows exactly when it can try again.
 */
export class SlidingWindowRateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly windowMs: number,
    private readonly max: number
  ) {}

  /**
   * Checks (and records) a hit for `key`. Pass an explicit `now` in tests.
   */
  check(key: string, now: number = Date.now()): RateLimitResult {
    const windowStart = now - this.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((t) => t > windowStart);

    if (recent.length >= this.max) {
      // Oldest hit in the window is the first to expire — that is when a
      // retry becomes possible.
      const resetAt = Math.min(...recent) + this.windowMs;
      this.hits.set(key, recent);
      return {
        success: false,
        limit: this.max,
        remaining: 0,
        resetAt,
        retryAfterMs: Math.max(0, resetAt - now),
      };
    }

    recent.push(now);
    this.hits.set(key, recent);
    return {
      success: true,
      limit: this.max,
      remaining: this.max - recent.length,
      resetAt: now + this.windowMs,
      retryAfterMs: 0,
    };
  }

  /** Drops all recorded hits (used in tests). */
  reset(): void {
    this.hits.clear();
  }
}

// Per-instance limiters. Module-level state persists for the lifetime of the
// serverless isolate — see the module comment above.
const limiters = new Map<RateLimitBucket, SlidingWindowRateLimiter>();

/** Returns (creating on first use) the limiter for a bucket. */
export function getLimiter(bucket: RateLimitBucket): SlidingWindowRateLimiter {
  let limiter = limiters.get(bucket);
  if (!limiter) {
    limiter = new SlidingWindowRateLimiter(
      RATE_LIMIT_RULES[bucket].windowMs,
      RATE_LIMIT_RULES[bucket].max
    );
    limiters.set(bucket, limiter);
  }
  return limiter;
}

/**
 * Maps an API route path to a rate-limit bucket. Authentication endpoints are
 * treated as sensitive (tight budget); everything else uses the default rule.
 */
export function getBucket(pathname: string): RateLimitBucket {
  return pathname.startsWith('/api/auth/') ? 'auth' : 'default';
}

/** True when the path is one of the public API routes we rate limit. */
export function isApiPath(pathname: string): boolean {
  return pathname.startsWith('/api/');
}

/**
 * Extracts a stable client identifier from the request headers. Prefers the
 * first `x-forwarded-for` entry (set by the platform / proxy), then
 * `x-real-ip`, and falls back to a shared placeholder.
 */
export function getClientIdentifier(
  headers: Headers,
  fallback: string = 'unknown'
): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  return fallback;
}

/**
 * Checks whether a request to `pathname` from `identifier` is within budget.
 * Records the hit when allowed. Returns the rate-limit result so the caller can
 * build an accurate 429 response.
 */
export function checkRateLimit(
  pathname: string,
  identifier: string,
  now: number = Date.now()
): RateLimitResult {
  const bucket = getBucket(pathname);
  const key = `${pathname}:${identifier}`;
  return getLimiter(bucket).check(key, now);
}

/**
 * Builds the HTTP 429 response with standard rate-limit headers, optionally
 * including the request ID so rate-limited requests remain traceable.
 */
export function buildRateLimitResponse(
  result: RateLimitResult,
  requestId?: string
): NextResponse {
  const retryAfterSeconds = Math.max(1, Math.ceil(result.retryAfterMs / 1000));
  const response = NextResponse.json(
    {
      error: 'Too many requests',
      retryAfterSeconds,
    },
    { status: 429 }
  );
  response.headers.set('Retry-After', String(retryAfterSeconds));
  response.headers.set('X-RateLimit-Limit', String(result.limit));
  response.headers.set('X-RateLimit-Remaining', String(result.remaining));
  response.headers.set(
    'X-RateLimit-Reset',
    String(Math.ceil(result.resetAt / 1000))
  );
  if (requestId) {
    response.headers.set('X-Request-Id', requestId);
  }
  return response;
}
