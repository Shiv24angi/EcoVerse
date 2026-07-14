# EcoVerse — Non-Trivial PR Issues

> **Repository**: `Shiv24angi/EcoVerse`
> **Date**: 2026-06-18
> **Author**: @jayshreerathoreai32-hue

> **Note**: This document describes a backlog of issues. **PR `#3` (JWT auth)** is currently being addressed by the JWT Cookie Auth & Session Management PR, and **PR `#4` (Barcode Scanner Lifecycle)** improvements are already included. Remaining future work only includes unresolved items: Issues `#1`, `#2`, and `#5`.

The following 5 issues each require changes across multiple interacting modules, touch core business logic, and demand careful architectural reasoning. Each is formatted as a Pull Request proposal.

---

## PR #1 — Fix: Scan Streak Counter Never Updates (Broken Core Game Loop)

### 🏷️ Labels

`bug` `core-logic` `rewards-system` `priority: high`

### Problem

The scan streak (`streakCount`) is a central metric used by the **rewards system** (streak bonuses, 12+ achievements, sustainability tiers) and the **leaderboard**, yet **no code path ever increments or resets it**.

In [`app/api/scan/route.ts`](file:///d:/EcoVerse/EcoVerse/app/api/scan/route.ts):

- `streakCount` is **read** at [L74](file:///d:/EcoVerse/EcoVerse/app/api/scan/route.ts#L74) and passed to `calculateScanPoints()`
- The `$inc` update block ([L95-L102](file:///d:/EcoVerse/EcoVerse/app/api/scan/route.ts#L95-L102)) increments `totalScanned`, `monthlyCarbon`, and all point fields — but **never touches** `streakCount`, `lastScanDate`, or `bestStreakCount`

This means:

- `streakCount` is permanently `0` for all users
- `calculateScanPoints()` always produces a streak bonus of `0`
- Achievements like _"Week Warrior"_ (7-day streak), _"Consistency King"_ (30-day), and _"Streak Master"_ (100-day) are **permanently unattainable**
- The `POINT_REWARDS.WEEKLY_GOAL` milestone at streak === 7 never fires

### Root Cause

The streak update logic was never implemented — `lastScanDate` comparison and day-boundary detection are entirely absent from the scan API.

### Proposed Changes

#### [MODIFY] [route.ts](file:///d:/EcoVerse/EcoVerse/app/api/scan/route.ts)

Add streak computation **before** the atomic `$inc` update:

```typescript
// Compute streak update
const now = new Date();
const lastScan = user.lastScanDate ? new Date(user.lastScanDate) : null;

let newStreakCount = user.streakCount || 0;
let streakBroken = false;

if (lastScan) {
  const lastScanDay = new Date(
    lastScan.getFullYear(),
    lastScan.getMonth(),
    lastScan.getDate()
  );
  const todayDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.floor(
    (todayDay.getTime() - lastScanDay.getTime()) / 86400000
  );

  if (diffDays === 0) {
    // Same day — no streak change
  } else if (diffDays === 1) {
    newStreakCount += 1; // Consecutive day
  } else {
    newStreakCount = 1; // Streak broken, restart
    streakBroken = true;
  }
} else {
  newStreakCount = 1; // First-ever scan
}

const newBestStreak = Math.max(user.bestStreakCount || 0, newStreakCount);
```

Then include in the `$set` portion of the atomic update:

```typescript
$set: {
  streakCount: newStreakCount,
  bestStreakCount: newBestStreak,
  lastScanDate: now,
}
```

#### [MODIFY] [rewards-system.ts](file:///d:/EcoVerse/EcoVerse/lib/rewards-system.ts)

Update `calculateScanPoints` to use the **newly computed** streak count rather than the stale DB value.

### Affected Files

| File                    | Change Type                          |
| ----------------------- | ------------------------------------ |
| `app/api/scan/route.ts` | Major — add streak logic             |
| `lib/rewards-system.ts` | Minor — parameter documentation      |
| `models/User.ts`        | Verify schema fields exist (they do) |

### Acceptance Criteria

- [ ] First scan sets `streakCount = 1` and `lastScanDate`
- [ ] Scanning on a consecutive calendar day increments `streakCount`
- [ ] Scanning twice in the same day does **not** double-increment
- [ ] A gap of ≥2 days resets `streakCount` to 1
- [ ] `bestStreakCount` is tracked as a high-water mark
- [ ] Streak-based achievements become attainable
- [ ] Unit test covers all 4 streak transition cases

---

## PR #2 — Refactor: Replace Unsafe `unknown` Typing in Rewards System with Proper Interfaces

### 🏷️ Labels

`refactor` `type-safety` `tech-debt` `priority: medium`

### Problem

The entire rewards computation layer in [`lib/rewards-system.ts`](file:///d:/EcoVerse/EcoVerse/lib/rewards-system.ts) uses `unknown` as the user type across **every public function** — `checkAchievements(user: unknown)`, `calculateMonthlyBonus(user: unknown)`, `confirmPendingPoints(user: unknown)`, `getUserPointsSummary(user: unknown)`.

Inside these functions, properties like `user.totalScanned`, `user.monthlyCarbon`, `user.streakCount`, `user.rewardTransactions`, `user.achievements`, `user.confirmedPoints`, etc. are accessed **without any type narrowing or runtime guards**.

This creates multiple problems:

1. **No compile-time safety**: TypeScript's `unknown` type forbids property access without narrowing, yet the code accesses `.totalScanned`, `.monthlyCarbon`, etc. directly — meaning either `// @ts-ignore` or `any` coercion is silently happening during build
2. **Achievement conditions use `unknown`**: Each achievement's `condition` callback is typed as `(user: unknown) => boolean` but accesses `user.totalScanned`, `user.streakCount`, `user.level`, `user.scans` etc. — these are all runtime errors waiting to happen if the shape changes
3. **The rewards API route** ([`app/api/rewards/route.ts`](file:///d:/EcoVerse/EcoVerse/app/api/rewards/route.ts#L23)) casts the Mongoose document to `any` at L23 to bypass this, then passes it through — propagating the unsafe pattern
4. **No runtime validation**: If a Mongoose document is missing a field (e.g., a migrated user without `confirmedPoints`), the code silently produces `NaN` or `undefined` results

### Proposed Changes

#### [NEW] `lib/types/user.ts`

Create a shared `RewardsUserProfile` interface:

```typescript
export interface RewardsUserProfile {
  totalScanned: number;
  monthlyCarbon: number;
  streakCount: number;
  level: number;
  confirmedPoints: number;
  unconfirmedPoints: number;
  totalPointsEarned: number;
  rewardTransactions: RewardTransaction[];
  achievements: {
    id: string;
    name: string;
    description: string;
    earnedAt: Date;
    points: number;
  }[];
  scans: { carbonEstimate: number; date: Date }[];
}
```

#### [MODIFY] [rewards-system.ts](file:///d:/EcoVerse/EcoVerse/lib/rewards-system.ts)

- Replace all `unknown` parameters with `RewardsUserProfile`
- Change `Achievement.condition` from `(user: unknown) => boolean` to `(user: RewardsUserProfile) => boolean`
- Add defensive defaults: `(user.confirmedPoints ?? 0)` pattern throughout

#### [MODIFY] [route.ts (rewards)](file:///d:/EcoVerse/EcoVerse/app/api/rewards/route.ts)

- Remove `as any` cast at L23
- Use a mapping function to convert Mongoose doc → `RewardsUserProfile`

#### [MODIFY] [route.ts (scan)](file:///d:/EcoVerse/EcoVerse/app/api/scan/route.ts)

- Same pattern — map Mongoose doc before passing to rewards functions

### Affected Files

| File                       | Change Type                                     |
| -------------------------- | ----------------------------------------------- |
| `lib/types/user.ts`        | **NEW** — shared type definitions               |
| `lib/rewards-system.ts`    | Major — replace all `unknown` with proper types |
| `app/api/rewards/route.ts` | Medium — remove `as any`, add mapper            |
| `app/api/scan/route.ts`    | Medium — add mapper                             |

### Acceptance Criteria

- [ ] Zero `unknown` or `any` types in the rewards computation path
- [ ] `tsc --noEmit` passes without `@ts-ignore` or `@ts-expect-error` in rewards files
- [ ] Achievement conditions have compile-time property checking
- [ ] All existing tests continue to pass
- [ ] Added unit tests for edge cases (missing fields, zero values, empty arrays)

---

## PR #3 — Fix: Signin Route Does Not Issue JWT — Users Cannot Access Protected APIs After Login

### 🏷️ Labels

`bug` `security` `authentication` `priority: critical`

### Problem

The Google auth route ([`app/api/auth/google/route.ts`](file:///d:/EcoVerse/EcoVerse/app/api/auth/google/route.ts#L63-L76)) correctly generates a JWT and sets it as an HttpOnly cookie:

```typescript
const token = await signToken({ email: userDoc.email, userId: userDoc._id.toString() });
cookieStore.set('auth_token', token, { httpOnly: true, ... });
```

However, the **email/password signin route** ([`app/api/auth/signin/route.ts`](file:///d:/EcoVerse/EcoVerse/app/api/auth/signin/route.ts)) **does neither** — it simply returns the user object with no JWT and no cookie:

```typescript
// L48 — no token, no cookie
return NextResponse.json({ user: userData }, { status: 200 });
```

The **signup route** ([`app/api/auth/signup/route.ts`](file:///d:/EcoVerse/EcoVerse/app/api/auth/signup/route.ts)) has the **same gap** — no JWT issued on registration.

Since the middleware ([`middleware.ts`](file:///d:/EcoVerse/EcoVerse/middleware.ts#L7)) reads `auth_token` from cookies to set the `x-user-email` header, and all protected API routes (`/api/scan`, `/api/rewards`, `/api/user/*`) check for this header — **any user who signs up or signs in via email/password has no valid session token and cannot access ANY protected API endpoint**.

The app appears to "work" only because:

1. The client stores user data in `localStorage` for UI rendering
2. But every actual API call to scan/rewards/leaderboard will return `401 Unauthorized`

### Root Cause

JWT issuance was implemented in the Google auth route but never ported to the email auth routes.

### Proposed Changes

#### [MODIFY] [signin/route.ts](file:///d:/EcoVerse/EcoVerse/app/api/auth/signin/route.ts)

After password verification succeeds, add:

```typescript
import { signToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// After isMatch check passes:
const token = await signToken({
  email: user.email,
  userId: user._id.toString(),
});
const cookieStore = await cookies();
cookieStore.set('auth_token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60,
  path: '/',
});
```

#### [MODIFY] [signup/route.ts](file:///d:/EcoVerse/EcoVerse/app/api/auth/signup/route.ts)

Same pattern — issue JWT after successful user creation.

#### [MODIFY] [auth-provider.tsx](file:///d:/EcoVerse/EcoVerse/components/auth-provider.tsx)

Update the `logout` function to also clear the cookie by calling a logout API endpoint or setting an expired cookie.

### Affected Files

| File                           | Change Type                             |
| ------------------------------ | --------------------------------------- |
| `app/api/auth/signin/route.ts` | Major — add JWT + cookie                |
| `app/api/auth/signup/route.ts` | Major — add JWT + cookie                |
| `components/auth-provider.tsx` | Minor — cookie cleanup on logout        |
| `app/api/auth/logout/route.ts` | **NEW** — endpoint to clear auth cookie |

### Acceptance Criteria

- [ ] After email/password login, `auth_token` cookie is set
- [ ] After signup, `auth_token` cookie is set
- [ ] Protected API routes (`/api/scan`, `/api/rewards`) return 200 for authenticated email users
- [ ] Logout clears the cookie
- [ ] Google sign-in flow remains unchanged
- [ ] Integration test: signup → scan → verify rewards updated

---

## PR #4 — Perf: Fix BarcodeScanner Memory Leak — `BrowserMultiFormatReader` Reinstantiated on Every Render

### 🏷️ Labels

`performance` `memory-leak` `component` `priority: medium`

### Problem

In [`components/barcode-scanner.tsx`](file:///d:/EcoVerse/EcoVerse/components/barcode-scanner.tsx#L33), a new `BrowserMultiFormatReader` instance is created **on every render** as an inline declaration:

```typescript
// Line 33 — inside the component body, NOT inside useRef/useMemo
const codeReader = new BrowserMultiFormatReader();
```

This is called from `simulateScan()` at [L117](file:///d:/EcoVerse/EcoVerse/components/barcode-scanner.tsx#L117) which runs on a **3-second interval** ([L42-L43](file:///d:/EcoVerse/EcoVerse/components/barcode-scanner.tsx#L42-L43)). Each call to `decodeOnceFromVideoElement` allocates internal buffers and canvas contexts but the reader instance from the previous render is never cleaned up — `BrowserMultiFormatReader` has no automatic disposal.

Additionally:

- The `useEffect` for the interval at [L41-L48](file:///d:/EcoVerse/EcoVerse/components/barcode-scanner.tsx#L41-L48) depends on `[stream]` but captures a stale `simulateScan` closure — this means the interval may operate on a stale `videoRef`
- `startCamera()` is called inside a `useEffect` but is not memoized, causing potential re-creation on every dependency change
- The camera stream is stopped in the cleanup function but `codeReader` resources are never released

### Proposed Changes

#### [MODIFY] [barcode-scanner.tsx](file:///d:/EcoVerse/EcoVerse/components/barcode-scanner.tsx)

**1. Move reader to a ref:**

```typescript
const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

useEffect(() => {
  codeReaderRef.current = new BrowserMultiFormatReader();
  return () => {
    // BrowserMultiFormatReader doesn't expose a destroy(), but
    // nullifying the ref prevents stale references
    codeReaderRef.current = null;
  };
}, []);
```

**2. Memoize `simulateScan` with `useCallback`:**

```typescript
const simulateScan = useCallback(async () => {
  if (videoRef.current && codeReaderRef.current) {
    try {
      const result = await codeReaderRef.current.decodeOnceFromVideoElement(
        videoRef.current
      );
      if (result?.getText()) {
        onScan(result.getText());
      }
    } catch (error) {
      if ((error as any)?.name !== 'NotFoundException') {
        toast({
          title: 'Scanning failed',
          description: (error as Error).message,
          variant: 'destructive',
        });
      }
    }
  }
}, [onScan, toast]);
```

**3. Fix interval dependency:**

```typescript
useEffect(() => {
  if (!stream) return;
  const interval = setInterval(simulateScan, 3000);
  return () => clearInterval(interval);
}, [stream, simulateScan]);
```

### Affected Files

| File                             | Change Type                                |
| -------------------------------- | ------------------------------------------ |
| `components/barcode-scanner.tsx` | Major — refactor to use refs and callbacks |

### Acceptance Criteria

- [ ] Only one `BrowserMultiFormatReader` instance exists per component lifecycle
- [ ] Memory profiling shows no linear growth during extended scan sessions
- [ ] Camera stream cleanup still works correctly on unmount
- [ ] Barcode detection remains functional (manual and auto-scan)
- [ ] No stale closure warnings from ESLint `react-hooks/exhaustive-deps`

---

## PR #5 — Fix: `monthlyCarbon` Never Resets — Sustainability Tiers, Achievements, and Bonuses Become Permanently Stale

### 🏷️ Labels

`bug` `core-logic` `data-integrity` `priority: high`

### Problem

The `monthlyCarbon` field on the User model is the **primary metric** for:

- **Sustainability tiers**: Platinum (< 10kg), Gold (< 20kg), Silver (< 30kg), Bronze (< 40kg) — [rewards-system.ts L411-L448](file:///d:/EcoVerse/EcoVerse/lib/rewards-system.ts#L411-L448)
- **Achievements**: _"Eco Warrior"_ (< 20kg), _"Carbon Conscious"_ (< 30kg), _"Zero Waste Hero"_ (< 10kg) — [rewards-system.ts L202-L224](file:///d:/EcoVerse/EcoVerse/lib/rewards-system.ts#L202-L224)
- **Monthly bonuses**: `calculateMonthlyBonus()` awards 500-1000 points based on monthly carbon — [rewards-system.ts L393-L408](file:///d:/EcoVerse/EcoVerse/lib/rewards-system.ts#L393-L408)
- **Virtual sustainability level**: [User.ts L94-L98](file:///d:/EcoVerse/EcoVerse/models/User.ts#L94-L98)

However, `monthlyCarbon` is only ever **incremented** (in the scan API at [L96](file:///d:/EcoVerse/EcoVerse/app/api/scan/route.ts#L96)):

```typescript
$inc: {
  monthlyCarbon: carbonEstimate;
}
```

**There is no mechanism to reset it at the start of each calendar month.** This means:

- After a few months of usage, `monthlyCarbon` grows monotonically to hundreds or thousands of kg
- Every user permanently falls to "Beginner" tier after enough scans
- Carbon-based achievements become **impossible** for active users
- Monthly bonuses are never awarded because the thresholds (< 20kg, < 30kg) are exceeded permanently
- The `lastMonthlyBonusCheck` field exists in the schema ([L82](file:///d:/EcoVerse/EcoVerse/models/User.ts#L82)) but is never read or written

The monthly-check API route at `app/api/rewards/monthly-check/` likely has related logic but the reset is fundamentally absent from the scan flow.

### Proposed Changes

#### [NEW] `lib/monthly-reset.ts`

Extract a reusable utility:

```typescript
export function shouldResetMonthlyCarbon(lastResetDate: Date | null): boolean {
  if (!lastResetDate) return true;
  const now = new Date();
  return (
    now.getMonth() !== lastResetDate.getMonth() ||
    now.getFullYear() !== lastResetDate.getFullYear()
  );
}
```

#### [MODIFY] [route.ts (scan)](file:///d:/EcoVerse/EcoVerse/app/api/scan/route.ts)

Before the atomic update, check if a month boundary has been crossed:

```typescript
import { shouldResetMonthlyCarbon } from '@/lib/monthly-reset';

// Before the $inc update:
const needsReset = shouldResetMonthlyCarbon(user.lastMonthlyBonusCheck);

// If reset needed, set monthlyCarbon to just the current scan's carbon
// instead of incrementing from the stale accumulated value
if (needsReset) {
  // Use $set for monthlyCarbon instead of $inc
  // Also award any pending monthly bonus for the previous month
  // Update lastMonthlyBonusCheck to now
}
```

#### [MODIFY] [User.ts](file:///d:/EcoVerse/EcoVerse/models/User.ts)

Add a `lastMonthlyCarbonReset` field to track when the counter was last zeroed:

```typescript
lastMonthlyCarbonReset: { type: Date, default: null },
```

#### [NEW] `app/api/cron/monthly-reset/route.ts`

Optional: A cron-triggered endpoint (for Vercel Cron or similar) that batch-resets all users' `monthlyCarbon` at the start of each month, archiving the previous month's data.

### Affected Files

| File                                  | Change Type                                                    |
| ------------------------------------- | -------------------------------------------------------------- |
| `lib/monthly-reset.ts`                | **NEW** — month boundary detection utility                     |
| `app/api/scan/route.ts`               | Major — integrate monthly reset check                          |
| `models/User.ts`                      | Minor — add reset tracking field                               |
| `app/api/cron/monthly-reset/route.ts` | **NEW** — optional batch cron handler                          |
| `lib/rewards-system.ts`               | Minor — update `calculateMonthlyBonus` to use reset-aware data |

### Acceptance Criteria

- [ ] `monthlyCarbon` resets to 0 when a scan occurs in a new calendar month
- [ ] Previous month's carbon data is preserved (either archived or logged)
- [ ] Monthly bonus is calculated and awarded for the completed month before reset
- [ ] `lastMonthlyBonusCheck` is properly updated
- [ ] Sustainability tiers reflect the current month only
- [ ] Carbon-based achievements use current-month data
- [ ] Edge case: user who hasn't scanned for 3+ months gets a clean reset
- [ ] Unit test covers month boundary transitions (Dec→Jan, same month, multi-month gap)

---

## Summary Table

| PR  | Title                             | Severity    | Core Files Touched                                        | Category               |
| --- | --------------------------------- | ----------- | --------------------------------------------------------- | ---------------------- |
| #1  | Scan streak never updates         | 🔴 High     | `scan/route.ts`, `rewards-system.ts`                      | Bug — broken game loop |
| #2  | Unsafe `unknown` types in rewards | 🟡 Medium   | `rewards-system.ts`, `rewards/route.ts`, `scan/route.ts`  | Refactor — type safety |
| #3  | Signin route missing JWT          | 🔴 Critical | `signin/route.ts`, `signup/route.ts`, `auth-provider.tsx` | Bug — broken auth flow |
| #4  | BarcodeScanner memory leak        | 🟡 Medium   | `barcode-scanner.tsx`                                     | Performance — memory   |
| #5  | monthlyCarbon never resets        | 🔴 High     | `scan/route.ts`, `User.ts`, `rewards-system.ts`           | Bug — data integrity   |

> [!IMPORTANT]
> Issues #1, #3, and #5 are **blocking bugs** that affect core functionality for all users. They should be prioritized in that order: #3 (auth broken) → #5 (data corruption) → #1 (feature broken).
