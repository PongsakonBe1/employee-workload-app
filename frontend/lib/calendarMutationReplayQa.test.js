import { describe, it, expect, vi } from "vitest";
import { createMutationReceiptReplay, validateMutationReplayPacket } from "./calendarMutationReplayQa.js";
function fixture() {
  const actorUid = "synthetic-super", source = { collection: "classroomSchedules", documentId: "synthetic-target", operationId: "synthetic-create" };
  const packet = { actorUid, operations: [0,1,2,3].map(index => ({ operationId: "synthetic-op-" + index, input: { action: index < 2 ? "edit" : "cancel", original: { source } } })) };
  const gate = { revision: 17, operationId: "synthetic-op-3", updatedBy: actorUid };
  const receipt = { schemaVersion: 2, count: 1, skipped: 0, createdBy: actorUid, expectedVersion: 0, action: "edit", targetCollection: source.collection, targetId: source.documentId };
  const target = { isActive: false, mutationVersion: 2, createdBy: actorUid, operationId: source.operationId, lastOperationId: "synthetic-op-2" };
  const transport = { projectId: "labboy-workload-app-staging", getUid: vi.fn(() => actorUid), identity: vi.fn(async () => ({ id: actorUid, role: "superadmin", active: true, calendarWriter: true })), read: vi.fn(async collection => collection === "calendarWriteState" ? gate : collection === "calendarWriteOperations" ? receipt : target), mutate: vi.fn(async () => ({ repeated: true, changed: 0, operationId: "synthetic-op-0" })) };
  return { packet, transport, gate, receipt, target, replay: createMutationReceiptReplay(transport) };
}
describe("receipt-only mutation replay QA", () => {
  it("fails closed on a modified or missing reviewed packet", async () => {
    for (const text of [undefined, "{}", '{"target":"labboy-workload-app"}']) await expect(validateMutationReplayPacket(text)).rejects.toHaveProperty("code", "calendar-write-validation");
  });
  it("requires staging and the exact active Superadmin before reading receipts", async () => {
    expect(() => createMutationReceiptReplay({ projectId: "labboy-workload-app" })).toThrow();
    const f = fixture();f.transport.identity.mockResolvedValueOnce({ id: "synthetic-super", role: "staff", active: true, calendarWriter: false });
    await expect(f.replay(f.packet,0)).rejects.toThrow("Superadmin");expect(f.transport.read).not.toHaveBeenCalled();expect(f.transport.mutate).not.toHaveBeenCalled();
  });
  it("calls the existing writer with the frozen original only after gate/receipt/inactive checks", async () => {
    const f = fixture();await expect(f.replay(f.packet,0)).resolves.toMatchObject({ action: "replay", changed: 0, repeated: true });expect(f.transport.mutate).toHaveBeenCalledExactlyOnceWith(f.packet.operations[0].input);
  });
  it.each(["gate", "receipt", "target"])("never calls writer when %s is not ready", async part => {
    const f = fixture();if(part === "gate")f.gate.revision=13;if(part === "receipt")f.receipt.count=0;if(part === "target")f.target.isActive=true;
    await expect(f.replay(f.packet,0)).rejects.toHaveProperty("code","calendar-write-validation");expect(f.transport.mutate).not.toHaveBeenCalled();
  });
  it("rejects an account change while reads are pending", async () => {
    const f=fixture();let changed=false;f.transport.read.mockImplementation(async collection=>{changed=true;return collection==="calendarWriteState"?f.gate:collection==="calendarWriteOperations"?f.receipt:f.target;});f.transport.getUid.mockImplementation(()=>changed?null:"synthetic-super");
    await expect(f.replay(f.packet,0)).rejects.toThrow("เซสชัน");expect(f.transport.mutate).not.toHaveBeenCalled();
  });
  it("reports an unexpected mutation result or changed gate instead of claiming successful replay", async () => {
    const f=fixture();f.transport.mutate.mockResolvedValueOnce({ repeated:false,changed:1 });await expect(f.replay(f.packet,0)).rejects.toThrow("ผลส่งซ้ำผิด");
    const other=fixture();other.transport.mutate.mockImplementation(async()=>{other.gate.revision=18;return{repeated:true,changed:0,operationId:"synthetic-op-0"};});await expect(other.replay(other.packet,0)).rejects.toThrow("revision");
  });
});
