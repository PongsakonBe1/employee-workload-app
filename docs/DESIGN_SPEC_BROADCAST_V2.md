# Design Spec — Unified Broadcast Center v2.0

**ไฟล์เป้าหมาย:** `frontend/app/admin/system/page.js` → Tab "ประกาศ"

**Design System ของ Project:**
- Font: `IBM Plex Sans Thai` + `-apple-system` fallback
- Panel: `.apple-panel` (rounded-[2rem], glassmorphism, backdrop-blur)
- Button: `.apple-button` (rounded-full, bg-slate-950)
- Input: `.apple-input` (rounded-2xl, bg-white/80, focus:ring-slate-900/10)
- Label: `.apple-label` (uppercase, tracking-[0.16em], text-slate-500)

---

## 1. Layout ตาม Breakpoint

### Mobile — < 768px (iPhone)

```
┌──────────────────────┐
│  ส่งประกาศ           │
│  เขียนครั้งเดียว     │
│  ส่งได้หลายช่องทาง  │
├──────────────────────┤
│                      │
│  LABEL: หัวข้อ       │
│  ┌──────────────────┐│
│  │ เช่น แจ้งปิดปรับ ││
│  └──────────────────┘│
│                      │
│  LABEL: ข้อความ      │
│  ┌──────────────────┐│
│  │                  ││
│  │ พิมพ์รายละเอียด  ││
│  │                  ││
│  └──────────────────┘│
│              0/500   │
│                      │
│  LABEL: ส่งไปที่ไหน  │
│  ┌──────────────────┐│
│  │ 🔔  In-App       ││
│  │ Notification Bell│├── [iOS Toggle ●]
│  │ เห็นทันทีในแอป   ││
│  └──────────────────┘│
│  ┌──────────────────┐│
│  │ 📱  Push Mobile  ││
│  │ ถึงมือถือแม้ปิดแอป├── [iOS Toggle ○]
│  └──────────────────┘│
│                      │
│  LABEL: ส่งถึงใคร    │
│  ┌────┬──────┬──────┐│
│  │ทุก │พนัก. │แอดมิน│← Segmented
│  └────┴──────┴──────┘│
│                      │
│  ┌──────────────────┐│
│  │  ส่งถึง 12 คน    ││← Full width 52px
│  └──────────────────┘│
└──────────────────────┘
```

**Mobile UX Rules:**
- Cards เรียงแนวตั้ง (1 column)
- ทุก input 100% width
- Send button: `w-full`, `min-height: 52px` (thumb zone)
- Padding ด้านข้าง: 16px
- Toggle touch area: 44×44px minimum
- ไม่มี Preview panel (ประหยัด space)

---

### iPad — 768px–1023px

```
┌────────────────────────────────────────┐
│  ส่งประกาศ        [Superadmin badge]   │
│  เขียนครั้งเดียว ส่งได้หลายช่องทาง    │
├────────────────────────────────────────┤
│  LABEL: หัวข้อ                         │
│  ┌──────────────────────────────────┐  │
│  │ เช่น แจ้งอัพเดตระบบ             │  │
│  └──────────────────────────────────┘  │
│  LABEL: ข้อความ                        │
│  ┌──────────────────────────────────┐  │
│  │                                  │  │
│  │ พิมพ์รายละเอียดที่นี่...         │  │
│  └──────────────────────────────────┘  │
│  LABEL: ส่งไปที่ไหน                   │
│  ┌─────────────────┐ ┌───────────────┐ │
│  │ 🔔  In-App      │ │ 📱 Push       │ │
│  │ Bell            │ │ Mobile        │ │
│  │ เห็นทันทีในแอป  │ │ แม้ปิดแอป    │ │
│  │          [● ON] │ │        [○ OFF]│ │
│  └─────────────────┘ └───────────────┘ │
│  LABEL: ส่งถึงใคร                      │
│  ┌────────────┬────────────┬──────────┐│
│  │   ทุกคน   │  พนักงาน  │  แอดมิน  ││
│  └────────────┴────────────┴──────────┘│
│          ┌────────────────────┐        │
│          │   ส่งถึง 12 คน     │        │
│          └────────────────────┘        │
└────────────────────────────────────────┘
```

