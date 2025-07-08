// Rewards System Configuration and Logic

export interface Achievement {
  id: string;
  name: string;
  description: string;
  condition: (user: any) => boolean;
  points: number;
  icon: string;
}

export interface RewardTransaction {
  type: 'earned' | 'redeemed';
  points: number;
  pointsType: 'confirmed' | 'unconfirmed';
  reason: string;
  description: string;
  date: Date;
  confirmedAt?: Date;
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

// Point confirmation system configuration
export const POINT_CONFIRMATION = {
  // Points that are immediately confirmed
  IMMEDIATE_CONFIRMATION: [
    'first_scan',
    'achievement',
    'level_up'
  ],
  // Points that require confirmation (default 7 days)
  CONFIRMATION_DELAY_HOURS: 24 * 7, // 7 days
  // Minimum scans required for auto-confirmation
  MIN_SCANS_FOR_AUTO_CONFIRMATION: 3
}

// Points earning rules
export const POINT_REWARDS = {
  FIRST_SCAN: 50,
  DAILY_SCAN: 10,
  LOW_CARBON_SCAN: 15, // For products under 1kg CO2
  VERY_LOW_CARBON_SCAN: 25, // For products under 0.5kg CO2
  STREAK_BONUS: 5, // Per day in streak
  WEEKLY_GOAL: 100, // For scanning 7 days in a week
  MONTHLY_GOAL: 500, // For keeping monthly carbon under 30kg
  ECO_CHAMPION_GOAL: 1000, // For keeping monthly carbon under 20kg
  LEVEL_UP: 200,
  SOCIAL_SHARE: 20, // Future feature
  REFERRAL: 100 // Future feature
}

// Level system - points needed for each level
export const LEVEL_THRESHOLDS = [
  0,    // Level 1
  100,  // Level 2
  250,  // Level 3
  500,  // Level 4
  1000, // Level 5
  2000, // Level 6
  3500, // Level 7
  5500, // Level 8
  8000, // Level 9
  12000, // Level 10
  18000, // Level 11
  25000, // Level 12
  35000, // Level 13
  50000, // Level 14
  75000  // Level 15 (Max Level)
]

// Reward shop items
export const REWARD_SHOP_ITEMS: RewardShopItem[] = [
  {
    id: 'eco_hero_badge',
    name: 'Eco Hero Badge',
    description: 'Show your commitment to sustainability with this special badge',
    cost: 500,
    icon: '🎖️',
    category: 'badge',
    available: true
  },
  {
    id: 'carbon_warrior_badge',
    name: 'Carbon Warrior Badge',
    description: 'Elite status for the most dedicated eco-warriors',
    cost: 1000,
    icon: '⚔️',
    category: 'badge',
    available: true
  },
  {
    id: 'custom_avatar',
    name: 'Custom Avatar',
    description: 'Personalize your profile with a custom avatar',
    cost: 300,
    icon: '👤',
    category: 'cosmetic',
    available: true
  },
  {
    id: 'advanced_analytics',
    name: 'Advanced Analytics',
    description: 'Unlock detailed carbon footprint analytics and insights',
    cost: 750,
    icon: '📊',
    category: 'feature',
    available: true
  },
  {
    id: 'streak_protector',
    name: 'Streak Protector',
    description: 'Protect your scanning streak for one missed day',
    cost: 200,
    icon: '🛡️',
    category: 'feature',
    available: true
  },
  {
    id: 'double_points',
    name: 'Double Points Day',
    description: 'Earn 2x points for one full day of scanning',
    cost: 400,
    icon: '⚡',
    category: 'feature',
    available: true
  }
]

// Enhanced Achievement definitions
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_scan',
    name: 'First Steps',
    description: 'Scan your first product',
    condition: (user) => user.totalScanned >= 1,
    points: 50,
    icon: '🎯'
  },
  {
    id: 'ten_scans',
    name: 'Getting Started',
    description: 'Scan 10 products',
    condition: (user) => user.totalScanned >= 10,
    points: 100,
    icon: '📱'
  },
  {
    id: 'fifty_scans',
    name: 'Scanner Pro',
    description: 'Scan 50 products',
    condition: (user) => user.totalScanned >= 50,
    points: 250,
    icon: '🏆'
  },
  {
    id: 'hundred_scans',
    name: 'Scan Master',
    description: 'Scan 100 products',
    condition: (user) => user.totalScanned >= 100,
    points: 500,
    icon: '👑'
  },
  {
    id: 'five_hundred_scans',
    name: 'Scan Legend',
    description: 'Scan 500 products',
    condition: (user) => user.totalScanned >= 500,
    points: 1500,
    icon: '🌟'
  },
  {
    id: 'week_streak',
    name: 'Week Warrior',
    description: 'Maintain a 7-day scanning streak',
    condition: (user) => user.streakCount >= 7,
    points: 150,
    icon: '🔥'
  },
  {
    id: 'month_streak',
    name: 'Consistency King',
    description: 'Maintain a 30-day scanning streak',
    condition: (user) => user.streakCount >= 30,
    points: 1000,
    icon: '👑'
  },
  {
    id: 'hundred_day_streak',
    name: 'Streak Master',
    description: 'Maintain a 100-day scanning streak',
    condition: (user) => user.streakCount >= 100,
    points: 3000,
    icon: '💎'
  },
  {
    id: 'eco_warrior',
    name: 'Eco Warrior',
    description: 'Keep monthly carbon footprint under 20kg',
    condition: (user) => user.monthlyCarbon < 20 && user.totalScanned >= 10,
    points: 300,
    icon: '🌱'
  },
  {
    id: 'carbon_conscious',
    name: 'Carbon Conscious',
    description: 'Keep monthly carbon footprint under 30kg',
    condition: (user) => user.monthlyCarbon < 30 && user.totalScanned >= 5,
    points: 150,
    icon: '🌿'
  },
  {
    id: 'zero_waste_hero',
    name: 'Zero Waste Hero',
    description: 'Keep monthly carbon footprint under 10kg',
    condition: (user) => user.monthlyCarbon < 10 && user.totalScanned >= 15,
    points: 500,
    icon: '🌍'
  },
  {
    id: 'low_carbon_specialist',
    name: 'Low Carbon Specialist',
    description: 'Scan 25 products with less than 1kg CO2',
    condition: (user) => {
      const lowCarbonScans = (user.scans || []).filter((scan: any) => scan.carbonEstimate < 1).length;
      return lowCarbonScans >= 25;
    },
    points: 400,
    icon: '♻️'
  },
  {
    id: 'level_5',
    name: 'Rising Star',
    description: 'Reach Level 5',
    condition: (user) => user.level >= 5,
    points: 500,
    icon: '⭐'
  },
  {
    id: 'level_10',
    name: 'Sustainability Champion',
    description: 'Reach Level 10',
    condition: (user) => user.level >= 10,
    points: 1000,
    icon: '🏅'
  },
  {
    id: 'level_15',
    name: 'Eco Legend',
    description: 'Reach the maximum Level 15',
    condition: (user) => user.level >= 15,
    points: 2500,
    icon: '🌟'
  },
  {
    id: 'points_millionaire',
    name: 'Points Millionaire',
    description: 'Earn 10,000 total points',
    condition: (user) => (user.totalPointsEarned || 0) >= 10000,
    points: 1000,
    icon: '💰'
  },
  {
    id: 'early_adopter',
    name: 'Early Adopter',
    description: 'One of the first 100 users to join',
    condition: (user) => {
      // This would need to be determined based on user registration order
      return false; // Placeholder
    },
    points: 200,
    icon: '🏃'
  }
]

