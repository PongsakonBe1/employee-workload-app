import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { initializeFirestore, memoryLocalCache } from "firebase/firestore";
// ⚠️ DISABLED: No Firebase Functions to save quota
// import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase (prevent duplicate initialization in Next.js)
const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);

// ตั้งค่า Persistence Mode — export promise เพื่อให้ AuthProvider await ก่อนใช้งาน
export const authReady = setPersistence(auth, browserLocalPersistence)
  .then(() => console.log("[Firebase] Auth persistence set to LOCAL"))
  .catch((err) =>
    console.error("[Firebase] Error setting auth persistence:", err),
  );

export const db = initializeFirestore(app, {
  localCache: memoryLocalCache(),
});
// ⚠️ DISABLED: Functions not used
// export const functions = getFunctions(app);
export const googleProvider = new GoogleAuthProvider();

// Mock functions object for compatibility (does nothing)
export const functions = null;

// Test Firestore connection disabled to avoid permission errors during auth init

// ไม่บังคับ domain - ตรวจสอบที่ AuthProvider แทน
// ทำให้ whitelist emails (เช่น Gmail) สามารถ login ได้
