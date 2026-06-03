# Design Spec — Unified Broadcast Center

ส่งประกาศแบบรวมศูนย์ (In-App + Push)

**Version:** 2.0 — Responsive (Mobile / iPad / Desktop)
**Target:** iOS 18 / Apple.com Style — อิง Design System ของ Project
**Location:** `frontend/app/admin/system/page.js` → Tab "ประกาศ"
**Font:** IBM Plex Sans Thai (ใช้อยู่แล้ว), fallback -apple-system
**Design System:** `.apple-panel`, `.apple-button`, `.apple-input`, `.apple-label`

---

## 1. UX Concept

```
┌─────────────────────────────────────────────────────────────┐
│                     ส่งประกาศ 🎙️                           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  หัวข้อ                                              │  │
│  │  ┌───────────────────────────────────────────────┐  │  │
│  │  │ แจ้งอัพเดตระบบงานประจำเดือน                    │  │  │
│  │  └───────────────────────────────────────────────┘  │  │
│  │                                                     │  │
│  │  ข้อความ                                            │  │
│  │  ┌───────────────────────────────────────────────┐  │  │
│  │  │ ระบบจะปิดปรับปรุงชั่วคราวในวันที่ 15 มิ.ย.   │  │  │
│  │  │ เวลา 21:00-23:00 น. ขออภัยในความไม่สะดวก      │  │  │
│  │  └───────────────────────────────────────────────┘  │  │
│  │  0/500                                              │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ──────────── ส่งไปที่ไหน ────────────                      │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐                    │
│  │  🔔 In-App      │  │  📱 Push        │                    │
│  │  Notification   │  │  Mobile         │                    │
│  │                 │  │                 │                    │
│  │  ┌─────────┐   │  │  ┌─────────┐   │                    │
│  │  │   ☑️    │   │  │  │   ☐    │   │                    │
│  │  │ เปิด    │   │  │  │ ปิด    │   │                    │
│  │  └─────────┘   │  │  └─────────┘   │                    │
│  └─────────────────┘  └─────────────────┘                    │
│                                                             │
│  ──────────── ส่งถึงใคร ────────────                        │
│                                                             │
│     ○ ทุกคน    ○ พนักงาน    ○ แอดมิน                        │
│                                                             │
│  ┌─────────────────────────────────────────┐               │
│  │         ส่งประกาศถึงผู้ใช้ 0 คน          │               │
│  │           (เลือกช่องทางก่อน)             │               │
│  └─────────────────────────────────────────┘               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Design Tokens (iOS Style)

### Colors
```css
/* Primary */
--ios-blue: #007AFF;
--ios-green: #34C759;
--ios-red: #FF3B30;
--ios-orange: #FF9500;
--ios-gray: #8E8E93;

/* Backgrounds */
--ios-bg-primary: #FFFFFF;
--ios-bg-secondary: #F2F2F7;      /* Grouped table background */
--ios-bg-tertiary: #E5E5EA;

/* Text */
--ios-text-primary: #000000;
--ios-text-secondary: #8E8E93;
--ios-text-tertiary: #C7C7CC;
```

### Typography
```css
/* SF Pro Display/Rounded */
--font-title: 600 20px/1.3 -apple-system, SF Pro Display;
--font-body: 400 17px/1.4 -apple-system, SF Pro Text;
--font-caption: 400 13px/1.3 -apple-system, SF Pro Text;
--font-footnote: 400 12px/1.2 -apple-system, SF Pro Text;
```

### Spacing (iOS 8pt Grid)
```css
--space-xs: 4px;
--space-sm: 8px;
--space-md: 16px;
--space-lg: 24px;
--space-xl: 32px;
```

### Radius
```css
--radius-sm: 8px;      /* Buttons, badges */
--radius-md: 12px;     /* Cards */
--radius-lg: 20px;     /* Modals, sheets */
--radius-xl: 28px;     /* Large cards */
```

### Shadows (iOS elevation)
```css
--shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
--shadow-md: 0 4px 12px rgba(0,0,0,0.08);
--shadow-lg: 0 8px 24px rgba(0,0,0,0.12);
```

---

## 3. Component Specs

### 3.1 Message Composer Card
```jsx
// Card Container
<div className="
  bg-white 
  rounded-[20px] 
  shadow-[0_2px_12px_rgba(0,0,0,0.08)]
  p-4 md:p-6
">

