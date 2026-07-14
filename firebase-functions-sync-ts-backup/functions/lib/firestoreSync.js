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
exports.syncLeaderboardDelete = exports.syncLeaderboardUpdate = exports.syncLeaderboardCreate = void 0;
const functions = __importStar(require("firebase-functions"));
const mongo_1 = require("./utils/mongo");
const collectionPath = "leaderboard";
// CREATE
exports.syncLeaderboardCreate = functions.firestore
    .document(`${collectionPath}/{docId}`)
    .onCreate(async (snapshot, context) => {
    try {
        console.warn("📥 Create Trigger Fired");
        const docId = context.params.docId;
        const data = snapshot.data();
        const db = await (0, mongo_1.connectToMongo)();
        const mongo = db.collection("leaderboard");
        await mongo.insertOne({
            firebaseId: docId,
            ...data,
        });
        console.warn(`✅ Firestore → MongoDB: Created ${docId}`);
    }
    catch (err) {
        console.error("❌ Create Error:", err);
    }
});
// UPDATE
exports.syncLeaderboardUpdate = functions.firestore
    .document(`${collectionPath}/{docId}`)
    .onUpdate(async (change, context) => {
    try {
        console.warn("🔁 Update Trigger Fired");
        const docId = context.params.docId;
        const newData = change.after.data();
        const db = await (0, mongo_1.connectToMongo)();
        const mongo = db.collection("leaderboard");
        await mongo.updateOne({ firebaseId: docId }, { $set: newData });
        console.warn(`✅ Firestore → MongoDB: Updated ${docId}`);
    }
    catch (err) {
        console.error("❌ Update Error:", err);
    }
});
// DELETE
exports.syncLeaderboardDelete = functions.firestore
    .document(`${collectionPath}/{docId}`)
    .onDelete(async (snapshot, context) => {
    try {
        console.warn("❌ Delete Trigger Fired");
        const docId = context.params.docId;
        const db = await (0, mongo_1.connectToMongo)();
        const mongo = db.collection("leaderboard");
        await mongo.deleteOne({ firebaseId: docId });
        console.warn(`✅ Firestore → MongoDB: Deleted ${docId}`);
    }
    catch (err) {
        console.error("❌ Delete Error:", err);
    }
});
//# sourceMappingURL=firestoreSync.js.map