import * as functions from "firebase-functions";
import {
  onDocumentCreated,
  onDocumentUpdated,
  onDocumentDeleted
} from "firebase-functions/v2/firestore";
import { connectToMongo } from "./utils/mongo";

const leaderboardPath = "leaderboard/{docId}";

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

    console.warn(`✅ Synced new user ${user.uid}`);
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
      console.warn(`🗑️ Deleted user ${user.uid}`);
    } else {
      console.warn(`⚠️ User ${user.uid} not found for deletion`);
    }
  } catch (error) {
    console.error("❌ Failed to delete user:", error);
    throw error;
  }
});

// FIRESTORE: onCreate
export const syncLeaderboardCreate = onDocumentCreated(leaderboardPath, async (event) => {
  const docId = event.params.docId;
  const data = event.data;

  if (!data) {
    console.warn(`⚠️ No data found for created doc ${docId}`);
    return;
  }

  const db = await connectToMongo();
  const mongo = db.collection("leaderboard");

  await mongo.insertOne({
    firebaseId: docId,
    ...data,
  });

  console.warn(`📥 Firestore → MongoDB: Created ${docId}`);
});

// FIRESTORE: onUpdate
export const syncLeaderboardUpdate = onDocumentUpdated(leaderboardPath, async (event) => {
  const docId = event.params.docId;
  const newData = event.data?.after;

  if (!newData) {
    console.warn(`⚠️ No data found for updated doc ${docId}`);
    return;
  }

  const db = await connectToMongo();
  const mongo = db.collection("leaderboard");

  await mongo.updateOne({ firebaseId: docId }, { $set: newData });

  console.warn(`🔁 Firestore → MongoDB: Updated ${docId}`);
});

// FIRESTORE: onDelete
export const syncLeaderboardDelete = onDocumentDeleted(leaderboardPath, async (event) => {
  const docId = event.params.docId;

  const db = await connectToMongo();
  const mongo = db.collection("leaderboard");

  await mongo.deleteOne({ firebaseId: docId });

  console.warn(`❌ Firestore → MongoDB: Deleted ${docId}`);
});
