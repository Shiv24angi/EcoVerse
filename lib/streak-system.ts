/**
 * @deprecated This module has been consolidated into `lib/rewards-system.ts`.
 * Use `calculateStreakUpdate` from `lib/rewards-system.ts` instead.
 * This file is kept only as a reference and will be removed in a future version.
 */

export interface StreakUser {
  lastScanDate: Date | null;
  streakCount: number;
  bestStreakCount: number;
  streakProtectors: number;
}

export interface StreakResult {
  streakCount: number;
  bestStreakCount: number;
  lastScanDate: Date | null; // null means keep original date (don't update)
  protectorsUsed: number;
  streakSaved: boolean;
  isFirstScanOfDay: boolean;
  milestone: number | null;
  lostStreak: boolean;
}

export function processStreak(
  user: StreakUser,
  currentScanDate: Date,
  timezoneOffsetMinutes: number
): StreakResult {
  // timezoneOffsetMinutes is the difference, in minutes, from UTC to local time.
  // e.g., for UTC-5 (EST), it's 300.
  // We want to calculate the "start of day" in the user's local timezone.

  const getLocalStartOfDay = (date: Date) => {
    // Convert UTC time to local time by subtracting the offset
    const localTime = new Date(date.getTime() - timezoneOffsetMinutes * 60000);
    // Set to 00:00:00 local time
    localTime.setUTCHours(0, 0, 0, 0);
    return localTime;
  };

  const currentLocalStart = getLocalStartOfDay(currentScanDate);
  const lastLocalStart = user.lastScanDate
    ? getLocalStartOfDay(new Date(user.lastScanDate))
    : null;

  if (!lastLocalStart) {
    return {
      streakCount: 1,
      bestStreakCount: Math.max(1, user.bestStreakCount),
      lastScanDate: currentScanDate,
      protectorsUsed: 0,
      streakSaved: false,
      isFirstScanOfDay: true,
      milestone: null,
      lostStreak: false,
    };
  }

  const diffTime = currentLocalStart.getTime() - lastLocalStart.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    // Same day scan (or negative diff due to clock drift/spoofing)
    return {
      streakCount: user.streakCount,
      bestStreakCount: user.bestStreakCount,
      lastScanDate: null, // Do not update lastScanDate so we preserve the original anchor
      protectorsUsed: 0,
      streakSaved: false,
      isFirstScanOfDay: false,
      milestone: null,
      lostStreak: false,
    };
  }

  let newStreak = user.streakCount;
  let protectorsUsed = 0;
  let streakSaved = false;
  let lostStreak = false;

  if (diffDays === 1) {
    // Consecutive day
    newStreak += 1;
  } else {
    // Missed days
    const missedDays = diffDays - 1;
    if (user.streakProtectors >= missedDays) {
      // Enough protectors to save the streak
      protectorsUsed = missedDays;
      streakSaved = true;
      newStreak += 1; // Increment for the current day's scan
    } else {
      // Streak broken
      newStreak = 1;
      lostStreak = true;
    }
  }

  const bestStreakCount = Math.max(newStreak, user.bestStreakCount);

  // Check for recurring milestone
  let milestone: number | null = null;
  if (
    !lostStreak &&
    (newStreak % 7 === 0 || newStreak % 30 === 0 || newStreak % 100 === 0)
  ) {
    milestone = newStreak;
  }

  return {
    streakCount: newStreak,
    bestStreakCount,
    lastScanDate: currentScanDate,
    protectorsUsed,
    streakSaved,
    isFirstScanOfDay: true,
    milestone,
    lostStreak,
  };
}
