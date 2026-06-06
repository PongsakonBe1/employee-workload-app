/**
 * Analytics Functions for Dashboard & Reports
 * v2.3.0 Re-plan — ITEM-2: Seasonal Pattern + Prediction
 * 
 * ปฏิทินการศึกษา มจพ ปีการศึกษา 2569 (Fiscal Year 2569)
 * อ้างอิง: kmutnb_calendar_fiscal69.txt
 *
 * Includes:
 * - Academic calendar constants for Bachelor/Vocational (default)
 * - Academic calendar constants for TGGS/International
 * - Seasonal pattern analysis
 * - Peak prediction with 6-month cap
 */

// ============================================
// ระดับปริญญาตรี + ปวช (Bachelor + Vocational) - Default
// ============================================
// ภาคเรียนที่ 1: มิถุนายน - ตุลาคม 2569
// ภาคเรียนที่ 2: พฤศจิกายน 2569 - มีนาคม 2570
export const ACADEMIC_PERIODS_2569_BACHELOR = {
  // ภาคเรียนที่ 1
  sem1_opening: {
    label: "เปิดภาคเรียนที่ 1",
    start: "2026-06-22",
    end: "2026-06-30",
    color: "#3730a3", // indigo-700
    type: "active",
    semester: 1
  },
  sem1_mid_jul: {
    label: "กลางภาคเรียนที่ 1 (ก.ค.)",
    start: "2026-07-01",
    end: "2026-07-31",
    color: "#3730a3", // indigo-700
    type: "active",
    semester: 1
  },
  sem1_mid_exam: {
    label: "สอบกลางภาค ที่ 1",
    start: "2026-08-17",
    end: "2026-08-23",
    color: "#be123c", // rose-700
    type: "peak",
    semester: 1,
    note: "17-23 สิงหาคม 2569"
  },
  sem1_late: {
    label: "กลางภาคเรียนที่ 1 (ก.ย.)",
    start: "2026-08-24",
    end: "2026-09-30",
    color: "#3730a3", // indigo-700
    type: "active",
    semester: 1
  },
  sem1_final_exam: {
    label: "สอบปลายภาค ที่ 1",
    start: "2026-10-12",
    end: "2026-10-25",
    color: "#be123c", // rose-700
    type: "peak",
    semester: 1,
    note: "12-25 ตุลาคม 2569"
  },
  
  // ช่วงพักระหว่างภาค (พ.ย. เริ่มภาค 2)
  between_semesters: {
    label: "ช่วงเปลี่ยนภาคเรียน",
    start: "2026-10-26",
    end: "2026-11-22",
    color: "#475569", // slate-600
    type: "low"
  },
  
  // ภาคเรียนที่ 2
  sem2_opening: {
    label: "เปิดภาคเรียนที่ 2",
    start: "2026-11-23",
    end: "2026-11-30",
    color: "#3730a3", // indigo-700
    type: "active",
    semester: 2
  },
  sem2_early: {
    label: "ต้นภาคเรียนที่ 2 (ธ.ค.)",
    start: "2026-12-01",
    end: "2026-12-31",
    color: "#3730a3", // indigo-700
    type: "active",
    semester: 2
  },
  sem2_mid_exam: {
    label: "สอบกลางภาค ที่ 2",
    start: "2027-01-18",
    end: "2027-01-24",
    color: "#be123c", // rose-700
    type: "peak",
    semester: 2,
    note: "18-24 มกราคม 2570"
  },
  sem2_feb: {
    label: "กลางภาคเรียนที่ 2 (ก.พ.)",
    start: "2027-01-25",
    end: "2027-02-28",
    color: "#3730a3", // indigo-700
    type: "active",
    semester: 2
  },
  sem2_final_exam: {
    label: "สอบปลายภาค ที่ 2",
    start: "2027-03-15",
    end: "2027-03-28",
    color: "#be123c", // rose-700
    type: "peak",
    semester: 2,
    note: "15-28 มีนาคม 2570"
  },
  
  // ภาคฤดูร้อน
  summer_session: {
    label: "ภาคฤดูร้อน",
    start: "2027-04-19",
    end: "2027-05-30",
    color: "#475569", // slate-600
    type: "low",
    note: "ปริญญาตรี: 19 เม.ย. - 30 พ.ค. 2570"
  }
};

