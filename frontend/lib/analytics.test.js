/**
 * Unit Tests for Analytics Functions
 * v2.3.0 Re-plan — ITEM-2: Seasonal Pattern + Prediction
 *
 * Test coverage:
 * - Academic period detection
 * - Seasonal pattern analysis
 * - Outlier detection
 * - predictNextPeak with 6-month cap (ITEM-2 fix)
 */

import { describe, it, expect } from "vitest";
import {
  ACADEMIC_PERIODS_2569,
  ACADEMIC_PERIODS_2569_BACHELOR,
  ACADEMIC_PERIODS_2569_TGGS,
  PERIOD_COLORS,
  getAcademicPeriod,
  getExamPeriods,
  groupByMonth,
  average,
  standardDeviation,
  analyzeSeasonalPattern,
  detectOutliers,
  predictNextPeak,
  getTrendIndicator,
  formatMonthLabel,
  getSeasonalAnalysis
} from "./analytics";

describe("ACADEMIC_PERIODS_2569_BACHELOR (KMUTNB Calendar)", () => {
  it("should have correct periods for Bachelor/Vocational", () => {
    // มิถุนายน 2569: เปิดภาคเรียนที่ 1
    expect(ACADEMIC_PERIODS_2569_BACHELOR.sem1_opening.start).toBe("2026-06-22");
    expect(ACADEMIC_PERIODS_2569_BACHELOR.sem1_opening.label).toBe("เปิดภาคเรียนที่ 1");
  });

  it("should have exam period in August (สอบกลางภาค ที่ 1)", () => {
    expect(ACADEMIC_PERIODS_2569_BACHELOR.sem1_mid_exam.start).toBe("2026-08-17");
    expect(ACADEMIC_PERIODS_2569_BACHELOR.sem1_mid_exam.end).toBe("2026-08-23");
    expect(ACADEMIC_PERIODS_2569_BACHELOR.sem1_mid_exam.type).toBe("peak");
  });

  it("should have exam period in October (สอบปลายภาค ที่ 1)", () => {
    expect(ACADEMIC_PERIODS_2569_BACHELOR.sem1_final_exam.start).toBe("2026-10-12");
    expect(ACADEMIC_PERIODS_2569_BACHELOR.sem1_final_exam.end).toBe("2026-10-25");
    expect(ACADEMIC_PERIODS_2569_BACHELOR.sem1_final_exam.type).toBe("peak");
  });

  it("should have correct period colors", () => {
    expect(ACADEMIC_PERIODS_2569_BACHELOR.sem1_opening.color).toBe("#3730a3"); // indigo-700
    expect(ACADEMIC_PERIODS_2569_BACHELOR.sem1_mid_exam.color).toBe("#be123c"); // rose-700
    expect(ACADEMIC_PERIODS_2569_BACHELOR.summer_session.color).toBe("#475569"); // slate-600
  });

  it("should have Semester 2 starting November 23, 2569", () => {
    expect(ACADEMIC_PERIODS_2569_BACHELOR.sem2_opening.start).toBe("2026-11-23");
  });

  it("should have exam period in January 2570 (สอบกลางภาค ที่ 2)", () => {
    expect(ACADEMIC_PERIODS_2569_BACHELOR.sem2_mid_exam.start).toBe("2027-01-18");
    expect(ACADEMIC_PERIODS_2569_BACHELOR.sem2_mid_exam.end).toBe("2027-01-24");
  });

  it("should have exam period in March 2570 (สอบปลายภาค ที่ 2)", () => {
    expect(ACADEMIC_PERIODS_2569_BACHELOR.sem2_final_exam.start).toBe("2027-03-15");
    expect(ACADEMIC_PERIODS_2569_BACHELOR.sem2_final_exam.end).toBe("2027-03-28");
  });
});

