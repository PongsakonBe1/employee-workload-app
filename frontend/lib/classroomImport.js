// Pure timetable geometry and transaction planning. No services or file uploads.
import { addCalendarDays, calendarConflicts, calendarDates, calendarLabel, calendarWeekday, expandCalendar, timeMinutes, validCalendarDate } from "./calendarView.js";

export const IMPORT_WEEKDAYS = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"];
export const IMPORT_LIMITS = { bytes: 10 * 1024 * 1024, pages: 5, rows: 200 };
// Confirmed by the team for this semester only; future semesters start blank.
export function classroomTermDefaults(semester) {
  return semester === "2/2569"
    ? { vocational: { start: "2026-11-02", end: "2027-03-14" }, higher: { start: "2026-11-23", end: "2027-03-14" } }
    : { vocational: { start: "", end: "" }, higher: { start: "", end: "" } };
}
const clean = value => String(value || "").normalize("NFC").replace(/\s+/g, " ").trim();
const near = (a, b, tolerance = 2) => Math.abs(a - b) < tolerance;
const unique = values => [...new Set(values.map(x => Math.round(x * 2) / 2))].sort((a, b) => a - b);

export function importDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  if (!match) return "";
  const year = Number(match[1]);
  const date = `${year > 2400 ? year - 543 : year}-${match[2]}-${match[3]}`;
  return validCalendarDate(date) ? date : "";
}

// One actionable issue per missing/invalid input, rather than one per course.
export function importTermIssues(rows, terms) {
  const groups = [...new Set(rows.filter(row => row.selected).map(row => row.group))];
  const issues = [];
  for (const group of groups) {
    const label = group === "vocational" ? "ปวช." : "ป.ตรี / อื่น ๆ";
    const term = terms[group] || {}, start = importDate(term.start), end = importDate(term.end);
    if (!start) issues.push({ group, field: "start", message: term.start ? `วันเริ่มเรียนของ ${label} ไม่ถูกต้อง` : `ระบุวันเริ่มเรียนของ ${label}` });
    if (!end) issues.push({ group, field: "end", message: term.end ? `วันสิ้นสุดของ ${label} ไม่ถูกต้อง` : `ระบุวันสิ้นสุดของ ${label}` });
    else if (start && (end < start || end > addCalendarDays(start, 369))) issues.push({ group, field: "end", message: `วันสิ้นสุดของ ${label} ต้องตั้งแต่วันเริ่มและไม่เกิน 1 ปี` });
  }
  return issues;
}

// The adapter supplies PDF coordinates in top-left space. Boundaries come from
// vector paths, never from the width of the course text or its background color.
export function parseClassroomPages(pages) {
  if (!pages.length || pages.length > IMPORT_LIMITS.pages) throw new Error("รองรับ PDF ไม่เกิน 5 หน้า");
  const rows = [], warnings = [];
  let ignored = 0, tables = 0;
  for (const [pageIndex, page] of pages.entries()) {
    const items = page.items.map(item => ({ ...item, str: clean(item.str) })).filter(item => item.str);
    const headers = items.filter(item => /^(401|402|406|407)\s*(ห้อง|$)/.test(item.str));
    if (!headers.length) warnings.push(`หน้า ${pageIndex+1}: ไม่พบหัวตารางห้องที่รองรับ กรุณาตรวจต้นฉบับ`);
    // Some PDFs split the room number and its description into separate items.
    for (const header of headers) {
      const room = header.str.match(/^(401|402|406|407)/)[1];
      const nextHeader = headers.filter(item => item.y > header.y + 5).sort((a,b) => a.y-b.y)[0];
      const section = items.filter(item => item.y > header.y && item.y < (nextHeader?.y ?? page.height));
      const slots = section.flatMap(item => {
        // PDF.js can concatenate adjacent header labels into one text item.
        return [...item.str.matchAll(/(\d{2})[.:](\d{2})\s*[-–]\s*(\d{2})[.:](\d{2})/g)].map(match=>({ ...item, x:item.x+item.width*match.index/item.str.length, start:`${match[1]}:${match[2]}`,end:`${match[3]}:${match[4]}`,center:item.x+item.width*(match.index+match[0].length/2)/item.str.length }));
      }).sort((a,b) => a.x-b.x);
      const days = section.filter(item => IMPORT_WEEKDAYS.includes(item.str) && item.x < (slots[0]?.center ?? 0)-((slots[1]?.center ?? 0)-(slots[0]?.center ?? 0))/2);
      if (slots.length < 2 || !days.length) { warnings.push(`หน้า ${pageIndex+1} ห้อง ${room}: อ่านแกนวัน/เวลาไม่ได้`);continue; }
      const spacing = slots[1].center - slots[0].center;
      if (spacing <= 0 || slots.some((slot,i) => !Number.isFinite(timeMinutes(slot.start)) || !Number.isFinite(timeMinutes(slot.end)) || timeMinutes(slot.end)<=timeMinutes(slot.start) || (i && (!near(slot.center-slots[i-1].center,spacing,3) || slots[i-1].end !== slot.start)))) {
        warnings.push(`หน้า ${pageIndex+1} ห้อง ${room}: แกนเวลาไม่ต่อเนื่อง ต้องตรวจด้วยตนเอง`);continue;
      }
      tables++;
      const boundaries = [slots[0].center-spacing/2, ...slots.map(slot => slot.center+spacing/2)];
      for (const day of days) {
        const text = section.filter(item => near(item.y,day.y,5) && item.x >= boundaries[0]-2);
        const vertical = unique(page.lines.filter(line => near(line.x1,line.x2,1) && Math.min(line.y1,line.y2) < day.y-2 && Math.max(line.y1,line.y2) > day.y-2).map(line=>line.x1));
        const edges = boundaries.filter(boundary=>vertical.some(x=>near(x,boundary,2)));
        const cells = new Map();
        for (const item of text) {
          if (/งด\s*ให้บริการ/.test(item.str)) { ignored++;continue; }
          const center = item.x + item.width/2;
          const left = edges.filter(x=>x < center).at(-1), right = edges.find(x=>x > center);
          if (left === undefined || right === undefined) { warnings.push(`หน้า ${pageIndex+1} ห้อง ${room} ${day.str}: ไม่พบขอบช่องข้อความ`);continue; }
          const key = `${left}:${right}`;
          if (!cells.has(key)) cells.set(key,{left,right,items:[]});
          cells.get(key).items.push(item);
        }
        for (const cell of cells.values()) {
          const label = clean(cell.items.sort((a,b)=>a.x-b.x).map(item=>item.str).join(" "));
          if (!label || /งด\s*ให้บริการ/.test(label)) { ignored++;continue; }
          const first = boundaries.findIndex(x=>near(x,cell.left,2)), last = boundaries.findIndex(x=>near(x,cell.right,2));
          if (first < 0 || last <= first) { warnings.push(`หน้า ${pageIndex+1} ห้อง ${room}: ระบุช่วงคาบไม่ได้`);continue; }
          rows.push({ id:`pdf-${pageIndex+1}-${room}-${IMPORT_WEEKDAYS.indexOf(day.str)}-${first}`, title:label, room, weekday:IMPORT_WEEKDAYS.indexOf(day.str), start:slots[first].start, end:slots[last-1].end, group: /ปวช/.test(label) ? "vocational" : "higher", page:pageIndex+1, selected:true });
        }
      }
    }
  }
  if (!rows.length) throw new Error("ไม่พบตารางที่อ่านได้ รองรับ PDF ตาราง 4 ห้องที่มีข้อความและเส้นตาราง ภาพสแกนยังต้องเพิ่มเอง");
  if (rows.length > IMPORT_LIMITS.rows) throw new Error("รายการเกิน 200 แถว กรุณาแบ่งไฟล์");
  return { rows, warnings, ignored, tables };
}

