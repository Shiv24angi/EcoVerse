import { processStreak, StreakUser } from '../streak-system';

const makeUser = (overrides: Partial<StreakUser> = {}): StreakUser => ({
  lastScanDate: null,
  streakCount: 0,
  bestStreakCount: 0,
  streakProtectors: 0,
  ...overrides,
});

/** Return a Date adjusted by `days` relative to `base` */
const daysAgo = (base: Date, days: number): Date => {
  const d = new Date(base);
  d.setDate(d.getDate() - days);
  return d;
};

describe('processStreak', () => {
  const now = new Date('2024-06-15T12:00:00Z');
  const tz = 0; // UTC

  // ── First-ever scan ────────────────────────────────────────────────────────
  describe('first-ever scan (lastScanDate = null)', () => {
    it('should start streak at 1', () => {
      const result = processStreak(makeUser(), now, tz);
      expect(result.streakCount).toBe(1);
      expect(result.bestStreakCount).toBe(1);
      expect(result.isFirstScanOfDay).toBe(true);
      expect(result.protectorsUsed).toBe(0);
      expect(result.streakSaved).toBe(false);
      expect(result.lostStreak).toBe(false);
      expect(result.lastScanDate).toEqual(now);
    });
  });

  // ── Same-day scan ──────────────────────────────────────────────────────────
  describe('same-day scan (diffDays === 0)', () => {
    it('should not change streak and not update lastScanDate', () => {
      const user = makeUser({
        lastScanDate: new Date('2024-06-15T08:00:00Z'),
        streakCount: 5,
        bestStreakCount: 5,
      });
      const result = processStreak(user, now, tz);
      expect(result.streakCount).toBe(5);
      expect(result.isFirstScanOfDay).toBe(false);
      expect(result.lastScanDate).toBeNull(); // preserves anchor
      expect(result.protectorsUsed).toBe(0);
    });
  });

  // ── Consecutive day ────────────────────────────────────────────────────────
  describe('consecutive day scan (diffDays === 1)', () => {
    it('should increment streak by 1', () => {
      const user = makeUser({
        lastScanDate: daysAgo(now, 1),
        streakCount: 4,
        bestStreakCount: 4,
      });
      const result = processStreak(user, now, tz);
      expect(result.streakCount).toBe(5);
      expect(result.bestStreakCount).toBe(5);
      expect(result.isFirstScanOfDay).toBe(true);
      expect(result.lostStreak).toBe(false);
    });

    it('should update bestStreakCount when new streak exceeds it', () => {
      const user = makeUser({
        lastScanDate: daysAgo(now, 1),
        streakCount: 10,
        bestStreakCount: 8,
      });
      const result = processStreak(user, now, tz);
      expect(result.streakCount).toBe(11);
      expect(result.bestStreakCount).toBe(11);
    });
  });

  // ── Missed days with enough protectors ────────────────────────────────────
  describe('missed days (diffDays > 1) with enough streak protectors', () => {
    it('should save the streak using 1 protector when 1 day is missed', () => {
      const user = makeUser({
        lastScanDate: daysAgo(now, 2),
        streakCount: 6,
        bestStreakCount: 6,
        streakProtectors: 1,
      });
      const result = processStreak(user, now, tz);
      expect(result.streakCount).toBe(7);
      expect(result.protectorsUsed).toBe(1);
      expect(result.streakSaved).toBe(true);
      expect(result.lostStreak).toBe(false);
    });

    it('should save the streak using 2 protectors when 2 days are missed', () => {
      const user = makeUser({
        lastScanDate: daysAgo(now, 3),
        streakCount: 5,
        bestStreakCount: 5,
        streakProtectors: 3,
      });
      const result = processStreak(user, now, tz);
      expect(result.streakCount).toBe(6);
      expect(result.protectorsUsed).toBe(2);
      expect(result.streakSaved).toBe(true);
    });
  });

  // ── Missed days without enough protectors ─────────────────────────────────
  describe('missed days (diffDays > 1) without enough streak protectors', () => {
    it('should reset streak to 1 and consume 0 protectors', () => {
      const user = makeUser({
        lastScanDate: daysAgo(now, 3),
        streakCount: 15,
        bestStreakCount: 15,
        streakProtectors: 1,
      });
      const result = processStreak(user, now, tz);
      expect(result.streakCount).toBe(1);
      expect(result.protectorsUsed).toBe(0);
      expect(result.streakSaved).toBe(false);
      expect(result.lostStreak).toBe(true);
    });

    it('should preserve bestStreakCount even after losing a streak', () => {
      const user = makeUser({
        lastScanDate: daysAgo(now, 5),
        streakCount: 20,
        bestStreakCount: 20,
        streakProtectors: 0,
      });
      const result = processStreak(user, now, tz);
      expect(result.streakCount).toBe(1);
      expect(result.bestStreakCount).toBe(20);
    });
  });

  // ── Negative / clock-drift diffDays ───────────────────────────────────────
  describe('clock drift or spoofing (diffDays < 0)', () => {
    it('should treat negative diffDays as same-day (no streak change)', () => {
      // Future lastScanDate (e.g., server received a scan with a clock ahead)
      const user = makeUser({
        lastScanDate: new Date('2024-06-16T12:00:00Z'),
        streakCount: 3,
        bestStreakCount: 3,
      });
      const result = processStreak(user, now, tz);
      expect(result.streakCount).toBe(3);
      expect(result.isFirstScanOfDay).toBe(false);
      expect(result.lostStreak).toBe(false);
    });
  });

  // ── Milestone detection ────────────────────────────────────────────────────
  describe('milestone detection', () => {
    it('should detect a 7-day milestone', () => {
      const user = makeUser({
        lastScanDate: daysAgo(now, 1),
        streakCount: 6,
        bestStreakCount: 6,
      });
      const result = processStreak(user, now, tz);
      expect(result.streakCount).toBe(7);
      expect(result.milestone).toBe(7);
    });

    it('should detect a 30-day milestone', () => {
      const user = makeUser({
        lastScanDate: daysAgo(now, 1),
        streakCount: 29,
        bestStreakCount: 29,
      });
      const result = processStreak(user, now, tz);
      expect(result.milestone).toBe(30);
    });

    it('should detect a 100-day milestone', () => {
      const user = makeUser({
        lastScanDate: daysAgo(now, 1),
        streakCount: 99,
        bestStreakCount: 99,
      });
      const result = processStreak(user, now, tz);
      expect(result.milestone).toBe(100);
    });

    it('should return null milestone on non-milestone days', () => {
      const user = makeUser({
        lastScanDate: daysAgo(now, 1),
        streakCount: 4,
        bestStreakCount: 4,
      });
      const result = processStreak(user, now, tz);
      expect(result.milestone).toBeNull();
    });

    it('should not detect milestone when streak is lost', () => {
      // diffDays = 8 → missedDays = 7, but only 0 protectors
      const user = makeUser({
        lastScanDate: daysAgo(now, 8),
        streakCount: 29,
        bestStreakCount: 29,
        streakProtectors: 0,
      });
      const result = processStreak(user, now, tz);
      expect(result.lostStreak).toBe(true);
      expect(result.milestone).toBeNull();
    });
  });

  // ── Exact protector boundary ───────────────────────────────────────────────
  describe('exact protector boundary', () => {
    it('should save streak when protectors exactly equal missed days', () => {
      const user = makeUser({
        lastScanDate: daysAgo(now, 4),
        streakCount: 10,
        bestStreakCount: 10,
        streakProtectors: 3,
      });
      // diffDays = 4, missedDays = 3, streakProtectors = 3 → exactly enough
      const result = processStreak(user, now, tz);
      expect(result.streakSaved).toBe(true);
      expect(result.protectorsUsed).toBe(3);
      expect(result.streakCount).toBe(11);
    });

    it('should break streak when protectors are 1 short', () => {
      const user = makeUser({
        lastScanDate: daysAgo(now, 4),
        streakCount: 10,
        bestStreakCount: 10,
        streakProtectors: 2,
      });
      // diffDays = 4, missedDays = 3, streakProtectors = 2 → not enough
      const result = processStreak(user, now, tz);
      expect(result.lostStreak).toBe(true);
      expect(result.protectorsUsed).toBe(0);
    });
  });
});
