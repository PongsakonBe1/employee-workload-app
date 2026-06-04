# [UX/UI] Design Spec — EH-3: EquipmentReturnModal

**วันที่:** 2026-06-04
**จาก:** [UX/UI] Designer
**ถึง:** [SE] EH-4 Implementation
**Task:** EH-3 — ออกแบบ `EquipmentReturnModal`
**Dependency:** SE รอ spec นี้ก่อนเริ่ม EH-4

---

## 1. Context & Trigger

Modal นี้ popup เมื่อ Staff กด Template ประเภท **"คืนอุปกรณ์"** ได้แก่:

- คืนหูฟัง
- คืนปลั๊กไฟ
- ปิดห้อง (ตาม minorTask ที่ SE map ไว้)

**ความต่างจาก `SmartEquipmentModal`:**

| | SmartEquipmentModal | EquipmentReturnModal |
|---|---|---|
| Flow | เลือกอุปกรณ์ → กรอก recipient | เลือกสภาพ → (optional) กรอกโน้ต |
| Primary action | ยืม / คืน | สมบูรณ์ / ชำรุด / สูญหาย |
| Clicks (ปกติ) | 3–4 ครั้ง | **2 ครั้ง** (เลือก + ยืนยัน) |
| Input required | recipient * | ไม่มี (ถ้าสมบูรณ์) |

---

## 2. UX Flow Diagram

```
[Staff กด Template "คืนหูฟัง ICIT05"]
              │
              ▼
    ┌─────────────────────────┐
    │  EquipmentReturnModal   │
    │  "คืนหูฟัง ICIT05"      │
    │  ──────────────────     │
    │  สภาพอุปกรณ์?           │
    │                         │
    │  ┌────────┐ ┌────────┐  │
    │  │✓ สมบูรณ์│ │ ชำรุด  │  │  ← 2 primary choices
    │  └────────┘ └────────┘  │
    │                         │
    │  [ สูญหาย ]             │  ← ghost/tertiary
    └─────────────────────────┘
              │
   ┌──────────┴──────────┐
   ▼                     ▼
[สมบูรณ์]           [ชำรุด / สูญหาย]
   │                     │
   ▼                     ▼
[ยืนยัน]    ┌────────────────────────┐
 2 clicks   │ + textarea "โน้ต *"    │
 ✅ Done     │ placeholder: ระบุ      │
            │ อาการเสีย/จุดที่หาย    │
            └────────────────────────┘
                         │
                         ▼
                   [ยืนยัน] — 3 clicks
```

**หลักการ:** Default path (สมบูรณ์) = **2 clicks** ไม่มี input ใดๆ

---

## 3. Visual Mockup

### Mobile / Bottom Sheet

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           ▬▬▬   ← drag handle (iOS style)

  🎧 คืนหูฟัง ICIT05          ✕
  ────────────────────────────
  สภาพอุปกรณ์

  ┌──────────────────────────┐
  │  ✓  สมบูรณ์               │  ← ขอบเขียว, bg-green-50
  │     ไม่มีความเสียหาย      │
  └──────────────────────────┘

  ┌──────────────────────────┐
  │  ⚠  ชำรุด                 │  ← ขอบแอมเบอร์, bg-amber-50
  │     มีความเสียหาย/ซ่อมได้ │
  └──────────────────────────┘

  ┌──────────────────────────┐
  │  ✕  สูญหาย               │  ← ขอบแดง, bg-red-50
  │     ไม่พบอุปกรณ์          │
  └──────────────────────────┘

  ────────────────────────────
  [   ยืนยัน — สมบูรณ์    ]   ← apple-button (slate-950 fill)
  [       ยกเลิก          ]   ← apple-button-secondary

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### เมื่อเลือก ชำรุด / สูญหาย → แสดง textarea

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           ▬▬▬

  ⚠ คืนหูฟัง ICIT05 — ชำรุด   ✕
  ────────────────────────────
  สภาพอุปกรณ์
  [✓ สมบูรณ์] [● ชำรุด] [✕ สูญหาย]  ← Segmented compact
  ────────────────────────────
  LABEL: โน้ต / อาการเสีย *

  ┌──────────────────────────┐
  │ เช่น สายขาด, ไม่มีเสียง   │
  │ ข้างซ้าย...               │
  │                          │
  └──────────────────────────┘

  ────────────────────────────
  [   ยืนยัน — บันทึกชำรุด  ]
  [         ยกเลิก          ]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 4. Color Language (สอดคล้องกับ SmartEquipmentModal)

