/**
 * Unit Tests for Staff Metrics
 * Phase 3 SR-2 — Staff Efficiency Radar Chart
 *
 * Test coverage:
 * - All 6 calculation functions
 * - Edge cases (empty data, single day, etc.)
 * - Helper functions
 * - Aggregate functions
 */

import { describe, it, expect } from "vitest";
import {
  calculateVolume,
  calculateVersatility,
  calculateConsistency,
  calculatePeakHandling,
  calculateDocumentation,
  calculateComboUsage,
  calculateRadarMetrics,
  getTeamAverage,
  getRankingByMetric,
  getTopPerformer,
  hasDetail,
  isQuickLog,
  PEAK_HOURS,
  REFERENCE,
} from "./staffMetrics";

// Test fixtures
const EMPLOYEE_A = "user_001";
const EMPLOYEE_B = "user_002";
const EMPLOYEE_C = "user_003";

const DATE_RANGE_JUNE = { start: "2026-06-01", end: "2026-06-30" };
const DATE_RANGE_MAY = { start: "2026-05-01", end: "2026-05-31" };

describe("REFERENCE constants", () => {
  it("should have correct reference values", () => {
    expect(REFERENCE.VOLUME).toBe(50);
    expect(REFERENCE.VERSATILITY).toBe(10);
    expect(REFERENCE.CONSISTENCY_CV).toBe(2);
  });

  it("should have correct peak hours", () => {
    expect(PEAK_HOURS).toEqual(["08", "12", "13", "17"]);
  });
});

describe("calculateVolume", () => {
  it("should return 0 for no worklogs", () => {
    const worklogs = [];
    expect(calculateVolume(EMPLOYEE_A, worklogs, DATE_RANGE_JUNE)).toBe(0);
  });

  it("should calculate 50 worklogs as 100%", () => {
    const worklogs = Array.from({ length: 50 }, (_, i) => ({
      employeeId: EMPLOYEE_A,
      date: "2026-06-15",
      time: "09:00",
      minorTask: "Test",
    }));
    expect(calculateVolume(EMPLOYEE_A, worklogs, DATE_RANGE_JUNE)).toBe(100);
  });

  it("should cap at 100% for more than 50 worklogs", () => {
    const worklogs = Array.from({ length: 75 }, (_, i) => ({
      employeeId: EMPLOYEE_A,
      date: "2026-06-15",
      time: "09:00",
      minorTask: "Test",
    }));
    expect(calculateVolume(EMPLOYEE_A, worklogs, DATE_RANGE_JUNE)).toBe(100);
  });

  it("should return 50% for 25 worklogs", () => {
    const worklogs = Array.from({ length: 25 }, (_, i) => ({
      employeeId: EMPLOYEE_A,
      date: "2026-06-15",
      time: "09:00",
      minorTask: "Test",
    }));
    expect(calculateVolume(EMPLOYEE_A, worklogs, DATE_RANGE_JUNE)).toBe(50);
  });

  it("should only count worklogs for specified employee", () => {
    const worklogs = [
      { employeeId: EMPLOYEE_A, date: "2026-06-15", time: "09:00" },
      { employeeId: EMPLOYEE_A, date: "2026-06-15", time: "10:00" },
      { employeeId: EMPLOYEE_B, date: "2026-06-15", time: "09:00" },
    ];
    expect(calculateVolume(EMPLOYEE_A, worklogs, DATE_RANGE_JUNE)).toBe(4); // 2/50 * 100 = 4
  });

  it("should only count worklogs within date range", () => {
    const worklogs = [
      { employeeId: EMPLOYEE_A, date: "2026-05-15", time: "09:00" }, // May - outside
      { employeeId: EMPLOYEE_A, date: "2026-06-15", time: "10:00" }, // June - inside
      { employeeId: EMPLOYEE_A, date: "2026-07-15", time: "09:00" }, // July - outside
    ];
    expect(calculateVolume(EMPLOYEE_A, worklogs, DATE_RANGE_JUNE)).toBe(2); // 1/50 * 100 = 2
  });
});

