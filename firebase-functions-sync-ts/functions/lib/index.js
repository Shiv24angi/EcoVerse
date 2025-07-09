"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncLeaderboardDelete = exports.syncLeaderboardUpdate = exports.syncLeaderboardCreate = exports.handleUserDeletion = exports.handleUserSignup = void 0;
const auth_1 = require("firebase-functions/v2/auth");
const firestore_1 = require("firebase-functions/v2/firestore");
const mongo_1 = require("./utils/mongo");
const leaderboardPath = "leaderboard/{docId}";
// AUTH: onCreate
exports.handleUserSignup = (0, auth_1.onUserCreated)(async (event) => {
    const user = event.data;
    const db = await (0, mongo_1.connectToMongo)();
    const users = db.collection("users");
    await users.insertOne({
        uid: user.uid,
        email: user.email || null,
        displayName: user.displayName || null,
        photoURL: user.photoURL || null,
        createdAt: new Date(),
    });
    console.log(`✅ Synced new user ${user.uid}`);
});
// AUTH: onDelete
exports.handleUserDeletion = (0, auth_1.onUserDeleted)(async (event) => {
    const user = event.data;
    const db = await (0, mongo_1.connectToMongo)();
    const users = db.collection("users");
    await users.deleteOne({ uid: user.uid });
    console.log(`🗑️ Deleted user ${user.uid}`);
});
// FIRESTORE: onCreate
exports.syncLeaderboardCreate = (0, firestore_1.onDocumentCreated)(leaderboardPath, async (event) => {
    const docId = event.params.docId;
    const data = event.data;
    if (!data) {
        console.warn(`⚠️ No data found for created doc ${docId}`);
        return;
    }
    const db = await (0, mongo_1.connectToMongo)();
    const mongo = db.collection("leaderboard");
    await mongo.insertOne({
        firebaseId: docId,
        ...data,
    });
    console.log(`📥 Firestore → MongoDB: Created ${docId}`);
});
// FIRESTORE: onUpdate
exports.syncLeaderboardUpdate = (0, firestore_1.onDocumentUpdated)(leaderboardPath, async (event) => {
    const docId = event.params.docId;
    const newData = event.data?.after;
    if (!newData) {
        console.warn(`⚠️ No data found for updated doc ${docId}`);
        return;
    }
    const db = await (0, mongo_1.connectToMongo)();
    const mongo = db.collection("leaderboard");
    await mongo.updateOne({ firebaseId: docId }, { $set: newData });
    console.log(`🔁 Firestore → MongoDB: Updated ${docId}`);
});
// FIRESTORE: onDelete
exports.syncLeaderboardDelete = (0, firestore_1.onDocumentDeleted)(leaderboardPath, async (event) => {
    const docId = event.params.docId;
    const db = await (0, mongo_1.connectToMongo)();
    const mongo = db.collection("leaderboard");
    await mongo.deleteOne({ firebaseId: docId });
    console.log(`❌ Firestore → MongoDB: Deleted ${docId}`);
});
//# sourceMappingURL=index.js.map