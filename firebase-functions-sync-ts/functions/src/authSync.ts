import * as functions from "firebase-functions";
import { connectToMongo } from "./utils/mongo";

export const handleUserSignup = functions.auth.user().onCreate(async (user) => {
  try {
    const db = await connectToMongo();
    const collection = db.collection("users");

    const existingUser = await collection.findOne({
      $or: [
        { firebaseUid: user.uid },
        { email: user.email || "" },
      ],
    });

    if (existingUser) {
      if (!existingUser.firebaseUid && user.uid) {
        await collection.updateOne(
          { _id: existingUser._id },
          { $set: { firebaseUid: user.uid } }
        );
        console.warn(`🔄 Linked existing user ${user.email} to firebaseUid ${user.uid}`);
      } else {
        console.warn(`⏭️ User ${user.uid} already exists, skipping sync`);
      }
      return;
    }

    await collection.insertOne({
      firebaseUid: user.uid,
      email: user.email || null,
      name: user.displayName || user.email?.split("@")[0] || "User",
      authProvider: "google",
      createdAt: new Date(),
      monthlyCarbon: 0,
      totalScanned: 0,
      streakCount: 0,
      bestStreakCount: 0,
      rewardPoints: 0,
      confirmedPoints: 0,
      unconfirmedPoints: 0,
      totalPointsEarned: 0,
      level: 1,
      joinedAt: new Date().toISOString(),
    });

    console.warn(`✅ Synced new user ${user.uid} to MongoDB`);
  } catch (error) {
    if ((error as any)?.code === 11000) {
      console.warn(`⏭️ Duplicate user ${user.uid} (race condition), skipping`);
      return;
    }
    console.error("❌ Failed to sync user:", error);
    throw error;
  }
});

export const handleUserDeletion = functions.auth.user().onDelete(async (user) => {
  try {
    const db = await connectToMongo();
    const collection = db.collection("users");

    const result = await collection.deleteOne({ firebaseUid: user.uid });

    if (result.deletedCount > 0) {
      console.warn(`🗑️ Removed user ${user.uid} from MongoDB`);
    } else {
      console.warn(`⚠️ User ${user.uid} not found in MongoDB for deletion`);
    }
  } catch (error) {
    console.error("❌ Failed to delete user:", error);
    throw error;
  }
});
