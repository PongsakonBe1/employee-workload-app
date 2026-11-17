// Dedicated entry: no dotenv, MongoDB, notification initialization or cloud fallback.
import { validateTrustedCalendarRuntime } from "../../backend/src/calendar/emulatorConfig.js";
const config = validateTrustedCalendarRuntime(process.env);
// An Emulator must not probe a cloud metadata endpoint while detecting its environment.
process.env.METADATA_SERVER_DETECTION = "none";
const { initializeApp, deleteApp } = await import("firebase-admin/app");
const { getAuth } = await import("firebase-admin/auth");
const { Firestore, FieldValue } = await import("firebase-admin/firestore");
const { createTrustedCalendarService } = await import("../../backend/src/calendar/service.js");
const { createTrustedCalendarApp } = await import("./app.js");
// Dummy credentials are for loopback only; never resolve ADC or a service-account file.
const firebase = initializeApp({ projectId: config.projectId, credential: { getAccessToken: async () => ({ access_token: "emulator-only", expires_in: 3600 }) } }, "calendar-trusted-emulator");
const db = new Firestore({ projectId: config.projectId, host: "127.0.0.1:18180", ssl: false }), auth = getAuth(firebase);
const app = createTrustedCalendarApp({ auth, execute: createTrustedCalendarService({ db, timestamp: () => FieldValue.serverTimestamp() }) });
const server = app.listen(config.port, "127.0.0.1", () => console.log(`Calendar API: loopback ${config.port}; ${config.projectId}; Emulator only`));
async function stop() { server.close();await db.terminate();await deleteApp(firebase); }
process.on("SIGINT", () => stop().finally(() => process.exit()));
process.on("SIGTERM", () => stop().finally(() => process.exit()));
