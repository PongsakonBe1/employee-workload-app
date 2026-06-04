# [SE] → Handover: Phase 3 SR-4 + SR-5 + SR-6 Complete

**วันที่:** 2026-06-04  
**Branch:** `feature/dashboard-analytics-v230`  
**จาก:** [SE] Software Engineer  
**ถึง:** [QA] SR-7, [Doc] SR-8

---

## ✅ สิ่งที่ทำเสร็จ

| Task | ไฟล์ | สถานะ |
|------|------|--------|
| SR-4 | `frontend/components/StaffRadarChart.js` | ✅ ใหม่ |
| SR-5 | `frontend/app/admin/staff-analytics/page.js` | ✅ ใหม่ |
| SR-6 | Benchmark integrated ใน SR-5 ผ่าน `getTeamAverage()` | ✅ |
| Admin link | `frontend/app/admin/page.js` | ✅ เพิ่ม menu |

---

## 📦 Files Created

### `frontend/components/StaffRadarChart.js`

**Default export:** `StaffRadarChart` — Recharts RadarChart

**Named exports:**
- `metricsToChartData(metricsObj, benchmarkObj?)` — แปลง `{ volume, ... }` → Recharts array
- `ScoreBadge({ data, staffName, color })` — Overall score + จุดแข็ง/พัฒนาได้
- `AXES` — array 6 axes definition
- `SLOT_COLORS` — `["#6366f1", "#f59e0b", "#10b981"]`

**Props:**

| Prop | Type | Default | หมายเหตุ |
|------|------|---------|----------|
| `data` | Array | — | single mode: `[{metric, value, benchmark?}]` |
| `staffList` | Array | — | compare mode: `[{name, chartData, color}]` |
| `staffName` | string | `""` | ชื่อแสดงใน single mode |
| `color` | string | `#6366f1` | stroke/fill |
| `showBenchmark` | boolean | `false` | แสดง dashed benchmark line |
| `benchmarkData` | Object | `null` | raw metrics obj จาก `getTeamAverage()` |
| `size` | number | `320` | chart height px |
| `loading` | boolean | `false` | แสดง spinner |
| `newEmployee` | boolean | `false` | แสดง warning badge |

**Single mode:**
```jsx
<StaffRadarChart
  data={metricsToChartData(metrics, benchmarkData)}
  staffName="พงศกร"
  showBenchmark
  benchmarkData={benchmarkData}
/>
```

**Compare mode (max 3):**
```jsx
<StaffRadarChart
  staffList={[
    { name: "พงศกร",   chartData: metricsToChartData(m1), color: "#6366f1" },
    { name: "เพียงธาร", chartData: metricsToChartData(m2), color: "#f59e0b" },
  ]}
  showBenchmark
  benchmarkData={benchmarkData}
  size={380}
/>
```

---

### `frontend/app/admin/staff-analytics/page.js`

**Features:**
- Admin guard (redirect non-admin)
- Time Range selector: 1M / 3M / 6M / 1Y
- Load all users + worklogs in range
- SR-6 benchmark: `getTeamAverage(allMetrics)` → dashed line
- Chart area: single/compare toggle (chip-based, max 3)
- `ScoreBadge` side panel (single mode)
- Rankings table: sortable ต่อ metric + avg, search, CSV export
- Row click → select/deselect staff for chart

**Route:** `/admin/staff-analytics`

---

## 🔄 งานต่อไป

### [QA] SR-7 — Functional Test (6 cases)

| Test | รายละเอียด |
|------|-----------|
| TEST-1 | Single mode: เลือก 1 คน → Radar Chart + ScoreBadge แสดง |
| TEST-2 | Compare mode: เลือก 3 คน → Compare RadarChart + Legend แสดง |
| TEST-3 | SR-6 Benchmark: `showBenchmark=true` → เส้น dashed slate ปรากฏ |
| TEST-4 | CSV Export: คลิก Export → ดาวน์โหลด `.csv` มี 8 columns |
| TEST-5 | Empty state: ไม่มี worklogs → ไม่ crash, ตารางแสดง "ไม่มีข้อมูล" |
| TEST-6 | New employee warning: worklogs < 3 → info badge ปรากฏ |

บันทึกใน `QA_REPORT.md` Section 12

### [Doc] SR-8 — Documentation (หลัง SR-7 pass)

สร้าง `docs/STAFF_ANALYTICS_GUIDE.md`:
- วิธีอ่าน Radar Chart 6 มิติ
- วิธีใช้ Compare mode วางแผน staffing
- ตาราง metric definition (ดู `STAFF_METRICS_SPEC.md`)
- Case study: พนักงานที่ Volume สูงแต่ Consistency ต่ำ

---

## ⚠️ Notes สำคัญ

- **Recharts** ใช้ version เดิมที่มีใน `package.json` — ไม่ต้อง install เพิ่ม
- **SR-6** ถูก integrate ใน SR-5 แล้ว — `getTeamAverage()` คำนวณจาก all staff metrics ในช่วง dateRange เดียวกัน
- **Benchmark line** แสดงเฉพาะเมื่อ `showBenchmark={true}` AND `benchmarkData` ไม่ null
- **Compare mode** detect อัตโนมัติจาก `staffList.length > 1` — ไม่ต้องส่ง prop พิเศษ

---

*SE Handover Phase 3 SR-4/SR-5/SR-6 · Cascade SE Agent · 2026-06-04*
