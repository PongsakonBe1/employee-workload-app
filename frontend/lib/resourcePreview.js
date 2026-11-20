import { validCalendarDate } from "./calendarView";
import { canViewPreviewLog } from "./previewLedger";
import { equipmentState, EQUIPMENT_CONDITIONS, EQUIPMENT_KINDS } from "./equipmentPreview";
import { roomState } from "./resourceWorklog";
export const RESOURCE_STATUS_COLUMNS = ["รหัส", "ประเภท", "สังกัดปัจจุบัน", "สถานะ", "สภาพล่าสุด", "บาร์โค้ด", "ลำดับแสดงผล"];
export const RESOURCE_HISTORY_COLUMNS = ["วันที่", "เวลา", "รหัสทรัพยากร", "รายการ", "ผู้ปฏิบัติงาน", "สถานะที่บันทึก", "รหัสอุปกรณ์ขณะทำรายการ", "สังกัดขณะทำรายการ"];
const authorize = actor => {
  if (!actor?.id || !["staff", "admin", "superadmin"].includes(actor.role)) throw Error("ไม่มีสิทธิ์ดูหรือส่งออกทรัพยากร");
};
export function findPreviewResource(data, selection) {
  if (!selection?.id || !["room", "device"].includes(selection.kind)) throw Error("เลือกห้องหรืออุปกรณ์ให้ถูกต้อง");
  const item = data[selection.kind === "room" ? "rooms" : "devices"].find(item => item.id === selection.id);
  if (!item) throw Error("ไม่พบทรัพยากรในข้อมูลตัวอย่าง");
  return item;
}
export function resourceStatusRows(data, actor) {
  authorize(actor);
  // New scalar rows are a snapshot. Borrower identifiers never enter this export.
  return [...data.rooms.map(room => ({
    id: room.id,
    type: "ห้อง",
    location: `ชั้น ${room.floor}`,
    status: roomState(room).label,
    condition: "—",
    barcode: "—",
    order: "—"
  })), ...data.devices.map(item => ({
    id: item.assetCode || item.id,
    type: EQUIPMENT_KINDS[item.kind] || "อุปกรณ์",
    location: item.location || "ไม่ระบุ",
    status: equipmentState(item).id === "unavailable" ? "ไม่พร้อมยืม" : equipmentState(item).label,
    condition: EQUIPMENT_CONDITIONS[item.condition] || "ยังไม่ระบุ",
    barcode: item.barcode || "—",
    order: item.order ?? "—"
  }))];
}
export function resourceHistoryRows(data, actor, selection, range) {
  authorize(actor);
  findPreviewResource(data, selection);
  if (!validCalendarDate(range.start) || !validCalendarDate(range.end) || range.end < range.start) throw Error("ระบุช่วงวันที่ให้ถูกต้อง");
  return data.logs.filter(row => {
    const exact = row.resource ? row.resource.kind === selection.kind && row.resource.id === selection.id : selection.kind === "device" && (row.equipmentId || row.equipment?.id) === selection.id;
    return exact && canViewPreviewLog(row, actor) && row.date >= range.start && row.date <= range.end;
  }).sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`) || (b.sequence || 0) - (a.sequence || 0)).map(row => ({
    id: row.id,
    resourceId: selection.id,
    date: row.date,
    time: row.time,
    title: row.title || row.minorTask || "บันทึกงาน",
    person: row.person || "ไม่ระบุ",
    action: selection.kind === "room" ? typeof row.resource?.open === "boolean" ? row.resource.open ? "เปิดห้อง" : "ปิดห้อง" : "ไม่ระบุสถานะ" : row.resource?.student === null ? "คืน" : row.resource?.student ? "ยืม" : row.minorTask?.startsWith("คืน") ? "คืน" : row.minorTask?.startsWith("ยืม") ? "ยืม" : "ไม่ระบุสถานะ",
    assetCodeAtEvent: row.assetCodeAtEvent || "ไม่ระบุ",
    locationAtEvent: row.locationAtEvent || "ไม่ระบุ"
  }));
}
function csv(headers, rows) {
  const cell = value => {
    const text = String(value ?? "");
    return `"${(/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text) ? "'" + text : text).replaceAll('"', '""')}"`;
  };
  return [headers, ...rows].map(row => row.map(cell).join(",")).join("\r\n");
}
export const resourceStatusCSV = rows => csv(RESOURCE_STATUS_COLUMNS, rows.map(row => [row.id, row.type, row.location, row.status, row.condition, row.barcode, row.order]));
export const resourceHistoryCSV = rows => csv(RESOURCE_HISTORY_COLUMNS, rows.map(row => [row.date, row.time, row.resourceId, row.title, row.person, row.action, row.assetCodeAtEvent, row.locationAtEvent]));
