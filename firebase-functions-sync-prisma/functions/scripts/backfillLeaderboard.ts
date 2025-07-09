import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

const serviceAccountPath = path.join(__dirname, "../keys/serviceAccountKey.json");
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.project_id, // ✅ this is important!
});

const db = getFirestore();
const prisma = new PrismaClient();

async function backfillLeaderboard() {
  try {
    const snapshot = await db.collection("leaderboard").get();

    for (const doc of snapshot.docs) {
      const data = doc.data();
      await prisma.leaderboard.upsert({
        where: { firebaseId: doc.id },
        update: {},
        create: {
          firebaseId: doc.id,
          name: data.name || "Unknown",
          points: data.points || 0,
          score: data.score || 0,
        },
      });

      console.log(`✅ Synced: ${doc.id}`);
    }

    await prisma.$disconnect();
  } catch (err) {
    console.error("❌ Backfill failed:", err);
  }
}

backfillLeaderboard();