// ============================================
// ระดับ TGGS / นานาชาติ (International)
// ============================================
// ภาคเรียนที่ 1: สิงหาคม - ธันวาคม 2569
// ภาคเรียนที่ 2: มกราคม - พฤษภาคม 2570
export const ACADEMIC_PERIODS_2569_TGGS = {
  // ภาคเรียนที่ 1
  tggs_sem1_opening: {
    label: "เปิดภาคเรียนที่ 1 (TGGS)",
    start: "2026-08-03",
    end: "2026-08-31",
    color: "#3730a3", // indigo-700
    type: "active",
    semester: 1
  },
  tggs_sem1_sep: {
    label: "กลางภาค (ก.ย.)",
    start: "2026-09-01",
    end: "2026-09-27",
    color: "#3730a3", // indigo-700
    type: "active",
    semester: 1
  },
  tggs_sem1_mid_exam: {
    label: "สอบกลางภาค ที่ 1 (TGGS)",
    start: "2026-09-28",
    end: "2026-10-04",
    color: "#be123c", // rose-700
    type: "peak",
    semester: 1,
    note: "28 ก.ย. - 4 ต.ค. 2569"
  },
  tggs_sem1_nov: {
    label: "กลางภาค (พ.ย.)",
    start: "2026-10-05",
    end: "2026-11-22",
    color: "#3730a3", // indigo-700
    type: "active",
    semester: 1
  },
  tggs_sem1_final_exam: {
    label: "สอบปลายภาค ที่ 1 (TGGS)",
    start: "2026-11-23",
    end: "2026-12-06",
    color: "#be123c", // rose-700
    type: "peak",
    semester: 1,
    note: "23 พ.ย. - 6 ธ.ค. 2569"
  },
  
  // ช่วงพัก (ธ.ค. สิ้นสุด)
  tggs_break_dec: {
    label: "ช่วงพัก (TGGS)",
    start: "2026-12-07",
    end: "2027-01-03",
    color: "#475569", // slate-600
    type: "low"
  },
  
  // ภาคเรียนที่ 2
  tggs_sem2_opening: {
    label: "เปิดภาคเรียนที่ 2 (TGGS)",
    start: "2027-01-04",
    end: "2027-01-31",
    color: "#3730a3", // indigo-700
    type: "active",
    semester: 2
  },
  tggs_sem2_feb: {
    label: "กลางภาค (ก.พ.)",
    start: "2027-02-01",
    end: "2027-02-28",
    color: "#3730a3", // indigo-700
    type: "active",
    semester: 2
  },
  tggs_sem2_mid_exam: {
    label: "สอบกลางภาค ที่ 2 (TGGS)",
    start: "2027-03-01",
    end: "2027-03-07",
    color: "#be123c", // rose-700
    type: "peak",
    semester: 2,
    note: "1-7 มีนาคม 2570"
  },
  tggs_sem2_apr: {
    label: "กลางภาค (เม.ย.)",
    start: "2027-03-08",
    end: "2027-04-30",
    color: "#3730a3", // indigo-700
    type: "active",
    semester: 2
  },
  tggs_sem2_final_exam: {
    label: "สอบปลายภาค ที่ 2 (TGGS)",
    start: "2027-05-03",
    end: "2027-05-16",
    color: "#be123c", // rose-700
    type: "peak",
    semester: 2,
    note: "3-16 พฤษภาคม 2570"
  },
  
  // ภาคฤดูร้อน
  tggs_summer: {
    label: "ภาคฤดูร้อน (TGGS)",
    start: "2027-06-07",
    end: "2027-07-18",
    color: "#475569", // slate-600
    type: "low",
    note: "7 มิ.ย. - 18 ก.ค. 2570"
  }
};

// Default: ใช้ปริญญาตรีเป็นหลัก
export const ACADEMIC_PERIODS_2569 = ACADEMIC_PERIODS_2569_BACHELOR;

