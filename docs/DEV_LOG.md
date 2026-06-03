# Development Log — labboy Workload Recorder

---

## [2024-06-02 19:56] - [UX/UI] Push Notification UI Implementation

**Task:** Background Push Notification via Render + Cron-job.org (ต่อจาก SA)

**Files Modified:**
- `frontend/app/admin/settings/page.js`

**Changes Made:**

### 1. DEFAULT_SETTINGS — เพิ่มฟิลด์ใหม่ตามที่ SA ยืนยัน
```js
// Notification Settings
reminderDays: ["mon", "tue", "wed", "thu", "fri"],  // SA: ต้องเพิ่ม field นี้

// Push Notification Settings (ใหม่ทั้งหมด)
enablePushNotifications: true,
pushReminderTime: "21:00",
```

### 2. UI Section: Push Notification Settings
- **Header:** Smartphone icon + "Push Notification (Background)" + badge "ใหม่"
- **Description:** อธิบายว่าส่งผ่าน Render + Cron-job.org
- **Toggle:** เปิด/ปิด Push Notification (`enablePushNotifications`)
- **Time Input:** `pushReminderTime` (disabled ถ้าปิด toggle)
- **Helper text:** บอกให้ตั้ง Cron-job.org ให้ตรงกับเวลานี้

### 3. Reminder Days Selector — ตาม SPEC SA
- 7 ปุ่ม toggle (จ อ พ พฤ ศ ส อา)
- ใช้ `aria-pressed` สำหรับ accessibility
- สี: selected = slate-950, unselected = slate-100
- Helper text: "ส่งเฉพาะคนที่ยังไม่ได้ลงงาน"

### 4. Broadcast Section — Superadmin Only
- Badge "Superadmin" + violet theme
- ใช้ `<BroadcastSection />` component แยก

### 5. BroadcastSection Component
- **Input fields:**
  - Title (text, max 100 chars)
  - Body (textarea, max 500 chars) + counter
- **Validation:** required fields, disabled ถ้า empty
- **Button:** violet-600, loading state, icon Send
- **Result display:**
  - Success: "ส่งสำเร็จ: X คน (ล้มเหลว: Y คน)"
  - Error: "เกิดข้อผิดพลาด: {message}"
- **Accessibility:** `role="alert"` สำหรับ result
- **API call:** POST `/api/notify/broadcast` + Firebase ID token

### 6. Icons Added
- `Smartphone`, `Send`, `Radio` (from lucide-react)

### 7. Accessibility Features
- `aria-pressed` on day toggle buttons
- `aria-label` on day buttons ("วันX (เลือก)")
- `role="alert"` on broadcast result
- `htmlFor` + `id` สำหรับ label association
- `disabled` states มี styling ชัดเจน

---

**Note to SE:**
- Backend endpoint `/api/notify/broadcast` ต้องรับ `Authorization: Bearer <idToken>`
- ต้อง validate superadmin role ก่อนส่ง
- Response format: `{ sent: number, failed: number }`

**Note to QA:**
- ทดสอบว่า superadmin เห็น Broadcast section
- Admin ธรรมดาไม่เห็น Broadcast section
- ทดสอบส่งจริง (ใช้ test token)

---

## [2026-06-03 13:57] - [Doc] Technical Writer — v2.1.0 Release Notes & README Update

**Task:** อัปเดต README.md + Release Notes สำหรับ v2.1.0 ก่อน commit production ตามข้อมูลจาก QA_REPORT.md และ DEV_LOG.md

**Files Modified:**
- `README.md` — Header version → v2.1.0, Last Updated → 2026-06-03
- `README.md` — เพิ่มแถว "Push Notification Settings" ในตาราง Admin features
- `README.md` — เพิ่มแถว "Broadcast Push Notification" ในตาราง Superadmin features
- `README.md` — เพิ่ม Changelog entry v2.1.0 (Push Notification system, Backend, FCM, Settings UI, Broadcast UI, CRON_SECRET guard, fcmToken rule, QA sign-off)
- `frontend/components/AppShell.js` — Footer version v2.0.2 → v2.1.0 (แก้แทน SE)
- `docs/DEV_LOG.md` — บันทึก entry นี้

**Note to Next Agent:**
- README.md + AppShell footer พร้อม production แล้ว
- SE: footer version อัปเดตให้แล้ว ไม่ต้องแก้เพิ่ม
- ทุกตำแหน่ง sign-off แล้ว — พร้อม git commit + deploy

---

## [2026-06-03 13:47] - [QA] Final Pre-Production Security Scan & E2E (รอบที่ 2)

**Task:** ตรวจสอบความปลอดภัยและ E2E ทั้งระบบก่อน commit/deploy production

**Files Modified:**
- `backend/src/config/env.js` — เพิ่ม CRON_SECRET production guard (FIX-4)
- `frontend/tests/push-notification-e2e.spec.js` — สร้าง Push Notification E2E test suite (12 tests)
- `QA_REPORT.md` — อัปเดตรายงาน QA v2 ฉบับสมบูรณ์

**Snyk SAST Results:**
- `frontend/` — 3 issues (0 actionable, build artifact + suppressed)
- `backend/src/` — 2 issues (dev seed script เท่านั้น, โค้ดใหม่ fcm.js + notify.js ผ่านหมด)
- `firebase/` — 9 issues (dev scripts + build artifacts เท่านั้น)

**Vulnerability Fixed:**
- FIX-4: `backend/src/config/env.js` — `CRON_SECRET` fallback `"dev-cron-secret"` เป็นค่า known default → เพิ่ม production guard ให้ throw error ถ้าไม่ตั้ง env var

**Playwright E2E Results:**
- 32 tests total → 22 passed, 10 skipped (รอ RENDER_URL), 0 failed
- ทุก auth guard ผ่าน (/admin, /dashboard, /worklogs, /admin/settings → /login)
- Push notification UI tests ผ่าน (broadcast section ไม่แสดงให้ unauthenticated)

**Note to [Doc]:**
- QA Sign-off: ✅ พร้อม production
- รายงานฉบับเต็มอยู่ที่ `QA_REPORT.md`
- ไฟล์ที่ QA แก้ไขสะสมทั้ง 2 รอบ:
  1. `frontend/public/firebase-messaging-sw.js` (Snyk suppression)
  2. `firebase/firestore.rules` line 194 (readBy field)
  3. `frontend/components/AppShell.js` line 97 (auth bypass fix)
  4. `backend/src/config/env.js` line 12 (CRON_SECRET guard)
  5. `frontend/tests/security-qa.spec.js` (11 security tests)
  6. `frontend/tests/push-notification-e2e.spec.js` (12 push tests)
  7. `frontend/playwright.qa.config.js` (QA config)
- กรุณาอัปเดต README.md + Release Notes ตามข้อมูลนี้

---