**iPad UX Rules:**
- Delivery cards: `grid-cols-2`, gap-3
- Send button: `mx-auto`, `max-w-[280px]`
- Padding: 24px
- Font body ใหญ่ขึ้นเล็กน้อย (ผู้ใช้ถือ iPad ห่าง)
- ไม่มี Preview panel (ใช้ space สำหรับ input แทน)

---

### Desktop — >= 1024px (MacBook / iMac)

```
┌────────────────────────────┬─────────────────────────────┐
│  COMPOSER                  │  PREVIEW & HISTORY          │
│                            │                             │
│  หัวข้อ                    │  ── ตัวอย่างที่ผู้ใช้เห็น ──│
│  ┌──────────────────────┐  │                             │
│  │ แจ้งอัพเดตระบบ...   │  │  ┌───────────────────────┐ │
│  └──────────────────────┘  │  │ 🔔 Notification Bell   │ │
│                            │  │ ────────────────────── │ │
│  ข้อความ                   │  │ แจ้งอัพเดตระบบ...     │ │
│  ┌──────────────────────┐  │  │ ข้อความ...            │ │
│  │                      │  │  └───────────────────────┘ │
│  │ พิมพ์รายละเอียด...   │  │                             │
│  └──────────────────────┘  │  ┌───────────────────────┐ │
│  0/500                     │  │ 📱 Push (Dark)         │ │
│                            │  │ ────────────────────── │ │
│  ── ส่งไปที่ไหน ──        │  │ แจ้งอัพเดตระบบ...     │ │
│  ┌──────────┐ ┌──────────┐ │  │ ข้อความ...            │ │
│  │ 🔔 In-App│ │ 📱 Push  │ │  └───────────────────────┘ │
│  │    [● ON]│ │   [○ OFF]│ │                             │
│  └──────────┘ └──────────┘ │  ── ส่งล่าสุด ──           │
│                            │  13:24 — ทุกคน (12 คน)     │
│  ── ส่งถึงใคร ──           │  In-App ✓  Push ✓          │
│  [ทุกคน][พนักงาน][แอดมิน]  │                             │
│                            │                             │
│  ┌──────────────────────┐  │                             │
│  │   ส่งถึง 12 คน       │  │                             │
│  └──────────────────────┘  │                             │
└────────────────────────────┴─────────────────────────────┘
```

**Desktop UX Rules:**
- `grid-cols-1 lg:grid-cols-[1fr_300px]`
- Preview panel: real-time update ขณะพิมพ์
- Recent send history: แสดง 5 รายการล่าสุด
- Send button: `w-full` ใน left column

---

## 2. Component Code (อิง Design System ของ Project)

### 2.1 Page Section Header

```jsx
<div className="mb-6">
  <h2 className="text-xl font-semibold text-slate-950 flex items-center gap-2">
    <Megaphone size={20} />
    ส่งประกาศ
    <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-xs rounded-full">
      Superadmin
    </span>
  </h2>
  <p className="text-sm text-slate-500 mt-1">
    เขียนข้อความครั้งเดียว ส่งได้ทั้ง In-App และ Push Mobile
  </p>
</div>
```

### 2.2 Outer Responsive Grid

```jsx
<div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
  {/* LEFT: Composer */}
  <div className="space-y-5">
    ...
  </div>

  {/* RIGHT: Preview — desktop only */}
  <div className="hidden lg:block space-y-4">
    ...
  </div>
</div>
```

### 2.3 Message Composer Card

```jsx
<div className="apple-panel p-4 md:p-6 space-y-4">
  <div>
    <label htmlFor="bc-title" className="apple-label">
      หัวข้อประกาศ *
    </label>
    <input
      id="bc-title"
      type="text"
      className="apple-input"
      placeholder="เช่น แจ้งอัพเดตระบบ, ปิดปรับปรุงชั่วคราว"
      maxLength={100}
      value={title}
      onChange={(e) => setTitle(e.target.value)}
    />
  </div>

  <div>
    <label htmlFor="bc-body" className="apple-label">
      ข้อความ *
    </label>
    <textarea
      id="bc-body"
      className="apple-input resize-none"
      placeholder="พิมพ์รายละเอียดประกาศที่นี่..."
      rows={4}
      maxLength={500}
      value={body}
      onChange={(e) => setBody(e.target.value)}
    />
    <p className="text-right text-xs text-slate-400 mt-1">
      {body.length}/500
    </p>
  </div>
</div>
```

