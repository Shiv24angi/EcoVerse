import dbConnect from '../lib/mongodb';
import User from '../models/User';

async function run() {
  await dbConnect();
  const users = await User.find({ email: /[A-Z]/ }, { email: 1 });
  console.log(`Found ${users.length} users with uppercase emails`);
  for (const u of users) {
    const lower = u.email.toLowerCase();
    await User.updateOne({ _id: u._id }, { $set: { email: lower } });
    console.log(`  ${u.email} → ${lower}`);
  }
  console.log('Done email migration.');
  process.exit(0);
}

run().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
