// Dedicated in-memory Auth and Firestore clients; never import the application's firebase.js.
import { initializeApp, deleteApp } from "firebase/app";
import { initializeAuth, inMemoryPersistence, connectAuthEmulator, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { initializeFirestore, connectFirestoreEmulator, getDocFromServer, getDocsFromServer, doc, collection, query, where, orderBy, limit, terminate } from "firebase/firestore";
import { calendarEmulator, calendarTestAccounts, calendarTestPassword } from "./calendarEmulatorConfig.js";
import { CALENDAR_READ_LIMIT, createCalendarReadOnly } from "./calendarReadOnly.js";
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
  const records = async request => (await getDocsFromServer(request)).docs.map(record => ({
    ...record.data(),
    id: record.id
  }));
  const reader = createCalendarReadOnly({
    identity: async uid => {
      const record = await getDocFromServer(doc(db, "users", uid));
      return record.exists() ? {
        ...record.data(),
        id: record.id
      } : null;
    },
    directory: () => records(query(collection(db, "users"), where("role", "in", ["staff", "admin", "superadmin"]), where("active", "==", true), limit(CALENDAR_READ_LIMIT + 1))),
    classrooms: () => records(query(collection(db, "classroomSchedules"), where("isActive", "==", true), limit(CALENDAR_READ_LIMIT + 1))),
    exams: (start, end) => records(query(collection(db, "dlExamSchedules"), where("isActive", "==", true), where("date", ">=", start), where("date", "<=", end), orderBy("date"), limit(CALENDAR_READ_LIMIT + 1)))
  });
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
