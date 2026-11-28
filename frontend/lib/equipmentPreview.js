import { validCalendarDate } from "./calendarView";
export { equipmentRange } from "./equipmentRange";
export const EQUIPMENT_KINDS = {
  headphones: "หูฟัง",
  plug: "ปลั๊กไฟ",
  usb: "USB"
};
export const EQUIPMENT_CONDITIONS = {
  normal: "สมบูรณ์",
  damaged: "ชำรุด",
  lost: "สูญหาย",
  unknown: "ยังไม่ระบุ"
};
export const canManageEquipment = actor => Boolean(actor?.id && ["admin", "superadmin"].includes(actor.role));
export const canUndoPreview = (undo, actor) => Boolean(undo && actor?.id && ["staff", "admin", "superadmin"].includes(actor.role) && (/^(device|template)-/.test(undo.kind) ? canManageEquipment(actor) : actor.role !== "staff" || undo.actorId === actor.id));
export function normalizeEquipment(item) {
  const condition = Object.hasOwn(EQUIPMENT_CONDITIONS, item.condition) ? item.condition : item.available === false ? "unknown" : "normal";
  return {
    ...item,
    assetCode: item.assetCode || item.id,
    barcode: item.barcode || "",
    order: item.order || 0,
    active: item.active !== false,
    condition,
    available: item.active !== false && condition === "normal"
  };
}
export const canBorrowEquipment = item => Boolean(item && !item.student && item.active !== false && item.available && item.condition === "normal");
export const canReturnEquipment = item => Boolean(item?.student);
export function equipmentState(item) {
  if (item.student) return {
    id: "borrowed",
    label: item.active === false ? "กำลังยืม · หยุดใช้หลังคืน" : "กำลังยืม",
    tone: "blue"
  };
  if (item.active === false) return {
    id: "inactive",
    label: "หยุดใช้งาน",
    tone: "neutral"
  };
  if (!canBorrowEquipment(item)) return {
    id: "unavailable",
    label: EQUIPMENT_CONDITIONS[item.condition] || "ไม่พร้อมใช้",
    tone: item.condition === "lost" ? "red" : "amber"
  };
  return {
    id: "ready",
    label: "พร้อมยืม",
    tone: "green"
  };
}
export function equipmentDraft(value, devices, currentId) {
  const fail = (field, message) => {
    throw Object.assign(new Error(message), {
      field
    });
  };
  const fields = {};
  for (const field of ["name", "assetCode", "location", "barcode"]) {
    fields[field] = String(value[field] ?? "").trim();
    if (field !== "barcode" && !fields[field] || fields[field].length > 120) fail(field, "ระบุชื่อ รหัส และสังกัด ความยาวไม่เกิน 120 ตัวอักษร");
  }
  if (!Object.hasOwn(EQUIPMENT_KINDS, value.kind)) fail("kind", "เลือกประเภทอุปกรณ์");
  if (!Object.hasOwn(EQUIPMENT_CONDITIONS, value.condition)) fail("condition", "เลือกสภาพล่าสุดที่ทราบ");
  const order = Number(value.order);
  if (value.order === "" || !Number.isInteger(order) || order < 0 || order > 99999) fail("order", "ลำดับต้องเป็นจำนวนเต็ม 0–99999");
  if (typeof value.active !== "boolean") fail("active", "ระบุสถานะใช้งาน");
  const keys = [fields.assetCode, fields.barcode].filter(Boolean).map(key => key.toLocaleLowerCase());
  if (devices.some(item => item.id !== currentId && [item.assetCode || item.id, item.barcode].filter(Boolean).some(key => keys.includes(key.toLocaleLowerCase())))) fail("assetCode", "รหัสหรือบาร์โค้ดนี้มีในทะเบียนแล้ว");
  return {
    ...fields,
    kind: value.kind,
    condition: value.condition,
    order,
    active: value.active
  };
}
export function equipmentList(devices, filters = {}) {
  const search = (filters.search || "").trim().toLocaleLowerCase();
  return devices.filter(item => (filters.includeInactive || item.active !== false || item.student) && (!filters.kind || filters.kind === "all" || item.kind === filters.kind) && (!filters.location || filters.location === "all" || item.location === filters.location) && (!filters.status || filters.status === "all" || equipmentState(item).id === filters.status) && (!search || [item.name, item.assetCode, item.barcode, item.location].join(" ").toLocaleLowerCase().includes(search))).sort((a, b) => a.order - b.order || a.assetCode.localeCompare(b.assetCode));
}
export function equipmentSummary(data, range, filters = {}) {
  if (!validCalendarDate(range.start) || !validCalendarDate(range.end) || range.end < range.start) throw Error("ระบุช่วงวันที่ให้ถูกต้อง");
  const devices = data.devices.filter(item => (!filters.kind || filters.kind === "all" || item.kind === filters.kind) && (!filters.location || filters.location === "all" || item.location === filters.location));
  const ids = new Set(devices.map(item => item.id));
  const taskKind = {
    ยืมหูฟัง: "headphones",
    คืนหูฟัง: "headphones",
    ยืมปลั๊กไฟ: "plug",
    คืนปลั๊กไฟ: "plug",
    "ยืม USB": "usb",
    "คืน USB": "usb"
  };
  const events = data.logs.filter(row => row.date >= range.start && row.date <= range.end && (!filters.person || filters.person === "all" || row.employeeId === filters.person) && (row.resource?.kind === "device" || Object.hasOwn(taskKind, row.minorTask))).map(row => {
    const id = row.resource?.id || row.equipmentId || row.equipment?.id;
    const asset = data.devices.find(item => item.id === id);
    const rawCondition = row.returnCondition || row.equipmentCondition || row.resource?.condition;
    return {
      ...row,
      asset,
      action: row.resource?.kind === "device" ? row.resource.student === null ? "return" : "borrow" : row.minorTask.startsWith("คืน") ? "return" : "borrow",
      equipmentKind: asset?.kind || taskKind[row.minorTask],
      returnCondition: Object.hasOwn(EQUIPMENT_CONDITIONS, rawCondition) ? rawCondition : "unknown"
    };
  }).filter(row => !filters.kind || filters.kind === "all" || row.equipmentKind === filters.kind);
  const matched = events.filter(row => row.asset && ids.has(row.asset.id));
  const borrows = matched.filter(row => row.action === "borrow"),
    returns = matched.filter(row => row.action === "return");
  const ranking = devices.map(item => ({
    ...item,
    borrows: borrows.filter(row => row.asset.id === item.id).length,
    returns: returns.filter(row => row.asset.id === item.id).length
  })).sort((a, b) => b.borrows - a.borrows || a.assetCode.localeCompare(b.assetCode));
  return {
    devices,
    events: matched,
    ranking,
    borrows: borrows.length,
    returns: returns.length,
    outstanding: devices.filter(item => item.student).length,
    unmatched: events.filter(row => !row.asset).length,
    unmatchedEvents: events.filter(row => !row.asset),
    unknownEventLocation: matched.filter(row => !row.locationAtEvent).length,
    returnConditions: Object.fromEntries(Object.keys(EQUIPMENT_CONDITIONS).map(condition => [condition, returns.filter(row => row.returnCondition === condition).length]))
  };
}
