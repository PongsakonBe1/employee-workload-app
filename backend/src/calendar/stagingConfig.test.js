import { describe, it, expect } from "vitest";
import { validateStagingCalendarRuntime } from "./stagingConfig.js";
import { createTrustedCalendarService } from "./service.js";
import { STAGING_CALENDAR_PROJECT, STAGING_CALENDAR_API_ORIGIN } from "../../../frontend/lib/calendarServerProtocol.js";
const config = { NODE_ENV: "production", CALENDAR_SERVER_MODE: "staging", GCLOUD_PROJECT: STAGING_CALENDAR_PROJECT, CALENDAR_API_ORIGIN: STAGING_CALENDAR_API_ORIGIN, GOOGLE_APPLICATION_CREDENTIALS: "/etc/secrets/calendar-staging-admin.json", CALENDAR_DATABASE_ID: "(default)", CALENDAR_CLIENT_ORIGINS: "http://127.0.0.1:4311", PORT: "10000" };
describe("staging server target/config preparation", () => {
  it("defaults to write-disabled and pins the project, HTTPS host and credential file location", () => {
    expect(validateStagingCalendarRuntime(config)).toMatchObject({ writable: false, projectId: STAGING_CALENDAR_PROJECT, host: "0.0.0.0" });
    expect(validateStagingCalendarRuntime({ ...config, CALENDAR_SERVER_WRITE: "1" }).writable).toBe(true);
    for (const key of Object.keys(config)) { const copy = { ...config };delete copy[key];expect(() => validateStagingCalendarRuntime(copy)).toThrow(); }
  });
  it.each([{ GCLOUD_PROJECT: "labboy-workload-app" }, { NODE_ENV: "development" }, { CALENDAR_API_ORIGIN: "http://labboy-calendar-staging.onrender.com" }, { CALENDAR_API_ORIGIN: "https://employee-workload-app.onrender.com" }, { GOOGLE_APPLICATION_CREDENTIALS: "some-other-file.json" }, { CALENDAR_DATABASE_ID: "production" }, { PORT: "80" }, { PORT: "65536" }, { PORT: "10000x" }, { CALENDAR_SERVER_WRITE: "true" }, { FIRESTORE_EMULATOR_HOST: "127.0.0.1:18180" }, { FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:19199" }, { FIREBASE_SERVICE_ACCOUNT_JSON: "synthetic-forbidden-config" }, { FIREBASE_CONFIG: "synthetic-forbidden-config" }])("fails closed for %j", patch => {
    expect(() => validateStagingCalendarRuntime({ ...config, ...patch })).toThrow();
  });
  it.each(["*", "https://*.trycloudflare.com", "https://labboy-workload-app.web.app", "https://example.test", "http://127.0.0.1:4311/", "http://user:password@127.0.0.1:4311", "http://127.0.0.1:4311?x=1", "http://127.0.0.1:4311,http://127.0.0.1:4311"])("rejects an unreviewed client origin %s", origin => {
    expect(() => validateStagingCalendarRuntime({ ...config, CALENDAR_CLIENT_ORIGINS: origin })).toThrow();
  });
  it("requires exact configured origins, not a wildcard or a reflected host", () => {
    expect(validateStagingCalendarRuntime({ ...config, CALENDAR_CLIENT_ORIGINS: "http://127.0.0.1:4311,https://synthetic-qa.trycloudflare.com" }).origins).toHaveLength(2);
  });
  it("requires an explicit staging service selection without relaxing the default Emulator guard", () => {
    const db = { projectId: STAGING_CALENDAR_PROJECT };
    expect(() => createTrustedCalendarService({ db })).toThrow();
    expect(typeof createTrustedCalendarService({ db, projectId: STAGING_CALENDAR_PROJECT })).toBe("function");
    expect(() => createTrustedCalendarService({ db: { projectId: "labboy-workload-app" }, projectId: "labboy-workload-app" })).toThrow();
  });
});
