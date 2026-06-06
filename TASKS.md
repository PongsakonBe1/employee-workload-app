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

---

# Bugfix Sprint — Jun 04

แก้ไข 5 bugs จาก CSV audit + เพิ่ม Playwright Auth State Injection

**Branch:** `hotfix/bugfix-sprint-jun04`

---

## BUG-1: SmartModal ไม่อัปเดตสถานะ — [SE]

**Root cause:** `SmartEquipmentModal` และ `SmartRoomModal` ไม่รับ `CustomEvent` (`equipmentStatusUpdated`, `roomStatusUpdated`) ที่ QuickLogButtons dispatch หลังบันทึก

**ไฟล์:**
- [ ] `frontend/components/SmartEquipmentModal.js` — เพิ่ม `useEffect` รับ `equipmentStatusUpdated` event อัปเดต `equipmentStatus` + `equipmentDetails` state
- [ ] `frontend/components/SmartRoomModal.js` — เพิ่ม `useEffect` รับ `roomStatusUpdated` event อัปเดต `roomStatus` state

---

## BUG-2: CSV ผู้ให้บริการแสดง uid แทนชื่อ (Combo Template) — [SE]

**Root cause:** `logFromComboTemplate()` ไม่ได้ set `employeeDisplayName`

**ไฟล์:**
- [ ] `frontend/lib/quickLogTemplates.js` — เพิ่ม `employeeDisplayName`, `employeeNickname`, `employeeFullName` ใน worklogData ของแต่ละ comboItem

---

## BUG-3: CSV กลุ่มงานแสดง "main"/"additional" แทนชื่อไทย — [SE]

**Root cause:** `export/page.js` ใช้ raw `log.dutyGroup` โดยตรง

**ไฟล์:**
- [ ] `frontend/app/export/page.js` — เพิ่ม `dutyGroupLabel(dutyGroup, mainDuty)` function และแทนที่ในการ map rows:
  - `"main"` → ใช้ `mainDuty`
  - `"additional"` → `"งานอื่นๆ ที่ได้รับมอบหมาย"`

---

## BUG-4: QuickLog / Combo ไม่มีสถานะใน CSV — [SE]

**Root cause:** `logFromTemplate()` และ `logFromComboTemplate()` ไม่ set field `status`

**ไฟล์:**
- [ ] `frontend/lib/quickLogTemplates.js` — เพิ่ม `status: "บันทึกแล้ว"` ใน `logFromTemplate()` และ `logFromComboTemplate()`

---

## BUG-5: Staff ลบ/แก้ไข Worklog ของตัวเองในวันนั้นไม่ได้ — [SA] + [SE]

**Root cause:** ต้องตรวจ 2 จุด — Firestore Rules `delete` rule + frontend disable logic

**ไฟล์:**
- [ ] **[SA]** `firebase/firestore.rules` — ตรวจ `worklogs delete` rule: staff ควรลบได้เมื่อ `isOwner() && isSameDay() && !isLocked()`
- [ ] **[SE]** `frontend/app/worklogs/page.js` — ตรวจและแก้ไข logic ที่ disable ปุ่ม edit/delete สำหรับ staff

---

## QA-1: Playwright Auth State Injection — [QA]

**ไฟล์:**
- [ ] `frontend/tests/fixtures/auth-states/superadmin.json` — `pongsakon.be1@gmail.com`, displayName: `"Admin"`, role: `"superadmin"`
- [ ] `frontend/tests/fixtures/auth-states/staff.json` — `pongsagon.r@icit.kmutnb.ac.th`, displayName: `"พงศกร"`, role: `"staff"`
- [ ] `playwright.config.js` หรือ test fixtures — ใช้ `storageState` จาก JSON ข้างต้น
- [ ] เขียน test BUG-5: staff login → worklog list → ปุ่มลบ/แก้ไขวันนี้กดได้

---

## ลำดับส่งไม้ต่อ

`[SA]` ตรวจ Rules → `[SE]` แก้ทุก bug (BUG-1 ถึง BUG-5 frontend) → `[QA]` สร้าง fixtures + test

## Commit Convention

