# TASKS.md Plan — labboy Workload Recorder

# Combo Template — กดครั้งเดียว บันทึกหลายงานพร้อมกัน

เพิ่มฟีเจอร์ "Combo Template" ให้ Admin สร้าง template ที่ประกอบด้วยหลาย minorTask แล้ว Staff กดครั้งเดียว กรอก recipient ครั้งเดียว → บันทึก worklogs หลายรายการพร้อมกัน

---

## Use Case จริงที่ต้องการแก้

ปัจจุบัน: นักศึกษา 1 คน มาขอ Authen + Google + SSO → Staff ต้องกด **3 รอบ** + กรอกรหัสนักศึกษา **3 ครั้ง**

หลังแก้: กด Combo "ผูก Account ครบชุด" ครั้งเดียว → กรอกรหัสนักศึกษา **1 ครั้ง** → บันทึก **3 worklogs** พร้อมกัน

**ตัวอย่าง Combo Template "ผูก Account ครบชุด":**
| # | minorTask | mainDuty | comment |
|---|---|---|---|
| 1 | Microsoft Authenticator | บริการข้อมูลสารสนเทศ | เปิดใช้งาน Microsoft Authenticator |
| 2 | ICIT account | บริการข้อมูลสารสนเทศ | เปิดใช้งาน Google Account |
| 3 | ICIT account | บริการข้อมูลสารสนเทศ | เปิดใช้งาน KMUTNB SSO |

*(ชื่องานที่แสดงบนปุ่ม: "ผูก Authen", "Google Account", "KMUTNB SSO" — กำหนดได้ใน `name` ของแต่ละ comboItem)*

---

## Schema Changes — [SA]

**ไฟล์:** `firebase/firestore.rules` — **ไม่ต้องแก้** (worklog create rule รองรับอยู่แล้ว)

เพิ่ม fields ใน `globalTemplates` document:
```javascript
isCombo: boolean,           // true = Combo Template
comboItems: [               // array ของ sub-tasks
  {
    name: string,           // ชื่อแสดงผลของ sub-task นี้
    minorTask: string,
    mainDuty: string,
    dutyGroup: string,
    comment: string         // pre-filled comment สำหรับ sub-task นี้
  }
]
// fields เดิม (minorTask, mainDuty) ยังคงอยู่ — ใช้แสดง summary บนปุ่ม
```

ไม่ต้องสร้าง collection ใหม่ ไม่ต้องแก้ Firestore Rules

---

## Backend / Data Layer — [SA → SE handover]

**ไฟล์:** `frontend/lib/quickLogTemplates.js`

- [ ] เพิ่มฟังก์ชัน `logFromComboTemplate(templateId, userId, extraData)`:
  - อ่าน `template.comboItems` array
  - รัน `Promise.all()` สร้าง worklog หลาย doc พร้อมกัน (แต่ละ item = 1 worklog)
  - ทุก worklog ใช้ `recipient` เดียวกัน (จาก extraData)
  - เพิ่ม `usageCount` ครั้งเดียว (นับ 1 ครั้งต่อการกด ไม่ใช่ต่อ sub-task)

---

## Frontend — [SE] (Combo Template)

### 1. `frontend/lib/quickLogTemplates.js`
- [x] เพิ่ม `logFromComboTemplate()` ฟังก์ชัน

### 2. `frontend/components/QuickLogButtons.js`
- [x] เพิ่ม detect `template.isCombo === true` ใน `handleQuickLog()`
- [x] Combo template → เปิด `showComboModal` (modal ใหม่)
- [x] เพิ่ม state: `showComboModal`, handler: `handleLogCombo(recipient)`
- [x] แสดง badge "combo" บนปุ่ม (สีม่วง + จำนวนงาน)
- [x] หลัง log สำเร็จ: success message บอกจำนวนงานที่บันทึก

### 3. `frontend/components/TemplateManager.js`
- [x] เพิ่ม toggle `isCombo` ในฟอร์มสร้าง/แก้ไข template
- [x] เมื่อ `isCombo = true`: ซ่อน minorTask selector เดี่ยว → แสดง UI เพิ่ม sub-tasks (dynamic list)
- [x] แสดง badge "Combo (N งาน)" ในรายการ templates

---

## QA Checklist
- [x] **Snyk Security Scan (MCP)**: สแกนหาช่องโหว่ความปลอดภัยในไฟล์ที่เพิ่งอัปเดต
- [x] รัน Playwright E2E tests หลัง SEC-1 deploy rules ใหม่
- [ ] ทดสอบ Combo Template: บันทึก combo → ตรวจ Firestore ว่าสร้าง N docs, recipient ถูกต้องทุก doc, usageCount +1 ครั้ง
- [ ] ทดสอบ Notification delete: Staff ลบ → superadmin ยังเห็น notification
- [ ] ทดสอบ Notification delete: Superadmin ลบ → staff ยังเห็น notification
- [x] ทดสอบ privilege escalation: Staff ไม่สามารถสร้าง user role = admin
- [ ] ทดสอบ Print preview บน Safari (iOS PWA) และ Chrome
**ผู้รับผิดชอบ:** QA (รันเครื่องมือ Snyk ผ่าน MCP และ Playwright)


# Background Push Notification via Render + Cron-job.org

เพิ่มความสามารถส่ง push notification ไปถึง Android/iOS ขณะปิดแอป โดยใช้ Render free tier เป็น server + Cron-job.org ping ป้องกัน sleep ฟรี $0/เดือน

---

## Architecture

