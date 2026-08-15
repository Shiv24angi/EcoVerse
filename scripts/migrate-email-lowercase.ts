/* eslint-disable no-console */
import dbConnect from '../lib/mongodb';
import User, { IAchievement, IUserChallengeRecord } from '../models/User';
import { normalizeEmail } from '../lib/normalize-email';

type UserData = Record<string, unknown>;

export function mergeAchievements(
  existing: Partial<IAchievement>[],
  incoming: Partial<IAchievement>[]
): Partial<IAchievement>[] {
  const map = new Map<string, Partial<IAchievement>>();
  for (const item of [...existing, ...incoming]) {
    if (!item) continue;
    const id = item.id;
    if (id && !map.has(id)) {
      map.set(id, item);
    }
  }
  return Array.from(map.values());
}

export function mergeChallenges(
  existing: Partial<IUserChallengeRecord>[],
  incoming: Partial<IUserChallengeRecord>[]
): Partial<IUserChallengeRecord>[] {
  const map = new Map<string, Partial<IUserChallengeRecord>>();
  for (const item of [...existing, ...incoming]) {
    if (!item) continue;
    const id = item.challengeId;
    if (id && !map.has(id)) {
      map.set(id, item);
    }
  }
  return Array.from(map.values());
}

export function consolidateUserData(
  primary: UserData,
  duplicates: UserData[]
): UserData {
  const merged: UserData = { ...primary };

  merged.monthlyCarbon =
    (Number(merged.monthlyCarbon) || 0) +
    duplicates.reduce((acc, d) => acc + (Number(d.monthlyCarbon) || 0), 0);
  merged.totalScanned =
    (Number(merged.totalScanned) || 0) +
    duplicates.reduce((acc, d) => acc + (Number(d.totalScanned) || 0), 0);
  merged.lowCarbonScans =
    (Number(merged.lowCarbonScans) || 0) +
    duplicates.reduce((acc, d) => acc + (Number(d.lowCarbonScans) || 0), 0);
  merged.rewardPoints =
    (Number(merged.rewardPoints) || 0) +
    duplicates.reduce((acc, d) => acc + (Number(d.rewardPoints) || 0), 0);
  merged.confirmedPoints =
    (Number(merged.confirmedPoints) || 0) +
    duplicates.reduce((acc, d) => acc + (Number(d.confirmedPoints) || 0), 0);
  merged.unconfirmedPoints =
    (Number(merged.unconfirmedPoints) || 0) +
    duplicates.reduce((acc, d) => acc + (Number(d.unconfirmedPoints) || 0), 0);
  merged.totalPointsEarned =
    (Number(merged.totalPointsEarned) || 0) +
    duplicates.reduce((acc, d) => acc + (Number(d.totalPointsEarned) || 0), 0);
  merged.streakProtectors =
    (Number(merged.streakProtectors) || 0) +
    duplicates.reduce((acc, d) => acc + (Number(d.streakProtectors) || 0), 0);
  merged.doublePointsDays =
    (Number(merged.doublePointsDays) || 0) +
    duplicates.reduce((acc, d) => acc + (Number(d.doublePointsDays) || 0), 0);
  merged.monthlyBonusesEarned =
    (Number(merged.monthlyBonusesEarned) || 0) +
    duplicates.reduce(
      (acc, d) => acc + (Number(d.monthlyBonusesEarned) || 0),
      0
    );

  merged.streakCount = Math.max(
    Number(merged.streakCount) || 0,
    ...duplicates.map((d) => Number(d.streakCount) || 0)
  );
  merged.bestStreakCount = Math.max(
    Number(merged.bestStreakCount) || 0,
    ...duplicates.map((d) => Number(d.bestStreakCount) || 0)
  );
  merged.level = Math.max(
    Number(merged.level) || 1,
    ...duplicates.map((d) => Number(d.level) || 1)
  );

  merged.scans = [
    ...((merged.scans as unknown[]) || []),
    ...duplicates.flatMap((d) => (d.scans as unknown[]) || []),
  ];
  merged.rewardTransactions = [
    ...((merged.rewardTransactions as unknown[]) || []),
    ...duplicates.flatMap((d) => (d.rewardTransactions as unknown[]) || []),
  ];
  merged.achievements = mergeAchievements(
    (merged.achievements as Partial<IAchievement>[]) || [],
    duplicates.flatMap((d) => (d.achievements as Partial<IAchievement>[]) || [])
  );
  merged.purchasedItems = [
    ...((merged.purchasedItems as unknown[]) || []),
    ...duplicates.flatMap((d) => (d.purchasedItems as unknown[]) || []),
  ];
  merged.completedChallenges = mergeChallenges(
    (merged.completedChallenges as Partial<IUserChallengeRecord>[]) || [],
    duplicates.flatMap(
      (d) => (d.completedChallenges as Partial<IUserChallengeRecord>[]) || []
    )
  );
  merged.monthlyCarbonHistory = [
    ...((merged.monthlyCarbonHistory as unknown[]) || []),
    ...duplicates.flatMap((d) => (d.monthlyCarbonHistory as unknown[]) || []),
  ];
  merged.activeBadges = Array.from(
    new Set([
      ...((merged.activeBadges as string[]) || []),
      ...duplicates.flatMap((d) => (d.activeBadges as string[]) || []),
    ])
  );

  return merged;
}

export async function runMigration() {
  await dbConnect();

  const allUsers = await User.find({});
  console.log(`Scanning ${allUsers.length} user records...`);

  const groupsMap = new Map<string, typeof allUsers>();

  for (const user of allUsers) {
    if (!user.email) continue;
    const canonical = normalizeEmail(user.email);
    const list = groupsMap.get(canonical) || [];
    list.push(user);
    groupsMap.set(canonical, list);
  }

  let updatedCount = 0;
  let resolvedCollisionsCount = 0;
  let removedDuplicatesCount = 0;

  for (const [canonical, users] of groupsMap.entries()) {
    if (users.length === 1) {
      const user = users[0];
      if (user.email !== canonical) {
        await User.updateOne({ _id: user._id }, { $set: { email: canonical } });
        updatedCount++;
      }
    } else if (users.length > 1) {
      users.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeA - timeB;
      });

      const primary = users[0];
      const duplicates = users.slice(1);

      console.warn(
        `[Collision Resolution] Consolidating ${duplicates.length} duplicate user record(s) into primary user ID ${primary._id} for canonical email "${canonical}".`
      );

      const primaryObj = (
        typeof primary.toObject === 'function' ? primary.toObject() : primary
      ) as UserData;
      const dupObjs = duplicates.map((d) =>
        typeof d.toObject === 'function' ? d.toObject() : d
      ) as UserData[];

      const consolidated = consolidateUserData(primaryObj, dupObjs);

      consolidated.email = canonical;

      const dupIds = duplicates.map((d) => d._id);

      await User.updateOne({ _id: primary._id }, { $set: consolidated });
      await User.deleteMany({ _id: { $in: dupIds } });

      resolvedCollisionsCount++;
      removedDuplicatesCount += duplicates.length;
      updatedCount++;
    }
  }

  try {
    console.log(
      'Syncing User model indexes with case-insensitive collation...'
    );
    await User.syncIndexes();
  } catch (err) {
    console.warn('Index sync warning:', err);
  }

  console.log(
    `Email migration complete. Total scanned: ${allUsers.length}, Updated/Merged: ${updatedCount}, Collisions resolved: ${resolvedCollisionsCount}, Duplicates removed: ${removedDuplicatesCount}`
  );
}

if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error('Migration failed:', e);
      process.exit(1);
    });
}