describe("calculateVersatility", () => {
  it("should return 0 for no worklogs", () => {
    const worklogs = [];
    expect(calculateVersatility(EMPLOYEE_A, worklogs, DATE_RANGE_JUNE)).toBe(0);
  });

  it("should calculate 10 unique tasks as 100%", () => {
    const worklogs = Array.from({ length: 10 }, (_, i) => ({
      employeeId: EMPLOYEE_A,
      date: "2026-06-15",
      minorTask: `Task-${i}`,
    }));
    expect(calculateVersatility(EMPLOYEE_A, worklogs, DATE_RANGE_JUNE)).toBe(100);
  });

  it("should cap at 100% for more than 10 unique tasks", () => {
    const worklogs = Array.from({ length: 15 }, (_, i) => ({
      employeeId: EMPLOYEE_A,
      date: "2026-06-15",
      minorTask: `Task-${i}`,
    }));
    expect(calculateVersatility(EMPLOYEE_A, worklogs, DATE_RANGE_JUNE)).toBe(100);
  });

  it("should return 50% for 5 unique tasks", () => {
    const worklogs = [
      { employeeId: EMPLOYEE_A, date: "2026-06-15", minorTask: "Task-A" },
      { employeeId: EMPLOYEE_A, date: "2026-06-15", minorTask: "Task-B" },
      { employeeId: EMPLOYEE_A, date: "2026-06-15", minorTask: "Task-C" },
      { employeeId: EMPLOYEE_A, date: "2026-06-15", minorTask: "Task-D" },
      { employeeId: EMPLOYEE_A, date: "2026-06-15", minorTask: "Task-E" },
    ];
    expect(calculateVersatility(EMPLOYEE_A, worklogs, DATE_RANGE_JUNE)).toBe(50);
  });

  it("should not count duplicate tasks", () => {
    const worklogs = [
      { employeeId: EMPLOYEE_A, date: "2026-06-15", minorTask: "Same-Task" },
      { employeeId: EMPLOYEE_A, date: "2026-06-16", minorTask: "Same-Task" },
      { employeeId: EMPLOYEE_A, date: "2026-06-17", minorTask: "Same-Task" },
    ];
    expect(calculateVersatility(EMPLOYEE_A, worklogs, DATE_RANGE_JUNE)).toBe(10); // 1/10 * 100 = 10
  });

  it("should filter out null/undefined minorTasks", () => {
    const worklogs = [
      { employeeId: EMPLOYEE_A, date: "2026-06-15", minorTask: "Task-A" },
      { employeeId: EMPLOYEE_A, date: "2026-06-15", minorTask: null },
      { employeeId: EMPLOYEE_A, date: "2026-06-15", minorTask: undefined },
    ];
    expect(calculateVersatility(EMPLOYEE_A, worklogs, DATE_RANGE_JUNE)).toBe(10); // 1/10 * 100 = 10
  });
});

