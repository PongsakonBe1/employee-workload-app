import { describe, it, expect } from "vitest";
import { JD_CATEGORIES, planningRange, planningFiscalYear, stepPlanningRange, planningQueryPlan, planningData, planningSummary, planningCounts, planningTrend, planningStaff, validateJD, planningJD, planningCSV } from "./planningPreview";
const people = [{
  id: "a",
  displayName: "เจ้าหน้าที่ A (หนึ่ง)"
}, {
  id: "b",
  displayName: "เจ้าหน้าที่ B (สอง)"
}];
const admin = {
    id: "a",
    role: "admin"
  },
  staff = {
    id: "a",
    role: "staff"
  };
const range = {
  start: "2026-11-02",
  end: "2026-11-08"
};
const logs = [{
  id: "1",
  date: "2026-11-02",
  employeeId: "a",
  minorTask: "บริการ",
  comboGroupId: "combo-1"
}, {
  id: "2",
  date: "2026-11-02",
  employeeId: "a",
  minorTask: "ติดตั้ง",
  comboGroupId: "combo-1"
}, {
  id: "3",
  date: "2026-11-06",
  employeeId: "b",
  minorTask: "บริการ",
  comboGroupId: "combo-1"
}];
const weights = Object.fromEntries(JD_CATEGORIES.map(([id]) => [id, 12.5]));
describe("Planning counts and period contracts", () => {
  it("uses a Monday–Sunday week, leap month, and fiscal October boundaries", () => {
    expect(planningRange("week", "2026-11-08")).toEqual(range);
    expect(planningRange("day", "2026-11-06")).toEqual({
      start: "2026-11-06",
      end: "2026-11-06"
    });
    expect(planningRange("month", "2028-02-17").end).toBe("2028-02-29");
    expect(planningFiscalYear("2026-09-30")).toBe(2569);
    expect(planningFiscalYear("2026-10-01")).toBe(2570);
    expect(planningRange("fiscal", "2026-11-06", 2570)).toEqual({
      start: "2026-10-01",
      end: "2027-09-30"
    });
    expect(planningRange("quarter", "2026-11-06")).toEqual({
      start: "2026-10-01",
      end: "2026-12-31"
    });
  });
  it("moves full months, quarters, fiscal years and custom periods without clipping", () => {
    for (const mode of ["week", "month", "quarter", "fiscal", "day"]) {
      const selection = {
        mode,
        anchor: "2026-11-06",
        range: planningRange(mode, "2026-11-06")
      };
      expect(stepPlanningRange(stepPlanningRange(selection, 1), -1).range).toEqual(selection.range);
    }
    expect(stepPlanningRange({
      mode: "custom",
      range: {
        start: "2026-11-01",
        end: "2026-11-03"
      }
    }, 1).range).toEqual({
      start: "2026-11-04",
      end: "2026-11-06"
    });
  });
  it("rejects impossible or reversed dates, invalid fiscal year and modes", () => {
    for (const [mode, anchor, year, custom] of [["week", "2026-02-30"], ["fiscal", "2026-11-06", ""], ["fiscal", "2026-11-06", 2570.2], ["custom", "2026-11-06", 2570, {
      start: "2026-11-08",
      end: "2026-11-01"
    }], ["unknown", "2026-11-06"]]) expect(() => planningRange(mode, anchor, year, custom)).toThrow();
  });
  it("restricts staff queries by immutable employee ID regardless of selected person", () => {
    expect(planningQueryPlan(range, staff, "b").where.at(-1)).toEqual(["employeeId", "==", "a"]);
    expect(planningQueryPlan(range, admin).where).toHaveLength(2);
    expect(planningQueryPlan(range, admin, "b", "cursor")).toMatchObject({
      limit: 1000,
      startAfter: "cursor",
      orderBy: [["date", "asc"]]
    });
    for (const actor of [null, {
      id: "a",
      role: "pending"
    }, {
      role: "staff"
    }]) expect(() => planningQueryPlan(range, actor)).toThrow();
  });
  it("deduplicates IDs, excludes out-of-range/invalid days and retains unknown people for admin reconciliation", () => {
    const result = planningData([...logs, logs[0], {
      id: "bad",
      date: "2026-02-30",
      employeeId: "a"
    }, {
      id: "outside",
      date: "2026-10-31",
      employeeId: "b"
    }, {
      id: "unknown",
      date: "2026-11-06",
      employeeId: "missing"
    }], people, range, admin);
    expect(result.rows).toHaveLength(4);
    expect(result.invalid).toBe(1);
    expect(planningSummary(result.rows)).toMatchObject({
      activities: 4,
      unresolved: 1,
      people: 2,
      comboGroups: 2,
      groupedActivities: 3,
      days: 2,
      tasks: 3
    });
  });
  it("does not infer authorization from similar names or nickname aliases", () => {
    const result = planningData([...logs, {
      id: "forged",
      date: "2026-11-06",
      person: people[0].displayName
    }], people, range, staff, "b");
    expect(result.rows.map(row => row.id)).toEqual(["1", "2"]);
    expect(result.invalid).toBe(0);
  });
  it("loads 1000 at a time deterministically after scoping and never silently treats partial data as complete", () => {
    const data = Array.from({
      length: 1005
    }, (_, i) => ({
      id: String(i).padStart(4, "0"),
      date: "2026-11-06",
      employeeId: "a",
      minorTask: "บริการ"
    })).reverse();
    const first = planningData(data, people, range, admin),
      second = planningData(data, people, range, admin, "all", 2000);
    expect(first.rows).toHaveLength(1000);
    expect(first.partial).toBe(true);
    expect(first.rows[0].id).toBe("0000");
    expect(second.rows).toHaveLength(1005);
    expect(second.partial).toBe(false);
    expect(planningSummary(second.rows).activities).toBe(1005);
  });
  it("zero-fills daily, monthly and yearly buckets while preserving totals", () => {
    const normalized = planningData(logs, people, range, admin).rows;
    const week = planningTrend(normalized, range);
    expect(week.unit).toBe("day");
    expect(week.values).toHaveLength(7);
    expect(week.values[0].count).toBe(2);
    expect(week.values[6].count).toBe(0);
    const fiscal = planningTrend(normalized, planningRange("fiscal", "2026-11-06"));
    expect(fiscal.unit).toBe("month");
    expect(fiscal.values).toHaveLength(12);
    expect(fiscal.values.reduce((n, row) => n + row.count, 0)).toBe(3);
    expect(planningTrend([], {
      start: "2020-01-01",
      end: "2026-12-31"
    }).values).toHaveLength(7);
  });
  it("counts staff in roster order and retains zero activity, with exact display-name search", () => {
    const rows = planningData(logs, people, range, admin).rows;
    expect(planningStaff(rows, people).map(row => [row.id, row.activities, row.tasks, row.days])).toEqual([["a", 2, 2, 1], ["b", 1, 1, 1]]);
    expect(planningStaff([], people, "สอง")[0].activities).toBe(0);
    expect(planningStaff(rows, people, "", "b").map(row => row.id)).toEqual(["b"]);
    expect(planningCounts(rows, "task").reduce((sum, [, count]) => sum + count, 0)).toBe(3);
  });
  it("validates team-wide weights and leaves invalid mappings unmapped", () => {
    const profile = validateJD({
      year: 2570,
      weights,
      mapping: {
        บริการ: "support",
        ติดตั้ง: "other"
      }
    });
    expect(Object.values(profile.weights).reduce((n, value) => n + value, 0)).toBe(100);
    expect(profile.mapping).toEqual({
      บริการ: "support"
    });
    expect(() => validateJD({
      year: 2570,
      weights: {
        ...weights,
        rooms: 0
      }
    })).toThrow(/100%/);
    expect(() => validateJD({
      year: 2570,
      weights: {
        ...weights,
        rooms: ""
      }
    })).toThrow();
    expect(() => validateJD({
      year: 2570,
      weights: {
        ...weights,
        rooms: -1
      }
    })).toThrow();
  });
  it("counts JD activities only inside selected fiscal year without cross-year weight inheritance", () => {
    const rows = planningData(logs, people, range, admin).rows;
    const profile = validateJD({
      year: 2570,
      weights,
      mapping: {
        บริการ: "support"
      }
    });
    const jd = planningJD([...rows, {
      date: "2026-09-30",
      task: "บริการ"
    }], 2570, profile);
    expect(jd.find(row => row.id === "support").count).toBe(2);
    expect(jd.at(-1).count).toBe(1);
    expect(jd.reduce((n, row) => n + row.count, 0)).toBe(3);
    expect(planningJD(rows, 2571, null).every(row => row.count === 0 && row.weight === null)).toBe(true);
  });
  it("exports the displayed rows and partial scope safely, including quotes and formula-like names", () => {
    const csv = planningCSV([{
      displayName: '=SUM(1,2)"\n',
      activities: 3,
      tasks: 2,
      days: 1
    }], range, true);
    expect(csv).toContain('"\'=SUM(1,2)""\n"');
    expect(csv).toContain("ยังโหลดไม่ครบช่วง");
    expect(planningCSV([], range, false).split("\r\n")).toHaveLength(1);
  });
});
