# Seasonal Pattern Analysis Guide — คู่มือวิเคราะห์แพทเทิร์นตามภาคเรียน

**เวอร์ชัน:** v2.3.0 (Phase 2)  
**สถานะ:** ✅ QA Sign-off (SP-7 — 5/5 test cases passed)  
**Branch:** `feature/dashboard-analytics-v230`

---

## ภาพรวม

ระบบวิเคราะห์แพทเทิร์นภาระงานตามปฏิทินวิชาการ KMUTNB — ช่วยให้ Admin วางแผนอัตรากำลังล่วงหน้าได้ โดยดูจากข้อมูลย้อนหลังว่าช่วงใดงานหนาแน่น/เบา และตรวจจับวันที่ผิดปกติ (Outlier)

---

## ตำแหน่งในระบบ

**Dashboard → ส่วน "แพทเทิร์นตามภาคเรียน"** (ล่าง Heatmap)

- เข้าถึงได้: Admin / Superadmin
- ต้องมี worklog ในระบบก่อน (ซ่อนอัตโนมัติถ้าข้อมูลว่าง)

---

## วิธีอ่านกราฟแต่ละชนิด

### 1. SeasonalPatternChart (Bar Chart รายเดือน)

```
จำนวนงาน
    │          ████
    │     ████ ████
    │     ████ ████  ████
    │ ── ─mean─ ── ─ ── ─ ── → เส้น mean (ค่าเฉลี่ย)
    │- - -mean+2σ - - - - - → เส้น +2σ (เหนือ = Outlier)
    └───────────────────────
       ม.ค. ก.พ. มี.ค. ...
```

**สีแท่ง:**

| สี | ช่วงเวลา | ความหมาย |
|----|---------|----------|
| 🔴 แดง (`#ef4444`) | ช่วงสอบ (ก.ย.–ต.ค., ก.พ.–มี.ค.) | ภาระงานสูงที่สุด |
| 🔵 ม่วง-น้ำเงิน (`#6366f1`) | ช่วงเรียนปกติ | ภาระงานปกติ |
| ⬜ เทา (`#64748b`) | ช่วงปิดเทอม (พ.ย., เม.ย.–พ.ค.) | ภาระงานน้อย |

**Reference Lines:**
- **เส้นทึบ (mean):** ค่าเฉลี่ยงานต่อเดือน — เดือนใดสูงกว่าเส้นนี้คืองานหนาแน่นกว่าปกติ
- **เส้นประ (mean + 2σ):** เกณฑ์ Outlier — เดือนใดสูงกว่านี้คือผิดปกติ ควรตรวจสอบ

---

### 2. OutlierAlertCard (การ์ดแจ้งเตือนวันผิดปกติ)

แสดงวันที่มีงาน **เกิน mean + 2σ** พร้อมรายละเอียด:

```
⚠️ 15 ธ.ค. 2568 — 47 งาน (z-score: 2.8)
   ช่วง: ภาคเรียนที่ 1 / ปลายภาค
   สูงกว่าค่าเฉลี่ย 185%
```

**วิธีใช้สำหรับ Staffing:**
1. ดูวันที่มี Outlier Alert → ตรวจว่าตรงกับกิจกรรมพิเศษหรือไม่ (งานรับน้อง, ลงทะเบียน)
2. ถ้าเป็นวันซ้ำ ๆ ทุกปี → วางแผนจัดเพิ่มเจ้าหน้าที่ล่วงหน้า
3. ถ้าเป็น spike แบบครั้งเดียว → สอบถามสาเหตุ (งานพิเศษ, ระบบล่ม ฯลฯ)

> **ค่า z-score:** ยิ่งสูง = ยิ่งผิดปกติ  
> - 2.0–2.5 = ผิดปกติเล็กน้อย  
> - 2.5–3.0 = ผิดปกติปานกลาง  
> - > 3.0 = ผิดปกติมาก — ควรตรวจสอบเหตุผล

---

### 3. PeakHourPrediction (การ์ดพยากรณ์)

แสดงเดือนที่คาดว่างานจะหนาแน่นที่สุดในปีหน้า พร้อม confidence level:

| Confidence | เงื่อนไข | ความหมาย |
|-----------|---------|----------|
| 🟢 **สูง** | ข้อมูล ≥ 2 ปี | พยากรณ์น่าเชื่อถือ |
| 🟡 **ปานกลาง** | ข้อมูล 1 ปี | พยากรณ์ได้แต่อาจผิดพลาด |
| 🔴 **ต่ำ** | ข้อมูล < 6 เดือน | ไม่เพียงพอสำหรับพยากรณ์ |

---

## ปฏิทินวิชาการ KMUTNB (ACADEMIC_PERIODS)

| ภาค/ช่วง | เดือน | ประเภท | สี |
|---------|-------|--------|-----|
| ภาคเรียนที่ 1 | มิ.ย. – ต.ค. | active | 🔵 ม่วง |
| **ปลายภาค 1 (สอบ)** | ก.ย. – ต.ค. | **peak** | 🔴 แดง |
| พักระหว่างภาค | พ.ย. | low | ⬜ เทา |
| ภาคเรียนที่ 2 | พ.ย. – มี.ค. | active | 🔵 ม่วง |
| **ปลายภาค 2 (สอบ)** | ก.พ. – มี.ค. | **peak** | 🔴 แดง |
| ปิดเทอมฤดูร้อน | เม.ย. – พ.ค. | low | ⬜ เทา |
| ภาคฤดูร้อน | มิ.ย. – ก.ค. | active | 🔵 ม่วง |

---

## Analytics Functions — Reference

### `analyzeSeasonalPattern(worklogs)`

