// Cloud staging only. No production configuration, shared test passwords or database writes.
import { initializeApp, deleteApp } from "firebase/app";
import { initializeAuth, inMemoryPersistence, browserPopupRedirectResolver, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { initializeFirestore, terminate, getDocFromServer, doc } from "firebase/firestore";
import { validateCalendarStagingConfig } from "./calendarStagingConfig.js";
import { createCalendarReadOnly } from "./calendarReadOnly.js";
import { calendarSdkTransport } from "./calendarSdkTransport.js";
import { createCalendarWriter } from "./calendarWriter.js";
import { probeCalendarWriterReads } from "./calendarRoleProbe.js";
let sequence = 0;
export function createCalendarStagingClient(config, { writer = false, roleQa = false } = {}) {
  const approved = validateCalendarStagingConfig(config);
  const app = initializeApp(approved, "calendar-staging-" + ++sequence);
  const auth = initializeAuth(app, {
    persistence: inMemoryPersistence,
    popupRedirectResolver: browserPopupRedirectResolver
  });
  const db = initializeFirestore(app, {
    experimentalForceLongPolling: true
  });
  const reader = createCalendarReadOnly(calendarSdkTransport(db));
  let closed = false,
    closing = null,
    session = 0;
  return {
    reader,
    ...(roleQa ? { probeWriterReads() {
      const current = session;
      return probeCalendarWriterReads((collection, id) => getDocFromServer(doc(db, collection, id)), () => !closed && current === session && Boolean(auth.currentUser?.uid));
    } } : {}),
    ...(writer ? { create: createCalendarWriter(db, () => closed ? null : auth.currentUser?.uid, () => reader.refresh()) } : {}),
    async login() {
      if (closed) throw new Error("Client closed");
      const current = ++session;
      reader.clear();
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: "select_account"
      });
      const result = await signInWithPopup(auth, provider);
      if (current !== session || closed) throw new Error("Session changed");
      reader.setSession(result.user.uid);
    },
    close() {
      if (closing) return closing;
      closed = true;
      session++;
      reader.clear();
      closing = (async () => {
        try {
          await signOut(auth);
        } finally {
          try {
            await terminate(db);
          } finally {
            await deleteApp(app);
          }
        }
      })();
      return closing;
    }
  };
}
