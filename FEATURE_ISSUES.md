# EcoVerse — Feature Implementation Issues

> **Repository**: `Shiv24angi/EcoVerse`  
> **Date**: 2026-06-18  
> **Author**: @jayshreerathoreai32-hue  
> **Contribution Level**: Non-trivial — each issue touches core logic, involves architectural decisions, and requires deep codebase understanding.

---

## Issue #1 — Implement End-to-End Scan Streak System with Protection & Notifications

### Type: `New Feature with Multiple Interacting Parts`

### Context

The User schema already defines `streakCount`, `bestStreakCount`, `lastScanDate`, and `streakProtectors` fields ([`models/User.ts` L62-L76](models/User.ts)), and the rewards system references streaks in `calculateScanPoints()` ([`lib/rewards-system.ts` L325-L329](lib/rewards-system.ts)) and in 3 streak-based achievements (`week_streak`, `month_streak`, `hundred_day_streak` at [L178-L200](lib/rewards-system.ts)). The reward shop even sells a "Streak Protector" item ([L116-L123](lib/rewards-system.ts)). However, **none of this is wired together** — no code path ever updates `streakCount` or `lastScanDate`, and the streak protector consumable has no consumption logic.

### Proposed Implementation

**1. Streak Engine (`lib/streak-engine.ts` — NEW)**

Create a dedicated module with pure functions:

```typescript
export interface StreakResult {
  newStreakCount: number;
  newBestStreak: number;
  streakBroken: boolean;
  streakProtectorUsed: boolean;
  bonusPoints: number;
  milestoneReached: number | null; // 7, 30, 100
}

export function computeStreakUpdate(
  lastScanDate: Date | null,
  currentStreak: number,
  bestStreak: number,
  availableProtectors: number,
  now: Date
): StreakResult { ... }
```

Core logic: compare calendar days between `lastScanDate` and `now`. If gap = 0 (same day), no change. If gap = 1, increment. If gap = 2 and `availableProtectors > 0`, consume one protector and maintain streak. If gap ≥ 2 (no protector), reset to 1.

**2. Integrate into Scan API (`app/api/scan/route.ts`)**

Call `computeStreakUpdate()` before the atomic `$inc` update at [L92-L128](app/api/scan/route.ts). Add `streakCount`, `bestStreakCount`, `lastScanDate` to the `$set` portion. If a protector is consumed, add `streakProtectors: -1` to `$inc`. Return streak data in the response alongside existing rewards data.

**3. Streak Notification Component (`components/streak-notification.tsx` — NEW)**

A toast/modal component that renders differently for:

- Streak continued (+1 day)
- Streak milestone (7/30/100 days) with confetti animation
- Streak saved by protector (shield animation)
- Streak broken (reset notice with option to buy protector)

Integrates with the existing `reward-notification.tsx` pattern at [L1-L4503](components/reward-notification.tsx).

**4. Streak Display in Dashboard (`components/dashboard-layout.tsx`)**

Add a streak counter badge in the header area near the avatar ([L73-L104](components/dashboard-layout.tsx)) showing current streak with a fire 🔥 icon and the best streak as a secondary label.

### Files Touched

| File                                 | Action                                          |
| ------------------------------------ | ----------------------------------------------- |
| `lib/streak-engine.ts`               | **NEW** — pure streak computation logic         |
| `app/api/scan/route.ts`              | MODIFY — integrate streak into scan flow        |
| `components/streak-notification.tsx` | **NEW** — UI notifications                      |
| `components/dashboard-layout.tsx`    | MODIFY — streak display                         |
| `lib/rewards-system.ts`              | MODIFY — wire streak milestones to bonus points |

### Why This Is Non-Trivial

- Requires calendar-day boundary math with timezone awareness
- The streak protector creates a branching state machine (break vs. save vs. continue)
- Must integrate atomically with the existing `$inc`/`$push` MongoDB update in scan API without race conditions
- Touches rewards, achievements, UI notifications, and dashboard — 5 interacting subsystems

---

## Issue #2 — Implement Monthly Carbon Cycle with Historical Archive & Trend Analytics

### Type: `New Feature with Multiple Interacting Parts`

### Context

`monthlyCarbon` is the primary metric driving sustainability tiers ([`lib/rewards-system.ts` L411-L448](lib/rewards-system.ts)), 3 carbon-based achievements ([L202-L224](lib/rewards-system.ts)), monthly bonuses ([L393-L408](lib/rewards-system.ts)), and the User model's virtual `sustainabilityLevel` ([`models/User.ts` L94-L98](models/User.ts)). The schema has `lastMonthlyBonusCheck` ([L82](models/User.ts)) and `monthlyBonusesEarned` ([L83](models/User.ts)) fields ready but unused. Currently `monthlyCarbon` only accumulates — there is no monthly lifecycle, no historical storage, and no trend visualization.