// Calculate points for a scan with enhanced logic and confirmation type
export function calculateScanPoints(carbonEstimate: number, isFirstScan: boolean, streakCount: number, userTotalScans: number = 0): {
  points: number;
  reasons: string[];
  isConfirmed: boolean;
} {
  let points = 0;
  const reasons: string[] = [];

  // Determine if points should be immediately confirmed
  const isConfirmed = isFirstScan || 
                     userTotalScans >= POINT_CONFIRMATION.MIN_SCANS_FOR_AUTO_CONFIRMATION;

  // Base points for scanning
  if (isFirstScan) {
    points += POINT_REWARDS.FIRST_SCAN;
    reasons.push(`First scan bonus: +${POINT_REWARDS.FIRST_SCAN} points`);
  } else {
    points += POINT_REWARDS.DAILY_SCAN;
    reasons.push(`Daily scan: +${POINT_REWARDS.DAILY_SCAN} points`);
  }

  // Enhanced carbon footprint bonuses
  if (carbonEstimate < 0.5) {
    points += POINT_REWARDS.VERY_LOW_CARBON_SCAN;
    reasons.push(`Very low carbon product (<0.5kg): +${POINT_REWARDS.VERY_LOW_CARBON_SCAN} points`);
  } else if (carbonEstimate < 1.0) {
    points += POINT_REWARDS.LOW_CARBON_SCAN;
    reasons.push(`Low carbon product (<1kg): +${POINT_REWARDS.LOW_CARBON_SCAN} points`);
  }

  // Enhanced streak bonus with diminishing returns cap
  if (streakCount > 1) {
    const streakBonus = Math.min(streakCount * POINT_REWARDS.STREAK_BONUS, 100); // Cap at 100
    points += streakBonus;
    reasons.push(`${streakCount}-day streak bonus: +${streakBonus} points`);
  }

  // Milestone bonuses
  if (streakCount === 7) {
    points += POINT_REWARDS.WEEKLY_GOAL;
    reasons.push(`Weekly milestone bonus: +${POINT_REWARDS.WEEKLY_GOAL} points`);
  }

  return { points, reasons, isConfirmed };
}

