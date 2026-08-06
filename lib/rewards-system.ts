import type {
  IScan,
  IAchievement,
  IPurchasedItem,
  IRewardTransaction,
} from '@/models/User';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  condition: (user: RewardUser) => boolean;
  points: number;
  icon: string;
  category?: 'Scanning' | 'Streaks' | 'Carbon' | 'Levels' | 'Special';
  currentProgress?: (user: RewardUser) => number;
  maxProgress?: number;
}

export interface RewardTransaction {
  _id?: string;
  type: 'earned' | 'redeemed';
  points: number;
  pointsType: 'confirmed' | 'unconfirmed' | string;
  reason: string;
  description: string;
  date: Date;
  confirmedAt?: Date | null;
}

export interface RewardShopItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  icon: string;
  category: 'badge' | 'feature' | 'cosmetic';
  available: boolean;
}
export interface RewardUser {
  totalScanned?: number;
  streakCount?: number;
  monthlyCarbon?: number;
  level?: number;
  totalPointsEarned?: number;
  confirmedPoints?: number;
  unconfirmedPoints?: number;
  scans?: IScan[];
  lowCarbonScans?: number;
  achievements?: IAchievement[];
  purchasedItems?: IPurchasedItem[];
  rewardTransactions?: IRewardTransaction[];
}
export type UserPointsData = RewardUser;
export const POINT_CONFIRMATION = {
  IMMEDIATE_CONFIRMATION: ['first_scan', 'achievement', 'level_up'],
  CONFIRMATION_DELAY_HOURS: 24 * 7,
  MIN_SCANS_FOR_AUTO_CONFIRMATION: 3,
};
export const POINT_REWARDS = {
  FIRST_SCAN: 50,
  DAILY_SCAN: 10,
  LOW_CARBON_SCAN: 15,
  VERY_LOW_CARBON_SCAN: 25,
  STREAK_BONUS: 5,
  WEEKLY_GOAL: 100,
  MONTHLY_GOAL: 500,
  ECO_CHAMPION_GOAL: 1000,
  LEVEL_UP: 200,
  SOCIAL_SHARE: 20,
  REFERRAL: 100,
};
export const LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 12000, 18000, 25000, 35000,
  50000, 75000,
];
export const REWARD_SHOP_ITEMS: RewardShopItem[] = [
  {
    id: 'eco_hero_badge',
    name: 'Eco Hero Badge',
    description:
      'Show your commitment to sustainability with this special badge',
    cost: 500,
    icon: '🎖️',
    category: 'badge',
    available: true,
  },
  {
    id: 'carbon_warrior_badge',
    name: 'Carbon Warrior Badge',
    description: 'Elite status for the most dedicated eco-warriors',
    cost: 1000,
    icon: '⚔️',
    category: 'badge',
    available: true,
  },
  {
    id: 'custom_avatar',
    name: 'Custom Avatar',
    description: 'Personalize your profile with a custom avatar',
    cost: 300,
    icon: '👤',
    category: 'cosmetic',
    available: true,
  },
  {
    id: 'advanced_analytics',
    name: 'Advanced Analytics',
    description: 'Unlock detailed carbon footprint analytics and insights',
    cost: 750,
    icon: '📊',
    category: 'feature',
    available: true,
  },
  {
    id: 'streak_protector',
    name: 'Streak Protector',
    description: 'Protect your scanning streak for one missed day',
    cost: 200,
    icon: '🛡️',
    category: 'feature',
    available: true,
  },
  {
    id: 'double_points',
    name: 'Double Points Day',
    description: 'Earn 2x points for one full day of scanning',
    cost: 400,
    icon: '⚡',
    category: 'feature',
    available: true,
  },
];
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_scan',
    name: 'First Steps',
    description: 'Scan your first product',
    condition: (user) => (user.totalScanned ?? 0) >= 1,
    points: 50,
    icon: '🎯',
    category: 'Scanning',
    currentProgress: (user) => Math.min(user.totalScanned ?? 0, 1),
    maxProgress: 1,
  },
  {
    id: 'ten_scans',
    name: 'Getting Started',
    description: 'Scan 10 products',
    condition: (user) => (user.totalScanned ?? 0) >= 10,
    points: 100,
    icon: '📱',
    category: 'Scanning',
    currentProgress: (user) => Math.min(user.totalScanned ?? 0, 10),
    maxProgress: 10,
  },
  {
    id: 'fifty_scans',
    name: 'Scanner Pro',
    description: 'Scan 50 products',
    condition: (user) => (user.totalScanned ?? 0) >= 50,
    points: 250,
    icon: '🏆',
    category: 'Scanning',
    currentProgress: (user) => Math.min(user.totalScanned ?? 0, 50),
    maxProgress: 50,
  },
  {
    id: 'hundred_scans',
    name: 'Scan Master',
    description: 'Scan 100 products',
    condition: (user) => (user.totalScanned ?? 0) >= 100,
    points: 500,
    icon: '👑',
    category: 'Scanning',
    currentProgress: (user) => Math.min(user.totalScanned ?? 0, 100),
    maxProgress: 100,
  },
  {
    id: 'five_hundred_scans',
    name: 'Scan Legend',
    description: 'Scan 500 products',
    condition: (user) => (user.totalScanned ?? 0) >= 500,
    points: 1500,
    icon: '🌟',
    category: 'Scanning',
    currentProgress: (user) => Math.min(user.totalScanned ?? 0, 500),
    maxProgress: 500,
  },
  {
    id: 'week_streak',
    name: 'Week Warrior',
    description: 'Maintain a 7-day scanning streak',
    condition: (user) => (user.streakCount ?? 0) >= 7,
    points: 150,
    icon: '🔥',
    category: 'Streaks',
    currentProgress: (user) => Math.min(user.streakCount ?? 0, 7),
    maxProgress: 7,
  },
  {
    id: 'month_streak',
    name: 'Consistency King',
    description: 'Maintain a 30-day scanning streak',
    condition: (user) => (user.streakCount ?? 0) >= 30,
    points: 1000,
    icon: '👑',
    category: 'Streaks',
    currentProgress: (user) => Math.min(user.streakCount ?? 0, 30),
    maxProgress: 30,
  },
  {
    id: 'hundred_day_streak',
    name: 'Streak Master',
    description: 'Maintain a 100-day scanning streak',
    condition: (user) => (user.streakCount ?? 0) >= 100,
    points: 3000,
    icon: '💎',
    category: 'Streaks',
    currentProgress: (user) => Math.min(user.streakCount ?? 0, 100),
    maxProgress: 100,
  },
  {
    id: 'eco_warrior',
    name: 'Eco Warrior',
    description: 'Keep monthly carbon footprint under 20kg',
    condition: (user) =>
      (user.monthlyCarbon ?? 0) < 20 && (user.totalScanned ?? 0) >= 10,
    points: 300,
    icon: '🌱',
    category: 'Carbon',
    currentProgress: (user) => Math.min(user.totalScanned ?? 0, 10),
    maxProgress: 10,
  },
  {
    id: 'carbon_conscious',
    name: 'Carbon Conscious',
    description: 'Keep monthly carbon footprint under 30kg',
    condition: (user) =>
      (user.monthlyCarbon ?? 0) < 30 && (user.totalScanned ?? 0) >= 5,
    points: 150,
    icon: '🌿',
    category: 'Carbon',
    currentProgress: (user) => Math.min(user.totalScanned ?? 0, 5),
    maxProgress: 5,
  },
  {
    id: 'zero_waste_hero',
    name: 'Zero Waste Hero',
    description: 'Keep monthly carbon footprint under 10kg',
    condition: (user) =>
      (user.monthlyCarbon ?? 0) < 10 && (user.totalScanned ?? 0) >= 15,
    points: 500,
    icon: '🌍',
    category: 'Carbon',
    currentProgress: (user) => Math.min(user.totalScanned ?? 0, 15),
    maxProgress: 15,
  },
  {
    id: 'low_carbon_specialist',
    name: 'Low Carbon Specialist',
    description: 'Scan 25 products with less than 1kg CO2',
    condition: (user) => {
      const lowCarbonScans =
        user.lowCarbonScans ??
        (user.scans || []).filter((scan) => scan.carbonEstimate < 1).length;
      return lowCarbonScans >= 25;
    },
    points: 400,
    icon: '♻️',
    category: 'Carbon',
    currentProgress: (user) =>
      Math.min(
        user.lowCarbonScans ??
          (user.scans || []).filter((s) => s.carbonEstimate < 1).length,
        25
      ),
    maxProgress: 25,
  },
  {
    id: 'level_5',
    name: 'Rising Star',
    description: 'Reach Level 5',
    condition: (user) => (user.level ?? 0) >= 5,
    points: 500,
    icon: '⭐',
    category: 'Levels',
    currentProgress: (user) => Math.min(user.level ?? 0, 5),
    maxProgress: 5,
  },
  {
    id: 'level_10',
    name: 'Sustainability Champion',
    description: 'Reach Level 10',
    condition: (user) => (user.level ?? 0) >= 10,
    points: 1000,
    icon: '🏅',
    category: 'Levels',
    currentProgress: (user) => Math.min(user.level ?? 0, 10),
    maxProgress: 10,
  },
  {
    id: 'level_15',
    name: 'Eco Legend',
    description: 'Reach the maximum Level 15',
    condition: (user) => (user.level ?? 0) >= 15,
    points: 2500,
    icon: '🌟',
    category: 'Levels',
    currentProgress: (user) => Math.min(user.level ?? 0, 15),
    maxProgress: 15,
  },
  {
    id: 'points_millionaire',
    name: 'Points Millionaire',
    description: 'Earn 10,000 total points',
    condition: (user) => (user.totalPointsEarned || 0) >= 10000,
    points: 1000,
    icon: '💰',
    category: 'Special',
    currentProgress: (user) => Math.min(user.totalPointsEarned ?? 0, 10000),
    maxProgress: 10000,
  },
  {
    id: 'early_adopter',
    name: 'Early Adopter',
    description: 'One of the first 100 users to join',
    condition: () => false,
    points: 200,
    icon: '🏃',
    category: 'Special',
    currentProgress: () => 0,
    maxProgress: 1,
  },
];
export function calculateStreakUpdate(
  lastScanDate: Date | null,
  currentStreak: number,
  bestStreak: number,
  streakProtectors: number,
  now: Date = new Date()
): {
  streakCount: number;
  bestStreakCount: number;
  streakProtectorsUsed: number;
  streakBroken: boolean;
} {
  const startOfDay = (d: Date) =>
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

  const today = startOfDay(now);

  if (!lastScanDate) {
    return {
      streakCount: 1,
      bestStreakCount: Math.max(bestStreak, 1),
      streakProtectorsUsed: 0,
      streakBroken: false,
    };
  }

  const lastDay = startOfDay(lastScanDate);
  const dayGap = Math.round((today - lastDay) / (1000 * 60 * 60 * 24));

  if (dayGap === 0) {
    return {
      streakCount: currentStreak,
      bestStreakCount: bestStreak,
      streakProtectorsUsed: 0,
      streakBroken: false,
    };
  }

  if (dayGap === 1) {
    const newStreak = currentStreak + 1;
    return {
      streakCount: newStreak,
      bestStreakCount: Math.max(bestStreak, newStreak),
      streakProtectorsUsed: 0,
      streakBroken: false,
    };
  }
  if (dayGap > 1) {
    const missedDays = dayGap - 1;
    if (streakProtectors >= missedDays) {
      const newStreak = currentStreak + 1;
      return {
        streakCount: newStreak,
        bestStreakCount: Math.max(bestStreak, newStreak),
        streakProtectorsUsed: missedDays,
        streakBroken: false,
      };
    }
  }
  return {
    streakCount: 1,
    bestStreakCount: Math.max(bestStreak, 1),
    streakProtectorsUsed: 0,
    streakBroken: currentStreak > 0,
  };
}

