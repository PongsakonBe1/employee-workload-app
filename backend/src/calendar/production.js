import { FieldValue } from "firebase-admin/firestore";
import { createTrustedCalendarApp } from "../../../calendar-server/src/app.js";
import { PRODUCTION_CALENDAR_API_ORIGIN, PRODUCTION_CALENDAR_PROJECT } from "../../../frontend/lib/calendarServerProtocol.js";
import { createTrustedCalendarService } from "./service.js";

const prefix = "/api/calendar/";
const frontendOrigins = [
  `https://${PRODUCTION_CALENDAR_PROJECT}.web.app`,
  `https://${PRODUCTION_CALENDAR_PROJECT}.firebaseapp.com`,
];

export function mountProductionCalendar(app, {
  getFirebase,
  environment = process.env.NODE_ENV,
  flag = process.env.CALENDAR_PRODUCTION_CREATE,
  log = () => {},
}) {
  let sdk;
  function initialize() {
    if (sdk) return sdk;
    const firebase = getFirebase();
    const db = firebase.firestore();
    const execute = createTrustedCalendarService({
      db, projectId: PRODUCTION_CALENDAR_PROJECT,
      productionCreate: true, timestamp: () => FieldValue.serverTimestamp(),
    });
    sdk = { auth: firebase.auth(), execute };
    return sdk;
  }

  const calendar = createTrustedCalendarApp({
    runtime: {
      mode: "production",
      projectId: PRODUCTION_CALENDAR_PROJECT,
      apiOrigin: PRODUCTION_CALENDAR_API_ORIGIN,
      origins: frontendOrigins,
      writable: environment === "production" && flag === "1",
    },
    auth: { verifyIdToken: (...args) => initialize().auth.verifyIdToken(...args) },
    execute: (...args) => initialize().execute(...args),
    log,
  });

  // Keep Calendar's small, uncompressed JSON parser ahead of the global parser.
  app.use((req, res, next) => {
    if (!req.path.startsWith(prefix)) return next();
    return calendar(req, res, next);
  });
}