### 2.4 Delivery Cards (iOS Toggle style)

```jsx
<div>
  <p className="apple-label mb-3">ส่งไปที่ไหน</p>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
    {[
      {
        id: "inApp",
        icon: Bell,
        color: "bg-blue-500",
        title: "In-App",
        subtitle: "Notification Bell",
        desc: "ผู้ใช้เห็นเมื่อเปิดแอป หรือมีไอคอนแจ้งเตือน",
      },
      {
        id: "push",
        icon: Smartphone,
        color: "bg-violet-500",
        title: "Push Mobile",
        subtitle: "ถึงมือถือแม้ปิดแอป",
        desc: "ต้องมี FCM Token (ผู้ใช้เปิด Push ในเบราว์เซอร์)",
      },
    ].map(({ id, icon: Icon, color, title, subtitle, desc }) => {
      const isOn = delivery[id];
      return (
        <button
          key={id}
          type="button"
          onClick={() => toggleDelivery(id)}
          className={`
            w-full text-left p-4 rounded-2xl border-2
            transition-all duration-200 active:scale-[0.98]
            ${isOn
              ? "border-slate-900 bg-slate-900/[0.03]"
              : "border-slate-200 bg-white/60 hover:border-slate-300"
            }
          `}
          aria-pressed={isOn}
          aria-label={`${isOn ? "ปิด" : "เปิด"} การส่งแบบ ${title}`}
        >
          <div className="flex items-start justify-between gap-3">
            {/* Icon + Labels */}
            <div className="flex items-center gap-3">
              <div className={`
                w-10 h-10 rounded-xl flex-shrink-0
                flex items-center justify-center text-white
                transition-colors duration-200
                ${isOn ? color : "bg-slate-200"}
              `}>
                <Icon size={20} />
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-[15px] leading-tight">
                  {title}
                </p>
                <p className="text-slate-500 text-xs mt-0.5">
                  {subtitle}
                </p>
              </div>
            </div>

            {/* iOS Toggle — visual only, card handles click */}
            <div className={`
              relative w-12 h-7 rounded-full flex-shrink-0
              transition-colors duration-200
              ${isOn ? "bg-emerald-500" : "bg-slate-200"}
            `}
              aria-hidden="true"
            >
              <span className={`
                absolute top-[3px] left-[3px]
                w-[22px] h-[22px] bg-white rounded-full shadow-sm
                transition-transform duration-200
                ${isOn ? "translate-x-[20px]" : "translate-x-0"}
              `} />
            </div>
          </div>

          <p className="text-xs text-slate-400 mt-3 ml-[52px]">
            {desc}
          </p>
        </button>
      );
    })}
  </div>
</div>
```

### 2.5 Target Audience — Segmented Control

```jsx
<div>
  <p className="apple-label mb-3">ส่งถึงใคร</p>
  <div className="flex rounded-xl bg-slate-100 p-1 gap-1">
    {[
      { value: "all",   label: "ทุกคน",    count: totalUsers },
      { value: "staff", label: "พนักงาน",  count: staffCount },
      { value: "admin", label: "แอดมิน",   count: adminCount },
    ].map(({ value, label, count }) => (
      <button
        key={value}
        type="button"
        onClick={() => setTarget(value)}
        className={`
          flex-1 flex items-center justify-center gap-1.5
          py-2 px-2 rounded-lg text-sm font-medium
          transition-all duration-150
          ${target === value
            ? "bg-white text-slate-950 shadow-sm"
            : "text-slate-500 hover:text-slate-700"
          }
        `}
        aria-pressed={target === value}
      >
        <span>{label}</span>
        {count > 0 && (
          <span className={`
            text-xs px-1.5 py-0.5 rounded-full
            ${target === value
              ? "bg-slate-100 text-slate-600"
              : "bg-slate-200/60 text-slate-400"
            }
          `}>
            {count}
          </span>
        )}
      </button>
    ))}
  </div>
</div>
```

