# Action Items — Version 2.3.0
## Dashboard & Analytics Enhancement

**Prepared by:** DA (Data Analyst)  
**Date:** 2026-06-04  
**Target Release:** v2.3.0  
**Status:** Ready for PM Review

---

## Executive Summary

ฟีเจอร์หลัก 4 ส่วน พร้อม Critical Fixes จาก DA Audit:
1. **Equipment Health Tracking** — เก็บสภาพอุปกรณ์หลังให้บริการ (ต่อจาก Google Sheets)
2. **Seasonal Pattern Analysis** — พยากรณ์ workload ตาม academic calendar
3. **Staff Efficiency Radar** — ประเมินพนักงาน 6 มิติ
4. **System Metrics Collection** — สะสม time-series สำหรับ forecasting

---

## Phase 0: Critical Fixes (ต้องทำก่อนเพิ่มฟีเจอร์)

### CF-1: Fix Heatmap Timezone Bug
- **Role:** SE
- **Priority:** 🔴 Critical
- **File:** `frontend/app/dashboard/page.js:463`
- **Change:** เปลี่ยน `new Date(log.date)` → `new Date(log.date + "T00:00:00")`
- **Impact:** DOW ใน heatmap ไม่ shift ผิด 1 วัน
- **Est:** 30 min
- **Acceptance:** Heatmap วันจันทร์ต้องแสดงข้อมูลจันทร์จริง ๆ

### CF-2: Fix Aggregate from Truncated Data
- **Role:** SE
- **Priority:** 🔴 Critical
- **File:** `frontend/app/dashboard/page.js:436`
- **Change:** เปลี่ยน `worklogs.forEach` → `allWorklogsInRange.forEach`
- **Impact:** กราฟแสดงข้อมูลเต็ม ไม่ใช่แค่ 300 records แรก
- **Est:** 30 min
- **Acceptance:** KPI Card กับ Pie Chart ต้อง reflect จำนวนเดียวกัน

### CF-3: Remove Duplicate Error Display
- **Role:** SE
- **Priority:** 🔴 Critical
- **File:** `frontend/app/dashboard/page.js:783-787` หรือ `816-819`
- **Change:** ลบ error block ซ้ำออก 1 จุด
- **Impact:** UX ไม่สับสน
- **Est:** 15 min

### CF-4: Fix Leaderboard Query Redundancy
- **Role:** SE
- **Priority:** 🔴 Critical
- **File:** `frontend/app/dashboard/page.js:528-548`
- **Change:** ใช้ `allWorklogsInRange` ที่มีอยู่แทน query Firestore ซ้ำ
- **Impact:** ประหยัด Firestore quota
- **Est:** 1 hr

---

## Phase 1: Equipment Health Tracking

### EH-1: Schema Design
- **Role:** SA
- **Priority:** 🟠 High
- **Deliverable:** Document + Firestore Rules
- **Details:**
  - `worklogs.equipmentCondition`: enum ["normal", "damaged", "lost"]
  - `worklogs.equipmentNote`: string (optional, max 200 chars)
- **Est:** 1 hr
- **Note to SE:** ใช้ได้ทันทีหลัง SA merge

### EH-2: Firestore Rules Update
- **Role:** SA
- **Priority:** 🟠 High
- **File:** `firebase/firestore.rules`
- **Change:** อนุญาต write fields ใหม่ใน worklog create/update
- **Est:** 30 min
- **Dependency:** EH-1

### EH-3: Smart Condition Modal UI Design
- **Role:** UX/UI
- **Priority:** 🟠 High
- **Deliverable:** Figma/Wireframe
- **Spec:**
  - Trigger: ตอน log "คืนหูฟัง", "คืนปลั๊กไฟ", "ปิดห้อง"
  - Default: [✓] สมบูรณ์ (กด Enter ผ่านได้)
  - Alt: [ ] ชำรุด → แสดง text input โน๊ตสั้น
  - Max 2 clicks ถ้าปกติ
- **Est:** 2 hr
- **Note to SE:** ใช้ pattern จาก `SmartEquipmentModal.js` ได้

### EH-4: Implement EquipmentReturnModal
- **Role:** SE
- **Priority:** 🟠 High
- **File:** `frontend/components/EquipmentReturnModal.js` (new)
- **Integration:** เรียกจาก `QuickLogButtons.js` ตอน action "return/close"
- **Est:** 3 hr
- **Dependency:** EH-3

### EH-5: Backfill Existing Data
- **Role:** DA
- **Priority:** 🟡 Medium
- **File:** `scripts/backfillEquipmentCondition.js`
- **Logic:** Parse comment หาคำ "ชำรุด/เสีย/หัก/สูญหาย" → อัปเดต field ย้อนหลัง
- **Est:** 2 hr
- **Safety:** รันบน dev ก่อน แล้ว test บน production clone