describe("calculateConsistency", () => {
  it("should return 0 for no worklogs", () => {
    const worklogs = [];
    expect(calculateConsistency(EMPLOYEE_A, worklogs, DATE_RANGE_JUNE)).toBe(0);
  });

  it("should return 100% for single day (perfect consistency)", () => {
    const worklogs = [
      { employeeId: EMPLOYEE_A, date: "2026-06-15", time: "09:00" },
      { employeeId: EMPLOYEE_A, date: "2026-06-15", time: "10:00" },
      { employeeId: EMPLOYEE_A, date: "2026-06-15", time: "11:00" },
    ];
    expect(calculateConsistency(EMPLOYEE_A, worklogs, DATE_RANGE_JUNE)).toBe(100);
  });

  it("should return 100% for perfectly consistent daily counts", () => {
    const worklogs = [
      // 3 days, 5 tasks each
      ...Array.from({ length: 5 }, () => ({
        employeeId: EMPLOYEE_A,
        date: "2026-06-15",
        time: "09:00",
      })),
      ...Array.from({ length: 5 }, () => ({
        employeeId: EMPLOYEE_A,
        date: "2026-06-16",
        time: "09:00",
      })),
      ...Array.from({ length: 5 }, () => ({
        employeeId: EMPLOYEE_A,
        date: "2026-06-17",
        time: "09:00",
      })),
    ];
    expect(calculateConsistency(EMPLOYEE_A, worklogs, DATE_RANGE_JUNE)).toBe(100);
  });

  it("should calculate lower consistency for variable daily counts", () => {
    const worklogs = [
      // Day 1: 10 tasks, Day 2: 0 tasks, Day 3: 10 tasks
      ...Array.from({ length: 10 }, () => ({
        employeeId: EMPLOYEE_A,
        date: "2026-06-15",
        time: "09:00",
      })),
      ...Array.from({ length: 10 }, () => ({
        employeeId: EMPLOYEE_A,
        date: "2026-06-17",
        time: "09:00",
      })),
    ];
    // Mean = 6.67, Std = 5.77, CV = 0.866, Score = 100 - (0.866 * 50) ≈ 57
    const score = calculateConsistency(EMPLOYEE_A, worklogs, DATE_RANGE_JUNE);
    expect(score).toBeGreaterThan(50);
    expect(score).toBeLessThan(60);
  });

  it("should return 0 for very high variation (CV >= 2)", () => {
    const worklogs = [
      { employeeId: EMPLOYEE_A, date: "2026-06-15", time: "09:00" },
      { employeeId: EMPLOYEE_A, date: "2026-06-16", time: "09:00" },
      { employeeId: EMPLOYEE_A, date: "2026-06-17", time: "09:00" },
      { employeeId: EMPLOYEE_A, date: "2026-06-17", time: "10:00" },
      { employeeId: EMPLOYEE_A, date: "2026-06-17", time: "11:00" },
    ];
    // Day 1: 1, Day 2: 1, Day 3: 3. Mean=1.67, Std=1.11, CV=0.667
    const score = calculateConsistency(EMPLOYEE_A, worklogs, DATE_RANGE_JUNE);
    expect(score).toBeGreaterThan(60);
  });
});

describe("calculatePeakHandling", () => {
  it("should return 0 for no worklogs", () => {
    const worklogs = [];
    expect(calculatePeakHandling(EMPLOYEE_A, worklogs, DATE_RANGE_JUNE)).toBe(0);
  });

  it("should return 100% for all worklogs in peak hours", () => {
    const worklogs = [
      { employeeId: EMPLOYEE_A, date: "2026-06-15", time: "08:30" },
      { employeeId: EMPLOYEE_A, date: "2026-06-15", time: "12:00" },
      { employeeId: EMPLOYEE_A, date: "2026-06-15", time: "13:15" },
      { employeeId: EMPLOYEE_A, date: "2026-06-15", time: "17:00" },
    ];
    expect(calculatePeakHandling(EMPLOYEE_A, worklogs, DATE_RANGE_JUNE)).toBe(100);
  });

  it("should return 0% for no worklogs in peak hours", () => {
    const worklogs = [
      { employeeId: EMPLOYEE_A, date: "2026-06-15", time: "09:00" },
      { employeeId: EMPLOYEE_A, date: "2026-06-15", time: "10:00" },
      { employeeId: EMPLOYEE_A, date: "2026-06-15", time: "14:00" },
      { employeeId: EMPLOYEE_A, date: "2026-06-15", time: "16:00" },
    ];
    expect(calculatePeakHandling(EMPLOYEE_A, worklogs, DATE_RANGE_JUNE)).toBe(0);
  });

  it("should return 50% for half in peak hours", () => {
    const worklogs = [
      { employeeId: EMPLOYEE_A, date: "2026-06-15", time: "08:00" }, // peak
      { employeeId: EMPLOYEE_A, date: "2026-06-15", time: "12:00" }, // peak
      { employeeId: EMPLOYEE_A, date: "2026-06-15", time: "09:00" }, // not peak
      { employeeId: EMPLOYEE_A, date: "2026-06-15", time: "10:00" }, // not peak
    ];
    expect(calculatePeakHandling(EMPLOYEE_A, worklogs, DATE_RANGE_JUNE)).toBe(50);
  });

  it("should handle missing time gracefully", () => {
    const worklogs = [
      { employeeId: EMPLOYEE_A, date: "2026-06-15", time: "" },
      { employeeId: EMPLOYEE_A, date: "2026-06-15", time: undefined },
      { employeeId: EMPLOYEE_A, date: "2026-06-15", time: "08:00" },
    ];
    expect(calculatePeakHandling(EMPLOYEE_A, worklogs, DATE_RANGE_JUNE)).toBeCloseTo(33.33, 1);
  });
});

