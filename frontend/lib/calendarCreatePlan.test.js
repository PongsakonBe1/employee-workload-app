import { describe, expect, it } from "vitest";
import { prepareCalendarCreate, validateCalendarCreateAgainst } from "./calendarCreatePlan.js";
const people = [{
  id: "staff-a",
  label: "Synthetic staff",
  identity: "directory"
}];
const rule = {
  id: "draft",
  kind: "classroom",
  title: "Synthetic class",
  rooms: ["402"],
  weekday: 0,
  validFrom: "2026-11-02",
  validTo: "2026-11-30",
  start: "10:00",
  end: "12:00",
  teacher: "Test teacher",
  semester: "2/2569"
};
const exam = {
  id: "exam",
  kind: "dl",
  title: "Synthetic DL",
  date: "2026-11-03",
  start: "17:00",
  end: "18:30",
  rooms: ["406", "407"],
  participants: 75,
  proctors: ["staff-a"],
  examType: "student",
  semester: "2/2569"
};
const documents = {
  users: [{
    id: "staff-a",
    displayName: "Synthetic staff",
    role: "staff",
    active: true
  }],
  classroomSchedules: [],
  dlExamSchedules: []
};
describe("append-only calendar create plan", () => {
  it("rejects malformed row types with a validation message before any write", async () => {
    for (const value of [null, 123, {
      ...rule,
      title: 42
    }]) await expect(prepareCalendarCreate({
      rules: [value],
      events: []
    }, people)).rejects.toHaveProperty("code", "calendar-write-validation");
    await expect(prepareCalendarCreate({
      rules: [],
      events: [{
        ...exam,
        proctors: "staff-a"
      }]
    }, people)).rejects.toHaveProperty("code", "calendar-write-validation");
  });
  it("uses stable document and operation IDs across UI IDs and row ordering", async () => {
    const first = await prepareCalendarCreate({
      rules: [rule],
      events: [exam]
    }, people);
    const second = await prepareCalendarCreate({
      rules: [{
        ...rule,
        id: "different"
      }],
      events: [{
        ...exam,
        id: "another"
      }]
    }, people);
    expect(first).toEqual(second);
    expect(first.operationId).toMatch(/^op-[a-f0-9]{64}$/);
    expect(first.entries[1].value).not.toHaveProperty("proctorNames");
    expect(first.entries[1].value.startTime).toBe("17:00");
  });
  it("rejects duplicate rows, empty batches and batches above the pilot limit", async () => {
    for (const input of [{
      rules: [],
      events: []
    }, {
      rules: [rule, rule],
      events: []
    }, {
      rules: Array(101).fill(rule),
      events: []
    }]) await expect(prepareCalendarCreate(input, people)).rejects.toHaveProperty("code", "calendar-write-validation");
  });
  it("requires real directory IDs and explicit exam type rather than temporary names", async () => {
    for (const patch of [{
      proctors: ["unmapped"]
    }, {
      examType: undefined
    }, {
      proctors: ["staff-a", "staff-a"]
    }]) await expect(prepareCalendarCreate({
      rules: [],
      events: [{
        ...exam,
        ...patch
      }]
    }, people)).rejects.toHaveProperty("code", "calendar-write-validation");
  });
  it("validates room allocation per round and rejects unknown activity contracts", async () => {
    await expect(prepareCalendarCreate({
      rules: [],
      events: [{
        ...exam,
        rooms: ["406"]
      }]
    }, people)).rejects.toThrow("40");
    await expect(prepareCalendarCreate({
      rules: [],
      events: [{
        ...exam,
        kind: "exam"
      }]
    }, people)).rejects.toHaveProperty("code", "calendar-write-validation");
  });
  it("rejects forged source references, invalid dates and overlong text", async () => {
    for (const patch of [{
      source: {
        collection: "users",
        documentId: "admin"
      }
    }, {
      validFrom: "2026-02-31"
    }, {
      title: "x".repeat(301)
    }]) await expect(prepareCalendarCreate({
      rules: [{
        ...rule,
        ...patch
      }],
      events: []
    }, people)).rejects.toHaveProperty("code", "calendar-write-validation");
  });
  it("detects conflicts inside the submitted batch and against fresh existing records", async () => {
    const internal = await prepareCalendarCreate({
      rules: [rule, {
        ...rule,
        title: "Other class",
        start: "11:00",
        end: "13:00"
      }],
      events: []
    }, people);
    expect(() => validateCalendarCreateAgainst(internal, documents)).toThrow("ชน");
    const plan = await prepareCalendarCreate({
      rules: [rule],
      events: []
    }, people);
    expect(() => validateCalendarCreateAgainst(plan, {
      ...documents,
      classroomSchedules: [{
        id: "legacy",
        ...plan.entries[0].value
      }]
    })).toThrow("ชน");
  });
  it("permits adjacent time boundaries and keeps term boundaries distinct", async () => {
    const plan = await prepareCalendarCreate({
      rules: [rule, {
        ...rule,
        title: "Adjacent class",
        start: "12:00",
        end: "13:00"
      }, {
        ...rule,
        title: "Later term",
        validFrom: "2026-12-07",
        validTo: "2026-12-28"
      }],
      events: []
    }, people);
    expect(validateCalendarCreateAgainst(plan, documents).entries).toHaveLength(3);
  });
  it("skips identical deterministic documents without overwriting them", async () => {
    const plan = await prepareCalendarCreate({
      rules: [rule],
      events: []
    }, people);
    expect(validateCalendarCreateAgainst(plan, {
      ...documents,
      classroomSchedules: [{
        id: plan.entries[0].id,
        ...plan.entries[0].value
      }]
    })).toMatchObject({
      entries: [],
      skipped: 1
    });
  });
  it("fails closed when existing data cannot be adapted completely", async () => {
    const plan = await prepareCalendarCreate({
      rules: [rule],
      events: []
    }, people);
    expect(() => validateCalendarCreateAgainst(plan, {
      ...documents,
      classroomSchedules: [{
        id: "bad",
        isActive: true
      }]
    })).toThrow("ไม่ครบ");
  });
});