describe("ACADEMIC_PERIODS_2569_TGGS (International)", () => {
  it("should have TGGS opening in August (not June)", () => {
    expect(ACADEMIC_PERIODS_2569_TGGS.tggs_sem1_opening.start).toBe("2026-08-03");
  });

  it("should have TGGS exam in September-October (สอบกลางภาค ที่ 1)", () => {
    expect(ACADEMIC_PERIODS_2569_TGGS.tggs_sem1_mid_exam.start).toBe("2026-09-28");
    expect(ACADEMIC_PERIODS_2569_TGGS.tggs_sem1_mid_exam.type).toBe("peak");
  });

  it("should have TGGS exam in November-December (สอบปลายภาค ที่ 1)", () => {
    expect(ACADEMIC_PERIODS_2569_TGGS.tggs_sem1_final_exam.start).toBe("2026-11-23");
    expect(ACADEMIC_PERIODS_2569_TGGS.tggs_sem1_final_exam.type).toBe("peak");
  });

  it("should have TGGS Semester 2 opening in January 2570", () => {
    expect(ACADEMIC_PERIODS_2569_TGGS.tggs_sem2_opening.start).toBe("2027-01-04");
  });

  it("should have TGGS summer session in June-July 2570", () => {
    expect(ACADEMIC_PERIODS_2569_TGGS.tggs_summer.start).toBe("2027-06-07");
    expect(ACADEMIC_PERIODS_2569_TGGS.tggs_summer.end).toBe("2027-07-18");
  });
});

describe("PERIOD_COLORS", () => {
  it("should have correct color mappings", () => {
    expect(PERIOD_COLORS.peak).toBe("#be123c");
    expect(PERIOD_COLORS.active).toBe("#3730a3");
    expect(PERIOD_COLORS.low).toBe("#475569");
  });
});

describe("getAcademicPeriod (KMUTNB Calendar)", () => {
  it("should return opening period for June (Bachelor default)", () => {
    const period = getAcademicPeriod("2026-06-25");
    expect(period.key).toBe("sem1_opening");
    expect(period.label).toBe("เปิดภาคเรียนที่ 1");
  });

  it("should return exam period for August (สอบกลางภาค)", () => {
    const period = getAcademicPeriod("2026-08-20");
    expect(period.key).toBe("sem1_mid_exam");
    expect(period.type).toBe("peak");
  });

  it("should return exam period for October (สอบปลายภาค)", () => {
    const period = getAcademicPeriod("2026-10-20");
    expect(period.key).toBe("sem1_final_exam");
    expect(period.type).toBe("peak");
  });

  it("should return low period for summer session (April-May)", () => {
    const period = getAcademicPeriod("2027-05-15");
    expect(period.key).toBe("summer_session");
    expect(period.type).toBe("low");
  });

  it("should return TGGS period for August opening", () => {
    const period = getAcademicPeriod("2026-08-15", "tggs");
    expect(period.key).toBe("tggs_sem1_opening");
    expect(period.label).toContain("TGGS");
  });

  it("should return TGGS exam period for September-October", () => {
    const period = getAcademicPeriod("2026-10-01", "tggs");
    expect(period.key).toBe("tggs_sem1_mid_exam");
    expect(period.type).toBe("peak");
  });

  it("should handle year boundaries correctly (2026-2027)", () => {
    const jun = getAcademicPeriod("2026-06-22");
    const aug = getAcademicPeriod("2026-08-20");
    const oct = getAcademicPeriod("2026-10-20");
    const jan = getAcademicPeriod("2027-01-20");
    const mar = getAcademicPeriod("2027-03-20");
    
    expect(jun.key).toBe("sem1_opening");
    expect(aug.key).toBe("sem1_mid_exam");
    expect(oct.key).toBe("sem1_final_exam");
    expect(jan.key).toBe("sem2_mid_exam");
    expect(mar.key).toBe("sem2_final_exam");
  });

  it("should return null for dates outside academic year", () => {
    const period = getAcademicPeriod("2028-01-15");
    expect(period).toBeNull();
  });
});

describe("getExamPeriods", () => {
  it("should return all exam periods for Bachelor", () => {
    const exams = getExamPeriods("bachelor");
    expect(exams.length).toBeGreaterThanOrEqual(4); // 2 semesters × 2 exams
    
    // Check for mid and final exams
    const hasMidTerm1 = exams.some(e => e.key === "sem1_mid_exam");
    const hasFinal1 = exams.some(e => e.key === "sem1_final_exam");
    expect(hasMidTerm1).toBe(true);
    expect(hasFinal1).toBe(true);
  });

  it("should return all exam periods for TGGS", () => {
    const exams = getExamPeriods("tggs");
    expect(exams.length).toBeGreaterThanOrEqual(4);
    
    const hasTggsMid1 = exams.some(e => e.key === "tggs_sem1_mid_exam");
    expect(hasTggsMid1).toBe(true);
  });
});

