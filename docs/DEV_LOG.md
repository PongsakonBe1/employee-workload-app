# Development Log — labboy Workload Recorder

---

**[2024-06-02 18:00] - [SA] System Architect:**

**Task:** Implement Push Notification Backend (Render + Cron-job.org Architecture)

**Files Modified:**
- `backend/package.json` — Add `firebase-admin` dependency
- `backend/.env.example` — Add `FIREBASE_SERVICE_ACCOUNT_JSON`, `CRON_SECRET`
- `backend/src/config/env.js` — Add new environment variables
- `backend/src/server.js` — Mount `notifyRouter`
- `backend/src/services/fcm.js` — New: Firebase FCM service layer
- `backend/src/routes/notify.js` — New: Broadcast & daily-reminder endpoints
- `.windsurf/workflows/push-notification-deploy.md` — New: Step-by-step deploy guide

**Implementation Details:**
1. **FCM Service:** `sendToTokens()` ส่ง multicast, `getUsersWithoutTodayLog()` query Firestore
2. **Broadcast Endpoint:** `/api/notify/broadcast` ส่งหาทุก user (รองรับ Firebase Auth verify)
3. **Daily Reminder:** `/api/notify/daily-reminder` ส่งเฉพาะคนที่ยังไม่ลงงาน + double-check เวลา
4. **Health Ping:** `/api/notify/health` สำหรับ Cron-job.org ป้องกัน Render sleep
5. **Security:** Cron secret header validation, Firebase Admin bypasses Firestore Rules

**Deploy Guide Created:** Step-by-step ตั้งค่า Render.com + Cron-job.org

**Note to Next Agent:**
- [DevOps] ต้องตั้งค่า Environment Variables บน Render ก่อน deploy
- [DevOps] สร้าง 2 cron jobs บน cron-job.org (health ping + daily reminder)
- [SE] Frontend: สร้าง Broadcast UI ใน admin settings (เรียก `/api/notify/broadcast`)
- [SE] Frontend: เพิ่ม `reminderDays` checkboxes ใน admin settings

---

**[2024-06-02 16:30] - [SE] Software Engineer:**

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
- [UX/UI] ตรวจสอบสี violet (bg-violet-100/text-violet-700) ตรงตาม Design System
- [QA] ทดสอบ combo logging → ตรวจ Firestore ว่าสร้าง N docs, recipient ถูกต้องทุก doc, usageCount +1 ครั้ง
- [SA] ไม่ต้องแก้ Firestore Rules (worklog create รองรับอยู่แล้ว)

---
