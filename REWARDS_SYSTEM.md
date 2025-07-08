# EcoTest Rewards System Documentation

## Overview

The EcoTest app now features a comprehensive rewards and gamification system that motivates users to maintain sustainable shopping habits and track their carbon footprint. The system includes points, levels, achievements, and a reward shop.

## Rewards System Features

### 🎯 Point System

Users earn points through various activities:

- **First Scan**: 50 points
- **Daily Scan**: 10 points
- **Low Carbon Product** (<1kg CO2): 15 points
- **Very Low Carbon Product** (<0.5kg CO2): 25 points
- **Streak Bonus**: 5 points per day (up to 100 points)
- **Weekly Goal**: 100 points (for 7-day streak)
- **Monthly Goal**: 500 points (carbon under 30kg)
- **Eco Champion Goal**: 1000 points (carbon under 20kg)
- **Level Up**: 200 points

### 🌟 Level System

15 levels with increasing point requirements:
- Level 1: 0 points
- Level 2: 100 points
- Level 3: 250 points
- Level 4: 500 points
- Level 5: 1,000 points
- Level 6: 2,000 points
- Level 7: 3,500 points
- Level 8: 5,500 points
- Level 9: 8,000 points
- Level 10: 12,000 points
- Level 11: 18,000 points
- Level 12: 25,000 points
- Level 13: 35,000 points
- Level 14: 50,000 points
- Level 15: 75,000 points (Max Level)

### 🏆 Achievement System

17 different achievements to unlock:

#### Scanning Achievements
- **First Steps**: Scan your first product (50 pts)
- **Getting Started**: Scan 10 products (100 pts)
- **Scanner Pro**: Scan 50 products (250 pts)
- **Scan Master**: Scan 100 products (500 pts)
- **Scan Legend**: Scan 500 products (1,500 pts)

#### Streak Achievements
- **Week Warrior**: 7-day streak (150 pts)
- **Consistency King**: 30-day streak (1,000 pts)
- **Streak Master**: 100-day streak (3,000 pts)

#### Sustainability Achievements
- **Carbon Conscious**: Monthly carbon under 30kg (150 pts)
- **Eco Warrior**: Monthly carbon under 20kg (300 pts)
- **Zero Waste Hero**: Monthly carbon under 10kg (500 pts)
- **Low Carbon Specialist**: Scan 25 products <1kg CO2 (400 pts)

#### Level Achievements
- **Rising Star**: Reach Level 5 (500 pts)
- **Sustainability Champion**: Reach Level 10 (1,000 pts)
- **Eco Legend**: Reach Level 15 (2,500 pts)

#### Special Achievements
- **Points Millionaire**: Earn 10,000 total points (1,000 pts)
- **Early Adopter**: One of first 100 users (200 pts)

### 🛍️ Reward Shop

Users can spend points on various items:

#### Badges (Cosmetic)
- **Eco Hero Badge**: 500 points
- **Carbon Warrior Badge**: 1,000 points

#### Features (Functional)
- **Custom Avatar**: 300 points
- **Advanced Analytics**: 750 points
- **Streak Protector**: 200 points (protects streak for 1 missed day)
- **Double Points Day**: 400 points (2x points for one day)

### 🎖️ Sustainability Tiers

Users are categorized into tiers based on performance:

- **Platinum**: <10kg CO2 + 15+ scans - "Ultimate eco-warrior"
- **Gold**: <20kg CO2 + 10+ scans - "Exceptional sustainability"
- **Silver**: <30kg CO2 + 5+ scans - "Great progress"
- **Bronze**: <40kg CO2 - "Getting started"
- **Beginner**: 40kg+ CO2 - "Room for improvement"

## Database Schema

### User Model Enhancements