describe("groupByMonth", () => {
  it("should group worklogs by month correctly", () => {
    const worklogs = [
      { date: "2026-01-15" },
      { date: "2026-01-20" },
      { date: "2026-02-10" },
      { date: "2026-01-05" }
    ];
    const result = groupByMonth(worklogs);
    expect(result["2026-01"]).toBe(3);
    expect(result["2026-02"]).toBe(1);
  });

  it("should handle empty array", () => {
    expect(groupByMonth([])).toEqual({});
  });

  it("should ignore entries without date", () => {
    const worklogs = [
      { date: "2026-01-15" },
      { date: null },
      { date: undefined },
      {}
    ];
    const result = groupByMonth(worklogs);
    expect(result["2026-01"]).toBe(1);
    expect(Object.keys(result)).toHaveLength(1);
  });
});

describe("average", () => {
  it("should calculate average correctly", () => {
    expect(average([10, 20, 30])).toBe(20);
    expect(average([5, 5, 5, 5])).toBe(5);
  });

  it("should return 0 for empty array", () => {
    expect(average([])).toBe(0);
  });

  it("should handle single value", () => {
    expect(average([42])).toBe(42);
  });
});

describe("standardDeviation", () => {
  it("should calculate std correctly", () => {
    // [2, 4, 4, 4, 5, 5, 7, 9] -> mean = 5, std ≈ 2
    const result = standardDeviation([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(result).toBeCloseTo(2, 0);
  });

  it("should return 0 for identical values", () => {
    expect(standardDeviation([5, 5, 5])).toBe(0);
  });

  it("should return 0 for empty array", () => {
    expect(standardDeviation([])).toBe(0);
  });
});

describe("analyzeSeasonalPattern", () => {
  it("should return empty result for no data", () => {
    const result = analyzeSeasonalPattern([]);
    expect(result.yearsOfData).toBe(0);
    expect(result.peakMonth).toBeNull();
    expect(result.outliers).toHaveLength(0);
  });

  it("should identify peak month correctly", () => {
    const worklogs = [
      ...Array(50).fill({ date: "2026-01-15" }), // Peak: 50 in Jan
      ...Array(20).fill({ date: "2026-02-15" }), // 20 in Feb
      ...Array(30).fill({ date: "2026-03-15" }), // 30 in Mar
    ];
    const result = analyzeSeasonalPattern(worklogs);
    expect(result.peakMonth).toBe("2026-01");
    expect(result.pattern["2026-01"]).toBe(50);
  });

  it("should identify outliers correctly", () => {
    // Most months: ~20 worklogs, one month: 100 worklogs (outlier)
    const worklogs = [
      ...Array(100).fill({ date: "2026-01-15" }), // Outlier
      ...Array(20).fill({ date: "2026-02-15" }),
      ...Array(18).fill({ date: "2026-03-15" }),
      ...Array(22).fill({ date: "2026-04-15" }),
      ...Array(19).fill({ date: "2026-05-15" }),
    ];
    const result = analyzeSeasonalPattern(worklogs);
    expect(result.outliers).toHaveLength(1);
    expect(result.outliers[0].month).toBe("2026-01");
    expect(result.outliers[0].count).toBe(100);
  });

  it("should calculate years of data correctly", () => {
    const worklogs = [
      { date: "2025-10-15" },
      { date: "2026-03-15" },
      { date: "2026-06-15" },
    ];
    const result = analyzeSeasonalPattern(worklogs);
    expect(result.yearsOfData).toBe(2); // 2025 and 2026
  });

  it("should calculate mean and std correctly", () => {
    const worklogs = [
      ...Array(10).fill({ date: "2026-01-15" }),
      ...Array(20).fill({ date: "2026-02-15" }),
      ...Array(30).fill({ date: "2026-03-15" }),
    ];
    const result = analyzeSeasonalPattern(worklogs);
    expect(result.mean).toBe(20); // (10+20+30)/3
    expect(result.std).toBeGreaterThan(0);
  });
});

describe("detectOutliers", () => {
  it("should return empty array for no data", () => {
    expect(detectOutliers([])).toEqual([]);
  });

  it("should detect daily outliers correctly", () => {
    // Most days: 5-10 worklogs, one day: 50 worklogs (outlier)
    const worklogs = [
      ...Array(50).fill({ date: "2026-01-15" }), // Outlier day
      ...Array(5).fill({ date: "2026-01-16" }),
      ...Array(7).fill({ date: "2026-01-17" }),
      ...Array(6).fill({ date: "2026-01-18" }),
      ...Array(8).fill({ date: "2026-01-19" }),
    ];
    const result = detectOutliers(worklogs);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].date).toBe("2026-01-15");
    expect(result[0].count).toBe(50);
  });

  it("should sort outliers by count descending", () => {
    const worklogs = [
      ...Array(30).fill({ date: "2026-01-15" }),
      ...Array(50).fill({ date: "2026-01-16" }),
      ...Array(5).fill({ date: "2026-01-17" }),
    ];
    const result = detectOutliers(worklogs);
    if (result.length > 1) {
      expect(result[0].count).toBeGreaterThanOrEqual(result[1].count);
    }
  });
});

