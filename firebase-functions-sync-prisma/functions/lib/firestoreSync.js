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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncLeaderboardDelete = exports.syncLeaderboardUpdate = exports.syncLeaderboardCreate = void 0;
const functions = __importStar(require("firebase-functions"));
const prisma_1 = __importDefault(require("./utils/prisma"));
const path = "leaderboard/{docId}";
exports.syncLeaderboardCreate = functions.firestore
    .document(path)
    .onCreate(async (snap, context) => {
    const data = snap.data();
    await prisma_1.default.leaderboard.create({
        data: {
            firebaseId: context.params.docId,
            name: data.name,
            score: data.score,
        },
    });
    console.log(`📥 Firestore → PostgreSQL: Created ${context.params.docId}`);
});
exports.syncLeaderboardUpdate = functions.firestore
    .document(path)
    .onUpdate(async (change, context) => {
    const newData = change.after.data();
    await prisma_1.default.leaderboard.update({
        where: { firebaseId: context.params.docId },
        data: {
            name: newData.name,
            score: newData.score,
        },
    });
    console.log(`🔁 Updated ${context.params.docId}`);
});
exports.syncLeaderboardDelete = functions.firestore
    .document(path)
    .onDelete(async (_, context) => {
    await prisma_1.default.leaderboard.delete({
        where: { firebaseId: context.params.docId },
    });
    console.log(`❌ Deleted ${context.params.docId}`);
});
