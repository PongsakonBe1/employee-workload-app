// Isolated staging client, with synthetic localhost-only QA login and no production fallback.
/* global process */
import { initializeApp, deleteApp } from "firebase/app";
import { initializeAuth, inMemoryPersistence, browserPopupRedirectResolver, GoogleAuthProvider, signInWithPopup, signOut, connectAuthEmulator, signInWithEmailAndPassword } from "firebase/auth";
import { initializeFirestore, terminate, getDocFromServer, doc, connectFirestoreEmulator } from "firebase/firestore";
import { validateCalendarStagingConfig } from "./calendarStagingConfig.js";
import { createCalendarReadOnly } from "./calendarReadOnly.js";
import { calendarSdkTransport } from "./calendarSdkTransport.js";
import { createCalendarWriter } from "./calendarWriter.js";
import { createCalendarMutationWriter } from "./calendarMutationWriter.js";
import { probeCalendarWriterReads } from "./calendarRoleProbe.js";
import { calendarRoleWriteSdk } from "./calendarRoleWriteSdk.js";
import roleWriteProposal from "../../docs/development/calendar-role-write-plan/staging-fixture.json";
import { calendarTestPassword } from "./calendarEmulatorConfig.js";
import { createMutationReceiptReplay, validateMutationReplayPacket } from "./calendarMutationReplayQa.js";
import { validateTrustedCalendarConfig, trustedCalendarRuntimeEnabled } from "./calendarTrustedConfig.js";
import { createTrustedCalendarTransport } from "./calendarTrustedTransport.js";
import { stagingCalendarServerEnabled } from "./calendarStagingServerConfig.js";
import { STAGING_CALENDAR_API_ORIGIN } from "./calendarServerProtocol.js";
let sequence = 0;
export function createCalendarStagingClient(config, { writer = false, roleQa = false, roleWriteQa = false, mutations = false, emulatorAccount = null, trustedServer = false, stagingServer = false } = {}) {
  if (stagingServer && (!stagingCalendarServerEnabled(process.env.NODE_ENV, process.env.NEXT_PUBLIC_CALENDAR_STAGING_SERVER, Boolean(emulatorAccount), process.env.NEXT_PUBLIC_CALENDAR_STAGING_API_ORIGIN) || trustedServer || roleQa || roleWriteQa)) throw new Error("Staging HTTP writer requires its explicit reviewed runtime");
  if (trustedServer && (!trustedCalendarRuntimeEnabled(process.env.NODE_ENV, process.env.NEXT_PUBLIC_CALENDAR_TRUSTED_SERVER, Boolean(emulatorAccount), typeof window === "undefined" ? null : window.location) || roleQa || roleWriteQa)) throw new Error("Trusted server requires its dedicated loopback runtime");
  if (mutations && (!writer || roleWriteQa)) throw new Error("Mutations require the ordinary writer client");
  if (emulatorAccount && (process.env.NODE_ENV !== "development" || typeof window === "undefined" || !["127.0.0.1", "localhost"].includes(window.location.hostname) || !["admin", "staff", "superadmin"].includes(emulatorAccount))) throw new Error("Synthetic Emulator login requires development on localhost");
  const approved = trustedServer ? validateTrustedCalendarConfig(config) : validateCalendarStagingConfig(config);
  const app = initializeApp(approved, "calendar-staging-" + ++sequence);
  const auth = initializeAuth(app, {
    persistence: inMemoryPersistence,
    popupRedirectResolver: browserPopupRedirectResolver
  });
  const db = initializeFirestore(app, {
    experimentalForceLongPolling: true
  });
  if (emulatorAccount) { connectAuthEmulator(auth, trustedServer ? "http://127.0.0.1:19199" : "http://127.0.0.1:19099", { disableWarnings: true });connectFirestoreEmulator(db, "127.0.0.1", trustedServer ? 18180 : 18080); }
  const transport = calendarSdkTransport(db);
  const reader = createCalendarReadOnly(transport);
  let closed = false,
    closing = null,
    session = 0;
  const serverWriter = (trustedServer || stagingServer) && writer ? createTrustedCalendarTransport({ getUser: () => closed ? null : auth.currentUser, ...(stagingServer ? { origin: STAGING_CALENDAR_API_ORIGIN, readiness: true } : { readiness: process.env.NEXT_PUBLIC_CALENDAR_SERVER_PREFLIGHT === "1" }) }) : null;
  const mutate = writer && mutations ? serverWriter?.mutate || createCalendarMutationWriter(db, () => closed ? null : auth.currentUser?.uid, () => reader.refresh()) : null;
  return {
    reader,
    ...(serverWriter?.prepareWrite ? { prepareWrite: serverWriter.prepareWrite } : {}),
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
    ...(writer && !roleWriteQa ? { create: serverWriter?.create || createCalendarWriter(db, () => closed ? null : auth.currentUser?.uid, () => reader.refresh()) } : {}),
    ...(mutate ? { mutate } : {}),
    ...(mutate && process.env.NODE_ENV === "development" && !emulatorAccount && !stagingServer ? { async replayQa({ text, index }) {
      const packet = await validateMutationReplayPacket(text), uid = closed ? null : auth.currentUser?.uid;
      return createMutationReceiptReplay({ projectId: db.app.options.projectId, getUid: () => closed ? null : auth.currentUser?.uid, identity: () => transport.identity(uid), read: async (collection, id) => { const row = await getDocFromServer(doc(db, collection, id));return row.exists() ? row.data() : null; }, mutate })(packet, index);
    } } : {}),
    ...(writer && roleWriteQa ? { roleWriteQa: calendarRoleWriteSdk(db, () => closed ? null : auth.currentUser?.uid, roleWriteProposal, () => reader.refresh()) } : {}),
    async login() {
      if (closed) throw new Error("Client closed");
      const current = ++session;
      reader.clear();
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: "select_account"
      });
      const result = emulatorAccount ? await signInWithEmailAndPassword(auth, `mutation-ui-${emulatorAccount}@example.test`, calendarTestPassword) : await signInWithPopup(auth, provider);
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