describe("predictNextPeak", () => {
  // ITEM-2: 6-month cap tests
  describe("6-month cap (ITEM-2 fix)", () => {
    it("should cap monthsAhead at 6", () => {
      const pattern = {
        pattern: { "2026-01": 50, "2026-02": 30 },
        yearsOfData: 2,
        peakMonth: "2026-01"
      };
      
      const result8months = predictNextPeak(pattern, 8);
      const result6months = predictNextPeak(pattern, 6);
      
      expect(result8months.cappedMonths).toBe(6);
      expect(result6months.cappedMonths).toBe(6);
    });

    it("should use academic calendar fallback when predicting > 6 months", () => {
      const pattern = {
        pattern: { "2026-01": 50, "2026-02": 30 },
        yearsOfData: 2,
        peakMonth: "2026-01"
      };
      
      const result = predictNextPeak(pattern, 8);
      expect(result.confidence).toBe("low");
      expect(result.reason).toContain("limited_data");
      expect(result.nextPeakLabel).toBeDefined();
    });

    it("should use academic calendar for single year data predicting > 3 months", () => {
      const pattern = {
        pattern: { "2026-01": 50 },
        yearsOfData: 1,
        peakMonth: "2026-01"
      };
      
      const result = predictNextPeak(pattern, 4);
      expect(result.confidence).toBe("low");
      expect(result.reason).toContain("limited_data");
      expect(result.note).toContain("ข้อมูล 1 ปี");
    });
  });

  describe("academic period fallback", () => {
    it("should return exam period for single year data", () => {
      const pattern = {
        pattern: { "2026-01": 50 },
        yearsOfData: 1,
        peakMonth: "2026-01"
      };
      
      const result = predictNextPeak(pattern, 1);
      expect(result.confidence).toBe("low");
      expect(result.reason).toContain("single_year");
      expect(result.nextPeakPeriod).toBeDefined();
    });

    it("should identify next academic period correctly", () => {
      // Mock current date to be in the middle of semester
      const pattern = {
        pattern: { "2026-04": 40 },
        yearsOfData: 1,
        peakMonth: "2026-04"
      };
      
      const result = predictNextPeak(pattern, 6);
      expect(result.nextPeakLabel).toBeDefined();
      expect(["สอบกลางภาค", "สอบปลายภาค"]).toContain(result.nextPeakLabel);
    });
  });

  describe("historical pattern prediction", () => {
    it("should predict based on historical peak when having 2+ years data", () => {
      const pattern = {
        pattern: { 
          "2025-01": 60,
          "2026-01": 55  // Consistent peak in January
        },
        yearsOfData: 2,
        peakMonth: "2026-01"
      };
      
      const result = predictNextPeak(pattern, 3);
      expect(result.confidence).toBe("medium");
      expect(result.reason).toBe("historical_pattern");
      expect(result.basedOn).toBe("2026-01");
    });

    it("should return no data message for empty pattern", () => {
      const pattern = {
        pattern: {},
        yearsOfData: 0,
        peakMonth: null
      };
      
      const result = predictNextPeak(pattern);
      expect(result.confidence).toBe("none");
      expect(result.reason).toBe("no_data");
    });
  });
});

describe("getTrendIndicator", () => {
  it("should return 'up' for > 10% increase", () => {
    expect(getTrendIndicator(110, 100)).toBe("up");
    expect(getTrendIndicator(120, 100)).toBe("up");
  });

  it("should return 'down' for > 10% decrease", () => {
    expect(getTrendIndicator(80, 100)).toBe("down");
    expect(getTrendIndicator(85, 100)).toBe("down");
  });

  it("should return 'stable' for < 10% change", () => {
    expect(getTrendIndicator(105, 100)).toBe("stable");
    expect(getTrendIndicator(95, 100)).toBe("stable");
  });

  it("should handle zero previous value", () => {
    expect(getTrendIndicator(100, 0)).toBe("stable");
  });
});