### EH-6: Equipment Health Dashboard Page
- **Role:** SE
- **Priority:** 🟠 High
- **File:** `frontend/app/admin/equipment-health/page.js` (new)
- **Features:**
  - Damage Rate by Equipment (Bar chart)
  - Equipment Health Timeline (Line chart)
  - Damage Category breakdown (Pie)
  - Export CSV
- **Est:** 4 hr
- **Dependency:** EH-4

### EH-7: Equipment Chart Components
- **Role:** SE
- **Priority:** 🟠 High
- **File:** `frontend/components/EquipmentCharts.js` (new)
- **Components:**
  - `EquipmentDamageChart`
  - `EquipmentHealthTimeline`
  - `DamageCategoryPie`
- **Est:** 3 hr

### EH-8: QA Test Equipment Flow
- **Role:** QA
- **Priority:** 🟠 High
- **Test Cases:**
  1. ยืมหูฟัง → คืนหูฟัง + บันทึกปกติ → Dashboard อัปเดต
  2. ยืมหูฟัง → คืน + บันทึกชำรุด + โน๊ต → Dashboard แสดง damage
  3. กรองดูเฉพาะอุปกรณ์ที่ชำรุดบ่อย
- **Est:** 2 hr
- **Output:** `QA_REPORT.md` section

### EH-9: Documentation Update
- **Role:** Doc
- **Priority:** 🟢 Low
- **Files:** `README.md`, `docs/EQUIPMENT_HEALTH.md`
- **Content:** Feature overview, screenshots, user guide
- **Est:** 1.5 hr
- **Dependency:** EH-8 pass

---

## Phase 2: Seasonal Pattern Analysis

### SP-1: Academic Calendar Constants
- **Role:** DA
- **Priority:** 🟡 Medium
- **File:** `frontend/lib/academicCalendar.js`
- **Data:**
  ```javascript
  export const ACADEMIC_PERIODS = {
    "2568": {
      opening: { start: "2024-10-01", end: "2024-10-31" },
      mid: { start: "2024-11-01", end: "2024-11-30" },
      exam: { start: "2024-12-01", end: "2024-12-31" },
      break: { start: "2025-01-01", end: "2025-01-31" }
    }
  };
  ```
- **Est:** 1 hr

### SP-2: Seasonal Analysis Algorithm
- **Role:** DA
- **Priority:** 🟡 Medium
- **File:** `frontend/lib/analytics.js`
- **Functions:**
  - `analyzeSeasonalPattern(worklogs, year)` → avg/max per period
  - `detectOutliers(worklogs)` → days > 2 SD from mean
  - `predictNextPeak(historicalPattern)` → simple weighted forecast
- **Est:** 2 hr

### SP-3: Outlier Detection Logic
- **Role:** DA
- **Priority:** 🟡 Medium
- **File:** `frontend/lib/analytics.js`
- **Logic:**
  ```javascript
  const mean = average(dailyCounts);
  const std = standardDeviation(dailyCounts);
  return worklogs.filter(w => w.count > mean + (2 * std));
  ```
- **Est:** 1 hr
- **Dependency:** SP-2

### SP-4: Seasonal Dashboard UI Design
- **Role:** UX/UI
- **Priority:** 🟡 Medium
- **Deliverable:** Figma
- **Spec:**
  - Box plot style chart (min/avg/max per month)
  - Trend arrows (▲ ▼ →)
  - Outlier alert cards (highlight วันที่ผิดปกติ)
- **Est:** 2 hr

### SP-5: Seasonal Chart Components
- **Role:** SE
- **Priority:** 🟡 Medium
- **File:** `frontend/components/SeasonalCharts.js` (new)
- **Components:**
  - `SeasonalPatternChart` (box plot style)
  - `OutlierAlertCard`
  - `PeakHourPrediction`
- **Est:** 3 hr
- **Dependency:** SP-4

### SP-6: Dashboard Integration
- **Role:** SE
- **Priority:** 🟡 Medium
- **File:** `frontend/app/dashboard/page.js`
- **Change:** เพิ่ม section "แพทเทิร์นตามภาคเรียน" ใต้ Heatmap
- **Est:** 2 hr
- **Dependency:** SP-5

### SP-7: QA Pattern Validation
- **Role:** QA
- **Priority:** 🟡 Medium
- **Test:**
  - ตรวจสอบว่าธันวาคม (exam) มีงานมากกว่าพฤษภาคม (break) จริง
  - ตรวจสอบ outlier detection (วันที่มีงาน > 50 ควรถูก flag)
- **Est:** 1.5 hr