| สถานะ | Border | Background | Icon | Text |
|---|---|---|---|---|
| สมบูรณ์ (selected) | `border-green-500` | `bg-green-50` | `CheckCircle` green-600 | `text-green-800` |
| สมบูรณ์ (default idle) | `border-green-200` | `bg-green-50/60` | same | `text-green-700` |
| ชำรุด (selected) | `border-amber-500` | `bg-amber-50` | `AlertTriangle` amber-600 | `text-amber-800` |
| ชำรุด (idle) | `border-amber-200` | `bg-amber-50/60` | same | `text-amber-700` |
| สูญหาย (selected) | `border-red-500` | `bg-red-50` | `XCircle` red-600 | `text-red-800` |
| สูญหาย (idle) | `border-red-200` | `bg-red-50/60` | same | `text-red-700` |

**ทำไมถึงเลือก Green/Amber/Red:**
`SmartEquipmentModal` ใช้ `green-500` (ว่าง), `orange-400` (ใช้งาน), `purple-500` (selected) — `EquipmentReturnModal` ต่อยอด semantic color ชุดเดิม แต่เปลี่ยน orange → amber เพราะ "ชำรุด" คือ warning ไม่ใช่ in-use

---

## 5. Component Code Spec (สำหรับ SE)

### Props Interface

```javascript
/**
 * @param {boolean}  isOpen
 * @param {function} onClose
 * @param {function} onConfirm(condition, note)
 *   condition: "normal" | "damaged" | "lost"
 *   note: string (required เมื่อ damaged/lost)
 * @param {string}   equipmentId   — เช่น "ICIT05"
 * @param {string}   equipmentType — "headphones" | "power" | "room"
 * @param {string}   templateName  — ชื่อแสดงใน header
 */
```

### State

```javascript
const [condition, setCondition] = useState("normal"); // "normal"|"damaged"|"lost"
const [note, setNote]           = useState("");
const [mounted, setMounted]     = useState(false);

const requiresNote = condition === "damaged" || condition === "lost";
const canConfirm   = !requiresNote || note.trim().length > 0;
```

### Modal Shell (อิง SmartEquipmentModal)

```jsx
// Portal + backdrop — เหมือน SmartEquipmentModal เลย
return createPortal(
  <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={handleClose} />
    <div className="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl
                    w-full sm:max-w-sm max-h-[92vh] flex flex-col overflow-hidden">
      {/* Drag handle — mobile only */}
      <div className="flex justify-center pt-3 pb-1 sm:hidden">
        <div className="w-10 h-1 bg-slate-200 rounded-full" />
      </div>
      {/* Header */}
      {/* Body */}
      {/* Footer */}
    </div>
  </div>,
  document.body
);
```

### Header

```jsx
<div className="flex items-center justify-between px-6 pt-5 pb-4">
  <div className="flex items-center gap-3">
    {/* Icon ตาม equipmentType */}
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center
      ${condition === "normal"  ? "bg-green-100 text-green-600"
      : condition === "damaged" ? "bg-amber-100 text-amber-600"
      : "bg-red-100 text-red-600"}`}
    >
      {equipmentType === "headphones" ? <Headphones size={18} />
       : equipmentType === "power"    ? <Plug size={18} />
       : <DoorOpen size={18} />}  {/* import DoorOpen จาก lucide */}
    </div>
    <div>
      <h3 className="text-base font-semibold text-slate-950 leading-tight">
        {templateName}
      </h3>
      <p className="text-xs text-slate-400 mt-0.5">
        {equipmentId} · บันทึกสภาพก่อนคืน
      </p>
    </div>
  </div>
  <button onClick={handleClose}
    className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition">
    <X size={18} />
  </button>