export function calculateScanPoints(
  carbonEstimate: number,
  isFirstScan: boolean,
  streakCount: number,
  userTotalScans: number = 0,
  isFirstScanOfDay: boolean = true
): {
  points: number;
  reasons: string[];
  isConfirmed: boolean;
} {
  let points = 0;
  const reasons: string[] = [];

  const isConfirmed =
    isFirstScan ||
    userTotalScans >= POINT_CONFIRMATION.MIN_SCANS_FOR_AUTO_CONFIRMATION;

  if (isFirstScan) {
    points += POINT_REWARDS.FIRST_SCAN;
    reasons.push(`First scan bonus: +${POINT_REWARDS.FIRST_SCAN} points`);
  } else if (isFirstScanOfDay) {
    points += POINT_REWARDS.DAILY_SCAN;
    reasons.push(`Daily scan: +${POINT_REWARDS.DAILY_SCAN} points`);
  }
  if (carbonEstimate < 0.5) {
    points += POINT_REWARDS.VERY_LOW_CARBON_SCAN;
    reasons.push(
      `Very low carbon product (<0.5kg): +${POINT_REWARDS.VERY_LOW_CARBON_SCAN} points`
    );
  } else if (carbonEstimate < 1.0) {
    points += POINT_REWARDS.LOW_CARBON_SCAN;
    reasons.push(
      `Low carbon product (<1kg): +${POINT_REWARDS.LOW_CARBON_SCAN} points`
    );
  }
  if (isFirstScanOfDay && streakCount > 1) {
    const streakBonus = Math.min(streakCount * POINT_REWARDS.STREAK_BONUS, 100);
    points += streakBonus;
    reasons.push(`${streakCount}-day streak bonus: +${streakBonus} points`);
  }
  if (isFirstScanOfDay && streakCount === 7) {
    points += POINT_REWARDS.WEEKLY_GOAL;
    reasons.push(
      `Weekly milestone bonus: +${POINT_REWARDS.WEEKLY_GOAL} points`
    );
  }

  return { points, reasons, isConfirmed };
}
export function calculateLevel(totalPoints: number): {
  level: number;
  nextLevelPoints: number;
  progressToNext: number;
} {
  let level = 1;

  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalPoints >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }

  const nextLevelPoints =
    LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const currentLevelPoints = LEVEL_THRESHOLDS[level - 1] || 0;
  const progressToNext =
    level >= LEVEL_THRESHOLDS.length
      ? 100
      : ((totalPoints - currentLevelPoints) /
          (nextLevelPoints - currentLevelPoints)) *
        100;

  return {
    level,
    nextLevelPoints,
    progressToNext: Math.min(progressToNext, 100),
  };
}

