import dbConnect from '../lib/mongodb';
import User from '../models/User';
import { normalizeEmail } from '../lib/normalize-email';

async function run() {
  await dbConnect();

  const allUsers = await User.find({}, { _id: 1, email: 1 });
  console.log(`Scanning ${allUsers.length} user records...`);

  const canonicalMap = new Map<string, string[]>();

  for (const user of allUsers) {
    if (!user.email) continue;
    const canonical = normalizeEmail(user.email);
    const list = canonicalMap.get(canonical) || [];
    list.push(user._id.toString());
    canonicalMap.set(canonical, list);
  }

  let updatedCount = 0;
  let collisionCount = 0;

  for (const user of allUsers) {
    if (!user.email) continue;
    const canonical = normalizeEmail(user.email);
    const matchingIds = canonicalMap.get(canonical) || [];
    if (matchingIds.length > 1) {
      collisionCount++;
      console.warn(
        `[Collision Warning] User ID ${user._id} collides on canonical email with ${matchingIds.length - 1} other record(s). Skipping automatic migration for this record.`
      );
      continue;
    }

    if (user.email !== canonical) {
      await User.updateOne({ _id: user._id }, { $set: { email: canonical } });
      updatedCount++;
    }
  }

  console.log(
    `Email migration complete. Total scanned: ${allUsers.length}, Updated: ${updatedCount}, Collisions flagged: ${collisionCount}`
  );
  process.exit(0);
}

run().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
