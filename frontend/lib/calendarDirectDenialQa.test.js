import { describe, it, expect, vi } from "vitest";
import { createCalendarDirectDenialQa, cutoverValueHash, TRUSTED_CUTOVER_RULES_HASH } from "./calendarDirectDenialQa.js";
const N = Date.parse("2027-06-01T10:00:00Z");
async function fixture() {
  const frozen = { target: "labboy-workload-app-staging", database: "(default)", cloudExecutionApproved: false, identities: { staff: "synthetic-staff", superadmin: "synthetic-superadmin" }, operations: [{ id: "manual", kind: "create", operationId: "op-" + "a".repeat(64), entries: [{ collection: "classroomSchedules", id: "cal-" + "b".repeat(64), value: { subject: "Synthetic manual" } }] }, {}, {}, {}, {}] };
  const expectedFrozenHash = await cutoverValueHash(frozen), expectedSnapshotHash = "c".repeat(64);
  const proof = { target: frozen.target, frozenHash: expectedFrozenHash, snapshotHash: expectedSnapshotHash, candidateRulesHash: TRUSTED_CUTOVER_RULES_HASH, sourceCommit: "2aa1bd27f1795890871297d1ffdf0d1d6acdd2e5", completed: 0, gateRevision: 17, auditHash: "d".repeat(64), auditedAt: new Date(N).toISOString(), readerChecksApproved: true, directWriteProbeApproved: true };
  let user = { uid: "synthetic-superadmin" };const reservations = new Set();
  const transport = {
    projectId: frozen.target, origin: "http://127.0.0.1:4311", getUser: () => user,
    reserve: vi.fn(async key => { if (reservations.has(key)) throw new Error("Durable slot used");reservations.add(key); }),
    profile: vi.fn(async uid => ({ role: uid === "synthetic-staff" ? "staff" : "superadmin", active: true, calendarWriter: uid !== "synthetic-staff" })),
    reader: vi.fn(async () => ({ complete: true })),
    health: vi.fn(async () => ({ ok: true, projectId: frozen.target, mode: "staging", protocol: 1, writesEnabled: false, connectivityEnabled: false, emulator: false })),
    schedule: vi.fn(async () => null),
    restrictedRead: vi.fn(async () => { throw Object.assign(new Error("Denied"), { code: "permission-denied" }); }),
    rawCommit: vi.fn(async () => { throw Object.assign(new Error("Denied"), { code: "permission-denied" }); })
  };
  let now = N;
  const make = () => createCalendarDirectDenialQa(transport, { frozen, proof, expectedFrozenHash, expectedSnapshotHash, now: () => now });
  return { frozen, proof, transport, make, user: value => { user = value; }, time: value => { now = value; } };
}
describe("direct SDK cutover denial controller", () => {
  it("accepts only a confirmed explicit denial, with fresh profile/peer and two denied restricted reads", async () => {
    const f = await fixture();expect(await f.make().probeDenial()).toEqual({ outcome: "permission-denied", stop: false, auditRequired: true });
    expect(f.transport.rawCommit).toHaveBeenCalledTimes(1);expect(f.transport.restrictedRead).toHaveBeenCalledTimes(2);
    expect(f.transport.rawCommit).toHaveBeenCalledWith(f.frozen.operations[0], "synthetic-superadmin");
  });
  it("does not treat cloud preparation or reader approval as write-probe approval", async () => {
    const f = await fixture();f.proof.directWriteProbeApproved = false;
    await expect(f.make().probeDenial()).rejects.toHaveProperty("code", "cutover-action-not-approved");
    expect(f.transport.reserve).not.toHaveBeenCalled();expect(f.transport.rawCommit).not.toHaveBeenCalled();
    f.proof.readerChecksApproved = false;await expect(f.make().verifyReader()).rejects.toHaveProperty("code", "cutover-action-not-approved");
  });
  it("rejects production, origin, frozen hash, candidate, snapshot and malformed approval before SDK IO", async () => {
    for (const mutate of [
      f => { f.transport.projectId = "labboy-workload-app"; },
      f => { f.transport.origin = "https://example.test"; },
      f => { f.frozen.operations[0].entries[0].value.subject = "Changed"; },
      f => { f.proof.candidateRulesHash = "different"; },
      f => { f.proof.snapshotHash = "different"; },
      f => { f.proof.directWriteProbeApproved = "true"; }
    ]) {
      const f = await fixture();mutate(f);
      try { await f.make().probeDenial();throw new Error("Unexpected success"); } catch (error) { expect(error.message).not.toBe("Unexpected success"); }
      expect(f.transport.reserve).not.toHaveBeenCalled();expect(f.transport.rawCommit).not.toHaveBeenCalled();
    }
  });
  it("expires old or future proofs without reserving or sending", async () => {
    for (const offset of [120001, -5001]) { const f = await fixture();f.time(N + offset);await expect(f.make().probeDenial()).rejects.toHaveProperty("code", "cutover-proof-expired");expect(f.transport.reserve).not.toHaveBeenCalled(); }
  });
  it("reserves once across repeated calls and reconstructed controllers, including an early failure", async () => {
    const f = await fixture(), qa = f.make();await qa.probeDenial();
    await expect(qa.probeDenial()).rejects.toHaveProperty("code", "cutover-attempt-consumed");
    await expect(f.make().probeDenial()).rejects.toThrow("Durable slot used");expect(f.transport.rawCommit).toHaveBeenCalledTimes(1);
    const early = await fixture();early.transport.profile.mockResolvedValue({ role: "superadmin", active: false, calendarWriter: true });
    await expect(early.make().probeDenial()).rejects.toHaveProperty("code", "cutover-profile-drift");
    await expect(early.make().probeDenial()).rejects.toThrow("Durable slot used");expect(early.transport.rawCommit).not.toHaveBeenCalled();
  });
  it("Staff can verify readers but cannot send a batch; unknown identities cannot read a profile", async () => {
    const f = await fixture();f.user({ uid: "synthetic-staff" });
    expect(await f.make().verifyReader()).toEqual({ outcome: "reader-verified", alias: "staff", writes: 0 });
    await expect(f.make().probeDenial()).rejects.toHaveProperty("code", "cutover-actor-mismatch");expect(f.transport.rawCommit).not.toHaveBeenCalled();
    const unknown = await fixture();unknown.user({ uid: "synthetic-unknown" });await expect(unknown.make().verifyReader()).rejects.toHaveProperty("code", "cutover-actor-mismatch");expect(unknown.transport.profile).not.toHaveBeenCalled();
  });
  it("stops on an enabled writer, existing target or a restricted read allowed by Rules", async () => {
    for (const mutate of [
      f => { f.transport.health.mockResolvedValue({ ok: true, projectId: f.frozen.target, mode: "staging", protocol: 1, writesEnabled: true, connectivityEnabled: false, emulator: false }); },
      f => { f.transport.schedule.mockResolvedValue({ exists: true }); },
      f => { f.transport.restrictedRead.mockResolvedValue(null); }
    ]) { const f = await fixture();mutate(f);await expect(f.make().probeDenial()).rejects.toBeTruthy();expect(f.transport.rawCommit).not.toHaveBeenCalled(); }
  });
  it("stops on session change before commit, including re-login of the same UID", async () => {
    const f = await fixture();f.transport.profile.mockImplementation(async () => { f.user({ uid: "synthetic-superadmin" });return { role: "superadmin", active: true, calendarWriter: true }; });
    await expect(f.make().probeDenial()).rejects.toHaveProperty("code", "session-changed");expect(f.transport.rawCommit).not.toHaveBeenCalled();
  });
  it("prevents double submit while a batch is pending, and labels network failure as uncertain", async () => {
    const f = await fixture();let reject;
    f.transport.rawCommit.mockImplementation(() => new Promise((_, fail) => { reject = fail; }));
    const qa = f.make(), pending = qa.probeDenial();await vi.waitFor(() => expect(f.transport.rawCommit).toHaveBeenCalledTimes(1));
    await expect(qa.probeDenial()).rejects.toHaveProperty("code", "cutover-busy");reject(new Error("Lost response"));
    expect(await pending).toEqual({ outcome: "uncertain", stop: true, auditRequired: true });
  });
  it("reports unexpected success as a stop condition and never retries or reverses it", async () => {
    const f = await fixture();f.transport.rawCommit.mockResolvedValue(undefined);
    expect(await f.make().probeDenial()).toEqual({ outcome: "unexpected-write", stop: true, auditRequired: true });expect(f.transport.rawCommit).toHaveBeenCalledTimes(1);
  });
  it("freezes loaded inputs instead of re-reading mutable objects at commit time", async () => {
    const f = await fixture(), qa = f.make();f.frozen.operations[0].entries[0].value.subject = "Changed after load";
    await qa.probeDenial();expect(f.transport.rawCommit.mock.calls[0][0].entries[0].value.subject).toBe("Synthetic manual");
  });
});
