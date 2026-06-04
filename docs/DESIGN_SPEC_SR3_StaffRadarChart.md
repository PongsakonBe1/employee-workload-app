# [UX/UI] Design Spec — SR-3: StaffRadarChart

**วันที่:** 2026-06-04
**จาก:** [UX/UI] Designer
**ถึง:** [SE] SR-4 + SR-5 + SR-6 Implementation
**Task:** SR-3 — ออกแบบ Radar Chart: 6 แกน, fill, benchmark line, tooltip, compare mode
**Dependency:** SR-1 ✅ (`STAFF_METRICS_SPEC.md`) + SR-2 ✅ (`staffMetrics.js`)

---

## 1. Overview

`StaffRadarChart` คือ Recharts-based component แสดงประสิทธิภาพพนักงาน 6 มิติในรูปแบบ Radar (Spider) Chart สไตล์ iOS/Apple — minimal, clean, ไม่ cluttered

**ใช้ใน:** `frontend/app/admin/staff-analytics/page.js` (SR-5)

---

## 2. Axes Layout (6 แกน clockwise จากบน)

```
                  Volume (ปริมาณงาน)
                       ▲
                      /|\
                     / | \
                    /  |  \
  Versatility ◆────────────◆ Consistency
  (หลากหลาย)         |         (สม่ำเสมอ)
                     |
  Combo Usage ◆──────┼──────◆ Peak Handling
  (ใช้ระบบ)          |         (รับงานหนัก)
                      \|/
                       ▼
                  Documentation
                  (ลงรายละเอียด)
```

### Axes Array (ลำดับสำคัญ — ต้องใช้ตามนี้ใน Recharts)

```javascript
const AXES = [
  { key: "volume",        labelTH: "ปริมาณงาน",    labelEN: "Volume"        },
  { key: "consistency",   labelTH: "สม่ำเสมอ",     labelEN: "Consistency"   },
  { key: "peakHandling",  labelTH: "รับงานหนัก",   labelEN: "Peak Handling" },
  { key: "documentation", labelTH: "ลงรายละเอียด", labelEN: "Documentation" },
  { key: "comboUsage",    labelTH: "ใช้ระบบ",      labelEN: "Combo Usage"   },
  { key: "versatility",   labelTH: "หลากหลาย",     labelEN: "Versatility"   },
];
```

> Recharts วน clockwise โดย default เริ่มจากบน (12 นาฬิกา) — ลำดับนี้ให้ Volume อยู่บน, กระจายสมดุล

---

## 3. Visual Design

### 3.1 Color System

**Single staff (default):**

| ธีม | Fill | Stroke | Opacity fill |
|---|---|---|---|
| Primary | `#6366f1` (indigo-500) | `#6366f1` | 0.15 |

**Multi-staff compare mode (max 3 คน):**

| Slot | Fill / Stroke | Tailwind ref |
|---|---|---|
| Staff 1 | `#6366f1` | indigo-500 |
| Staff 2 | `#f59e0b` | amber-500 |
| Staff 3 | `#10b981` | emerald-500 |

**Team benchmark (SR-6):**

| | Color | Style |
|---|---|---|
| Stroke | `#94a3b8` (slate-400) | dashed (`strokeDasharray="4 3"`) |
| Fill | none | — |

### 3.2 Grid (Polar Grid)

```javascript
<PolarGrid
  gridType="polygon"           // ✅ hexagonal — ดูเป็น iOS มากกว่า circle
  stroke="#e2e8f0"             // slate-200
  strokeWidth={1}
/>
```

> ไม่ใช้ `gridType="circle"` — polygon อ่านง่ายกว่า + ดูสะอาดกว่าสำหรับ 6 แกน

### 3.3 Tick Labels บน Axes

```javascript
<PolarAngleAxis
  dataKey="metric"
  tick={<CustomTick />}        // Custom renderer (ดู Section 5)
  tickLine={false}
/>
<PolarRadiusAxis
  domain={[0, 100]}
  tickCount={5}                // แสดง: 0, 25, 50, 75, 100
  tick={{ fontSize: 9, fill: "#94a3b8" }}
  axisLine={false}
/>
```

---

## 4. Data Shape

### Input data ที่ SE ต้องส่งเข้า component

```javascript
// รูปแบบที่ Recharts RadarChart ต้องการ
const chartData = [
  { metric: "volume",        value: 80,  benchmark: 65 },
  { metric: "consistency",   value: 72,  benchmark: 58 },
  { metric: "peakHandling",  value: 55,  benchmark: 60 },
  { metric: "documentation", value: 90,  benchmark: 70 },
  { metric: "comboUsage",    value: 40,  benchmark: 45 },
  { metric: "versatility",   value: 68,  benchmark: 62 },
];

// Props ที่ StaffRadarChart รับ
<StaffRadarChart
  data={chartData}            // จาก calculateRadarMetrics() → transform
  staffName="พงศกร"
  color="#6366f1"             // optional, default indigo
  showBenchmark={true}        // แสดง team average line (SR-6)
  size={320}                  // optional, default 320
/>
```

