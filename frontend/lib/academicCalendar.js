/**
 * SP-1: Academic Calendar Constants
 * ปฏิทินการศึกษาสำหรับ Seasonal Pattern Analysis
 * อิง มหาวิทยาลัยไทย ระบบ 2 ภาคการศึกษา + ภาคฤดูร้อน
 */

/**
 * ช่วงเวลาในปีการศึกษา (Gregorian month-based, 1-indexed)
 * ใช้เป็น range [startMonth, endMonth] inclusive
 */
export const ACADEMIC_PERIODS = {
  /** ภาค 1: มิ.ย. – ต.ค. (เปิดเทอม, งานสูง) */
  SEMESTER_1: {
    id: "semester_1",
    label: "ภาคการศึกษาที่ 1",
    shortLabel: "ภาค 1",
    months: [6, 7, 8, 9, 10],
    type: "active",
    description: "ช่วงเปิดภาคการศึกษา 1 — นักศึกษาเริ่มเรียน, งานบริการสูง",
  },
  /** ช่วงสอบกลาง/ปลายภาค 1: ส.ค.-ต.ค. (งานพีค) */
  EXAM_1: {
    id: "exam_1",
    label: "สอบภาค 1",
    shortLabel: "สอบ 1",
    months: [9, 10],
    type: "peak",
    description: "ช่วงสอบกลางภาคและปลายภาคการศึกษา 1 — งานพีค",
  },
  /** ปิดเทอม 1: พ.ย. (งานต่ำ) */
  BREAK_1: {
    id: "break_1",
    label: "ปิดภาค 1",
    shortLabel: "ปิด 1",
    months: [11],
    type: "low",
    description: "ช่วงปิดภาคการศึกษา 1 — งานลดลง",
  },
  /** ภาค 2: พ.ย. – มี.ค. (เปิดเทอม) */
  SEMESTER_2: {
    id: "semester_2",
    label: "ภาคการศึกษาที่ 2",
    shortLabel: "ภาค 2",
    months: [11, 12, 1, 2, 3],
    type: "active",
    description: "ช่วงเปิดภาคการศึกษา 2 — งานบริการปกติ",
  },
  /** ช่วงสอบปลายภาค 2: ก.พ.-มี.ค. (งานพีค) */
  EXAM_2: {
    id: "exam_2",
    label: "สอบภาค 2",
    shortLabel: "สอบ 2",
    months: [2, 3],
    type: "peak",
    description: "ช่วงสอบกลางภาคและปลายภาคการศึกษา 2 — งานพีค",
  },
  /** ปิดเทอมใหญ่: เม.ย.-พ.ค. (งานต่ำสุด) */
  BREAK_SUMMER: {
    id: "break_summer",
    label: "ปิดภาคฤดูร้อน",
    shortLabel: "ปิดร้อน",
    months: [4, 5],
    type: "low",
    description: "ช่วงปิดภาคฤดูร้อน — งานต่ำสุดของปี",
  },
  /** ภาคฤดูร้อน: มิ.ย. (เปิดเทอมสั้น) */
  SUMMER: {
    id: "summer",
    label: "ภาคฤดูร้อน",
    shortLabel: "ร้อน",
    months: [6],
    type: "active",
    description: "ช่วงภาคฤดูร้อน — เปิดเรียนบางส่วน",
  },
};

/** สีประจำแต่ละ period type */
export const PERIOD_COLORS = {
  peak:   "#ef4444", // red-500
  active: "#6366f1", // indigo-500
  low:    "#94a3b8", // slate-400
};

/**
 * หา academic period ที่ตรงกับเดือนที่ระบุ
 * @param {number} month — 1-indexed (1=Jan)
 * @returns {Object|null} period object หรือ null
 */
export function getPeriodForMonth(month) {
  // Priority: EXAM > SEMESTER > BREAK
  const priority = ["EXAM_1", "EXAM_2", "SEMESTER_1", "SEMESTER_2", "SUMMER", "BREAK_1", "BREAK_SUMMER"];
  for (const key of priority) {
    const period = ACADEMIC_PERIODS[key];
    if (period.months.includes(month)) return period;
  }
  return null;
}

/**
 * แปลง date string "YYYY-MM" หรือ "YYYY-MM-DD" → เดือน 1-indexed
 * @param {string} dateStr
 * @returns {number}
 */
export function getMonthFromDate(dateStr) {
  return parseInt((dateStr || "").split("-")[1], 10) || 0;
}

/**
 * ชื่อเดือนภาษาไทยแบบย่อ
 */
export const THAI_MONTH_SHORT = [
  "", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

/**
 * จัดกลุ่ม date strings ตาม academic period
 * @param {string[]} dates — ["YYYY-MM-DD", ...]
 * @returns {Object} { semester_1: [...], exam_1: [...], ... }
 */
export function groupByAcademicPeriod(dates) {
  const groups = {};
  dates.forEach((d) => {
    const month = getMonthFromDate(d);
    const period = getPeriodForMonth(month);
    const key = period?.id || "other";
    if (!groups[key]) groups[key] = [];
    groups[key].push(d);
  });
  return groups;
}