describe("hasDetail", () => {
  it("should return false for empty comment", () => {
    expect(hasDetail("")).toBe(false);
  });

  it("should return false for null/undefined comment", () => {
    expect(hasDetail(null)).toBe(false);
    expect(hasDetail(undefined)).toBe(false);
  });

  it("should return false for short comment (< 20 chars)", () => {
    expect(hasDetail("แก้แล้ว")).toBe(false);
    expect(hasDetail("Short comment")).toBe(false);
  });

  it("should return true for comment >= 20 chars", () => {
    expect(hasDetail("แก้ไขปัญหา wifi ห้อง 303 เรียบร้อย")).toBe(true);
    expect(hasDetail("This is a detailed comment about the issue")).toBe(true);
  });

  it("should trim whitespace before counting", () => {
    expect(hasDetail("   แก้ไขปัญหาเรียบร้อยแล้ว   ")).toBe(true);
  });
});

describe("calculateDocumentation", () => {
  it("should return 0 for no worklogs", () => {
    const worklogs = [];
    expect(calculateDocumentation(EMPLOYEE_A, worklogs, DATE_RANGE_JUNE)).toBe(0);
  });

  it("should return 100% for all worklogs with detail", () => {
    const worklogs = [
      { employeeId: EMPLOYEE_A, date: "2026-06-15", comment: "Detailed comment one" },
      { employeeId: EMPLOYEE_A, date: "2026-06-15", comment: "Another detailed comment here" },
    ];
    expect(calculateDocumentation(EMPLOYEE_A, worklogs, DATE_RANGE_JUNE)).toBe(100);
  });

  it("should return 0% for no worklogs with detail", () => {
    const worklogs = [
      { employeeId: EMPLOYEE_A, date: "2026-06-15", comment: "" },
      { employeeId: EMPLOYEE_A, date: "2026-06-15", comment: "แก้แล้ว" },
      { employeeId: EMPLOYEE_A, date: "2026-06-15", comment: "OK" },
    ];
    expect(calculateDocumentation(EMPLOYEE_A, worklogs, DATE_RANGE_JUNE)).toBe(0);
  });

  it("should calculate correctly for mixed worklogs", () => {
    const worklogs = [
      { employeeId: EMPLOYEE_A, date: "2026-06-15", comment: "Detailed comment one" },
      { employeeId: EMPLOYEE_A, date: "2026-06-15", comment: "" },
      { employeeId: EMPLOYEE_A, date: "2026-06-15", comment: "แก้แล้ว" },
      { employeeId: EMPLOYEE_A, date: "2026-06-15", comment: "Another detailed comment here" },
    ];
    expect(calculateDocumentation(EMPLOYEE_A, worklogs, DATE_RANGE_JUNE)).toBe(50);
  });
});

