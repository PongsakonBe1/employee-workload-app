import { beforeEach, describe, it, expect, vi } from "vitest";
import { createCalendarWriter } from "./calendarWriter.js";
import { validateRoleWritePlan } from "../../scripts/calendar-role-write-plan.mjs";
import proposal from "../../docs/development/calendar-role-write-plan/staging-fixture.json";
const sdk = vi.hoisted(() => ({ revision: 9, receipt: false, targetExists: false, attempts: 0, set: vi.fn(), gateRead: vi.fn() }));
vi.mock("firebase/firestore", () => ({
  doc: (_db, collection, id) => ({ collection, id }), serverTimestamp: () => "server-time",
  getDocFromServer: sdk.gateRead,
  runTransaction: async (_db, callback) => { sdk.attempts++;return callback({ set: sdk.set, get: async ref => ({ exists: () => ref.collection === "users" || ref.collection === "calendarWriteState" || ref.collection === "calendarWriteOperations" && sdk.receipt || ref.collection === "classroomSchedules" && sdk.targetExists, data: () => ref.collection === "users" ? { role: "superadmin", active: true, calendarWriter: true } : ref.collection === "calendarWriteState" ? { revision: sdk.revision } : {} }) }); }
}));
vi.mock("./calendarSdkTransport.js", () => ({ calendarSdkTransport: () => ({ directory: async () => [], classrooms: async () => [], exams: async () => [] }) }));
const db = { app: { options: { projectId: "labboy-workload-app-staging" } } }, input = () => validateRoleWritePlan(proposal);
beforeEach(() => { sdk.revision = 9;sdk.receipt = false;sdk.targetExists = false;sdk.attempts = 0;sdk.set.mockClear();sdk.gateRead.mockReset(); });
describe("optional pinned writer constraints for development QA", () => {
  it("retries a newly appeared deterministic target only when the gate advanced, then returns its receipt", async () => {
    sdk.targetExists = true;sdk.gateRead.mockImplementation(async () => { sdk.revision = 10;sdk.receipt = true;return { exists: () => true, data: () => ({ revision: 10 }) }; });
    expect(await createCalendarWriter(db, () => "synthetic")(input())).toMatchObject({ created: 0, skipped: 1, repeated: true });
    expect(sdk.attempts).toBe(2);expect(sdk.set).not.toHaveBeenCalled();
  });
  it("never retries or overwrites an existing target when the gate has not changed", async () => {
    sdk.targetExists = true;sdk.gateRead.mockResolvedValue({ exists: () => true, data: () => ({ revision: 9 }) });
    await expect(createCalendarWriter(db, () => "synthetic")(input())).rejects.toThrow("หยุดใช้");expect(sdk.attempts).toBe(1);expect(sdk.set).not.toHaveBeenCalled();
  });
  it("bounds target-contention retries even when the gate keeps changing", async () => {
    sdk.targetExists = true;sdk.gateRead.mockImplementation(async () => { const revision = ++sdk.revision;return { exists: () => true, data: () => ({ revision }) }; });
    await expect(createCalendarWriter(db, () => "synthetic")(input())).rejects.toThrow("หยุดใช้");expect(sdk.attempts).toBe(3);expect(sdk.set).not.toHaveBeenCalled();
  });
  it("rejects a changed gate within the transaction without writing", async () => {
    await expect(createCalendarWriter(db, () => "synthetic", null, { expectedRevision: 8 })(input())).rejects.toThrow("revision");expect(sdk.set).not.toHaveBeenCalled();
  });
  it("never recreates a missing receipt in repeat-only mode", async () => {
    await expect(createCalendarWriter(db, () => "synthetic", null, { expectedRevision: 9, requireExistingReceipt: true })(input())).rejects.toThrow("receipt");expect(sdk.set).not.toHaveBeenCalled();
  });
  it("returns an existing receipt without any writes only at the pinned revision", async () => {
    sdk.revision = 10;sdk.receipt = true;
    expect(await createCalendarWriter(db, () => "synthetic", null, { expectedRevision: 10, requireExistingReceipt: true })(input())).toMatchObject({ created: 0, skipped: 1, repeated: true });
    sdk.revision = 11;await expect(createCalendarWriter(db, () => "synthetic", null, { expectedRevision: 10 })(input())).rejects.toThrow();expect(sdk.set).not.toHaveBeenCalled();
  });
  it("preserves the ordinary writer's unrestricted revision behavior", async () => {
    sdk.revision = 17;
    expect(await createCalendarWriter(db, () => "synthetic")(input())).toMatchObject({ created: 1, skipped: 0 });expect(sdk.set).toHaveBeenCalledTimes(3);
  });
});
