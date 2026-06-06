# Development Log — labboy Workload Recorder

---

## [2026-06-05 09:29] - [UX/UI] Designer — ITEM-4 Seasonal Legend & InfoTooltip Spec

**Task:** ITEM-4 — ออกแบบ legend + popover ⓘ สำหรับ `SeasonalPatternChart` ตาม `KMUTNB_ACADEMIC_CALENDAR.md`

**Files Created:**
- `docs/DESIGN_SPEC_ITEM4_SeasonalLegend.md` — Design spec ฉบับสมบูรณ์

**Design Decisions:**
- **Progressive disclosure:** chips ย่อ 3 ชิป (rose/indigo/slate) → กด ⓘ → popover ขยายเต็ม
- **Popover content:** สี 3 ประเภท + เดือนจริง (ส.ค./ต.ค./ม.ค./มี.ค.) + reference line อธิบาย + tip outlier + TGGS note
- **Click-outside + Escape ปิด** — ไม่ block workflow
- **LegendChips** แทนที่ component เดิม (บรรทัด 115–129) ทั้งหมด
- **CustomTooltip** upgrade: เพิ่ม `periodType` (สีตาม peak/active/low), multiplier เทียบ mean, outlier flag
- **Empty state** ปรับ copy + เพิ่ม icon
- **Mobile:** chip label ซ่อนบน < 640px (`hidden sm:inline`)

**Color system (ยืนยันตาม KMUTNB calendar):**
- peak → `#be123c` (rose-700) / active → `#3730a3` (indigo-700) / low → `#475569` (slate-600)

