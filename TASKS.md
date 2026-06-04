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

# Dashboard & Analytics Enhancement — v2.3.0

เพิ่มฟีเจอร์ Analytics 3 Phase + Critical Fixes จาก DA Audit
**Branch:** `feature/dashboard-analytics-v230`
**Timeline:** 3 สัปดาห์ (สมมติ 1 คน/role)
**Phase 4 (System Metrics):** ❌ ตัดออก — ต้องการ Blaze Plan + ยังไม่ upgrade Firebase

---

## Timeline Overview

| สัปดาห์ | Phase | งานหลัก |
|---|---|---|
| **Week 1** | Phase 0 + Phase 1 | Critical Fixes + Equipment Health Tracking |
| **Week 2** | Phase 2 | Seasonal Pattern Analysis |
| **Week 3** | Phase 3 + QA/Doc | Staff Efficiency Radar + ทดสอบและเอกสาร |

---

## Phase 0: Critical Fixes — [SE] 🔴 (Week 1, Day 1-2)

*ต้องทำก่อนเพิ่มฟีเจอร์ใดๆ — ทั้งหมดอยู่ใน `frontend/app/dashboard/page.js`*

- [ ] **CF-1** (30 min) — Fix Heatmap Timezone Bug: `new Date(log.date)` → `new Date(log.date + "T00:00:00")` (บรรทัด 463)
- [ ] **CF-2** (30 min) — Fix Aggregate from Truncated Data: `worklogs.forEach` → `allWorklogsInRange.forEach` (บรรทัด 436)
- [ ] **CF-3** (15 min) — Remove Duplicate Error Display: ลบ error block ซ้ำออก 1 จุด (บรรทัด 783-787 หรือ 816-819)
- [ ] **CF-4** (1 hr) — Fix Leaderboard Query Redundancy: ใช้ `allWorklogsInRange` แทน query Firestore ซ้ำ (บรรทัด 528-548)

**Acceptance:** KPI Card กับ Pie Chart reflect จำนวนเดียวกัน, Heatmap วันจันทร์แสดงข้อมูลจันทร์จริง

---

## Phase 1: Equipment Health Tracking — (Week 1, Day 3-5)

### [SA] Schema + Rules (Day 3, ~1.5 hr)
- [ ] **EH-1** — ออกแบบ schema: เพิ่ม `worklogs.equipmentCondition: enum["normal","damaged","lost"]` + `worklogs.equipmentNote: string`
- [ ] **EH-2** — อัปเดต `firebase/firestore.rules`: อนุญาต write fields ใหม่ใน worklog create/update
  - *Dependency: EH-1 ก่อน*

### [UX/UI] Design (Day 3, ~2 hr, parallel กับ SA)
- [ ] **EH-3** — ออกแบบ EquipmentReturnModal: trigger ตอน "คืนหูฟัง/ปลั๊กไฟ/ปิดห้อง", default [✓] สมบูรณ์, alt [ชำรุด] → text input, max 2 clicks ถ้าปกติ
  - *Pattern: ใช้จาก `SmartEquipmentModal.js`*

### [SE] Implementation (Day 4-5, ~10 hr)
- [ ] **EH-4** (3 hr) — สร้าง `frontend/components/EquipmentReturnModal.js` (new) + เชื่อมจาก `QuickLogButtons.js`
  - *Dependency: EH-3*
- [ ] **EH-7** (3 hr) — สร้าง `frontend/components/EquipmentCharts.js` (new): `EquipmentDamageChart`, `EquipmentHealthTimeline`, `DamageCategoryPie`
- [ ] **EH-6** (4 hr) — สร้าง `frontend/app/admin/equipment-health/page.js` (new): Damage Rate, Timeline, Pie, Export CSV
  - *Dependency: EH-4, EH-7*

### [DA] Backfill (Day 5, ~2 hr, parallel กับ SE)
- [ ] **EH-5** — สร้าง `scripts/backfillEquipmentCondition.js`: parse comment หา "ชำรุด/เสีย/หัก/สูญหาย" → อัปเดต field ย้อนหลัง
  - *Safety: รันบน dev ก่อน + backup ก่อน production*

### [QA] Test (Day 5 EOD, ~2 hr)
- [ ] **EH-8** — ทดสอบ: ยืม→คืนปกติ, ยืม→คืน+ชำรุด+โน๊ต, กรองอุปกรณ์ชำรุดบ่อย → บันทึกใน `QA_REPORT.md`

### [Doc] (~1.5 hr, หลัง EH-8 pass)
- [x] **EH-9** — อัปเดต `README.md` + สร้าง `docs/EQUIPMENT_HEALTH.md`

---

## Phase 2: Seasonal Pattern Analysis — (Week 2)

### [DA] Algorithm (Day 1-2, ~4 hr)
- [x] **SP-1** (1 hr) — สร้าง `frontend/lib/academicCalendar.js`: `ACADEMIC_PERIODS` constants ตาม academic calendar
- [x] **SP-2** (2 hr) — สร้าง `frontend/lib/analytics.js`: `analyzeSeasonalPattern()`, `detectOutliers()`, `predictNextPeak()`
- [x] **SP-3** (1 hr) — Outlier detection: วันที่มีงาน > mean + 2×SD → flag
  - *Dependency: SP-2*

