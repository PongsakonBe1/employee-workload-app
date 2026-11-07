// Isolated in-memory adapter. Never imports Firebase, Auth or a production client.
import { validCalendarDate } from "./calendarView";
import { canManageEquipment, canBorrowEquipment, canUndoPreview, equipmentDraft, normalizeEquipment, EQUIPMENT_CONDITIONS } from "./equipmentPreview";
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
  const base = freeze(copy({
      ...initialData,
      devices: initialData.devices.map(normalizeEquipment)
    })),
    listeners = new Set(),
    requests = new Map();
  let snapshot = freeze({
      data: base,
      revision: 0,
      undo: null
    }),
    previous = null,
    sequence = Math.max(0, ...base.logs.map(row => row.sequence || 0)),
    failOnce = false,
    catalog = base;
  function project(logs, sourceCatalog = catalog) {
    const data = copy(sourceCatalog);
    data.logs = logs;
    for (const row of [...logs].sort((a, b) => (a.sequence || 0) - (b.sequence || 0))) {
      const effect = row.resource;
      if (!effect) continue;
      const collection = effect.kind === "room" ? data.rooms : effect.kind === "device" ? data.devices : null;
      const target = collection?.find(item => item.id === effect.id);
      if (!target) throw Error("ไม่พบห้องหรืออุปกรณ์ในข้อมูลตัวอย่าง");
      if (effect.kind === "room" && typeof effect.open === "boolean") target.open = effect.open;else if (effect.kind === "device" && (effect.student === null || /^[0-9]{13}$/.test(effect.student))) {
        target.student = effect.student;
        if (effect.student === null) {
          target.lastReturnCondition = Object.hasOwn(EQUIPMENT_CONDITIONS, effect.condition) ? effect.condition : "unknown";
          if (target.lastReturnCondition !== "unknown" && (row.sequence || 0) > (target.conditionAsOfSequence ?? -1)) target.condition = target.lastReturnCondition;
        }
      } else throw Error("สถานะทรัพยากรไม่ถูกต้อง");
    }
    data.devices = data.devices.map(normalizeEquipment);
    return data;
  }
  function transact({
    kind = "create",
    entries = [],
    ids = [],
    actor,
    requestId,
    expectedRevision = snapshot.revision,
    now = Date.now(),
    device
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
    let logs,
      affected,
      nextCatalog = catalog;
    if (kind === "create") {
      if (!entries.length || entries.some(row => !row.employeeId || actor.role === "staff" && row.employeeId !== actor.id)) throw Error("ผู้ปฏิบัติงานไม่ถูกต้อง");
      if (entries.some(row => !validCalendarDate(row.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(row.time || "") || !row.minorTask?.trim() || row.requireRecipient && !row.recipient?.trim() || row.requireComment && !row.comment?.trim())) throw Error("ข้อมูลบันทึกงานไม่ครบหรือไม่ถูกต้อง");
      const pendingDevices = copy(before.devices);
      for (const row of entries.filter(item => item.resource?.kind === "device")) {
        const target = pendingDevices.find(item => item.id === row.resource.id);
        if (!target) throw Error("ไม่พบอุปกรณ์ในทะเบียน");
        if (row.resource.student === null) {
          if (!target.student) throw Error("อุปกรณ์นี้ไม่มีผู้ยืมค้าง");
          if (row.resource.condition !== undefined && !Object.hasOwn(EQUIPMENT_CONDITIONS, row.resource.condition)) throw Error("สภาพตอนคืนไม่ถูกต้อง");
          target.student = null;
          if (row.resource.condition && row.resource.condition !== "unknown") {
            target.condition = row.resource.condition;
            target.available = target.active && target.condition === "normal";
          }
        } else {
          if (!canBorrowEquipment(target) || !/^[0-9]{13}$/.test(row.resource.student)) throw Error("อุปกรณ์ไม่พร้อมให้ยืมหรือรหัสไม่ถูกต้อง");
          target.student = row.resource.student;
        }
      }
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
    } else if (["device-create", "device-update", "device-toggle"].includes(kind)) {
      if (!canManageEquipment(actor)) throw Error("เฉพาะผู้ดูแลที่จัดการทะเบียนได้");
      nextCatalog = copy(catalog);
      logs = before.logs;
      if (kind === "device-create") {
        const fields = equipmentDraft(device, before.devices);
        let id;
        do {
          id = `preview-device-${++sequence}`;
        } while (before.devices.some(item => item.id === id));
        const added = normalizeEquipment({
          ...fields,
          id,
          student: null,
          conditionAsOfSequence: sequence
        });
        nextCatalog.devices.push(added);
        affected = [added];
      } else {
        const item = before.devices.find(row => row.id === ids[0]);
        if (ids.length !== 1 || !item) throw Error("ไม่พบอุปกรณ์ในทะเบียน");
        const fields = kind === "device-toggle" ? {
          active: !item.active
        } : equipmentDraft(device, before.devices, item.id);
        if (fields.kind && fields.kind !== item.kind && (item.student || logs.some(row => row.resource?.id === item.id))) throw Object.assign(Error("อุปกรณ์มีประวัติแล้ว คงประเภทเดิมเพื่อรักษาการจับคู่"), {
          field: "kind"
        });
        nextCatalog.devices = nextCatalog.devices.map(row => row.id === item.id ? normalizeEquipment({
          ...row,
          ...fields,
          ...(fields.condition && fields.condition !== item.condition ? {
            conditionAsOfSequence: sequence
          } : {})
        }) : row);
        affected = [item];
      }
    } else throw Error("ไม่รองรับคำสั่งนี้");
    const data = project(logs, nextCatalog),
      revision = snapshot.revision + 1;
    previous = {
      data: before,
      catalog
    };
    catalog = freeze(nextCatalog);
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
    if (!canUndoPreview(snapshot.undo, actor)) throw Error("ไม่มีสิทธิ์เลิกทำรายการนี้");
    catalog = previous.catalog;
    snapshot = freeze({
      data: previous.data,
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
