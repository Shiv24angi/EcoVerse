import { onUserCreated, onUserDeleted } from "firebase-functions/v2/auth";
import { connectToMongo } from "./utils/mongo";

// Handle user signup
export const handleUserSignup = onUserCreated(async (event) => {
  const user = event.data;
  const db = await connectToMongo();
  const collection = db.collection("users");

  await collection.insertOne({
    uid: user.uid,
    email: user.email || null,
    displayName: user.displayName || null,
    photoURL: user.photoURL || null,
    createdAt: new Date(),
  });

  console.log(`✅ Synced new user ${user.uid} to MongoDB`);
});

// Handle user deletion
export const handleUserDeletion = onUserDeleted(async (event) => {
  const user = event.data;
  const db = await connectToMongo();
  const collection = db.collection("users");

  await collection.deleteOne({ uid: user.uid });

  console.log(`🗑️ Removed user ${user.uid} from MongoDB`);
});
