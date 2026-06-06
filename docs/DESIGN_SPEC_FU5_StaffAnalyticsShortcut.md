# [UX/UI] Design Spec — FU-5: Staff Analytics Shortcut Card (Dashboard)

**วันที่:** 2026-06-04
**จาก:** [UX/UI] Designer
**ถึง:** [SE] FU-5 Implementation
**Task:** FU-5 — เพิ่ม shortcut card ใน `/dashboard` → `/admin/staff-analytics` พร้อม preview คะแนนเฉลี่ยทีม
**Dependency:** SR-4 ✅ (`StaffRadarChart.js`) + SR-2 ✅ (`staffMetrics.js`)

---

## 1. Context & Problem

`/admin/staff-analytics` อยู่คนละหน้ากับ dashboard — admin ค้นหาไม่เจอ

**PM Decision:** Option A — เพิ่ม shortcut card ใน `/dashboard` ให้เห็น preview คะแนนเฉลี่ยทีมได้เลย แล้วกด "ดูรายละเอียด" ไปหน้าเต็ม

---

## 2. Visual Mockup

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Staff Analytics                  [ดูรายละเอียด →]
 ──────────────────────────────────────────────
  6 Metrics — ค่าเฉลี่ยทีมเดือนนี้

  ┌─────────┐ ┌─────────┐ ┌─────────┐
  │ ปริมาณ  │ │ หลากหลาย│ │ สม่ำเสมอ│
  │  72      │ │  58      │ │  64      │  ← mini stat chips
  └─────────┘ └─────────┘ └─────────┘

  ┌─────────┐ ┌─────────┐ ┌─────────┐
  │รับงานหนัก│ │ละเอียด  │ │ ใช้ระบบ  │
  │  48      │ │  81      │ │  43      │
  └─────────┘ └─────────┘ └─────────┘
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**ไม่มี radar chart ใน shortcut card** — card นี้เป็น preview เท่านั้น ลดน้ำหนัก render ใน dashboard

---

## 3. Placement

เพิ่มเป็น `<section>` ใหม่ ต่อท้าย section สุดท้าย (หลัง Recent Records) — **เฉพาะ admin/superadmin เท่านั้น**

```
... (chart sections) ...

[แถว 4: Team Stats / Personal Stats + Recent Records]   ← มีอยู่แล้ว

[Staff Analytics Shortcut Card]   ← ใหม่ (FU-5)
```

---

## 4. Component Code Spec

### 4.1 JSX Shell

```jsx
{/* FU-5: Staff Analytics Shortcut — Admin only */}
{isAdminRole(user) && (
  <section className="mt-5">
    <div className="apple-panel p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
            <TrendingUp size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-950 leading-tight">
              Staff Analytics
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              ค่าเฉลี่ยทีม — {currentMonthLabel}
            </p>
          </div>
        </div>
        <a
          href="/admin/staff-analytics"
          className="flex items-center gap-1.5 text-sm font-medium text-indigo-600
                     hover:text-indigo-700 transition"
        >
          ดูรายละเอียด
          <ChevronRight size={16} />
        </a>
      </div>

      {/* 6 Metric chips */}
      {teamAvgMetrics ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {METRIC_DISPLAY.map(({ key, labelTH, color }) => (
            <div
              key={key}
              className="flex flex-col items-center gap-1 rounded-2xl bg-slate-50 px-2 py-3"
            >
              <span className="text-xs text-slate-500 text-center leading-tight">
                {labelTH}
              </span>
              <span className={`text-xl font-bold ${color}`}>
                {Math.round(teamAvgMetrics[key] ?? 0)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center h-16">
          <div className="w-5 h-5 rounded-full border-2 border-slate-200 border-t-indigo-500 animate-spin" />
        </div>
      )}

      {/* Footer hint */}
      <p className="text-xs text-slate-400 text-right mt-4">
        คำนวณจาก {staffWorklogs30DayCount} รายการใน 30 วันล่าสุด
      </p>
    </div>
  </section>
)}
```

### 4.2 METRIC_DISPLAY constant

```javascript
const METRIC_DISPLAY = [
  { key: "volume",        labelTH: "ปริมาณ",     color: "text-indigo-600" },
  { key: "versatility",   labelTH: "หลากหลาย",   color: "text-violet-600" },
  { key: "consistency",   labelTH: "สม่ำเสมอ",   color: "text-emerald-600" },
  { key: "peakHandling",  labelTH: "รับงานหนัก", color: "text-amber-600"  },
  { key: "documentation", labelTH: "ละเอียด",    color: "text-sky-600"    },
  { key: "comboUsage",    labelTH: "ใช้ระบบ",    color: "text-rose-500"   },
];
```