describe("isQuickLog", () => {
  it("should return true for source='quick-log'", () => {
    expect(isQuickLog({ source: "quick-log" })).toBe(true);
  });

  it("should return true for templateId exists", () => {
    expect(isQuickLog({ templateId: "tpl_123" })).toBe(true);
  });

  it("should return true for comboId exists", () => {
    expect(isQuickLog({ comboId: "combo_456" })).toBe(true);
  });

  it("should return false for manual source", () => {
    expect(isQuickLog({ source: "manual" })).toBe(false);
  });

  it("should return false for no identifiers", () => {
    expect(isQuickLog({})).toBe(false);
    expect(isQuickLog({ source: undefined })).toBe(false);
  });

  it("should return true if any identifier exists", () => {
    expect(isQuickLog({ source: "manual", templateId: "tpl_123" })).toBe(true);
  });
});

describe("calculateComboUsage", () => {
  it("should return 0 for no worklogs", () => {
    const worklogs = [];
    expect(calculateComboUsage(EMPLOYEE_A, worklogs, DATE_RANGE_JUNE)).toBe(0);
  });

  it("should return 100% for all quick logs", () => {
    const worklogs = [
      { employeeId: EMPLOYEE_A, date: "2026-06-15", source: "quick-log" },
      { employeeId: EMPLOYEE_A, date: "2026-06-15", templateId: "tpl_123" },
      { employeeId: EMPLOYEE_A, date: "2026-06-15", comboId: "combo_456" },
    ];
    expect(calculateComboUsage(EMPLOYEE_A, worklogs, DATE_RANGE_JUNE)).toBe(100);
  });

  it("should return 0% for all manual logs", () => {
    const worklogs = [
      { employeeId: EMPLOYEE_A, date: "2026-06-15", source: "manual" },
      { employeeId: EMPLOYEE_A, date: "2026-06-15", source: "excel-seed" },
    ];
    expect(calculateComboUsage(EMPLOYEE_A, worklogs, DATE_RANGE_JUNE)).toBe(0);
  });

  it("should calculate correctly for mixed logs", () => {
    const worklogs = [
      { employeeId: EMPLOYEE_A, date: "2026-06-15", source: "quick-log" },
      { employeeId: EMPLOYEE_A, date: "2026-06-15", source: "manual" },
      { employeeId: EMPLOYEE_A, date: "2026-06-15", templateId: "tpl_123" },
      { employeeId: EMPLOYEE_A, date: "2026-06-15", source: "manual" },
    ];
    expect(calculateComboUsage(EMPLOYEE_A, worklogs, DATE_RANGE_JUNE)).toBe(50);
  });
});

describe("calculateRadarMetrics", () => {
  it("should return all 6 metrics", () => {
    const worklogs = [
      { employeeId: EMPLOYEE_A, date: "2026-06-15", time: "08:00", minorTask: "Task-A", comment: "Detailed comment", source: "quick-log" },
      { employeeId: EMPLOYEE_A, date: "2026-06-15", time: "09:00", minorTask: "Task-B", comment: "Another detailed", source: "manual" },
    ];
    const metrics = calculateRadarMetrics(EMPLOYEE_A, worklogs, DATE_RANGE_JUNE);

    expect(metrics).toHaveProperty("volume");
    expect(metrics).toHaveProperty("versatility");
    expect(metrics).toHaveProperty("consistency");
    expect(metrics).toHaveProperty("peakHandling");
    expect(metrics).toHaveProperty("documentation");
    expect(metrics).toHaveProperty("comboUsage");

    // Check value ranges
    expect(metrics.volume).toBeGreaterThanOrEqual(0);
    expect(metrics.volume).toBeLessThanOrEqual(100);
    expect(metrics.versatility).toBeGreaterThanOrEqual(0);
    expect(metrics.versatility).toBeLessThanOrEqual(100);
  });

  it("should return 0 for all metrics when no worklogs", () => {
    const metrics = calculateRadarMetrics(EMPLOYEE_A, [], DATE_RANGE_JUNE);
    expect(metrics.volume).toBe(0);
    expect(metrics.versatility).toBe(0);
    expect(metrics.consistency).toBe(0);
    expect(metrics.peakHandling).toBe(0);
    expect(metrics.documentation).toBe(0);
    expect(metrics.comboUsage).toBe(0);
  });

  it("should calculate realistic values", () => {
    const worklogs = [
      // 25 worklogs (50% volume)
      ...Array.from({ length: 25 }, (_, i) => ({
        employeeId: EMPLOYEE_A,
        date: `2026-06-${String(1 + Math.floor(i / 5)).padStart(2, "0")}`,
        time: i % 2 === 0 ? "08:00" : "10:00", // 50% peak
        minorTask: `Task-${i % 5}`, // 5 unique tasks (50% versatility)
        comment: i % 2 === 0 ? "Detailed comment with enough length" : "Short",
        source: i % 2 === 0 ? "quick-log" : "manual",
      })),
    ];

    const metrics = calculateRadarMetrics(EMPLOYEE_A, worklogs, DATE_RANGE_JUNE);
    expect(metrics.volume).toBe(50);
    expect(metrics.versatility).toBe(50);
    expect(metrics.peakHandling).toBe(50);
    expect(metrics.comboUsage).toBe(50);
  });
});

