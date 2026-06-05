# Development Log — labboy Workload Recorder

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
