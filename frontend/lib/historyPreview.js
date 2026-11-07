import { calendarRange, validCalendarDate } from "./calendarView";
import { canViewPreviewLog } from "./previewLedger";
export function historyRows(rows, actor, filters) {
  if (!validCalendarDate(filters.start) || !validCalendarDate(filters.end) || filters.end < filters.start) throw Error("ระบุช่วงวันที่ให้ถูกต้อง");
  const text = (filters.search || "").trim().toLocaleLowerCase("th");
  return rows.filter(row => canViewPreviewLog(row, actor) && row.date >= filters.start && row.date <= filters.end && (actor.role === "staff" || !filters.person || filters.person === "all" || row.employeeId === filters.person) && (!text || [row.minorTask, row.title, row.person, row.recipient, row.comment, row.detail].join(" ").toLocaleLowerCase("th").includes(text))).sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`) || (b.sequence || 0) - (a.sequence || 0));
}
export const historyInitialRange = date => calendarRange(date, "week");
export function historyCSV(rows) {
  const cell = value => {
    const text = String(value ?? "");
    return `"${(/^[\s]*[=+@-]/.test(text) ? "'" + text : text).replaceAll('"', '""')}"`;
  };
  return [["วันที่", "เวลา", "ผู้ปฏิบัติงาน", "หัวข้อรอง", "ผู้รับบริการ", "รายละเอียด"], ...rows.map(row => [row.date, row.time, row.person, row.minorTask, row.recipient, row.comment])].map(row => row.map(cell).join(",")).join("\r\n");
}