```
hotfix(quicklog): add employeeDisplayName and status to combo/template worklogs
hotfix(export): map dutyGroup raw key to Thai label in CSV
hotfix(modal): sync SmartEquipmentModal/SmartRoomModal with CustomEvents
hotfix(rules): allow staff to delete own same-day unlocked worklogs
test(playwright): add auth state injection for superadmin and staff roles
```

---

# v2.3.0 Rollback & Re-plan — PM Decision Log

**สถานะ:** v2.3.0 ถูก rollback กลับ production v2.2.1
**วันที่:** 2026-06-05
**Branch ใหม่:** `feature/v230-replan`

## สาเหตุ Rollback

1. **SmartEquipmentModal double-borrow bug** — กดครั้งที่ 2 ไม่เป็นการ "คืน" แต่เป็นการ "ยืมซ้ำ" → logic action detection ผิด
2. **EquipmentReturnModal ไม่มี** — EH-4 ยังไม่ implement
3. **Seasonal Pattern กราฟสีเดียว + พยากรณ์ผิด** — FU-2, FU-3 ยังไม่แก้
4. **Radar อยู่แยก page** — user หาไม่เจอ

---

## ITEM-1: SmartEquipmentModal — Double-Borrow Bug + Equipment Condition Flow — [SE] 🔴

**Root cause:** `SmartEquipmentModal` ใช้ `templateMinorTask` (เช่น "ยืมหูฟัง") ตายตัวจาก template — ไม่ได้ดู current status ของอุปกรณ์ที่เลือกว่า `in_use` อยู่หรือเปล่า ก่อนตัดสินว่าเป็น "ยืม" หรือ "คืน"

**Flow ที่ถูกต้อง (v2.3.0):**

```
ครั้งแรก (สถานะ available):
  เลือกอุปกรณ์ → กรอก recipient → กด "ยืม ICIT01" → บันทึก minorTask="ยืมหูฟัง" ✅

ครั้งที่ 2 (สถานะ in_use):
  เลือก ICIT01 → modal แสดงตัวเลือกสภาพ [✓ สมบูรณ์ / ชำรุด / สูญหาย] (default: สมบูรณ์)
  → กด "คืน ICIT01 — สมบูรณ์" → บันทึก minorTask="คืนหูฟัง" + equipmentCondition="normal" ✅
```

**หมายเหตุสำคัญ:**
- `equipmentCondition` เก็บใน `worklog.equipmentCondition` — **ไม่แสดงในประวัติงาน Staff**
- สถานะสภาพแสดงใน `RoomEquipmentStatus` panel และ `SmartEquipmentModal` (badge "ชำรุด !")
- อุปกรณ์ชำรุด/สูญหาย → แสดงใน modal ว่า "ยืมไม่ได้ — ชำรุด" และ lock ปุ่มยืม

**งาน [SE]:**
- [ ] แก้ `SmartEquipmentModal.js` — `handleConfirm()`: ดู `equipmentStatus[selectedEquipment]` ก่อน ถ้า `in_use` → action = "คืน" (เรียก `EquipmentReturnInlineSection`) ถ้า `available` → action = "ยืม" (flow เดิม)
- [ ] เพิ่ม inline condition section ใน `SmartEquipmentModal.js` ตอน action = คืน (ไม่ต้องสร้าง component ใหม่แยก — ฝังใน Modal เดิม):
  ```
  [✓] สมบูรณ์  [ ] ชำรุด  [ ] สูญหาย
  (ถ้าเลือก "ชำรุด" → แสดง text input "โน้ตสั้น (ไม่เกิน 200 ตัวอักษร)")
  ```
- [ ] บันทึก `equipmentCondition: "normal"|"damaged"|"lost"` + `equipmentNote?: string` ใน worklog document
- [ ] แก้ `RoomEquipmentStatus.js` — แสดง badge สภาพอุปกรณ์: ถ้า `equipmentCondition === "damaged"` หรือ `"lost"` → แสดง indicator สีส้ม/แดง บน equipment item
- [ ] แก้ `SmartEquipmentModal.js` — อุปกรณ์ที่ `equipmentCondition === "damaged"` หรือ `"lost"` → disable ปุ่มยืม + แสดง tooltip "ยืมไม่ได้ — ชำรุด/สูญหาย"