describe("formatMonthLabel", () => {
  it("should format month in Thai correctly", () => {
    expect(formatMonthLabel("2026-01")).toBe("ม.ค. 2569");
    expect(formatMonthLabel("2026-06")).toBe("มิ.ย. 2569");
    expect(formatMonthLabel("2026-12")).toBe("ธ.ค. 2569");
  });

  it("should handle year conversion correctly", () => {
    expect(formatMonthLabel("2025-10")).toBe("ต.ค. 2568");
  });
});

describe("getSeasonalAnalysis", () => {
  it("should return complete analysis object", () => {
    const worklogs = [
      ...Array(50).fill({ date: "2026-01-15" }),
      ...Array(30).fill({ date: "2026-02-15" }),
    ];
    
    const result = getSeasonalAnalysis(worklogs);
    expect(result).toHaveProperty("pattern");
    expect(result).toHaveProperty("prediction");
    expect(result).toHaveProperty("outliers");
    expect(result).toHaveProperty("chartData");
    expect(Array.isArray(result.chartData)).toBe(true);
  });

  it("should format chart data correctly", () => {
    const worklogs = [
      ...Array(10).fill({ date: "2026-01-15" }),
    ];
    
    const result = getSeasonalAnalysis(worklogs);
    if (result.chartData.length > 0) {
      const first = result.chartData[0];
      expect(first).toHaveProperty("month");
      expect(first).toHaveProperty("label");
      expect(first).toHaveProperty("count");
      expect(first).toHaveProperty("period");
    }
  });

  it("should handle empty data gracefully", () => {
    const result = getSeasonalAnalysis([]);
    expect(result.prediction.confidence).toBe("none");
    expect(result.chartData).toEqual([]);
  });
});

describe("Integration: Full seasonal workflow", () => {
  it("should correctly analyze and predict for academic year pattern", () => {
    // Simulate 2 years of data with clear exam peaks
    const worklogs = [
      // Year 1: Peak in Jan (exam1)
      ...Array(60).fill({ date: "2025-01-15" }),
      ...Array(20).fill({ date: "2025-02-15" }),
      ...Array(15).fill({ date: "2025-03-15" }),
      ...Array(25).fill({ date: "2025-06-15" }), // Mid peak
      ...Array(10).fill({ date: "2025-08-15" }),
      
      // Year 2: Similar pattern
      ...Array(55).fill({ date: "2026-01-15" }), // Peak
      ...Array(18).fill({ date: "2026-02-15" }),
      ...Array(12).fill({ date: "2026-03-15" }),
      ...Array(22).fill({ date: "2026-06-15" }),
      ...Array(8).fill({ date: "2026-08-15" }),
    ];
    
    const analysis = getSeasonalAnalysis(worklogs);
    
    // Verify pattern detection
    expect(analysis.yearsOfData).toBe(2);
    expect(analysis.peakMonth).toMatch(/-01$/); // Peak in January
    
    // Verify prediction
    expect(analysis.prediction.confidence).toBe("medium");
    expect(analysis.prediction.basedOn).toBeDefined();
    
    // Verify chart data
    expect(analysis.chartData.length).toBeGreaterThan(0);
  });

  it("should handle single year data with academic fallback", () => {
    const worklogs = [
      ...Array(40).fill({ date: "2026-04-15" }),
      ...Array(30).fill({ date: "2026-05-15" }),
    ];
    
    const analysis = getSeasonalAnalysis(worklogs);
    
    expect(analysis.yearsOfData).toBe(1);
    expect(analysis.prediction.confidence).toBe("low");
    expect(analysis.prediction.reason).toContain("single_year");
    expect(analysis.prediction.nextPeakLabel).toBeDefined();
  });

  it("should respect 6-month cap in prediction", () => {
    const worklogs = [
      ...Array(50).fill({ date: "2026-01-15" }),
    ];
    
    const prediction7months = predictNextPeak(
      analyzeSeasonalPattern(worklogs),
      7
    );
    
    expect(prediction7months.cappedMonths).toBe(6);
    expect(prediction7months.confidence).toBe("low");
  });
});