```
[Superadmin กด Broadcast ใน UI]
        │
        ▼
POST /api/notify/broadcast  (Render — Express backend)
        │
        ▼
firebase-admin อ่าน fcmToken จาก users collection
        │
        ▼
FCM REST API  sendEachForMulticast()
        │
        ▼
Android / iOS / Desktop (Service Worker แสดง notification)

─────────────────────────────────

[Cron-job.org]  ทุก 14 นาที
        │
        ▼
GET /health  (ping ป้องกัน Render sleep)

[Cron-job.org]  ทุกวันจันทร์-เสาร์ ตามเวลาที่ admin ตั้งใน Settings
        │
        ▼
POST /api/notify/daily-reminder
        │
        ▼
backend อ่าน reminderTime จาก Firestore settings/system
        → เช็คว่า user แต่ละคนมี worklog วันนี้หรือยัง
        → ส่ง push เฉพาะคนที่ยังไม่ได้ลง
```

---

## งานแต่ละตำแหน่ง

### [SA] — ไม่ต้องแก้ Firestore Rules

ยืนยันว่า:
- `users/{uid}.fcmToken` มีอยู่แล้ว ✅
- `settings/system.reminderTime` มีอยู่แล้ว ✅
- Firestore Rules สำหรับ backend ใช้ **firebase-admin SDK** ซึ่ง bypass rules โดย default ✅

เพิ่ม field ใน `settings/system`:
```
reminderDays: ["mon","tue","wed","thu","fri"]  // วันที่ส่ง reminder
```

---

### [SE] — Backend (3 ไฟล์ใหม่ + แก้ 1 ไฟล์)

**1. `backend/src/services/fcm.js`** — Firebase Admin + FCM helper
- Init `firebase-admin` ด้วย Service Account (env var)
- `sendToTokens(tokens, title, body, data)` — wrap `sendEachForMulticast()`
- `getAllFCMTokens()` — อ่าน users collection ดึง fcmToken ที่ไม่ null
- `getUsersWithoutTodayLog(date)` — query worklogs เช็คว่าใครยังไม่ลง

**2. `backend/src/routes/notify.js`** — 2 endpoints
- `POST /api/notify/broadcast` — รับ `{title, body}` จาก superadmin → ส่งทุก user ที่มี token
  - Auth: ตรวจ Firebase ID token header (`Authorization: Bearer <idToken>`) เช็ค role superadmin
- `POST /api/notify/daily-reminder` — เรียกโดย Cron-job.org พร้อม secret key
  - Auth: `x-cron-secret` header ตรงกับ env var `CRON_SECRET`
  - อ่าน `reminderTime` + `reminderDays` จาก Firestore
  - เช็คว่าวันนี้อยู่ใน reminderDays หรือไม่
  - ส่ง push เฉพาะ user ที่ยังไม่มี worklog วันนี้

**3. `backend/.env.example`** — เพิ่ม vars ใหม่
```
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
CRON_SECRET=replace-with-random-secret
```

**4. `backend/src/server.js`** — mount route ใหม่
```js
import { notifyRouter } from "./routes/notify.js";
app.use("/api/notify", notifyRouter);
```

---

### [SE] — Frontend (แก้ 2 ไฟล์)

**1. `frontend/app/admin/settings/page.js`**
- เพิ่ม section "การแจ้งเตือน Push (Background)"
- `reminderDays` checkboxes: จันทร์–อาทิตย์ (default จ-ศ)
- บันทึกลง `settings/system` ใน Firestore

**2. เพิ่ม Broadcast UI ใน `frontend/app/admin/system/page.js` หรือ `settings/page.js`**
- Input: `title` + `body` (textarea)
- ปุ่ม "ส่ง Push Notification ทุกคน"
- เรียก `POST /api/notify/broadcast` พร้อม Firebase ID token
- แสดง toast: "ส่งแล้ว X คน"

---

## Setup ขั้นตอน Deploy (ทำครั้งเดียว)

1. **Firebase Console** → Project Settings → Service Accounts → Generate new private key → ได้ JSON
2. **Render.com** → New Web Service → connect GitHub → set env vars (`FIREBASE_SERVICE_ACCOUNT_JSON`, `CRON_SECRET`)
3. **Cron-job.org** → สร้าง 2 jobs:
   - Ping: `GET https://<render-url>/health` ทุก 14 นาที
   - Reminder: `POST https://<render-url>/api/notify/daily-reminder` + header `x-cron-secret` ตามเวลาที่ต้องการ (admin ตั้งเวลาใน Settings แอป แต่ Cron-job.org ต้องตั้งเวลาตรงกัน)

> **หมายเหตุ:** เวลา reminder ใน Cron-job.org ต้องตรงกับที่ admin ตั้งในแอป — backend จะ double-check กับ `reminderTime` ใน Firestore อีกทีก่อนส่ง

---

## Dependencies ที่ต้องเพิ่ม

```json
// backend/package.json
"firebase-admin": "^12.0.0"
```

---

## สรุปไฟล์ที่แก้/สร้างใหม่

| ไฟล์ | การเปลี่ยนแปลง |
|---|---|
| `backend/src/services/fcm.js` | ใหม่ — Firebase Admin + FCM helpers |
| `backend/src/routes/notify.js` | ใหม่ — broadcast + daily-reminder endpoints |
| `backend/src/server.js` | แก้ — mount notifyRouter |
| `backend/.env.example` | แก้ — เพิ่ม FIREBASE vars |
| `frontend/app/admin/settings/page.js` | แก้ — เพิ่ม reminderDays + Broadcast UI |