### SP-8: Seasonal Guide Documentation
- **Role:** Doc
- **Priority:** 🟢 Low
- **File:** `docs/SEASONAL_GUIDE.md`
- **Content:** วิธีอ่านกราฟ, ใช้พยากรณ์ staffing, ตัวอย่าง case study
- **Est:** 1 hr

---

## Phase 3: Staff Efficiency Radar Chart

### SR-1: Metrics Specification
- **Role:** DA
- **Priority:** 🟡 Medium
- **File:** `docs/STAFF_METRICS_SPEC.md`
- **6 Metrics (0-100 scale):**
  1. **Volume** — จำนวน worklogs / 50 * 100
  2. **Versatility** — unique minorTask count / 10 * 100
  3. **Consistency** — 100 - (CV * 50), CV = std/mean of daily counts
  4. **Peak Handling** — % งานใน peak hours (08-09, 12-13, 17-18)
  5. **Documentation** — % งานที่มี comment > 20 chars
  6. **Combo Usage** — % งานจาก quick log template
- **Est:** 2 hr

### SR-2: Calculation Functions
- **Role:** DA
- **Priority:** 🟡 Medium
- **File:** `frontend/lib/staffMetrics.js` (new)
- **Functions:**
  - `calculateRadarMetrics(employeeId, worklogs)` → { volume, versatility, ... }
  - `normalizeMetric(value, max)` → 0-100
  - `getTeamAverage(allMetrics)` → benchmark
- **Est:** 2 hr
- **Dependency:** SR-1

### SR-3: Radar Chart UI Design
- **Role:** UX/UI
- **Priority:** 🟡 Medium
- **Deliverable:** Figma
- **Spec:**
  - 6 แกน เรียงวน clockwise
  - สี fill โปร่งใส (opacity 0.3)
  - เส้น team average แสดงเป็นเส้นประสีเทา
  - Tooltip แสดงค่าจริงเมื่อ hover
- **Est:** 2 hr

### SR-4: Radar Chart Component
- **Role:** SE
- **Priority:** 🟡 Medium
- **File:** `frontend/components/StaffRadarChart.js` (new)
- **Library:** Recharts RadarChart หรือ Chart.js
- **Props:**
  - `data: { employeeId, metrics: { volume, ... } }`
  - `benchmark: teamAverageMetrics`
  - `onCompare: (employeeId) => void`
- **Est:** 3 hr
- **Dependency:** SR-3

### SR-5: Staff Analytics Page
- **Role:** SE
- **Priority:** 🟡 Medium
- **File:** `frontend/app/admin/staff-analytics/page.js` (new)
- **Features:**
  - Radar chart รายบุคคล
  - Multi-select compare (สูงสุด 3 คน)
  - Ranking table ทั้ง 6 metrics
  - Time range selector (เดือน/ไตรมาส/ปี)
- **Est:** 4 hr
- **Dependency:** SR-4

### SR-6: Team Average Benchmark
- **Role:** SE
- **Priority:** 🟢 Low
- **File:** `frontend/components/StaffRadarChart.js`
- **Change:** แสดงเส้น team average เป็น reference บน radar
- **Est:** 2 hr

### SR-7: QA Metric Accuracy
- **Role:** QA
- **Priority:** 🟡 Medium
- **Test:**
  - คำนวณ consistency ด้วยมือแล้วเทียบกับระบบ
  - ตรวจสอบ normalization อยู่ใน range 0-100
  - Test edge case: พนักงานใหม่ (งานน้อย) ไม่ error
- **Est:** 2 hr

### SR-8: Staff Analytics Guide
- **Role:** Doc
- **Priority:** 🟢 Low
- **File:** `docs/STAFF_ANALYTICS_GUIDE.md`
- **Content:**
  - วิธีอ่าน radar chart
  - ตัวอย่าง interpretation (A = high volume low variety, B = balanced)
  - ใช้ยังไงใน 1-on-1 review
- **Est:** 1.5 hr

---

## Phase 4: System Metrics Collection (Foundation for v2.4.0)

### SM-1: Schema Design
- **Role:** SA
- **Priority:** 🟢 Low
- **Collection:** `systemMetrics`
- **Document per day:**
  ```javascript
  {
    date: "2026-06-04",
    dau: 5,                          // distinct employeeId
    totalWorklogs: 47,
    avgWorklogsPerUser: 9.4,
    peakHour: "08:00",               // hour with max worklogs
    equipmentUtilization: {
      headphones: 0.75,              // 15/20 in use
      powerPlugs: 0.40               // 2/5 in use
    },
    roomUsage: {
      "303": 8,                      // hours used
      "304": 2
    },
    createdAt: Timestamp
  }
  ```
