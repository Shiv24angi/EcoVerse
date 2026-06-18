import * as functions from "firebase-functions";
import prisma from "./utils/prisma";

export const handleUserSignup = functions.auth.user().onCreate(async (user) => {
  await prisma.user.create({
    data: {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
    },
  });

  console.warn(`✅ Synced new user ${user.uid} to PostgreSQL`);
});

export const handleUserDeletion = functions.auth.user().onDelete(async (user) => {
  await prisma.user.delete({ where: { uid: user.uid } });
  console.warn(`🗑️ Removed user ${user.uid} from PostgreSQL`);
});