### Proposed Implementation

**1. Carbon History Sub-Schema (`models/User.ts`)**

Add a new embedded array to track monthly snapshots:

```typescript
const MonthlyCarbonHistorySchema = new mongoose.Schema({
  year: { type: Number, required: true },
  month: { type: Number, required: true }, // 0-11
  totalCarbon: { type: Number, required: true },
  totalScans: { type: Number, required: true },
  tier: { type: String },
  bonusAwarded: { type: Number, default: 0 },
  archivedAt: { type: Date, default: Date.now },
});
```

Add to UserSchema: `carbonHistory: [MonthlyCarbonHistorySchema]` and `lastMonthlyCarbonReset: { type: Date, default: null }`.

**2. Monthly Reset Utility (`lib/monthly-reset.ts` — NEW)**

```typescript
export function shouldResetMonthly(lastReset: Date | null, now: Date): boolean;
export function archiveAndReset(user): {
  archivedMonth: object;
  bonusPoints: number;
};
```

Detects month boundary crossings (handles multi-month gaps), snapshots current `monthlyCarbon` and `totalScanned` into the archive, calculates any earned monthly bonus via `calculateMonthlyBonus()`, then returns the reset values.

**3. Integration into Scan API (`app/api/scan/route.ts`)**

Before the atomic update at [L92](app/api/scan/route.ts), call `shouldResetMonthly()`. If a reset is needed:

- Archive the previous month's data via `$push` to `carbonHistory`
- `$set` monthlyCarbon to just the current scan's carbon (not accumulate on stale data)
- Award any monthly bonus points
- Update `lastMonthlyCarbonReset`

**4. Trend Analytics API (`app/api/user/carbon-history/route.ts` — NEW)**

GET endpoint that returns the user's `carbonHistory` array with computed trend data (month-over-month % change, rolling 3-month average, best/worst months). Feeds into the existing Analytics page at `app/analytics/`.

**5. Carbon Trend Chart Component (`components/carbon-trend-chart.tsx` — NEW)**

