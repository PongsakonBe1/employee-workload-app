import { describe, it, expect } from "vitest";
import { ASSESSMENT_SECTIONS, DEFAULT_ASSESSMENT_MAPPING, assessmentSection, assessmentTaskCatalog, validateAssessment, assessmentResult, assessmentText, assessmentDistribution } from "./assessmentPreview";
const people = [{
  id: "a",
  displayName: "เจ้าหน้าที่ A"
}, {
  id: "b",
  displayName: "เจ้าหน้าที่ B"
}];
const admin = {
    id: "a",
    role: "admin"
  },
  staff = {
    id: "a",
    role: "staff"
  };
const criteria = {
  start: "2026-11-01",
  end: "2026-11-30",
  personId: "a",
  year: 2570,
  round: "1"
};
const catalog = ["ยืมหูฟัง", "คืนหูฟัง", "Gmail", "ติดตั้ง Software"].map(label => ({
  label,
  major: "หมวดตัวอย่าง"
}));
const logs = [{
  id: "1",
  employeeId: "a",
  date: "2026-11-06",
  minorTask: "Gmail",
  comboGroupId: "same"
}, {
  id: "2",
  employeeId: "a",
  date: "2026-11-06",
  minorTask: "Gmail",
  comboGroupId: "same"
}, {
  id: "3",
  employeeId: "a",
  date: "2026-11-06",
  minorTask: "ยืมหูฟัง",
  comboGroupId: "same"
}, {
  id: "4",
  employeeId: "b",
  date: "2026-11-06",
  minorTask: "Gmail"
}];
const get = (rows = logs, value = criteria, actor = staff, mapping = DEFAULT_ASSESSMENT_MAPPING, limit = 1000) => assessmentResult(rows, people, value, actor, catalog, mapping, limit);
describe("Assessment summary contracts", () => {
  it("includes every catalog task at zero and retains out-of-catalog historical work", () => {
    const entries = assessmentTaskCatalog([{
      task: "Gmail"
    }, {
      task: "งานเดิมนอกบัญชี"
    }], catalog);
    expect(entries).toHaveLength(5);
    expect(entries.find(row => row.task === "คืนหูฟัง").count).toBe(0);
    expect(entries.at(-1)).toMatchObject({
      known: false,
      count: 1
    });
  });
  it("counts each Combo child once even when two children share the same minorTask", () => {
    const result = get([...logs, logs[0]]);
    expect(result.rows).toHaveLength(3);
    expect(result.sections.find(section => section.id === "1.5").tasks.find(task => task.task === "Gmail").count).toBe(2);
    expect(result.sections.reduce((sum, section) => sum + section.count, result.unmappedCount)).toBe(3);
  });
  it("uses exact employee IDs and cannot label another person's data as the current staff member", () => {
    expect(() => get(logs, {
      ...criteria,
      personId: "b"
    })).toThrow(/สิทธิ์/);
    expect(get(logs, {
      ...criteria,
      personId: "b"
    }, admin).rows.map(row => row.id)).toEqual(["4"]);
    expect(() => get(logs, criteria, {
      id: "a",
      role: "pending"
    })).toThrow();
    expect(() => get(logs, {
      ...criteria,
      personId: "missing"
    }, admin)).toThrow();
  });
  it("accepts three fiscal rounds and a manually specified new-hire period without dividing the year", () => {
    for (const round of ["1", "2", "3", "newhire"]) expect(validateAssessment({
      ...criteria,
      round
    }, people, staff)).toMatchObject({
      start: "2026-11-01",
      end: "2026-11-30",
      round
    });
    expect(validateAssessment({
      ...criteria,
      round: "newhire",
      start: "2026-09-15",
      end: "2026-12-14"
    }, people, staff).start).toBe("2026-09-15");
  });
  it("rejects invalid/reversed periods, unsupported rounds and incorrectly labelled fiscal years", () => {
    for (const change of [{
      start: "2026-02-30"
    }, {
      start: "2026-12-01"
    }, {
      year: 2569
    }, {
      round: "4"
    }]) expect(() => validateAssessment({
      ...criteria,
      ...change
    }, people, staff)).toThrow();
  });
  it("leaves ambiguous installation/repair work unmapped instead of guessing employer or IT Clinic", () => {
    const result = get([{
      id: "x",
      employeeId: "a",
      date: "2026-11-06",
      minorTask: "ติดตั้ง Software"
    }]);
    expect(result.unmappedCount).toBe(1);
    expect(result.sections.find(section => section.id === "1.7").count).toBe(0);
    expect(result.sections.find(section => section.id === "1.1").tasks).toHaveLength(0);
    expect(assessmentText(result, people[0])).toContain("ยังไม่มีหัวข้อที่จับคู่");
  });
  it("requires a mapping to an actual form heading and ignores inherited object properties", () => {
    expect(assessmentSection("constructor", {})).toBe("unmapped");
    expect(assessmentSection("Gmail", {
      Gmail: "not-a-section"
    })).toBe("unmapped");
    expect(assessmentSection("Gmail", {
      Gmail: "1.5"
    })).toBe("1.5");
  });
  it("shows partial counts but blocks copy until all pages are loaded", () => {
    const rows = Array.from({
      length: 1005
    }, (_, id) => ({
      id: String(id),
      date: "2026-11-06",
      employeeId: "a",
      minorTask: "Gmail"
    }));
    const first = get(rows);
    expect(first.partial).toBe(true);
    expect(first.canCopy).toBe(false);
    expect(() => assessmentText(first, people[0])).toThrow();
    const all = get(rows, criteria, staff, DEFAULT_ASSESSMENT_MAPPING, 2000);
    expect(all.canCopy).toBe(true);
    expect(assessmentText(all, people[0])).toContain("Gmail / 1005 ครั้ง");
  });
  it("does not silently copy a complete-looking report when the person's dates are invalid", () => {
    const result = get([...logs, {
      id: "invalid",
      employeeId: "a",
      date: "2026-02-30"
    }]);
    expect(result.invalid).toBe(1);
    expect(result.canCopy).toBe(false);
    expect(() => assessmentText(result, people[0])).toThrow();
  });
  it("copies structured evidence with zero, unmapped and non-score context, without recipient details", () => {
    const result = get([...logs, {
      id: "unknown",
      employeeId: "a",
      date: "2026-11-06",
      minorTask: "ติดตั้ง Software",
      recipient: "synthetic-private"
    }]);
    const text = assessmentText(result, people[0]);
    expect(text).toContain("คืนหูฟัง / 0 ครั้ง");
    expect(text).toContain("ติดตั้ง Software / 1 ครั้ง");
    expect(text).toContain("ไม่ใช่คะแนน");
    expect(text).not.toContain("synthetic-private");
    expect(result.sections.map(section => section.id)).toEqual(ASSESSMENT_SECTIONS.map(section => section.id));
  });
  it("keeps person distribution in roster order, preserves unknown headings and reconciles raw totals", () => {
    const result = get(logs, criteria, admin);
    const distribution = assessmentDistribution(result.rows, people, DEFAULT_ASSESSMENT_MAPPING);
    expect(distribution.map(person => [person.id, person.total])).toEqual([["a", 3], ["b", 0]]);
    expect(distribution[0].segments.reduce((sum, segment) => sum + segment.count, 0)).toBe(3);
    expect(assessmentDistribution([{
      employeeId: "a",
      task: "ambiguous"
    }], people, {})[0].segments.at(-1).count).toBe(1);
  });
});