- **Est:** 1 hr

### SM-2: Daily Snapshot Cloud Function
- **Role:** SA
- **Priority:** 🟢 Low
- **File:** `firebase/functions/src/systemMetrics.ts` (new)
- **Trigger:** Schedule 22:00 ทุกวัน (Firebase Scheduler)
- **Est:** 3 hr
- **Dependency:** SM-1

### SM-3: DAU Calculation
- **Role:** DA
- **Priority:** 🟢 Low
- **File:** `firebase/functions/src/systemMetrics.ts`
- **Query:** `worklogs` where date = today → distinct `employeeId`
- **Est:** 1 hr

### SM-4: Equipment Utilization Snapshot
- **Role:** DA
- **Priority:** 🟢 Low
- **File:** `firebase/functions/src/systemMetrics.ts`
- **Logic:** นับสถานะ `in_use` จาก `RoomEquipmentStatus` ณ เวลา 22:00
- **Est:** 1 hr

### SM-5: QA Function Testing
- **Role:** QA
- **Priority:** 🟢 Low
- **Test:**
  - Function รันตรงเวลา (Firebase Functions log)
  - ข้อมูลถูกต้อง (compare with manual count)
  - ไม่มี duplicate entries
- **Est:** 2 hr

---

## Dependencies Graph

```
Phase 0: CF-1 → CF-2 → CF-3 → CF-4
         ↓
Phase 1: EH-1 → EH-2 → EH-3 → EH-4 → EH-6 → EH-7 → EH-8 → EH-9
              ↓                    ↑
         EH-5 (backfill)            |
              ↓                     |
Phase 2: SP-1 → SP-2 → SP-3 → SP-4 → SP-5 → SP-6 → SP-7 → SP-8
              ↓                     ↑
              └──── SP-3 ───────────┘

Phase 3: SR-1 → SR-2 → SR-3 → SR-4 → SR-5 → SR-6 → SR-7 → SR-8
              ↓                     ↑
              └──── SR-2 ───────────┘

Phase 4: SM-1 → SM-2 → (SM-3 + SM-4) → SM-5
```

---

## Resource Estimate Summary

| Role | Phase 0 | Phase 1 | Phase 2 | Phase 3 | Phase 4 | **Total** |
|------|---------|---------|---------|---------|---------|-----------|
| SE   | 2.25 hr | 10 hr   | 5 hr    | 9 hr    | —       | **26.25 hr** |
| SA   | —       | 1.5 hr  | —       | —       | 5 hr    | **6.5 hr** |
| UX/UI| —       | 2 hr    | 2 hr    | 2 hr    | —       | **6 hr** |
| DA   | —       | 2 hr    | 4 hr    | 4 hr    | 2 hr    | **12 hr** |
| QA   | —       | 2 hr    | 1.5 hr  | 2 hr    | 2 hr    | **7.5 hr** |
| Doc  | —       | 1.5 hr  | 1 hr    | 1.5 hr  | —       | **4 hr** |
| **PM** | —     | —       | —       | —       | —       | **Coordination** |

**Total Project:** ~56 hours (~3-4 weeks สำหรับทีม 1 คน/role)

---

## Risk & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Firebase Spark quota (50K reads/day) | สูง | ใช้ `allWorklogsInRange` ที่มีอยู่, ไม่ query ซ้ำ |
| Backfill script ผิดพลาด | สูง | รันบน dev ก่อน, backup ก่อนรัน production |
| UX/UI ไม่ทัน | กลาง | SE ใช้ pattern จาก `SmartEquipmentModal.js` ที่มีอยู่ |
| Seasonal data ไม่ครบ 1 ปี | ต่ำ | ใช้ simulated data หรือรอข้อมูลสะสม |

---

## Acceptance Criteria v2.3.0

- [ ] CF-1 ถึง CF-4: Dashboard แสดงข้อมูลถูกต้อง ไม่มี bug จาก DA Audit
- [ ] EH-1 ถึง EH-9: สามารถบันทึกสภาพอุปกรณ์ตอนคืน และดู report ได้
- [ ] SP-1 ถึง SP-8: แสดง seasonal pattern และ outlier detection ได้
- [ ] SR-1 ถึง SR-8: แสดง radar chart ประเมินพนักงานได้
- [ ] SM-1 ถึง SM-5: systemMetrics บันทึกทุกวันโดยอัตโนมัติ (ถ้าทำ Phase 4)

---

**Prepared by DA:** @[DA]  
**For PM:** @[PM] — กรุณา review และ assign ให้แต่ละ role ตาม timeline  
**Next Step:** PM นำไปเขียนใน `TASKS.md` พร้อมกำหนดวันเริ่มงานแต่ละ phase
