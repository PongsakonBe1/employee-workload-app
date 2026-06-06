# [UX/UI] Design Spec — ITEM-4: Seasonal Pattern Legend & InfoTooltip

**วันที่:** 2026-06-05
**จาก:** [UX/UI] Designer
**ถึง:** [SE] ITEM-4 Implementation
**Task:** ITEM-4 — ออกแบบ legend อธิบาย period สี + info tooltip สำหรับ `SeasonalPatternChart`
**อ้างอิง:** `docs/KMUTNB_ACADEMIC_CALENDAR.md` (DA), `frontend/components/SeasonalCharts.js` (SE)

---

## 1. ปัญหาปัจจุบัน

`LegendChips` เดิม (บรรทัด 115–129 ใน `SeasonalCharts.js`) แสดงแค่ label สั้น 3 ชิป:
- "ช่วงสอบ" / "ภาคเรียน" / "ปิดเทอม"

**ไม่เพียงพอ** เพราะ:
1. User ไม่รู้ว่า "ช่วงสอบ" = ช่วงไหนในปีจริง (ส.ค., ต.ค., ม.ค., มี.ค.)
2. ไม่มีคำอธิบาย reference line เฉลี่ย (---) และ outlier line (+2σ)
3. ไม่มี info icon ให้กด expand คำอธิบายเพิ่มเติม

---

## 2. Design Goal

> **ผู้ใช้สามารถอ่านกราฟได้โดยไม่ต้องถาม DA** — เห็น legend แล้วเข้าใจทันทีว่าแท่งสีแดงคือช่วงอะไร

### UX Principle
- **Progressive disclosure:** legend ย่อ (chips) → กด ⓘ → popover ขยาย
- **Non-blocking:** popover ปิดเองเมื่อ click outside — ไม่ interrupt workflow
- **Localized:** ใช้ชื่อเดือนภาษาไทยตาม `KMUTNB_ACADEMIC_CALENDAR.md`

---

## 3. Visual Mockup

### 3.1 Header Row (compact — แสดงตลอดเวลา)

```
┌──────────────────────────────────────────────────────────────────┐
│  แพทเทิร์นตามภาคเรียน    [●Exam]  [●Semester]  [●Break]  [ⓘ]  │
└──────────────────────────────────────────────────────────────────┘
```

- Chips เหมือนเดิม 3 ชิป (rose/indigo/slate)
- เพิ่ม **icon ⓘ** ขวาสุด — กดเปิด popover

### 3.2 Popover (กด ⓘ แล้วขยาย)

```
┌────────────────────────────────────────────────────┐
│  ⓘ  คู่มืออ่านกราฟ                           [✕]  │
├────────────────────────────────────────────────────┤
│                                                    │
│  สีแท่งกราฟ                                        │
│  ▌ (rose-700)  Exam (Midterm / Final)               │
│    ส.ค. / ต.ค. / ม.ค. / มี.ค. — งานเยอะสุด        │
│                                                    │
│  ▌ (indigo-700) Semester                           │
│    มิ.ย. / ก.ค. / ก.ย. / พ.ย. / ธ.ค. / ก.พ.       │
│                                                    │
│  ▌ (slate-600) Break / Summer                      │
│    ต.ค.–พ.ย. / เม.ย.–พ.ค. — งานน้อยที่สุด          │
│                                                    │
│  เส้น Reference                                     │
│  --- (slate)  ค่าเฉลี่ย                             │
│  --- (amber)  เกณฑ์ผิดปกติ (ค่าเฉลี่ย + 2×SD)      │
│                                                    │
│  💡 แท่งเกิน เส้นส้ม = วันงานผิดปกติ (Outlier)     │
│                                                    │
│  TGGS/นานาชาติ: สอบเร็วกว่า 1 เดือน (ก.ย./พ.ย.)  │
└────────────────────────────────────────────────────┘
```

### 3.3 Tooltip เมื่อ Hover บน Bar (ปรับจากเดิม)

```
┌─────────────────────────────┐
│  สิงหาคม 2569               │
│  งาน  120  รายการ           │
│  ⚠️  สอบกลางภาค ที่ 1       │ ← เพิ่ม period label ที่อ่านได้
│  ↑ สูงกว่าเฉลี่ย 2.4×       │ ← เพิ่ม multiplier เทียบ mean
└─────────────────────────────┘
```

