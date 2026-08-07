export const SCAN_RATE_LIMIT_WINDOW_MS = 60_000;
export const SCAN_RATE_LIMIT_MAX_REQUESTS = 10;
/**
 * Maximum number of distinct identities tracked at once, to bound memory
 * usage. When exceeded, the least recently used identity is evicted.
 *
 * Trade-offs (acceptable for a single-instance deployment, worth revisiting
 * before horizontal scaling):
 * - Eviction resets that identity's window: if traffic from more than
 *   MAX_RATE_LIMIT_KEYS distinct identities arrives while a throttled
 *   identity is idle, it can be evicted and its quota effectively reset
 *   early.
 * - This limiter is per process. Each server instance keeps its own
 *   requestLog, so the effective limit across a multi-instance deployment
 *   becomes SCAN_RATE_LIMIT_MAX_REQUESTS × instance count. Moving to a
 *   shared store (e.g. Redis with a sorted set per identity) would fix
 *   both of these before scaling horizontally.
 */
export const MAX_RATE_LIMIT_KEYS = 1_000;

type RateLimitEntry = {
  requestTimestamps: number[];
  lastAccessedAt: number;
};

const requestLog = new Map<string, RateLimitEntry>();

function pruneExpiredEntries(now: number) {
  for (const [key, entry] of requestLog.entries()) {
    if (now - entry.lastAccessedAt >= SCAN_RATE_LIMIT_WINDOW_MS) {
      requestLog.delete(key);
    }
  }
}

function refreshEntryOrder(key: string, entry: RateLimitEntry) {
  requestLog.delete(key);
  requestLog.set(key, entry);
}

function enforceMaxKeyCount() {
  while (requestLog.size > MAX_RATE_LIMIT_KEYS) {
    const oldestKey = requestLog.keys().next().value;
    if (oldestKey === undefined) {
      break;
    }

    requestLog.delete(oldestKey);
  }
}

export function resetRateLimit() {
  requestLog.clear();
}

export function checkScanRateLimit(identity: string) {
  const now = Date.now();

  pruneExpiredEntries(now);

  const existingEntry = requestLog.get(identity);
  if (!existingEntry) {
    requestLog.set(identity, {
      requestTimestamps: [now],
      lastAccessedAt: now,
    });
    enforceMaxKeyCount();

    return {
      allowed: true,
      retryAfterMs: 0,
    };
  }

  const entry = {
    ...existingEntry,
    requestTimestamps: existingEntry.requestTimestamps.filter(
      (timestamp) => now - timestamp < SCAN_RATE_LIMIT_WINDOW_MS
    ),
    lastAccessedAt: now,
  };

  if (entry.requestTimestamps.length >= SCAN_RATE_LIMIT_MAX_REQUESTS) {
    refreshEntryOrder(identity, entry);
    enforceMaxKeyCount();

    const oldestTimestamp = entry.requestTimestamps[0];
    return {
      allowed: false,
      retryAfterMs: Math.max(
        0,
        oldestTimestamp + SCAN_RATE_LIMIT_WINDOW_MS - now
      ),
    };
  }

  entry.requestTimestamps.push(now);
  refreshEntryOrder(identity, entry);
  enforceMaxKeyCount();

  return {
    allowed: true,
    retryAfterMs: 0,
  };
}