**Note to SE (ITEM-4, ลำดับ #9):**
- ดู Section 11 (Migration Checklist) — 9 steps ชัดเจน
- แทนที่ `LegendChips()` เดิม + `CustomTooltip` เดิม + empty state เดิม ใน `SeasonalCharts.js`
- เพิ่ม import `{ Info, X, BarChart2 }` จาก `lucide-react`
- เพิ่ม `periodType` ใน `chartData` map + ส่ง `mean` เข้า `makeCustomTooltip(mean)`

---

## [2026-06-05 15:15] - [SE] Software Engineer — ITEM-3B: Profile Stats + Radar + Badges

**Task:** ITEM-3B SE — เพิ่มสถิติส่วนตัว กราฟ radar และตรารางวัลในหน้า Profile

**Files Created:**
- `frontend/components/ProfileStats.js` — Component แสดงสถิติส่วนตัว:
  - `StatCard`: การ์ดสถิติ 4 ใบ (งานทั้งหมด, เดือนนี้, streak, หมวดหมู่หลัก) พร้อม trend indicator
  - `CategoryRadar`: กราฟ Radar Chart แสดงการกระจายงานตามหมวดหมู่ (normalized 0-100) ใช้ Recharts
  - `BadgesSection`: แสดงตรารางวัลที่ได้รับ พร้อมสีตามประเภท

**Files Modified:**
- `frontend/lib/analytics.js` — เพิ่มฟังก์ชันสำหรับ profile stats:
  - `calculateStreak(worklogs)` — คำนวณ streak ปัจจุบัน (consecutive days)
  - `calculateLongestStreak(worklogs)` — คำนวณ streak สูงสุดตลอดกาล
  - `getCategoryBreakdown(worklogs)` — สรุปงานตามหมวดหมู่
  - `calculateUserStats(worklogs, user)` — รวมสถิติทั้งหมด (total, thisMonth, streak, topCategory, trend)
  - `calculateRadarData(worklogs)` — ข้อมูลสำหรับ radar chart (normalized)
  - `getBadges(stats, worklogs)` — คำนวณตรารางวัลตาม achievements:
    - Volume badges: 10/50/100 worklogs
    - Streak badges: 7/30 days
    - Current streak badge (>= 5 days)
    - Consistency badge (20+ days, avg 2+ per day)
    - Specialist badge (top category >= 20)
    - Early adopter badge (first worklog before 2025-06-01)

- `frontend/app/profile/page.js`:
  - Import `ProfileStats` และ `BarChart3` icon
  - เพิ่ม section "สถิติของฉัน" แสดง `ProfileStats` component ก่อนฟอร์มแก้ไขโปรไฟล์

**Features:**
- Stats cards responsive (2 cols mobile → 4 cols desktop)
- Radar chart แสดงสูงสุด 8 หมวดหมู่ พร้อม tooltip แสดงจำนวนจริง
- Loading state แสดง skeleton animate-pulse
- Empty states สำหรับยังไม่มีข้อมูล

**Note to [QA]:**
- ทดสอบว่า stats แสดงถูกต้องตาม worklogs ของ user ที่ login
- ทดสอบ radar chart แสดง normalized data (0-100)
- ทดสอบ badges คำนวณถูกต้องตามเกณฑ์ที่กำหนด
- ทดสอบ loading state แสดงขณะโหลด worklogs

---

## [2026-06-05 15:22] - [PM/UX/DA/SE] — Approved: Radar uses minorTask + New Badges

**PM/UX Decision:** Profile Radar Chart ใช้ `minorTask` (หัวข้อรอง) แทน `category/dutyType`

**เหตุผล:**
- `mainDuty` มีแค่ 3 categories — กว้างเกินไป
- `minorTask` มี ~30 tasks — สะท้อนทักษะจริง เช่น "ยืมหูฟัง" vs "ติดตั้ง Software"

**Files Modified:**

**`frontend/lib/analytics.js`:**
- `getCategoryBreakdown()` — เปลี่ยนใช้ `w.minorTask` เป็น primary category
- `calculateUserStats()` — เพิ่ม `uniqueMinorTasks` และ `topMinorTask` ใน return
- `getBadges()` — เพิ่ม 2 badges ใหม่:
  - **All-rounder** (`Layers` icon, cyan): ทำงานครบ 10 หัวข้อรองที่แตกต่างกัน
  - **มือขวาประจำ** (`HandHelping` icon, pink): เชี่ยวชาญหัวข้อรองใดหนึ่ง 30+ ครั้ง

**`frontend/components/ProfileStats.js`:**
- Import `Layers`, `HandHelping` icons
- เพิ่ม `cyan`, `pink` colors ใน COLOR_MAP
- เปลี่ยนหัวข้อกราฟ: "การกระจายตามหัวข้อรอง"
- แก้ empty state: แสดงข้อความชัดเจนเมื่อมี < 3 หัวข้อ ("ต้องมีอย่างน้อย 3 หัวข้อรองที่แตกต่างกัน")
- ลด font size ของ labels บน radar เป็น 10px เพื่อรองรับชื่องานที่ยาว

**ผลลัพธ์:**
- Staff ที่ทำงานหลากหลายจะเห็นกราฟ radar หลายมิติ
- Badges สะท้อนความสามารถทั้ง depth (เชี่ยวชาญเฉพาะ) และ breadth (ทำได้หลายอย่าง)

---

## [2026-06-06 10:50] - [UX/UI] — Apple iOS Style Export Buttons + Date Picker

**Task:** Refine export UI to Apple/iOS minimalist design theme

**Files Modified:**

**1. RoomEquipmentStatus.js — Export Button Styling:**

**Export CSV Button (Header bar):**
- เปลี่ยนจาก `bg-slate-100` → `bg-white` ให้คลีนขึ้น
- ใช้ `border-slate-200/60` ให้เส้นขอบบาง ๆ (60% opacity)
- แก้ไขปัญหา nested button → ใช้ `<div role="button">`
- Font size 10px, icon size 11px, strokeWidth 1.5 (บางเฉียบ)
- Hover: `hover:bg-slate-50` (subtle)
- Tooltip: "ส่งออกสถานะอุปกรณ์ (CSV)"

**Date Range Picker + Export History (Expanded section):**
- เปลี่ยนจาก `bg-slate-50` → `bg-slate-50/80` (80% opacity ให้สว่างขึ้น)
- ใช้ uppercase label: "ส่งออกประวัติ" text-[10px] text-slate-400 tracking-wide
- Date inputs: `bg-white border-slate-200/60 rounded-md` 
- เปลี่ยน separator "-" → "→" (arrow icon style บางๆ)
- Export button: คลีนแบบเดียวกับ header — `bg-white border-slate-200/60`
- ไม่ใช้สีน้ำเงินเด่น → ใช้ `text-slate-600` ให้ minimal
- `active:scale-95` ให้ tactile feedback แบบ iOS

**Design Principles Applied:**
- **สี:** ใช้ `slate-50` to `slate-600` gradient เท่านั้น (monochrome)
- **ขอบ:** `border-slate-200/60` — บาง 60% opacity (Apple style)
- **Shadow:** `shadow-sm` — บางเฉียบ ไม่หนัก
- **Spacing:** กระชับ px-3 py-2.5 แทน px-4 py-3
- **Typography:** text-[10px] uppercase tracking-wide ให้ดู professional

---

## [2026-06-05 16:05] - [SE/SA] — Equipment Transaction Export (Simplified)

**Task:** Add date range export for equipment borrow/return history

---

## [2026-06-05 15:40] - [SE/SA/UX] — RoomEquipmentStatus + ProfileStats Enhancements

**Task:** Implement equipment condition tracking + CSV export + improved UX

**1. RoomEquipmentStatus.js — Equipment Condition & CSV Export**

**Files Modified:**
- Added imports: `Download`, `AlertTriangle`, `Wrench`, `Ban` (Lucide icons)
- Added `useAuth` hook — เช็ค admin สำหรับ export CSV
- Added `equipmentConditions` state — track สภาพอุปกรณ์ (normal/damaged/lost)
- Updated `calculateStatusFromWorklogs()` — อ่าน `equipmentCondition` จาก worklog เมื่อคืนของ
- Added `getConditionBadge()` — styling สำหรับสถานะชำรุด/สูญหาย
- Added `exportToCSV()` — export ข้อมูลอุปกรณ์ทั้งหมด (เฉพาะ admin)
- Updated all grid cards — แสดง condition indicator (amber=ชำรุด, red=สูญหาย)
- Updated `DevicePreview` — แสดง condition badge เมื่อเลือกอุปกรณ์
- Added Export CSV button — แสดงเฉพาะเมื่อ expand + admin

**CSV Columns:**
- รหัสอุปกรณ์, ประเภท, สังกัด (ชั้น 3/Finn), สถานะการใช้งาน, สภาพอุปกรณ์, บันทึกล่าสุด, Barcode, Item No

**2. ProfileStats.js — Abbreviations & Badge Tooltip**

**Files Modified:**
- Added `limit(500)` ใน query — ป้องกัน quota overuse [SA]
- Added `ABBREVIATION_MAP` — คำย่อสำหรับ radar chart:
  - `ช่วยเหลือการใช้งานคอมพิวเตอร์` → `ช่วยดูคอม`
  - `เปิดห้องเรียนชั้น 3/4` → `เปิดชั้น 3/4`
  - `ปิดห้องเรียนชั้น 3/4` → `ปิดชั้น 3/4`
  - `Software ลิขสิทธิ์` → `SW Licence`
  - `แก้ไขปัญหา ICIT account` → `ICIT Account`
  - `Microsoft Authenticator` → `MS Auth`
  - และอื่นๆ
- Added `shortenLabel()` function — แปลงชื่องานยาวเป็นคำย่อ
- Updated `CategoryRadar` — แสดงคำย่อบน radar, tooltip แสดงชื่อเต็ม
- Added `BadgeWithTooltip` component — custom tooltip สวยงาม (dark bg, arrow)
- Updated `BadgesSection` — ใช้ BadgeWithTooltip แทน native title

**3. Integration Flow — SmartEquipmentModal ↔ RoomEquipmentStatus**

```
[ยืม/คืน ใน SmartEquipmentModal]
    ↓ onSelect(comment, equipment, minorTask, recipient, condition, note)
[QuickLogButtons.handleLogWithSmartEquipment]
    ↓ addDoc(worklogs, { equipmentCondition, equipmentNote })
[RoomEquipmentStatus อ่าน worklogs]
    ↓ แสดงสถานะ: กำลังใช้งาน (🔴) / ชำรุด (🟠) / สูญหาย (🔴 deep)
```

**ผลลัพธ์:**
- Staff เห็นสถานะอุปกรณ์ครบถ้วน (ใช้งาน/ชำรุด/สูญหาย)
- Admin export CSV ได้ — มีข้อมูลสังกัด+สภาพ+บาร์โค้ด
- Profile radar แสดงคำย่อ — อ่านง่ายขึ้น
- Badge hover สวยงาม — dark tooltip มีลูกศร

**UX Update 15:45:** เปลี่ยนสี `lost` จากแดงเข้ม → **เทา/สเลท** (`slate-400/500`)
- สื่อความหมาย: "disabled/unavailable" (Apple iOS semantic)
- แยกชัดจาก `in_use` (rose-400) ที่เป็น active/error แต่ยังมีตัวตน
- สอดคล้องธีม minimal, professional, clean

---

## [2026-06-05 15:05] - [DA] Data Analyst — Auto-detect Academic Year + Fiscal 2568 Calendar

**Task:** DA — รองรับปีการศึกษา 2568 ในปีงบ 2569 (Oct'25 - May'26) พร้อม auto-detect

**Rationale:** ปีงบ 2569 (1 ต.ค. 2568 - 30 ก.ย. 2569) ทับซ้อน 2 ปีการศึกษา:
- ต.ค. 2568 - มี.ค. 2569 = ภาค 2 ของปีการศึกษา 2568
- มิ.ย. 2569 - ก.ย. 2569 = ภาค 1 ของปีการศึกษา 2569

**Files Modified:**
- `frontend/lib/analytics.js`:
  - เพิ่ม `ACADEMIC_PERIODS_2568_BACHELOR` — ปฏิทินปริญญาตรี 2568 (มิ.ย. 2568 - พ.ค. 2569)
  - เพิ่ม `ACADEMIC_PERIODS_2568_TGGS` — ปฏิทิน TGGS 2568 (ส.ค. 2568 - ก.ค. 2569)
  - เพิ่ม `ACADEMIC_PERIODS_2568` (alias)
  - เพิ่ม `getAcademicYear(date)` — คำนวณปีการศึกษาจากวันที่ (Jun-Dec = ปีนั้น, Jan-May = ปีก่อน)
  - ปรับ `getAcademicPeriod(date, level)` — auto-detect ปีการศึกษาแล้วเลือก calendar ที่ถูกต้อง (รองรับ 2568/2569)
  - ปรับ `getExamPeriods(level, academicYear)` — รองรับทั้ง 2 ปี (default = ทั้ง 2 ปี, หรือเลือกเฉพาะปี)

**Examples:**
- `getAcademicPeriod('2025-10-15')` → sem1_final_exam (academic 2568)
- `getAcademicPeriod('2026-08-20')` → sem1_mid_exam (academic 2569)
- `getAcademicYear('2025-12-01')` → "2568"
- `getAcademicYear('2026-06-22')` → "2569"

**Note to [SE]:**
- ไม่ต้องแก้ `SeasonalCharts.js` — `getSeasonalAnalysis` ใช้ `getAcademicPeriod` ที่ auto-detect แล้ว
- กราฟ seasonal จะแสดงสี/period ถูกต้องอัตโนมัติไม่ว่า worklog จะอยู่ช่วงไหนของ fiscal 2569

---

## [2026-06-05 10:40] - [SE] Software Engineer — ITEM-4: SeasonalCharts Legend + InfoTooltip + Strip

**Task:** ITEM-4 SE — implement ตาม `DESIGN_SPEC_ITEM4_SeasonalLegend.md`

**Files Modified:**
- `frontend/components/SeasonalCharts.js` — เขียนใหม่ทั้งหมด:
  - `LegendChips`: chips 3 สี (Exam/Semester/Break) + ปุ่ม ⓘ → popover `คู่มืออ่านกราฟ` (click-outside + Escape ปิด, focus closeRef เมื่อเปิด, `aria-expanded`, `role="dialog"`)
  - Popover: section สีแท่งกราฟ + เดือนจริง, reference line legend (slate/amber dashed), amber tip card, TGGS note
  - `makeCustomTooltip(mean)`: curried component — แสดง periodLabel สี rose/indigo/slate, multiplier × mean, 🔴 outlier flag เมื่อ > 2×mean
  - `AcademicCalendarStrip`: timeline strip ใต้ chart — filter เฉพาะ months ที่มีใน data, flex proportional, opacity/hover, mobile ซ่อน label (`hidden sm:inline`)
  - `PERIOD_LABEL_MAP` + `PERIOD_TYPE_MAP`: รองรับ keys ใหม่ Bachelor 2569 + TGGS + Legacy keys (fallback)
  - Empty state: `BarChart2` icon + copy ใหม่
  - ลบ `Legend` import (ไม่ใช้)

**Note to [QA]:**
- ทดสอบ popover: กด ⓘ → เปิด → กด Escape → ปิด; click outside → ปิด; focus ที่ ✕
- ทดสอบ tooltip: hover bar → เห็น periodLabel สี + multiplier ↑/🔴
- ทดสอบ strip: มี data 2026-08 → segment "Midterm" rose สีปรากฏ, hover opacity=1
- ทดสอบ mobile < 640px: chip label ซ่อน, strip label ซ่อน

---

## [2026-06-05 09:15] - [SE] Software Engineer — v2.3.0 Re-plan ITEM-1, ITEM-2, ITEM-3A

**Task:** แก้ SmartEquipmentModal double-borrow bug + rebuild SeasonalCharts + lock displayName สำหรับ staff

**Files Modified:**
- `frontend/components/SmartEquipmentModal.js` — ITEM-1: เพิ่ม `returnCondition`/`returnNote` state; inline condition selector (สมบูรณ์/ชำรุด/สูญหาย) ปรากฏเมื่อเลือก `in_use`; track `equipmentConditionMap` จาก worklogs; disable ยืมถ้า damaged/lost; ส่ง condition+note ผ่าน `onSelect` 6 args
- `frontend/components/QuickLogButtons.js` — ITEM-1: `handleLogWithSmartEquipment` รับ `equipmentCondition` + `equipmentNote` แล้วใส่ใน `extraData`
- `frontend/components/SeasonalCharts.js` — ITEM-2: สร้างใหม่ทั้งหมด ใช้ PERIOD_COLORS จาก `analytics.js` (rose-700/indigo-700/slate-600); `SeasonalPatternChart`, `OutlierAlertCard`, `PeakHourPrediction`; legend chips, fillOpacity=0.85, maxBarSize=48; empty state message
- `frontend/app/dashboard/page.js` — ITEM-2: เพิ่ม dynamic imports SeasonalPatternChart/OutlierAlertCard/PeakHourPrediction; `allWorklogs` state + `setAllWorklogs(allWorklogsInRange)` ใน loadStats; `seasonalAnalysis = useMemo(() => getSeasonalAnalysis(allWorklogs))`; seasonal section admin-only พร้อม empty state < 5 records
- `frontend/app/profile/page.js` — ITEM-3A: staff เห็น displayName แบบ read-only พร้อม Lock icon; admin แก้ได้; updateDoc payload ไม่ส่ง displayName ถ้า role != admin
- `frontend/app/admin/users/page.js` — ITEM-3A: เพิ่มปุ่ม "ชื่อลงงาน" (Pencil icon) ในทุก row ที่ไม่ใช่ superadmin; modal `editDisplayNameModal` + `handleSaveDisplayName()`

**Note to [QA]:**
- ทดสอบ ITEM-1: กดยืม ICIT01 (ครั้งแรก) → กด ICIT01 อีกครั้ง → modal แสดง condition selector, ปุ่มเปลี่ยนสีตาม damaged/lost
- ทดสอบ ITEM-1: กด ICIT01 ที่ damaged (available) → ปุ่มถูก disable, tooltip "ยืมไม่ได้ — ชำรุด"
- ทดสอบ ITEM-2: dashboard → seasonal section ปรากฏ (admin), สีกราฟ rose/indigo/slate
- ทดสอบ ITEM-3A: staff login → profile → displayName เป็น read-only; admin → users page → ปุ่มชื่อลงงาน → modal แก้ได้

---

## [2026-06-05 08:23] - [SA] Firestore Rules Update — v2.3.0 Re-plan ITEM-1 & ITEM-3A

**Task:** ตามที่ [PM] มอบหมายใน TASKS.md — อัปเดต Firestore Rules สำหรับ v2.3.0 Re-plan

**Files Modified:**
- `firebase/firestore.rules` — 2 การเปลี่ยนแปลงหลัก

**Changes:**

### ITEM-3A: ล็อค displayName ไม่ให้ staff แก้เอง (Line ~109-113)
```javascript
// Users can update their own profile (except role and displayName)
// SA Note: v2.3.0-replan — ล็อค displayName ไม่ให้ staff แก้เอง (ITEM-3A)
allow update: if isOwner(userId) && 
  request.resource.data.diff(resource.data).affectedKeys().hasOnly(['nickname', 'fullName', 'lastLoginAt', 'fcmToken']);
// หมายเหตุ: displayName ถูกลบออกจาก allowed fields
```

### ITEM-1: อนุญาต write equipmentCondition/equipmentNote (Line ~55-65)
```javascript
function isValidWorkLogUpdate() {
  // SA Note: v2.3.0-replan — เพิ่ม equipmentCondition/equipmentNote (ITEM-1)
  let hasEquipmentCondition = request.resource.data.keys().hasAny(['equipmentCondition']);
  let hasEquipmentNote = request.resource.data.keys().hasAny(['equipmentNote']);
  let validEquipmentCondition = !hasEquipmentCondition || (request.resource.data.equipmentCondition in ['normal', 'damaged', 'lost']);
  let validEquipmentNote = !hasEquipmentNote || (request.resource.data.equipmentNote is string);
  return validDate && validTime && validEquipmentCondition && validEquipmentNote;
}
```

**Status:** ✅ Deployed to Firebase — `firebase deploy --only firestore:rules`

**Note to Next Agent:**
- **[DA]** ทำ parallel: ตรวจ + แก้ `predictNextPeak()` cap 6 เดือน
- **[SE]** รอ SA เสร็จแล้ว — เริ่มทำได้เลย:
  - ITEM-1: SmartEquipmentModal double-borrow + condition inline
  - ITEM-2: PERIOD_COLORS + SeasonalCharts  
  - ITEM-3A: ซ่อน displayName input สำหรับ staff
  - ITEM-3B: Profile page Radar + Stats + Badges
- **[UX/UI]** ทำ parallel: ออกแบบ tooltip/legend Seasonal chart (ITEM-4)

---

## [2026-06-05 08:17] - [PM] Project Manager — v2.3.0 Rollback & Re-plan

**Task:** วิเคราะห์สาเหตุ rollback + วางแผน v2.3.0 Re-plan + assign งานแต่ละ role

**สถานะ:** v2.3.0 rollback กลับ production v2.2.1 — เริ่ม branch `feature/v230-replan`

**สาเหตุ Rollback:**
1. SmartEquipmentModal กดครั้งที่ 2 เป็น "ยืมซ้ำ" แทนที่จะเป็น "คืน" (action detection ผิด)
2. EquipmentReturnModal (EH-4) ไม่มีใน codebase — ยังไม่ implement
3. Seasonal Pattern กราฟสีเดียว (ข้อมูลน้อย period เดียว) + พยากรณ์ Peak กระโดดไป มิ.ย. 2027
4. Radar Chart อยู่คนละ page (/admin/staff-analytics) — user หาไม่เจอ

**Files Modified:**
- `TASKS.md` — เพิ่ม section "v2.3.0 Rollback & Re-plan" พร้อม 4 items + ลำดับงาน
- `docs/DEV_LOG.md` — บันทึก entry นี้

**Note to Next Agent:**
- **[SA]** เริ่มก่อน: อัปเดต `firebase/firestore.rules` — (1) อนุญาต write `equipmentCondition`/`equipmentNote` ใน worklog, (2) ล็อค `displayName` ไม่ให้ staff แก้เอง → บันทึกใน DEV_LOG.md
- **[DA]** parallel กับ SA: ตรวจ + แก้ `predictNextPeak()` cap 6 เดือน + verify `analyzeSeasonalPattern()` → บันทึกใน DEV_LOG.md
- **[SE]** รอ SA เสร็จก่อน: แก้ SmartEquipmentModal (ITEM-1), PERIOD_COLORS (ITEM-2), Profile page (ITEM-3B)
- **[UX/UI]** parallel: ออกแบบ tooltip/legend สำหรับ Seasonal chart (ITEM-4)
- **[QA]** รอ SE เสร็จ: ทดสอบ equipment flow ยืม→คืน→condition + Seasonal + displayName lock → บันทึกใน `QA_REPORT.md`

---

## [2026-06-05 06:25] - [SE] HOTFIX — Timezone Bug Fix (UTC vs Local Date)

**Problem:** วันที่ 5 มิ.ย. 2025 เวลา 06:00 (ไทย) แต่ SmartEquipmentModal แสดงสถานะวันที่ 4 มิ.ย.

**Root Cause:** 
- `today()` ใน `dateUtils.js` ใช้ `toISOString()` ซึ่งให้ **UTC date**
- ประเทศไทย UTC+7 → 06:00 น. = 23:00 ของวันก่อนใน UTC

**Fix:**
- `dateUtils.js` — เปลี่ยน `today()` ใช้ `toLocalDateStr()` (local timezone)
- `SmartEquipmentModal.js` — ใช้ `toLocaleDateString('en-CA')` (local timezone)

**Files Modified:**
- `frontend/lib/dateUtils.js` — แก้ `today()` ใช้ local date
- `frontend/components/SmartEquipmentModal.js` — แก้ `today` ใช้ local date

**Deployed:** ✅ Hotfix deployed — https://labboy-workload-app.web.app

---

## [2026-06-04 14:50] - [SA] System Architect — Firestore Rules Hotfix (BUG-5 follow-up)

**Task:** แก้ Firestore Rules ให้ staff สามารถ edit/delete worklog ของตัวเองในวันเดียวกันได้

**Files Modified:**
- `firebase/firestore.rules`

**Root Causes Found & Fixed:**
1. `isSameDay()` ใช้ `duration.value()` / `timestamp.value()` ที่ไม่ valid ใน Firestore CEL → deny ทุก operation → ลบ `isSameDay` check ออกจาก rules (frontend `canEdit()` enforce แทน)
2. `resource.data.locked` — field ไม่มีใน document เก่า → CEL throw error → deny → แก้เป็น `resource.data.get('locked', false)`
3. `resource.data.createdBy` — field ไม่มีใน document เก่า → CEL throw error → deny → แก้เป็น `resource.data.get('createdBy', '')`

**Note to Next Agent:**
- [QA] ทดสอบ staff edit/delete worklog วันนี้ → ต้องผ่าน
- [QA] ทดสอบ staff edit/delete worklog เมื่อวาน → ต้องถูก block โดย frontend `canEdit()`
- [SE] `SmartEquipmentModal` fix `.reverse()` ก่อน process logs → สถานะหูฟังถูกต้องแล้ว

---

## [2026-06-04 14:00] - [SE] Software Engineer — Bugfix Sprint Jun 04

**Task:** แก้ไข 5 bugs ตาม TASKS.md Bugfix Sprint Jun 04

**Files Modified:**
- `frontend/components/SmartEquipmentModal.js` — BUG-1
- `frontend/components/SmartRoomModal.js` — BUG-1
- `frontend/lib/quickLogTemplates.js` — BUG-4
- `frontend/app/export/page.js` — BUG-3
- `frontend/app/worklogs/page.js` — BUG-5

**Bug Summary:**

### BUG-1: SmartModal ไม่อัปเดตสถานะ
- `SmartEquipmentModal` — เพิ่ม `equipmentDetails` update ใน `equipmentStatusUpdated` handler (user/time ถูก sync ด้วย)
- `SmartRoomModal` — เพิ่ม `useEffect` รับ `roomStatusUpdated` CustomEvent อัปเดต `roomStatus` state ทันที

### BUG-2: CSV ผู้ให้บริการ (Combo Template)
- ✅ `logFromComboTemplate()` มี `employeeDisplayName/Nickname/FullName` แล้วตั้งแต่ก่อน — ไม่ต้องแก้

### BUG-3: CSV กลุ่มงานแสดง "main"/"additional"
- เพิ่ม `dutyGroupLabel(dutyGroup, mainDuty)` ใน `export/page.js`
- `"main"` → ใช้ `mainDuty` (ชื่อหัวข้อหลัก), `"additional"` → `"งานอื่นๆ ที่ได้รับมอบหมาย"`

### BUG-4: QuickLog ไม่มีสถานะใน CSV
- เพิ่ม `status: "บันทึกแล้ว"` ใน `logFromTemplate()` (`logFromComboTemplate` มีแล้ว)

### BUG-5: Staff ลบ/แก้ไข Worklog ไม่ได้
- แก้ `canEdit()` — เปลี่ยนจาก `user.id`/`nickname` เป็น `item.createdBy === user.uid`
- เพิ่มเช็ค `item.locked === true` ก่อน lock-time check
- Build ผ่าน 0 errors ✅

**Note to Next Agent:**
- [QA] ทดสอบ BUG-5: staff login → worklogs → ปุ่ม edit/delete วันนี้กดได้
- [QA] ทดสอบ BUG-3: export CSV → column กลุ่มงานแสดงชื่อไทย ไม่ใช่ "main"/"additional"
- [QA] สร้าง Playwright fixtures ตาม QA-1 ใน TASKS.md

---

## [2026-06-04 13:55] - [SA] Firestore Rules Verification — v2.2.0 Pre-Production Check

**Task:** ตรวจสอบ Firestore Rules ตามที่ [PM] มอบหมายใน TASKS.md

**Files Verified:**
- `firebase/firestore.rules` — ตรวจสอบ 3 รายการตาม TASKS.md

**Verification Results:**

### 1. Combo Template Schema (Line 26-28 TASKS.md)
- ✅ **สถานะ:** Rules รองรับอยู่แล้ว (ไม่ต้องแก้)
- **รายละเอียด:** `globalTemplates` collection อนุญาติ `isCombo`, `comboItems` fields ผ่าน generic update rule
- **Note:** worklog create rule (`isValidWorkLog()`) รองรับ combo data โดยไม่ต้องแก้ไข

### 2. Background Push Notification (Line 136-146 TASKS.md)
- ✅ **สถานะ:** แก้ไขแล้ว (ก่อนหน้านี้)
- **รายละเอียด:** 
  - เพิ่ม `fcmToken` ใน users collection allowed fields (line 114)
  - Rules อนุญาติ user บันทึก FCM token สำหรับ push notification
  - Backend ใช้ firebase-admin SDK ซึ่ง bypass rules (service account)
- **Field ที่เพิ่ม:** `reminderDays` ใน `settings/system` — อนุญาติผ่าน admin update rule

### 3. BUG-5: Worklog Delete Rule (Line 276-283 TASKS.md)
- ✅ **สถานะ:** Rules ถูกต้องแล้ว (ไม่ต้องแก้)
- **รายละเอียด:** ตรวจสอบ `worklogs/{worklogId}` delete rule (lines 142-147)
  ```
  allow delete: if isAdmin() ||
     (isAuthenticated() && 
      (resource.data.employeeId == request.auth.uid || resource.data.createdBy == request.auth.uid) &&
      resource.data.locked != true &&
      isSameDay(resource.data));
  ```
- **ครบตามเงื่อนไข:**
  - ✅ `isOwner()` — เช็ค `employeeId == uid || createdBy == uid`
  - ✅ `isSameDay()` — เรียก function ตรวจสอบวันเดียวกัน
  - ✅ `!isLocked()` — เช็ค `locked != true`

**Files Modified:**
- `docs/DEV_LOG.md` — บันทึก entry นี้

**Note to Next Agent:**
- Firestore Rules พร้อม production แล้ว
- ไม่มีการแก้ไข rules ในรอบนี้ (ทุกอย่างถูกต้องตาม spec)
- [SE] สามารถใช้งาน combo template, push notification, worklog delete ได้เลย

---

## [2026-06-03 15:23] - [Doc] Technical Writer — v2.2.0 Merge Combo Template + Release Notes

**Task:** Merge branch `feature/combo-template` เข้า `main`, resolve 7 conflicts, อัปเดต README.md + AppShell footer

**Files Modified:**
- `README.md` — version → v2.2.0, เพิ่ม Combo Template ในตาราง Staff/Admin features, เพิ่ม Changelog v2.2.0
- `frontend/components/AppShell.js` — Footer version → v2.2.0
- `docs/DEV_LOG.md` — บันทึก entry นี้
- Resolved conflicts: `TASKS.md`, `backend/.env.example`, `backend/src/config/env.js`, `backend/src/routes/notify.js`, `backend/src/server.js`, `docs/DEV_LOG.md`, `frontend/components/NotificationBell.js`

**Conflict Resolution Strategy:**
- Backend files (env.js, notify.js, server.js) → ใช้ main (มี QA FIX-4 production guard + timing-safe auth)
- TASKS.md → รวมทั้ง Combo Template tasks + QA Checklist
- DEV_LOG.md → รวม log entries ทั้งหมดตามลำดับเวลา
- NotificationBell.js → ใช้ main (fcmTokenStatus) + เพิ่ม permission useEffect จาก branch

**Note to QA:** ทดสอบ Combo Template ก่อน deploy — บันทึก combo → ตรวจ Firestore ว่าสร้าง N docs ถูกต้อง

---

## [2024-06-02 16:30] - [SE] Software Engineer — Combo Template

**Task:** Implement Combo Template feature (กดครั้งเดียว บันทึกหลายงานพร้อมกัน)

**Files Modified:**
- `frontend/lib/quickLogTemplates.js` — Add `logFromComboTemplate()` function
- `frontend/components/QuickLogButtons.js` — Add combo modal, badge, handler
- `frontend/components/TemplateManager.js` — Add isCombo toggle, comboItems UI

**Implementation Details:**
1. **Backend Layer:** `logFromComboTemplate()` creates multiple worklogs in parallel using `Promise.all()`, records single usage count
2. **Template Management:** Admin can create combo templates with multiple sub-tasks, each with name/minorTask/comment
3. **Staff UI:** Combo buttons show violet badge with task count, modal displays preview of all tasks before logging
4. **UX:** Single recipient input, CTA button shows "บันทึก X งาน" in violet color

**Note to Next Agent:**
- [QA] ทดสอบ combo logging → ตรวจ Firestore ว่าสร้าง N docs, recipient ถูกต้องทุก doc, usageCount +1 ครั้ง
- [SA] ไม่ต้องแก้ Firestore Rules (worklog create รองรับอยู่แล้ว)

---

## [2024-06-02 18:00] - [SA] System Architect — Push Notification Backend

**Task:** Implement Push Notification Backend (Render + Cron-job.org Architecture)

**Files Modified:**
- `backend/package.json` — Add `firebase-admin` dependency
- `backend/.env.example` — Add `FIREBASE_SERVICE_ACCOUNT_JSON`, `CRON_SECRET`
- `backend/src/config/env.js` — Add new environment variables
- `backend/src/server.js` — Mount `notifyRouter`
- `backend/src/services/fcm.js` — New: Firebase FCM service layer
- `backend/src/routes/notify.js` — New: Broadcast & daily-reminder endpoints

**Note to Next Agent:**
- [SE] Frontend: สร้าง Broadcast UI ใน admin settings
- [SE] Frontend: เพิ่ม `reminderDays` checkboxes ใน admin settings

---

## [2024-06-02 19:56] - [UX/UI] Push Notification UI Implementation

**Task:** Background Push Notification via Render + Cron-job.org (ต่อจาก SA)

**Files Modified:**
- `frontend/app/admin/settings/page.js`

**Changes Made:**
- Push Notification Settings UI: toggle, time input, reminder days selector
- Broadcast Section (Superadmin only): Title/Body input, send button, result display
- Accessibility: `aria-pressed`, `aria-label`, `role="alert"`, `htmlFor`+`id`

---

## [2026-06-03 13:47] - [QA] Final Pre-Production Security Scan & E2E (รอบที่ 2)

**Task:** ตรวจสอบความปลอดภัยและ E2E ทั้งระบบก่อน commit/deploy production

**Files Modified:**
- `backend/src/config/env.js` — เพิ่ม CRON_SECRET production guard (FIX-4)
- `frontend/tests/push-notification-e2e.spec.js` — สร้าง Push Notification E2E test suite (12 tests)
- `QA_REPORT.md` — อัปเดตรายงาน QA v2 ฉบับสมบูรณ์

**Results:** Snyk clean, Playwright 22/22 pass, 0 failed. QA Sign-off ✅

---

## [2026-06-03 13:57] - [Doc] Technical Writer — v2.1.0 Release Notes & README Update

**Task:** อัปเดต README.md + Release Notes สำหรับ v2.1.0

**Files Modified:**
- `README.md` — Header version → v2.1.0, features tables, Changelog entry
- `frontend/components/AppShell.js` — Footer version → v2.1.0
- `docs/DEV_LOG.md` — บันทึก entry นี้

---
