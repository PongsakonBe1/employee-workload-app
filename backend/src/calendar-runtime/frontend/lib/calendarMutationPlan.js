// Single-document, whole-series changes. No IO or permanent deletion.
import { prepareCalendarCreate, validateCalendarCreateAgainst, calendarWriteError } from "./calendarCreatePlan.js";
import { calendarWeekday } from "./calendarView.js";
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
export const calendarMutationEqual = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
export const calendarMutationStale = () => Object.assign(calendarWriteError("ตารางนี้เปลี่ยนแล้ว กรุณาโหลดข้อมูลล่าสุดและตรวจรายการก่อนบันทึก"), { code: "calendar-write-stale" });
const batch = row => row.kind === "classroom" ? { rules: [row], events: [] } : { rules: [], events: [row] };
// A term can start on Monday while the recurring lesson is on Wednesday.
export function calendarMutationReplacement(entry) {
  return entry.kind === "classroom" ? { ...entry, validFrom: entry.date, validTo: entry.repeat === "weekly" ? entry.validTo : entry.date, weekday: entry.repeat === "weekly" ? entry.weekday : calendarWeekday(entry.date) } : entry;
}
async function encode(row, people) {
  const { source: _source, ...draft } = row;
  return prepareCalendarCreate(batch(draft), people);
}
export async function prepareCalendarMutation(input, people) {
  if (!["edit", "cancel"].includes(input?.action) || !input.original || typeof input.original !== "object") throw calendarWriteError("รูปแบบคำสั่งแก้ไข/ยกเลิกไม่ถูกต้อง");
  const original = input.original, source = original.source;
  const collection = original.kind === "classroom" ? "classroomSchedules" : original.kind === "dl" ? "dlExamSchedules" : null;
  if (!collection || source?.collection !== collection || !/^cal-[0-9a-f]{64}$/.test(source?.documentId || "") || !/^op-[0-9a-f]{64}$/.test(source?.operationId || "") || !Number.isSafeInteger(source?.version) || source.version < 0 || source.version >= Number.MAX_SAFE_INTEGER) throw calendarWriteError("รายการนี้ยังไม่รองรับการแก้ไข staging กรุณาโหลดข้อมูลที่มี version ก่อน");
  const before = await encode(original, people);
  if (before.entries.length !== 1) throw calendarWriteError("แก้ไขได้ครั้งละหนึ่งเอกสาร");
  let after = before;
  if (input.action === "edit") {
    if (!input.replacement || input.replacement.kind !== original.kind) throw calendarWriteError("ไม่สามารถเปลี่ยนประเภทของเอกสารเดิม");
    after = await encode(input.replacement, people);
    if (after.entries.length !== 1 || after.entries[0].collection !== collection) throw calendarWriteError("แก้ไขได้ครั้งละหนึ่งห้องหรือหนึ่งรอบสอบ");
    if (calendarMutationEqual(before.entries[0].value, after.entries[0].value)) throw calendarWriteError("ยังไม่มีข้อมูลที่เปลี่ยนแปลง");
  }
  const expected = before.entries[0].value;
  const value = input.action === "cancel" ? { ...expected, isActive: false } : after.entries[0].value;
  const target = { collection, id: source.documentId };
  const payload = { action: input.action, target, expectedVersion: source.version, creationOperationId: source.operationId, expected, value };
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(canonical(payload))));
  return { ...payload, operationId: "op-" + [...new Uint8Array(digest)].map(n => n.toString(16).padStart(2, "0")).join(""), range: after.range };
}
export function validateCalendarMutationTarget(plan, current) {
  if (!current || current.isActive !== true || current.schemaVersion !== 1 || current.operationId !== plan.creationOperationId || (current.mutationVersion ?? 0) !== plan.expectedVersion) throw calendarMutationStale();
  const expected = Object.fromEntries(Object.keys(plan.expected).map(key => [key, current[key]]));
  if (!calendarMutationEqual(expected, plan.expected)) throw calendarMutationStale();
}
export function validateCalendarMutationAgainst(plan, documents) {
  if (plan.action === "cancel") return;
  const remaining = { ...documents, [plan.target.collection]: documents[plan.target.collection].filter(row => row.id !== plan.target.id) };
  validateCalendarCreateAgainst({ entries: [{ collection: plan.target.collection, id: plan.target.id, value: plan.value }], range: plan.range }, remaining);
}
