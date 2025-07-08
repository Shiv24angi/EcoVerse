import mongoose from "mongoose"

const ScanSchema = new mongoose.Schema({
  productName: { type: String, required: true },
  carbonEstimate: { type: Number, required: true },
  category: { type: String, required: true },
  confidence: { type: String, enum: ['high', 'medium', 'low'], required: true },
  barcode: { type: String, required: true },
  date: { type: Date, default: Date.now }
})

const RewardTransactionSchema = new mongoose.Schema({
  type: { type: String, enum: ['earned', 'redeemed'], required: true },
  points: { type: Number, required: true },
  pointsType: { type: String, enum: ['confirmed', 'unconfirmed'], default: 'unconfirmed' },
  reason: { type: String, required: true }, // 'scan', 'streak', 'low_carbon', 'first_scan', etc.
  description: { type: String, required: true },
  date: { type: Date, default: Date.now },
  confirmedAt: { type: Date, default: null } // When unconfirmed points were confirmed
})

const AchievementSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  earnedAt: { type: Date, default: Date.now },
  points: { type: Number, required: true }
})

const PurchasedItemSchema = new mongoose.Schema({
  itemId: { type: String, required: true },
  name: { type: String, required: true },
  cost: { type: Number, required: true },
  category: { type: String, enum: ['badge', 'feature', 'cosmetic'], required: true },
  purchasedAt: { type: Date, default: Date.now },
  active: { type: Boolean, default: true } // For items that can be activated/deactivated
})

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  monthlyCarbon: { type: Number, default: 0 },
  totalScanned: { type: Number, default: 0 },
  joinedAt: { type: String, default: () => new Date().toISOString() },
  authProvider: { type: String, enum: ['email', 'google'], default: 'email' },
  firebaseUid: { type: String, sparse: true },
  // Scan tracking
  scans: [ScanSchema],
  lastScanDate: { type: Date, default: null },
  streakCount: { type: Number, default: 0 },
  bestStreakCount: { type: Number, default: 0 },
  // Rewards system - Enhanced with dual point system
  rewardPoints: { type: Number, default: 0 }, // Legacy field - will be deprecated
  confirmedPoints: { type: Number, default: 0 }, // Points that are confirmed and can be redeemed
  unconfirmedPoints: { type: Number, default: 0 }, // Points pending confirmation
  totalPointsEarned: { type: Number, default: 0 }, // Total of both confirmed and unconfirmed
  rewardTransactions: [RewardTransactionSchema],
  achievements: [AchievementSchema],
  level: { type: Number, default: 1 },
  nextLevelPoints: { type: Number, default: 100 },
  // Purchased items from reward shop
  purchasedItems: [PurchasedItemSchema],
  // Special features
  streakProtectors: { type: Number, default: 0 }, // Number of streak protectors owned
  doublePointsDays: { type: Number, default: 0 }, // Number of double points days owned
  hasAdvancedAnalytics: { type: Boolean, default: false },
  customAvatar: { type: String, default: null }, // URL or identifier for custom avatar
  activeBadges: [{ type: String }], // Array of active badge IDs
  // Monthly bonuses tracking
  lastMonthlyBonusCheck: { type: Date, default: null },
  monthlyBonusesEarned: { type: Number, default: 0 },
}, {
  timestamps: true
})

// Virtual for sustainability level
UserSchema.virtual('sustainabilityLevel').get(function() {
  if (this.monthlyCarbon < 20) return 'Excellent'
  if (this.monthlyCarbon < 35) return 'Good'
  if (this.monthlyCarbon < 50) return 'Average'
  return 'Needs Improvement'
})

// Virtual for sustainability tier
UserSchema.virtual('sustainabilityTier').get(function() {
  if (this.monthlyCarbon < 10 && this.totalScanned >= 15) return 'Platinum'
  if (this.monthlyCarbon < 20 && this.totalScanned >= 10) return 'Gold'
  if (this.monthlyCarbon < 30 && this.totalScanned >= 5) return 'Silver'
  if (this.monthlyCarbon < 40) return 'Bronze'
  return 'Beginner'
})

export default mongoose.models.User || mongoose.model("User", UserSchema)

