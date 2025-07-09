"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncLeaderboardDelete = exports.syncLeaderboardUpdate = exports.syncLeaderboardCreate = exports.handleUserDeletion = exports.handleUserSignup = void 0;
const functions = __importStar(require("firebase-functions"));
const mongo_1 = require("./utils/mongo");
// ✅ AUTH SYNC: User Signup
exports.handleUserSignup = functions
    .runWith({ timeoutSeconds: 30 })
    .auth
    .user()
    .onCreate(async (user) => {
    const db = await (0, mongo_1.connectToMongo)();
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
// ✅ AUTH SYNC: User Deletion
exports.handleUserDeletion = functions
    .runWith({ timeoutSeconds: 30 })
    .auth
    .user()
    .onDelete(async (user) => {
    const db = await (0, mongo_1.connectToMongo)();
    const collection = db.collection("users");
    await collection.deleteOne({ uid: user.uid });
    console.log(`🗑️ Removed user ${user.uid} from MongoDB`);
});
// ✅ FIRESTORE SYNC: Create
exports.syncLeaderboardCreate = functions
    .runWith({ timeoutSeconds: 30 })
    .firestore
    .document("leaderboard/{docId}")
    .onCreate(async (snapshot, context) => {
    const docId = context.params.docId;
    const data = snapshot.data();
    const db = await (0, mongo_1.connectToMongo)();
    const mongo = db.collection("leaderboard");
    await mongo.insertOne({
        firebaseId: docId,
        ...data,
    });
    console.log(`📥 Firestore → MongoDB: Created ${docId}`);
});
// ✅ FIRESTORE SYNC: Update
exports.syncLeaderboardUpdate = functions
    .runWith({ timeoutSeconds: 30 })
    .firestore
    .document("leaderboard/{docId}")
    .onUpdate(async (change, context) => {
    const docId = context.params.docId;
    const newData = change.after.data();
    const db = await (0, mongo_1.connectToMongo)();
    const mongo = db.collection("leaderboard");
    await mongo.updateOne({ firebaseId: docId }, { $set: newData });
    console.log(`🔁 Firestore → MongoDB: Updated ${docId}`);
});
// ✅ FIRESTORE SYNC: Delete
exports.syncLeaderboardDelete = functions
    .runWith({ timeoutSeconds: 30 })
    .firestore
    .document("leaderboard/{docId}")
    .onDelete(async (snapshot, context) => {
    const docId = context.params.docId;
    const db = await (0, mongo_1.connectToMongo)();
    const mongo = db.collection("leaderboard");
    await mongo.deleteOne({ firebaseId: docId });
    console.log(`❌ Firestore → MongoDB: Deleted ${docId}`);
});
//# sourceMappingURL=index.js.map