**งาน [SA]:**
- [ ] อัปเดต `firebase/firestore.rules` — อนุญาต write fields `equipmentCondition`, `equipmentNote` ใน worklog create + update rule

*Note to SE: ตรวจสอบข้อมูล `equipmentCondition` จาก worklogs วันนี้ใน `calculateStatusFromWorklogs()` เพื่อ derive สถานะอุปกรณ์*

---

## ITEM-2: Seasonal Pattern — สีกราฟ + สูตรพยากรณ์ — [DA] + [SE] 🟠

**งาน [DA]:**
- [x] ตรวจสอบ `analyzeSeasonalPattern()` + **แก้ไขปฏิทิน มจพ 2569/2570** ตามเอกสารจริง:
  - ✅ **ปริญญาตรี/ปวช (default):** เปิด มิ.ย. 2569 → สอบกลาง ส.ค. → สอบปลาย ต.ค. → เปิดภาค 2 พ.ย. → สอบกลาง ม.ค. 2570 → สอบปลาย มี.ค. 2570
  - ✅ **TGGS/นานาชาติ:** เปิด ส.ค. 2569 → สอบกลาง ก.ย.-ต.ค. → สอบปลาย พ.ย.-ธ.ค. → เปิดภาค 2 ม.ค. 2570 → สอบกลาง มี.ค. → สอบปลาย พ.ค. 2570
  - ✅ รองรับ 3 levels: `bachelor` (default), `vocational`, `tggs`/`international`
- [x] แก้ `predictNextPeak()` ใน `frontend/lib/analytics.js`:
  - ✅ เพิ่ม cap 6 เดือน: `Math.min(monthsAhead, 6)` + returns `{ confidence: "low", reason: "limited_data_use_academic_calendar" }`
  - ✅ ถ้า `yearsOfData === 1` → ใช้ academic period ถัดไป (exam/opening) แทนการกระโดดปีหน้า
- [x] เขียน unit test ใน `analytics.test.js` สำหรับ cap 6 เดือน + academic fallback ✅
  - *Files:* `frontend/lib/analytics.js`, `frontend/lib/analytics.test.js`
  - *Tests:* 16 suites, 60+ test cases (KMUTNB calendar, 6-month cap, TGGS support)

**งาน [SE]:**
- [ ] แก้ `PERIOD_COLORS` ใน `frontend/lib/academicCalendar.js`:
  - `peak/exam` → `#be123c` (rose-700)
  - `active/semester` → `#3730a3` (indigo-700)
  - `low/break` → `#475569` (slate-600)
- [ ] แก้ `SeasonalPatternChart` ใน `frontend/components/SeasonalCharts.js` — เพิ่ม `opacity={0.85}` บน Bar + `maxBarSize={48}` ให้กราฟดูสวยขึ้น

---

## ITEM-3: Staff Profile — Radar + ข้อมูลโปรไฟล์ + ล็อค displayName — [SE] + [SA] 🟡

### 3A: ล็อค displayName — staff แก้เองไม่ได้

**งาน [SA]:**
- [ ] แก้ `firebase/firestore.rules` — `users/{uid}` update rule: staff ห้าม write field `displayName` (อนุญาตเฉพาะ admin/superadmin หรือ Cloud Function)

**งาน [SE]:**
- [ ] แก้ profile page (หาไฟล์: `frontend/app/profile` หรือ `frontend/app/dashboard`) — ซ่อน/disable input `displayName` สำหรับ role staff
- [ ] หน้า admin user management (`frontend/app/admin/users` หรือ settings) — เพิ่ม field แก้ `displayName` สำหรับ admin/superadmin เท่านั้น

### 3B: Profile Page เพิ่มข้อมูล (Radar + Stats)

