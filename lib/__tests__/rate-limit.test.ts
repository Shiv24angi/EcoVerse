import {
  checkRateLimit,
  resetRateLimit,
  checkScanRateLimit,
} from '../rate-limit';

describe('checkRateLimit', () => {
  afterEach(() => {
    resetRateLimit();
    jest.restoreAllMocks();
  });

  it('allows requests under the limit', () => {
    const key = 'user-a';
    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit(key, { limit: 5, windowMs: 60_000 });
      expect(result.allowed).toBe(true);
    }
  });

  it('blocks requests once the limit is reached within the window', () => {
    const key = 'user-b';
    const opts = { limit: 3, windowMs: 60_000 };

    expect(checkRateLimit(key, opts).allowed).toBe(true);
    expect(checkRateLimit(key, opts).allowed).toBe(true);
    expect(checkRateLimit(key, opts).allowed).toBe(true);

    const blocked = checkRateLimit(key, opts);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it('does not consume the limit for requests that are blocked', () => {
    const key = 'user-c';
    const opts = { limit: 1, windowMs: 60_000 };

    expect(checkRateLimit(key, opts).allowed).toBe(true);
    checkRateLimit(key, opts);
    checkRateLimit(key, opts);
    const result = checkRateLimit(key, opts);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('resets the window correctly once the oldest request expires', () => {
    const key = 'user-d';
    const opts = { limit: 1, windowMs: 1000 };

    const realNow = Date.now;
    let now = 1_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);

    expect(checkRateLimit(key, opts).allowed).toBe(true);
    expect(checkRateLimit(key, opts).allowed).toBe(false);

    now += 1001;
    expect(checkRateLimit(key, opts).allowed).toBe(true);

    Date.now = realNow;
  });

  it('tracks separate keys independently', () => {
    const opts = { limit: 1, windowMs: 60_000 };

    expect(checkRateLimit('user-e', opts).allowed).toBe(true);
    expect(checkRateLimit('user-f', opts).allowed).toBe(true);
    expect(checkRateLimit('user-e', opts).allowed).toBe(false);
  });

  it('decreases "remaining" as requests are consumed', () => {
    const key = 'user-g';
    const opts = { limit: 3, windowMs: 60_000 };

    expect(checkRateLimit(key, opts).remaining).toBe(2);
    expect(checkRateLimit(key, opts).remaining).toBe(1);
    expect(checkRateLimit(key, opts).remaining).toBe(0);
  });
});

describe('resetRateLimit', () => {
  it('clears a specific key without affecting others', () => {
    const opts = { limit: 1, windowMs: 60_000 };

    checkRateLimit('user-h', opts);
    checkRateLimit('user-i', opts);

    resetRateLimit('user-h');

    expect(checkRateLimit('user-h', opts).allowed).toBe(true);
    expect(checkRateLimit('user-i', opts).allowed).toBe(false);
  });

  it('clears all keys when called with no argument', () => {
    const opts = { limit: 1, windowMs: 60_000 };

    checkRateLimit('user-j', opts);
    checkRateLimit('user-k', opts);

    resetRateLimit();

    expect(checkRateLimit('user-j', opts).allowed).toBe(true);
    expect(checkRateLimit('user-k', opts).allowed).toBe(true);
  });
});

describe('checkScanRateLimit', () => {
  afterEach(() => {
    resetRateLimit();
  });

  it('allows up to 10 scans per minute per user', () => {
    const email = 'scanner@example.com';
    for (let i = 0; i < 10; i++) {
      expect(checkScanRateLimit(email).allowed).toBe(true);
    }
    expect(checkScanRateLimit(email).allowed).toBe(false);
  });

  it('scopes the limit per user email', () => {
    for (let i = 0; i < 10; i++) {
      checkScanRateLimit('a@example.com');
    }
    expect(checkScanRateLimit('a@example.com').allowed).toBe(false);
    // A different user's email is a different key, unaffected by the above.
    expect(checkScanRateLimit('b@example.com').allowed).toBe(true);
  });
});