```typescript
// New fields added to User schema:
{
  // Rewards system
  rewardPoints: Number,
  totalPointsEarned: Number,
  rewardTransactions: [RewardTransactionSchema],
  achievements: [AchievementSchema],
  level: Number,
  nextLevelPoints: Number,
  
  // Purchased items from reward shop
  purchasedItems: [PurchasedItemSchema],
  
  // Special features
  streakProtectors: Number,
  doublePointsDays: Number,
  hasAdvancedAnalytics: Boolean,
  customAvatar: String,
  activeBadges: [String],
  
  // Monthly bonuses tracking
  lastMonthlyBonusCheck: Date,
  monthlyBonusesEarned: Number,
}
```

## API Endpoints

### Rewards API
- `GET /api/rewards?email=user@email.com` - Get user's complete rewards data
- `POST /api/rewards` - Purchase items from reward shop
- `GET /api/rewards/monthly-check?email=user@email.com` - Check monthly bonus status
- `POST /api/rewards/monthly-check` - Award monthly bonuses

### Enhanced Existing APIs
- `GET /api/leaderboard` - Now includes tier data and enhanced rewards info
- `GET /api/user/score` - Now includes comprehensive rewards data
- `POST /api/scan` - Enhanced with full rewards calculation

## User Interface

### Dashboard Enhancements
- **Rewards Cards**: Display points, level, achievements, and sustainability tier
- **Color-coded Levels**: Visual progression indicators
- **Quick Action Buttons**: Direct links to rewards shop and achievements

### Rewards Page
- **Tabbed Interface**: Overview, Achievements, Shop, History
- **Functional Shop**: Purchase items with points
- **Achievement Gallery**: Earned and available achievements
- **Transaction History**: Complete record of point activities

### Notifications
- **Reward Notifications**: Real-time feedback for earned points and achievements
- **Level Up Celebrations**: Special notifications for level progression
- **Monthly Bonus Alerts**: Notifications for monthly sustainability goals

## Gamification Strategy

### Engagement Mechanics
1. **Immediate Feedback**: Points awarded instantly for scans
2. **Progressive Rewards**: Increasing rewards for consistency
3. **Social Competition**: Leaderboard with tiers
4. **Long-term Goals**: Monthly bonuses and high-level achievements
5. **Practical Benefits**: Functional rewards that enhance app experience

### Behavioral Incentives
- **Daily Habits**: Streak bonuses encourage regular scanning
- **Quality Choices**: Bonus points for low-carbon products
- **Sustained Engagement**: Monthly goals reward long-term commitment
- **Community Building**: Tier system creates aspirational goals

## Implementation Details

### Point Calculation Logic
The system uses sophisticated logic to calculate points:
- Base points for all scans
- Bonus multipliers for low-carbon choices
- Streak bonuses with diminishing returns
- Special milestone bonuses
- Monthly performance bonuses

### Achievement Checking
Achievements are checked after each scan:
- Efficient condition evaluation
- Prevents duplicate awards
- Automatic point distribution
- Transaction logging

### Shop Functionality
The reward shop provides:
- Real-time point balance checking
- Duplicate purchase prevention
- Automatic feature activation
- Purchase history tracking

## Future Enhancements

### Planned Features
1. **Social Sharing**: Share achievements on social media
2. **Referral System**: Earn points for inviting friends
3. **Seasonal Events**: Special limited-time challenges
4. **Team Challenges**: Group goals for organizations
5. **Carbon Offset Integration**: Use points for real-world impact

### Potential Expansions
- **Physical Rewards**: Partnership with eco-friendly brands
- **Charity Donations**: Use points for environmental causes
- **Local Business Integration**: Discounts at sustainable stores
- **Educational Content**: Unlock sustainability tips and guides

## Testing & Validation

The rewards system has been thoroughly tested with:
- Point calculation accuracy
- Achievement trigger conditions
- Level progression logic
- Shop purchase flows
- Database integrity
- Performance optimization

## Conclusion

The EcoTest rewards system transforms carbon footprint tracking from a passive activity into an engaging, gamified experience. By combining immediate rewards, long-term progression, and practical benefits, the system motivates users to make more sustainable choices while building lasting habits.

The comprehensive point system, achievement framework, and reward shop create multiple engagement loops that keep users returning to the app and actively participating in their sustainability journey.
