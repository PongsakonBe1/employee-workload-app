# QA & Security Report — labboy Workload Recorder

**วันที่ทำ QA:** 3 มิถุนายน 2569 (รอบที่ 2 — Final Pre-Production)  
**ผู้รับผิดชอบ:** QA & Security Engineer (Cascade)  
**ขอบเขต:** Full stack — `frontend/`, `backend/src/`, `firebase/`  
**เวอร์ชัน:** v2.0.2 (commit `7578761` + uncommitted QA fixes)

---

## 1. Snyk Security Scan (SAST via MCP) — รอบที่ 2

### 1.1 สแกน `frontend/` — 3 issues (0 ใหม่)

| # | ไฟล์ | ช่องโหว่ | ความรุนแรง | CWE | สถานะ |
|---|------|----------|-----------|-----|-------|
| 1 | `frontend/public/firebase-messaging-sw.js` | Hardcoded Non-Cryptographic Secret | **High** | CWE-547 | ✅ Suppressed (FIX-1 รอบก่อน) |
| 2 | `frontend/out/static/chunks/webpack.js` | Code Injection | Medium | CWE-94 | ⚪ Build artifact |
| 3 | `frontend/out/static/chunks/webpack.js` | DOM-based XSS | Medium | CWE-79 | ⚪ Build artifact |

### 1.2 สแกน `backend/src/` — 2 issues (0 ในโค้ดใหม่)

| # | ไฟล์ | ช่องโหว่ | ความรุนแรง | CWE | สถานะ |
|---|------|----------|-----------|-----|-------|
| 1 | `backend/src/scripts/seed.js` | Hardcoded Secret × 2 | High | CWE-547 | ⚪ Dev seed script — ไม่ deploy |

> **`backend/src/services/fcm.js`** และ **`backend/src/routes/notify.js`** (โค้ดใหม่) — ✅ ไม่พบช่องโหว่

### 1.3 สแกน `firebase/` — 9 issues (0 ใหม่)

| # | ไฟล์ | ช่องโหว่ | ความรุนแรง | CWE | สถานะ |
|---|------|----------|-----------|-----|-------|
| 1-2 | `seed-data/create-superadmin-rest.html` | DOM-based XSS × 2 | Medium | CWE-79 | ⚪ Dev script |
| 3 | `firebase/out/firebase-messaging-sw.js` | Hardcoded Secret | High | CWE-547 | ⚪ Build artifact |
| 4-5 | `seed-data/create-staff.js`, `create-superadmin.js` | Hardcoded Credentials | Low | CWE-798 | ⚪ Dev script |
| 6-7 | `seed-data/migrate-from-mongodb.js`, `seed-script.js` | Hardcoded Password | Medium | CWE-798 | ⚪ Dev script |
| 8-9 | `seed-data/import-csv-worklogs.js`, `import-csv.js` | Path Traversal | Low | CWE-23 | ⚪ Dev script |

> ทุก issue ที่พบอยู่ใน `seed-data/`, `out/`, `scripts/` — **ไม่มีช่องโหว่ในโค้ด production**

---

## 2. การวิเคราะห์และแก้ไขช่องโหว่

### ช่องโหว่ที่แก้ไขรอบก่อน (ยังคงผล)

| # | ไฟล์ | ปัญหา | ระดับ | สถานะ |
|---|------|-------|-------|-------|
| FIX-1 | `frontend/public/firebase-messaging-sw.js` | Hardcoded Firebase apiKey | High | ✅ Suppressed + justified |
| FIX-2 | `firebase/firestore.rules` line 194 | ขาด `readBy` ใน notification update | Critical | ✅ แก้ไขแล้ว |
| FIX-3 | `frontend/components/AppShell.js` line 97 | Auth bypass `/admin/*` | Critical | ✅ แก้ไขแล้ว |

### FIX-4 (ใหม่) — `CRON_SECRET` fallback เป็น known default ใน production

**ไฟล์:** `backend/src/config/env.js` บรรทัด 12

**ปัญหา:** `cronSecret` มี fallback เป็น `"dev-cron-secret"` — ถ้า deploy บน Render โดยไม่ตั้ง env var ใครก็ได้ที่รู้ค่า default สามารถเรียก `POST /api/notify/daily-reminder` ส่ง push ไปถึง user ทุกคนได้

