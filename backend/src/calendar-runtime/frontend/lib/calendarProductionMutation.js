import { calendarWriteDigest, calendarWriteError, prepareCalendarCreate, validateCalendarCreateAgainst } from "./calendarCreatePlan.js";
import { calendarMutationEqual, calendarMutationStale } from "./calendarMutationPlan.js";

const fields = {
  classroomSchedules: ["room", "dayOfWeek", "startTime", "endTime", "subject", "teacher", "note", "semester", "validFrom", "validTo"],
  dlExamSchedules: ["date", "startTime", "endTime", "timeSlot", "subject", "locations", "location", "proctors", "studentCount", "examType", "semester", "notes"],
};
const weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const pick = (row, keys) => Object.fromEntries(keys.filter(key => row[key] !== undefined).map(key => [key, row[key]]));
const object = value => value && typeof value === "object" && !Array.isArray(value);
const proctorIds = value => Array.isArray(value)
  ? value.map(person => typeof person === "string" ? person : person?.id || person?.userId || null)
  : value;

function snapshot(collection, row) {
  const result = { ...pick(row, fields[collection]), isActive: row.isActive !== false, mutationVersion: row.mutationVersion ?? 0 };
  if (collection === "dlExamSchedules" && Object.hasOwn(result, "proctors")) result.proctors = proctorIds(result.proctors);
  return result;
}

export function productionCalendarTarget(collection, row) {
  return { id: row.id, expected: snapshot(collection, row) };
}

export function productionCalendarCreateDraft(collection, row) {
  const shared = { title: row.subject, start: row.startTime, end: row.endTime, semester: row.semester };
  if (collection === "classroomSchedules") return {
    rules: [{ ...shared, kind: "classroom", rooms: [row.room], weekday: weekdays.indexOf(row.dayOfWeek), validFrom: row.validFrom, validTo: row.validTo, teacher: row.teacher, note: row.note }],
    events: [],
  };
  return {
    rules: [],
    events: [{ ...shared, kind: "dl", date: row.date, rooms: row.locations ?? (row.location ? [row.location] : []), participants: row.studentCount, proctors: proctorIds(row.proctors), examType: row.examType, notes: row.notes, legacyTimeSlot: row.timeSlot }],
  };
}

export async function prepareProductionCalendarMutation(input) {
  const { action, collection, targets, changes } = input || {};
  if (typeof collection !== "string" || !Object.hasOwn(fields, collection) || !["edit", "cancel", "bulk-status"].includes(action) ||
      !Array.isArray(targets) || !targets.length || targets.length > 100 ||
      (action === "bulk-status" ? collection !== "classroomSchedules" || typeof changes?.isActive !== "boolean" : targets.length !== 1) ||
      (action !== "cancel" && !object(changes))) throw calendarWriteError("รูปแบบคำสั่งจัดการตารางไม่ถูกต้อง");

  const entries = targets.map(target => {
    const { id, expected } = target ?? {};
    if (typeof id !== "string" || !/^(?!__.*__$)[A-Za-z0-9_-]{1,128}$/.test(id) ||
        !object(expected) || !Number.isSafeInteger(expected.mutationVersion) || expected.mutationVersion < 0 ||
        expected.mutationVersion >= Number.MAX_SAFE_INTEGER || typeof expected.isActive !== "boolean") {
      throw calendarWriteError("ตรวจรหัสตารางและโหลดข้อมูลล่าสุดก่อนบันทึก");
    }
    return { id, expected: snapshot(collection, expected) };
  }).sort((a, b) => a.id.localeCompare(b.id, "en"));
  if (new Set(entries.map(row => row.id)).size !== entries.length) throw calendarWriteError("พบรายการซ้ำในคำสั่ง");
  const patch = action === "edit" ? pick(changes, [...fields[collection], "isActive"])
    : { isActive: action === "bulk-status" && changes.isActive };
  const payload = { action, collection, entries, patch };
  return { ...payload, operationId: "op-" + await calendarWriteDigest({ productionMutation: payload }) };
}

export function productionCalendarReplacements(plan, documents) {
  return plan.entries.map(({ id, expected }, index) => {
    const current = documents[index];
    if (!current || !calendarMutationEqual(snapshot(plan.collection, current), expected)) throw calendarMutationStale();
    const value = { ...expected, ...plan.patch };
    if (typeof value.isActive !== "boolean") throw calendarWriteError("ตรวจสถานะการใช้งาน");
    return { id, expected, value };
  }).filter(row => !calendarMutationEqual(row.expected, row.value));
}

export async function validateProductionCalendarReplacements(plan, replacements, people) {
  const input = { rules: [], events: [] };
  const key = plan.collection === "classroomSchedules" ? "rules" : "events";
  const validated = replacements.filter(row => plan.action === "edit" || row.value.isActive);
  for (const row of validated) input[key].push(productionCalendarCreateDraft(plan.collection, row.value)[key][0]);
  const checked = validated.length ? await prepareCalendarCreate(input, people) : null;
  if (checked) checked.entries.forEach((entry, index) => { entry.id = validated[index].id; });
  const values = new Map(checked?.entries.map(row => [row.id, row.value]));
  return {
    checked: validated.some(row => row.value.isActive) ? checked : null,
    // Disabling a schedule must work even when its old schedule fields were incomplete.
    writes: replacements.map(row => ({ id: row.id, version: row.expected.mutationVersion + 1, value: { ...values.get(row.id), isActive: row.value.isActive } })),
  };
}

export function validateProductionCalendarConflicts(plan, checked, documents) {
  const ids = new Set(checked.entries.map(row => row.id));
  validateCalendarCreateAgainst(checked, {
    ...documents,
    [plan.collection]: documents[plan.collection].filter(row => !ids.has(row.id)),
  });
}