### Multi-compare props (SR-5 ใช้)

```javascript
<StaffRadarChart
  staffList={[
    { name: "พงศกร", data: chartData1, color: "#6366f1" },
    { name: "เพียงธาร", data: chartData2, color: "#f59e0b" },
  ]}
  showBenchmark={true}
/>
```

---

## 5. Component Code Spec

### 5.1 CustomTick (Axis Labels)

```jsx
const CustomTick = ({ x, y, payload, cx, cy }) => {
  const axis = AXES.find(a => a.key === payload.value);
  if (!axis) return null;

  // คำนวณ offset ออกจาก center เพื่อไม่ทับ chart
  const dx = x - cx;
  const dy = y - cy;
  const isTop    = dy < -20;
  const isBottom = dy > 20;
  const isLeft   = dx < -10;

  return (
    <text
      x={x}
      y={y}
      textAnchor={isLeft ? "end" : dx > 10 ? "start" : "middle"}
      dominantBaseline={isTop ? "auto" : isBottom ? "hanging" : "middle"}
      className="fill-slate-600 text-[11px] font-medium"
      style={{ fontSize: 11, fontFamily: "'IBM Plex Sans Thai', sans-serif" }}
    >
      {axis.labelTH}
    </text>
  );
};
```

### 5.2 CustomTooltip

```jsx
const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const metricKey = payload[0]?.payload?.metric;
  const axis = AXES.find(a => a.key === metricKey);

  return (
    <div className="bg-white/95 backdrop-blur-sm border border-slate-200
                    rounded-2xl shadow-lg px-4 py-3 min-w-[140px]">
      <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
        {axis?.labelTH}
      </p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color || entry.stroke }} />
            <span className="text-xs text-slate-600">
              {entry.name === "benchmark" ? "ค่าเฉลี่ยทีม" : (entry.name || "คะแนน")}
            </span>
          </div>
          <span className="text-sm font-bold text-slate-900">
            {Math.round(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
};
```

### 5.3 Full Component Shell

