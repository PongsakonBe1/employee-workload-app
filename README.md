# labboy Workload Recorder

ระบบบันทึกภาระงานพนักงาน สำหรับสำนักคอมพิวเตอร์ ICIT มจพ.  
รองรับ PWA, Firebase backend, Google Sign-In และ Quick Log Templates

🌐 **Live:** https://labboy-workload-app.web.app  
📦 **Version:** v1.8.0

---

## สารบัญ

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [โครงสร้างโปรเจ็กต์](#โครงสร้างโปรเจ็กต์)
4. [Firestore Collections](#firestore-collections)
5. [Roles & Permissions](#roles--permissions)
6. [Clone & Setup](#clone--setup)
7. [Deployment](#deployment)
8. [Security](#security)
9. [Changelog](#changelog)

---

## Features

### ทุก Role
- **Google Sign-In** ผ่าน Firebase Auth (redirect บน Android/PC, popup บน iOS standalone)
- **PWA** ติดตั้งเป็น App ได้บน iOS/Android
- **การแจ้งเตือน in-app** ผ่าน Firestore `notifications` collection (real-time via `onSnapshot`)
- **แจ้งเตือนลืมบันทึก** เวลา 22:00+ ถ้ายังไม่มี worklog วันนี้
- **Thai Public Holidays** แสดงในปฏิทิน — ดึงจาก iApp API พร้อม localStorage cache 30 วัน

### Staff
- **บันทึกงาน** ระบุ duty group, หัวข้อหลัก, หัวข้อรอง, เวลา, comment
- **Quick Log Templates** — กดปุ่มเดียวบันทึกงานซ้ำๆ เช่น เปิด/ปิดห้อง, ยืม/คืนหูฟัง, ปลั๊กไฟ
- **Smart Room Modal** — เลือกห้องแลกเปลี่ยนความรู้ (303–306) หรือห้องเรียนชั้น 4 (401–407) พร้อมแสดงสถานะเปิด/ปิดแบบ real-time
- **Smart Equipment Modal** — ติดตามสถานะหูฟัง ICIT01–12 และปลั๊กไฟ ICIT21–23 แบบ real-time
- **Room Equipment Status** — widget แสดงสถานะห้องและอุปกรณ์ทั้งหมดในหน้าบันทึกงาน
- **Comment Suggestions** — แนะนำค่า comment อัตโนมัติตาม minorTask ที่เลือก
- **แก้ไข/ลบ** worklog เฉพาะวันเดียวกัน (lock หลัง 23:59)
- **Undo Delete** ภายใน 30 วินาที
- **Dashboard ส่วนตัว**: งานของฉันในช่วงนี้ + อันดับในกลุ่ม + leaderboard ทีม
- **Calendar view** สลับ List/ปฏิทิน — คลิกวันเพื่อดู worklog ของวันนั้น

### Admin
- **บันทึกงานให้พนักงาน** — เลือก dropdown พนักงานก่อน จากนั้นใช้ form หรือ Quick Log ได้เลย
- **Quick Log ในนาม staff** — log จะบันทึก `employeeId` และชื่อของ staff ที่เลือก
- **จัดการ Quick Log Templates** — เพิ่ม/แก้ไข/ลบ templates ผ่านหน้า System → Templates
- **Dashboard ทีม**: สถิติรวม, เฉลี่ยต่อคน, Top 3 leaderboard, รายชื่อทุกคน
- **Workload Heatmap** + **Hour-of-day chart** — เห็นว่าวันไหน/เวลาไหนงานเยอะ
- **Filter แบบ custom date range** พร้อม quota alert ถ้าช่วง > 90 วัน
- **Export CSV** กรองตามวันที่ / พนักงาน
- **จัดการ users**: อนุมัติ/ปฏิเสธ, เปิด/ปิดใช้งาน

### Superadmin (เพิ่มเติม)
- **แต่งตั้ง Admin → Superadmin** พร้อม confirm modal
- **Broadcast Notification** ส่งประกาศถึง all / staff / admin
- **System Logs** ดู audit log การใช้งานระบบ
- **Bulk Import** worklogs จาก tab-separated text
- อนุมัติคำขอ Admin promotion จาก Admin

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS |
| Charts | Recharts (lazy-loaded via `next/dynamic`) |
| Auth | Firebase Authentication (Google Provider) |
| Database | Cloud Firestore (NoSQL, real-time) |
| Hosting | Firebase Hosting (CDN, custom domain-ready) |
| PWA | `next-pwa`, Web App Manifest, Service Worker |
| Icons | Lucide React |
| i18n | next-intl (TH/EN) |
| Security | Snyk SAST, DOMPurify input sanitization, CSP headers |
| Testing | Playwright (E2E) |

---

## โครงสร้างโปรเจ็กต์

```
employee-workload-app/
├── frontend/                   # Next.js app
│   ├── app/
│   │   ├── dashboard/page.js   # Dashboard หลัก (charts, stats, filter)
│   │   ├── worklogs/
│   │   │   ├── page.js         # รายการ worklogs + calendar view
│   │   │   └── new/page.js     # บันทึกงานใหม่
│   │   ├── export/page.js      # Export CSV
│   │   ├── profile/page.js     # โปรไฟล์ผู้ใช้
│   │   ├── login/page.js       # หน้า Login
│   │   └── admin/
│   │       ├── users/page.js   # จัดการ users
│   │       ├── record/page.js  # Admin บันทึกงาน
│   │       ├── settings/page.js
│   │       ├── audit-logs/page.js
│   │       └── system/page.js
│   ├── components/
│   │   ├── AuthProvider.js     # Firebase Auth context + loginWithGoogle
│   │   ├── AppShell.js         # Layout shell + navigation
│   │   ├── NotificationBell.js # In-app notification (Firestore onSnapshot)
│   │   ├── DashboardCharts.js  # Recharts: Heatmap, HourOfDay, Trend, Pie, Bar
│   │   ├── MinorTaskSelector.js
│   │   └── CommentSuggestions.js
│   ├── lib/
│   │   ├── firebase.js         # Firebase init + googleProvider
│   │   ├── commentSuggestions.js
│   │   ├── thaiHolidays.js     # Thai public holidays (iApp API + localStorage cache + fallback)
│   │   ├── validation.js       # Form validation helpers
│   │   └── systemLog.js        # Audit log helper
│   └── public/
│       ├── manifest.json       # PWA manifest
│       └── sw.js               # Service Worker
├── firebase/
│   ├── firestore.rules         # Firestore security rules
│   ├── firestore.indexes.json  # Composite indexes
│   └── firebase.json           # Hosting + rules config
└── README.md
```

---

## Firestore Collections

### `users/{uid}`
```js
{
  uid: string,
  email: string,           // @icit.kmutnb.ac.th เท่านั้น
  displayName: string,     // ชื่อที่แสดง (แก้ไขได้)
  fullName: string,
  nickname: string,
  role: "staff" | "admin" | "superadmin",
  active: boolean,
  createdAt: Timestamp,
  promotedBy?: string,     // uid ของผู้แต่งตั้ง (ถ้า admin/superadmin)
}
```

### `worklogs/{id}`
```js
{
  date: string,            // "YYYY-MM-DD"
  time: string,            // "HH:MM"
  recipient: string,       // ผู้รับบริการ
  dutyGroup: string,
  mainDuty: string,
  minorTask: string,
  comment: string,
  employeeId: string,      // uid
  employeeDisplayName: string,
  employeeFullName: string,
  employeeNickname: string,
  status: "บันทึกแล้ว" | "รอดำเนินการ" | "ยกเลิก",
  createdAt: Timestamp,
}
```

### `notifications/{id}`
```js
{
  userId: string,          // uid | "all" | "staff" | "admin"
  title: string,
  message: string,
  read: boolean,           // false = ยังไม่อ่าน (ลบเมื่ออ่าน)
  timestamp: Timestamp,
  type?: string,           // "admin_promotion_request" | ฯลฯ
}
```

### `adminPromotionRequests/{id}`
```js
{
  userId: string,          // uid ของ staff ที่ขอเลื่อน
  requestedBy: string,     // uid ของ admin ที่ส่งคำขอ
  status: "pending" | "approved" | "rejected",
  requestedRole: "admin",
  createdAt: Timestamp,
}
```

---

## Roles & Permissions

| การกระทำ | Staff | Admin | Superadmin |
|----------|-------|-------|------------|
| บันทึก worklog ของตัวเอง | ✅ | ✅ | ✅ |
| บันทึก worklog ให้พนักงานคนอื่น | ❌ | ✅ | ✅ |
| Quick Log (ต้องเลือกพนักงานก่อน ถ้าเป็น Admin) | ✅ | ✅ | ✅ |
| แก้ไข/ลบ worklog ของตัวเอง (วันเดียวกัน) | ✅ | ✅ | ✅ |
| แก้ไข/ลบ worklog ของคนอื่น | ❌ | ✅ | ✅ |
| ดู dashboard ส่วนตัว | ✅ | ✅ | ✅ |
| ดู dashboard ทีม / filter ทุกคน | ❌ | ✅ | ✅ |
| Export CSV | ✅ (ของตัวเอง) | ✅ (ทุกคน) | ✅ |
| จัดการ users | ❌ | ✅ | ✅ |
| จัดการ Quick Log Templates | ❌ | ✅ | ✅ |
| ดู System Logs / Broadcast / Import | ❌ | ❌ | ✅ |
| แต่งตั้ง Admin / Superadmin | ❌ | ❌ | ✅ |

---

## Clone & Setup

### 1. Clone repository

```bash
git clone https://github.com/PongsakonBe1/employee-workload-app.git
cd employee-workload-app
```

### 2. สร้าง Firebase Project ใหม่

1. ไปที่ [Firebase Console](https://console.firebase.google.com)
2. สร้าง project ใหม่
3. เปิดใช้งาน:
   - **Authentication** → Google provider
   - **Firestore Database** → เริ่มใน production mode
   - **Hosting**

### 3. ตั้งค่า Firebase config

สร้างไฟล์ `frontend/.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# iApp Thai Holiday API (optional — ถ้าไม่ใส่จะใช้ข้อมูล fallback hardcoded)
# ขอ API key ได้ที่ https://iapp.co.th/control/api-keys
NEXT_PUBLIC_IAPP_HOLIDAY_API_KEY=your_iapp_api_key
```

> ค่า Firebase ได้จาก Firebase Console → Project Settings → Your apps → Web app

> **iApp Holiday API key**: ใช้สำหรับดึงวันหยุดนักขัตฤกษ์ไทยแบบ live จาก [iApp Technology](https://iapp.co.th/docs/data/holiday/thai) — มี localStorage cache 30 วัน ใช้ประมาณ 1 IC/user/ปี ถ้าไม่ใส่ key จะใช้ข้อมูล hardcode 2024–2026 แทน

### 4. ติดตั้ง dependencies

```bash
cd frontend
npm install
```

### 5. ตั้งค่า Firebase CLI

```bash
npm install -g firebase-tools
firebase login
firebase use your_project_id
```

### 6. Deploy Firestore Rules & Indexes

```bash
cd firebase
firebase deploy --only firestore:rules,firestore:indexes
```

### 7. สร้าง Superadmin คนแรก

หลัง login ครั้งแรก จะอยู่สถานะ `pending` — ต้องเข้าไปแก้ Firestore โดยตรง:

1. ไป Firebase Console → Firestore → `users` collection
2. หา document ของตัวเอง (UID จาก Firebase Auth)
3. แก้ฟิลด์ `role` เป็น `"superadmin"` และ `active` เป็น `true`

หลังจากนั้นสามารถอนุมัติ user อื่นผ่านหน้า Admin → Users ได้เลย

### 8. รัน development server

```bash
cd frontend
npm run dev
# เปิด http://localhost:3000
```

### 9. Build & Deploy

```bash
cd frontend
npm run build

cd ../firebase
firebase deploy --only hosting,firestore:rules
```

> **Convention**: ทุกครั้งที่ deploy ให้อัพเดท version ใน `frontend/components/AppShell.js` บรรทัด footer (`v1.x.x`) และ Changelog ใน README พร้อมกันด้วย

---

## Deployment

โปรเจ็กต์ใช้ **Firebase Spark Plan (ฟรีทั้งหมด)**:

| Service | Free Quota |
|---------|-----------|
| Firestore reads | 50,000/วัน |
| Firestore writes | 20,000/วัน |
| Hosting bandwidth | 10 GB/เดือน |
| Auth | ไม่จำกัด |
| Cloud Functions | ❌ ต้องใช้ Blaze plan |

> โปรเจ็กต์นี้ **ไม่ใช้ Cloud Functions** เลย — notification ทำงานผ่าน Firestore `onSnapshot` จาก client โดยตรง

### Deploy commands

```bash
# Build frontend
cd frontend && npm run build

# Deploy hosting + firestore rules
cd ../firebase && firebase deploy --only hosting,firestore:rules

# Deploy ทุกอย่าง
firebase deploy
```

---

## Security

- สแกนด้วย [Snyk](https://snyk.io) ทุก release
- **Frontend deps**: 0 critical/high issues
- **Input sanitization**: DOMPurify บน comment/recipient fields
- **Firestore rules**: role-based read/write, staff แก้ worklog ได้เฉพาะวันเดียวกัน (`isSameDay`)
- **Security headers** บน Firebase Hosting:
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `X-XSS-Protection: 1; mode=block`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=()`

---

## Changelog

| Version | วันที่ | การเปลี่ยนแปลง |
|---------|--------|----------------|
| **v1.8.0** | 2026-05-26 | **Admin Quick Log**: Admin/Superadmin ต้องเลือกพนักงานจาก dropdown ก่อนใช้ Quick Log — log บันทึกในนามพนักงานนั้น, **Comment Suggestions**: suggestion ห้อง 303–306 เปลี่ยนเป็นเลขห้องล้วน (ไม่มี `/Windows`), **Staff Permissions**: แก้ Firestore rules ให้ staff ลบ/แก้ไข worklog ตัวเองในวันเดียวกันได้ (inline condition แทน helper function ที่มี bug), **Templates tab**: Admin เข้าหน้าจัดการ Templates ในหน้า System ได้แล้ว (เดิม superadmin only), **Firestore rules**: เพิ่ม allow update `usageCount`/`lastUsedAt` ใน globalTemplates สำหรับ authenticated user ทุกคน (แก้ error recording template usage) |
| **v1.7.6** | 2026-05-22 | **Notifications**: แก้ dropdown mobile overflow (fixed positioning), เพิ่ม Browser Notification permission request banner, อ่าน `reminderTime` จาก Firestore settings แทน hardcode 22:00, trigger OS notification เมื่อ broadcast ใหม่มาถึง, **Minor tasks**: เพิ่ม comment suggestions สำหรับ Microsoft Authenticator, ICIT account, ติดตั้ง Software |
| **v1.7.5** | 2026-05-22 | **iOS fix**: แก้ date/time input overflow บน iOS PWA ใน /worklogs/new — ใช้ `flex-col`+`min-w-0`+CSS `-webkit-appearance:none`, **Footer**: อัพเดท version ใน AppShell footer ทุก release, **README**: เพิ่มรายละเอียด env setup + deploy convention |
| **v1.7.4** | 2026-05-22 | **Holiday cache**: เพิ่ม localStorage 30-day TTL cache สำหรับ iApp API เพื่อลด API call — 1 IC/user/ปี |
| **v1.7.3** | 2026-05-22 | **iApp Holiday API**: เปลี่ยนจาก hardcode เป็น live fetch จาก iApp Technology API พร้อม fallback + `prefetchHolidaysForYear` hook |
| **v1.7.2** | 2026-05-22 | **Heatmap**: tooltip fix (absolute relative to container, ไม่จมใต้ element อื่น), เปลี่ยนสีเป็น orange-red gradient, **Dashboard**: ลบ emoji ออก, **Worklogs**: default view = calendar, filter bar mobile overflow fix, **Thai Holidays**: เพิ่ม tag วันหยุดนักขัตฤกษ์ใน calendar |
| **v1.7.1** | 2026-05-22 | **Heatmap**: เปลี่ยนเป็น DOW × Hour grid (จ–อา × 07:00–21:00) จาก `log.date`+`log.time` พร้อม floating tooltip, indigo gradient 6 ระดับ, **Calendar**: redesign แบบ Apple Calendar — 2-panel layout, event dots สีตาม duty, วันอาทิตย์สีแดง, วันปัจจุบัน highlight, detail panel timeline เรียงตามเวลา |
| **v1.7.0** | 2026-05-22 | **Dashboard**: fix ชื่อพนักงานเก่าโดย join `displayName` จาก `users` collection แทนค่าใน worklog, Workload Heatmap calendar grid + Hour-of-day bar chart, **Staff rank**: query leaderboard แยกเพื่อแสดงอันดับจริงในกลุ่ม, **Worklogs**: calendar view switcher (List/ปฏิทิน) คลิกวันดู worklog |
| **v1.6.0** | 2026-05-22 | **Login**: `signInWithRedirect` ทุก platform (ยกเว้น iOS standalone ใช้ popup), **Firestore rules**: staff แก้ไข worklog ได้เฉพาะวันเดียวกัน (`isSameDay` + `isValidWorkLogUpdate`), **Dashboard**: recent sort DESC by date+time, custom date range filter พร้อม quota alert (>90 วัน), staff เห็นอันดับตัวเองในกลุ่ม + admin top3, **Admin/Users**: superadmin แต่งตั้ง admin เป็น superadmin พร้อม confirm modal |
| **v1.5.0** | 2026-05 | **Export**: fix sort asc, fix recipient field mapping, **Dashboard**: layout v2 (trend full-width, date range label, workload vs staff stats), **Favicon**: black background logo |
| **v1.4.0** | 2026-05 | Fix iOS PWA ITP login (popup แทน redirect), lazy load recharts, Snyk DOM XSS fix |
| **v1.3.0** | 2026-04 | Fix favicon browser tab, Android+iOS PWA login, security headers |
| **v1.2.0** | 2026-04 | iOS Standalone PWA fix |
| **v1.1.1** | 2026-03 | Fix worklog status normalization, dashboard filter |
| **v1.1.0** | 2026-03 | Bulk import, in-app notifications, Firestore rules |
| **v1.0.0** | 2026-03 | Initial release |

---

## Contributing

1. Fork repository
2. สร้าง branch: `git checkout -b feature/your-feature`
3. Commit: `git commit -m 'feat: add your feature'`
4. Push: `git push origin feature/your-feature`
5. เปิด Pull Request

### Commit convention
- `feat:` ฟีเจอร์ใหม่
- `fix:` แก้ bug
- `docs:` แก้ documentation
- `refactor:` refactor code
- `chore:` งาน maintenance

---

## License

MIT © ICIT KMUTNB