// ============================================
// ปีการศึกษา 2568 (Fiscal 2569 ช่วง Oct 2025 - May 2026)
// ============================================
// ใช้สำหรับ worklogs ย้อนหลังในช่วง Oct'25 - May'26
export const ACADEMIC_PERIODS_2568_BACHELOR = {
  // ภาคเรียนที่ 1
  sem1_opening: {
    label: "เปิดภาคเรียนที่ 1",
    start: "2025-06-23",
    end: "2025-06-30",
    color: "#3730a3",
    type: "active",
    semester: 1
  },
  sem1_mid_jul: {
    label: "กลางภาคเรียนที่ 1 (ก.ค.)",
    start: "2025-07-01",
    end: "2025-07-31",
    color: "#3730a3",
    type: "active",
    semester: 1
  },
  sem1_mid_exam: {
    label: "สอบกลางภาค ที่ 1",
    start: "2025-08-18",
    end: "2025-08-24",
    color: "#be123c",
    type: "peak",
    semester: 1,
    note: "18-24 สิงหาคม 2568"
  },
  sem1_late: {
    label: "กลางภาคเรียนที่ 1 (ก.ย.)",
    start: "2025-08-25",
    end: "2025-09-30",
    color: "#3730a3",
    type: "active",
    semester: 1
  },
  sem1_final_exam: {
    label: "สอบปลายภาค ที่ 1",
    start: "2025-10-14",
    end: "2025-10-26",
    color: "#be123c",
    type: "peak",
    semester: 1,
    note: "14-26 ตุลาคม 2568"
  },
  
  // ช่วงพักระหว่างภาค
  between_semesters: {
    label: "ช่วงเปลี่ยนภาคเรียน",
    start: "2025-10-27",
    end: "2025-11-23",
    color: "#475569",
    type: "low"
  },
  
  // ภาคเรียนที่ 2
  sem2_opening: {
    label: "เปิดภาคเรียนที่ 2",
    start: "2025-11-24",
    end: "2025-11-30",
    color: "#3730a3",
    type: "active",
    semester: 2
  },
  sem2_early: {
    label: "ต้นภาคเรียนที่ 2 (ธ.ค.)",
    start: "2025-12-01",
    end: "2025-12-31",
    color: "#3730a3",
    type: "active",
    semester: 2
  },
  sem2_mid_exam: {
    label: "สอบกลางภาค ที่ 2",
    start: "2026-01-19",
    end: "2026-01-25",
    color: "#be123c",
    type: "peak",
    semester: 2,
    note: "19-25 มกราคม 2569"
  },
  sem2_feb: {
    label: "กลางภาคเรียนที่ 2 (ก.พ.)",
    start: "2026-01-26",
    end: "2026-02-28",
    color: "#3730a3",
    type: "active",
    semester: 2
  },
  sem2_final_exam: {
    label: "สอบปลายภาค ที่ 2",
    start: "2026-03-16",
    end: "2026-03-29",
    color: "#be123c",
    type: "peak",
    semester: 2,
    note: "16-29 มีนาคม 2569"
  },
  
  // ภาคฤดูร้อน
  summer_session: {
    label: "ภาคฤดูร้อน",
    start: "2026-04-20",
    end: "2026-05-30",
    color: "#475569",
    type: "low",
    note: "ปริญญาตรี: 20 เม.ย. - 30 พ.ค. 2569"
  }
};

export const ACADEMIC_PERIODS_2568_TGGS = {
  // ภาคเรียนที่ 1
  tggs_sem1_opening: {
    label: "เปิดภาคเรียนที่ 1 (TGGS)",
    start: "2025-08-04",
    end: "2025-08-31",
    color: "#3730a3",
    type: "active",
    semester: 1
  },
  tggs_sem1_sep: {
    label: "กลางภาค (ก.ย.)",
    start: "2025-09-01",
    end: "2025-09-28",
    color: "#3730a3",
    type: "active",
    semester: 1
  },
  tggs_sem1_mid_exam: {
    label: "สอบกลางภาค ที่ 1 (TGGS)",
    start: "2025-09-29",
    end: "2025-10-05",
    color: "#be123c",
    type: "peak",
    semester: 1,
    note: "29 ก.ย. - 5 ต.ค. 2568"
  },
  tggs_sem1_nov: {
    label: "กลางภาค (พ.ย.)",
    start: "2025-10-06",
    end: "2025-11-23",
    color: "#3730a3",
    type: "active",
    semester: 1
  },
  tggs_sem1_final_exam: {
    label: "สอบปลายภาค ที่ 1 (TGGS)",
    start: "2025-11-24",
    end: "2025-12-07",
    color: "#be123c",
    type: "peak",
    semester: 1,
    note: "24 พ.ย. - 7 ธ.ค. 2568"
  },
  
  // ช่วงพัก
  tggs_break_dec: {
    label: "ช่วงพัก (TGGS)",
    start: "2025-12-08",
    end: "2026-01-04",
    color: "#475569",
    type: "low"
  },
  
  // ภาคเรียนที่ 2
  tggs_sem2_opening: {
    label: "เปิดภาคเรียนที่ 2 (TGGS)",
    start: "2026-01-05",
    end: "2026-01-31",
    color: "#3730a3",
    type: "active",
    semester: 2
  },
  tggs_sem2_feb: {
    label: "กลางภาค (ก.พ.)",
    start: "2026-02-01",
    end: "2026-02-28",
    color: "#3730a3",
    type: "active",
    semester: 2
  },
  tggs_sem2_mid_exam: {
    label: "สอบกลางภาค ที่ 2 (TGGS)",
    start: "2026-03-02",
    end: "2026-03-08",
    color: "#be123c",
    type: "peak",
    semester: 2,
    note: "2-8 มีนาคม 2569"
  },
  tggs_sem2_apr: {
    label: "กลางภาค (เม.ย.)",
    start: "2026-03-09",
    end: "2026-04-30",
    color: "#3730a3",
    type: "active",
    semester: 2
  },
  tggs_sem2_final_exam: {
    label: "สอบปลายภาค ที่ 2 (TGGS)",
    start: "2026-05-05",
    end: "2026-05-17",
    color: "#be123c",
    type: "peak",
    semester: 2,
    note: "5-17 พฤษภาคม 2569"
  },
  
  // ภาคฤดูร้อน
  tggs_summer: {
    label: "ภาคฤดูร้อน (TGGS)",
    start: "2026-06-08",
    end: "2026-07-19",
    color: "#475569",
    type: "low",
    note: "8 มิ.ย. - 19 ก.ค. 2569"
  }
};