---

## 4. Color System (ยืนยันตาม KMUTNB_ACADEMIC_CALENDAR.md)

| ประเภท | Hex | Tailwind | ใช้เมื่อ |
|---|---|---|---|
| **peak** → Exam | `#be123c` | `rose-700` | Midterm / Final |
| **active** → Semester | `#3730a3` | `indigo-700` | ช่วงเปิดภาค / กลางภาค |
| **low** → Break | `#475569` | `slate-600` | Break / Summer |
| **mean line** | `#94a3b8` | `slate-400` | เส้นค่าเฉลี่ย (ประเภท dashed) |
| **outlier line** | `#f59e0b` | `amber-400` | เส้น +2σ (ประเภท dashed) |

---

## 5. Component Code Spec

### 5.1 LegendChips (แทนที่ของเดิมทั้งหมด)

```jsx
import { Info, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";

const LEGEND_ITEMS = [
  { color: "#be123c", label: "Exam",      months: "ส.ค. / ต.ค. / ม.ค. / มี.ค." },
  { color: "#3730a3", label: "Semester",  months: "มิ.ย.–ก.ค. / พ.ย.–ก.พ." },
  { color: "#475569", label: "Break",     months: "ต.ค.–พ.ย. / เม.ย.–พ.ค." },
];

export function LegendChips() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative flex items-center gap-2 ml-auto flex-wrap" ref={ref}>
      {/* Chips */}
      {LEGEND_ITEMS.map(({ color, label }) => (
        <span key={label} className="flex items-center gap-1 text-[10px] text-slate-500">
          <span
            className="w-2.5 h-2.5 rounded-sm inline-block flex-shrink-0"
            style={{ background: color }}
          />
          {label}
        </span>
      ))}

      {/* Info button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="คำอธิบายกราฟ"
        aria-expanded={open}
        className={`w-5 h-5 rounded-full flex items-center justify-center transition
          ${open
            ? "bg-indigo-100 text-indigo-600"
            : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          }`}
      >
        <Info size={13} />
      </button>

      {/* Popover */}
      {open && (
        <div
          className="absolute right-0 top-7 z-50 w-72 rounded-2xl border border-slate-100
                     bg-white shadow-xl p-4 text-xs animate-in fade-in slide-in-from-top-2
                     duration-150"
          role="dialog"
          aria-label="คู่มืออ่านกราฟ"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-slate-950">คู่มืออ่านกราฟ</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="ปิด"
              className="text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          </div>

          {/* Bar colors section */}
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">
            สีแท่งกราฟ
          </p>
          <div className="space-y-2 mb-3">
            {LEGEND_ITEMS.map(({ color, label, months }) => (
              <div key={label} className="flex items-start gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-sm mt-0.5 flex-shrink-0"
                  style={{ background: color }}
                />
                <div>
                  <p className="font-medium text-slate-700">{label}</p>
                  <p className="text-slate-400">{months}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-100 my-2" />

          {/* Reference lines section */}
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">
            เส้น Reference
          </p>
          <div className="space-y-1.5 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 border-t-2 border-dashed border-slate-400 flex-shrink-0" />
              <p className="text-slate-600">ค่าเฉลี่ยงานต่อเดือน</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 border-t-2 border-dashed border-amber-400 flex-shrink-0" />
              <p className="text-slate-600">เกณฑ์ผิดปกติ (ค่าเฉลี่ย + 2×SD)</p>
            </div>
          </div>

          {/* Tip */}
          <div className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 mb-2">
            <p className="text-amber-700">
              💡 แท่งเกินเส้นส้ม = วันงานมากผิดปกติ (Outlier) — ควรเตรียม staffing เพิ่ม
            </p>
          </div>

          {/* TGGS note */}
          <p className="text-slate-400 text-[10px]">
            * TGGS/นานาชาติ: ช่วงสอบเร็วกว่า 1 เดือน (ก.ย. / พ.ย.)
          </p>
        </div>
      )}
    </div>
  );
}
```

### 5.2 CustomTooltip (แทนที่ของเดิม — เพิ่ม multiplier vs mean)

