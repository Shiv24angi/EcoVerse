/**
 * @jest-environment node
 */

import {
  SlidingWindowRateLimiter,
  getBucket,
  isApiPath,
  getClientIdentifier,
  checkRateLimit,
  buildRateLimitResponse,
  getLimiter,
  RATE_LIMIT_RULES,
} from '../rate-limit';

describe('rate limiting (Issue #459)', () => {
  describe('SlidingWindowRateLimiter', () => {
    it('should allow requests up to the max within a window', () => {
      const limiter = new SlidingWindowRateLimiter(10_000, 3);
      const now = 1_000_000;

      expect(limiter.check('k', now).success).toBe(true);
      expect(limiter.check('k', now + 100).success).toBe(true);
      expect(limiter.check('k', now + 200).success).toBe(true);
      expect(limiter.check('k', now + 200).remaining).toBe(0);
    });

    it('should reject requests beyond the max with a retry delay', () => {
      const limiter = new SlidingWindowRateLimiter(10_000, 2);
      const now = 1_000_000;

      limiter.check('k', now);
      limiter.check('k', now + 1_000);

      const blocked = limiter.check('k', now + 2_000);
      expect(blocked.success).toBe(false);
      expect(blocked.remaining).toBe(0);
      // Oldest hit (at now) expires after the window → retry is possible then.
      expect(blocked.retryAfterMs).toBe(8_000);
    });

    it('should allow requests again after the window has slid', () => {
      const limiter = new SlidingWindowRateLimiter(10_000, 2);
      const now = 1_000_000;

      limiter.check('k', now);
      limiter.check('k', now + 1_000);
      expect(limiter.check('k', now + 11_000).success).toBe(true);
    });

    it('should keep counters independent per key', () => {
      const limiter = new SlidingWindowRateLimiter(10_000, 1);
      const now = 1_000_000;

      expect(limiter.check('a', now).success).toBe(true);
      expect(limiter.check('a', now + 1).success).toBe(false);
      // A different key is unaffected.
      expect(limiter.check('b', now + 2).success).toBe(true);
    });
  });

  describe('bucket selection', () => {
    it('should treat auth endpoints as a sensitive bucket', () => {
      expect(getBucket('/api/auth/signin')).toBe('auth');
      expect(getBucket('/api/auth/signup')).toBe('auth');
      expect(getBucket('/api/auth/session')).toBe('auth');
    });

    it('should use the default bucket for the rest of the API', () => {
      expect(getBucket('/api/rewards')).toBe('default');
      expect(getBucket('/api/scan')).toBe('default');
      expect(getBucket('/api/user/score')).toBe('default');
    });

    it('should only rate limit API paths', () => {
      expect(isApiPath('/api/rewards')).toBe(true);
      expect(isApiPath('/api/auth/signin')).toBe(true);
      expect(isApiPath('/dashboard')).toBe(false);
      expect(isApiPath('/rewards')).toBe(false);
    });
  });

  describe('getClientIdentifier', () => {
    it('should use the first x-forwarded-for entry', () => {
      const headers = new Headers({
        'x-forwarded-for': '1.2.3.4, 5.6.7.8',
      });
      expect(getClientIdentifier(headers)).toBe('1.2.3.4');
    });

    it('should fall back to x-real-ip', () => {
      const headers = new Headers({ 'x-real-ip': '9.9.9.9' });
      expect(getClientIdentifier(headers)).toBe('9.9.9.9');
    });

    it('should return the fallback when no client header is present', () => {
      expect(getClientIdentifier(new Headers())).toBe('unknown');
    });
  });

  describe('checkRateLimit + buildRateLimitResponse', () => {
    beforeEach(() => {
      getLimiter('default').reset();
      getLimiter('auth').reset();
    });

    it('should record hits within budget and expose remaining', () => {
      const result = checkRateLimit('/api/rewards', '1.2.3.4', 1_000_000);
      expect(result.success).toBe(true);
      expect(result.limit).toBe(RATE_LIMIT_RULES.default.max);
      expect(result.remaining).toBe(RATE_LIMIT_RULES.default.max - 1);
    });

    it('should build a 429 response with standard headers when exceeded', () => {
      const limiter = getLimiter('default');
      const max = RATE_LIMIT_RULES.default.max;
      const now = 1_000_000;
      for (let i = 0; i < max; i++) {
        limiter.check('/api/rewards:1.2.3.4', now + i);
      }

      const blocked = checkRateLimit('/api/rewards', '1.2.3.4', now + max);
      expect(blocked.success).toBe(false);

      const response = buildRateLimitResponse(blocked, 'req-123');
      expect(response.status).toBe(429);
      expect(response.headers.get('Retry-After')).toBeTruthy();
      expect(response.headers.get('X-RateLimit-Limit')).toBe(String(max));
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
      expect(response.headers.get('X-RateLimit-Reset')).toBeTruthy();
      expect(response.headers.get('X-Request-Id')).toBe('req-123');

      return response.json().then((body) => {
        expect(body.error).toBe('Too many requests');
      });
    });

    it('should apply a tighter budget to auth endpoints', () => {
      const now = 1_000_000;
      const authMax = RATE_LIMIT_RULES.auth.max;
      const limiter = getLimiter('auth');
      for (let i = 0; i < authMax; i++) {
        limiter.check('/api/auth/signin:6.6.6.6', now + i);
      }
      const blocked = checkRateLimit(
        '/api/auth/signin',
        '6.6.6.6',
        now + authMax
      );
      expect(blocked.success).toBe(false);
    });
  });
});