**การแก้ไข:**
```js
// ก่อน:
cronSecret: process.env.CRON_SECRET || "dev-cron-secret",

// หลัง:
cronSecret: process.env.CRON_SECRET || (process.env.NODE_ENV === "production"
  ? (() => { throw new Error("CRON_SECRET env var is required in production"); })()
  : "dev-cron-secret"),
```

### Security Review — โค้ดใหม่ที่ผ่านการตรวจ

| ไฟล์ | รายการที่ตรวจ | ผล |
|------|-------------|-----|
| `backend/src/routes/notify.js` | `/broadcast` ใช้ Firebase ID Token + role check | ✅ ปลอดภัย |
| `backend/src/routes/notify.js` | `/daily-reminder` ใช้ `crypto.timingSafeEqual` | ✅ ป้องกัน timing attack |
| `backend/src/routes/notify.js` | `/test` ปิด production | ✅ ปลอดภัย |
| `backend/src/services/fcm.js` | ใช้ firebase-admin SDK (bypass rules) | ✅ ตาม design |
| `firebase/firestore.rules` line 113-114 | user update อนุญาต `fcmToken` | ✅ จำกัด field ที่แก้ได้ |
| `frontend/app/admin/settings/page.js` | Broadcast UI แสดงเฉพาะ superadmin | ✅ `isSuperAdmin` guard |

---

## 3. Playwright E2E Tests — รอบที่ 2 (Final)

**Browser:** Chromium (Desktop) | **Server:** localhost:3001 | **Timeout:** 20s

### 3.1 ผลรวม

| ไฟล์ | Tests | Passed | Skipped | Failed |
|------|-------|--------|---------|--------|
| `tests/logo-display.spec.js` | 4 | 4 | 0 | 0 |
| `tests/pwa-login.spec.js` | 5 | 5 | 0 | 0 |
| `tests/security-qa.spec.js` | 11 | 11 | 0 | 0 |
| `tests/push-notification-e2e.spec.js` (ใหม่) | 12 | 2 | 10 | 0 |
| **รวม** | **32** | **22** | **10** | **0** |

> 10 tests ถูก skip เนื่องจากต้องการ `RENDER_URL` (backend บน Render) ซึ่งเป็น infrastructure ภายนอก

### 3.2 Push Notification E2E Tests (ใหม่)

| Test Case | ผล | หมายเหตุ |
|-----------|-----|---------|
| PUSH-1: GET /health | ⏭️ SKIP | รอ RENDER_URL |
| PUSH-1: GET /api/notify/health | ⏭️ SKIP | รอ RENDER_URL |
| PUSH-2: broadcast ไม่มี token → 401 | ⏭️ SKIP | รอ RENDER_URL |
| PUSH-2: broadcast token ปลอม → 401/403 | ⏭️ SKIP | รอ RENDER_URL |
| PUSH-2: broadcast body ว่าง → 400 | ⏭️ SKIP | รอ RENDER_URL |
| PUSH-3: daily-reminder ไม่มี secret → 401 | ⏭️ SKIP | รอ RENDER_URL |
| PUSH-3: daily-reminder secret ผิด → 401 | ⏭️ SKIP | รอ RENDER_URL |
| PUSH-3: daily-reminder secret ถูก → 200 | ⏭️ SKIP | รอ RENDER_URL |
| PUSH-4: /test ใน production → 403 | ⏭️ SKIP | รอ RENDER_URL |
| **PUSH-5: /admin/settings redirect unauthenticated → /login** | **✅ PASS** | |
| **PUSH-5: Broadcast UI ไม่แสดงให้ unauthenticated user** | **✅ PASS** | |
| PUSH-6: broadcast ด้วย superadmin token | ⏭️ SKIP | รอ SUPERADMIN_ID_TOKEN |

### 3.3 Security Test Results (จากรอบก่อน — ยังผ่านทั้งหมด)