export function planClassroomImport(rows, terms, semester, data, existingLabel = "ตารางที่มีอยู่") {
  const selected = rows.filter(row=>row.selected), issues = [], rules = [];
  if (!selected.length) return { rules:[], issues:[{message:"เลือกอย่างน้อย 1 รายการ"}], occurrences:0 };
  if (selected.length > IMPORT_LIMITS.rows || !/^\d\/(25|26)\d{2}$/.test(semester)) return {rules:[],issues:[{message:"ตรวจจำนวนรายการและภาคเรียน เช่น 2/2569"}],occurrences:0};
  const termIssues = importTermIssues(rows, terms);
  for (const row of selected) {
    const term = terms[row.group] || {}, start = importDate(term.start), end = importDate(term.end);
    const fail = (message,field="row") => issues.push({id:row.id,message,field});
    const invalidTerm = termIssues.find(issue => issue.group === row.group);
    if (invalidTerm) { fail(invalidTerm.message,"term");continue; }
    if (!clean(row.title) || row.title.length > 500 || !["401","402","406","407"].includes(row.room) || !Number.isInteger(row.weekday) || row.weekday < 0 || row.weekday > 6 || !Number.isFinite(timeMinutes(row.start)) || !Number.isFinite(timeMinutes(row.end)) || timeMinutes(row.end) <= timeMinutes(row.start)) { fail("ตรวจชื่อ ห้อง วัน และเวลา");continue; }
    const validFrom = addCalendarDays(start,(row.weekday-calendarWeekday(start)+7)%7);
    if (validFrom > end) { fail("ไม่มีวันเรียนในช่วงที่เลือก");continue; }
    const candidate = {id:row.id, title:clean(row.title),kind:"classroom",weekday:row.weekday,start:row.start,end:row.end,rooms:[row.room],semester,validFrom,validTo:end};
    const dates = calendarDates(validFrom,end).filter(date=>calendarWeekday(date)===row.weekday);
    const combined = {events:data.events,rules:[...data.rules,...rules]};
    const existing = expandCalendar(combined,{start:validFrom,end});
    let conflict;
    for (const date of dates) { const found = calendarConflicts({...candidate,date},existing)[0];if (found) {conflict={date,found};break;} }
    if (conflict) {
      const found = conflict.found;
      const origin = rules.some(rule => rule.id === found.sourceId) ? "batch" : "existing";
      const duplicate = candidate.title === found.title && candidate.kind === found.kind && candidate.start === found.start && candidate.end === found.end && [...candidate.rooms].sort().join() === [...found.rooms].sort().join();
      const sourceLabel = origin === "batch" ? "รายการอื่นในไฟล์ที่เลือก" : existingLabel;
      issues.push({ id: row.id, field: "conflict", code: duplicate ? "duplicate" : "overlap", conflict: { origin, title: found.title, date: conflict.date, start: found.start, end: found.end, sourceLabel }, message: `ห้อง ${row.room} ${duplicate ? "มีรายการซ้ำกับ" : "เวลาชนกับ"} “${found.title}” (${sourceLabel}) วันที่ ${calendarLabel(conflict.date,{dateStyle:"medium"})} ${found.start}–${found.end} · รายการนี้ ${row.start}–${row.end}` });
      continue;
    }
    rules.push(candidate);
  }
  // An invalid batch never exposes a partial transaction for the caller to save.
  return {rules:issues.length ? [] : rules,issues,occurrences:issues.length ? 0 : rules.reduce((sum,rule)=>sum+Math.floor((Date.parse(rule.validTo)-Date.parse(rule.validFrom))/604800000)+1,0)};
}
