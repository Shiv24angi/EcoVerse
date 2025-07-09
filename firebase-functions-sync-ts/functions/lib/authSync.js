"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleUserDeletion = exports.handleUserSignup = void 0;
const auth_1 = require("firebase-functions/v2/auth");
const mongo_1 = require("./utils/mongo");
// Handle user signup
exports.handleUserSignup = (0, auth_1.onUserCreated)(async (event) => {
    const user = event.data;
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
// Handle user deletion
exports.handleUserDeletion = (0, auth_1.onUserDeleted)(async (event) => {
    const user = event.data;
    const db = await (0, mongo_1.connectToMongo)();
    const collection = db.collection("users");
    await collection.deleteOne({ uid: user.uid });
    console.log(`🗑️ Removed user ${user.uid} from MongoDB`);
});
//# sourceMappingURL=authSync.js.map