### [UX/UI] Design (Day 1-2 parallel, ~2 hr)
- [x] **SP-4** — ออกแบบ Seasonal Dashboard: box plot style, trend arrows (▲▼→), outlier alert cards

### [SE] Implementation (Day 3-4, ~5 hr)
- [x] **SP-5** (3 hr) — สร้าง `frontend/components/SeasonalCharts.js` (new): `SeasonalPatternChart`, `OutlierAlertCard`, `PeakHourPrediction`
  - *Dependency: SP-4*
- [x] **SP-6** (2 hr) — แก้ `frontend/app/dashboard/page.js`: เพิ่ม section "แพทเทิร์นตามภาคเรียน" ใต้ Heatmap
  - *Dependency: SP-5*

### [QA] Validation (Day 5, ~1.5 hr)
- [x] **SP-7** — ตรวจ: ธันวาคม (exam) > พฤษภาคม (break), outlier detection flag วันงาน > 50

### [Doc] (~1 hr, หลัง SP-7 pass)
- [x] **SP-8** — สร้าง `docs/SEASONAL_GUIDE.md`: วิธีอ่านกราฟ, ใช้พยากรณ์ staffing, case study

---

## Phase 3: Staff Efficiency Radar Chart — (Week 3, Day 1-4)

### [DA] Metrics Spec + Functions (Day 1-2, ~4 hr)
- [ ] **SR-1** (2 hr) — สร้าง `docs/STAFF_METRICS_SPEC.md`: 6 metrics (Volume, Versatility, Consistency, Peak Handling, Documentation, Combo Usage)
- [ ] **SR-2** (2 hr) — สร้าง `frontend/lib/staffMetrics.js` (new): `calculateRadarMetrics()`, `normalizeMetric()`, `getTeamAverage()`
  - *Dependency: SR-1*

### [UX/UI] Design (Day 1-2 parallel, ~2 hr)
- [ ] **SR-3** — ออกแบบ Radar Chart: 6 แกน clockwise, fill โปร่งใส opacity 0.3, team average เส้นประเทา, tooltip

### [SE] Implementation (Day 2-4, ~9 hr)
- [ ] **SR-4** (3 hr) — สร้าง `frontend/components/StaffRadarChart.js` (new): Recharts RadarChart, props `data`, `benchmark`, `onCompare`
  - *Dependency: SR-3*
- [ ] **SR-5** (4 hr) — สร้าง `frontend/app/admin/staff-analytics/page.js` (new): radar รายบุคคล, multi-select compare (max 3), ranking table, time range selector
  - *Dependency: SR-4*
- [ ] **SR-6** (2 hr) — เพิ่ม team average benchmark line ใน `StaffRadarChart.js`

### [QA] Metric Accuracy (Day 4-5, ~2 hr)
- [ ] **SR-7** — ตรวจ: คำนวณ consistency ด้วยมือเทียบระบบ, normalization อยู่ใน 0-100, edge case พนักงานใหม่ไม่ error

### [Doc] (~1.5 hr, หลัง SR-7 pass)
- [ ] **SR-8** — สร้าง `docs/STAFF_ANALYTICS_GUIDE.md`: วิธีอ่าน radar, ตัวอย่าง interpretation, ใช้ใน 1-on-1

---

## Phase 4: System Metrics Collection — ❌ ตัดออก (v2.4.0)

**เหตุผล:** ต้องการ Firebase Blaze Plan (Cloud Functions Scheduled Trigger) + SM-2 dependency — เลื่อนไป v2.4.0 เมื่อ upgrade Firebase

*Items: SM-1 ถึง SM-5 รอในไฟล์ `docs/V230_ACTION_ITEMS.md`*

---

## Acceptance Criteria v2.3.0

- [ ] CF-1 ถึง CF-4: Dashboard แสดงข้อมูลถูกต้อง ไม่มี bug จาก DA Audit
- [ ] EH-1 ถึง EH-9: บันทึกสภาพอุปกรณ์ตอนคืนได้ + ดู report ได้
- [ ] SP-1 ถึง SP-8: แสดง seasonal pattern และ outlier detection ได้
- [ ] SR-1 ถึง SR-8: แสดง radar chart ประเมินพนักงาน 6 มิติได้

---

## Resource Summary (ตัด Phase 4 แล้ว)

| Role | Phase 0 | Phase 1 | Phase 2 | Phase 3 | **Total** |
|------|---------|---------|---------|---------|-----------|
| **SE** | 2.25 hr | 10 hr | 5 hr | 9 hr | **26.25 hr** |
| **SA** | — | 1.5 hr | — | — | **1.5 hr** |
| **UX/UI** | — | 2 hr | 2 hr | 2 hr | **6 hr** |
| **DA** | — | 2 hr | 4 hr | 4 hr | **10 hr** |
| **QA** | — | 2 hr | 1.5 hr | 2 hr | **5.5 hr** |
| **Doc** | — | 1.5 hr | 1 hr | 1.5 hr | **4 hr** |
