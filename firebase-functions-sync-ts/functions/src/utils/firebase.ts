import * as admin from "firebase-admin";
import * as dotenv from "dotenv";

dotenv.config();

// Prevent multiple initializations during hot reload or emulators
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

export { admin };