```jsx
// SE ต้องส่ง prop `mean` ผ่าน closure หรือ curried component
const makeCustomTooltip = (mean) =>
  function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    const multiplier = mean > 0 ? (d.count / mean).toFixed(1) : null;
    const isOutlier = mean > 0 && d.count > mean * 1.5;

    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-sm min-w-[160px]">
        <p className="font-semibold text-slate-800">{formatMonthLabel(label)}</p>
        <p className="text-slate-600 mt-1">
          งาน <span className="font-bold text-slate-950">{d.count}</span> รายการ
        </p>
        {d.periodLabel && d.periodLabel !== "unknown" && (
          <p className={`text-xs mt-0.5 font-medium
            ${d.periodType === "peak"   ? "text-rose-600"   : ""}
            ${d.periodType === "low"    ? "text-slate-400"  : ""}
            ${d.periodType === "active" ? "text-indigo-600" : ""}
          `}>
            {d.periodType === "peak" ? "⚠️ " : ""}
            {d.periodLabel}
          </p>
        )}
        {multiplier && parseFloat(multiplier) > 1.2 && (
          <p className={`text-xs mt-1 ${isOutlier ? "text-amber-600 font-medium" : "text-slate-400"}`}>
            {isOutlier ? "🔴" : "↑"} สูงกว่าเฉลี่ย {multiplier}×
          </p>
        )}
      </div>
    );
  };
```

### 5.3 ใช้ใน SeasonalPatternChart (จุดที่ SE ต้องแก้)

```jsx
// ส่ง mean เข้า Tooltip:
<Tooltip content={makeCustomTooltip(mean)} />

// เพิ่ม periodType ใน chartData map:
const chartData = data.map((d) => ({
  ...d,
  periodLabel: PERIOD_LABEL_MAP[d.period] || d.period,
  periodType:  PERIOD_TYPE_MAP[d.period]  || "active",   // ← เพิ่มบรรทัดนี้
}));
```

---

## 6. Empty State (ปรับปรุงจากเดิม)

เดิมมีอยู่แล้ว แต่ให้ปรับ copy ให้ชัดกว่าเดิม:

```jsx
{/* ถ้า data.length < 2 */}
<div className="apple-panel p-6">
  <div className="flex flex-col items-center justify-center h-48 text-center gap-3">
    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center">
      <BarChart2 size={24} className="text-slate-300" />
    </div>
    <div>
      <p className="text-sm font-medium text-slate-600">ยังไม่มีข้อมูลเพียงพอ</p>
      <p className="text-xs text-slate-400 mt-1">
        กราฟจะแม่นยำขึ้นเมื่อมีข้อมูลสะสม 2 เดือนขึ้นไป
      </p>
    </div>
  </div>
</div>
```

---

## 7. Responsive

| Breakpoint | Behavior |
|---|---|
| Mobile < 640px | Chips ซ่อน label — แสดงแค่ dot + ⓘ icon; Popover เต็มความกว้าง (`w-screen max-w-[288px]`) |
| Desktop >= 640px | Chips + label ครบ; Popover `w-72` anchor ขวา |

```jsx
{/* Mobile: ซ่อน label ใน chip */}
<span key={label} className="flex items-center gap-1 text-[10px] text-slate-500">
  <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: color }} />
  <span className="hidden sm:inline">{label}</span>
</span>
```

---

## 8. Accessibility

| Element | ARIA |
|---|---|
| ⓘ button | `aria-label="คำอธิบายกราฟ"` + `aria-expanded={open}` |
| Popover div | `role="dialog"` + `aria-label="คู่มืออ่านกราฟ"` |
| ✕ button | `aria-label="ปิด"` |
| Color swatches | `aria-hidden="true"` (decorative) |

**Focus management:** เมื่อ open → focus ย้ายไปที่ close button; กด Escape → ปิด popover

```jsx
// SE เพิ่ม Escape handler ใน useEffect:
const handler = (e) => {
  if (e.key === "Escape") setOpen(false);
  if (!ref.current?.contains(e.target)) setOpen(false);
};
```

---

## 9. Animation

ใช้ Tailwind `animate-in` class (เหมือน `EquipmentReturnModal`):

```jsx
className="... animate-in fade-in slide-in-from-top-2 duration-150"
```

> ถ้า `animate-in` ไม่ available ใน Tailwind version ปัจจุบัน ให้ SE ใช้:
> ```jsx
> className="... transition-all origin-top-right"
> ```
> + conditional `opacity-0 scale-95` / `opacity-100 scale-100`

