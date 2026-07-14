import {
  calculateScanPoints,
  calculateLevel,
  checkAchievements,
  calculateMonthlyBonus,
  getSustainabilityTier,
  confirmPendingPoints,
  shouldConfirmImmediately,
  getUserPointsSummary,
  calculateStreakUpdate,
  POINT_REWARDS,
  POINT_CONFIRMATION,
  RewardUser,
  UserPointsData,
} from '../rewards-system';

describe('Rewards System', () => {
  describe('calculateScanPoints', () => {
    it('should calculate points for a first scan with normal carbon', () => {
      const result = calculateScanPoints(1.5, true, 1, 1);
      expect(result.points).toBe(POINT_REWARDS.FIRST_SCAN);
      expect(result.reasons[0]).toContain('First scan bonus');
      expect(result.isConfirmed).toBe(true);
    });

    it('should calculate points for a daily scan with low carbon', () => {
      const result = calculateScanPoints(0.8, false, 1, 5);
      expect(result.points).toBe(
        POINT_REWARDS.DAILY_SCAN + POINT_REWARDS.LOW_CARBON_SCAN
      );
      expect(result.isConfirmed).toBe(true); // userTotalScans >= 3
    });

    it('should calculate points for a very low carbon scan with streak', () => {
      const result = calculateScanPoints(0.4, false, 3, 10);
      const expectedPoints =
        POINT_REWARDS.DAILY_SCAN +
        POINT_REWARDS.VERY_LOW_CARBON_SCAN +
        3 * POINT_REWARDS.STREAK_BONUS;
      expect(result.points).toBe(expectedPoints);
      expect(result.reasons.some((r) => r.includes('Very low carbon'))).toBe(
        true
      );
    });

    it('should cap streak bonus at 100 points', () => {
      const result = calculateScanPoints(1.5, false, 30, 30);
      // Daily scan + capped streak bonus (100)
      expect(result.points).toBe(POINT_REWARDS.DAILY_SCAN + 100);
    });

    it('should add weekly milestone bonus on 7th day streak', () => {
      const result = calculateScanPoints(1.5, false, 7, 7);
      const expectedPoints =
        POINT_REWARDS.DAILY_SCAN +
        7 * POINT_REWARDS.STREAK_BONUS +
        POINT_REWARDS.WEEKLY_GOAL;
      expect(result.points).toBe(expectedPoints);
      expect(
        result.reasons.some((r) => r.includes('Weekly milestone bonus'))
      ).toBe(true);
    });
  });

  describe('calculateLevel', () => {
    it('should return level 1 for 0 points', () => {
      const result = calculateLevel(0);
      expect(result.level).toBe(1);
    });

    it('should return level 2 for 100 points', () => {
      const result = calculateLevel(100);
      expect(result.level).toBe(2);
      expect(result.progressToNext).toBe(0);
    });

    it('should correctly calculate progress to next level', () => {
      const result = calculateLevel(175);
      expect(result.level).toBe(2);
      expect(result.nextLevelPoints).toBe(250);
      expect(result.progressToNext).toBe(50); // 75 points into the 150 point gap between 100 and 250
    });

    it('should max out at level 15', () => {
      const result = calculateLevel(100000);
      expect(result.level).toBe(15);
      expect(result.progressToNext).toBe(100);
    });
  });

  describe('checkAchievements', () => {
    it('should award first scan achievement', () => {
      const user: RewardUser = {
        totalScanned: 1,
        streakCount: 1,
        level: 1,
        monthlyCarbon: 0,
        achievements: [],
      };
      const newAchievements = checkAchievements(user);
      expect(newAchievements.length).toBeGreaterThan(0);
      expect(newAchievements.map((a) => a.id)).toContain('first_scan');
    });

    it('should not award previously earned achievements', () => {
      const user: RewardUser = {
        totalScanned: 10,
        streakCount: 1,
        level: 1,
        monthlyCarbon: 0,
        achievements: [
          {
            id: 'first_scan',
            name: 'First Steps',
            description: '',
            earnedAt: new Date(),
            points: 50,
          },
        ],
      };
      const newAchievements = checkAchievements(user);
      expect(newAchievements.map((a) => a.id)).not.toContain('first_scan');
      expect(newAchievements.map((a) => a.id)).toContain('ten_scans');
    });

    it('should award complex achievements like Eco Warrior', () => {
      const user: RewardUser = {
        totalScanned: 15,
        streakCount: 1,
        level: 1,
        monthlyCarbon: 15, // Under 20kg
        achievements: [],
      };
      const newAchievements = checkAchievements(user);
      expect(newAchievements.map((a) => a.id)).toContain('eco_warrior');
    });
  });

  describe('calculateMonthlyBonus', () => {
    it('should return Eco Champion bonus if carbon < 20 and scans >= 10', () => {
      const result = calculateMonthlyBonus({
        monthlyCarbon: 18,
        totalScanned: 12,
        streakCount: 1,
        level: 1,
      } as RewardUser);
      expect(result?.points).toBe(POINT_REWARDS.ECO_CHAMPION_GOAL);
    });

    it('should return Monthly Goal bonus if carbon < 30 and scans >= 5', () => {
      const result = calculateMonthlyBonus({
        monthlyCarbon: 25,
        totalScanned: 6,
        streakCount: 1,
        level: 1,
      } as RewardUser);
      expect(result?.points).toBe(POINT_REWARDS.MONTHLY_GOAL);
    });

    it('should return null if conditions are not met', () => {
      const result = calculateMonthlyBonus({
        monthlyCarbon: 40,
        totalScanned: 20,
        streakCount: 1,
        level: 1,
      } as RewardUser);
      expect(result).toBeNull();

      const resultLowScans = calculateMonthlyBonus({
        monthlyCarbon: 5,
        totalScanned: 2,
        streakCount: 1,
        level: 1,
      } as RewardUser);
      expect(resultLowScans).toBeNull();
    });
  });

  describe('getSustainabilityTier', () => {
    it('should classify Platinum tier correctly', () => {
      const result = getSustainabilityTier(8, 20);
      expect(result.tier).toBe('Platinum');
    });

    it('should classify Gold tier correctly', () => {
      const result = getSustainabilityTier(15, 12);
      expect(result.tier).toBe('Gold');
    });

    it('should classify Silver tier correctly', () => {
      const result = getSustainabilityTier(28, 6);
      expect(result.tier).toBe('Silver');
    });

    it('should classify Bronze tier correctly', () => {
      const result = getSustainabilityTier(35, 1);
      expect(result.tier).toBe('Bronze');
    });

    it('should classify Beginner tier correctly', () => {
      const result = getSustainabilityTier(50, 0);
      expect(result.tier).toBe('Beginner');
    });
  });

  describe('confirmPendingPoints & getUserPointsSummary', () => {
    it('should confirm points if enough time has passed', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 8); // 8 days ago
      const user: RewardUser = {
        totalScanned: 1,
        streakCount: 1,
        level: 1,
        monthlyCarbon: 0,
        rewardTransactions: [
          {
            type: 'earned',
            points: 100,
            pointsType: 'unconfirmed',
            reason: 'scan',
            description: 'desc',
            date: pastDate,
          },
        ],
      };

      const result = confirmPendingPoints(user as UserPointsData);
      expect(result.confirmedPoints).toBe(100);
      expect(result.confirmedTransactions.length).toBe(1);
      expect(user.rewardTransactions![0].pointsType).toBe('confirmed');
    });

    it('should not confirm points if not enough time has passed', () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 1); // 1 day ago
      const user: RewardUser = {
        totalScanned: 1,
        streakCount: 1,
        level: 1,
        monthlyCarbon: 0,
        rewardTransactions: [
          {
            type: 'earned',
            points: 100,
            pointsType: 'unconfirmed',
            reason: 'scan',
            description: 'desc',
            date: recentDate,
          },
        ],
      };

      const result = confirmPendingPoints(user as UserPointsData);
      expect(result.confirmedPoints).toBe(0);
      expect(result.confirmedTransactions.length).toBe(0);
    });

    it('should check if reason requires immediate confirmation', () => {
      expect(shouldConfirmImmediately('first_scan')).toBe(true);
      expect(shouldConfirmImmediately('achievement')).toBe(true);
      expect(shouldConfirmImmediately('scan')).toBe(false);
    });

    it('should return correct user points summary', () => {
      const upcomingDate = new Date();
      upcomingDate.setHours(
        upcomingDate.getHours() -
          (POINT_CONFIRMATION.CONFIRMATION_DELAY_HOURS - 12)
      ); // Will be confirmed in 12 hours
      const user: RewardUser = {
        totalScanned: 1,
        streakCount: 1,
        level: 1,
        monthlyCarbon: 0,
        confirmedPoints: 500,
        unconfirmedPoints: 200,
        rewardTransactions: [
          {
            type: 'earned',
            points: 100,
            pointsType: 'unconfirmed',
            reason: 'scan',
            description: 'desc',
            date: upcomingDate,
          },
        ],
      };

      const summary = getUserPointsSummary(user);
      expect(summary.confirmed).toBe(500);
      expect(summary.unconfirmed).toBe(200);
      expect(summary.total).toBe(700);
      expect(summary.pendingConfirmation).toBe(100); // Because it will be confirmed within 24 hours
    });
  });

  describe('calculateStreakUpdate', () => {
    // Built with Date.UTC so this helper represents a fixed calendar day
    // independent of the test runner's local timezone — matching how
    // calculateStreakUpdate itself computes day boundaries in UTC.
    const day = (offset: number) =>
      new Date(Date.UTC(2024, 0, 10 + offset, 12, 0, 0)); // Jan 10+offset, 2024, noon UTC

    it('should start a streak at 1 if there is no previous scan', () => {
      const result = calculateStreakUpdate(null, 0, 0, 0, day(0));
      expect(result.streakCount).toBe(1);
      expect(result.bestStreakCount).toBe(1);
      expect(result.streakProtectorsUsed).toBe(0);
      expect(result.streakBroken).toBe(false);
    });

    it('should not change the streak for a second scan on the same day', () => {
      const result = calculateStreakUpdate(day(0), 3, 5, 0, day(0));
      expect(result.streakCount).toBe(3);
      expect(result.bestStreakCount).toBe(5);
      expect(result.streakProtectorsUsed).toBe(0);
    });

    it('should treat a late-night UTC scan followed by an early-morning UTC scan as consecutive days', () => {
      const lastScan = new Date(Date.UTC(2024, 0, 10, 23, 30, 0)); // 11:30 PM UTC
      const now = new Date(Date.UTC(2024, 0, 11, 0, 30, 0)); // 12:30 AM UTC next day
      const result = calculateStreakUpdate(lastScan, 3, 5, 0, now);
      expect(result.streakCount).toBe(4);
    });

    it('should increment the streak for a scan on the consecutive day', () => {
      const result = calculateStreakUpdate(day(0), 3, 5, 0, day(1));
      expect(result.streakCount).toBe(4);
      expect(result.bestStreakCount).toBe(5);
      expect(result.streakBroken).toBe(false);
    });

    it('should update bestStreakCount when the new streak exceeds it', () => {
      const result = calculateStreakUpdate(day(0), 5, 5, 0, day(1));
      expect(result.streakCount).toBe(6);
      expect(result.bestStreakCount).toBe(6);
    });

    it('should reset the streak to 1 after a missed day with no protector', () => {
      const result = calculateStreakUpdate(day(0), 10, 12, 0, day(2));
      expect(result.streakCount).toBe(1);
      expect(result.bestStreakCount).toBe(12);
      expect(result.streakProtectorsUsed).toBe(0);
      expect(result.streakBroken).toBe(true);
    });

    it('should consume a streak protector to bridge exactly one missed day', () => {
      const result = calculateStreakUpdate(day(0), 10, 12, 2, day(2));
      expect(result.streakCount).toBe(11);
      expect(result.bestStreakCount).toBe(12);
      expect(result.streakProtectorsUsed).toBe(1);
      expect(result.streakBroken).toBe(false);
    });

    it('should not use a protector to bridge a gap of more than one missed day', () => {
      const result = calculateStreakUpdate(day(0), 10, 12, 2, day(4));
      expect(result.streakCount).toBe(1);
      expect(result.streakProtectorsUsed).toBe(0);
      expect(result.streakBroken).toBe(true);
    });

    it('should not break a streak of 0 (new user with no streak yet)', () => {
      const result = calculateStreakUpdate(day(0), 0, 0, 0, day(3));
      expect(result.streakCount).toBe(1);
      expect(result.streakBroken).toBe(false);
      // bestStreakCount must never fall below the new streakCount.
      expect(result.bestStreakCount).toBe(1);
    });

    it('should clamp bestStreakCount to at least the new streakCount on reset', () => {
      // currentStreak=5 but bestStreak=0 is an inconsistent input on its
      // own, but the function should still never return a bestStreakCount
      // lower than the streakCount it just reset to.
      const result = calculateStreakUpdate(day(0), 5, 0, 0, day(5));
      expect(result.streakCount).toBe(1);
      expect(result.bestStreakCount).toBeGreaterThanOrEqual(result.streakCount);
      expect(result.bestStreakCount).toBe(1);
    });
  });
});