**งาน [SE]:**
- [ ] เพิ่มใน profile page ของแต่ละ user:
  - **Radar Chart** — embed `StaffRadarChart` แสดงคะแนน 6 metrics ของตัวเอง vs team average
  - **Stats Summary** — จำนวนงานเดือนนี้, top 3 minorTask ที่ทำบ่อย, streak วันทำงานติดต่อกัน
  - **Achievement Badges** — เช่น "บันทึก 100 งาน", "ใช้ QuickLog > 80%", "ไม่มีงานค้าง 30 วัน"

*Note to SE: ใช้ `calculateRadarMetrics()` จาก `frontend/lib/staffMetrics.js` (SR-2 ✅) + `getTeamAverage()` ที่มีอยู่แล้ว*

---

## ITEM-4: Dashboard UX — Guide สำหรับ User ทุก Role — [UX/UI] + [SE] 🟡

**ปัญหา:** Admin/Staff ที่ไม่ใช่ DA อาจอ่านกราฟ Seasonal Pattern ไม่เข้าใจ

**งาน [UX/UI]:**
- [x] ออกแบบ legend อธิบาย period สี + popover ⓘ — `docs/DESIGN_SPEC_ITEM4_SeasonalLegend.md` ✅
- [x] ออกแบบ info icon ⓘ พร้อม popover (progressive disclosure, click-outside ปิด, Escape ปิด) ✅

**งาน [SE]:**
- [ ] เพิ่ม `InfoTooltip` component เล็กๆ ถัดจาก title "แพทเทิร์นตามภาคเรียน" อธิบาย:
  - สีแต่ละช่วง = ช่วงเวลาในปีการศึกษา
  - แท่งสูง = งานเยอะ, แท่งเตี้ย = งานน้อย
  - จุดสีส้ม = วันผิดปกติ (Outlier)
- [ ] เพิ่ม empty state ที่ดีขึ้น: ถ้าข้อมูล < 2 เดือน → แสดงข้อความ "กราฟจะแม่นยำขึ้นเมื่อมีข้อมูลสะสม 2 เดือนขึ้นไป"

---

## ลำดับส่งไม้ต่อ (v2.3.0 Re-plan)

| ลำดับ | งาน | Role | เวลา | Dependency |
|---|---|---|---|---|
| 1 | ITEM-1 SA: อัปเดต Firestore rules (equipmentCondition) | **[SA]** | 30 min | — |
| 2 | ITEM-3A SA: ล็อค displayName ใน rules | **[SA]** | 30 min | — |
| 3 | ITEM-2 DA: ตรวจสูตร + แก้ predictNextPeak cap | **[DA]** | 1.5 hr | — |
| 4 | ITEM-1 SE: แก้ SmartEquipmentModal double-borrow + condition inline | **[SE]** | 4 hr | SA #1 |
| 5 | ITEM-2 SE: แก้ PERIOD_COLORS + SeasonalCharts | **[SE]** | 1 hr | DA #3 |
| 6 | ITEM-3A SE: ซ่อน displayName + admin edit | **[SE]** | 2 hr | SA #2 |
| 7 | ITEM-3B SE: Profile page Radar + Stats + Badges | **[SE]** | 4 hr | — |
| 8 | ITEM-4 UX/UI: ออกแบบ tooltip/legend | **[UX/UI]** | 1 hr | — | ✅ |
| 9 | ITEM-4 SE: เพิ่ม InfoTooltip + empty state | **[SE]** | 1 hr | UX/UI #8 |
| 10 | QA: ทดสอบ SmartEquipmentModal flow ยืม→คืน→condition | **[QA]** | 2 hr | SE #4 |
| 11 | QA: ทดสอบ Seasonal + Prediction | **[QA]** | 1 hr | SE #5 |
| 12 | QA: ทดสอบ displayName lock | **[QA]** | 30 min | SE #6 |

## Commit Convention v2.3.0 Re-plan

```
fix(equipment): detect return action from status, add condition selector inline
fix(rules): lock displayName for staff, add equipmentCondition write permission
fix(analytics): cap predictNextPeak to 6 months, use academic period fallback
fix(seasonal): update PERIOD_COLORS to match app theme
feat(profile): embed radar chart and stats summary in user profile page
feat(dashboard): add InfoTooltip and empty state for seasonal section
```
