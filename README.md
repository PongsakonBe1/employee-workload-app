# ICIT Employee Workload Recorder

ระบบบันทึกปริมาณงานสำหรับเจ้าหน้าที่เทคนิค ICIT — สร้างด้วย Next.js + Firebase

**Live:** https://labboy-workload-app.web.app

## Stack

| Layer    | Technology                                            |
| -------- | ----------------------------------------------------- |
| Frontend | Next.js 15 (App Router, Static Export) + Tailwind CSS |
| Database | Firebase Firestore                                    |
| Auth     | Firebase Authentication (Google OAuth)                |
| Hosting  | Firebase Hosting                                      |
| i18n     | next-intl (Thai default)                              |

## Features

### Staff

- บันทึกงานรายวัน (วันที่, เวลา, ผู้รับบริการ, หัวข้อหลัก/รอง, รายละเอียด)
- ดูประวัติงานของตัวเอง
- แก้ไขงานได้ภายในวันที่บันทึก

### Admin

- ดูประวัติงานของพนักงานทุกคน แก้ไข/ลบได้
- Dashboard สรุปปริมาณงานรายเดือน/ปีงบประมาณ
- ส่งออก CSV รายงานปีงบประมาณ (UTF-8 BOM รองรับ Excel ภาษาไทย)
- จัดการผู้ใช้งาน อนุมัติ/ปฏิเสธ user ใหม่
- ระบบแจ้งเตือน (Notification Bell)
- ส่งประกาศหาพนักงานทุกคนหรือรายกลุ่ม

### Superadmin

- ทุกสิทธิ์ของ Admin
- นำเข้าข้อมูล worklogs แบบ bulk (tab-separated paste)
- จัดการระบบ, ดู audit logs, ส่งออก system logs

## Worklog Status

| ค่าในฐานข้อมูล             | แสดงผล         | หมายเหตุ                        |
| -------------------------- | -------------- | ------------------------------- |
| `บันทึกแล้ว` / `completed` | 🟢 บันทึกแล้ว  | default สำหรับงานใหม่และ import |
| `รอดำเนินการ` / `pending`  | 🟡 รอดำเนินการ | งานที่ยังค้างอยู่               |
| `ยกเลิก` / `cancelled`     | 🔴 ยกเลิก      | งานที่ยกเลิก                    |

> ระบบ normalize ค่าภาษาอังกฤษจาก import เก่าให้เป็นภาษาไทยอัตโนมัติ

## User Roles

| Role         | สิทธิ์                                     |
| ------------ | ------------------------------------------ |
| `staff`      | บันทึก/ดูงานของตัวเอง                      |
| `admin`      | ดู/แก้ไข/ลบงานทุกคน + dashboard + export   |
| `superadmin` | ทุกอย่าง + bulk import + system management |

## Quick Start (Local Development)

```bash
cd frontend
cp .env.example .env.local
# ใส่ Firebase config ใน .env.local
npm install
npm run dev
```

เปิดที่ `http://localhost:3000`

### Environment Variables

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

## Testing

ใช้ [Playwright](https://playwright.dev) สำหรับ Gray Box Testing:

```bash
cd frontend
npx playwright test                          # run ทุก tests
npx playwright test --project=chromium      # เฉพาะ Chrome
npx playwright test --project="Mobile Chrome"  # Android viewport
npx playwright test --project="Mobile Safari"  # iOS viewport
```

Tests ครอบคลุม:

- Login page โหลดถูกต้องบน mobile viewport
- Logo แสดงผลถูกต้อง
- Favicon `<link>` tag ถูก inject ใน `<head>`
- PWA manifest เข้าถึงได้และ valid
- ไม่มี redirect loop ตอน unauthenticated
- `matchMedia(display-mode: standalone)` ทำงานบน browser

## Build & Deploy

```bash
# Build static export + copy ไป firebase/out อัตโนมัติ
cd frontend
npm run build

# Deploy to Firebase Hosting
cd ../firebase
firebase deploy --only hosting
```

## Fiscal Year

ปีงบประมาณไทย: 1 ตุลาคม — 30 กันยายน

- FY 2569 / FY 2026 = `2025-10-01` ถึง `2026-09-30`

## PWA Support

รองรับ Add to Home Screen บน iOS และ Android:

- `manifest.json` พร้อม icon และ `display: standalone`
- iOS Standalone: detect ด้วย `window.navigator.standalone === true`
- Android PWA Standalone: detect ด้วย `matchMedia('(display-mode: standalone)').matches`
- ทั้ง iOS และ Android PWA: ใช้ `signInWithRedirect` แทน `signInWithPopup` อัตโนมัติ
- Browser ปกติ: ใช้ `signInWithPopup` (popup flow)

## Project Structure

```
employee-workload-app/
├── frontend/               # Next.js app
│   ├── app/                # Pages (App Router)
│   │   ├── login/
│   │   ├── dashboard/
│   │   ├── worklogs/
│   │   ├── admin/
│   │   └── export/
│   ├── components/         # Shared components
│   ├── lib/                # Firebase, systemLog, utils
│   ├── messages/           # i18n (th.json, en.json)
│   └── public/             # Static assets + manifest.json
└── firebase/
    ├── firestore.rules     # Security rules
    ├── firebase.json       # Hosting config
    └── seed-data/          # Import scripts
```

## Security

สแกนด้วย [Snyk](https://snyk.io) ทุก release:

- **Frontend deps**: ไม่มีช่องโหว่ (0 issues)
- **Firebase Functions deps**: พบ 3 medium issues ใน transitive deps (`protobufjs`, `qs`, `uuid`) — แก้ได้ด้วย `npm update` ใน `firebase/functions`
- **Hosting**: เพิ่ม Security Headers (`X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy`)

## Changelog

| Version | Changes |
| ------- | ------- |
| v1.3.0  | Fix favicon บน browser tab, fix Android+iOS PWA login (signInWithRedirect), security headers |
| v1.2.0  | iOS Standalone PWA fix (signInWithRedirect + manifest.json) |
| v1.1.1  | Fix worklog status normalization (EN→TH), fix dashboard employee filter |
| v1.1.0  | Bulk import worklogs, fix notifications, fix Firestore rules isStaff() |
| v1.0.0  | Initial release |
