import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAZ1H2PlCluTRFzAHKN3pbWjaQhttFXM7U",
  authDomain: "icit-workload-app.firebaseapp.com",
  projectId: "icit-workload-app",
  storageBucket: "icit-workload-app.firebasestorage.app",
  messagingSenderId: "193546086713",
  appId: "1:193546086713:web:1dd223c5b04dee37e620e8",
};

// Initialize Firebase (prevent duplicate initialization in Next.js)
const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
