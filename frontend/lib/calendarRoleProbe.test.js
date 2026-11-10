import { describe, it, expect, vi } from "vitest";
import { CALENDAR_ROLE_QA_RECEIPT, probeCalendarWriterReads } from "./calendarRoleProbe.js";
describe("read-only role QA probe", () => {
  it("reads only the gate and the existing approved receipt, disclosing only existence/revision", async () => {
    const read = vi.fn(async () => ({ exists: () => true, data: () => ({ revision: 9, createdBy: "private-uid", unrelated: "private" }) }));
    expect(await probeCalendarWriterReads(read, () => true)).toEqual({ gate: { outcome: "found", revision: 9 }, receipt: { outcome: "found" } });
    expect(read.mock.calls).toEqual([["calendarWriteState", "main"], ["calendarWriteOperations", CALENDAR_ROLE_QA_RECEIPT]]);
  });
  it("records actual SDK denials separately from other failures", async () => {
    const read = vi.fn().mockRejectedValueOnce({ code: "permission-denied", message: "private details" }).mockRejectedValueOnce({ code: "unavailable" });
    expect(await probeCalendarWriterReads(read, () => true)).toEqual({ gate: { outcome: "permission-denied" }, receipt: { outcome: "error" } });
  });
  it("distinguishes permitted reads of missing documents from denied reads", async () => {
    const read = vi.fn(async () => ({ exists: () => false, data: () => { throw new Error("must not inspect missing data"); } }));
    expect(await probeCalendarWriterReads(read, () => true)).toEqual({ gate: { outcome: "missing", revision: null }, receipt: { outcome: "missing" } });
  });
  it("never initiates reads without an authenticated session", async () => {
    const read = vi.fn();await expect(probeCalendarWriterReads(read, () => false)).rejects.toMatchObject({ code: "unauthenticated" });expect(read).not.toHaveBeenCalled();
  });
  it("discards results when sign-out occurs during either read", async () => {
    let active = true;
    const read = vi.fn(async () => { active = false;return { exists: () => true, data: () => ({ revision: 9 }) }; });
    await expect(probeCalendarWriterReads(read, () => active)).rejects.toMatchObject({ code: "session-changed" });
  });
});