describe("getTeamAverage", () => {
  it("should return null for empty array", () => {
    expect(getTeamAverage([])).toBeNull();
  });

  it("should calculate average for single metric set", () => {
    const allMetrics = [
      {
        volume: 100,
        versatility: 80,
        consistency: 90,
        peakHandling: 70,
        documentation: 85,
        comboUsage: 60,
      },
    ];
    const avg = getTeamAverage(allMetrics);
    expect(avg.volume).toBe(100);
    expect(avg.versatility).toBe(80);
  });

  it("should calculate correct averages for multiple staff", () => {
    const allMetrics = [
      { volume: 100, versatility: 100, consistency: 100, peakHandling: 100, documentation: 100, comboUsage: 100 },
      { volume: 0, versatility: 0, consistency: 0, peakHandling: 0, documentation: 0, comboUsage: 0 },
    ];
    const avg = getTeamAverage(allMetrics);
    expect(avg.volume).toBe(50);
    expect(avg.versatility).toBe(50);
    expect(avg.consistency).toBe(50);
    expect(avg.peakHandling).toBe(50);
    expect(avg.documentation).toBe(50);
    expect(avg.comboUsage).toBe(50);
  });
});

describe("getRankingByMetric", () => {
  const staffList = [
    { employeeId: "A", name: "Alice", metrics: { volume: 80, versatility: 60 } },
    { employeeId: "B", name: "Bob", metrics: { volume: 90, versatility: 50 } },
    { employeeId: "C", name: "Charlie", metrics: { volume: 70, versatility: 70 } },
  ];

  it("should rank by volume descending", () => {
    const ranking = getRankingByMetric(staffList, "volume");
    expect(ranking[0].employeeId).toBe("B");
    expect(ranking[0].value).toBe(90);
    expect(ranking[1].employeeId).toBe("A");
    expect(ranking[2].employeeId).toBe("C");
  });

  it("should respect limit parameter", () => {
    const ranking = getRankingByMetric(staffList, "volume", 2);
    expect(ranking).toHaveLength(2);
    expect(ranking[0].employeeId).toBe("B");
    expect(ranking[1].employeeId).toBe("A");
  });

  it("should include name in result", () => {
    const ranking = getRankingByMetric(staffList, "versatility");
    expect(ranking[0].name).toBe("Charlie");
  });
});

