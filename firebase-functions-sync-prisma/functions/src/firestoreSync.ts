import * as functions from "firebase-functions";
import prisma from "./utils/prisma";

const path = "leaderboard/{docId}";

export const syncLeaderboardCreate = functions.firestore
  .document(path)
  .onCreate(async (snap, context) => {
    const data = snap.data();
    await prisma.leaderboard.create({
      data: {
        firebaseId: context.params.docId,
        name: data.name,
        points: data.score,
      },
    });
    console.warn(`📥 Firestore → PostgreSQL: Created ${context.params.docId}`);
  });

export const syncLeaderboardUpdate = functions.firestore
  .document(path)
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    await prisma.leaderboard.update({
      where: { firebaseId: context.params.docId },
      data: {
        name: newData.name,
        points: newData.score,
      },
    });
    console.warn(`🔁 Updated ${context.params.docId}`);
  });

export const syncLeaderboardDelete = functions.firestore
  .document(path)
  .onDelete(async (_, context) => {
    await prisma.leaderboard.delete({
      where: { firebaseId: context.params.docId },
    });
    console.warn(`❌ Deleted ${context.params.docId}`);
  });
