// QA-only receipt replay. Never call the mutation writer without a committed receipt and inactive target.
const PACKET_HASH = "35aa3d85c2761161fb02fe6f76d672d865b028b66abd051e96eca25f5a1dd25b";
const fail = message => { throw Object.assign(new Error(message), { code: "calendar-write-validation" }); };
export async function validateMutationReplayPacket(text) {
  if (typeof text !== "string" || text.length > 100000) fail("ไฟล์ QA ไม่ถูกต้อง");
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text.replaceAll("\r\n", "\n").trimEnd()));
  const hash = [...new Uint8Array(bytes)].map(value => value.toString(16).padStart(2, "0")).join("");
  if (hash !== PACKET_HASH) fail("ไฟล์ QA ไม่ตรงกับชุดที่อนุมัติ");
  const packet = JSON.parse(text);
  if (packet.target !== "labboy-workload-app-staging" || packet.operations.length !== 4) fail("เป้าหมาย QA ไม่ถูกต้อง");
  return packet;
}
export function createMutationReceiptReplay(transport) {
  if (transport.projectId !== "labboy-workload-app-staging") throw new Error("Replay QA requires staging");
  return async (packet, index) => {
    if (!Number.isInteger(index) || index < 0 || index > 3) fail("เลือกรายการ QA ที่อนุมัติ");
    const user = await transport.identity(), uid = transport.getUid();
    if (!uid || user?.id !== uid || uid !== packet.actorUid || user.active !== true || user.role !== "superadmin" || user.calendarWriter !== true) fail("เฉพาะ Superadmin ผู้ทดสอบเดิม");
    const operation = packet.operations[index], source = operation.input.original.source;
    const active = () => { if (transport.getUid() !== uid) fail("เซสชัน QA เปลี่ยน กรุณาตรวจผลใหม่"); };
    const [gate, receipt, target] = await Promise.all([transport.read("calendarWriteState", "main"), transport.read("calendarWriteOperations", operation.operationId), transport.read(source.collection, source.documentId)]);
    active();
    const final = packet.operations[3].operationId;
    if (gate?.revision !== 17 || gate.operationId !== final || gate.updatedBy !== uid) fail("ยังไม่ถึงจุดตรวจส่งซ้ำหลังครบ 4 คำสั่ง");
    if (!receipt || receipt.schemaVersion !== 2 || receipt.count !== 1 || receipt.skipped !== 0 || receipt.createdBy !== uid || receipt.expectedVersion !== (index < 2 ? 0 : 1) || receipt.action !== operation.input.action || receipt.targetCollection !== source.collection || receipt.targetId !== source.documentId) fail("ไม่พบ receipt ที่ตรงชุดเดิม จึงไม่เรียก writer");
    const cancel = packet.operations[index % 2 + 2].operationId;
    if (!target || target.isActive !== false || target.mutationVersion !== 2 || target.createdBy !== uid || target.operationId !== source.operationId || target.lastOperationId !== cancel) fail("สถานะรายการ QA เปลี่ยน จึงไม่เรียก writer");
    const result = await transport.mutate(operation.input);
    active();
    if (!result.repeated || result.changed !== 0 || result.operationId !== operation.operationId) fail("ผลส่งซ้ำผิดจากที่กำหนด ให้หยุดและตรวจ audit");
    const after = await transport.read("calendarWriteState", "main");active();
    if (after?.revision !== 17 || after.operationId !== final || after.updatedBy !== uid) fail("revision เปลี่ยนหลังตรวจส่งซ้ำ");
    return { ...result, action: "replay" };
  };
}
