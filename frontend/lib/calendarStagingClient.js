// Cloud staging only. No production configuration or shared test passwords; write APIs require explicit opt-in.
import { initializeApp, deleteApp } from "firebase/app";
import { initializeAuth, inMemoryPersistence, browserPopupRedirectResolver, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { initializeFirestore, terminate, getDocFromServer, doc } from "firebase/firestore";
import { validateCalendarStagingConfig } from "./calendarStagingConfig.js";
import { createCalendarReadOnly } from "./calendarReadOnly.js";
import { calendarSdkTransport } from "./calendarSdkTransport.js";
import { createCalendarWriter } from "./calendarWriter.js";
import { probeCalendarWriterReads } from "./calendarRoleProbe.js";
import { calendarRoleWriteSdk } from "./calendarRoleWriteSdk.js";
import roleWriteProposal from "../../docs/development/calendar-role-write-plan/staging-fixture.json";
let sequence = 0;
export function createCalendarStagingClient(config, { writer = false, roleQa = false, roleWriteQa = false } = {}) {
  const approved = validateCalendarStagingConfig(config);
  const app = initializeApp(approved, "calendar-staging-" + ++sequence);
  const auth = initializeAuth(app, {
    persistence: inMemoryPersistence,
    popupRedirectResolver: browserPopupRedirectResolver
  });
  const db = initializeFirestore(app, {
    experimentalForceLongPolling: true
  });
  const transport = calendarSdkTransport(db);
  const reader = createCalendarReadOnly(transport);
  let closed = false,
    closing = null,
    session = 0;
  return {
    reader,
    async identity() {
      const current = session, uid = closed ? null : auth.currentUser?.uid;
      if (!uid) throw Object.assign(new Error("Staging sign-in required"), { code: "unauthenticated" });
      const user = await transport.identity(uid);
      if (closed || current !== session || auth.currentUser?.uid !== uid) throw Object.assign(new Error("Session changed"), { code: "session-changed" });
      if (!user || user.id !== uid || user.active !== true || !["staff", "admin", "superadmin"].includes(user.role)) throw Object.assign(new Error("Staging reader unavailable"), { code: "permission-denied" });
      return user;
    },
    ...(roleQa ? { probeWriterReads() {
      const current = session;
      return probeCalendarWriterReads((collection, id) => getDocFromServer(doc(db, collection, id)), () => !closed && current === session && Boolean(auth.currentUser?.uid));
    } } : {}),
    ...(writer && !roleWriteQa ? { create: createCalendarWriter(db, () => closed ? null : auth.currentUser?.uid, () => reader.refresh()) } : {}),
    ...(writer && roleWriteQa ? { roleWriteQa: calendarRoleWriteSdk(db, () => closed ? null : auth.currentUser?.uid, roleWriteProposal, () => reader.refresh()) } : {}),
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
