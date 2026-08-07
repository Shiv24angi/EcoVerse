import {
  checkScanRateLimit,
  resetRateLimit,
  SCAN_RATE_LIMIT_WINDOW_MS,
  SCAN_RATE_LIMIT_MAX_REQUESTS,
  MAX_RATE_LIMIT_KEYS,
} from '../rate-limit';

describe('checkScanRateLimit', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-03T12:00:00.000Z'));
    resetRateLimit();
  });

  afterEach(() => {
    resetRateLimit();
    jest.useRealTimers();
  });

  it('allows up to ten requests in the rolling window', () => {
    const identity = 'scanner-1';

    for (let attempt = 0; attempt < SCAN_RATE_LIMIT_MAX_REQUESTS; attempt++) {
      expect(checkScanRateLimit(identity).allowed).toBe(true);
    }

    const limited = checkScanRateLimit(identity);
    expect(limited.allowed).toBe(false);
    expect(limited.retryAfterMs).toBeGreaterThan(0);
  });

  it('resets once the window has elapsed', () => {
    const identity = 'scanner-2';

    for (let attempt = 0; attempt < SCAN_RATE_LIMIT_MAX_REQUESTS; attempt++) {
      checkScanRateLimit(identity);
    }

    expect(checkScanRateLimit(identity).allowed).toBe(false);

    jest.advanceTimersByTime(SCAN_RATE_LIMIT_WINDOW_MS + 1);

    expect(checkScanRateLimit(identity).allowed).toBe(true);
  });

  it('keeps identities independent', () => {
    for (let attempt = 0; attempt < SCAN_RATE_LIMIT_MAX_REQUESTS; attempt++) {
      checkScanRateLimit('scanner-a');
    }

    expect(checkScanRateLimit('scanner-a').allowed).toBe(false);
    expect(checkScanRateLimit('scanner-b').allowed).toBe(true);
  });

  it('evicts the least recently used identity once the store exceeds capacity', () => {
    const evictedIdentity = 'victim';
    const retainedIdentity = 'retained';

    // Saturate `victim` first, so — as long as nothing else touches it
    // again — it becomes the least recently used entry.
    for (let attempt = 0; attempt < SCAN_RATE_LIMIT_MAX_REQUESTS; attempt++) {
      checkScanRateLimit(evictedIdentity);
    }
    expect(checkScanRateLimit(evictedIdentity).allowed).toBe(false);

    // Saturate `retained` second, so it's more recently touched than
    // `victim` and should be the one that survives eviction.
    for (let attempt = 0; attempt < SCAN_RATE_LIMIT_MAX_REQUESTS; attempt++) {
      checkScanRateLimit(retainedIdentity);
    }
    expect(checkScanRateLimit(retainedIdentity).allowed).toBe(false);

    // Fill the store with just enough new identities to push it one over
    // capacity, forcing exactly one eviction: the least recently used
    // entry, which is `victim`.
    for (let index = 0; index < MAX_RATE_LIMIT_KEYS - 1; index++) {
      checkScanRateLimit(`filler-${index}`);
    }

    // `retained` was touched more recently than `victim` and was never
    // evicted, so it should still be blocked (no time has passed).
    expect(checkScanRateLimit(retainedIdentity).allowed).toBe(false);

    // `victim` was evicted, so its window restarted — it's allowed again
    // even though no real time has passed.
    expect(checkScanRateLimit(evictedIdentity).allowed).toBe(true);
  });
});