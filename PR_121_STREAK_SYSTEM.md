# PR: Implement End-to-End Scan Streak System with Protection & Notifications

**Closes #121**

---

## Summary

This PR implements a complete, production-ready scan streak system for EcoVerse that was previously broken — streak-related achievements and shop items existed but scan activity never updated streak counts or consumed protectors. All streak-based rewards were unreachable.

This implementation is built to resolve 10 logic and design flaws identified in the original feature spec before writing a single line of production code.

---

## Problem

- `streakCount` and `bestStreakCount` fields on `User` were never written during scans
- `streakProtectors` purchased from the reward shop were never consumed
- Daily scan bonuses and streak multipliers could be farmed by scanning multiple times per day
- No timezone awareness — UTC `diffDays` caused false streak breaks for users outside UTC
- Negative `diffDays` (clock drift/spoofing) caused unhandled edge cases
- Milestone notifications (7/30/100 days) only fired once via achievements, never repeated
- `lastScanDate` was overwritten on same-day scans, corrupting the midnight anchor

---

## Changes

### `lib/streak-system.ts` _(New file)_

Core streak processing utility with a single pure function `processStreak(user, currentScanDate, timezoneOffsetMinutes)`.

**Handles all branches:**

- First-ever scan (`lastScanDate === null`) → starts streak at 1
- Same-day scan (`diffDays <= 0`) → no change, `lastScanDate` preserved (returns `null`)
- Consecutive day (`diffDays === 1`) → increments streak
- Missed days **with enough protectors** (`protectors >= missedDays`) → streak saved, exact consumption
- Missed days **without enough protectors** → streak resets to 1, 0 protectors consumed
- Negative diffDays (clock drift/spoofing) → treated as same-day (safe fallback)

**Returns:** `{ streakCount, bestStreakCount, lastScanDate, protectorsUsed, streakSaved, isFirstScanOfDay, milestone, lostStreak }`

**Milestone detection:** `milestone` is non-null for every multiple of 7, 30, and 100 — not just the first time, enabling recurring notifications.

---

### `lib/rewards-system.ts`

- **Added `isFirstScanOfDay` parameter** to `calculateScanPoints()` (defaults `true` for backward compat)
- Daily scan base points and streak bonuses are now **gated behind `isFirstScanOfDay`** — prevents unlimited point farming on same-day scans
- Fixed `confidence` field type in `RewardUser.scans` (`number` → `'high' | 'medium' | 'low' | string`)
- Relaxed `RewardTransaction` field types to be compatible with Mongoose `IRewardTransaction`

---

### `app/api/scan/route.ts`

- Reads `timezoneOffset` from the request body (sent by client, defaults to `0`)
- Calls `processStreak()` before point calculation
- Passes `streakResult.isFirstScanOfDay` to `calculateScanPoints` to prevent farming
- Applies streak changes **atomically** in the same `findOneAndUpdate` call:
  - `$set`: `streakCount`, `bestStreakCount`, `lastScanDate` (only if first-of-day)
  - `$inc`: `streakProtectors: -protectorsUsed`
- Response now includes: `streakProtected`, `streakProtectorsUsed`, `streakLost`, `milestone`

---

### `app/dashboard/page.tsx`

- `UserStats` interface extended with `streakProtectors?: number`
- `streakProtectors` is populated from `/api/rewards` → `specialFeatures.streakProtectors`
- Streak badge now shows **progress to next milestone** (e.g. _3 days to next milestone_)
- New **🛡️ N Shields Active** badge displayed when user has active protectors

---

### `app/scan/page.tsx`

- Scan request now sends `timezoneOffset: new Date().getTimezoneOffset()`
- Notification handler reads `streakProtected` and `milestone` from response
- **Staggered notification queue** (prevents visual overlap):
  1. Points earned (immediate)
  2. 🛡️ Streak saved! (1.5s)
  3. 🔥 Milestone Reached: N Day Streak! (3s if protected, else 1.5s)
  4. Level up (after milestone slot)
  5. Achievement unlocks (after level-up slot)

---

### `lib/__tests__/streak-system.test.ts` _(New file)_

**16 unit tests** covering every branch of `processStreak`:

| Suite                               | Tests                                                                   |
| ----------------------------------- | ----------------------------------------------------------------------- |
| First-ever scan                     | Streak starts at 1                                                      |
| Same-day scan                       | No change, `null` returned for lastScanDate                             |
| Consecutive day                     | Streak increments, bestStreak updates                                   |
| Missed days + enough protectors     | 1 protector, 2 protectors                                               |
| Missed days + not enough protectors | Reset to 1, bestStreak preserved                                        |
| Clock drift / negative diffDays     | Treated as same-day                                                     |
| Milestone detection                 | 7, 30, 100, non-milestone, lost streak                                  |
| Exact boundary                      | `protectors === missedDays` saves; `protectors = missedDays - 1` breaks |

---

### `lib/__tests__/rewards-system.test.ts`

- Replaced removed `UserPointsData` type with `RewardUser` in all test mocks
- Added missing required fields (`streakCount`, `level`, `monthlyCarbon`) to partial mocks
- Fixed achievement mock shape to match `RewardUser.achievements` (removed `condition`/`icon`)

---

## Test Results

```
PASS  lib/__tests__/streak-system.test.ts   16/16 ✅
PASS  lib/__tests__/rewards-system.test.ts  24/24 ✅
```

---

## Atomicity & Correctness Guarantees

- **No TOCTOU race:** Streak fields are written in the same atomic `findOneAndUpdate` as carbon/point increments — no two-step read-then-write
- **No double consumption:** `streakProtectors: -0` is a no-op; consumed only when `streakSaved === true`
- **No date anchor corruption:** Same-day scans return `lastScanDate: null`, which is explicitly skipped in the `$set` payload
- **No negative protectors:** Protector decrement only fires when `user.streakProtectors >= missedDays`

---

## Checklist

- [x] New streak utility (`lib/streak-system.ts`) is pure and has no side effects
- [x] Scan API route updated with streak processing
- [x] Point farming prevented via `isFirstScanOfDay` gate
- [x] Streak protector consumption is atomic and correct
- [x] `lastScanDate` anchor preserved on same-day scans
- [x] Timezone-aware streak boundary calculation
- [x] Milestone notifications fire for every 7/30/100-day multiple
- [x] Dashboard shows active protectors and milestone countdown
- [x] 16 new unit tests for streak logic, 24 existing rewards tests still pass
- [x] No new TypeScript errors introduced in changed files
- [x] Backward compatible (`isFirstScanOfDay` defaults to `true`)
