import * as admin from "firebase-admin";
import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

dotenv.config();
admin.initializeApp();

const prisma = new PrismaClient();

async function backfillUsers() {
  try {
    let nextPageToken: string | undefined;
    do {
      const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
      for (const userRecord of listUsersResult.users) {
        await prisma.user.upsert({
          where: { uid: userRecord.uid },
          update: {},
          create: {
            uid: userRecord.uid,
            email: userRecord.email,
            displayName: userRecord.displayName,
            photoURL: userRecord.photoURL,
            createdAt: new Date(userRecord.metadata.creationTime || new Date()),
          },
        });
        console.log(`✅ Synced user ${userRecord.uid}`);
      }
      nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);
  } catch (err) {
    console.error("❌ Error syncing users:", err);
  } finally {
    await prisma.$disconnect();
  }
}

backfillUsers();