export const ACADEMIC_PERIODS_2568 = ACADEMIC_PERIODS_2568_BACHELOR;

// Map period keys to human-readable labels
export const PERIOD_LABELS = {
  opening: "เปิดภาคเรียน",
  midSemester: "กลางภาคเรียน",
  exam: "ช่วงสอบ",
  break: "ปิดภาคเรียน"
};

// Colors for chart display (matching app theme)
export const PERIOD_COLORS = {
  peak: "#be123c",      // rose-700 - exam periods
  active: "#3730a3",    // indigo-700 - semester periods
  low: "#475569"        // slate-600 - break periods
};

/**
 * Get academic year from date (Thai academic year starts in June)
 * @param {string} date - YYYY-MM-DD
 * @returns {string} - Academic year (e.g., "2568", "2569")
 */
export function getAcademicYear(date) {
  const d = new Date(date + 'T00:00:00'); // Parse as local time
  const buddhistYear = d.getFullYear() + 543;
  const month = d.getMonth() + 1; // 1-12
  // Academic year starts in June, so Jun-Dec = same year, Jan-May = previous year
  return month >= 6 ? String(buddhistYear) : String(buddhistYear - 1);
}

/**
 * Get academic period for a given date
 * Auto-detects academic year based on date (supports 2568 and 2569)
 * @param {string} date - YYYY-MM-DD
 * @param {string} level - 'bachelor' (default), 'vocational', 'tggs'
 * @returns {Object|null} - period info or null if outside academic year
 */
export function getAcademicPeriod(date, level = 'bachelor') {
  // Auto-detect academic year from date
  const academicYear = getAcademicYear(date);
  
  // Select calendar based on level and academic year
  let calendar;
  if (level === 'tggs' || level === 'international') {
    calendar = academicYear === '2568' 
      ? ACADEMIC_PERIODS_2568_TGGS 
      : ACADEMIC_PERIODS_2569_TGGS;
  } else {
    // bachelor, vocational, or default
    calendar = academicYear === '2568'
      ? ACADEMIC_PERIODS_2568_BACHELOR
      : ACADEMIC_PERIODS_2569_BACHELOR;
  }
  
  // Find matching period by date range
  for (const [key, period] of Object.entries(calendar)) {
    if (date >= period.start && date <= period.end) {
      return { key, ...period };
    }
  }
  
  return null;
}

/**
 * Get all peak (exam) periods for a level and academic year
 * @param {string} level - 'bachelor' (default), 'vocational', 'tggs'
 * @param {string} academicYear - '2568', '2569', or null for both years combined
 * @returns {Array} - array of exam periods
 */
export function getExamPeriods(level = 'bachelor', academicYear = null) {
  let calendars = [];
  
  if (level === 'tggs' || level === 'international') {
    if (academicYear === '2568' || academicYear === null) {
      calendars.push(ACADEMIC_PERIODS_2568_TGGS);
    }
    if (academicYear === '2569' || academicYear === null) {
      calendars.push(ACADEMIC_PERIODS_2569_TGGS);
    }
  } else {
    // bachelor, vocational, or default
    if (academicYear === '2568' || academicYear === null) {
      calendars.push(ACADEMIC_PERIODS_2568_BACHELOR);
    }
    if (academicYear === '2569' || academicYear === null) {
      calendars.push(ACADEMIC_PERIODS_2569_BACHELOR);
    }
  }
  
  const allPeriods = calendars.flatMap((calendar) =>
    Object.entries(calendar)
      .filter(([_, p]) => p.type === 'peak')
      .map(([key, p]) => ({ key, ...p }))
  );
  
  return allPeriods;
}

