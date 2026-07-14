import mongoose, { Document, Model } from 'mongoose';

export interface IScan {
  productName: string;
  carbonEstimate: number;
  category: string;
  confidence: 'high' | 'medium' | 'low';
  barcode: string;
  date: Date;
  source?: string;
}

export interface IRewardTransaction {
  _id?: mongoose.Types.ObjectId;
  type: 'earned' | 'redeemed';
  points: number;
  pointsType: 'confirmed' | 'unconfirmed';
  reason: string;
  description: string;
  date: Date;
  confirmedAt?: Date | null;
}

export interface IAchievement {
  id: string;
  name: string;
  description: string;
  earnedAt: Date;
  points: number;
}

export interface IMonthlyCarbonArchive {
  month: number; // 0-11
  year: number;
  carbonSpent: number;
  carbonGoal: number;
  totalScans: number;
  pointsEarned: number;
  bonusAwarded: boolean;
  bonusPoints: number;
  archivedAt: Date;
}

export interface IPurchasedItem {
  itemId: string;
  name: string;
  cost: number;
  category: 'badge' | 'feature' | 'cosmetic';
  purchasedAt: Date;
  active: boolean;
}

export interface IUser extends Document {
  name: string;
  username: string | null;
  full_name: string | null;
  email: string;
  password: string | null;
  monthlyCarbon: number;
  monthlyCarbonGoal: number | null;
  totalScanned: number;
  joinedAt: string;
  authProvider: 'email' | 'google';
  firebaseUid?: string;
  // Scan tracking
  scans: IScan[];
  lastScanDate: Date | null;
  streakCount: number;
  bestStreakCount: number;
  // Rewards system - Enhanced with dual point system
  rewardPoints: number;
  confirmedPoints: number;
  unconfirmedPoints: number;
  totalPointsEarned: number;
  rewardTransactions: IRewardTransaction[];
  achievements: IAchievement[];
  level: number;
  nextLevelPoints: number;
  // Purchased items from reward shop
  purchasedItems: IPurchasedItem[];
  // Special features
  streakProtectors: number;
  doublePointsDays: number;
  hasAdvancedAnalytics: boolean;
  customAvatar: string | null;
  activeBadges: string[];
  // Monthly bonuses tracking
  lastMonthlyBonusCheck: Date | null;
  monthlyBonusesEarned: number;
  // Monthly carbon cycle — reset + archive history (Issue #122)
  lastMonthlyReset: Date | null;
  monthlyCarbonHistory: IMonthlyCarbonArchive[];
  // Avatar selection and customization foundation (Issue #33)
  avatarId: string;
  avatarCustomization: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const ScanSchema = new mongoose.Schema({
  productName: { type: String, required: true },
  carbonEstimate: { type: Number, required: true },
  category: { type: String, required: true },
  confidence: { type: String, enum: ['high', 'medium', 'low'], required: true },
  barcode: {
    type: String,
    required: true,
    validate: {
      validator: (v: string) => /^\d{8,14}$/.test(v),
      message: 'Barcode must be 8-14 digits',
    },
  },
  date: { type: Date, default: Date.now },
  source: { type: String, default: 'Local Calculator' },
});

const RewardTransactionSchema = new mongoose.Schema({
  type: { type: String, enum: ['earned', 'redeemed'], required: true },
  points: { type: Number, required: true },
  pointsType: {
    type: String,
    enum: ['confirmed', 'unconfirmed'],
    default: 'unconfirmed',
  },
  reason: { type: String, required: true }, // 'scan', 'streak', 'low_carbon', 'first_scan', etc.
  description: { type: String, required: true },
  date: { type: Date, default: Date.now },
  confirmedAt: { type: Date, default: null }, // When unconfirmed points were confirmed
});

const AchievementSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  earnedAt: { type: Date, default: Date.now },
  points: { type: Number, required: true },
});