### 2.6 Send Button (dynamic label)

```jsx
{/* Validation hint */}
{!canSend && (title || body) && (
  <p className="text-xs text-slate-400 text-center">
    {!title.trim() ? "กรุณากรอกหัวข้อ"
      : !body.trim() ? "กรุณากรอกข้อความ"
      : !delivery.inApp && !delivery.push ? "เลือกช่องทางส่งอย่างน้อย 1 ช่องทาง"
      : ""}
  </p>
)}

<button
  onClick={handleSend}
  disabled={!canSend || isSending}
  className="apple-button w-full md:w-auto md:min-w-[220px] md:mx-auto flex items-center justify-center gap-2"
>
  {isSending ? (
    <>
      <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
      กำลังส่ง...
    </>
  ) : (
    <>
      <Send size={18} />
      {canSend
        ? `ส่งถึง ${recipientCount} คน`
        : "เลือกช่องทางก่อน"
      }
    </>
  )}
</button>
```

### 2.7 Result Feedback

```jsx
{result?.success && (
  <div
    className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3"
    role="alert"
    aria-live="polite"
  >
    <CheckCircle size={20} className="text-emerald-600 mt-0.5 flex-shrink-0" />
    <div className="text-sm">
      <p className="font-semibold text-emerald-800">ส่งประกาศสำเร็จ</p>
      <div className="text-emerald-700 mt-1 space-y-0.5 text-xs">
        {result.inAppSent != null && (
          <p>In-App: {result.inAppSent} คน</p>
        )}
        {result.pushSent != null && (
          <p>Push: {result.pushSent} คน
            {result.pushFailed > 0 && ` (ล้มเหลว ${result.pushFailed})`}
          </p>
        )}
      </div>
    </div>
  </div>
)}

{result?.error && (
  <div
    className="rounded-2xl bg-red-50 border border-red-200 p-4 flex items-start gap-3"
    role="alert"
    aria-live="assertive"
  >
    <AlertCircle size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
    <div className="text-sm">
      <p className="font-semibold text-red-800">ส่งไม่สำเร็จ</p>
      <p className="text-red-600 mt-1 text-xs">{result.error}</p>
    </div>
  </div>
)}
```

### 2.8 Preview Panel (Desktop Only)

```jsx
{/* hidden on mobile/iPad, visible lg+ */}
<div className="hidden lg:block space-y-4">
  <p className="apple-label">ตัวอย่างที่ผู้ใช้จะเห็น</p>

  {/* In-App preview */}
  {delivery.inApp ? (
    <div className="apple-panel p-4 space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center">
          <Bell size={14} className="text-white" />
        </div>
        <span className="text-xs font-semibold text-slate-500">Notification Bell</span>
        <span className="text-xs text-slate-300 ml-auto">เมื่อกี้</span>
      </div>
      <p className="text-sm font-semibold text-slate-900 leading-snug">
        {title || <span className="text-slate-300 font-normal">หัวข้อ...</span>}
      </p>
      <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
        {body || <span className="text-slate-300">ข้อความ...</span>}
      </p>
    </div>
  ) : (
    <div className="rounded-2xl border-2 border-dashed border-slate-200 p-4 text-center">
      <Bell size={20} className="text-slate-300 mx-auto mb-1" />
      <p className="text-xs text-slate-300">เปิด In-App เพื่อดูตัวอย่าง</p>
    </div>
  )}

  {/* Push Mobile preview */}
  {delivery.push ? (
    <div className="rounded-2xl bg-slate-900 p-4 space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
          <Smartphone size={14} className="text-white" />
        </div>
        <span className="text-xs font-semibold text-white/50">Push Notification</span>
        <span className="text-xs text-white/30 ml-auto">ตอนนี้</span>
      </div>
      <p className="text-sm font-semibold text-white leading-snug">
        {title || <span className="text-white/30 font-normal">หัวข้อ...</span>}
      </p>
      <p className="text-xs text-white/60 line-clamp-3 leading-relaxed">
        {body || <span className="text-white/30">ข้อความ...</span>}
      </p>
    </div>
  ) : (
    <div className="rounded-2xl border-2 border-dashed border-slate-200 p-4 text-center">
      <Smartphone size={20} className="text-slate-300 mx-auto mb-1" />
      <p className="text-xs text-slate-300">เปิด Push เพื่อดูตัวอย่าง</p>
    </div>
  )}
</div>
```

