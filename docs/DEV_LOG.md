# Development Log — labboy Workload Recorder

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
