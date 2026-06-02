# QA & Security Report — labboy Workload Recorder

**วันที่ทำ QA:** 2 มิถุนายน 2569  
**ผู้รับผิดชอบ:** QA & Security Engineer (Cascade)  
**ขอบเขต:** `firebase/firestore.rules`, `frontend/components/NotificationBell.js`, `frontend/app/dashboard/page.js`

---

## 1. Snyk Security Scan (SAST via MCP)

### 1.1 สแกน `frontend/`

| # | ไฟล์ | ช่องโหว่ | ความรุนแรง | CWE | สถานะ |
|---|------|----------|-----------|-----|-------|
| 1 | `frontend/public/firebase-messaging-sw.js` | Hardcoded Non-Cryptographic Secret | **High** | CWE-547 | ✅ แก้ไขแล้ว |
| 2 | `frontend/out/static/chunks/webpack.js` | Code Injection | Medium | CWE-94 | ⚪ Build artifact — ข้าม |
| 3 | `frontend/out/static/chunks/webpack.js` | DOM-based XSS | Medium | CWE-79 | ⚪ Build artifact — ข้าม |
| 4 | `frontend/out/firebase-messaging-sw.js` | Hardcoded Non-Cryptographic Secret | High | CWE-547 | ⚪ Build artifact — ข้าม |

### 1.2 สแกน `firebase/`

| # | ไฟล์ | ช่องโหว่ | ความรุนแรง | CWE | สถานะ |
|---|------|----------|-----------|-----|-------|
| 1-2 | `firebase/seed-data/create-superadmin-rest.html` | DOM-based XSS × 2 | Medium | CWE-79 | ⚪ Dev script — ข้าม |
| 3 | `firebase/out/firebase-messaging-sw.js` | Hardcoded Secret | High | CWE-547 | ⚪ Build artifact — ข้าม |
| 4 | `firebase/seed-data/create-staff.js` | Hardcoded Credentials | Low | CWE-798 | ⚪ Dev seed script — ข้าม |
| 5 | `firebase/seed-data/create-superadmin.js` | Hardcoded Credentials | Low | CWE-798 | ⚪ Dev seed script — ข้าม |
| 6 | `firebase/seed-data/migrate-from-mongodb.js` | Hardcoded Password | Medium | CWE-798, CWE-259 | ⚪ Dev script — ข้าม |
| 7 | `firebase/seed-data/seed-script.js` | Hardcoded Password | Medium | CWE-798, CWE-259 | ⚪ Dev script — ข้าม |
| 8 | `firebase/seed-data/import-csv-worklogs.js` | Path Traversal | Low | CWE-23 | ⚪ Dev script — ข้าม |
| 9 | `firebase/seed-data/import-csv.js` | Path Traversal | Low | CWE-23 | ⚪ Dev script — ข้าม |

> ช่องโหว่ใน `seed-data/` และ `out/` เป็น dev tools และ build artifacts ที่ไม่ deploy ไป production

---

## 2. การวิเคราะห์และแก้ไขช่องโหว่

### FIX-1 — Hardcoded Firebase apiKey ใน Service Worker (High · CWE-547)

**ไฟล์:** `frontend/public/firebase-messaging-sw.js`

**ปัญหา:** Snyk ตรวจพบ Firebase `apiKey` ถูก hardcode ในไฟล์ Service Worker

**การวิเคราะห์:** Firebase `apiKey` คือ **public project identifier** ไม่ใช่ secret — Firebase กำหนดให้ฝังใน client-side code, access ควบคุมโดย Firestore Security Rules + Authorized Domains ใน Firebase Console อีกทั้ง Service Worker ไม่มีสิทธิ์เข้าถึง `process.env` จึงไม่สามารถใช้ env vars ได้

**การแก้ไข:** เพิ่ม Snyk suppression comment พร้อม justification ก่อน `firebase.initializeApp()`

---

### FIX-2 — Firestore Rule ขาด `readBy` field ใน notification update (Critical · Runtime Bug)

**ไฟล์:** `firebase/firestore.rules` บรรทัด 194

**ปัญหา:** `NotificationBell.js` ใช้ `updateDoc(..., { readBy: arrayUnion(uid) })` สำหรับ broadcast soft-delete แต่ Firestore rule อนุญาตเฉพาะ `['read', 'readAt']` ทำให้ทุก call จาก `markAsRead()` และ `deleteNotification()` บน broadcast notifications fail ด้วย `permission-denied`