</div>
```

### Condition Selector Cards (3 cards)

```jsx
<div className="px-6 pb-4 space-y-2.5">
  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 mb-3">
    สภาพอุปกรณ์
  </p>

  {[
    {
      value:    "normal",
      icon:     CheckCircle,
      label:    "สมบูรณ์",
      sublabel: "ไม่มีความเสียหาย",
      border:   { idle: "border-green-200", active: "border-green-500 ring-2 ring-green-100" },
      bg:       { idle: "bg-green-50/60",   active: "bg-green-50" },
      iconCls:  { idle: "text-green-400",   active: "text-green-600" },
      textCls:  { idle: "text-green-700",   active: "text-green-800" },
    },
    {
      value:    "damaged",
      icon:     AlertTriangle,
      label:    "ชำรุด",
      sublabel: "มีความเสียหาย ซ่อมได้",
      border:   { idle: "border-amber-200", active: "border-amber-500 ring-2 ring-amber-100" },
      bg:       { idle: "bg-amber-50/60",   active: "bg-amber-50" },
      iconCls:  { idle: "text-amber-400",   active: "text-amber-600" },
      textCls:  { idle: "text-amber-700",   active: "text-amber-800" },
    },
    {
      value:    "lost",
      icon:     XCircle,
      label:    "สูญหาย",
      sublabel: "ไม่พบอุปกรณ์",
      border:   { idle: "border-red-200",  active: "border-red-500 ring-2 ring-red-100" },
      bg:       { idle: "bg-red-50/60",    active: "bg-red-50" },
      iconCls:  { idle: "text-red-400",    active: "text-red-600" },
      textCls:  { idle: "text-red-700",    active: "text-red-800" },
    },
  ].map(({ value, icon: Icon, label, sublabel, border, bg, iconCls, textCls }) => {
    const isActive = condition === value;
    return (
      <button
        key={value}
        type="button"
        onClick={() => { setCondition(value); setNote(""); }}
        className={`
          w-full flex items-center gap-4 px-4 py-3.5
          rounded-2xl border-2 transition-all duration-150 active:scale-[0.98] text-left
          ${isActive ? `${border.active} ${bg.active}` : `${border.idle} ${bg.idle} hover:border-opacity-60`}
        `}
        aria-pressed={isActive}
      >
        <Icon size={20} className={isActive ? iconCls.active : iconCls.idle} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${isActive ? textCls.active : textCls.idle}`}>
            {label}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">{sublabel}</p>
        </div>
        {/* Checkmark indicator */}
        {isActive && (
          <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0
            ${value === "normal"  ? "bg-green-500"
            : value === "damaged" ? "bg-amber-500"
            : "bg-red-500"}`}>
            <Check size={12} className="text-white" />
          </div>
        )}
      </button>
    );
  })}
</div>
```

### Note Input (แสดงเฉพาะ damaged/lost)

```jsx
{requiresNote && (
  <div className="px-6 pb-4">
    <label htmlFor="eq-note" className="apple-label">
      {condition === "damaged" ? "อาการเสีย / จุดที่ชำรุด *" : "หมายเหตุ / สถานการณ์ *"}
    </label>
    <textarea
      id="eq-note"
      className="apple-input resize-none"
      rows={3}
      maxLength={200}
      placeholder={
        condition === "damaged"
          ? "เช่น สายขาด, ไม่มีเสียงข้างซ้าย, ตัวล็อคหัก"
          : "เช่น ลืมไว้ห้อง 1211, ค้นหาแล้วไม่พบ"
      }
      value={note}
      onChange={(e) => setNote(e.target.value)}
      autoFocus
      aria-required="true"
    />
    <p className="text-right text-xs text-slate-400 mt-1">{note.length}/200</p>
  </div>
)}
```

### Footer (Sticky)

```jsx
<div className="flex-shrink-0 border-t border-slate-100 bg-white px-6 py-4 space-y-2">
  <button
    onClick={handleConfirm}
    disabled={!canConfirm}
    className={`apple-button w-full flex items-center justify-center gap-2 disabled:opacity-40
      ${condition === "damaged" ? "bg-amber-600 hover:bg-amber-700 shadow-amber-900/20"
      : condition === "lost"    ? "bg-red-600 hover:bg-red-700 shadow-red-900/20"
      : ""}   /* normal ใช้ apple-button default (slate-950) */
    `}
  >
    {condition === "normal"  && <><CheckCircle size={16} /> ยืนยัน — สมบูรณ์</>}
    {condition === "damaged" && <><AlertTriangle size={16} /> บันทึกชำรุด</>}
    {condition === "lost"    && <><XCircle size={16} /> บันทึกสูญหาย</>}
  </button>
  <button onClick={handleClose} className="apple-button-secondary w-full">
    ยกเลิก
  </button>
</div>
```

---

## 6. Callback Data ที่ส่งกลับ `onConfirm`

```javascript
// SE ใช้ข้อมูลนี้เขียนลง Firestore field ตาม SA Schema
onConfirm(condition, note)

// ตัวอย่างที่ QuickLogButtons จะได้รับ:
onConfirm("normal",  "")                        // สมบูรณ์
onConfirm("damaged", "สายขาด ไม่มีเสียงซ้าย")   // ชำรุด
onConfirm("lost",    "ค้นหาแล้วไม่พบ")           // สูญหาย

