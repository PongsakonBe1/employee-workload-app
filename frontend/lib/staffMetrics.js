/**
 * Staff Metrics Calculation Functions
 * Phase 3 SR-2 — Staff Efficiency Radar Chart
 *
 * 6 Metrics:
 * 1. Volume — จำนวนงานที่ทำ
 * 2. Versatility — ความหลากหลายของประเภทงาน
 * 3. Consistency — ความสม่ำเสมอรายวัน
 * 4. Peak Handling — อัตรางานใน peak hours
 * 5. Documentation — คุณภาพการลง comment
 * 6. Combo Usage — การใช้ quick log/template
 *
 * Spec: docs/STAFF_METRICS_SPEC.md
 */

// Peak hours definition (HH format)
export const PEAK_HOURS = ["08", "12", "13", "17"];

// Reference values for 100% score
export const REFERENCE = {
  VOLUME: 50,        // 50 worklogs = 100%
  VERSATILITY: 10,   // 10 unique minorTasks = 100%
  CONSISTENCY_CV: 2, // CV = 2.0 → 0%
};

/**
 * Calculate Volume metric
 * @param {string} employeeId — Firebase UID
 * @param {Array} worklogs — array of worklog objects
 * @param {Object} dateRange — { start: "YYYY-MM-DD", end: "YYYY-MM-DD" }
 * @returns {number} — 0-100
 */
export function calculateVolume(employeeId, worklogs, dateRange) {
  const empLogs = worklogs.filter(
    (w) =>
      w.employeeId === employeeId &&
      w.date >= dateRange.start &&
      w.date <= dateRange.end
  );
  return Math.min((empLogs.length / REFERENCE.VOLUME) * 100, 100);
}

/**
 * Calculate Versatility metric
 * @param {string} employeeId — Firebase UID
 * @param {Array} worklogs — array of worklog objects
 * @param {Object} dateRange — { start: "YYYY-MM-DD", end: "YYYY-MM-DD" }
 * @returns {number} — 0-100
 */
export function calculateVersatility(employeeId, worklogs, dateRange) {
  const empLogs = worklogs.filter(
    (w) =>
      w.employeeId === employeeId &&
      w.date >= dateRange.start &&
      w.date <= dateRange.end
  );

  const uniqueTasks = new Set(empLogs.map((w) => w.minorTask).filter(Boolean))
    .size;
  return Math.min((uniqueTasks / REFERENCE.VERSATILITY) * 100, 100);
}

/**
 * Calculate standard deviation
 * @param {Array} values — array of numbers
 * @returns {number}
 */
function standardDeviation(values) {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    values.length;
  return Math.sqrt(variance);
}

/**
 * Calculate Consistency metric (using Coefficient of Variation)
 * @param {string} employeeId — Firebase UID
 * @param {Array} worklogs — array of worklog objects
 * @param {Object} dateRange — { start: "YYYY-MM-DD", end: "YYYY-MM-DD" }
 * @returns {number} — 0-100
 */
export function calculateConsistency(employeeId, worklogs, dateRange) {
  const empLogs = worklogs.filter(
    (w) =>
      w.employeeId === employeeId &&
      w.date >= dateRange.start &&
      w.date <= dateRange.end
  );

  // Group by date
  const byDate = {};
  empLogs.forEach((w) => {
    byDate[w.date] = (byDate[w.date] || 0) + 1;
  });

  const dailyCounts = Object.values(byDate);

  if (dailyCounts.length === 0) return 0;
  if (dailyCounts.length === 1) return 100; // Perfect consistency for single day

  const mean = dailyCounts.reduce((a, b) => a + b, 0) / dailyCounts.length;
  if (mean === 0) return 0;

  const std = standardDeviation(dailyCounts);
  const cv = std / mean;

  // CV = 0 → 100%, CV = 2.0 → 0%
  return Math.max(0, 100 - cv * 50);
}

/**
 * Calculate Peak Handling metric
 * @param {string} employeeId — Firebase UID
 * @param {Array} worklogs — array of worklog objects
 * @param {Object} dateRange — { start: "YYYY-MM-DD", end: "YYYY-MM-DD" }
 * @returns {number} — 0-100
 */
export function calculatePeakHandling(employeeId, worklogs, dateRange) {
  const empLogs = worklogs.filter(
    (w) =>
      w.employeeId === employeeId &&
      w.date >= dateRange.start &&
      w.date <= dateRange.end
  );

  if (empLogs.length === 0) return 0;

  const peakLogs = empLogs.filter((w) => {
    const hour = (w.time || "").split(":")[0];
    return PEAK_HOURS.includes(hour);
  });

  return (peakLogs.length / empLogs.length) * 100;
}

/**
 * Check if comment has detail (>= 20 chars)
 * @param {string} comment
 * @returns {boolean}
 */
export function hasDetail(comment) {
  return (comment || "").trim().length >= 20;
}

