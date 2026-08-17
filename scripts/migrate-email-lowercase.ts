/* eslint-disable no-console */
import dbConnect from '../lib/mongodb';
import User, { IAchievement, IUserChallengeRecord } from '../models/User';
import { normalizeEmail } from '../lib/normalize-email';

type UserData = Record<string, unknown>;

export type MonthlyStatsEntry = {
  carbon?: number;
  scans?: number;
  points?: number;
};
export type MonthlyStatsMap = Record<string, MonthlyStatsEntry>;

export function mergeMonthlyStats(
  existing?: MonthlyStatsMap,
  incomingList?: MonthlyStatsMap[]
): MonthlyStatsMap {
  const result: MonthlyStatsMap = {};
  const allMaps = [existing, ...(incomingList || [])];

  for (const stats of allMaps) {
    if (!stats || typeof stats !== 'object') continue;
    for (const [monthKey, entry] of Object.entries(stats)) {
      if (!entry || typeof entry !== 'object') continue;
      if (!result[monthKey]) {
        result[monthKey] = { carbon: 0, scans: 0, points: 0 };
      }
      result[monthKey].carbon =
        (Number(result[monthKey].carbon) || 0) + (Number(entry.carbon) || 0);
      result[monthKey].scans =
        (Number(result[monthKey].scans) || 0) + (Number(entry.scans) || 0);
      result[monthKey].points =
        (Number(result[monthKey].points) || 0) + (Number(entry.points) || 0);
    }
  }

  return result;
}

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
  merged.monthlyStats = mergeMonthlyStats(
    primary.monthlyStats as MonthlyStatsMap,
    duplicates.map((d) => d.monthlyStats as MonthlyStatsMap)
  );
  merged.hasAdvancedAnalytics =
    Boolean(primary.hasAdvancedAnalytics) ||
    duplicates.some((d) => Boolean(d.hasAdvancedAnalytics));

  if (
    (!merged.password || String(merged.password).trim() === '') &&
    duplicates.some((d) => d.password && String(d.password).trim() !== '')
  ) {
    const dupWithPass = duplicates.find(
      (d) => d.password && String(d.password).trim() !== ''
    );
    if (dupWithPass) {
      merged.password = dupWithPass.password;
    }
  }

  if (
    (!merged.firebaseUid || String(merged.firebaseUid).trim() === '') &&
    duplicates.some((d) => d.firebaseUid && String(d.firebaseUid).trim() !== '')
  ) {
    const dupWithUid = duplicates.find(
      (d) => d.firebaseUid && String(d.firebaseUid).trim() !== ''
    );
    if (dupWithUid) {
      merged.firebaseUid = dupWithUid.firebaseUid;
    }
  }

  if (
    (!merged.authProvider || merged.authProvider === 'email') &&
    duplicates.some((d) => d.authProvider && d.authProvider !== 'email')
  ) {
    const dupWithProvider = duplicates.find(
      (d) => d.authProvider && d.authProvider !== 'email'
    );
    if (dupWithProvider) {
      merged.authProvider = dupWithProvider.authProvider;
    }
  } else if (
    (!merged.authProvider || merged.authProvider === 'email') &&
    merged.firebaseUid &&
    !merged.password
  ) {
    merged.authProvider = 'google';
  }

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
    if (!canonical) {
      console.warn(
        `[Invalid Email Warning] User ID ${user._id} has an invalid or empty canonical email. Skipping automatic migration for manual remediation.`
      );
      continue;
    }
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
      const groupUserIds = users.map((u) => u._id);

      let session: Record<string, unknown> | null = null;
      try {
        if (
          !User.db ||
          typeof (User.db as { startSession?: unknown }).startSession !==
            'function'
        ) {
          throw new Error(
            'Database session support is required for collision resolution'
          );
        }

        session = (await (
          User.db as { startSession: () => Promise<Record<string, unknown>> }
        ).startSession()) as Record<string, unknown>;

        if (!session || typeof session.startTransaction !== 'function') {
          throw new Error(
            'Transaction support is required for collision resolution'
          );
        }

        (session.startTransaction as () => void)();
      } catch (initErr) {
        if (session && typeof session.endSession === 'function') {
          await (session.endSession as () => Promise<void>)().catch(() => {});
        }
        throw initErr;
      }

      try {
        const query = User.find({ _id: { $in: groupUserIds } });
        const freshUsers = (
          typeof (query as { session?: (s: unknown) => unknown }).session ===
          'function'
            ? await (
                query as { session: (s: unknown) => Promise<typeof allUsers> }
              ).session(session)
            : await query
        ) as typeof allUsers;

        if (!freshUsers || freshUsers.length <= 1) {
          if (typeof session.commitTransaction === 'function') {
            await (session.commitTransaction as () => Promise<void>)();
          }
          continue;
        }

        freshUsers.sort((a, b) => {
          const aExact = a.email === canonical ? 0 : 1;
          const bExact = b.email === canonical ? 0 : 1;
          if (aExact !== bExact) return aExact - bExact;

          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeA - timeB;
        });

        const passwords = Array.from(
          new Set(
            freshUsers
              .map((u) => u.password)
              .filter((p) => typeof p === 'string' && p.trim() !== '')
          )
        );
        const firebaseUids = Array.from(
          new Set(
            freshUsers
              .map((u) => u.firebaseUid)
              .filter((uid) => typeof uid === 'string' && uid.trim() !== '')
          )
        );

        if (passwords.length > 1 || firebaseUids.length > 1) {
          console.warn(
            `[Credential Conflict Warning] User collision group for canonical email "${canonical}" contains conflicting authentication credentials (password or firebaseUid). Skipping automatic migration for manual remediation.`
          );
          if (typeof session.commitTransaction === 'function') {
            await (session.commitTransaction as () => Promise<void>)();
          }
          continue;
        }

        const primary = freshUsers[0];
        const duplicates = freshUsers.slice(1);

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
        delete consolidated._id;

        const dupIds = duplicates.map((d) => d._id);

        await User.updateOne(
          { _id: primary._id },
          { $set: consolidated },
          { session }
        );
        await User.deleteMany({ _id: { $in: dupIds } }, { session });
        if (typeof session.commitTransaction === 'function') {
          await (session.commitTransaction as () => Promise<void>)();
        }

        resolvedCollisionsCount++;
        removedDuplicatesCount += duplicates.length;
        updatedCount++;
      } catch (err) {
        if (session && typeof session.abortTransaction === 'function') {
          await (session.abortTransaction as () => Promise<void>)().catch(
            () => {}
          );
        }
        throw err;
      } finally {
        if (session && typeof session.endSession === 'function') {
          await (session.endSession as () => Promise<void>)().catch(() => {});
        }
      }
    }
  }

  try {
    console.log(
      'Syncing User model indexes with case-insensitive collation...'
    );
    await User.syncIndexes();
  } catch (err) {
    console.error('Index sync failed:', err);
    throw err;
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