**การแก้ไข:**
```
// ก่อน:
.hasOnly(['read', 'readAt'])
// หลัง:
.hasOnly(['read', 'readAt', 'readBy'])
```

---

### FIX-3 — Auth Guard Bug: `/admin/*` ไม่ redirect unauthenticated users (Critical · Auth Bypass)

**ไฟล์:** `frontend/components/AppShell.js` บรรทัด 97

**ปัญหา:** พบโดย Playwright E2E test — `AppShell` มีเงื่อนไข `isAdminPage` ที่ข้ามการ redirect เมื่อ unauthenticated user เข้า `/admin/*` ทำให้เห็นหน้า Admin UI ได้โดยไม่ login (แม้ Firestore rules ป้องกันข้อมูล แต่ UI exposed)

**การแก้ไข:**
```js
// ก่อน (bug) — ข้าม redirect เมื่อเป็น /admin:
const isAdminPage = pathname?.startsWith("/admin");
if (!isAdminPage && !isLoginPage) { router.replace("/login"); }

// หลัง (fixed) — redirect ทุก route ยกเว้น /login:
if (!isLoginPage) { router.replace("/login"); }
```

---

## 3. Playwright E2E Tests

**Browser:** Chromium (Desktop) | **Server:** localhost:3001 | **Timeout:** 20s

### 3.1 ผลรวม

| ไฟล์ | Tests | Passed | Failed |
|------|-------|--------|--------|
| `tests/logo-display.spec.js` | 4 | 4 | 0 |
| `tests/pwa-login.spec.js` | 5 | 5 | 0 |
| `tests/security-qa.spec.js` (ใหม่) | 11 | 11 | 0 |
| **รวม** | **20** | **20** | **0** |

### 3.2 Security Test Results

| Test Case | ผล | หมายเหตุ |
|-----------|-----|---------|
| Login page แสดง Google sign-in | ✅ PASS | |
| Unauthenticated → /dashboard → /login | ✅ PASS | |
| Unauthenticated → /admin → /login | ✅ PASS | พบ FIX-3 ก่อน fix แล้วผ่าน |
| Unauthenticated → /worklogs → /login | ✅ PASS | |
| Firestore rules มี `readBy` ใน notification update | ✅ PASS | |
| NotificationBell อยู่ใน AppShell bundle | ✅ PASS | |
| Dashboard redirect unauthenticated → /login | ✅ PASS | |
| Login page มี h1 heading (WCAG) | ✅ PASS | |
| PWA manifest.json accessible & valid | ✅ PASS | |
| firebase-messaging-sw.js accessible | ✅ PASS | |
| Service Worker มี Snyk suppression comment | ✅ PASS | |

### 3.3 QA Checklist จาก TASKS.md

| รายการ | สถานะ |
|--------|-------|
| Snyk Security Scan (MCP) | ✅ เสร็จแล้ว |
| Playwright E2E หลัง rules update | ✅ 20/20 pass |
| Notification delete isolation (Staff/Superadmin) | ⚠️ ต้องทดสอบ Manual ด้วย Firebase Emulator + real accounts |
| Privilege escalation: Staff ไม่สร้าง role=admin | ⚠️ ต้องทดสอบ Manual — Firestore rule ป้องกันแล้วในโค้ด |
| Print preview Safari + Chrome | ⚠️ รอ FEAT-2 implement |
| Auto-Suggest history suggestions | ⚠️ รอ FEAT-1 implement |

---

## 4. สรุปการเปลี่ยนแปลง

| ไฟล์ | การเปลี่ยนแปลง | ความรุนแรง |
|------|--------------|-----------|
| `frontend/public/firebase-messaging-sw.js` | เพิ่ม Snyk suppression comment | High |
| `firebase/firestore.rules` line 194 | เพิ่ม `'readBy'` ใน notification update allowlist | Critical |
| `frontend/components/AppShell.js` line 97 | ลบ `isAdminPage` exception ใน auth guard | Critical |
| `frontend/tests/security-qa.spec.js` | สร้าง Security E2E test suite ใหม่ (11 tests) | — |
| `frontend/playwright.qa.config.js` | สร้าง Playwright config สำหรับ QA (no webServer) | — |

---

*รายงานนี้ generate โดย Cascade QA Agent · Snyk MCP v1.x + Playwright v1.60.0 · Next.js dev server localhost:3001*