export function checkAchievements(user: RewardUser): Achievement[] {
  const newAchievements: Achievement[] = [];
  const earnedAchievementIds = user.achievements?.map((a) => a.id) || [];

  for (const achievement of ACHIEVEMENTS) {
    if (
      !earnedAchievementIds.includes(achievement.id) &&
      achievement.condition(user)
    ) {
      newAchievements.push(achievement);
    }
  }

  return newAchievements;
}

export function calculateMonthlyBonus(
  user: RewardUser
): { points: number; reason: string } | null {
  if ((user.monthlyCarbon ?? 0) < 20 && (user.totalScanned ?? 0) >= 10) {
    return {
      points: POINT_REWARDS.ECO_CHAMPION_GOAL,
      reason: 'Eco Champion - Monthly carbon under 20kg',
    };
  } else if ((user.monthlyCarbon ?? 0) < 30 && (user.totalScanned ?? 0) >= 5) {
    return {
      points: POINT_REWARDS.MONTHLY_GOAL,
      reason: 'Monthly Goal - Carbon under 30kg',
    };
  }
  return null;
}

export function getSustainabilityTier(
  monthlyCarbon: number,
  totalScanned: number
): {
  tier: string;
  color: string;
  description: string;
} {
  if (monthlyCarbon < 10 && totalScanned >= 15) {
    return {
      tier: 'Platinum',
      color: 'text-gray-300',
      description: 'Ultimate eco-warrior',
    };
  } else if (monthlyCarbon < 20 && totalScanned >= 10) {
    return {
      tier: 'Gold',
      color: 'text-yellow-400',
      description: 'Exceptional sustainability',
    };
  } else if (monthlyCarbon < 30 && totalScanned >= 5) {
    return {
      tier: 'Silver',
      color: 'text-gray-400',
      description: 'Great progress',
    };
  } else if (monthlyCarbon < 40) {
    return {
      tier: 'Bronze',
      color: 'text-amber-600',
      description: 'Getting started',
    };
  }
  return {
    tier: 'Beginner',
    color: 'text-gray-500',
    description: 'Room for improvement',
  };
}
export function confirmPendingPoints(user: UserPointsData): {
  confirmedPoints: number;
  confirmedTransactions: IRewardTransaction[];
} {
  let confirmedPoints = 0;
  const confirmedTransactions: IRewardTransaction[] = [];
  const now = new Date();

  if (user.rewardTransactions) {
    for (const transaction of user.rewardTransactions) {
      if (
        transaction.pointsType === 'confirmed' ||
        transaction.type === 'redeemed'
      ) {
        continue;
      }

      const transactionDate = new Date(transaction.date);
      const hoursElapsed =
        (now.getTime() - transactionDate.getTime()) / (1000 * 60 * 60);

      if (hoursElapsed >= POINT_CONFIRMATION.CONFIRMATION_DELAY_HOURS) {
        transaction.pointsType = 'confirmed';
        transaction.confirmedAt = now;
        confirmedPoints += transaction.points;
        confirmedTransactions.push(transaction);
      }
    }
  }

  return { confirmedPoints, confirmedTransactions };
}

