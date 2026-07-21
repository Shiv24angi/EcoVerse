# EcoVerse Sustainability Metrics API Reference

Welcome to the EcoVerse Sustainability Metrics API Reference. This documentation provides complete technical details for developers and third-party integrators working with EcoVerse's sustainability metrics, carbon footprint calculations, eco-score tracking, packaging recyclability, and rewards engine endpoints.

---

## Table of Contents

- [Overview](#overview)
- [Authentication & Headers](#authentication--headers)
- [Error Handling & Status Codes](#error-handling--status-codes)
- [Endpoints](#endpoints)
  - [1. Barcode Sustainability Scan (`POST /api/scan`)](#1-barcode-sustainability-scan-post-apiscan)
  - [2. Sustainability Analytics (`GET /api/user/analytics`)](#2-sustainability-analytics-get-apiuseranalytics)
  - [3. User Eco-Score Metrics (`GET /api/user/score`)](#3-user-eco-score-metrics-get-apiuserscore)
  - [4. Manual Sustainability Metric Log (`POST /api/user/score`)](#4-manual-sustainability-metric-log-post-apiuserscore)
  - [5. Update Monthly Carbon Goal (`PATCH /api/user/score`)](#5-update-monthly-carbon-goal-patch-apiuserscore)
  - [6. Packaging Recyclability Report (`POST /api/user-packaging`)](#6-packaging-recyclability-report-post-apiuser-packaging)
  - [7. Sustainability Leaderboard (`GET /api/leaderboard`)](#7-sustainability-leaderboard-get-apileaderboard)
  - [8. Eco-Points & Rewards (`GET /api/rewards`)](#8-eco-points--rewards-get-apirewards)
  - [9. Redeem Eco-Reward (`POST /api/rewards`)](#9-redeem-eco-reward-post-apirewards)
  - [10. Monthly Sustainability Bonus Check (`POST /api/rewards/monthly-check`)](#10-monthly-sustainability-bonus-check-post-apirewardsmonthly-check)
- [Sustainability Tiers Reference](#sustainability-tiers-reference)

---

## Overview

EcoVerse tracks product-level carbon footprints, user monthly carbon consumption against targets, packaging recyclability insights, sustainability tiers, eco-streaks, and eco-points rewards.

All endpoints run on Next.js App Router API routes (`force-dynamic`) and interface with MongoDB for persistence and external climate data services (e.g., Climatiq AI API & Open Food Facts).

---

## Authentication & Headers

Protected API routes require authentication via the `auth_token` session cookie.

| Cookie / Header Name | Location | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `auth_token` | HTTP Cookie | **Yes** (Authenticated routes) | Valid JWT authentication token issued upon sign-in | `Cookie: auth_token=eyJhbGci...` |
| `Content-Type` | Header | Optional (Required for POST/PATCH) | MIME type of request body | `application/json` |
| `x-user-email` | Header | Internal / Server-Injected | Injected by Next.js middleware upon validating `auth_token` | `x-user-email: user@example.com` |

> **Security Note:** `x-user-email` is a **server-side injected header**. Next.js middleware automatically strips any client-supplied `x-user-email` header from incoming requests to prevent identity spoofing, verifies the `auth_token` cookie, and injects the verified email address into internal request headers for downstream API handlers. Callers must pass the `auth_token` cookie when invoking authenticated endpoints.

---

## Error Handling & Status Codes

The API uses standard HTTP response codes to indicate success or failure:

| HTTP Code                   | Name                    | Description                                                 |
| :-------------------------- | :---------------------- | :---------------------------------------------------------- |
| `200 OK`                    | Success                 | Request completed successfully.                             |
| `400 Bad Request`           | Client Error            | Missing or invalid parameters/payload.                      |
| `401 Unauthorized`          | Authentication Error    | Missing or invalid `auth_token` cookie or session.          |
| `404 Not Found`             | Resource Missing        | User, product, or shop item was not found.                  |
| `409 Conflict`              | Concurrency / Duplicate | Product already scanned or concurrent transaction conflict. |
| `500 Internal Server Error` | Server Error            | Database failure or external API call error.                |

### Standard Error Response Format

```json
{
  "error": "Detailed error message explanation"
}
```

---

## Endpoints

### 1. Barcode Sustainability Scan (`POST /api/scan`)

Performs carbon footprint analysis and packaging recyclability inference for a product via its barcode. Calculates earned eco-points, updates active streaks, and checks sustainability tier progression.

- **URL:** `/api/scan`
- **Method:** `POST`
- **Authentication Required:** Yes (`auth_token` cookie)

#### Request Headers

```http
Content-Type: application/json
Cookie: auth_token=<your_jwt_token>
```

#### Request Body

| Field     | Type     | Required | Description                  | Constraints                |
| :-------- | :------- | :------- | :--------------------------- | :------------------------- |
| `barcode` | `string` | **Yes**  | Product barcode digit string | 8 to 14 numeric characters |

##### Sample Request

```bash
curl -X POST http://localhost:3000/api/scan \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=<your_jwt_token>" \
  -d '{
    "barcode": "737628064502"
  }'
```

#### Sample Response (`200 OK`)

```json
{
  "productName": "Oat Milk Unsweetened 1L",
  "brand": "Oatly",
  "carbonEstimate": "0.90",
  "category": "Plant-based Milk",
  "confidence": "high",
  "calculation": "Climatiq Emission Factor v3",
  "source": "Climatiq API",
  "ingredients": "Oat base (water, oats 10%), rapeseed oil, calcium carbonate...",
  "image": "https://images.openfoodfacts.org/images/products/737/628/064/502/front_en.jpg",
  "packaging": {
    "recyclable": true,
    "material": "Tetra Pak / Paperboard",
    "recommendation": "Rinse out container and flatten before putting in paper recycling bin."
  },
  "rewards": {
    "pointsEarned": 15,
    "pointsType": "confirmed",
    "reasons": ["Low carbon footprint scan", "Daily streak bonus"],
    "pointsSummary": {
      "confirmedPoints": 150,
      "unconfirmedPoints": 0,
      "totalPoints": 150
    },
    "level": 3,
    "leveledUp": false,
    "newAchievements": [],
    "streakCount": 5,
    "bestStreakCount": 10,
    "streakProtectorUsed": false,
    "streakProtectorsUsed": 0,
    "streakBroken": false,
    "monthlyBonus": 0,
    "sustainabilityTier": "Gold",
    "pendingConfirmationInfo": null
  }
}
```

#### Potential Error Responses

- **`400 Bad Request`**: `{ "error": "Barcode missing" }` or `{ "error": "Invalid barcode format" }`
- **`401 Unauthorized`**: `{ "error": "Unauthorized" }`
- **`404 Not Found`**: `{ "error": "Product not found" }` or `{ "error": "User not found" }`
- **`409 Conflict`**: `{ "error": "This product has already been scanned." }`

---

### 2. Sustainability Analytics (`GET /api/user/analytics`)

Retrieves historical carbon trends, current month carbon consumption, category breakdown, weekly progress against carbon budget targets, and cumulative carbon saved.

- **URL:** `/api/user/analytics`
- **Method:** `GET`
- **Authentication Required:** Yes (`auth_token` cookie)

#### Request Headers

```http
Cookie: auth_token=<your_jwt_token>
```

##### Sample Request

```bash
curl -X GET http://localhost:3000/api/user/analytics \
  -H "Cookie: auth_token=<your_jwt_token>"
```

#### Sample Response (`200 OK`)

```json
{
  "monthlyData": [
    {
      "month": "May",
      "year": 2026,
      "carbon": 22.4,
      "scanned": 14,
      "goal": 40,
      "isCurrentMonth": false,
      "bonusAwarded": true
    },
    {
      "month": "Jun",
      "year": 2026,
      "carbon": 18.5,
      "scanned": 19,
      "goal": 40,
      "isCurrentMonth": false,
      "bonusAwarded": true
    },
    {
      "month": "Jul",
      "year": 2026,
      "carbon": 12.35,
      "scanned": 8,
      "goal": 40,
      "isCurrentMonth": true
    }
  ],
  "categoryBreakdown": [
    {
      "category": "Plant-based Milk",
      "carbon": 4.5,
      "percentage": 36
    },
    {
      "category": "Produce",
      "carbon": 3.2,
      "percentage": 26
    },
    {
      "category": "Beverages",
      "carbon": 2.65,
      "percentage": 21
    }
  ],
  "weeklyProgress": [
    {
      "week": "Week 1",
      "carbon": 4.1,
      "target": 10.0
    },
    {
      "week": "Week 2",
      "carbon": 5.2,
      "target": 10.0
    },
    {
      "week": "Week 3",
      "carbon": 3.05,
      "target": 10.0
    },
    {
      "week": "Week 4",
      "carbon": 0.0,
      "target": 10.0
    }
  ],
  "currentMonth": {
    "carbon": 12.35,
    "scanned": 8,
    "goal": 40,
    "month": "Jul",
    "year": 2026
  },
  "totalCarbonSaved": 66.75
}
```

#### Potential Error Responses

- **`401 Unauthorized`**: `{ "error": "Unauthorized" }`
- **`404 Not Found`**: `{ "error": "User not found" }`

---

### 3. User Eco-Score Metrics (`GET /api/user/score`)

Returns overall user sustainability statistics, current month carbon total, personal carbon goal, level progress, streak counters, and reward metrics.

- **URL:** `/api/user/score`
- **Method:** `GET`
- **Authentication Required:** Yes (`auth_token` cookie)

#### Request Headers

```http
Cookie: auth_token=<your_jwt_token>
```

##### Sample Request

```bash
curl -X GET http://localhost:3000/api/user/score \
  -H "Cookie: auth_token=<your_jwt_token>"
```

#### Sample Response (`200 OK`)

```json
{
  "monthlyCarbon": 12.35,
  "monthlyCarbonGoal": 40,
  "totalScanned": 41,
  "streakCount": 7,
  "bestStreakCount": 14,
  "scans": [
    {
      "productName": "Oat Milk Unsweetened 1L",
      "carbonEstimate": 0.9,
      "category": "Plant-based Milk",
      "confidence": "high",
      "barcode": "737628064502",
      "date": "2026-07-21T10:00:00.000Z",
      "source": "Climatiq API"
    }
  ],
  "sustainabilityLevel": "Excellent",
  "rewards": {
    "points": 350,
    "totalPointsEarned": 520,
    "level": 4,
    "nextLevelPoints": 600,
    "progressToNext": 86,
    "recentTransactions": [],
    "achievements": [
      {
        "id": "first_scan",
        "name": "First Step",
        "description": "Scanned your first eco-product",
        "points": 50,
        "earnedAt": "2026-06-01T12:00:00.000Z"
      }
    ],
    "achievementCount": 1,
    "tier": "Gold",
    "tierColor": "#EAB308",
    "tierDescription": "Low carbon footprint (<20kg CO2) & 10+ scans",
    "activeBadges": ["eco_warrior"],
    "purchasedItems": [],
    "specialFeatures": {
      "streakProtectors": 1,
      "doublePointsDays": 0,
      "hasAdvancedAnalytics": false,
      "customAvatar": null
    },
    "monthlyBonusesEarned": 2,
    "lastMonthlyBonusCheck": "2026-07-01T00:00:00.000Z"
  }
}
```

#### Potential Error Responses

- **`401 Unauthorized`**: `{ "error": "Unauthorized" }`
- **`404 Not Found`**: `{ "error": "User not found" }`

---

### 4. Manual Sustainability Metric Log (`POST /api/user/score`)

Allows manual submission of product sustainability information and carbon footprint estimation without scanning a barcode.

- **URL:** `/api/user/score`
- **Method:** `POST`
- **Authentication Required:** Yes (`auth_token` cookie)

#### Request Body

| Field            | Type     | Required | Description                | Constraints                |
| :--------------- | :------- | :------- | :------------------------- | :------------------------- |
| `productName`    | `string` | **Yes**  | Product or item title      | Non-empty string           |
| `carbonEstimate` | `number` | **Yes**  | Estimated CO₂ impact in kg | Non-negative finite number |

##### Sample Request

```bash
curl -X POST http://localhost:3000/api/user/score \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=<your_jwt_token>" \
  -d '{
    "productName": "Local Organic Apples (1kg)",
    "carbonEstimate": 0.4
  }'
```

#### Sample Response (`200 OK`)

```json
{
  "newScore": 12.75,
  "totalScanned": 42,
  "pointsEarned": 10,
  "level": 4,
  "leveledUp": false
}
```

#### Potential Error Responses

- **`400 Bad Request`**: `{ "error": "Missing productName or carbonEstimate" }` or `{ "error": "carbonEstimate must be a non-negative number" }`
- **`401 Unauthorized`**: `{ "error": "Unauthorized" }`
- **`404 Not Found`**: `{ "error": "User not found" }`
- **`409 Conflict`**: `{ "error": "Scan could not be recorded due to concurrent updates. Please try again." }`

---

### 5. Update Monthly Carbon Goal (`PATCH /api/user/score`)

Sets or clears the user's monthly carbon goal/budget (in kg CO₂). Setting to `null` resets the account goal to the default app target (40 kg CO₂).

- **URL:** `/api/user/score`
- **Method:** `PATCH`
- **Authentication Required:** Yes (`auth_token` cookie)

#### Request Body

| Field               | Type               | Required | Description                             | Constraints                                |
| :------------------ | :----------------- | :------- | :-------------------------------------- | :----------------------------------------- |
| `monthlyCarbonGoal` | `number` \| `null` | **Yes**  | Targeted monthly carbon limit in kg CO₂ | Positive number (`1` to `10000`) or `null` |

##### Sample Request

```bash
curl -X PATCH http://localhost:3000/api/user/score \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=<your_jwt_token>" \
  -d '{
    "monthlyCarbonGoal": 30
  }'
```

#### Sample Response (`200 OK`)

```json
{
  "monthlyCarbonGoal": 30
}
```

#### Potential Error Responses

- **`400 Bad Request`**: `{ "error": "monthlyCarbonGoal must be a positive number (kg CO2), or null to clear it" }`
- **`401 Unauthorized`**: `{ "error": "Unauthorized" }`
- **`404 Not Found`**: `{ "error": "User not found" }`

---

### 6. Packaging Recyclability Report (`POST /api/user-packaging`)

Submits user feedback regarding product packaging material to refine EcoVerse recyclability datasets.

- **URL:** `/api/user-packaging`
- **Method:** `POST`
- **Authentication Required:** Yes (`auth_token` cookie)

#### Request Body

| Field      | Type     | Required | Description                                                          |
| :--------- | :------- | :------- | :------------------------------------------------------------------- |
| `barcode`  | `string` | **Yes**  | Product barcode string                                               |
| `material` | `string` | **Yes**  | Material type (e.g. `Glass`, `PET Plastic`, `Aluminum`, `Cardboard`) |

##### Sample Request

```bash
curl -X POST http://localhost:3000/api/user-packaging \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=<your_jwt_token>" \
  -d '{
    "barcode": "737628064502",
    "material": "Tetra Pak"
  }'
```

#### Sample Response (`200 OK`)

```json
{
  "success": true
}
```

#### Potential Error Responses

- **`400 Bad Request`**: `{ "error": "Missing data" }`
- **`401 Unauthorized`**: `{ "error": "Unauthorized" }`

---

### 7. Sustainability Leaderboard (`GET /api/leaderboard`)

Fetches paginated user rankings based on earned eco-points, total scans, carbon metrics, streaks, and global system statistics.

- **URL:** `/api/leaderboard`
- **Method:** `GET`
- **Authentication Required:** Optional (provide `userId` parameter to retrieve authenticated user rank)

#### Query Parameters

| Parameter | Type     | Required | Description                                  | Default |
| :-------- | :------- | :------- | :------------------------------------------- | :------ |
| `limit`   | `number` | No       | Number of users to return per page (Max 100) | `20`    |
| `cursor`  | `string` | No       | MongoDB ObjectId cursor for pagination       | `null`  |
| `userId`  | `string` | No       | Current user ID to compute exact global rank | `null`  |

##### Sample Request

```bash
curl -X GET "http://localhost:3000/api/leaderboard?limit=10&userId=60d5ecb8b5c9c22b9c8b4567"
```

#### Sample Response (`200 OK`)

```json
{
  "leaderboard": [
    {
      "id": "60d5ecb8b5c9c22b9c8b4567",
      "name": "Alex Green",
      "avatarId": "avatar-3",
      "monthlyCarbon": 12.35,
      "totalScanned": 42,
      "change": "up",
      "joinedAt": "2026-01-15T08:30:00.000Z",
      "streakCount": 7,
      "lastScanDate": "2026-07-21T10:00:00.000Z",
      "rewardPoints": 350,
      "pointsSummary": {
        "confirmedPoints": 350,
        "unconfirmedPoints": 0,
        "totalPoints": 350
      },
      "totalPointsEarned": 520,
      "level": 4,
      "achievementCount": 3,
      "levelTier": "Intermediate",
      "activeBadges": ["eco_warrior"],
      "hasAdvancedFeatures": true
    }
  ],
  "nextCursor": "60d5ecb8b5c9c22b9c8b4568",
  "hasMore": true,
  "currentUserRank": 1,
  "stats": {
    "totalUsers": 1250,
    "averagePoints": 310,
    "averageLevel": "3.2",
    "totalPointsInSystem": 387500
  }
}
```

---

### 8. Eco-Points & Rewards (`GET /api/rewards`)

Fetches detailed user eco-points summary (confirmed vs. unconfirmed), point transaction history, unlocked achievements, and shop items available for redemption.

- **URL:** `/api/rewards`
- **Method:** `GET`
- **Authentication Required:** Yes (`auth_token` cookie)

#### Request Headers

```http
Cookie: auth_token=<your_jwt_token>
```

##### Sample Request

```bash
curl -X GET http://localhost:3000/api/rewards \
  -H "Cookie: auth_token=<your_jwt_token>"
```

#### Sample Response (`200 OK`)

```json
{
  "points": 350,
  "totalPointsEarned": 520,
  "level": 4,
  "pointsSummary": {
    "confirmedPoints": 350,
    "unconfirmedPoints": 0,
    "totalPoints": 350
  },
  "transactions": [
    {
      "id": "tx_101",
      "type": "earned",
      "points": 15,
      "pointsType": "confirmed",
      "reason": "scan",
      "description": "Scanned Oat Milk Unsweetened 1L",
      "date": "2026-07-21T10:00:00.000Z"
    }
  ],
  "achievements": [],
  "availableItems": [
    {
      "id": "streak_protector",
      "name": "Streak Protector",
      "description": "Prevents streak loss for 1 missed day",
      "cost": 100,
      "type": "consumable",
      "isPurchased": false
    }
  ]
}
```

---

### 9. Redeem Eco-Reward (`POST /api/rewards`)

Redeems user eco-points to purchase items from the Eco-Shop (e.g. streak protectors, double point boosts, custom profile avatars, advanced sustainability analytics).

- **URL:** `/api/rewards`
- **Method:** `POST`
- **Authentication Required:** Yes (`auth_token` cookie)

#### Request Body

| Field    | Type     | Required | Description                               |
| :------- | :------- | :------- | :---------------------------------------- |
| `itemId` | `string` | **Yes**  | Identifier of the reward item to purchase |

##### Sample Request

```bash
curl -X POST http://localhost:3000/api/rewards \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=<your_jwt_token>" \
  -d '{
    "itemId": "streak_protector"
  }'
```

#### Sample Response (`200 OK`)

```json
{
  "success": true,
  "message": "Purchased Streak Protector successfully!",
  "item": {
    "id": "streak_protector",
    "name": "Streak Protector",
    "cost": 100
  },
  "remainingPoints": 250
}
```

#### Potential Error Responses

- **`400 Bad Request`**: `{ "error": "Insufficient confirmed eco-points" }` or `{ "error": "Item already purchased" }`
- **`401 Unauthorized`**: `{ "error": "Unauthorized" }`
- **`404 Not Found`**: `{ "error": "Reward item not found" }`

---

### 10. Monthly Sustainability Bonus Check (`POST /api/rewards/monthly-check`)

Evaluates whether the user met their monthly carbon budget/goal for the preceding month and awards the monthly sustainability bonus points and badges if eligible.

- **URL:** `/api/rewards/monthly-check`
- **Method:** `POST`
- **Authentication Required:** Yes (`auth_token` cookie)

#### Request Headers

```http
Cookie: auth_token=<your_jwt_token>
```

##### Sample Request

```bash
curl -X POST http://localhost:3000/api/rewards/monthly-check \
  -H "Cookie: auth_token=<your_jwt_token>"
```

#### Sample Response (`200 OK`)

```json
{
  "processed": true,
  "bonusAwarded": true,
  "bonusPoints": 100,
  "message": "Congratulations! You kept monthly carbon below your goal and earned 100 bonus eco-points."
}
```

---

## Sustainability Tiers Reference

EcoVerse categorizes user sustainability levels into 5 tiers based on monthly carbon footprint (in kg CO₂) and total verified product scans:

| Tier         | Monthly Carbon Footprint | Minimum Scans | Description                                            |
| :----------- | :----------------------- | :------------ | :----------------------------------------------------- |
| **Platinum** | `< 10 kg CO₂`            | `15+ scans`   | Exceptional sustainable living leader.                 |
| **Gold**     | `< 20 kg CO₂`            | `10+ scans`   | Low carbon footprint with consistent eco-habits.       |
| **Silver**   | `< 30 kg CO₂`            | `5+ scans`    | Balanced carbon footprint with active product choices. |
| **Bronze**   | `< 40 kg CO₂`            | `0+ scans`    | On track within recommended standard budget.           |
| **Beginner** | `≥ 40 kg CO₂`            | `0+ scans`    | High footprint or initial onboarding phase.            |
