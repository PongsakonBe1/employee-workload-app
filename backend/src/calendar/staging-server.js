// Preparation entry: validation first, lazy staging SDK, writes disabled by default. No dotenv/FCM/MongoDB.
import { validateStagingCalendarRuntime } from "./stagingConfig.js";
import { createTrustedCalendarApp } from "./app.js";
let runtime;
try { runtime = validateStagingCalendarRuntime(process.env); }
catch { console.error("Staging calendar configuration rejected");process.exit(1); }
let sdkPromise;
async function sdk() {
  sdkPromise ??= (async () => {
    const { initializeApp, applicationDefault } = await import("firebase-admin/app");
    const { getAuth } = await import("firebase-admin/auth");
    const { getFirestore, FieldValue } = await import("firebase-admin/firestore");
    const { createTrustedCalendarService } = await import("./service.js");
    const app = initializeApp({ projectId: runtime.projectId, credential: applicationDefault() }, "calendar-staging-server");
    const db = getFirestore(app);
    return { app, db, auth: getAuth(app), execute: createTrustedCalendarService({ db, projectId: runtime.projectId, timestamp: () => FieldValue.serverTimestamp() }) };
  })();
  return sdkPromise;
}
const app = createTrustedCalendarApp({ runtime, auth: { verifyIdToken: async (...args) => (await sdk()).auth.verifyIdToken(...args) }, execute: async (...args) => (await sdk()).execute(...args), log: event => console.log(JSON.stringify(event)) });
const server = app.listen(runtime.port, runtime.host, () => console.log(JSON.stringify({ event: "calendar-start", mode: runtime.mode, writesEnabled: runtime.writable })));
async function stop() {
  await new Promise(resolve => server.close(resolve));
  if (sdkPromise) { const current = await sdkPromise.catch(() => null);if (current) { await current.db.terminate();const { deleteApp } = await import("firebase-admin/app");await deleteApp(current.app); } }
}
process.on("SIGTERM", () => stop().finally(() => process.exit()));process.on("SIGINT", () => stop().finally(() => process.exit()));
