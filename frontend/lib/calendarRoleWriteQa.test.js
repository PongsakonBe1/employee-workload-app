import { describe, it, expect, vi } from "vitest";
import proposal from "../../docs/development/calendar-role-write-plan/staging-fixture.json";
import { createCalendarRoleWriteQa } from "./calendarRoleWriteQa.js";
import { validateRoleWritePlan, prepareRoleWriteFixture } from "../../scripts/calendar-role-write-plan.mjs";
function transport(role = "staff") {
  return { projectId: "labboy-workload-app-staging", getUid: vi.fn(() => "synthetic-qa"), profile: vi.fn(async () => ({ role, active: true, calendarWriter: role === "superadmin" })), schedule: vi.fn(async () => null), receipt: vi.fn(async () => null), gate: vi.fn(async () => ({ revision: 9 })), rawCommit: vi.fn(async () => { throw Object.assign(new Error("denied"), { code: "permission-denied" }); }), create: vi.fn(async () => ({ created: 1, skipped: 0, repeated: false })), repeat: vi.fn(async () => ({ created: 0, skipped: 1, repeated: true })) };
}
describe("one-fixture approved role write executor", () => {
  it("submits the Staff batch once and preserves the actual permission-denied outcome", async () => {
    const sdk = transport(), executor = createCalendarRoleWriteQa(sdk, proposal);
    expect(await executor.staffDenial()).toEqual({ outcome: "permission-denied", stop: false });
    await expect(executor.staffDenial()).rejects.toMatchObject({ code: "qa-write-stopped" });
    expect(sdk.rawCommit).toHaveBeenCalledTimes(1);expect(sdk.rawCommit.mock.calls[0][1]).toBe(9);
  });
  it.each([undefined, "unavailable"])("stops on ambiguous Staff outcomes (%s) without retry", async code => {
    const sdk = transport();sdk.rawCommit.mockRejectedValue({ code });
    const executor = createCalendarRoleWriteQa(sdk, proposal);
    expect(await executor.staffDenial()).toEqual({ outcome: "ambiguous-or-failed", stop: true });
    await expect(executor.staffDenial()).rejects.toThrow();expect(sdk.rawCommit).toHaveBeenCalledTimes(1);
  });
  it("reports and stops an unexpected successful Staff write", async () => {
    const sdk = transport();sdk.rawCommit.mockResolvedValue(undefined);
    expect(await createCalendarRoleWriteQa(sdk, proposal).staffDenial()).toEqual({ outcome: "unexpected-write", stop: true });
    expect(sdk.create).not.toHaveBeenCalled();
  });
  it("refuses other projects, changed manifests and changed sessions before mutation", async () => {
    const sdk = transport();expect(() => createCalendarRoleWriteQa({ ...sdk, projectId: "labboy-workload-app" }, proposal)).toThrow();
    const changed = { ...proposal, extra: "not approved" };
    await expect(createCalendarRoleWriteQa(sdk, changed).staffDenial()).rejects.toThrow("manifest mismatch");
    sdk.getUid.mockReturnValueOnce("first").mockReturnValue("second");
    await expect(createCalendarRoleWriteQa(sdk, proposal).staffDenial()).rejects.toThrow();expect(sdk.rawCommit).not.toHaveBeenCalled();
  });
  it("does not send a Staff write when the target exists or the actual profile is not Staff", async () => {
    for (const sdk of [transport("superadmin"), { ...transport(), schedule: vi.fn(async () => ({})) }]) {
      await expect(createCalendarRoleWriteQa(sdk, proposal).staffDenial()).rejects.toThrow();expect(sdk.rawCommit).not.toHaveBeenCalled();
    }
  });
  it("requires the audit acknowledgement and exact reviewed business fields for UI create", async () => {
    const sdk = transport("superadmin"), executor = createCalendarRoleWriteQa(sdk, proposal), input = validateRoleWritePlan(proposal);
    await expect(executor.create(input, false)).rejects.toThrow();
    const different = structuredClone(input);different.rules[0].start = "09:00";
    await expect(executor.create(different, true)).rejects.toThrow("approved one-day");
    expect(await executor.create(input, true)).toMatchObject({ created: 1 });
    await expect(executor.create(input, true)).rejects.toThrow();expect(sdk.create).toHaveBeenCalledTimes(1);
  });
  it.each(["gate", "schedule", "receipt"])("stops create if %s changes before sending", async field => {
    const sdk = transport("superadmin");sdk[field].mockResolvedValue(field === "gate" ? { revision: 10 } : {});
    await expect(createCalendarRoleWriteQa(sdk, proposal).create(validateRoleWritePlan(proposal), true)).rejects.toThrow();expect(sdk.create).not.toHaveBeenCalled();
  });
  it("only repeats an existing receipt/target created by this Superadmin at revision 10", async () => {
    const sdk = transport("superadmin"), prepared = await prepareRoleWriteFixture(proposal);
    sdk.gate.mockResolvedValue({ revision: 10, operationId: prepared.operationId, updatedBy: "synthetic-qa" });sdk.schedule.mockResolvedValue({ ...prepared.entries[0].value, operationId: prepared.operationId, createdBy: "synthetic-qa", schemaVersion: 1 });sdk.receipt.mockResolvedValue({ createdBy: "synthetic-qa", count: 1, skipped: 0, schemaVersion: 1 });
    const executor = createCalendarRoleWriteQa(sdk, proposal);
    expect(await executor.repeat()).toMatchObject({ created: 0, skipped: 1 });
    await expect(executor.repeat()).rejects.toThrow();expect(sdk.repeat).toHaveBeenCalledTimes(1);
  });
  it("never recreates a missing receipt during a repeat attempt", async () => {
    const sdk = transport("superadmin");sdk.gate.mockResolvedValue({ revision: 10 });
    await expect(createCalendarRoleWriteQa(sdk, proposal).repeat()).rejects.toThrow();expect(sdk.repeat).not.toHaveBeenCalled();
  });
});
