import * as functions from "firebase-functions";

console.log("✅ Firebase auth import is working.", !!functions.auth.user);