describe("getTopPerformer", () => {
  it("should return null for empty array", () => {
    expect(getTopPerformer([])).toBeNull();
  });

  it("should return single staff as top performer", () => {
    const staffList = [
      { employeeId: "A", name: "Alice", metrics: { volume: 100, versatility: 100, consistency: 100, peakHandling: 100, documentation: 100, comboUsage: 100 } },
    ];
    const top = getTopPerformer(staffList);
    expect(top.employeeId).toBe("A");
    expect(top.average).toBe(100);
  });

  it("should calculate highest average correctly", () => {
    const staffList = [
      { employeeId: "A", name: "Alice", metrics: { volume: 100, versatility: 100, consistency: 100, peakHandling: 100, documentation: 100, comboUsage: 100 } },
      { employeeId: "B", name: "Bob", metrics: { volume: 0, versatility: 0, consistency: 0, peakHandling: 0, documentation: 0, comboUsage: 0 } },
      { employeeId: "C", name: "Charlie", metrics: { volume: 60, versatility: 60, consistency: 60, peakHandling: 60, documentation: 60, comboUsage: 60 } },
    ];
    const top = getTopPerformer(staffList);
    expect(top.employeeId).toBe("A");
    expect(top.average).toBe(100);
  });

  it("should handle mixed performance correctly", () => {
    const staffList = [
      { employeeId: "A", name: "Alice", metrics: { volume: 100, versatility: 0, consistency: 0, peakHandling: 0, documentation: 0, comboUsage: 0 } }, // avg = 16.67
      { employeeId: "B", name: "Bob", metrics: { volume: 60, versatility: 60, consistency: 60, peakHandling: 60, documentation: 60, comboUsage: 60 } }, // avg = 60
    ];
    const top = getTopPerformer(staffList);
    expect(top.employeeId).toBe("B"); // Bob has higher average
    expect(top.average).toBe(60);
  });
});

describe("Integration: Full workflow", () => {
  it("should calculate complete team analysis", () => {
    // Mock worklogs for 3 employees
    const worklogs = [
      // Employee A: High volume specialist
      ...Array.from({ length: 60 }, (_, i) => ({
        employeeId: EMPLOYEE_A,
        date: "2026-06-15",
        time: "08:00",
        minorTask: "Same-Task",
        comment: "Detailed comment with enough length",
        source: "quick-log",
      })),
      // Employee B: Balanced all-rounder
      ...Array.from({ length: 40 }, (_, i) => ({
        employeeId: EMPLOYEE_B,
        date: `2026-06-${String(1 + Math.floor(i / 10)).padStart(2, "0")}`,
        time: i % 3 === 0 ? "08:00" : "10:00",
        minorTask: `Task-${i % 8}`,
        comment: i % 2 === 0 ? "Detailed comment" : "OK",
        source: i % 2 === 0 ? "quick-log" : "manual",
      })),
      // Employee C: Low activity
      ...Array.from({ length: 5 }, (_, i) => ({
        employeeId: EMPLOYEE_C,
        date: "2026-06-15",
        time: "10:00",
        minorTask: "Task-A",
        comment: "OK",
        source: "manual",
      })),
    ];

    const employees = [EMPLOYEE_A, EMPLOYEE_B, EMPLOYEE_C];
    const allMetrics = employees.map((emp) => ({
      employeeId: emp,
      name: `Employee-${emp.slice(-3)}`,
      metrics: calculateRadarMetrics(emp, worklogs, DATE_RANGE_JUNE),
    }));

    // Verify individual metrics
    const empAMetrics = allMetrics.find((m) => m.employeeId === EMPLOYEE_A).metrics;
    expect(empAMetrics.volume).toBe(100); // Capped at 100
    expect(empAMetrics.versatility).toBe(10); // Only 1 unique task

    const empBMetrics = allMetrics.find((m) => m.employeeId === EMPLOYEE_B).metrics;
    expect(empBMetrics.volume).toBe(80); // 40/50 * 100
    expect(empBMetrics.versatility).toBe(80); // 8/10 * 100

    // Verify team average
    const teamAvg = getTeamAverage(allMetrics.map((m) => m.metrics));
    expect(teamAvg.volume).toBeGreaterThan(0);
    expect(teamAvg.volume).toBeLessThan(100);

    // Verify ranking
    const volumeRanking = getRankingByMetric(allMetrics, "volume");
    expect(volumeRanking[0].employeeId).toBe(EMPLOYEE_A);
    expect(volumeRanking[2].employeeId).toBe(EMPLOYEE_C);

    // Verify top performer
    const topPerformer = getTopPerformer(allMetrics);
    expect(topPerformer).toBeDefined();
    expect(topPerformer.average).toBeGreaterThan(0);
  });
});
