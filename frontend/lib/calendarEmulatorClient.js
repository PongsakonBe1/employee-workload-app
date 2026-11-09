// Dedicated in-memory Auth and Firestore clients; never import the application's firebase.js.
import { initializeApp, deleteApp } from "firebase/app";
import { initializeAuth, inMemoryPersistence, connectAuthEmulator, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { initializeFirestore, connectFirestoreEmulator, terminate } from "firebase/firestore";
import { calendarEmulator, calendarTestAccounts, calendarTestPassword } from "./calendarEmulatorConfig.js";
import { createCalendarReadOnly } from "./calendarReadOnly.js";
import { calendarSdkTransport } from "./calendarSdkTransport.js";
let sequence = 0;
export function createCalendarEmulatorClient({
  local = false
} = {}) {
  if (!local || typeof window !== "undefined" && !["127.0.0.1", "localhost"].includes(window.location.hostname)) throw new Error("Emulator client is restricted to localhost");
  const {
    projectId,
    host,
    firestorePort,
    authPort
  } = calendarEmulator;
  if (!projectId.startsWith("demo-") || host !== "127.0.0.1") throw new Error("Invalid emulator target");
  const app = initializeApp({
    projectId,
    apiKey: "demo-calendar-key",
    appId: "demo-calendar-app"
  }, "calendar-readonly-" + ++sequence);
  const auth = initializeAuth(app, {
    persistence: inMemoryPersistence
  });
  connectAuthEmulator(auth, `http://${host}:${authPort}`, {
    disableWarnings: true
  });
  const db = initializeFirestore(app, {
    experimentalForceLongPolling: true
  });
  connectFirestoreEmulator(db, host, firestorePort);
  const reader = createCalendarReadOnly(calendarSdkTransport(db));
  let session = 0,
    closed = false,
    closing = null;
  return {
    reader,
    async login(id) {
      if (closed || !calendarTestAccounts.some(account => account.id === id)) throw new Error("Invalid test account");
      const current = ++session;
      reader.clear();
      await signOut(auth);
      const credential = await signInWithEmailAndPassword(auth, `${id}@example.test`, calendarTestPassword);
      if (current !== session || closed) throw new Error("Session changed");
      reader.setSession(credential.user.uid);
    },
    async logout() {
      session++;
      reader.clear();
      await signOut(auth);
    },
    close() {
      if (closing) return closing;
      closed = true;
      session++;
      reader.clear();
      closing = (async () => {
        await signOut(auth);
        await terminate(db);
        await deleteApp(app);
      })();
      return closing;
    }
  };
}