// Enhanced level calculation with more levels
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

  const nextLevelPoints = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const currentLevelPoints = LEVEL_THRESHOLDS[level - 1] || 0;
  const progressToNext = level >= LEVEL_THRESHOLDS.length 
    ? 100 // Max level reached
    : ((totalPoints - currentLevelPoints) / (nextLevelPoints - currentLevelPoints)) * 100;

  return {
    level,
    nextLevelPoints,
    progressToNext: Math.min(progressToNext, 100)
  };
}

// Check for new achievements
export function checkAchievements(user: any): Achievement[] {
  const newAchievements: Achievement[] = [];
  const earnedAchievementIds = user.achievements?.map((a: any) => a.id) || [];

  for (const achievement of ACHIEVEMENTS) {
    if (!earnedAchievementIds.includes(achievement.id) && achievement.condition(user)) {
      newAchievements.push(achievement);
    }
  }

  return newAchievements;
}

// Calculate monthly goal bonus
export function calculateMonthlyBonus(user: any): { points: number; reason: string } | null {
  if (user.monthlyCarbon < 20 && user.totalScanned >= 10) {
    return {
      points: POINT_REWARDS.ECO_CHAMPION_GOAL,
      reason: 'Eco Champion - Monthly carbon under 20kg'
    };
  } else if (user.monthlyCarbon < 30 && user.totalScanned >= 5) {
    return {
      points: POINT_REWARDS.MONTHLY_GOAL,
      reason: 'Monthly Goal - Carbon under 30kg'
    };
  }
  return null;
}

// Get user's sustainability tier
export function getSustainabilityTier(monthlyCarbon: number, totalScanned: number): {
  tier: string;
  color: string;
  description: string;
} {
  if (monthlyCarbon < 10 && totalScanned >= 15) {
    return {
      tier: 'Platinum',
      color: 'text-gray-300',
      description: 'Ultimate eco-warrior'
    };
  } else if (monthlyCarbon < 20 && totalScanned >= 10) {
    return {
      tier: 'Gold',
      color: 'text-yellow-400',
      description: 'Exceptional sustainability'
    };
  } else if (monthlyCarbon < 30 && totalScanned >= 5) {
    return {
      tier: 'Silver',
      color: 'text-gray-400',
      description: 'Great progress'
    };
  } else if (monthlyCarbon < 40) {
    return {
      tier: 'Bronze',
      color: 'text-amber-600',
      description: 'Getting started'
    };
  }
  return {
    tier: 'Beginner',
    color: 'text-gray-500',
    description: 'Room for improvement'
  };
}

// Confirm pending points that meet the confirmation criteria
export function confirmPendingPoints(user: any): {
  confirmedPoints: number;
  confirmedTransactions: any[];
} {
  let confirmedPoints = 0;
  const confirmedTransactions: any[] = [];
  const now = new Date();
  
  if (user.rewardTransactions) {
    for (const transaction of user.rewardTransactions) {
      // Skip if already confirmed or redeemed
      if (transaction.pointsType === 'confirmed' || transaction.type === 'redeemed') {
        continue;
      }
      
      // Check if enough time has passed for confirmation
      const transactionDate = new Date(transaction.date);
      const hoursElapsed = (now.getTime() - transactionDate.getTime()) / (1000 * 60 * 60);
      
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

// Check if points can be immediately confirmed based on reason
export function shouldConfirmImmediately(reason: string): boolean {
  return POINT_CONFIRMATION.IMMEDIATE_CONFIRMATION.includes(reason);
}

// Get user's point summary
export function getUserPointsSummary(user: any): {
  confirmed: number;
  unconfirmed: number;
  total: number;
  pendingConfirmation: number;
} {
  const confirmed = user.confirmedPoints || 0;
  const unconfirmed = user.unconfirmedPoints || 0;
  const total = confirmed + unconfirmed;
  
  // Calculate points that will be confirmed soon (within 24 hours)
  let pendingConfirmation = 0;
  const now = new Date();
  
  if (user.rewardTransactions) {
    for (const transaction of user.rewardTransactions) {
      if (transaction.pointsType === 'unconfirmed' && transaction.type === 'earned') {
        const transactionDate = new Date(transaction.date);
        const hoursElapsed = (now.getTime() - transactionDate.getTime()) / (1000 * 60 * 60);
        const hoursRemaining = POINT_CONFIRMATION.CONFIRMATION_DELAY_HOURS - hoursElapsed;
        
        // Count as "pending confirmation" if it will be confirmed within next 24 hours
        if (hoursRemaining > 0 && hoursRemaining <= 24) {
          pendingConfirmation += transaction.points;
        }
      }
    }
  }
  
  return { confirmed, unconfirmed, total, pendingConfirmation };
}