// SE map ลง Firestore field ตาม SA schema:
{
  equipmentCondition: "normal" | "damaged" | "lost",
  equipmentNote:      string   // "" เมื่อ normal
}
```

---

## 7. Imports ที่ SE ต้องการ

```javascript
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Check,
  Headphones,
  Plug,
  DoorOpen,    // สำหรับ room type
} from 'lucide-react';
```

---

## 8. States & Interactions Summary

| State | UI |
|---|---|
| เปิด modal — default | Card "สมบูรณ์" ถูก highlight (green), ปุ่มยืนยัน active |
| คลิก "ชำรุด" | Card เปลี่ยน border+bg เป็น amber, textarea โผล่ขึ้น (animate), ปุ่มยืนยัน disabled จนกรอกโน้ต |
| คลิก "สูญหาย" | Card เปลี่ยน border+bg เป็น red, textarea โผล่ขึ้น, ปุ่มเปลี่ยนเป็น red |
| กรอก note ครบ | ปุ่มยืนยัน active |
| กด backdrop | ปิด modal, reset state |
| กด ✕ | เหมือนกด backdrop |

---

## 9. Responsive

| Breakpoint | Layout |
|---|---|
| Mobile < 640px | Bottom sheet, `rounded-t-3xl`, drag handle แสดง |
| Desktop >= 640px | Center modal, `rounded-3xl`, `max-w-sm`, drag handle ซ่อน |

**max-w-sm (384px) เหมาะที่สุด** — เนื้อหาไม่เยอะ ไม่ต้องการ 2 column

---

## 10. Accessibility

| Element | ARIA |
|---|---|
| Condition cards | `aria-pressed={isActive}` |
| Note textarea | `aria-required="true"`, `id="eq-note"` + `htmlFor="eq-note"` |
| Confirm button | `aria-disabled={!canConfirm}` |
| Modal backdrop | `onClick={handleClose}` — keyboard: ต้องเพิ่ม `onKeyDown Escape` |

**Escape key handler:**
```javascript
useEffect(() => {
  if (!isOpen) return;
  const handler = (e) => { if (e.key === "Escape") handleClose(); };
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}, [isOpen]);
```

---

## 11. Animation (ใช้ Tailwind transition เท่านั้น)

```jsx
{/* Note textarea — slide-in เมื่อ requiresNote เปลี่ยนเป็น true */}
{requiresNote && (
  <div className="px-6 pb-4 animate-in fade-in slide-in-from-top-2 duration-200">
    ...
  </div>
)}
```

> หาก `animate-in` / `fade-in` ไม่ available ใน Tailwind version ปัจจุบัน ให้ SE ใช้ `transition-all` + conditional `opacity-0 translate-y-1` แทนได้เลย

---

## 12. Migration Checklist สำหรับ SE (EH-4)

- [ ] สร้าง `frontend/components/EquipmentReturnModal.js`
- [ ] Props: `isOpen`, `onClose`, `onConfirm`, `equipmentId`, `equipmentType`, `templateName`
- [ ] State: `condition` (default `"normal"`), `note`, `mounted`
- [ ] `createPortal` + backdrop + Escape key handler
- [ ] 3 condition cards (Green / Amber / Red)
- [ ] Conditional textarea เมื่อ `damaged` / `lost`
- [ ] Footer: ปุ่มยืนยัน (สีตาม condition) + ยกเลิก
- [ ] เชื่อม `onConfirm(condition, note)` กลับไปที่ `QuickLogButtons.js`
- [ ] ใน `QuickLogButtons.js` — หลัง `onConfirm`: เขียน field `equipmentCondition` + `equipmentNote` ลง worklog Firestore doc

---

## 13. ความสัมพันธ์กับ SmartEquipmentModal

```
SmartEquipmentModal          EquipmentReturnModal
──────────────────           ─────────────────────
Modal shell เหมือนกัน  ←→   Modal shell เหมือนกัน
Portal + backdrop             Portal + backdrop
rounded-t-3xl mobile          rounded-t-3xl mobile
rounded-3xl desktop           rounded-3xl desktop
apple-button / apple-button-secondary (ทั้งคู่)

ต่างกัน:
Grid of equipment numbers  ↔  3 condition choice cards
Input: recipient           ↔  Input: note (conditional)
Color: green/orange        ↔  Color: green/amber/red
Action: ยืม / คืน          ↔  Action: สมบูรณ์ / ชำรุด / สูญหาย
```

---

**[UX/UI] Sign-off:** EH-3 Complete — ส่ง SE ได้เลย

---

## DEV LOG

**2026-06-04 — [UX/UI]:**
- **Task:** EH-3 ออกแบบ EquipmentReturnModal
- **Files Created:** `docs/DESIGN_SPEC_EH3_EquipmentReturnModal.md`
- **Note to SE:** spec พร้อมแล้ว ทำ EH-4 ได้เลย — ดูโดยเฉพาะ Section 6 (Callback Data) และ Section 12 (Checklist). อย่าลืม map `equipmentCondition`/`equipmentNote` ลง Firestore ตาม SA schema ใน `SE_HANDOVER_PHASE1.md`
