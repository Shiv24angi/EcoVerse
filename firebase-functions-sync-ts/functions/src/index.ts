import { onUserCreated, onUserDeleted } from "firebase-functions/v2/auth";
import {
  onDocumentCreated,
  onDocumentUpdated,
  onDocumentDeleted
} from "firebase-functions/v2/firestore";
import { connectToMongo } from "./utils/mongo";

const leaderboardPath = "leaderboard/{docId}";

// AUTH: onCreate
export const handleUserSignup = onUserCreated(async (event) => {
  const user = event.data;
  const db = await connectToMongo();
  const users = db.collection("users");

  await users.insertOne({
    uid: user.uid,
    email: user.email || null,
    displayName: user.displayName || null,
    photoURL: user.photoURL || null,
    createdAt: new Date(),
  });

  console.warn(`✅ Synced new user ${user.uid}`);
});

// AUTH: onDelete
export const handleUserDeletion = onUserDeleted(async (event) => {
  const user = event.data;
  const db = await connectToMongo();
  const users = db.collection("users");

  await users.deleteOne({ uid: user.uid });
  console.warn(`🗑️ Deleted user ${user.uid}`);
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