A Recharts-based ([already a dependency](package.json#L69)) line/bar chart showing monthly carbon over time with tier threshold lines overlaid. Integrate into the Analytics page.

### Files Touched

| File                                   | Action                                         |
| -------------------------------------- | ---------------------------------------------- |
| `models/User.ts`                       | MODIFY — add history schema + reset field      |
| `lib/monthly-reset.ts`                 | **NEW** — reset logic + archival               |
| `app/api/scan/route.ts`                | MODIFY — integrate monthly boundary check      |
| `app/api/user/carbon-history/route.ts` | **NEW** — history API                          |
| `components/carbon-trend-chart.tsx`    | **NEW** — trend visualization                  |
| `lib/rewards-system.ts`                | MODIFY — connect monthly bonus to archive flow |

### Why This Is Non-Trivial

- Month boundary detection must handle edge cases: user inactive for 3+ months, timezone differences, first-of-month scans
- The archive-then-reset must be atomic — a crash between archive and reset would corrupt data
- The monthly bonus calculation interacts with the point confirmation system (confirmed vs. unconfirmed)
- Trend analytics require aggregation math over variable-length history arrays
- Must not break existing sustainability tier calculations that currently read `monthlyCarbon`

---

## Issue #3 — Implement Unified Session Management Hook with JWT Lifecycle

### Type: `Refactor to Use a Better Pattern (Extracting a Reusable Hook)`

### Context

Authentication state is currently scattered across multiple patterns:

- **Client state**: `auth-provider.tsx` stores user in React state + `localStorage` ([L55-L59](components/auth-provider.tsx)), with no session expiry or revalidation
- **Server state**: Google auth route sets an HttpOnly JWT cookie ([`app/api/auth/google/route.ts` L69-L76](app/api/auth/google/route.ts)), but email signin ([`app/api/auth/signin/route.ts`](app/api/auth/signin/route.ts)) and signup ([`app/api/auth/signup/route.ts`](app/api/auth/signup/route.ts)) do not issue any token
- **Middleware**: Reads `auth_token` cookie to inject `x-user-email` header ([`middleware.ts` L7-L19](middleware.ts))
- **Logout**: Only clears `localStorage` ([L196-L199](components/auth-provider.tsx)) — never clears the HttpOnly cookie

This means the auth flow has no unified session contract, and email/password users have a broken server-side session.

> **Related**: This feature depends on the JWT cookie auth infrastructure being properly established.
> The current "JWT Cookie Auth & Session Management" PR implements signin/signup JWT issuance,
> session validation, and logout; Issue `#3` builds a `useSession` hook abstraction on top of those endpoints.

### Proposed Implementation

**1. `useSession` Hook (`hooks/use-session.ts` — NEW)**

Extract a reusable hook that encapsulates the entire session lifecycle:

```typescript
export function useSession() {
  return {
    user: User | null,
    status: 'loading' | 'authenticated' | 'unauthenticated',
    login: (email, password) => Promise<boolean>,
    signup: (name, email, password) => Promise<boolean>,
    loginWithGoogle: () => Promise<boolean>,
    logout: () => Promise<void>,
    refreshSession: () => Promise<void>, // Re-validate with server
  };
}
```

Key behaviors:

- On mount, check for existing cookie by calling a new `/api/auth/me` endpoint (not just reading localStorage)
- `refreshSession()` re-validates the JWT server-side and updates the client user object
- `logout()` calls `/api/auth/logout` to clear the HttpOnly cookie AND clears localStorage
- Handles token expiry gracefully (7-day JWT from [`lib/auth.ts` L11](lib/auth.ts))

**2. Server Endpoints**

- **`app/api/auth/me/route.ts` (NEW)**: GET — reads `auth_token` cookie, verifies JWT, returns current user from DB
- **`app/api/auth/logout/route.ts` (NEW)**: POST — clears the `auth_token` cookie
- **MODIFY `app/api/auth/signin/route.ts`**: Add JWT generation + cookie setting (matching Google route pattern)
- **MODIFY `app/api/auth/signup/route.ts`**: Same — issue JWT on successful registration

**3. Refactor `auth-provider.tsx`**

Replace the inline auth logic with the `useSession` hook. The provider becomes a thin wrapper:

```typescript
export function AuthProvider({ children }) {
  const session = useSession();
  return <AuthContext.Provider value={session}>{children}</AuthContext.Provider>;
}
```

All 6 existing consumers (`dashboard-layout.tsx`, scan page, rewards page, etc.) continue working via `useAuth()` with zero changes.

### Files Touched

| File                           | Action                                |
| ------------------------------ | ------------------------------------- |
| `hooks/use-session.ts`         | **NEW** — reusable session hook       |
| `app/api/auth/me/route.ts`     | **NEW** — session validation endpoint |
| `app/api/auth/logout/route.ts` | **NEW** — cookie clearing endpoint    |
| `app/api/auth/signin/route.ts` | MODIFY — add JWT issuance             |
| `app/api/auth/signup/route.ts` | MODIFY — add JWT issuance             |
| `components/auth-provider.tsx` | MODIFY — delegate to `useSession`     |

### Why This Is Non-Trivial

- Must unify 3 different auth flows (Google, email signin, email signup) into one session contract
- The HttpOnly cookie cannot be read by client JS — requires a server round-trip for validation
- Token refresh and expiry handling requires careful race condition management (multiple tabs, concurrent requests)
- The refactor must maintain backward compatibility — all existing `useAuth()` consumers must work without changes
- Security implications: must ensure logout actually invalidates the session server-side

---

## Issue #4 — Add Comprehensive Test Suite for the Rewards System Module

### Type: `Comprehensive Test Suite for a Complex Module`

### Context

The rewards system ([`lib/rewards-system.ts`](lib/rewards-system.ts) — 529 lines) is the most complex pure-logic module in the codebase. It contains 8 exported functions, 16 achievements with conditional logic, a dual-point system (confirmed/unconfirmed), level thresholds, a reward shop, and point confirmation with time-based delays. The project has Jest configured ([`jest.config.ts`](jest.config.ts)) and a `__tests__` directory exists under `components/`, but there are **no tests** for the rewards logic.

### Proposed Implementation

**`lib/__tests__/rewards-system.test.ts` (NEW)** — Comprehensive test file organized by function:

**1. `calculateScanPoints()` — 12+ test cases**

- First scan returns `FIRST_SCAN` (50) points + confirmed status
- Non-first scan returns `DAILY_SCAN` (10) points
- Carbon < 0.5kg adds `VERY_LOW_CARBON_SCAN` (25) bonus
- Carbon between 0.5-1.0kg adds `LOW_CARBON_SCAN` (15) bonus
- Carbon ≥ 1.0kg adds no carbon bonus
- Streak bonus scales correctly: streak=5 → 25 points
- Streak bonus caps at 100 (streak=25 and streak=50 both cap)
- Weekly milestone fires exactly at streak=7 (not 6, not 8)
- `isConfirmed` is true when `userTotalScans >= 3`
- `isConfirmed` is true for first scan regardless of total
- Combined scenario: first scan + very low carbon + streak=7 → verify exact total
- Edge case: all zero inputs

**2. `calculateLevel()` — 8+ test cases**

- 0 points → level 1, progress 0%
- 100 points → level 2, verify `nextLevelPoints`
- Points exactly on threshold boundary (e.g., 1000 → level 5)
- Points between thresholds → verify fractional progress
- Max level (75000+ points) → level 15, progress 100%
- Points just below max threshold
- Negative points edge case (defensive)
- Large value beyond max → still level 15

**3. `checkAchievements()` — 10+ test cases**

- User with 0 scans → no achievements
- User with 1 scan → earns `first_scan` only
- User with 50 scans → earns `first_scan`, `ten_scans`, `fifty_scans`
- Already earned achievements are not re-awarded
- Carbon-based achievements: `monthlyCarbon=15, totalScanned=12` → earns `eco_warrior` + `carbon_conscious`
- `low_carbon_specialist`: user with 25 scans under 1kg CO2
- Streak achievements: `streakCount=30` → earns both `week_streak` and `month_streak`
- Level-based achievements: `level=10` → earns `level_5` and `level_10`
- `early_adopter` is always false (placeholder)
- Combined scenario: power user who qualifies for 8+ achievements simultaneously

**4. `confirmPendingPoints()` — 6+ test cases**

- No transactions → 0 confirmed
- All transactions already confirmed → 0 newly confirmed
- Transaction older than 7 days → gets confirmed
- Transaction exactly at 7-day boundary
- Transaction at 6 days 23 hours → not yet confirmed
- Mix of confirmed, unconfirmed, and redeemed transactions
- Verify `confirmedAt` is set on newly confirmed transactions

**5. `calculateMonthlyBonus()` — 5+ test cases**

- Carbon < 20 with 10+ scans → ECO_CHAMPION (1000 points)
- Carbon < 30 with 5+ scans → MONTHLY_GOAL (500 points)
- Carbon < 20 but only 3 scans → null (insufficient scans)
- Carbon = 35 → null
- Boundary: carbon exactly 20 → falls to monthly goal tier, not eco champion

**6. `getSustainabilityTier()` — 6+ test cases**

- Test each tier boundary: Platinum, Gold, Silver, Bronze, Beginner
- Verify scan count minimums are enforced (e.g., < 10kg but only 5 scans → not Platinum)

**7. `getUserPointsSummary()` — 4+ test cases**

- Verify total = confirmed + unconfirmed
- `pendingConfirmation` counts only transactions within 24 hours of confirmation
- Empty transaction history
- User with only redeemed transactions

### Files Touched

| File                                   | Action                   |
| -------------------------------------- | ------------------------ |
| `lib/__tests__/rewards-system.test.ts` | **NEW** — 50+ test cases |

### Why This Is Non-Trivial

- The rewards system has complex interdependencies (points feed into levels, levels unlock achievements, achievements grant more points)
- Time-based confirmation logic requires mocking `Date.now()` with precision
- Achievement conditions access deeply nested user properties (`user.scans[].carbonEstimate`)
- Edge cases around boundary values (exactly-on-threshold) require careful mathematical reasoning
- The `unknown` typing throughout the module means tests must also validate runtime behavior with malformed inputs

---

## Issue #5 — Integrate Climatiq API for Real Carbon Footprint Data with Local Calculator Fallback

### Type: `Third-Party Library Integration with Proper Error Handling and Fallbacks`

### Context

The current carbon calculator ([`lib/carbon-calculator.ts`](lib/carbon-calculator.ts)) uses a hardcoded lookup table of ~35 products with static `kgCO2PerKg` values. It uses a 3-tier matching strategy: exact match → keyword match → category guess → 2.5kg fallback. The `confidence` field (`high`/`medium`/`low`) is returned but most scans hit the fallback, making all carbon data effectively a rough guess. The scan API ([`app/api/scan/route.ts` L57-L61](app/api/scan/route.ts)) already receives product name + brand from OpenFoodFacts, which could be sent to a real emissions API.

### Proposed Implementation

**1. Climatiq Integration Module (`lib/carbon-api.ts` — NEW)**

```typescript
interface CarbonAPIResult {
  carbonFootprint: number;
  source: 'climatiq' | 'local-calculator';
  confidence: 'high' | 'medium' | 'low';
  category: string;
  calculation: string;
  apiResponseTimeMs?: number;
}

export async function getCarbonEstimate(
  productName: string,
  brand?: string,
  categories?: string[]
): Promise<CarbonAPIResult> { ... }
```

Implementation:

- First, attempt Climatiq API call with product name + category mapping
- **Timeout**: 3-second hard timeout — scan UX cannot block on a slow third-party
- **Circuit breaker**: After 3 consecutive failures, skip API calls for 5 minutes and go straight to fallback
- **Fallback**: On any error/timeout, call the existing `calculateCarbonFootprint()` from `lib/carbon-calculator.ts` and return with `source: 'local-calculator'`
- **Caching**: Cache API results by product barcode in a simple in-memory LRU (barcode → result, 1000 entries max) to avoid redundant API calls for re-scanned products

**2. Circuit Breaker Pattern (`lib/circuit-breaker.ts` — NEW)**

A reusable utility (not Climatiq-specific):

```typescript
export class CircuitBreaker {
  constructor(options: { failureThreshold: number; resetTimeoutMs: number });
  async execute<T>(fn: () => Promise<T>): Promise<T>; // throws CircuitOpenError
  get state(): 'closed' | 'open' | 'half-open';
}
```

**3. Modify Scan API (`app/api/scan/route.ts`)**

Replace the direct `calculateCarbonFootprint()` call at [L57-L61](app/api/scan/route.ts) with:

```typescript
const carbonData = await getCarbonEstimate(
  product.product_name,
  product.brands,
  categories
);
```

The response already includes `confidence` and `calculation` fields, so the rest of the scan API response structure remains unchanged. Add `carbonSource: carbonData.source` to the response so the UI can show whether data came from the API or local estimate.

**4. Environment Configuration**

Add `CLIMATIQ_API_KEY` to `.env.example` with documentation. The feature must work without the key (pure fallback mode) — no breaking change for contributors who don't have API access.

**5. Carbon Source Indicator (`components/scan-result-badge.tsx` — NEW)**

A small badge/pill shown on scan results: "🌐 API Verified" (green) vs "📊 Estimated" (yellow) based on `carbonSource`, so users understand the data quality.

### Files Touched

| File                               | Action                                       |
| ---------------------------------- | -------------------------------------------- |
| `lib/carbon-api.ts`                | **NEW** — Climatiq integration with fallback |
| `lib/circuit-breaker.ts`           | **NEW** — reusable circuit breaker pattern   |
| `app/api/scan/route.ts`            | MODIFY — swap carbon calculation call        |
| `components/scan-result-badge.tsx` | **NEW** — source indicator UI                |
| `.env.example`                     | MODIFY — add `CLIMATIQ_API_KEY`              |
| `lib/carbon-calculator.ts`         | UNCHANGED — preserved as fallback            |

### Why This Is Non-Trivial

- The circuit breaker pattern requires careful state machine logic (closed → open → half-open transitions)
- The 3-second timeout must not break the scan API's response contract — partial failures must be invisible to the user
- Caching by barcode interacts with the OpenFoodFacts data already fetched in the scan route — must avoid redundant network calls
- The fallback must produce identical response shapes so downstream code (rewards calculation, UI rendering) doesn't need branching
- API key absence must be gracefully handled — the entire feature must degrade to the existing local calculator with zero errors

---

## Summary

| Issue                     | Category                                 | Core Modules Affected                       | Complexity                     |
| ------------------------- | ---------------------------------------- | ------------------------------------------- | ------------------------------ |
| #1 — Scan Streak System   | New feature (multiple interacting parts) | scan API, rewards, User model, dashboard UI | High — 5 subsystems            |
| #2 — Monthly Carbon Cycle | New feature (multiple interacting parts) | scan API, User model, rewards, analytics    | High — atomic reset + archive  |
| #3 — Unified Session Hook | Refactor (extracting reusable hook)      | auth-provider, 3 auth routes, middleware    | High — 3 auth flows unified    |
| #4 — Rewards Test Suite   | Comprehensive test suite                 | rewards-system.ts (529 lines, 8 functions)  | High — 50+ test cases          |
| #5 — Climatiq Carbon API  | Third-party integration with fallbacks   | scan API, carbon-calculator, new modules    | High — circuit breaker + cache |
