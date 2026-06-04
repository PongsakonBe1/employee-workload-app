/**
 * SP-2 + SP-3: Analytics Functions
 * analyzeSeasonalPattern(), detectOutliers(), predictNextPeak()
 */

import {
  ACADEMIC_PERIODS,
  PERIOD_COLORS,
  getPeriodForMonth,
  getMonthFromDate,
  THAI_MONTH_SHORT,
} from "./academicCalendar";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function stddev(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}

/**
 * จัดกลุ่ม worklogs ตามเดือน → { "YYYY-MM": count }
 * @param {Object[]} worklogs
 * @returns {Object}
 */
function countByMonth(worklogs) {
  const result = {};
  worklogs.forEach((log) => {
    const month = (log.date || "").slice(0, 7); // "YYYY-MM"
    if (!month) return;
    result[month] = (result[month] || 0) + 1;
  });
  return result;
}

/**
 * จัดกลุ่ม worklogs ตามวัน → { "YYYY-MM-DD": count }
 * @param {Object[]} worklogs
 * @returns {Object}
 */
function countByDay(worklogs) {
  const result = {};
  worklogs.forEach((log) => {
    const day = log.date || "";
    if (!day) return;
    result[day] = (result[day] || 0) + 1;
  });
  return result;
}

// ─── SP-2 Main Functions ──────────────────────────────────────────────────────

/**
 * วิเคราะห์ Seasonal Pattern จาก worklogs
 *
 * @param {Object[]} worklogs — array of worklog docs
 * @returns {{
 *   byMonth: Array<{ month, count, period, periodLabel, color }>,
 *   byPeriod: Array<{ id, label, shortLabel, total, avg, type, color }>,
 *   peakMonth: string|null,
 *   lowMonth: string|null,
 *   monthlyMean: number,
 *   monthlySD: number,
 * }}
 */
export function analyzeSeasonalPattern(worklogs = []) {
  const monthCount = countByMonth(worklogs);

  // สร้าง array ตามลำดับเดือนจาก monthCount keys ที่มี
  const months = Object.keys(monthCount).sort();

  const byMonth = months.map((month) => {
    const count = monthCount[month];
    const m = getMonthFromDate(month);
    const period = getPeriodForMonth(m);
    return {
      month,
      count,
      label: THAI_MONTH_SHORT[m] || month,
      period: period?.id || "other",
      periodLabel: period?.shortLabel || "อื่นๆ",
      type: period?.type || "other",
      color: PERIOD_COLORS[period?.type] || "#cbd5e1",
    };
  });

  const counts = byMonth.map((m) => m.count);
  const monthlyMean = mean(counts);
  const monthlySD = stddev(counts);

  const peakEntry = byMonth.reduce((a, b) => (b.count > a.count ? b : a), byMonth[0] || {});
  const lowEntry = byMonth.reduce((a, b) => (b.count < a.count ? b : a), byMonth[0] || {});

  // สรุปตาม period
  const periodMap = {};
  byMonth.forEach(({ period, periodLabel, count, type, color }) => {
    if (!periodMap[period]) {
      periodMap[period] = { id: period, label: periodLabel, type, color, counts: [] };
    }
    periodMap[period].counts.push(count);
  });

  const byPeriod = Object.values(periodMap).map((p) => ({
    id: p.id,
    label: p.label,
    type: p.type,
    color: p.color,
    total: p.counts.reduce((s, v) => s + v, 0),
    avg: Math.round(mean(p.counts)),
    months: p.counts.length,
  })).sort((a, b) => b.avg - a.avg);

  return {
    byMonth,
    byPeriod,
    peakMonth: peakEntry?.month || null,
    lowMonth: lowEntry?.month || null,
    monthlyMean: Math.round(monthlyMean * 10) / 10,
    monthlySD: Math.round(monthlySD * 10) / 10,
  };
}

/**
 * SP-3: Outlier Detection — วันที่มีงาน > mean + 2×SD → flag
 *
 * @param {Object[]} worklogs
 * @param {number} [sigmaMultiplier=2] — threshold multiplier
 * @returns {Array<{ date, count, zscore, label }>} sorted by count desc
 */
