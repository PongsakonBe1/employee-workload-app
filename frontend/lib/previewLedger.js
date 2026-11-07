// Isolated in-memory adapter. Never imports Firebase, Auth or a production client.
import { validCalendarDate } from "./calendarView";
const copy = value => structuredClone(value);
const freeze = value => {
  Object.freeze(value);
  Object.values(value).forEach(item => {
    if (item && typeof item === "object" && !Object.isFrozen(item)) freeze(item);
  });
  return value;
};
const roles = ["staff", "admin", "superadmin"];
export const canViewPreviewLog = (row, actor) => Boolean(actor?.id && roles.includes(actor.role) && (actor.role !== "staff" || row.employeeId === actor.id));
export const canManagePreviewLog = (row, actor, now = Date.now()) => canViewPreviewLog(row, actor) && (actor.role !== "staff" || !row.locked && now < Date.parse(`${row.date}T23:59:00+07:00`));
export function createPreviewLedger(initialData) {
  const base = freeze(copy(initialData)),
    listeners = new Set(),
    requests = new Map();
  let snapshot = freeze({
      data: base,
      revision: 0,
      undo: null
    }),
    previous = null,
    sequence = 0,
    failOnce = false;
  function project(logs) {
    const data = copy(base);
    data.logs = logs;
    for (const row of [...logs].sort((a, b) => (a.sequence || 0) - (b.sequence || 0))) {
      const effect = row.resource;
      if (!effect) continue;
      const collection = effect.kind === "room" ? data.rooms : effect.kind === "device" ? data.devices : null;
      const target = collection?.find(item => item.id === effect.id);
      if (!target) throw Error("ไม่พบห้องหรืออุปกรณ์ในข้อมูลตัวอย่าง");
      if (effect.kind === "room" && typeof effect.open === "boolean") target.open = effect.open;else if (effect.kind === "device" && (effect.student === null || /^[0-9]{13}$/.test(effect.student))) target.student = effect.student;else throw Error("สถานะทรัพยากรไม่ถูกต้อง");
    }
    return data;
  }
  function transact({
    kind = "create",
    entries = [],
    ids = [],
    actor,
    requestId,
    expectedRevision = snapshot.revision,
    now = Date.now()
  }) {
    if (!actor?.id || !roles.includes(actor.role)) throw Error("ไม่มีสิทธิ์ทำรายการ");
    if (!requestId) throw Error("ต้องมีรหัสคำขอ");
    const key = actor.id + ":" + requestId;
    if (requests.has(key)) return {
      ...requests.get(key),
      duplicate: true
    };
    if (expectedRevision !== snapshot.revision) throw Error("ข้อมูลเปลี่ยนแล้ว กรุณาเปิดรายการอีกครั้ง");
    if (failOnce) {
      failOnce = false;
      throw Error("จำลองบันทึกไม่สำเร็จ — ข้อมูลยังไม่เปลี่ยน ลองอีกครั้งได้");
    }
    const before = snapshot.data;
    let logs, affected;
    if (kind === "create") {
      if (!entries.length || entries.some(row => !row.employeeId || actor.role === "staff" && row.employeeId !== actor.id)) throw Error("ผู้ปฏิบัติงานไม่ถูกต้อง");
      if (entries.some(row => !validCalendarDate(row.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(row.time || "") || !row.minorTask?.trim() || row.requireRecipient && !row.recipient?.trim() || row.requireComment && !row.comment?.trim())) throw Error("ข้อมูลบันทึกงานไม่ครบหรือไม่ถูกต้อง");
      affected = entries.map(row => ({
        ...copy(row),
        sequence: ++sequence,
        id: `preview-ledger-${sequence}`
      }));
      logs = [...affected, ...before.logs];
    } else if (kind === "edit" || kind === "delete") {
      affected = before.logs.filter(row => ids.includes(row.id));
      if (!ids.length || new Set(ids).size !== ids.length || affected.length !== ids.length || affected.some(row => !canManagePreviewLog(row, actor, now))) throw Error("รายการถูกล็อกหรือไม่มีสิทธิ์แก้ไข");
      if (kind === "delete") logs = before.logs.filter(row => !ids.includes(row.id));else {
        if (ids.length !== 1 || entries.length !== 1) throw Error("แก้ไขได้ครั้งละ 1 รายการ");
        const {
          recipient,
          comment
        } = entries[0];
        if (typeof recipient !== "string" || typeof comment !== "string") throw Error("รายละเอียดไม่ถูกต้อง");
        const row = affected[0];
        if (row.requireRecipient && !recipient.trim() || row.requireComment && !comment.trim() || row.resource && recipient !== row.recipient) throw Error("คงข้อมูลผู้รับบริการและรายละเอียดที่จำเป็นของรายการเดิม");
        logs = before.logs.map(row => row.id === ids[0] ? {
          ...row,
          recipient: recipient.trim(),
          comment: comment.trim(),
          detail: [recipient.trim(), comment.trim()].filter(Boolean).join(" · ")
        } : row);
      }
    } else throw Error("ไม่รองรับคำสั่งนี้");
    const data = project(logs),
      revision = snapshot.revision + 1;
    previous = before;
    const undo = {
      id: `${actor.id}:${requestId}:${revision}`,
      count: affected.length,
      actorId: actor.id,
      revision,
      kind
    };
    snapshot = freeze({
      data,
      revision,
      undo
    });
    const result = {
      count: affected.length,
      ids: affected.map(row => row.id),
      revision
    };
    requests.set(key, result);
    listeners.forEach(listener => listener());
    return result;
  }
  function undo(actor, token) {
    if (!snapshot.undo || token !== snapshot.undo.id || snapshot.undo.revision !== snapshot.revision) throw Error("รายการเลิกทำเปลี่ยนแล้ว");
    if (!actor?.id || !roles.includes(actor.role) || actor.role === "staff" && actor.id !== snapshot.undo.actorId) throw Error("ไม่มีสิทธิ์เลิกทำรายการนี้");
    snapshot = freeze({
      data: previous,
      revision: snapshot.revision + 1,
      undo: null
    });
    previous = null;
    listeners.forEach(listener => listener());
  }
  snapshot = freeze({
    data: project(base.logs),
    revision: 0,
    undo: null
  });
  return {
    getSnapshot: () => snapshot,
    subscribe: listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    transact,
    undo,
    failNext: () => {
      failOnce = true;
    }
  };
}