```jsx
"use client";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function StaffRadarChart({
  data,           // single mode: array [{metric, value, benchmark}]
  staffList,      // compare mode: [{name, data, color}]
  staffName,
  color = "#6366f1",
  showBenchmark = false,
  size = 320,
}) {
  const isCompare = Array.isArray(staffList) && staffList.length > 1;

  // Single mode: transform data
  const chartData = isCompare
    ? mergeCompareData(staffList)  // ดู Section 5.4
    : data;

  return (
    <div style={{ width: "100%", height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={chartData} cx="50%" cy="50%"
                    outerRadius="72%"      /* ให้ tick labels มีพื้นที่ */
                    margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>

          <PolarGrid gridType="polygon" stroke="#e2e8f0" strokeWidth={1} />

          <PolarAngleAxis
            dataKey="metric"
            tick={<CustomTick />}
            tickLine={false}
          />

          <PolarRadiusAxis
            domain={[0, 100]}
            tickCount={5}
            tick={{ fontSize: 9, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* Team benchmark (SR-6) */}
          {showBenchmark && (
            <Radar
              name="benchmark"
              dataKey="benchmark"
              stroke="#94a3b8"
              fill="none"
              strokeDasharray="4 3"
              strokeWidth={1.5}
              dot={false}
            />
          )}

          {/* Single staff */}
          {!isCompare && (
            <Radar
              name={staffName || "คะแนน"}
              dataKey="value"
              stroke={color}
              fill={color}
              fillOpacity={0.15}
              strokeWidth={2}
              dot={{ r: 3, fill: color, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: color }}
            />
          )}

          {/* Multi compare */}
          {isCompare && staffList.map((staff, i) => (
            <Radar
              key={staff.name}
              name={staff.name}
              dataKey={`value_${i}`}
              stroke={staff.color}
              fill={staff.color}
              fillOpacity={0.12}
              strokeWidth={2}
              dot={{ r: 3, fill: staff.color, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          ))}

          {isCompare && (
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            />
          )}

        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

### 5.4 mergeCompareData (helper)

```javascript
// Merge หลาย staff เข้า dataset เดียว สำหรับ compare mode
function mergeCompareData(staffList) {
  const base = staffList[0].data.map(item => ({ metric: item.metric }));
  staffList.forEach((staff, i) => {
    staff.data.forEach((item, j) => {
      base[j][`value_${i}`] = item.value;
    });
  });
  return base;
}
```

---

## 6. Score Badge Component

แสดงข้าง chart — สรุป top/bottom metric และ overall score

```jsx
function ScoreBadge({ data, staffName, color }) {
  const overall = Math.round(data.reduce((s, d) => s + d.value, 0) / data.length);
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const top    = AXES.find(a => a.key === sorted[0].metric);
  const bottom = AXES.find(a => a.key === sorted[sorted.length - 1].metric);

  return (
    <div className="apple-panel p-4 space-y-3">
      {/* Overall */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900">{staffName}</p>
        <div className="flex items-center gap-1.5">
          <span className="text-2xl font-bold" style={{ color }}>{overall}</span>
          <span className="text-xs text-slate-400">/100</span>
        </div>
      </div>

      <div className="h-px bg-slate-100" />

      {/* Top metric */}
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        <span className="text-xs text-slate-500">จุดแข็ง</span>
        <span className="text-xs font-semibold text-slate-900 ml-auto">
          {top?.labelTH} ({Math.round(sorted[0].value)})
        </span>
      </div>

      {/* Bottom metric */}
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        <span className="text-xs text-slate-500">พัฒนาได้</span>
        <span className="text-xs font-semibold text-slate-900 ml-auto">
          {bottom?.labelTH} ({Math.round(sorted[sorted.length - 1].value)})
        </span>
      </div>
    </div>
  );
}
```

---

## 7. Responsive Layout Spec

### Single Staff View (SR-4 default)

```
Mobile < 640px:
┌────────────────────────┐
│  [ScoreBadge]          │
│  Overall: 68 / 100     │
│  จุดแข็ง: ลงรายละเอียด  │
│  พัฒนาได้: ใช้ระบบ      │
├────────────────────────┤
│                        │
│    [RadarChart]        │
│    size: 280px         │
│                        │
└────────────────────────┘

Desktop >= 640px:
┌────────────────┬───────────┐
│  [RadarChart]  │[ScoreBadge]│
│  size: 320px   │           │
│                │ Staff A   │
│                │ 68/100    │
└────────────────┴───────────┘
```

```jsx
<div className="apple-panel p-4 md:p-6">
  <div className="flex flex-col sm:flex-row items-center gap-6">
    <StaffRadarChart data={...} size={300} />
    <ScoreBadge data={...} staffName="พงศกร" color="#6366f1" />
  </div>
</div>
```

### Compare Mode (SR-5, max 3 คน)

```
Desktop:
┌──────────────────────────────────────────────┐
│  Staff A  ● indigo   Staff B  ● amber   [+ เพิ่ม] │
├──────────────────────────────────────────────┤
│                                              │
│              [RadarChart compare]            │
│              size: 400px                     │
│                                              │
└──────────────────────────────────────────────┘

Mobile: stacked single charts (1 คน/row)
```

---

## 8. State Machine (SR-5 Page)

```
[Initial]
    │
    ▼
[เลือก Staff คนแรก] → selectedStaff = [staffA]
    │
    ▼
[แสดง Single RadarChart + ScoreBadge]
    │
    ├── [กด + เปรียบเทียบ] → selectedStaff = [staffA, staffB]
    │       │
    │       ▼
    │   [แสดง Compare RadarChart] ← สูงสุด 3 คน
    │       │
    │       └── [กด ✕ ลบ staff] → ถ้าเหลือ 1 → กลับ Single mode
    │
    └── [เปลี่ยน Time Range] → re-fetch worklogs → recalculate metrics
```

---

## 9. Empty & Loading States

```jsx
{/* Loading */}
<div className="flex items-center justify-center h-[320px]">
  <div className="w-6 h-6 rounded-full border-2 border-slate-200
                  border-t-indigo-500 animate-spin" />
</div>

{/* No data */}
<div className="flex flex-col items-center justify-center h-[320px] gap-2">
  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
    <BarChart2 size={20} className="text-slate-400" />
  </div>
  <p className="text-sm text-slate-500">ไม่มีข้อมูลในช่วงเวลานี้</p>
</div>

{/* New employee (< 3 worklogs) */}
<div className="rounded-2xl bg-blue-50 border border-blue-200 px-4 py-3
                text-sm text-blue-700 flex items-center gap-2">
  <Info size={16} />
  พนักงานใหม่ — ข้อมูลน้อยกว่า 3 รายการ ค่าอาจไม่แม่นยำ
</div>
```

---

## 10. Imports ที่ SE ต้องการ

```javascript
// Recharts
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

// Lucide icons (สำหรับ empty states)
import { BarChart2, Info } from "lucide-react";

// DA functions
import { calculateRadarMetrics, getTeamAverage } from "@/lib/staffMetrics";
```

---

## 11. Page Layout Sketch (SR-5)

```
/admin/staff-analytics
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Staff Analytics                        [ช่วงเวลา ▾]
 ────────────────────────────────────────────────
 [Search staff...]  [+ เปรียบเทียบ]

 ┌─────────────────────────┐  ┌──────────────┐
 │                         │  │ พงศกร        │
 │     Radar Chart         │  │ Overall: 68  │
 │    (indigo fill)        │  │ ─────────── │
 │                         │  │ จุดแข็ง: ... │
 └─────────────────────────┘  │ พัฒนาได้: ...│
                               └──────────────┘
 ── Rankings ──────────────────────────────────
 │ # │ ชื่อ       │ Vol │ Ver │ Con │ Pk │ Doc │ Cmb │ Avg │
 │ 1 │ พงศกร ●   │ 80  │ 68  │ 72  │ 55 │  90 │  40 │  68 │
 │ 2 │ เพียงธาร  │ 65  │ 80  │ 58  │ 70 │  75 │  55 │  67 │
 ─────────────────────────────────────────────
                               [Export CSV]
```

---

## 12. Accessibility

| Element | ARIA |
|---|---|
| RadarChart container | `role="img"` + `aria-label="Radar chart for {staffName}"` |
| Tooltip | ต้องมี `aria-live="polite"` wrapper |
| Staff selector buttons | `aria-pressed={isSelected}` |
| Compare remove buttons | `aria-label="ลบ {name} ออกจากการเปรียบเทียบ"` |
| Time range selector | `role="radiogroup"` |

---

## 13. Dependencies

```json
// package.json — frontend
"recharts": "^2.x"   // ตรวจสอบว่ามีอยู่แล้ว ถ้าไม่มีให้ SE เพิ่ม
```

> ถ้า Recharts ยังไม่ได้ install: `npm install recharts` ใน `frontend/`

---

## 14. Migration Checklist สำหรับ SE (SR-4, SR-5, SR-6)

### SR-4 — `StaffRadarChart.js`
- [ ] สร้าง `frontend/components/StaffRadarChart.js`
- [ ] Props: `data`, `staffList`, `staffName`, `color`, `showBenchmark`, `size`
- [ ] 6 axes ตาม AXES array ลำดับใน Section 2
- [ ] `gridType="polygon"`, `outerRadius="72%"`
- [ ] `CustomTick` + `CustomTooltip`
- [ ] Single mode + compare mode (dataKey `value_${i}`)
- [ ] `ScoreBadge` component (แยก export หรือ colocate ใน file เดียวกัน)
- [ ] Loading + empty state + new employee warning

### SR-5 — `staff-analytics/page.js`
- [ ] Admin guard (ต้อง isAdmin/isSuperAdmin)
- [ ] Staff search/select (Firestore users query)
- [ ] Time range selector: 1M / 3M / 6M / 1Y (default 1M)
- [ ] Multi-select compare สูงสุด 3 คน
- [ ] Rankings table (6 metric columns + avg column + export CSV)
- [ ] Link จาก admin dashboard page

### SR-6 — Benchmark line
- [ ] เพิ่ม `showBenchmark` prop และ `benchmark` dataKey ใน `chartData`
- [ ] คำนวณ team average จาก `getTeamAverage()` (SR-2)
- [ ] Dashed gray stroke, no fill

---

## 15. ความสัมพันธ์กับ component อื่น

```
staffMetrics.js (SR-2)
  └─ calculateRadarMetrics() → transform → chartData
  └─ getTeamAverage()        → benchmark dataKey

StaffRadarChart.js (SR-4)     ← spec นี้
  └─ ใช้ใน staff-analytics/page.js (SR-5)
  └─ benchmark เพิ่มใน SR-6

SeasonalCharts.js (SP-5)      ← reference pattern สำหรับ Recharts usage
EquipmentCharts.js (EH-7)     ← reference pattern สำหรับ Recharts usage
```

---

**[UX/UI] Sign-off:** SR-3 Complete — ส่ง SE ได้เลย (SR-4 → SR-5 → SR-6)

---

## DEV LOG

**2026-06-04 — [UX/UI]:**
- **Task:** SR-3 ออกแบบ StaffRadarChart
- **Files Created:** `docs/DESIGN_SPEC_SR3_StaffRadarChart.md`
- **Note to SE:** spec พร้อมแล้ว เริ่ม SR-4 ได้เลย — ดูเฉพาะ Section 5 (code spec) + Section 14 (checklist). Recharts ต้องมีใน package.json ตรวจสอบก่อน. `calculateRadarMetrics()` ใน `frontend/lib/staffMetrics.js` พร้อมใช้แล้ว (SR-2 ✅)
