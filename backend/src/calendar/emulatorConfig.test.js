import { describe, it, expect, vi } from "vitest";
import { validateTrustedCalendarRuntime, TRUSTED_CALENDAR_PROJECT } from "./emulatorConfig.js";
import { createTrustedCalendarService } from "./service.js";
const env = { NODE_ENV: "development", CALENDAR_TRUSTED_EMULATOR: "1", GCLOUD_PROJECT: TRUSTED_CALENDAR_PROJECT, FIRESTORE_EMULATOR_HOST: "127.0.0.1:18180", FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:19199" };
describe("trusted calendar runtime fails closed", () => {
  it("requires every dedicated Emulator setting", () => {
    expect(validateTrustedCalendarRuntime(env).projectId).toBe(TRUSTED_CALENDAR_PROJECT);
    for (const key of Object.keys(env)) { const copy = { ...env };delete copy[key];expect(() => validateTrustedCalendarRuntime(copy)).toThrow(); }
  });
  it.each([{ NODE_ENV: "production" }, { GCLOUD_PROJECT: "labboy-workload-app-staging" }, { FIRESTORE_EMULATOR_HOST: "example.test:443" }, { FIREBASE_AUTH_EMULATOR_HOST: "localhost:19199" }])("rejects a different runtime %j", patch => {
    expect(() => validateTrustedCalendarRuntime({ ...env, ...patch })).toThrow();
  });
  it("does not construct a service for a real or unspecified project", () => {
    for (const projectId of [undefined, "labboy-workload-app", "labboy-workload-app-staging"]) expect(() => createTrustedCalendarService({ db: { projectId } })).toThrow();
  });
  it("fails closed on an over-limit directory before planning or writing", async () => {
    const tx = { get: vi.fn(async ref => ref.path === "users/synthetic-admin" ? { exists: true, data: () => ({ active: true, role: "admin", calendarWriter: true }) } : ref.path === "calendarWriteState/main" ? { exists: true, data: () => ({ revision: 0 }) } : { docs: Array.from({ length: 201 }, (_, index) => ({ id: "synthetic-" + index, data: () => ({ role: "staff", active: true }) })) }), create: vi.fn(), update: vi.fn() };
    const query = { limit: () => query, where: () => query };
    const db = { projectId: TRUSTED_CALENDAR_PROJECT, doc: path => ({ path }), collection: () => query, runTransaction: callback => callback(tx) };
    await expect(createTrustedCalendarService({ db })("create", "synthetic-admin", { rules: [], events: [] })).rejects.toHaveProperty("code", "calendar-write-validation");expect(tx.create).not.toHaveBeenCalled();expect(tx.update).not.toHaveBeenCalled();
  });
});
