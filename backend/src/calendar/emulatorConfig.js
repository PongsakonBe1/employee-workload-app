// This phase is deliberately incapable of selecting a cloud project.
export const TRUSTED_CALENDAR_PROJECT = "demo-calendar-trusted";
export const TRUSTED_CALENDAR_PORT = 4321;
export const TRUSTED_CALENDAR_ORIGIN = "http://127.0.0.1:4313";
export function validateTrustedCalendarRuntime(env) {
  if (env.NODE_ENV !== "development" || env.CALENDAR_TRUSTED_EMULATOR !== "1" ||
      env.GCLOUD_PROJECT !== TRUSTED_CALENDAR_PROJECT ||
      env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:18180" ||
      env.FIREBASE_AUTH_EMULATOR_HOST !== "127.0.0.1:19199") {
    throw new Error("Trusted calendar requires the dedicated development Emulator runtime");
  }
  return { projectId: TRUSTED_CALENDAR_PROJECT, port: TRUSTED_CALENDAR_PORT, origin: TRUSTED_CALENDAR_ORIGIN };
}