---

## 3. Breakpoint Summary

| | Mobile < 768px | iPad 768–1023px | Desktop >= 1024px |
|---|---|---|---|
| **Layout** | Single column | Single column | 2 columns |
| **Delivery cards** | Stacked (1 col) | Side by side (2 col) | Side by side (2 col) |
| **Send button** | Full width | Centered, max-w-[280px] | Full width (left col) |
| **Preview panel** | Hidden | Hidden | Visible (right col) |
| **Padding** | 16px | 24px | 24px |
| **Min touch target** | 44px | 44px | n/a (mouse) |

---

## 4. State Machine

```
EMPTY
  ↓ user types title or body
TYPING (button: disabled, hint: "กรุณากรอกหัวข้อ")
  ↓ both title + body filled
FILLED_NO_CHANNEL (button: disabled, hint: "เลือกช่องทางก่อน")
  ↓ select at least 1 delivery
READY (button: active — "ส่งถึง 12 คน")
  ↓ click send
SENDING (button: loading spinner, inputs: disabled)
  ↓ API response
SUCCESS (green alert, form resets after 3s)
  or
ERROR (red alert, form stays for retry)
```

---

## 5. Accessibility

| Element | ARIA |
|---|---|
| Delivery card | `role="button"`, `aria-pressed={isOn}`, `aria-label="เปิด/ปิด In-App"` |
| Segmented buttons | `aria-pressed={target === value}` |
| Send button | `aria-disabled={!canSend}` |
| Result alert | `role="alert"`, `aria-live="polite"` (success) / `"assertive"` (error) |
| Inputs | `id` + `htmlFor` matching, `aria-required="true"` |
| Toggle visual | `aria-hidden="true"` (decoration, card handles interaction) |

**Reduced motion:**
```css
@media (prefers-reduced-motion: reduce) {
  .animate-spin { animation: none; }
  * { transition-duration: 0ms !important; }
}
```

---

## 6. Icons Required (lucide-react)

```jsx
import {
  Megaphone,   // Page header
  Bell,         // In-App delivery
  Smartphone,   // Push delivery
  Send,         // Send button
  CheckCircle,  // Success result
  AlertCircle,  // Error result
} from "lucide-react";
```

---

## 7. API Interface สำหรับ SE

```typescript
// State
interface BroadcastState {
  title: string;                        // max 100 chars
  body: string;                         // max 500 chars
  delivery: { inApp: boolean; push: boolean };
  target: "all" | "staff" | "admin";
}

// API calls (parallel when both selected)
await Promise.allSettled([
  delivery.inApp && sendInApp(title, body, target),   // existing Firestore
  delivery.push  && sendPush(title, body, target),    // POST /api/notify/broadcast
]);

// Push API response
{
  sent: number;
  failed: number;
}
```

---

## 8. Migration Checklist สำหรับ SE

- [ ] ลบ `<BroadcastSection />` จาก `settings/page.js` (User ทำแล้ว ✓)
- [ ] Refactor tab "ประกาศ" ใน `system/page.js` ให้ใช้ Unified Broadcast
- [ ] สร้าง `<IosToggle />` component เล็กๆ (optional, ใช้ inline ก็ได้)
- [ ] เพิ่ม icon `Megaphone` ใน lucide-react imports
- [ ] Backend: `POST /api/notify/broadcast` ส่ง FCM multicast
- [ ] ดึง `staffCount` และ `adminCount` จาก Firestore สำหรับ badge

---

**UX/UI Sign-off:** v2.0 Ready for SE  
**อิง Design System:** `.apple-panel` / `.apple-button` / `.apple-input` / `.apple-label`
