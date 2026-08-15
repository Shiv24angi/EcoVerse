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
  month: number;
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

export interface IUserChallengeRecord {
  challengeId: string;
  name?: string;
  icon?: string;
  category?: string;
  completedAt: Date;
  pointsEarned: number;
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
  lowCarbonScans: number;
  joinedAt: string;
  authProvider: 'email' | 'google';
  firebaseUid?: string;
  scans: IScan[];
  lastScanDate: Date | null;
  streakCount: number;
  bestStreakCount: number;
  rewardPoints: number;
  confirmedPoints: number;
  unconfirmedPoints: number;
  totalPointsEarned: number;
  rewardTransactions: IRewardTransaction[];
  achievements: IAchievement[];
  level: number;
  nextLevelPoints: number;
  purchasedItems: IPurchasedItem[];
  streakProtectors: number;
  doublePointsDays: number;
  hasAdvancedAnalytics: boolean;
  customAvatar: string | null;
  activeBadges: string[];
  lastMonthlyBonusCheck: Date | null;
  monthlyBonusesEarned: number;
  lastMonthlyReset: Date | null;

  monthlyStats: Record<
    string,
    { carbon: number; scans: number; points: number }
  >;
  monthlyCarbonHistory: IMonthlyCarbonArchive[];
  avatarId: string;
  avatarCustomization: Record<string, unknown>;
  // Sustainability Challenges (Issue #332)
  completedChallenges: IUserChallengeRecord[];
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
  reason: { type: String, required: true },
  description: { type: String, required: true },
  date: { type: Date, default: Date.now },
  confirmedAt: { type: Date, default: null },
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
  active: { type: Boolean, default: true },
});

const UserChallengeRecordSchema = new mongoose.Schema({
  challengeId: { type: String, required: true },
  name: { type: String },
  icon: { type: String },
  category: { type: String },
  completedAt: { type: Date, default: Date.now },
  pointsEarned: { type: Number, required: true },
});

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    username: { type: String, default: null },
    full_name: { type: String, default: null },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: false, default: null },
    monthlyCarbon: { type: Number, default: 0 },
    monthlyCarbonGoal: { type: Number, default: null },
    totalScanned: { type: Number, default: 0 },
    lowCarbonScans: { type: Number, default: 0 },
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
    lastMonthlyReset: { type: Date, default: null },
    monthlyStats: { type: mongoose.Schema.Types.Mixed, default: {} },
    monthlyCarbonHistory: { type: [MonthlyCarbonArchiveSchema], default: [] },
    avatarId: { type: String, default: 'avatar-1' },
    avatarCustomization: { type: mongoose.Schema.Types.Mixed, default: {} },
    // Sustainability Challenges (Issue #332)
    completedChallenges: { type: [UserChallengeRecordSchema], default: [] },
  },
  {
    timestamps: true,
  }
);
UserSchema.index(
  { email: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } }
);
UserSchema.index({ firebaseUid: 1 }, { sparse: true });
UserSchema.index({ email: 1, firebaseUid: 1 });
UserSchema.path('unconfirmedPoints').validate(
  (value: number) => value >= 0,
  'unconfirmedPoints must not be negative',
  'validate-unconfirmed-points'
);

UserSchema.path('confirmedPoints').validate(
  (value: number) => value >= 0,
  'confirmedPoints must not be negative',
  'validate-confirmed-points'
);
UserSchema.index({ email: 1, 'scans.date': 1 });
UserSchema.index({ email: 1, 'scans.category': 1 });
function hydrateMissingFields(doc: any) {
  if (!doc) return;
  const defaults: Record<string, unknown> = {
    scans: [],
    rewardTransactions: [],
    achievements: [],
    purchasedItems: [],
    monthlyCarbonHistory: [],
    completedChallenges: [],
    activeBadges: [],
    streakProtectors: 0,
    doublePointsDays: 0,
    hasAdvancedAnalytics: false,
    customAvatar: null,
    avatarId: 'avatar-1',
    avatarCustomization: {},
    monthlyCarbonGoal: null,
    lastMonthlyReset: null,
    lastMonthlyBonusCheck: null,
    monthlyStats: {},
    monthlyBonusesEarned: 0,
    bestStreakCount: 0,
    nextLevelPoints: 100,
    level: 1,
    confirmedPoints: 0,
    unconfirmedPoints: 0,
    totalPointsEarned: 0,
    rewardPoints: 0,
    streakCount: 0,
    totalScanned: 0,
    monthlyCarbon: 0,
    lowCarbonScans: 0,
    lastScanDate: null,
  };
  for (const [key, value] of Object.entries(defaults)) {
    if (typeof doc.isSelected === 'function' && !doc.isSelected(key)) {
      continue;
    }
    if (doc[key] === undefined || doc[key] === null) {
      doc[key] = value;
    }
  }
}

UserSchema.post('findOne', hydrateMissingFields);
UserSchema.post('find', function (docs) {
  if (Array.isArray(docs)) docs.forEach(hydrateMissingFields);
});
UserSchema.post('findOneAndUpdate', hydrateMissingFields);
UserSchema.virtual('sustainabilityLevel').get(function () {
  if (this.monthlyCarbon < 20) return 'Excellent';
  if (this.monthlyCarbon < 35) return 'Good';
  if (this.monthlyCarbon < 50) return 'Average';
  return 'Needs Improvement';
});
UserSchema.virtual('sustainabilityTier').get(function () {
  if (this.monthlyCarbon < 10 && this.totalScanned >= 15) return 'Platinum';
  if (this.monthlyCarbon < 20 && this.totalScanned >= 10) return 'Gold';
  if (this.monthlyCarbon < 30 && this.totalScanned >= 5) return 'Silver';
  if (this.monthlyCarbon < 40) return 'Bronze';
  return 'Beginner';
});
if (process.env.NODE_ENV !== 'production') {
  try {
    mongoose.deleteModel('User');
  } catch (_) {}
}
const User: Model<IUser> =
  (mongoose.models.User as Model<IUser>) ||
  mongoose.model<IUser>('User', UserSchema);

export default User;
