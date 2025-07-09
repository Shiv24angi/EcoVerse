"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncLeaderboardDelete = exports.syncLeaderboardUpdate = exports.syncLeaderboardCreate = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const mongo_1 = require("./utils/mongo");
const collectionPath = "leaderboard/{docId}";
// Firestore → MongoDB: Create
exports.syncLeaderboardCreate = (0, firestore_1.onDocumentCreated)(collectionPath, async (event) => {
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
// Firestore → MongoDB: Update
exports.syncLeaderboardUpdate = (0, firestore_1.onDocumentUpdated)(collectionPath, async (event) => {
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
// Firestore → MongoDB: Delete
exports.syncLeaderboardDelete = (0, firestore_1.onDocumentDeleted)(collectionPath, async (event) => {
    const docId = event.params.docId;
    const db = await (0, mongo_1.connectToMongo)();
    const mongo = db.collection("leaderboard");
    await mongo.deleteOne({ firebaseId: docId });
    console.log(`❌ Firestore → MongoDB: Deleted ${docId}`);
});
//# sourceMappingURL=firestoreSync.js.map