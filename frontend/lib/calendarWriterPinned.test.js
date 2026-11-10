import { beforeEach, describe, it, expect, vi } from "vitest";
import { createCalendarWriter } from "./calendarWriter.js";
import { validateRoleWritePlan } from "../../scripts/calendar-role-write-plan.mjs";
import proposal from "../../docs/development/calendar-role-write-plan/staging-fixture.json";
const sdk = vi.hoisted(() => ({ revision: 9, receipt: false, set: vi.fn() }));
vi.mock("firebase/firestore", () => ({
  doc: (_db, collection, id) => ({ collection, id }), serverTimestamp: () => "server-time",
  getDocFromServer: vi.fn(),
  runTransaction: async (_db, callback) => callback({ set: sdk.set, get: async ref => ({ exists: () => ref.collection === "users" || ref.collection === "calendarWriteState" || ref.collection === "calendarWriteOperations" && sdk.receipt, data: () => ref.collection === "users" ? { role: "superadmin", active: true, calendarWriter: true } : ref.collection === "calendarWriteState" ? { revision: sdk.revision } : {} }) })
}));
vi.mock("./calendarSdkTransport.js", () => ({ calendarSdkTransport: () => ({ directory: async () => [], classrooms: async () => [], exams: async () => [] }) }));
const db = { app: { options: { projectId: "labboy-workload-app-staging" } } }, input = () => validateRoleWritePlan(proposal);
beforeEach(() => { sdk.revision = 9;sdk.receipt = false;sdk.set.mockClear(); });
describe("optional pinned writer constraints for development QA", () => {
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
