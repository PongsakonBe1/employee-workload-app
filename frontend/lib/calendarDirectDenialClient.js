/* global process */
// Isolated developer session. Creation itself is refused outside development localhost:4311.
import { initializeApp, deleteApp } from "firebase/app";
import { initializeAuth, inMemoryPersistence, browserPopupRedirectResolver, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { initializeFirestore, terminate } from "firebase/firestore";
import { validateCalendarStagingConfig } from "./calendarStagingConfig.js";
import { createCalendarDirectDenialQa } from "./calendarDirectDenialQa.js";
import { calendarDirectDenialTransport } from "./calendarDirectDenialSdk.js";
let sequence = 0;
export function createCalendarDirectDenialClient(config) {
  if (process.env.NODE_ENV !== "development" || globalThis.location?.origin !== "http://127.0.0.1:4311") throw new Error("Cutover QA requires development on localhost:4311");
  const approved = validateCalendarStagingConfig(config), app = initializeApp(approved, "calendar-direct-denial-" + ++sequence);
  const auth = initializeAuth(app, { persistence: inMemoryPersistence, popupRedirectResolver: browserPopupRedirectResolver });
  const db = initializeFirestore(app, { experimentalForceLongPolling: true });let closed = false;
  return {
    async login() {
      if (closed) throw new Error("QA session closed");const provider = new GoogleAuthProvider();provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);if (closed) throw new Error("QA session changed");
    },
    alias: frozen => Object.entries(frozen.identities).find(([, uid]) => uid === auth.currentUser?.uid)?.[0] || null,
    controller: packet => createCalendarDirectDenialQa(calendarDirectDenialTransport(db, () => closed ? null : auth.currentUser), packet),
    logout: () => signOut(auth),
    async close() { if (closed) return;closed = true;await terminate(db);await deleteApp(app); }
  };
}
