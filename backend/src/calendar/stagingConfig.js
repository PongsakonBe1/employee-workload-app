import { STAGING_CALENDAR_PROJECT, STAGING_CALENDAR_API_ORIGIN } from "../../../frontend/lib/calendarServerProtocol.js";
export function validateStagingCalendarRuntime(env) {
  const fail = () => { throw new Error("Staging calendar configuration is incomplete or outside the reviewed target"); };
  if (env.NODE_ENV !== "production" || env.CALENDAR_SERVER_MODE !== "staging" || env.GCLOUD_PROJECT !== STAGING_CALENDAR_PROJECT || env.CALENDAR_API_ORIGIN !== STAGING_CALENDAR_API_ORIGIN ||
      env.GOOGLE_APPLICATION_CREDENTIALS !== "/etc/secrets/calendar-staging-admin.json" || env.CALENDAR_DATABASE_ID !== "(default)" ||
      ["FIRESTORE_EMULATOR_HOST", "FIREBASE_AUTH_EMULATOR_HOST", "CALENDAR_TRUSTED_EMULATOR", "FIREBASE_SERVICE_ACCOUNT_JSON", "FIREBASE_CONFIG"].some(key => Boolean(env[key]))) fail();
  const port = Number(env.PORT);
  if (!/^\d+$/.test(env.PORT || "") || !Number.isInteger(port) || port < 1024 || port > 65535 || ![undefined, "0", "1"].includes(env.CALENDAR_SERVER_WRITE) || ![undefined, "0", "1"].includes(env.CALENDAR_SERVER_CONNECTIVITY) || env.CALENDAR_SERVER_CONNECTIVITY === "1" && env.CALENDAR_SERVER_WRITE !== "0") fail();
  const origins = (env.CALENDAR_CLIENT_ORIGINS || "").split(",").map(value => value.trim());
  if (!origins.length || origins.length > 3 || new Set(origins).size !== origins.length) fail();
  for (const origin of origins) {
    let url;try { url = new URL(origin); } catch { fail(); }
    if (url.origin !== origin || url.username || url.password || url.search || url.hash || url.pathname !== "/" ||
        !(["http://127.0.0.1:4311", "http://localhost:4311", `https://${STAGING_CALENDAR_PROJECT}.web.app`].includes(origin) || url.protocol === "https:" && /^[a-z0-9]+(?:-[a-z0-9]+)*\.trycloudflare\.com$/.test(url.hostname))) fail();
  }
  return Object.freeze({ mode: "staging", projectId: STAGING_CALENDAR_PROJECT, port, host: "0.0.0.0", apiOrigin: STAGING_CALENDAR_API_ORIGIN, origins: Object.freeze(origins), writable: env.CALENDAR_SERVER_WRITE === "1", connectivity: env.CALENDAR_SERVER_CONNECTIVITY === "1" });
}