/**
 * Group worklogs by month
 * @param {Array} worklogs - array of worklog objects
 * @returns {Object} - { "2026-01": count, "2026-02": count, ... }
 */
export function groupByMonth(worklogs) {
  const byMonth = {};
  worklogs.forEach((w) => {
    const month = w.date?.slice(0, 7);
    if (month) {
      byMonth[month] = (byMonth[month] || 0) + 1;
    }
  });
  return byMonth;
}

/**
 * Calculate average for array of numbers
 * @param {Array} values
 * @returns {number}
 */
export function average(values) {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Calculate standard deviation
 * @param {Array} values
 * @returns {number}
 */
export function standardDeviation(values) {
  if (values.length === 0) return 0;
  const avg = average(values);
  const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Analyze seasonal pattern from historical worklog data
 * @param {Array} worklogs - array of worklog objects with date field
 * @param {number} year - academic year (e.g., 2569)
 * @returns {Object} - seasonal analysis results
 */
export function analyzeSeasonalPattern(worklogs, year = 2569) {
  if (!worklogs || worklogs.length === 0) {
    return {
      pattern: {},
      outliers: [],
      monthlyAverages: {},
      peakMonth: null,
      lowMonth: null,
      yearsOfData: 0
    };
  }

  // Group by month
  const byMonth = groupByMonth(worklogs);
  const monthlyValues = Object.values(byMonth);
  
  if (monthlyValues.length === 0) {
    return {
      pattern: {},
      outliers: [],
      monthlyAverages: {},
      peakMonth: null,
      lowMonth: null,
      yearsOfData: 0
    };
  }

  // Calculate statistics
  const mean = average(monthlyValues);
  const std = standardDeviation(monthlyValues);
  const twoSD = mean + (2 * std);

  // Identify outliers (months with workload > mean + 2 SD)
  const outliers = Object.entries(byMonth)
    .filter(([month, count]) => count > twoSD)
    .map(([month, count]) => ({ month, count, threshold: twoSD }));

  // Find peak and low months
  const entries = Object.entries(byMonth);
  const peak = entries.reduce((max, [month, count]) => 
    count > max.count ? { month, count } : max, 
    { month: null, count: 0 }
  );
  const low = entries.reduce((min, [month, count]) => 
    count < min.count ? { month, count } : min, 
    { month: null, count: Infinity }
  );

  // Calculate years of data (unique years in dataset)
  const years = new Set(worklogs.map(w => w.date?.slice(0, 4)).filter(Boolean)).size;

  return {
    pattern: byMonth,
    outliers,
    monthlyAverages: byMonth,
    peakMonth: peak.month,
    lowMonth: low.month,
    mean,
    std,
    yearsOfData: years
  };
}

/**
 * Detect outliers in daily workload
 * @param {Array} worklogs - array of worklog objects
 * @returns {Array} - array of outlier days { date, count }
 */
export function detectOutliers(worklogs) {
  if (!worklogs || worklogs.length === 0) return [];

  // Group by date
  const byDate = {};
  worklogs.forEach((w) => {
    if (w.date) {
      byDate[w.date] = (byDate[w.date] || 0) + 1;
    }
  });

  const dailyCounts = Object.values(byDate);
  if (dailyCounts.length === 0) return [];

  const mean = average(dailyCounts);
  const std = standardDeviation(dailyCounts);
  const threshold = mean + (2 * std);

  return Object.entries(byDate)
    .filter(([date, count]) => count > threshold)
    .map(([date, count]) => ({ date, count, threshold }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Predict next peak period
 * ITEM-2 FIX: Add 6-month cap + academic period fallback for single year data
 * 
 * @param {Object} historicalPattern - result from analyzeSeasonalPattern()
 * @param {number} monthsAhead - how many months to predict ahead (capped at 6)
 * @returns {Object} - prediction result
 */
export function predictNextPeak(historicalPattern, monthsAhead = 3) {
  // ITEM-2 FIX: Cap at 6 months
  const cappedMonths = Math.min(monthsAhead, 6);
  
  const { pattern, yearsOfData, peakMonth } = historicalPattern;
  
  if (!pattern || Object.keys(pattern).length === 0) {
    return {
      nextPeakLabel: "ไม่มีข้อมูล",
      nextPeakPeriod: null,
      confidence: "none",
      reason: "no_data",
      cappedMonths
    };
  }

  // ITEM-2 FIX: If predicting > 6 months or insufficient data
  if (cappedMonths >= 6 || (yearsOfData === 1 && cappedMonths > 3)) {
    // Use academic period fallback
    const today = new Date();
    const currentMonth = today.getMonth() + 1; // 1-12
    
    // Find next academic period
    const periods = [
      { month: 10, key: "opening", label: "เปิดภาคเรียน" },
      { month: 1, key: "exam1", label: "สอบกลางภาค" },
      { month: 3, key: "opening2", label: "เปิดภาคเรียนที่ 2" },
      { month: 6, key: "exam2", label: "สอบปลายภาค" }
    ];
    
    // Find next period
    let nextPeriod = periods.find(p => p.month > currentMonth);
    if (!nextPeriod) {
      nextPeriod = periods[0]; // Wrap to next year's first period
    }
    
    const periodInfo = ACADEMIC_PERIODS_2569[nextPeriod.key];
    
    return {
      nextPeakLabel: nextPeriod.label,
      nextPeakPeriod: periodInfo,
      confidence: "low",
      reason: "limited_data_use_academic_calendar",
      note: `จากตารางการศึกษา (ข้อมูล ${yearsOfData} ปี ไม่เพียงพอสำหรับ statistical prediction)`,
      cappedMonths
    };
  }

  // If we have multiple years of data, use historical pattern
  if (yearsOfData >= 2 && peakMonth) {
    // Extract month from peakMonth (format: YYYY-MM)
    const peakMonthNum = parseInt(peakMonth.slice(5, 7), 10);
    
    // Predict same month next year
    const today = new Date();
    const currentYear = today.getFullYear();
    const nextYear = currentYear + 1;
    const predictedMonth = `${nextYear}-${String(peakMonthNum).padStart(2, "0")}`;
    
    return {
      nextPeakLabel: `ช่วง ${PERIOD_LABELS.exam || "สอบ"} (เดือน ${peakMonthNum})`,
      nextPeakPeriod: {
        month: predictedMonth,
        predictedWorkload: pattern[peakMonth] || 0
      },
      confidence: "medium",
      reason: "historical_pattern",
      basedOn: peakMonth,
      cappedMonths
    };
  }

  // Single year data, use academic calendar fallback
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  
  // Predict next exam period
  const nextExamMonth = currentMonth <= 1 ? 1 : (currentMonth <= 6 ? 6 : 13);
  const examLabel = nextExamMonth === 1 ? "สอบกลางภาค" : "สอบปลายภาค";
  
  return {
    nextPeakLabel: examLabel,
    nextPeakPeriod: nextExamMonth <= 6 ? ACADEMIC_PERIODS_2569.exam2 : ACADEMIC_PERIODS_2569.exam1,
    confidence: "low",
    reason: "single_year_use_academic_calendar",
      note: `จากตารางการศึกษา (ข้อมูล 1 ปี ไม่เพียงพอสำหรับ statistical prediction)`,
    cappedMonths
  };
}

/**
 * Get trend indicator for workload change
 * @param {number} current - current period value
 * @param {number} previous - previous period value
 * @returns {string} - "up", "down", "stable"
 */
export function getTrendIndicator(current, previous) {
  if (!previous || previous === 0) return "stable";
  const change = (current - previous) / previous;
  if (change > 0.1) return "up";
  if (change < -0.1) return "down";
  return "stable";
}

/**
 * Format month label for display (Thai)
 * @param {string} month - YYYY-MM format
 * @returns {string}
 */
export function formatMonthLabel(month) {
  const thaiMonths = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
  ];
  const [year, monthNum] = month.split("-");
  const thaiYear = parseInt(year) + 543;
  return `${thaiMonths[parseInt(monthNum) - 1]} ${thaiYear}`;
}

/**
 * Get seasonal analysis for chart display
 * Combines pattern detection + prediction in one call
 * @param {Array} worklogs - array of worklog objects
 * @returns {Object} - complete seasonal analysis
 */
export function getSeasonalAnalysis(worklogs) {
  const analysis = analyzeSeasonalPattern(worklogs);
  const prediction = predictNextPeak(analysis);
  const outliers = detectOutliers(worklogs);
  
  return {
    ...analysis,
    prediction,
    outliers,
    // Chart data formatted for Recharts
    chartData: Object.entries(analysis.pattern || {}).map(([month, count]) => ({
      month,
      label: formatMonthLabel(month),
      count,
      period: getAcademicPeriod(`${month}-15`)?.key || "unknown"
    })).sort((a, b) => a.month.localeCompare(b.month))
  };
}

// ============================================
// ITEM-3B: User Profile Stats & Badges
// ============================================

/**
 * Calculate current streak (consecutive days with worklogs)
 * @param {Array} worklogs - array of worklog objects with date field
 * @returns {number} - current streak count
 */
export function calculateStreak(worklogs) {
  if (!worklogs || worklogs.length === 0) return 0;
  
  const dates = [...new Set(worklogs.map(w => w.date).filter(Boolean))].sort().reverse();
  if (dates.length === 0) return 0;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];
  
  let streak = 0;
  let checkDate = new Date(today);
  
  // Check if there's activity today, otherwise start from yesterday
  const hasToday = dates.includes(todayStr);
  if (!hasToday) {
    checkDate.setDate(checkDate.getDate() - 1);
  }
  
  for (const dateStr of dates) {
    const checkStr = checkDate.toISOString().split('T')[0];
    if (dateStr === checkStr) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (new Date(dateStr) < checkDate) {
      break;
    }
  }
  
  return streak;
}

/**
 * Calculate longest streak ever
 * @param {Array} worklogs - array of worklog objects with date field
 * @returns {number} - longest streak count
 */
export function calculateLongestStreak(worklogs) {
  if (!worklogs || worklogs.length === 0) return 0;
  
  const sortedDates = [...new Set(worklogs.map(w => w.date).filter(Boolean))].sort();
  if (sortedDates.length === 0) return 0;
  
  let longestStreak = 1;
  let currentStreak = 1;
  
  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = new Date(sortedDates[i - 1]);
    const currDate = new Date(sortedDates[i]);
    const diffDays = (currDate - prevDate) / (1000 * 60 * 60 * 24);
    
    if (diffDays === 1) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else if (diffDays > 1) {
      currentStreak = 1;
    }
  }
  
  return longestStreak;
}

/**
 * Get category breakdown for radar chart — uses minorTask (หัวข้อรอง)
 * PM/UX Decision 2026-06-05: minorTask provides better skill visualization
 * @param {Array} worklogs - array of worklog objects
 * @returns {Array} - array of { subject, count, fullMark }
 */
export function getCategoryBreakdown(worklogs) {
  if (!worklogs || worklogs.length === 0) return [];

  const categories = {};
  worklogs.forEach(w => {
    // PM/UX: Use minorTask (หัวข้อรอง) for meaningful skill categories
    const cat = w.minorTask || w.category || w.dutyType || 'อื่นๆ';
    categories[cat] = (categories[cat] || 0) + 1;
  });

  const maxCount = Math.max(...Object.values(categories), 1);

  return Object.entries(categories)
    .map(([subject, count]) => ({
      subject,
      count,
      fullMark: Math.ceil(maxCount * 1.2),
      A: count
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8); // Max 8 categories for radar
}

/**
 * Calculate user stats summary
 * @param {Array} worklogs - array of worklog objects
 * @param {Object} user - user object with joinDate
 * @returns {Object} - stats summary
 */
export function calculateUserStats(worklogs, user = {}) {
  if (!worklogs || worklogs.length === 0) {
    return {
      totalWorklogs: 0,
      thisMonth: 0,
      lastMonth: 0,
      streak: 0,
      longestStreak: 0,
      topCategory: null,
      topCategoryCount: 0,
      uniqueMinorTasks: 0,
      topMinorTask: null,
      totalDays: 0,
      averagePerDay: 0,
      categoryBreakdown: [],
      trend: 'stable'
    };
  }

  const today = new Date();
  const currentMonth = today.toISOString().slice(0, 7); // YYYY-MM
  const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonth = lastMonthDate.toISOString().slice(0, 7);

  const thisMonthCount = worklogs.filter(w => w.date?.startsWith(currentMonth)).length;
  const lastMonthCount = worklogs.filter(w => w.date?.startsWith(lastMonth)).length;

  const uniqueDates = new Set(worklogs.map(w => w.date).filter(Boolean));
  const categoryBreakdown = getCategoryBreakdown(worklogs);
  const topCategory = categoryBreakdown[0] || null;

  // PM/UX: Count unique minorTasks for All-rounder badge
  const uniqueMinorTasks = new Set(worklogs.map(w => w.minorTask).filter(Boolean)).size;
  const topMinorTask = categoryBreakdown[0] || null;

  const trend = getTrendIndicator(thisMonthCount, lastMonthCount);

  return {
    totalWorklogs: worklogs.length,
    thisMonth: thisMonthCount,
    lastMonth: lastMonthCount,
    streak: calculateStreak(worklogs),
    longestStreak: calculateLongestStreak(worklogs),
    topCategory: topCategory?.subject || null,
    topCategoryCount: topCategory?.count || 0,
    uniqueMinorTasks,
    topMinorTask,
    totalDays: uniqueDates.size,
    averagePerDay: uniqueDates.size > 0 ? (worklogs.length / uniqueDates.size).toFixed(1) : 0,
    categoryBreakdown,
    trend
  };
}

/**
 * Calculate radar chart data for skills/categories
 * Normalized to 0-100 scale
 * @param {Array} worklogs - array of worklog objects
 * @returns {Array} - radar chart data
 */
export function calculateRadarData(worklogs) {
  const breakdown = getCategoryBreakdown(worklogs);
  if (breakdown.length === 0) return [];
  
  const maxCount = Math.max(...breakdown.map(b => b.count), 1);
  
  return breakdown.map(b => ({
    subject: b.subject,
    A: Math.round((b.count / maxCount) * 100),
    fullMark: 100,
    count: b.count
  }));
}

/**
 * Get user badges based on achievements
 * @param {Object} stats - result from calculateUserStats
 * @param {Array} worklogs - array of worklog objects
 * @returns {Array} - array of badge objects with Lucide icon names
 */
export function getBadges(stats, worklogs) {
  const badges = [];

  if (!stats || !worklogs) return badges;

  // Volume badges
  if (stats.totalWorklogs >= 100) {
    badges.push({ id: 'volume_100', name: 'นักบันทึกระดับทอง', icon: 'Trophy', color: 'amber', desc: 'บันทึกงานครบ 100 รายการ' });
  } else if (stats.totalWorklogs >= 50) {
    badges.push({ id: 'volume_50', name: 'นักบันทึกระดับเงิน', icon: 'Medal', color: 'slate', desc: 'บันทึกงานครบ 50 รายการ' });
  } else if (stats.totalWorklogs >= 10) {
    badges.push({ id: 'volume_10', name: 'นักบันทึกมือใหม่', icon: 'Award', color: 'orange', desc: 'บันทึกงานครบ 10 รายการ' });
  }

  // Streak badges
  if (stats.longestStreak >= 30) {
    badges.push({ id: 'streak_30', name: 'นักทำงานต่อเนื่อง', icon: 'Flame', color: 'rose', desc: 'ทำงานต่อเนื่อง 30 วัน' });
  } else if (stats.longestStreak >= 7) {
    badges.push({ id: 'streak_7', name: 'สัปดาห์แห่งความขยัน', icon: 'Zap', color: 'yellow', desc: 'ทำงานต่อเนื่อง 7 วัน' });
  }

  // Current streak badge
  if (stats.streak >= 5) {
    badges.push({ id: 'current_streak', name: `${stats.streak} วันต่อเนื่อง`, icon: 'CalendarCheck', color: 'emerald', desc: 'กำลังทำงานต่อเนื่อง' });
  }

  // Consistency badge
  if (stats.totalDays >= 20 && stats.averagePerDay >= 2) {
    badges.push({ id: 'consistent', name: 'คนขยัน', icon: 'Dumbbell', color: 'blue', desc: 'ทำงานมากกว่า 20 วัน เฉลี่ยวันละ 2 งาน' });
  }

  // Category badges
  if (stats.topCategoryCount >= 20) {
    badges.push({ id: 'specialist', name: `เชี่ยวชาญ${stats.topCategory}`, icon: 'Star', color: 'indigo', desc: `ทำ${stats.topCategory} มากกว่า 20 ครั้ง` });
  }

  // PM/UX: New minorTask-based badges
  if (stats.uniqueMinorTasks >= 10) {
    badges.push({ id: 'all_rounder', name: 'All-rounder', icon: 'Layers', color: 'cyan', desc: 'ทำงานครบ 10 หัวข้อรองที่แตกต่างกัน' });
  }
  if (stats.topMinorTask?.count >= 30) {
    badges.push({ id: 'right_hand', name: 'มือขวาประจำ', icon: 'HandHelping', color: 'pink', desc: `เชี่ยวชาญ${stats.topMinorTask.subject} (30+ ครั้ง)` });
  }

  // Early adopter (for users with data before certain date - can be checked by join date or first worklog)
  const firstWorklog = worklogs.length > 0
    ? worklogs.reduce((earliest, w) => w.date && w.date < earliest ? w.date : earliest, worklogs[0].date)
    : null;
  if (firstWorklog && firstWorklog < '2025-06-01') {
    badges.push({ id: 'early_adopter', name: 'ผู้ใช้รุ่นแรก', icon: 'Rocket', color: 'violet', desc: 'เริ่มใช้งานตั้งแต่ช่วงแรก' });
  }

  return badges;
}
