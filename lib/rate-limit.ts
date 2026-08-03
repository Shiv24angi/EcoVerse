export const SCAN_RATE_LIMIT_WINDOW_MS = 60_000;
export const SCAN_RATE_LIMIT_MAX_REQUESTS = 10;
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