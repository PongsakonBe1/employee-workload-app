// Preparation entry: validation first, lazy staging SDK, writes disabled by default. No dotenv/FCM/MongoDB.
import { validateStagingCalendarRuntime } from "../../backend/src/calendar/stagingConfig.js";
import { createTrustedCalendarApp } from "./app.js";
import { createResourceStatusHandler } from "../../backend/src/services/resourceStatusHandler.js";
import { closeStagingServer } from "./staging-shutdown.js";
let runtime;
try { runtime = validateStagingCalendarRuntime(process.env); }
catch { console.error("Staging calendar configuration rejected");process.exit(1); }
// This Render runtime uses the reviewed credential file, never a metadata-server identity.
process.env.METADATA_SERVER_DETECTION = "none";
let sdkPromise;
async function sdk() {
  sdkPromise ??= (async () => {
    const { initializeApp, applicationDefault } = await import("firebase-admin/app");
    const { getAuth } = await import("firebase-admin/auth");
    const { getFirestore, FieldValue } = await import("firebase-admin/firestore");
    const { createTrustedCalendarService } = await import("../../backend/src/calendar/service.js");
    const { createCalendarConnectivityProbe } = await import("../../backend/src/calendar/connectivity.js");
    const app = initializeApp({ projectId: runtime.projectId, credential: applicationDefault() }, "calendar-staging-server");
    const db = getFirestore(app);
    return { app, db, auth: getAuth(app), probe: createCalendarConnectivityProbe({ db, projectId: runtime.projectId }), execute: createTrustedCalendarService({ db, projectId: runtime.projectId, timestamp: () => FieldValue.serverTimestamp() }) };
  })();
  return sdkPromise;
}
const resourceStatus = runtime.resourceStatus ? createResourceStatusHandler(async () => {
  const current = await sdk();
  return { auth: () => current.auth, firestore: () => current.db };
}) : undefined;
const app = createTrustedCalendarApp({ runtime, resourceStatus, auth: { verifyIdToken: async (...args) => (await sdk()).auth.verifyIdToken(...args) }, execute: async (...args) => (await sdk()).execute(...args), probe: async uid => (await sdk()).probe(uid), log: event => console.log(JSON.stringify(event)) });
const server = app.listen(runtime.port, runtime.host, () => console.log(JSON.stringify({ event: "calendar-start", mode: runtime.mode, writesEnabled: runtime.writable })));
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  try {
    await closeStagingServer(server, resourceStatus, () => sdkPromise);
  } catch {
    console.error(JSON.stringify({ event: "calendar-shutdown-error" }));
    process.exitCode = 1;
  } finally {
    process.exit();
  }
}
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