export function detectOutliers(worklogs = [], sigmaMultiplier = 2) {
  const dayCount = countByDay(worklogs);
  const days = Object.keys(dayCount);
  const counts = days.map((d) => dayCount[d]);

  const m = mean(counts);
  const sd = stddev(counts);
  const threshold = m + sigmaMultiplier * sd;

  return days
    .filter((d) => dayCount[d] > threshold)
    .map((d) => {
      const count = dayCount[d];
      const month = getMonthFromDate(d);
      const period = getPeriodForMonth(month);
      return {
        date: d,
        count,
        zscore: sd > 0 ? Math.round(((count - m) / sd) * 10) / 10 : 0,
        periodLabel: period?.shortLabel || "อื่นๆ",
        periodType: period?.type || "other",
        label: `${d} — ${count} งาน (z=${sd > 0 ? ((count - m) / sd).toFixed(1) : "∞"})`,
      };
    })
    .sort((a, b) => b.count - a.count);
}

/**
 * SP-2: Predict Next Peak Month
 * หา pattern เดือนพีคจากข้อมูลย้อนหลัง → แนะนำเดือน peak ถัดไป
 *
 * @param {Object[]} worklogs
 * @returns {{
 *   nextPeakMonth: string|null,    — "YYYY-MM"
 *   nextPeakLabel: string,
 *   confidence: "high"|"medium"|"low",
 *   basedOnYears: number,
 *   reason: string,
 * }}
 */
export function predictNextPeak(worklogs = []) {
  if (!worklogs.length) {
    return { nextPeakMonth: null, nextPeakLabel: "ไม่มีข้อมูล", confidence: "low", basedOnYears: 0, reason: "ไม่มีข้อมูล" };
  }

  // สรุปค่าเฉลี่ยงานต่อเดือน (1-12) ข้ามปี
  const avgByMonthNum = {};
  for (let m = 1; m <= 12; m++) avgByMonthNum[m] = [];

  const monthCount = countByMonth(worklogs);
  Object.entries(monthCount).forEach(([ym, count]) => {
    const m = getMonthFromDate(ym);
    if (m) avgByMonthNum[m].push(count);
  });

  const monthAvg = {};
  for (let m = 1; m <= 12; m++) {
    monthAvg[m] = avgByMonthNum[m].length ? mean(avgByMonthNum[m]) : 0;
  }

  // เดือนพีคสูงสุดโดยเฉลี่ย
  const peakMonthNum = Object.entries(monthAvg)
    .sort((a, b) => b[1] - a[1])[0]?.[0];

  if (!peakMonthNum) return { nextPeakMonth: null, nextPeakLabel: "ไม่สามารถพยากรณ์ได้", confidence: "low", basedOnYears: 0, reason: "ข้อมูลน้อยเกินไป" };

  // หาปีถัดไปสำหรับเดือนนั้น
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const targetMonth = parseInt(peakMonthNum, 10);
  const targetYear = targetMonth > currentMonth ? currentYear : currentYear + 1;
  const nextPeakMonth = `${targetYear}-${String(targetMonth).padStart(2, "0")}`;

  const yearsOfData = new Set(Object.keys(monthCount).map((ym) => ym.slice(0, 4))).size;
  const period = getPeriodForMonth(targetMonth);

  return {
    nextPeakMonth,
    nextPeakLabel: `${THAI_MONTH_SHORT[targetMonth]} ${targetYear} (${period?.shortLabel || "—"})`,
    confidence: yearsOfData >= 2 ? "high" : yearsOfData === 1 ? "medium" : "low",
    basedOnYears: yearsOfData,
    avgCount: Math.round(monthAvg[targetMonth]),
    reason: `เดือน ${THAI_MONTH_SHORT[targetMonth]} มีค่าเฉลี่ย ${Math.round(monthAvg[targetMonth])} งาน/เดือน (สูงสุด) — ช่วง ${period?.label || "ไม่ระบุ"}`,
  };
}

/**
 * คำนวณ moving average (window n)
 * @param {Array<{date, count}>} arr — sorted chronologically
 * @param {number} n
 * @returns {Array<{date, count, ma}>}
 */
export function movingAverage(arr = [], n = 7) {
  return arr.map((item, i) => {
    const window = arr.slice(Math.max(0, i - n + 1), i + 1);
    const ma = Math.round(mean(window.map((w) => w.count)) * 10) / 10;
    return { ...item, ma };
  });
}