/**
 * Calculate Documentation metric
 * @param {string} employeeId — Firebase UID
 * @param {Array} worklogs — array of worklog objects
 * @param {Object} dateRange — { start: "YYYY-MM-DD", end: "YYYY-MM-DD" }
 * @returns {number} — 0-100
 */
export function calculateDocumentation(employeeId, worklogs, dateRange) {
  const empLogs = worklogs.filter(
    (w) =>
      w.employeeId === employeeId &&
      w.date >= dateRange.start &&
      w.date <= dateRange.end
  );

  if (empLogs.length === 0) return 0;

  const withDetail = empLogs.filter((w) => hasDetail(w.comment)).length;
  return (withDetail / empLogs.length) * 100;
}

/**
 * Check if worklog is from quick log or template
 * @param {Object} worklog
 * @returns {boolean}
 */
export function isQuickLog(worklog) {
  return (
    worklog.source === "quick-log" ||
    !!worklog.templateId ||
    !!worklog.comboId
  );
}

/**
 * Calculate Combo Usage metric
 * @param {string} employeeId — Firebase UID
 * @param {Array} worklogs — array of worklog objects
 * @param {Object} dateRange — { start: "YYYY-MM-DD", end: "YYYY-MM-DD" }
 * @returns {number} — 0-100
 */
export function calculateComboUsage(employeeId, worklogs, dateRange) {
  const empLogs = worklogs.filter(
    (w) =>
      w.employeeId === employeeId &&
      w.date >= dateRange.start &&
      w.date <= dateRange.end
  );

  if (empLogs.length === 0) return 0;

  const quickLogs = empLogs.filter(isQuickLog).length;
  return (quickLogs / empLogs.length) * 100;
}

/**
 * Calculate all 6 metrics for radar chart
 * @param {string} employeeId — Firebase UID
 * @param {Array} worklogs — array of worklog objects
 * @param {Object} dateRange — { start: "YYYY-MM-DD", end: "YYYY-MM-DD" }
 * @returns {Object} — { volume, versatility, consistency, peakHandling, documentation, comboUsage }
 */
export function calculateRadarMetrics(employeeId, worklogs, dateRange) {
  return {
    volume: calculateVolume(employeeId, worklogs, dateRange),
    versatility: calculateVersatility(employeeId, worklogs, dateRange),
    consistency: calculateConsistency(employeeId, worklogs, dateRange),
    peakHandling: calculatePeakHandling(employeeId, worklogs, dateRange),
    documentation: calculateDocumentation(employeeId, worklogs, dateRange),
    comboUsage: calculateComboUsage(employeeId, worklogs, dateRange),
  };
}

/**
 * Calculate team average for benchmark
 * @param {Array} allMetrics — array of metrics objects from calculateRadarMetrics
 * @returns {Object|null} — team average for each metric
 */
export function getTeamAverage(allMetrics) {
  const count = allMetrics.length;
  if (count === 0) return null;

  const sum = allMetrics.reduce(
    (acc, m) => ({
      volume: acc.volume + m.volume,
      versatility: acc.versatility + m.versatility,
      consistency: acc.consistency + m.consistency,
      peakHandling: acc.peakHandling + m.peakHandling,
      documentation: acc.documentation + m.documentation,
      comboUsage: acc.comboUsage + m.comboUsage,
    }),
    {
      volume: 0,
      versatility: 0,
      consistency: 0,
      peakHandling: 0,
      documentation: 0,
      comboUsage: 0,
    }
  );

  return {
    volume: sum.volume / count,
    versatility: sum.versatility / count,
    consistency: sum.consistency / count,
    peakHandling: sum.peakHandling / count,
    documentation: sum.documentation / count,
    comboUsage: sum.comboUsage / count,
  };
}

/**
 * Get ranking of staff by specific metric
 * @param {Array} staffList — array of { employeeId, name, metrics }
 * @param {string} metric — one of 6 metric names
 * @param {number} limit — number of results
 * @returns {Array} — sorted by metric descending
 */
export function getRankingByMetric(staffList, metric, limit = 10) {
  return staffList
    .map((staff) => ({
      employeeId: staff.employeeId,
      name: staff.name,
      value: staff.metrics[metric],
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

/**
 * Find top performer (highest average across all metrics)
 * @param {Array} staffList — array of { employeeId, name, metrics }
 * @returns {Object|null} — top performer info
 */
export function getTopPerformer(staffList) {
  if (staffList.length === 0) return null;

  const withAvg = staffList.map((staff) => ({
    ...staff,
    average:
      (staff.metrics.volume +
        staff.metrics.versatility +
        staff.metrics.consistency +
        staff.metrics.peakHandling +
        staff.metrics.documentation +
        staff.metrics.comboUsage) /
      6,
  }));

  return withAvg.sort((a, b) => b.average - a.average)[0];
}