const MonthlyCarbonArchiveSchema = new mongoose.Schema(
  {
    month: { type: Number, required: true, min: 0, max: 11 },
    year: { type: Number, required: true },
    carbonSpent: { type: Number, required: true, default: 0 },
    carbonGoal: { type: Number, required: true, default: 40 },
    totalScans: { type: Number, required: true, default: 0 },
    pointsEarned: { type: Number, required: true, default: 0 },
    bonusAwarded: { type: Boolean, default: false },
    bonusPoints: { type: Number, default: 0 },
    archivedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const PurchasedItemSchema = new mongoose.Schema({
  itemId: { type: String, required: true },
  name: { type: String, required: true },
  cost: { type: Number, required: true },
  category: {
    type: String,
    enum: ['badge', 'feature', 'cosmetic'],
    required: true,
  },
  purchasedAt: { type: Date, default: Date.now },
  active: { type: Boolean, default: true }, // For items that can be activated/deactivated
});

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    username: { type: String, default: null },
    full_name: { type: String, default: null },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: false, default: null },
    monthlyCarbon: { type: Number, default: 0 },
    monthlyCarbonGoal: { type: Number, default: null },
    totalScanned: { type: Number, default: 0 },
    joinedAt: { type: String, default: () => new Date().toISOString() },
    authProvider: { type: String, enum: ['email', 'google'], default: 'email' },
    firebaseUid: { type: String, sparse: true },
    scans: [ScanSchema],
    lastScanDate: { type: Date, default: null },
    streakCount: { type: Number, default: 0 },
    bestStreakCount: { type: Number, default: 0 },
    rewardPoints: { type: Number, default: 0 },
    confirmedPoints: { type: Number, default: 0 },
    unconfirmedPoints: { type: Number, default: 0 },
    totalPointsEarned: { type: Number, default: 0 },
    rewardTransactions: [RewardTransactionSchema],
    achievements: [AchievementSchema],
    level: { type: Number, default: 1 },
    nextLevelPoints: { type: Number, default: 100 },
    purchasedItems: [PurchasedItemSchema],
    streakProtectors: { type: Number, default: 0 },
    doublePointsDays: { type: Number, default: 0 },
    hasAdvancedAnalytics: { type: Boolean, default: false },
    customAvatar: { type: String, default: null },
    activeBadges: [{ type: String }],
    lastMonthlyBonusCheck: { type: Date, default: null },
    monthlyBonusesEarned: { type: Number, default: 0 },
    // Monthly carbon cycle (Issue #122)
    lastMonthlyReset: { type: Date, default: null },
    monthlyCarbonHistory: { type: [MonthlyCarbonArchiveSchema], default: [] },
    avatarId: { type: String, default: 'avatar-1' },
    avatarCustomization: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
  }
);

// Index for auth token verification: look up by firebaseUid directly.
UserSchema.index({ firebaseUid: 1 }, { sparse: true });

// Index for sync query path: look up by email with firebaseUid population.
UserSchema.index({ email: 1, firebaseUid: 1 });

// Virtual for sustainability level
UserSchema.virtual('sustainabilityLevel').get(function () {
  if (this.monthlyCarbon < 20) return 'Excellent';
  if (this.monthlyCarbon < 35) return 'Good';
  if (this.monthlyCarbon < 50) return 'Average';
  return 'Needs Improvement';
});

// Virtual for sustainability tier
UserSchema.virtual('sustainabilityTier').get(function () {
  if (this.monthlyCarbon < 10 && this.totalScanned >= 15) return 'Platinum';
  if (this.monthlyCarbon < 20 && this.totalScanned >= 10) return 'Gold';
  if (this.monthlyCarbon < 30 && this.totalScanned >= 5) return 'Silver';
  if (this.monthlyCarbon < 40) return 'Bronze';
  return 'Beginner';
});

// In Next.js dev mode, the Node.js process (and Mongoose connection) stays
// alive across hot-reloads, but the module code re-runs. The standard
// `mongoose.models.User || mongoose.model(...)` guard would return the old
// cached model with the stale schema. We force a clean re-registration in
// development using the official mongoose.deleteModel() API.
if (process.env.NODE_ENV !== 'production') {
  try {
    mongoose.deleteModel('User');
  } catch (_) {
    // Model not registered yet — first load, nothing to delete
  }
}

// Cast to Model<IUser> to collapse the union type produced by the ternary.
// Without this, TypeScript raises TS2349 ("not callable") on every
// .findOne() / .create() / .find() call across all API routes.
const User: Model<IUser> =
  (mongoose.models.User as Model<IUser>) ||
  mongoose.model<IUser>('User', UserSchema);

export default User;