---

## 10. Imports ที่ SE ต้องเพิ่ม

```javascript
import { Info, X, BarChart2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
```

> `useState`, `useRef`, `useEffect` น่าจะมีอยู่แล้วใน `SeasonalCharts.js` เดิม (ตรวจสอบก่อน)

---

## 11. Migration Checklist สำหรับ SE (ITEM-4)

- [ ] แทนที่ `LegendChips()` เดิม (บรรทัด 115–129) ด้วย version ใหม่จาก Section 5.1
- [ ] เพิ่ม `import { Info, X, BarChart2 } from "lucide-react"` บนสุดไฟล์
- [ ] เพิ่ม `import { useState, useRef, useEffect } from "react"` (ถ้าไม่มี)
- [ ] แทนที่ `CustomTooltip` เดิม (บรรทัด 11–23) ด้วย `makeCustomTooltip(mean)` จาก Section 5.2
- [ ] เพิ่ม `periodType` ใน `chartData` map ใน `SeasonalPatternChart` (Section 5.3)
- [ ] ส่ง `<Tooltip content={makeCustomTooltip(mean)} />` แทน `<Tooltip content={<CustomTooltip />} />`
- [ ] แทนที่ empty state เดิม (บรรทัด 49–57) ด้วย version ใหม่จาก Section 6
- [ ] ทดสอบ mobile: ซ่อน chip label บน < 640px
- [ ] ทดสอบ popover: click outside ปิด, Escape ปิด, focus ที่ ✕ เมื่อเปิด

---

## 12. Academic Calendar Timeline Strip (Option A — เพิ่มเติม)

> **แรงจูงใจ:** User เห็นกราฟ bar รายเดือน แต่ไม่รู้ว่าแต่ละเดือนอยู่ "ช่วงไหน" ของปีการศึกษา — Timeline Strip แก้ปัญหานี้โดยไม่ต้องเพิ่มหน้าใหม่

### 12.1 Visual Mockup

```
มิ.ย.  ก.ค.  ส.ค.   ก.ย.   ต.ค.   พ.ย.  ธ.ค.  ม.ค.   ก.พ.   มี.ค.
┌─────┬─────┬──────┬──────┬──────┬─────┬─────┬──────┬──────┬──────┐
│▓▓▓▓▓│▓▓▓▓▓│██████│▓▓▓▓▓▓│██████│░░░░░│▓▓▓▓▓│██████│▓▓▓▓▓▓│██████│
└─────┴─────┴──────┴──────┴──────┴─────┴─────┴──────┴──────┴──────┘
 Sem 1  Sem 1  Midterm  Sem 1   Final   Break  Sem 2  Midterm  Sem 2  Final

Legend ด้านล่าง strip (มีอยู่แล้ว — LegendChips ทำหน้าที่นี้):
███ Exam   ▓▓▓ Semester   ░░░ Break
```

- Strip วางอยู่ **ใต้ X-Axis ของ BarChart** ทันที — ก่อน reference line labels
- แต่ละ segment มีความกว้าง `flex-basis` proportional กับจำนวนเดือนของช่วงนั้น
- Hover บน segment → แสดง tooltip ชื่อช่วง + วันเริ่ม-สิ้นสุด

### 12.2 Component Code Spec

