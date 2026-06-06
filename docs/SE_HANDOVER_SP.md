# [SE] → Handover: Phase 2 SP-1 ถึง SP-6 Complete

**วันที่:** 2026-06-04  
**Branch:** `feature/dashboard-analytics-v230`  
**จาก:** [SE] Software Engineer  
**ถึง:** [QA] SP-7, [Doc] SP-8, [DA] SP-2 review

---

## ✅ สิ่งที่ทำเสร็จ

| Task | ไฟล์ | สถานะ |
|------|------|--------|
| CF-1 ถึง CF-4 | `frontend/app/dashboard/page.js` | ✅ ยืนยันแก้แล้วก่อนหน้า |
| SP-1 | `frontend/lib/academicCalendar.js` | ✅ ใหม่ |
| SP-2 + SP-3 | `frontend/lib/analytics.js` | ✅ ใหม่ |
| SP-5 | `frontend/components/SeasonalCharts.js` | ✅ ใหม่ |
| SP-6 | `frontend/app/dashboard/page.js` | ✅ เพิ่ม Seasonal section |

> SP-4 (UX/UI design) — ไม่มี spec แยกต่างหาก ออกแบบ inline ตาม TASKS.md guidelines

---

## 📦 Files Created

### `frontend/lib/academicCalendar.js`
Constants + helpers สำหรับ academic calendar ไทย:
- `ACADEMIC_PERIODS` — 7 periods: SEMESTER_1/2, EXAM_1/2, BREAK_1, BREAK_SUMMER, SUMMER
- `PERIOD_COLORS` — สีตาม type: peak (red), active (indigo), low (slate)
- `getPeriodForMonth(month)` — map เดือน 1-12 → period
- `groupByAcademicPeriod(dates)` — จัดกลุ่ม dates ตาม period
- `THAI_MONTH_SHORT[]` — ชื่อเดือนย่อ ภาษาไทย

### `frontend/lib/analytics.js`
3 exported functions (SP-2 + SP-3):

| Function | Input | Output |
|----------|-------|--------|
| `analyzeSeasonalPattern(worklogs)` | worklog[] | `{ byMonth, byPeriod, peakMonth, lowMonth, monthlyMean, monthlySD }` |
| `detectOutliers(worklogs, sigma=2)` | worklog[], threshold | `[{ date, count, zscore, periodLabel }]` |
| `predictNextPeak(worklogs)` | worklog[] | `{ nextPeakMonth, nextPeakLabel, confidence, reason }` |
| `movingAverage(arr, n=7)` | `[{date,count}]` | array + `.ma` field |

### `frontend/components/SeasonalCharts.js`
3 exported React components (SP-5):

| Component | ชนิด | Props |
|-----------|------|-------|
| `SeasonalPatternChart` | Bar + ReferenceLine (recharts) | `data, mean, sd` |
| `OutlierAlertCard` | Card list | `outliers, mean` |
| `PeakHourPrediction` | Prediction card + period summary | `prediction, byPeriod` |

### `frontend/app/dashboard/page.js` (แก้ไข)
- Import `analyzeSeasonalPattern`, `detectOutliers`, `predictNextPeak` จาก `../../lib/analytics`
- Dynamic import 3 SeasonalCharts components
- `useState allWorklogs` + 3 `useMemo` (seasonalData, outliers, prediction)
- `setAllWorklogs(allWorklogsInRange)` ใน `loadStats()`
- แสดง Seasonal section ใต้ Heatmap row เมื่อ `allWorklogs.length > 0`

---

## 🔄 งานต่อไป

### [QA] — SP-7 Validation (พร้อมทดสอบ)

Test cases ที่ต้องครอบคลุม:

1. **Seasonal Pattern**: ธันวาคม (exam period) > พฤษภาคม (break) — ค่า count สูงกว่า
2. **Outlier Detection**: เพิ่ม mock data วันงาน > mean + 2σ → ปรากฏใน OutlierAlertCard
3. **Peak Prediction**: confidence "high" เมื่อมีข้อมูล ≥ 2 ปี
4. **Empty State**: worklogs = [] → Seasonal section ไม่แสดง (ไม่ crash)
5. **Period Colors**: bar ช่วงสอบ (ก.ย./ต.ค.) เป็นสี red-500

บันทึกผลใน `QA_REPORT.md` Section 11

### [Doc] — SP-8 (หลัง SP-7 pass)

- สร้าง `docs/SEASONAL_GUIDE.md`:
  - วิธีอ่านกราฟ SeasonalPatternChart (สี, reference line)
  - วิธีใช้ Outlier detection วางแผน staffing
  - Case study: ช่วงสอบ vs ปิดเทอม

### [DA] — ตรวจสอบ analytics.js

- ยืนยันว่า `getPeriodForMonth()` ครอบคลุม academic calendar ถูกต้อง
- ตรวจสอบ sigma threshold (default=2) — อาจปรับเป็น 1.5 ถ้า dataset เล็ก

---

## ⚠️ Notes สำคัญ

- **SP-4 Design**: ออกแบบ inline ใน component แล้ว ไม่ต้องรอ spec แยก
- **Recharts**: ใช้ version เดิม — ไม่ต้องติดตั้งเพิ่ม
- **Seasonal section แสดงเฉพาะเมื่อ `allWorklogs.length > 0`** — filter range ที่แคบเกินไป (เช่น "วันนี้") จะไม่มีข้อมูลพอแสดง pattern → ปกติ ไม่ใช่ bug
- **CF-1 ถึง CF-4**: ยืนยันจากการตรวจ code แล้วว่าทั้งหมดแก้ไปตั้งแต่ session ก่อน

---

## ลำดับ Phase ถัดไป

**Phase 3: Staff Efficiency Radar Chart**
- [DA] SR-1 (2 hr): `docs/STAFF_METRICS_SPEC.md`
- [DA] SR-2 (2 hr): `frontend/lib/staffMetrics.js`
- [UX/UI] SR-3 (2 hr): Radar Chart design spec
- [SE] SR-4+SR-5+SR-6 (9 hr): StaffRadarChart + admin/staff-analytics page

---

*SE Handover Phase 2 · Cascade SE Agent · 2026-06-04*