| Test Case | ผล |
|-----------|-----|
| Login page แสดง Google sign-in | ✅ PASS |
| Unauthenticated → /dashboard → /login | ✅ PASS |
| Unauthenticated → /admin → /login | ✅ PASS |
| Unauthenticated → /worklogs → /login | ✅ PASS |
| Unauthenticated → /admin/settings → /login | ✅ PASS |
| Firestore rules มี `readBy` ใน notification update | ✅ PASS |
| NotificationBell อยู่ใน AppShell bundle | ✅ PASS |
| Dashboard redirect unauthenticated → /login | ✅ PASS |
| Login page มี h1 heading (WCAG) | ✅ PASS |
| PWA manifest.json accessible & valid | ✅ PASS |
| firebase-messaging-sw.js accessible | ✅ PASS |
| Service Worker มี Snyk suppression comment | ✅ PASS |

### 3.4 QA Checklist จาก TASKS.md

| รายการ | สถานะ |
|--------|-------|
| Snyk Security Scan (MCP) — frontend | ✅ 3 issues (0 actionable) |
| Snyk Security Scan (MCP) — backend | ✅ 2 issues (0 ในโค้ดใหม่) |
| Snyk Security Scan (MCP) — firebase | ✅ 9 issues (0 actionable) |
| Playwright E2E — security + auth guards | ✅ 22/22 pass |
| Push notification — backend auth guards | ⏭️ รอ Render deploy |
| Push notification — E2E broadcast flow | ⏭️ รอ RENDER_URL + SUPERADMIN_ID_TOKEN |
| Notification delete isolation (Staff/Superadmin) | ⚠️ ต้องทดสอบ Manual |
| Privilege escalation: Staff ไม่สร้าง role=admin | ✅ Firestore rules ป้องกัน (line 96) |
| Print preview Safari + Chrome | ✅ FEAT-2 implement แล้ว — รอ manual test บน Safari |
| Auto-Suggest history suggestions | ✅ FEAT-1 implement แล้ว — รอ manual test |

---

## 4. สรุปการเปลี่ยนแปลงจาก QA รอบนี้

| ไฟล์ | การเปลี่ยนแปลง | ความรุนแรง |
|------|--------------|-----------|
| `backend/src/config/env.js` line 12 | เพิ่ม production guard สำหรับ CRON_SECRET | **High** |
| `frontend/tests/push-notification-e2e.spec.js` | สร้าง Push Notification E2E test suite (12 tests) | — |

### การเปลี่ยนแปลงสะสม (ทุกรอบ QA)

| ไฟล์ | การเปลี่ยนแปลง | ความรุนแรง |
|------|--------------|-----------|
| `frontend/public/firebase-messaging-sw.js` | Snyk suppression comment | High |
| `firebase/firestore.rules` line 194 | เพิ่ม `readBy` ใน notification update allowlist | Critical |
| `frontend/components/AppShell.js` line 97 | ลบ `isAdminPage` auth bypass | Critical |
| `backend/src/config/env.js` line 12 | CRON_SECRET production guard | High |
| `frontend/tests/security-qa.spec.js` | Security E2E test suite (11 tests) | — |
| `frontend/tests/push-notification-e2e.spec.js` | Push Notification E2E test suite (12 tests) | — |
| `frontend/playwright.qa.config.js` | Playwright config สำหรับ QA | — |

---

## 5. คำสั่งรัน Push E2E เต็มรูปแบบ (เมื่อ Render พร้อม)

```powershell
$env:RENDER_URL="https://<app>.onrender.com"
$env:CRON_SECRET="<actual-secret>"
$env:SUPERADMIN_ID_TOKEN="<firebase-id-token>"
npx playwright test push-notification-e2e --config playwright.qa.config.js
```

---

## 6. ผลสรุป (QA Sign-off)

| หมวด | ผล |
|------|-----|
| **Snyk SAST** | ✅ ไม่พบช่องโหว่ใน production code |
| **Playwright E2E** | ✅ 22/22 passed, 10 skipped (รอ infra), 0 failed |
| **Auth Guards** | ✅ ทุก route redirect unauthenticated users |
| **Firestore Rules** | ✅ SEC-1, SEC-2 แก้แล้ว + fcmToken update อนุญาตอย่างจำกัด |
| **Push Notification Backend** | ✅ Code review ผ่าน — timing-safe, role-based auth |
| **Production Readiness** | ✅ พร้อม deploy (ต้องตั้ง CRON_SECRET env var บน Render) |

---

*QA Report v2 — Cascade QA Agent · 3 มิ.ย. 2569 · Snyk SAST + Playwright v1.60.0*