```javascript
import { analyzeSeasonalPattern } from '@/lib/analytics';

const result = analyzeSeasonalPattern(worklogs);
// result: {
//   byMonth: [{month: 1, count: 42, label: "ม.ค.", periodType: "active"}, ...],
//   byPeriod: {peak: 156, active: 89, low: 23},
//   peakMonth: {month: 10, label: "ต.ค.", count: 67},
//   lowMonth: {month: 5, label: "พ.ค.", count: 12},
//   monthlyMean: 38.5,
//   monthlySD: 14.2
// }
```

### `detectOutliers(worklogs, sigma = 2)`

```javascript
import { detectOutliers } from '@/lib/analytics';

const outliers = detectOutliers(worklogs, 2);  // sigma = 2 (default)
// outliers: [{
//   date: "2025-10-15",
//   count: 47,
//   zscore: 2.8,
//   periodLabel: "ปลายภาค 1"
// }, ...]
```

> **ปรับ sigma:** ถ้าข้อมูลน้อย (< 6 เดือน) ลองใช้ `sigma=1.5` เพื่อ sensitivity สูงขึ้น

### `predictNextPeak(worklogs)`

```javascript
import { predictNextPeak } from '@/lib/analytics';

const prediction = predictNextPeak(worklogs);
// prediction: {
//   nextPeakMonth: "ตุลาคม 2569",
//   confidence: "high",    // "high" | "medium" | "low"
//   basedOnYears: 2
// }
```

### `movingAverage(arr, n = 7)`

```javascript
import { movingAverage } from '@/lib/analytics';

const smoothed = movingAverage(dailyCounts, 7);  // 7-day moving average
// เพิ่ม field .ma ใน array
```

---

## Case Study: วางแผน Staffing ด้วย Seasonal Analysis

### Scenario: กำลังเตรียมทีมสำหรับปีการศึกษา 2569

**ขั้นตอน:**

1. **เปิด Dashboard** → เลื่อนลงมาส่วน "แพทเทิร์นตามภาคเรียน"

2. **อ่าน SeasonalPatternChart:**
   ```
   ตัวอย่างผล:
   - ต.ค. 2568: 67 งาน (สูงสุด — แท่งแดง, เกิน mean+2σ)
   - พ.ค. 2568: 12 งาน (ต่ำสุด — แท่งเทา)
   - Mean: 38.5 งาน/เดือน
   ```
   → **สรุป:** ช่วงสอบปลายภาค 1 (ต.ค.) งานมากกว่าปกติ **74%**

3. **อ่าน OutlierAlertCard:**
   ```
   ⚠️ 15 ต.ค. 2568 — z-score 2.8 (ลงทะเบียนช้า + ผูก Account แห่กันมา)
   ⚠️ 3 มี.ค. 2568 — z-score 2.3 (ปลายภาค 2)
   ```
   → วันที่ 15 ต.ค. ทุกปีควรจัดเจ้าหน้าที่เพิ่ม **1–2 คน**

4. **อ่าน PeakHourPrediction:**
   ```
   🔮 ช่วงหนาแน่นถัดไป: ตุลาคม 2569 (Confidence: สูง)
   อ้างอิงจาก 2 ปีที่ผ่านมา
   ```
   → แจ้ง Superadmin วางแผนล่วงหน้า 2 เดือน (สิงหาคม)

5. **ปรับแผน:**
   - เดือน ต.ค., มี.ค.: เพิ่ม Quick Log Templates สำหรับงานที่ทำซ้ำบ่อย
   - เดือน เม.ย.–พ.ค.: ใช้เวลาว่างทำงาน Maintenance ระบบ

---

## การตั้งค่า sigma threshold

ปรับได้ในไฟล์ `frontend/app/dashboard/page.js`:

```javascript
// ค่า default: sigma=2
const outliers = useMemo(() => detectOutliers(allWorklogs, 2), [allWorklogs]);

// ถ้าข้อมูลน้อย (< 6 เดือน) — ลด sigma เพื่อ sensitivity สูงขึ้น
const outliers = useMemo(() => detectOutliers(allWorklogs, 1.5), [allWorklogs]);

// ถ้าต้องการเฉพาะ extreme outlier เท่านั้น — เพิ่ม sigma
const outliers = useMemo(() => detectOutliers(allWorklogs, 3), [allWorklogs]);
```

---

## Files ที่เกี่ยวข้อง

| ไฟล์ | หน้าที่ |
|------|--------|
| `frontend/lib/academicCalendar.js` | ACADEMIC_PERIODS constants, helper functions |
| `frontend/lib/analytics.js` | Core analytics: analyzeSeasonalPattern, detectOutliers, predictNextPeak, movingAverage |
| `frontend/components/SeasonalCharts.js` | React components: SeasonalPatternChart, OutlierAlertCard, PeakHourPrediction |
| `frontend/app/dashboard/page.js` | Dashboard integration (SP-6) |
| `frontend/tests/seasonal-sp7.spec.js` | Playwright E2E tests (11 tests) |

---

## QA Sign-off (SP-7)

| Test | รายละเอียด | ผล |
|------|-----------|-----|
| TEST-1 | ธันวาคม (exam) > พฤษภาคม (break) | ✅ |
| TEST-2 | Outlier > mean + 2σ → OutlierAlertCard | ✅ |
| TEST-3 | Peak prediction confidence "high" ≥ 2 ปี | ✅ |
| TEST-4 | Empty state: worklogs=[] → ไม่แสดง | ✅ |
| TEST-5 | Period colors: exam = red-500 | ✅ |

**QA Sign-off: ✅ 5/5 — พร้อม production (v2.3.0 Phase 2)**  
รายงานเต็ม: `QA_REPORT.md` Section 11

---

*Seasonal Pattern Analysis Guide · [Doc] · 4 มิ.ย. 2569 · SP-8*
