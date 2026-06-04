import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from "firebase/auth";
import { initializeFirestore, memoryLocalCache } from "firebase/firestore";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
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
// ลอง LOCAL ก่อน (คง login ข้าม browser sessions) ถ้า error จะ fallback ไป SESSION
export const authReady = setPersistence(auth, browserLocalPersistence)
  .then(() => console.log("[Firebase] Auth persistence set to LOCAL"))
  .catch((err) => {
    console.warn("[Firebase] LOCAL persistence failed, falling back to SESSION:", err);
    return setPersistence(auth, browserSessionPersistence)
      .then(() => console.log("[Firebase] Auth persistence set to SESSION (fallback)"));
  });

export const db = initializeFirestore(app, {
  localCache: memoryLocalCache(),
});
// ⚠️ DISABLED: Functions not used
// export const functions = getFunctions(app);
export const googleProvider = new GoogleAuthProvider();

// Mock functions object for compatibility (does nothing)
export const functions = null;

// FCM Messaging — lazy init เพราะต้องรันใน browser เท่านั้น
export async function getFCMToken() {
  try {
    const supported = await isSupported();
    if (!supported) return null;

    const messaging = getMessaging(app);

    // Register service worker ก่อนขอ token
    if ("serviceWorker" in navigator) {
      await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    }

    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    });
    return token || null;
  } catch (err) {
    console.warn("[FCM] getToken failed:", err.code || err.message);
    return null;
  }
}

export async function onFCMMessage(callback) {
  try {
    const supported = await isSupported();
    if (!supported) return () => {};
    const messaging = getMessaging(app);
    return onMessage(messaging, callback);
  } catch (err) {
    console.warn("[FCM] onMessage setup failed:", err.message);
    return () => {};
  }
}
