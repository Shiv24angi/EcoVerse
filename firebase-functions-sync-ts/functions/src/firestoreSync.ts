 
import { onDocumentCreated, onDocumentUpdated, onDocumentDeleted } from "firebase-functions/v2/firestore";
import { connectToMongo } from "./utils/mongo";

const collectionPath = "leaderboard/{docId}";

// Firestore → MongoDB: Create
export const syncLeaderboardCreate = onDocumentCreated(collectionPath, async (event) => {
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

// Firestore → MongoDB: Update
export const syncLeaderboardUpdate = onDocumentUpdated(collectionPath, async (event) => {
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

// Firestore → MongoDB: Delete
export const syncLeaderboardDelete = onDocumentDeleted(collectionPath, async (event) => {
  const docId = event.params.docId;

  const db = await connectToMongo();
  const mongo = db.collection("leaderboard");

  await mongo.deleteOne({ firebaseId: docId });

  console.warn(`❌ Firestore → MongoDB: Deleted ${docId}`);
});
