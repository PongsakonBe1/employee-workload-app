// Measurable worklog counts for the development workspace. No network or scores.
import { validCalendarDate, calendarRange, calendarDates, addCalendarDays, addCalendarMonths } from "./calendarView";
export const PLANNING_MODES = {
  day: "รายวัน",
  week: "รายสัปดาห์",
  month: "รายเดือน",
  quarter: "ไตรมาส",
  fiscal: "ปีงบประมาณ",
  custom: "กำหนดช่วงเอง"
};
export const JD_CATEGORIES = [["rooms", "ห้องบริการและห้องปฏิบัติการ"], ["dl", "การทดสอบ Digital Literacy"], ["planning", "วางแผนและตารางปฏิบัติงาน"], ["coordination", "ประสานงานระบบและเครือข่าย"], ["support", "สนับสนุนระบบสารสนเทศ"], ["repair", "ซ่อมและแก้ปัญหาคอมพิวเตอร์"], ["software", "ติดตั้งซอฟต์แวร์ลิขสิทธิ์"], ["electrical", "ซ่อมบำรุงระบบไฟฟ้าพื้นฐาน"]];
export const planningAdmin = actor => Boolean(actor?.id && ["admin", "superadmin"].includes(actor.role));
export function planningFiscalYear(date) {
  if (!validCalendarDate(date)) throw Error("วันที่ไม่ถูกต้อง");
  return Number(date.slice(0, 4)) + 543 + (Number(date.slice(5, 7)) >= 10 ? 1 : 0);
}
export function planningRange(mode, anchor, year = planningFiscalYear(anchor), custom = {}) {
  if (!validCalendarDate(anchor)) throw Error("วันที่อ้างอิงไม่ถูกต้อง");
  if (["day", "week", "month"].includes(mode)) return calendarRange(anchor, mode);
  if (mode === "quarter") {
    const month = Math.floor((Number(anchor.slice(5, 7)) - 1) / 3) * 3 + 1;
    const start = `${anchor.slice(0, 4)}-${String(month).padStart(2, "0")}-01`;
    return {
      start,
      end: addCalendarDays(addCalendarMonths(start, 3), -1)
    };
  }
  if (mode === "fiscal") {
    if (!Number.isInteger(Number(year)) || year < 2444 || year > 3543) throw Error("ปีงบประมาณต้องเป็น 2444–3543");
    return {
      start: `${Number(year) - 544}-10-01`,
      end: `${Number(year) - 543}-09-30`
    };
  }
  if (mode === "custom" && validCalendarDate(custom.start) && validCalendarDate(custom.end) && custom.start <= custom.end) return {
    start: custom.start,
    end: custom.end
  };
  throw Error("เลือกช่วงวันที่เริ่มต้นและสิ้นสุดให้ถูกต้อง");
}
export function stepPlanningRange(selection, direction) {
  const {
    mode,
    range
  } = selection;
  const amount = direction < 0 ? -1 : 1;
  if (mode === "custom") {
    const days = (Date.parse(range.end) - Date.parse(range.start)) / 86400000 + 1;
    const next = {
      start: addCalendarDays(range.start, amount * days),
      end: addCalendarDays(range.end, amount * days)
    };
    return {
      mode,
      range: next,
      anchor: next.start
    };
  }
  const anchor = ["month", "quarter", "fiscal"].includes(mode) ? addCalendarMonths(range.start, amount * {
    month: 1,
    quarter: 3,
    fiscal: 12
  }[mode]) : addCalendarDays(range.start, amount * (mode === "week" ? 7 : 1));
  return {
    mode,
    anchor,
    range: planningRange(mode, anchor)
  };
}
export function planningQueryPlan(range, actor, employee = "all", cursor = null) {
  planningRange("custom", range.start, undefined, range);
  const employeeId = planningAdmin(actor) ? employee === "all" ? null : employee : actor?.role === "staff" ? actor.id : null;
  if (!actor?.id || !["staff", "admin", "superadmin"].includes(actor.role)) throw Error("ไม่มีสิทธิ์ดูข้อมูล");
  return {
    collection: "worklogs",
    where: [["date", ">=", range.start], ["date", "<=", range.end], ...(employeeId ? [["employeeId", "==", employeeId]] : [])],
    orderBy: [["date", "asc"]],
    limit: 1000,
    startAfter: cursor
  };
}
export function planningData(raw, people, range, actor, employee = "all", limit = 1000) {
  const plan = planningQueryPlan(range, actor, employee);
  const selected = planningAdmin(actor) ? employee : actor.id;
  const known = new Set(people.map(person => person.id)),
    seen = new Set();
  let invalid = 0;
  const rows = [];
  for (const row of raw) {
    // Scope by stable ID before any counting; names are never authorization keys.
    if (selected !== "all" && row.employeeId !== selected) continue;
    if (row.id && seen.has(row.id)) continue;
    if (row.id) seen.add(row.id);
    if (!validCalendarDate(row.date)) {
      invalid++;
      continue;
    }
    if (row.date < range.start || row.date > range.end) continue;
    rows.push({
      ...row,
      employeeId: known.has(row.employeeId) ? row.employeeId : null,
      task: row.minorTask || row.title || "ไม่ระบุหัวข้อรอง",
      group: row.comboGroupId || null
    });
  }
  rows.sort((a, b) => a.date.localeCompare(b.date) || String(a.id || "").localeCompare(String(b.id || "")));
  const size = Math.max(1000, Math.floor(limit / 1000) * 1000 || 1000);
  return {
    rows: rows.slice(0, size),
    partial: rows.length > size,
    invalid,
    plan
  };
}
export function planningCounts(rows, key) {
  const counts = new Map();
  for (const row of rows) {
    const value = typeof key === "function" ? key(row) : row[key];
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), "th"));
}
export function planningSummary(rows) {
  const grouped = rows.filter(row => row.group && row.employeeId);
  return {
    activities: rows.length,
    people: new Set(rows.map(row => row.employeeId).filter(Boolean)).size,
    days: new Set(rows.map(row => row.date)).size,
    tasks: new Set(rows.map(row => row.task)).size,
    unresolved: rows.filter(row => !row.employeeId).length,
    comboGroups: new Set(grouped.map(row => JSON.stringify([row.employeeId, row.group]))).size,
    groupedActivities: grouped.length
  };
}
export function planningTrend(rows, range) {
  planningRange("custom", range.start, undefined, range);
  const days = (Date.parse(range.end) - Date.parse(range.start)) / 86400000 + 1;
  const unit = days <= 62 ? "day" : days <= 730 ? "month" : "year";
  const key = date => date.slice(0, unit === "day" ? 10 : unit === "month" ? 7 : 4);
  const counts = new Map(planningCounts(rows, row => key(row.date)));
  const buckets = [];
  if (unit === "day") buckets.push(...calendarDates(range.start, range.end));else if (unit === "month") for (let date = range.start.slice(0, 8) + "01"; date <= range.end; date = addCalendarMonths(date, 1)) buckets.push(date.slice(0, 7));else for (let year = Number(range.start.slice(0, 4)); year <= Number(range.end.slice(0, 4)); year++) buckets.push(String(year));
  return {
    unit,
    values: buckets.map(date => ({
      date,
      count: counts.get(date) || 0
    }))
  };
}
export function planningStaff(rows, people, search = "", selected = "all") {
  const term = search.trim().toLocaleLowerCase("th");
  return people.filter(person => (selected === "all" || person.id === selected) && [person.displayName, person.fullName].some(value => value?.toLocaleLowerCase("th").includes(term))).map(person => ({
    ...person,
    ...planningSummary(rows.filter(row => row.employeeId === person.id))
  }));
}
export function validateJD(value) {
  const year = Number(value.year);
  if (!Number.isInteger(year) || year < 2444 || year > 3543) throw Error("ปีงบประมาณต้องเป็น 2444–3543");
  const weights = {};
  for (const [id] of JD_CATEGORIES) {
    const number = Number(value.weights[id]);
    if (value.weights[id] === "" || !Number.isFinite(number) || number < 0 || number > 100) throw Error("น้ำหนักแต่ละหมวดต้องอยู่ระหว่าง 0–100%");
    weights[id] = number;
  }
  if (Math.abs(Object.values(weights).reduce((sum, number) => sum + number, 0) - 100) > 0.000001) throw Error("น้ำหนักทั้ง 8 หมวดต้องรวม 100%");
  const valid = new Set(JD_CATEGORIES.map(([id]) => id));
  const mapping = Object.fromEntries(Object.entries(value.mapping || {}).filter(([, id]) => valid.has(id)));
  return {
    year,
    weights,
    mapping
  };
}
export function planningJD(rows, year, profile) {
  const scoped = rows.filter(row => planningFiscalYear(row.date) === Number(year));
  const counts = new Map(planningCounts(scoped, row => profile?.mapping[row.task] || "unmapped"));
  return [...JD_CATEGORIES.map(([id, label]) => ({
    id,
    label,
    weight: profile?.weights[id] ?? null,
    count: counts.get(id) || 0
  })), {
    id: "unmapped",
    label: "ยังไม่จับคู่หมวด",
    weight: null,
    count: counts.get("unmapped") || 0
  }];
}
export function planningCSV(staff, range, partial) {
  const cell = value => {
    const text = String(value ?? "");
    return `"${(/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text) ? "'" + text : text).replaceAll('"', '""')}"`;
  };
  return [["เริ่ม", "สิ้นสุด", "ขอบเขต", "ผู้ปฏิบัติงาน", "กิจกรรม", "หัวข้อรอง", "วันที่มีบันทึก"], ...staff.map(person => [range.start, range.end, partial ? "ยังโหลดไม่ครบช่วง" : "ข้อมูลที่แสดง", person.displayName, person.activities, person.tasks, person.days])].map(row => row.map(cell).join(",")).join("\r\n");
}
