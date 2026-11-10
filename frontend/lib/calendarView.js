// Date-only UI logic; it never reads a service, account, or Firestore collection.
export const CALENDAR_ROOMS = ["401", "402", "406", "407"];
export const CALENDAR_KINDS = { classroom: "ตารางเรียน", dl: "Digital Literacy", exam: "สอบรายวิชา" };
// Stable room identities across views; colors resolve through light/dark UI tokens.
export const CALENDAR_ROOM_COLORS = { "401": "blue", "402": "amber", "406": "purple", "407": "green" };
export function calendarRoomColor(rooms, selectedRoom = "all") {
  if (selectedRoom !== "all" && rooms.includes(selectedRoom)) return CALENDAR_ROOM_COLORS[selectedRoom] || "shared";
  return rooms.length === 1 ? CALENDAR_ROOM_COLORS[rooms[0]] || "shared" : "shared";
}
export function calendarSemesterMatches(row, semester = "all") {
  // Legacy dated events can have no semester. Keep them visible instead of guessing a term.
  return semester === "all" || !row.semester?.trim() || row.semester === semester;
}
const iso = value => value.toISOString().slice(0, 10);
export function validCalendarDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value + "T12:00:00Z")) && iso(new Date(value + "T12:00:00Z")) === value;
}
function utc(value) { if (!validCalendarDate(value)) throw new Error("Invalid calendar date");return new Date(value + "T12:00:00Z"); }
export function addCalendarDays(value, amount) { const day = utc(value);day.setUTCDate(day.getUTCDate() + amount);return iso(day); }
export function addCalendarMonths(value, amount) {
  const day = utc(value), original = day.getUTCDate();day.setUTCDate(1);day.setUTCMonth(day.getUTCMonth() + amount);
  day.setUTCDate(Math.min(original, new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth() + 1, 0)).getUTCDate()));return iso(day);
}
export const calendarWeekday = value => (utc(value).getUTCDay() + 6) % 7;
export function calendarRange(value, mode) {
  utc(value);
  if (mode === "day") return { start: value, end: value };
  if (mode === "month") { const start = value.slice(0, 8) + "01";return { start, end: addCalendarDays(addCalendarMonths(start, 1), -1) }; }
  const start = addCalendarDays(value, -calendarWeekday(value));return { start, end: addCalendarDays(start, 6) };
}
export function calendarDates(start, end) {
  if (!validCalendarDate(start) || !validCalendarDate(end) || end < start) throw new Error("Invalid calendar range");
  const result = [];for (let day = start;day <= end;day = addCalendarDays(day, 1)) { if (result.length >= 400) throw new Error("Calendar range too large");result.push(day); }return result;
}
export function monthCalendarDates(value) {
  const range = calendarRange(value, "month"), start = addCalendarDays(range.start, -calendarWeekday(range.start));
  return calendarDates(start, addCalendarDays(range.end, 6 - calendarWeekday(range.end)));
}
export function calendarToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  return ["year", "month", "day"].map(type => parts.find(part => part.type === type).value).join("-");
}
export const calendarLabel = (value, options = { dateStyle: "long" }) => new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", ...options }).format(utc(value));
export function timeMinutes(value) { if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value || "")) return NaN;return Number(value.slice(0, 2)) * 60 + Number(value.slice(3)); }
export function expandCalendar(data, range, semester = "all") {
  const rows = data.events.filter(item => item.date >= range.start && item.date <= range.end && calendarSemesterMatches(item, semester)).map(item => ({ ...item, sourceId: item.id, recurring: false }));
  for (const date of calendarDates(range.start, range.end)) for (const rule of data.rules) {
    if (date >= rule.validFrom && date <= rule.validTo && calendarWeekday(date) === rule.weekday && (semester === "all" || rule.semester === semester)) rows.push({ ...rule, id: `${rule.id}:${date}`, sourceId: rule.id, date, recurring: true });
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start) || a.title.localeCompare(b.title));
}
export function filterCalendar(rows, filters) {
  const term = filters.query.trim().toLocaleLowerCase("th-TH");
  return rows.filter(row => calendarSemesterMatches(row, filters.semester) && filters.kinds.includes(row.kind) && (filters.room === "all" || row.rooms.includes(filters.room)) && (!term || `${row.title} ${row.teacher || ""} ${row.rooms.join(" ")}`.toLocaleLowerCase("th-TH").includes(term)));
}
export function calendarHolidays(data, date, options = { public: true, observance: false }) {
  return data.events.filter(item => item.start <= date && date < item.endExclusive && options[item.kind]);
}
export function layoutCalendarDay(rows) {
  const sorted = [...rows].sort((a, b) => timeMinutes(a.start) - timeMinutes(b.start) || timeMinutes(a.end) - timeMinutes(b.end));
  const result = [];let group = [], laneEnds = [], groupEnd = -1;
  const flush = () => { for (const row of group) result.push({ ...row, lanes: laneEnds.length });group = [];laneEnds = []; };
  for (const row of sorted) {
    const start = timeMinutes(row.start), end = timeMinutes(row.end);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
    if (start >= groupEnd) flush();
    let lane = laneEnds.findIndex(value => value <= start);if (lane < 0) lane = laneEnds.length;laneEnds[lane] = end;
    group.push({ ...row, lane });groupEnd = group.length === 1 ? end : Math.max(groupEnd, end);
  }
  flush();return result;
}
export function calendarConflicts(candidate, rows, excludedSource = null) {
  return rows.filter(row => row.sourceId !== excludedSource && row.date === candidate.date && row.rooms.some(room => candidate.rooms.includes(room)) && timeMinutes(candidate.start) < timeMinutes(row.end) && timeMinutes(row.start) < timeMinutes(candidate.end));
}
export function validateCalendarEntry(entry) {
  if (!entry.title?.trim()) return { field: "title", message: "ระบุชื่อวิชาหรือกิจกรรม" };
  if (!Object.hasOwn(CALENDAR_KINDS, entry.kind)) return { field: "kind", message: "เลือกประเภทกิจกรรม" };
  if (!validCalendarDate(entry.date)) return { field: "date", message: "เลือกวันที่ให้ถูกต้อง" };
  if (!Number.isFinite(timeMinutes(entry.start)) || !Number.isFinite(timeMinutes(entry.end)) || timeMinutes(entry.end) <= timeMinutes(entry.start)) return { field: "end", message: "เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มในวันเดียวกัน" };
  if (!entry.rooms?.length || entry.rooms.some(room => !CALENDAR_ROOMS.includes(room))) return { field: "rooms", message: "เลือกอย่างน้อย 1 ห้อง" };
  if (entry.kind === "dl" && (!Number.isInteger(Number(entry.participants)) || Number(entry.participants) < 1)) return { field: "participants", message: "จำนวนผู้เข้าสอบต้องเป็นจำนวนเต็มมากกว่า 0" };
  if (entry.kind === "dl" && !entry.proctors?.length) return { field: "proctors", message: "เลือกผู้คุมสอบอย่างน้อย 1 คน" };
  if (entry.repeat === "weekly" && (!validCalendarDate(entry.validTo) || entry.validTo < entry.date || entry.validTo > addCalendarDays(entry.date, 369))) return { field: "validTo", message: "เลือกวันสิ้นสุดตั้งแต่วันเริ่ม ภายในช่วงไม่เกิน 1 ปี" };
  return null;
}
