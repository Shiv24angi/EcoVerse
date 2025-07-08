// lib/firebase.ts
import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDuXpd3VY3N9CBfLnow3PfmWtpo2ZxlgW4",
  authDomain: "ecoverse-18a2c.firebaseapp.com",
  projectId: "ecoverse-18a2c",
  storageBucket: "ecoverse-18a2c.appspot.com", // ✅ NOTE: .com NOT .app
  messagingSenderId: "969012837163",
  appId: "1:969012837163:web:5cf1b30e0e98acfdeb636e",
  measurementId: "G-8CHJ86L9S6"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({ prompt: "select_account" });

export { auth, googleProvider };
export default app;