// Title Input
<input
  className="
    w-full
    bg-[#F2F2F7] 
    rounded-[12px]
    px-4 py-3
    text-[17px]
    placeholder:text-[#C7C7CC]
    focus:bg-white
    focus:ring-2 focus:ring-[#007AFF]/20
    focus:outline-none
    transition-all duration-200
  "
  placeholder="หัวข้อประกาศ"
/>

// Body Textarea
<textarea
  className="
    w-full
    bg-[#F2F2F7]
    rounded-[12px]
    px-4 py-3
    text-[17px]
    min-h-[120px]
    resize-none
    placeholder:text-[#C7C7CC]
    focus:bg-white
    focus:ring-2 focus:ring-[#007AFF]/20
    focus:outline-none
    transition-all duration-200
  "
  placeholder="พิมพ์ข้อความที่ต้องการส่ง..."
/>

// Character Counter
<span className="text-[13px] text-[#8E8E93] float-right">
  {length}/500
</span>
```

### 3.2 Delivery Option Cards (iOS Toggle Cards)
```jsx
// Container Grid
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">

// Individual Card
<div className={`
  relative
  rounded-[16px]
  p-4
  border-2
  transition-all duration-200
  ${selected 
    ? 'bg-[#007AFF]/5 border-[#007AFF]' 
    : 'bg-[#F2F2F7] border-transparent hover:bg-[#E5E5EA]'
  }
`}>
  
  {/* Icon & Label */}
  <div className="flex items-center gap-3 mb-3">
    <div className={`
      w-10 h-10 rounded-full flex items-center justify-center
      ${selected ? 'bg-[#007AFF] text-white' : 'bg-white text-[#8E8E93]'}
      transition-colors duration-200
    `}>
      <Icon size={20} />
    </div>
    <div>
      <p className="text-[17px] font-semibold text-[#000]">
        {title}
      </p>
      <p className="text-[13px] text-[#8E8E93]">
        {subtitle}
      </p>
    </div>
  </div>
  
  {/* iOS Toggle Switch */}
  <div className="flex items-center justify-between">
    <span className="text-[15px] text-[#8E8E93]">
      {selected ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
    </span>
    <Switch 
      checked={selected}
      onChange={onToggle}
      className="ios-toggle"
    />
  </div>
</div>
```

### 3.3 iOS Toggle Switch Component
```jsx
// Switch.tsx - iOS Style
function Switch({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`
        relative w-[51px] h-[31px] rounded-full
        transition-colors duration-200
        ${checked ? 'bg-[#34C759]' : 'bg-[#E5E5EA]'}
      `}
    >
      <span
        className={`
          absolute top-[2px] left-[2px]
          w-[27px] h-[27px] bg-white rounded-full
          shadow-[0_2px_4px_rgba(0,0,0,0.2)]
          transition-transform duration-200
          ${checked ? 'translate-x-[20px]' : 'translate-x-0'}
        `}
      />
    </button>
  );
}
```

### 3.4 Radio Button Group (iOS Segmented)
```jsx
// Target Audience Selection
<div className="
  bg-[#F2F2F7]
  rounded-[10px]
  p-1
  flex gap-1
">
  {['all', 'staff', 'admin'].map((option) => (
    <button
      key={option}
      onClick={() => setTarget(option)}
      className={`
        flex-1
        py-2 px-4
        rounded-[8px]
        text-[15px]
        font-medium
        transition-all duration-150
        ${selected === option
          ? 'bg-white text-[#007AFF] shadow-sm'
          : 'text-[#8E8E93] hover:text-[#636366]'
        }
      `}
    >
      {option === 'all' && 'ทุกคน'}
      {option === 'staff' && 'พนักงาน'}
      {option === 'admin' && 'แอดมิน'}
    </button>
  ))}
</div>
```

### 3.5 Primary Action Button (iOS Fill Button)
```jsx
// Dynamic based on state
<button
  disabled={!canSend || isSending}
  className={`
    w-full
    py-4
    rounded-[14px]
    text-[17px] font-semibold
    transition-all duration-200
    ${isSending
      ? 'bg-[#007AFF]/60 text-white/80'
      : canSend
        ? 'bg-[#007AFF] text-white shadow-[0_4px_14px_rgba(0,122,255,0.4)]'
        : 'bg-[#E5E5EA] text-[#C7C7CC]'
    }
    active:scale-[0.98]
    disabled:active:scale-100
  `}
>
  {isSending ? (
    <span className="flex items-center justify-center gap-2">
      <Spinner size={18} />
      กำลังส่ง...
    </span>
  ) : (
    `ส่งประกาศถึง ${recipientCount} คน`
  )}
</button>
```

---

## 4. States & Interactions

### 4.1 Form States

| State | Visual |
|-------|--------|
| **Empty** | Placeholder light gray, button disabled |
| **Typing** | Input bg white, blue ring, counter updates |
| **Valid** | Both delivery options unchecked = button shows "เลือกช่องทางก่อน" |
| **Ready** | At least 1 delivery selected + title filled = button active |
| **Sending** | Button loading, inputs disabled, spinner |
| **Success** | Green check animation, reset form after 2s |
| **Error** | Red alert card slides down from top |

### 4.2 Delivery Option Interaction

```
User taps In-App card:
├─ Card bg fades to blue/5
├─ Border animates to blue (300ms ease-out)
├─ Icon circle fills blue
├─ Toggle slides right + turns green
└─ Recipient count recalculates

User taps again:
└─ Reverse animation
```

### 4.3 Success Animation
```jsx
// Checkmark with scale animation
<div className="animate-success-bounce">
  <CheckCircle 
    size={48} 
    className="text-[#34C759]" 
    strokeWidth={2.5}
  />
</div>

// Tailwind config
keyframes: {
  'success-bounce': {
    '0%': { transform: 'scale(0.5)', opacity: '0' },
    '50%': { transform: 'scale(1.1)' },
    '100%': { transform: 'scale(1)', opacity: '1' }
  }
}
```

---

## 5. Responsive Behavior

### Desktop (>768px)
- 2-column delivery cards
- Side-by-side layout
- Full padding (24px)

### Mobile (<768px)
- Stacked delivery cards
- Full-width inputs
- Reduced padding (16px)
- Larger touch targets (min 44px)

---

## 6. Accessibility (WCAG 2.1 AA)

```jsx
// ARIA labels for screen readers
<div role="group" aria-labelledby="delivery-heading">
  <h3 id="delivery-heading">ส่งไปที่ไหน</h3>
  
  <button
    role="switch"
    aria-checked={inAppEnabled}
    aria-label="ส่งประกาศในแอป"
  >
    ...
  </button>
</div>

// Radio group
<div role="radiogroup" aria-label="กลุ่มเป้าหมาย">
  <button role="radio" aria-checked={target === 'all'}>ทุกคน</button>
  ...
</div>

// Focus management
- Tab order: Title → Body → In-App toggle → Push toggle → Target radios → Send button
- Focus visible: Blue ring 2px offset
- Reduced motion: Disable animations with `prefers-reduced-motion`
```

---

## 7. Implementation Notes for SE

### Props Interface
```typescript
interface BroadcastMessage {
  title: string;
  body: string;
}

interface DeliveryOptions {
  inApp: boolean;
  pushMobile: boolean;
}

interface BroadcastFormState {
  message: BroadcastMessage;
  delivery: DeliveryOptions;
  target: 'all' | 'staff' | 'admin';
  isSending: boolean;
  result: {
    success: boolean;
    inAppSent?: number;
    pushSent?: number;
    pushFailed?: number;
    error?: string;
  } | null;
}
```

### API Calls
```typescript
// When both channels selected, call in parallel
await Promise.all([
  delivery.inApp && sendInAppBroadcast({ message, target }),
  delivery.pushMobile && sendPushBroadcast({ message, target })
]);

// Individual APIs
POST /api/notifications/broadcast      // In-App (existing)
POST /api/notify/broadcast               // Push (new - requires auth token)
```

### State Logic
```typescript
const recipientCount = useMemo(() => {
  if (!delivery.inApp && !delivery.pushMobile) return 0;
  
  // Calculate based on target + active delivery methods
  const baseCount = target === 'all' ? totalUsers 
                   : target === 'staff' ? staffCount 
                   : adminCount;
  
  return baseCount;
}, [delivery, target, totalUsers, staffCount, adminCount]);

const canSend = message.title.trim() && 
                message.body.trim() && 
                (delivery.inApp || delivery.pushMobile) &&
                recipientCount > 0;
```

---

## 8. Migration Plan

### Step 1: Remove from Settings
- ลบ `BroadcastSection` component จาก `settings/page.js`
- เก็บไว้เฉพาะ Push Config (on/off, time, days)

### Step 2: Update System Page
- Refactor tab "ประกาศ" เป็น Unified Broadcast
- รวม In-App (existing) + Push (new) เข้าด้วยกัน

### Step 3: New Components
- สร้าง `components/ui/Switch.tsx` (iOS toggle)
- สร้าง `components/broadcast/BroadcastComposer.tsx`

### Step 4: Backend
- สร้าง `POST /api/notify/broadcast` endpoint
- เชื่อมต่อ Firebase Admin SDK ส่ง FCM

---

## 9. Reference Images

**iOS Settings App Style:**
- Grouped table view with rounded corners
- Clear visual hierarchy
- Switch controls for on/off
- Detail disclosure indicators

**Apple.com Style:**
- Generous whitespace
- Subtle shadows
- Smooth transitions
- SF Pro typography

---

**UX/UI Sign-off:** Ready for SE implementation  
**Last Updated:** 2024-06-02
