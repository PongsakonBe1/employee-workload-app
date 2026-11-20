import { describe, it, expect } from "vitest";
import { prepareCalendarCreate } from "./calendarCreatePlan.js";
import { adaptCalendarDocuments } from "./calendarDataAdapter.js";
import { prepareCalendarMutation, calendarMutationReplacement, validateCalendarMutationTarget, validateCalendarMutationAgainst } from "./calendarMutationPlan.js";
const users = [{ id: "synthetic-staff", displayName: "Synthetic staff", active: true, role: "staff" }];
const people = adaptCalendarDocuments({ users }).people;
const rule = { kind: "classroom", title: "Synthetic class", rooms: ["401"], weekday: 0, start: "09:00", end: "10:00", validFrom: "2027-05-17", validTo: "2027-06-14", semester: "1/2570", teacher: "" };
const exam = { kind: "dl", title: "Synthetic DL", rooms: ["406", "407"], date: "2027-05-19", start: "17:00", end: "18:30", participants: 75, proctors: ["synthetic-staff"], semester: "1/2570", examType: "student" };
async function fixture(row = rule) {
  const create = await prepareCalendarCreate(row.kind === "classroom" ? { rules: [row], events: [] } : { rules: [], events: [row] }, people), entry = create.entries[0];
  const record = { ...entry.value, id: entry.id, operationId: create.operationId, schemaVersion: 1, createdBy: "synthetic-admin" };
  const documents = { users, classroomSchedules: [], dlExamSchedules: [], [entry.collection]: [record] };
  const data = adaptCalendarDocuments(documents).data;
  return { original: [...data.rules, ...data.events][0], record, documents };
}
describe("whole-series edit/cancel contract", () => {
  it("preserves the weekday when the term starts on a different day, while once-only uses its actual date", async () => {
    const { original } = await fixture({ ...rule, weekday: 2 });
    const replacement = calendarMutationReplacement({ ...original, date: original.validFrom, repeat: "weekly", title: "Only title changed" });
    const plan = await prepareCalendarMutation({ action: "edit", original, replacement }, people);
    expect(plan.value.dayOfWeek).toBe("wednesday");expect(plan.value.validFrom).toBe("2027-05-17");
    expect(calendarMutationReplacement({ ...original, date: "2027-05-17", repeat: "none" }).weekday).toBe(0);
  });
  it("retains document ID and creation operation, detects no-op and derives a stable mutation receipt", async () => {
    const { original } = await fixture(), input = { action: "edit", original, replacement: { ...original, start: "10:00", end: "11:00" } };
    const first = await prepareCalendarMutation(input, people), second = await prepareCalendarMutation({ ...input, replacement: { ...input.replacement, id: "ui-only" } }, people);
    expect(first.operationId).toBe(second.operationId);expect(first.target.id).toBe(original.source.documentId);expect(first.creationOperationId).toBe(original.source.operationId);
    await expect(prepareCalendarMutation({ ...input, replacement: original }, people)).rejects.toThrow("ยังไม่มีข้อมูล");
  });
  it("validates the expected business fields as well as the version, including an ABA edit", async () => {
    const { original, record } = await fixture(), plan = await prepareCalendarMutation({ action: "cancel", original }, people);
    expect(() => validateCalendarMutationTarget(plan, record)).not.toThrow();
    for (const changed of [null, { ...record, isActive: false }, { ...record, mutationVersion: 2 }, { ...record, startTime: "08:00" }, { ...record, operationId: "different" }]) expect(() => validateCalendarMutationTarget(plan, changed)).toThrow("เปลี่ยนแล้ว");
  });
  it("cancels without altering business fields and adapts inactive documents out of the calendar", async () => {
    const { original, record } = await fixture(), plan = await prepareCalendarMutation({ action: "cancel", original }, people);
    expect(plan.value).toEqual({ ...plan.expected, isActive: false });
    expect(adaptCalendarDocuments({ users, classroomSchedules: [{ ...record, ...plan.value }] }).data.rules).toEqual([]);
  });
  it("excludes only its own document when checking the full weekly replacement", async () => {
    const { original, documents } = await fixture(), plan = await prepareCalendarMutation({ action: "edit", original, replacement: { ...original, start: "09:30", end: "10:30" } }, people);
    expect(() => validateCalendarMutationAgainst(plan, documents)).not.toThrow();
    documents.classroomSchedules.push({ ...documents.classroomSchedules[0], id: "other", validFrom: "2027-06-07", validTo: "2027-06-07" });
    expect(() => validateCalendarMutationAgainst(plan, documents)).toThrow("ชน");
  });
  it("keeps the DL evening round and 75-person 406+407 requirement, with directory IDs", async () => {
    const { original } = await fixture(exam), plan = await prepareCalendarMutation({ action: "edit", original, replacement: { ...original, date: "2027-05-20" } }, people);
    expect(plan.value.locations).toEqual(["ห้อง 406", "ห้อง 407"]);expect(plan.value.startTime).toBe("17:00");expect(plan.value.studentCount).toBe(75);
    await expect(prepareCalendarMutation({ action: "edit", original, replacement: { ...original, rooms: ["406"] } }, people)).rejects.toThrow("เกิน 40");
    await expect(prepareCalendarMutation({ action: "edit", original, replacement: { ...original, proctors: ["unknown"] } }, people)).rejects.toThrow("UID");
  });
  it("rejects unsupported identity, kind changes, multi-room edits and ranges above 400 days", async () => {
    const { original } = await fixture();
    for (const source of [null, { ...original.source, version: -1 }, { ...original.source, documentId: "legacy" }, { ...original.source, collection: "users" }]) await expect(prepareCalendarMutation({ action: "cancel", original: { ...original, source } }, people)).rejects.toHaveProperty("code", "calendar-write-validation");
    await expect(prepareCalendarMutation({ action: "edit", original, replacement: exam }, people)).rejects.toThrow("ประเภท");
    await expect(prepareCalendarMutation({ action: "edit", original, replacement: { ...original, rooms: ["401", "402"] } }, people)).rejects.toThrow();
    await expect(prepareCalendarMutation({ action: "edit", original, replacement: { ...original, validTo: "2029-01-01" } }, people)).rejects.toThrow("400");
  });
});
