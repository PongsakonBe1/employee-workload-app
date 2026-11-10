// Append-only pilot contract. No IO, user names, SDK credentials or database mutation.
import { planCalendarDocumentChanges, adaptCalendarDocuments } from "./calendarDataAdapter.js";
import { calendarDates, calendarConflicts, expandCalendar, timeMinutes } from "./calendarView.js";
export const CALENDAR_CREATE_LIMIT = 100;
export const calendarWriteError = message => Object.assign(new Error(message), {
  code: "calendar-write-validation"
});
const empty = () => ({
  rules: [],
  events: []
});
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
async function digest(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(canonical(value)));
  return [...new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", bytes))].map(value => value.toString(16).padStart(2, "0")).join("");
}
export async function prepareCalendarCreate(input, people) {
  if (!Array.isArray(input?.rules) || !Array.isArray(input?.events)) throw calendarWriteError("รูปแบบรายการนำเข้าไม่ถูกต้อง");
  const size = input.rules.length + input.events.length;
  if (!size || size > CALENDAR_CREATE_LIMIT) throw calendarWriteError(`เลือก 1–${CALENDAR_CREATE_LIMIT} รายการต่อครั้ง`);
  const draft = empty();
  for (const type of ["rules", "events"]) draft[type] = input[type].map((row, index) => {
    if (!row || typeof row !== "object" || Array.isArray(row) || type === "events" && !Array.isArray(row.proctors)) throw calendarWriteError("รูปแบบรายการหรือรายชื่อผู้คุมไม่ถูกต้อง");
    return {
      ...row,
      id: `draft-${type}-${index}`,
      title: typeof row.title === "string" ? row.title.trim() : "",
      rooms: Array.isArray(row.rooms) ? [...row.rooms].sort() : row.rooms,
      ...(type === "events" ? {
        proctors: [...row.proctors].sort()
      } : {})
    };
  });
  const contract = planCalendarDocumentChanges(empty(), draft, {
    people,
    role: "admin"
  });
  if (contract.issues.length) throw calendarWriteError(contract.issues[0].message);
  const entries = [];
  for (const command of contract.commands) {
    const value = {
      ...command.value
    };
    // Names are resolved by directory ID when reading; avoid storing a second roster copy.
    delete value.proctorNames;
    if (Object.values(value).some(value => typeof value === "string" && value.length > 1000)) throw calendarWriteError("ข้อความยาวเกิน 1000 ตัวอักษร");
    if (value.subject.length > 300 || value.semester.length > 32 || (value.proctors?.length || 0) > 8) throw calendarWriteError("ตรวจความยาวชื่อ ภาคเรียน และจำนวนผู้คุม (ไม่เกิน 8 คน)");
    if (command.reference.collection === "dlExamSchedules" && JSON.stringify(value.locations) !== JSON.stringify(value.studentCount > 40 ? ["ห้อง 406", "ห้อง 407"] : ["ห้อง 406"])) throw calendarWriteError("จำนวนผู้สอบเกิน 40 คนต้องใช้ห้อง 406 และ 407 ต่อรอบ");
    const id = "cal-" + (await digest({
      collection: command.reference.collection,
      value
    }));
    entries.push({
      collection: command.reference.collection,
      id,
      value
    });
  }
  const identifiers = entries.map(row => row.collection + "/" + row.id).sort();
  if (new Set(identifiers).size !== identifiers.length) throw calendarWriteError("พบรายการซ้ำในชุดนำเข้า กรุณาตรวจรายการก่อนบันทึก");
  const starts = [...draft.rules.map(row => row.validFrom), ...draft.events.map(row => row.date)].sort();
  const ends = [...draft.rules.map(row => row.validTo), ...draft.events.map(row => row.date)].sort();
  try {
    calendarDates(starts[0], ends.at(-1));
  } catch {
    throw calendarWriteError("แบ่งชุดนำเข้าให้ครอบคลุมช่วงวันที่ไม่เกิน 400 วัน");
  }
  return {
    operationId: "op-" + (await digest(identifiers)),
    entries,
    range: {
      start: starts[0],
      end: ends.at(-1)
    }
  };
}
export function validateCalendarCreateAgainst(plan, documents) {
  const known = new Set([...documents.classroomSchedules.map(row => "classroomSchedules/" + row.id), ...documents.dlExamSchedules.map(row => "dlExamSchedules/" + row.id)]);
  const entries = plan.entries.filter(row => !known.has(row.collection + "/" + row.id));
  const current = adaptCalendarDocuments(documents);
  if (!current.complete) throw calendarWriteError("ข้อมูลเดิมบางรายการไม่ครบ กรุณาตรวจข้อมูลก่อนเพิ่มตาราง");
  const proposed = adaptCalendarDocuments({
    users: documents.users,
    classroomSchedules: entries.filter(row => row.collection === "classroomSchedules").map(row => ({
      id: row.id,
      ...row.value
    })),
    dlExamSchedules: entries.filter(row => row.collection === "dlExamSchedules").map(row => ({
      id: row.id,
      ...row.value
    }))
  });
  if (!proposed.complete) throw calendarWriteError(proposed.issues[0].message);
  const existing = expandCalendar(current.data, plan.range);
  for (const row of expandCalendar(proposed.data, plan.range)) {
    const conflict = calendarConflicts(row, existing)[0] || existing.find(other => other.date === row.date && row.proctors?.some(id => other.proctors?.includes(id)) && timeMinutes(row.start) < timeMinutes(other.end) && timeMinutes(other.start) < timeMinutes(row.end));
    if (conflict) throw calendarWriteError(`ห้องหรือผู้คุมชนวันที่ ${row.date} ${row.start}–${row.end} ยังไม่ได้เพิ่มรายการใด`);
    existing.push(row);
  }
  return {
    entries,
    skipped: plan.entries.length - entries.length
  };
}
