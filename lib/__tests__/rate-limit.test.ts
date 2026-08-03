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

  it('evicts the least recently used key when the store grows too large', () => {
    for (let index = 0; index < MAX_RATE_LIMIT_KEYS; index++) {
      expect(checkScanRateLimit(`scanner-${index}`)).toMatchObject({
        allowed: true,
      });
    }

    expect(checkScanRateLimit('scanner-0').allowed).toBe(true);

    checkScanRateLimit(`scanner-${MAX_RATE_LIMIT_KEYS}`);

    expect(checkScanRateLimit('scanner-1').allowed).toBe(true);
    expect(checkScanRateLimit('scanner-0').allowed).toBe(true);
  });
});