export function shouldConfirmImmediately(reason: string): boolean {
  return POINT_CONFIRMATION.IMMEDIATE_CONFIRMATION.includes(reason);
}

export async function confirmAgedPoints(email: string): Promise<number> {
  const cutoff = new Date(
    Date.now() - POINT_CONFIRMATION.CONFIRMATION_DELAY_HOURS * 60 * 60 * 1000
  );
  const { default: User } = await import('@/models/User');
  const preDoc = await User.findOne(
    { email, unconfirmedPoints: { $gt: 0 } },
    { confirmedPoints: 1 }
  ).lean();
  const oldConfirmed = preDoc?.confirmedPoints ?? 0;

  const result = await User.findOneAndUpdate(
    {
      email,
      unconfirmedPoints: { $gt: 0 },
    },
    [
      {
        $set: {
          _eligiblePoints: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: { $ifNull: ['$rewardTransactions', []] },
                    as: 't',
                    cond: {
                      $and: [
                        { $eq: ['$$t.pointsType', 'unconfirmed'] },
                        { $eq: ['$$t.type', 'earned'] },
                        { $lte: ['$$t.date', cutoff] },
                      ],
                    },
                  },
                },
                as: 'et',
                in: { $ifNull: ['$$et.points', 0] },
              },
            },
          },
        },
      },
      {
        $set: {
          confirmedPoints: {
            $add: [
              { $ifNull: ['$confirmedPoints', 0] },
              { $ifNull: ['$_eligiblePoints', 0] },
            ],
          },
          unconfirmedPoints: {
            $subtract: [
              { $ifNull: ['$unconfirmedPoints', 0] },
              { $ifNull: ['$_eligiblePoints', 0] },
            ],
          },
          rewardTransactions: {
            $map: {
              input: { $ifNull: ['$rewardTransactions', []] },
              as: 't',
              in: {
                $cond: {
                  if: {
                    $and: [
                      { $eq: ['$$t.pointsType', 'unconfirmed'] },
                      { $eq: ['$$t.type', 'earned'] },
                      { $lte: ['$$t.date', cutoff] },
                    ],
                  },
                  then: {
                    $mergeObjects: [
                      '$$t',
                      { pointsType: 'confirmed', confirmedAt: new Date() },
                    ],
                  },
                  else: '$$t',
                },
              },
            },
          },
        },
      },
      { $unset: '_eligiblePoints' },
    ],
    { new: true }
  );

  if (!result) return 0;

  const newConfirmed = (result as any).confirmedPoints ?? 0;
  return newConfirmed - oldConfirmed;
}

export function getUserPointsSummary(user: RewardUser): {
  confirmed: number;
  unconfirmed: number;
  total: number;
  pendingConfirmation: number;
} {
  const confirmed = user.confirmedPoints || 0;
  const unconfirmed = user.unconfirmedPoints || 0;
  const total = confirmed + unconfirmed;

  let pendingConfirmation = 0;
  const now = new Date();

  if (user.rewardTransactions) {
    for (const transaction of user.rewardTransactions) {
      if (
        transaction.pointsType === 'unconfirmed' &&
        transaction.type === 'earned'
      ) {
        const transactionDate = new Date(transaction.date);
        const hoursElapsed =
          (now.getTime() - transactionDate.getTime()) / (1000 * 60 * 60);
        const hoursRemaining =
          POINT_CONFIRMATION.CONFIRMATION_DELAY_HOURS - hoursElapsed;

        if (hoursRemaining > 0 && hoursRemaining <= 24) {
          pendingConfirmation += transaction.points;
        }
      }
    }
  }

  return { confirmed, unconfirmed, total, pendingConfirmation };
}
