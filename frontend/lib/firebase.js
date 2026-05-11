import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
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

console.log("[Firebase] App initialized:", app.name);
console.log("[Firebase] Project ID:", firebaseConfig.projectId);
console.log("[Firebase] Auth Domain:", firebaseConfig.authDomain);
console.log("[Firebase] API Key exists:", !!firebaseConfig.apiKey);
console.log("[Firebase] Full config (check values):", {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  apiKey: firebaseConfig.apiKey ? "***SET***" : "***MISSING***",
  appId: firebaseConfig.appId ? "***SET***" : "***MISSING***",
});

export const auth = getAuth(app);

// ตั้งค่า Persistence Mode ให้ session คงอยู่แม้เปลี่ยนหน้า
setPersistence(auth, browserLocalPersistence)
  .then(() => console.log("[Firebase] Auth persistence set to LOCAL"))
  .catch((err) =>
    console.error("[Firebase] Error setting auth persistence:", err),
  );

export const db = getFirestore(app);
// ⚠️ DISABLED: Functions not used
// export const functions = getFunctions(app);
export const googleProvider = new GoogleAuthProvider();

// Mock functions object for compatibility (does nothing)
export const functions = null;

// Test Firestore connection (disabled temporarily to avoid permission errors during auth)
// import { getDocs, collection, limit } from "firebase/firestore";
// getDocs(collection(db, "users"), limit(1))
//   .then(() => console.log("[Firebase] Firestore connected successfully"))
//   .catch((err) => console.error("[Firebase] Firestore connection error:", err));
console.log("[Firebase] Firestore test skipped (will test after auth)");

// ไม่บังคับ domain - ตรวจสอบที่ AuthProvider แทน
// ทำให้ whitelist emails (เช่น Gmail) สามารถ login ได้