### 4.3 Data Calculation

```javascript
// คำนวณ teamAvgMetrics เมื่อ staffList + allWorklogs โหลดแล้ว
// ใช้ข้อมูลที่มีอยู่แล้วใน dashboard state — ไม่ query ใหม่

import { calculateRadarMetrics, getTeamAverage } from "../../lib/staffMetrics";

// ใน loadStats() หรือ useEffect ที่มีข้อมูลครบแล้ว:
const today = getToday();
const monthStart = today.slice(0, 8) + "01";   // YYYY-MM-01
const dateRange30d = { start: monthStart, end: today };

const allStaffMetrics = staffList.map(s =>
  calculateRadarMetrics(s.id, allWorklogs, dateRange30d)
);
const teamAvgMetrics = getTeamAverage(allStaffMetrics);
const staffWorklogs30DayCount = allWorklogs.filter(
  w => w.date >= monthStart && w.date <= today
).length;
```

> **ข้อสำคัญ:** SE ใช้ `allWorklogs` ที่ dashboard โหลดไว้แล้ว — **ห้าม query Firebase เพิ่มเติม** ใน card นี้ เพื่อหลีกเลี่ยง read cost

### 4.4 State ที่ต้องเพิ่มใน dashboard

```javascript
const [teamAvgMetrics, setTeamAvgMetrics]       = useState(null);
const [staffWorklogs30DayCount, setStaff30d]    = useState(0);
const currentMonthLabel = new Date().toLocaleDateString("th-TH", {
  month: "long", year: "numeric",
});
```

---

## 5. Imports ที่ SE ต้องเพิ่มใน `dashboard/page.js`

```javascript
import { TrendingUp, ChevronRight } from "lucide-react";
// TrendingUp มีใน /admin/page.js แล้ว — ต้องเพิ่มใน dashboard ด้วย
// ChevronRight ยังไม่มีใน dashboard — เพิ่ม import

import { calculateRadarMetrics, getTeamAverage } from "../../lib/staffMetrics";
```

---

## 6. Responsive

| Breakpoint | Metric Chips Layout |
|---|---|
| Mobile < 640px | `grid-cols-3` (2 แถว × 3 ชิป) |
| Desktop >= 640px | `sm:grid-cols-6` (แถวเดียว) |

---

## 7. Loading & Empty States

```jsx
{/* Loading */}
<div className="flex items-center justify-center h-16">
  <div className="w-5 h-5 rounded-full border-2 border-slate-200 border-t-indigo-500 animate-spin" />
</div>

{/* No staff / no worklogs */}
<p className="text-sm text-slate-400 text-center py-3">
  ไม่มีข้อมูลเดือนนี้
</p>
```

---

## 8. Accessibility

| Element | ARIA |
|---|---|
| "ดูรายละเอียด" link | `aria-label="ไปยัง Staff Analytics"` |
| Metric chips | `role="img"` + `aria-label="{labelTH}: {value}"` |
| Section heading | `<h2>` ชัดเจน |

---

## 9. Migration Checklist สำหรับ SE (FU-5)

- [ ] เพิ่ม `import { TrendingUp, ChevronRight } from "lucide-react"` ใน `dashboard/page.js`
- [ ] เพิ่ม `import { calculateRadarMetrics, getTeamAverage } from "../../lib/staffMetrics"`
- [ ] เพิ่ม state: `teamAvgMetrics`, `staffWorklogs30DayCount`, `currentMonthLabel`
- [ ] คำนวณ teamAvg ใน `useEffect` หลัง `staffList` + `allWorklogs` โหลดแล้ว (ใช้ 30 วันล่าสุด)
- [ ] เพิ่ม `<section>` Staff Analytics ต่อท้าย section สุดท้ายใน JSX
- [ ] Guard ด้วย `{isAdminRole(user) && (...)}` เสมอ
- [ ] ทดสอบ: ค่า metric แสดงครบ 6 ช่อง, link ไป `/admin/staff-analytics` ถูกต้อง

---

**[UX/UI] Sign-off:** FU-5 Complete — SE เริ่มได้เลย (ไม่ต้องรอ dependency อื่น)