```jsx
// ACADEMIC_STRIP_DATA — derive จาก KMUTNB_ACADEMIC_CALENDAR.md (ปริญญาตรี default)
// SE สามารถ import จาก analytics.js หรือ hardcode ก็ได้ เพราะเป็น static data
const ACADEMIC_STRIP_2569 = [
  { key: "sem1_open",   label: "Semester 1",  type: "active", months: ["2026-06", "2026-07"] },
  { key: "sem1_mid",    label: "Midterm",     type: "peak",   months: ["2026-08"] },
  { key: "sem1_post",   label: "Semester 1",  type: "active", months: ["2026-09"] },
  { key: "sem1_final",  label: "Final",       type: "peak",   months: ["2026-10"] },
  { key: "break1",      label: "Break",       type: "low",    months: ["2026-11"] },
  { key: "sem2_open",   label: "Semester 2",  type: "active", months: ["2026-11", "2026-12"] },
  { key: "sem2_mid",    label: "Midterm",     type: "peak",   months: ["2027-01"] },
  { key: "sem2_post",   label: "Semester 2",  type: "active", months: ["2027-02"] },
  { key: "sem2_final",  label: "Final",       type: "peak",   months: ["2027-03"] },
];

// กรอง strip เฉพาะ months ที่มีอยู่ใน data prop (ไม่แสดงช่วงที่ไม่มีข้อมูล)
function AcademicCalendarStrip({ dataMonths = [] }) {
  const monthSet = new Set(dataMonths);

  // สร้าง strip segments — รวม consecutive months ของ type เดียวกัน
  const segments = ACADEMIC_STRIP_2569.filter(seg =>
    seg.months.some(m => monthSet.has(m))
  );

  if (!segments.length) return null;

  return (
    <div className="mt-2 px-0" aria-label="ปฏิทินภาคเรียน มจพ 2569">
      <div className="flex w-full rounded-lg overflow-hidden h-6 text-[9px]">
        {segments.map((seg) => {
          const spanCount = seg.months.filter(m => monthSet.has(m)).length;
          const bgColor =
            seg.type === "peak"   ? "#be123c" :
            seg.type === "active" ? "#3730a3" :
                                    "#475569";
          return (
            <div
              key={seg.key}
              title={seg.label}                    // native tooltip บน desktop
              aria-label={seg.label}
              style={{
                flex: spanCount,
                background: bgColor,
                opacity: seg.type === "low" ? 0.5 : 0.75,
              }}
              className="flex items-center justify-center text-white font-medium
                         truncate px-1 cursor-default select-none
                         transition-opacity hover:opacity-100"
            >
              {/* แสดง label ถ้าพื้นที่พอ (≥ 1 เดือน ≈ flex ≥ 1) */}
              {spanCount >= 1 && (
                <span className="truncate">{seg.label}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### 12.3 วิธีเพิ่มใน SeasonalPatternChart

```jsx
export function SeasonalPatternChart({ data = [], mean = 0, sd = 0 }) {
  // ...

  // ดึง months จาก data
  const dataMonths = chartData.map(d => d.month); // ["2026-06", "2026-07", ...]

  return (
    <div className="apple-panel p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-base font-semibold text-slate-950">แพทเทิร์นตามภาคเรียน</h3>
        <LegendChips />
      </div>

      {/* Bar Chart */}
      <ResponsiveContainer width="100%" height={220}>
        <BarChart ...>
          {/* ...เหมือนเดิม... */}
        </BarChart>
      </ResponsiveContainer>

      {/* ← เพิ่ม Timeline Strip ใต้ chart */}
      <AcademicCalendarStrip dataMonths={dataMonths} />
    </div>
  );
}
```

### 12.4 Interaction Details

| Interaction | Behavior |
|---|---|
| Hover segment (desktop) | native `title` tooltip แสดงชื่อช่วงเต็ม |
| Mobile tap | ไม่มี action — strip เป็น decorative เท่านั้น |
| Segment สั้นเกิน (< 1 เดือน) | `overflow: hidden` ซ่อน label อัตโนมัติ |
| Segment ถูก hover | `opacity: 1` (จาก 0.75/0.5) — กระตุ้นให้รู้ว่า interactive |

### 12.5 Responsive

| Breakpoint | Strip |
|---|---|
| Mobile < 640px | แสดง แต่ไม่มี text label ในแต่ละ segment (เล็กเกินไป) — เพิ่ม `hidden sm:flex` บน span text |
| Desktop >= 640px | แสดง label ในแต่ละ segment ตาม space ที่มี |

### 12.6 เพิ่มใน Migration Checklist (Section 11)

- [ ] เพิ่ม `ACADEMIC_STRIP_2569` constant และ `AcademicCalendarStrip` component ใน `SeasonalCharts.js`
- [ ] เรียก `<AcademicCalendarStrip dataMonths={dataMonths} />` ใต้ `</ResponsiveContainer>` ใน `SeasonalPatternChart`
- [ ] ทดสอบ: strip แสดงถูก segment, hover เห็น title, mobile ไม่ overflow

---

**[UX/UI] Sign-off:** ITEM-4 Complete (รวม Timeline Strip) — SE เริ่มได้เลย ไม่มี dependency อื่น
