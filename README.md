# labboy Workload Recorder — ระบบบันทึกภาระงานพนักงาน ICIT (v2.9.0)

> **ระบบบันทึกและวิเคราะห์ภาระงานดิจิทัล** สำหรับพนักงานสำนักคอมพิวเตอร์และเทคโนโลยีสารสนเทศ (ICIT)  
> มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ (KMUTNB) พัฒนาด้วย Next.js + Firebase  
> รองรับ PWA บน iOS/Android/Desktop, Google Sign-In, Real-time sync, Push Notification และ Dashboard วิเคราะห์ข้อมูล

| | |
|---|---|
| 🌐 **Production URL** | https://labboy-workload-app.web.app |
| 📦 **Current Version** | v2.9.0 |
| 📅 **Last Updated** | 2026-07-17 |
| 🏢 **Organization** | ICIT KMUTNB |
| 👤 **Developer** | Pongsakon Rawangwong (พงศกร ระวังวงศ์) |
| 📧 **Contact** | pongsakon.be1@gmail.com |
| 📄 **License** | MIT License |
| 🔬 **Research Context** | งานวิจัยพัฒนาระบบสารสนเทศ — มจพ. |
| 🧪 **E2E Tests** | Playwright 40/42 passed |

---

## สารบัญ (Table of Contents)

1. [ภาพรวมระบบ (System Overview)](#ภาพรวมระบบ-system-overview)
2. [บริบทงานวิจัย (Research Context)](#บริบทงานวิจัย-research-context)
3. [คุณสมบัติหลัก (Features)](#คุณสมบัติหลัก-features)
4. [สถาปัตยกรรมระบบ (System Architecture)](#สถาปัตยกรรมระบบ-system-architecture)
5. [Tech Stack](#tech-stack)
6. [โครงสร้างโปรเจ็กต์ (Project Structure)](#โครงสร้างโปรเจ็กต์-project-structure)
7. [ฐานข้อมูล (Database Schema)](#ฐานข้อมูล-database-schema)
8. [สิทธิ์ผู้ใช้งาน (Roles & Permissions)](#สิทธิ์ผู้ใช้งาน-roles--permissions)
9. [คู่มือการใช้งาน (User Guide)](#คู่มือการใช้งาน-user-guide)
10. [API Documentation](#api-documentation)
11. [การติดตั้ง (Installation)](#การติดตั้ง-installation)
12. [การ Deploy (Deployment)](#การ-deploy-deployment)
13. [ความปลอดภัย (Security)](#ความปลอดภัย-security)
14. [การทดสอบระบบ (Testing)](#การทดสอบระบบ-testing)
15. [ข้อจำกัดระบบ (Limitations)](#ข้อจำกัดระบบ-limitations)
16. [ประวัติการเปลี่ยนแปลง (Changelog)](#ประวัติการเปลี่ยนแปลง-changelog)
17. [การพัฒนาเพิ่มเติม (Development)](#การพัฒนาเพิ่มเติม-development)

---

## ภาพรวมระบบ (System Overview)

**labboy Workload Recorder** เป็นระบบบันทึกภาระงานดิจิทัลสำหรับพนักงานสำนักคอมพิวเตอร์และเทคโนโลยีสารสนเทศ มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ (ICIT KMUTNB) ระบบพัฒนาด้วย Next.js และ Firebase รองรับการทำงานแบบ PWA (Progressive Web App) บนมือถือ iOS/Android และ Desktop

### วัตถุประสงค์ของระบบ

1. **บันทึกภาระงานดิจิทัล** — แทนการจดบันทึกด้วยกระดาษ
2. **ติดตามการทำงานแบบ Real-time** — รู้สถานะการทำงานของทีมได้ทันที
3. **สรุปสถิติการทำงาน** — Dashboard แสดงภาพรวมพร้อมกราฟวิเคราะห์
4. **จัดการสถานะห้องและอุปกรณ์** — ติดตามการใช้งานห้องและอุปกรณ์ IoT
5. **แจ้งเตือนอัตโนมัติ** — แจ้งเตือนเมื่อลืมบันทึกงาน

### ผู้ใช้งานระบบ

| ประเภท | จำนวน (โดยประมาณ) | คำอธิบาย |
|--------|-------------------|----------|
| Staff (พนักงาน) | 5 คน | บันทึกงานตัวเอง, ดูสถิติส่วนตัว |
| Admin (ผู้ดูแล) | 2 คน | จัดการทีม, อนุมัติ users, ดูรายงาน |
| Superadmin | 1 คน | ดูแลระบบทั้งหมด, จัดการสิทธิ์ |

---

## บริบทงานวิจัย (Research Context)

### ที่มาและความสำคัญ

สำนักคอมพิวเตอร์และเทคโนโลยีสารสนเทศ (ICIT) มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ มีพนักงานที่ปฏิบัติหน้าที่บริการนักศึกษา, บุคลากรและอาจารย์ประจำวัน ครอบคลุมงานหลากหลายประเภท ได้แก่ การดูแลห้องคอมพิวเตอร์ชั้น 3-4 การบริการเครื่องคอมพิวเตอร์และอุปกรณ์ต่อพ่วง การคุมสอบ Digital Literacy (DL) และการแก้ไขปัญหาด้านเทคนิค

ก่อนพัฒนาระบบนี้ พนักงานใช้วิธีบันทึกงานด้วยกระดาษหรือ spreadsheet ซึ่งมีข้อจำกัดด้านความเที่ยงตรงของข้อมูล การรวบรวมสถิติ และการติดตามภาระงานแบบ real-time

### วัตถุประสงค์การวิจัย

1. **พัฒนาระบบสารสนเทศ** เพื่อบันทึกและติดตามภาระงานพนักงาน ICIT แบบดิจิทัล
2. **ออกแบบ UX/UI** ที่ใช้งานง่ายบนทุกอุปกรณ์ (Mobile-First, PWA)
3. **วิเคราะห์ข้อมูลภาระงาน** ผ่าน Dashboard สถิติและกราฟเชิงลึก
4. **ลดภาระการบริหารจัดการ** ด้วย Quick Log Templates และ Combo Templates
5. **เพิ่มประสิทธิภาพการประสานงาน** ผ่าน Real-time Notification และ Calendar

### ขอบเขตการวิจัย

| ขอบเขต | รายละเอียด |
|--------|----------|
| **กลุ่มเป้าหมาย** | พนักงาน ICIT KMUTNB (~15 คน) |
| **Platform** | Web App (PWA) ทำงานบน iOS, Android, Desktop |
| **Backend** | Firebase (Serverless) ไม่ต้องจัดการ Server |
| **ช่วงเวลาพัฒนา** | มีนาคม 2026 – มิถุนายน 2026 |
| **Version ปัจจุบัน** | v2.8.0 (18 Releases นับจาก v1.0.0) |
| **ข้อมูลที่บันทึก** | Worklog entries, Room/Equipment status, Exam schedules |

### ผลลัพธ์ที่คาดหวัง

- ระบบบันทึกงานที่ใช้งานได้จริงในองค์กร (Production-ready)
- Dashboard วิเคราะห์ภาระงานรายบุคคลและรายทีม
- ลดเวลาบันทึกงานต่อครั้งเหลือ < 30 วินาที (ด้วย Quick Log)
- รองรับการส่งออกรายงานปีงบประมาณ (Thai Fiscal Year) เป็น CSV

---

## คุณสมบัติหลัก (Features)

### 🔐 ระบบ Authentication (ทุก Role)

| ฟีเจอร์ | รายละเอียด | เวอร์ชันที่เพิ่ม |
|---------|-----------|----------------|
| Google Sign-In | ผ่าน Firebase Auth โดเมน @icit.kmutnb.ac.th เท่านั้น | v1.0.0 |
| PWA Support | ติดตั้งเป็น App บน iOS/Android, ใช้งาน offline ได้บางส่วน | v1.0.0 |
| Real-time Notifications | แจ้งเตือน in-app ผ่าน Firestore `onSnapshot` | v1.1.0 |
| Reminder Notification | แจ้งเตือนเมื่อลืมบันทึกงานเวลา 22:00+ | v1.7.6 |
| Browser Notifications | แจ้งเตือนผ่าน OS notification | v1.7.6 |

### 👤 Staff (พนักงาน)

| ฟีเจอร์ | รายละเอียด | เวอร์ชันที่เพิ่ม |
|---------|-----------|----------------|
| บันทึกงาน | ระบุ duty group, หัวข้อหลัก, หัวข้อรอง, เวลา, comment | v1.0.0 |
| Quick Log Templates | กดปุ่มเดียวบันทึกงานซ้ำๆ | v1.0.0 |
| Combo Template | กดครั้งเดียวบันทึกหลายงานพร้อมกัน (เช่น ผูก Account ครบชุด 3 งาน) พร้อม modal แสดง preview ก่อนบันทึก | v2.2.0 |
| Hold-to-Confirm | กดค้าง 3 วินาทีเพื่อบันทึกงานด่วน (ป้องกัน misclick) | v1.9.4 |
| Smart Room Modal | ห้อง 303-306, 401-407 พร้อมสถานะ real-time | v1.0.0 |
| Smart Equipment Modal | หูฟัง ICIT01-20, ปลั๊กไฟ ICIT21-25 แบบ real-time | v1.0.0 |
| Room Equipment Status | Widget แสดงสถานะห้องและอุปกรณ์ พร้อม 3D preview | v1.0.0 |
| Comment Suggestions | แนะนำค่า comment อัตโนมัติตาม minorTask | v1.8.0 |
| แก้ไข/ลบงาน | ได้เฉพาะวันเดียวกัน (auto-lock หลัง 23:59) | v1.6.0 |
| Undo Delete | ยกเลิกการลบภายใน 30 วินาที | v1.0.0 |
| Dashboard ส่วนตัว | งานของฉัน + อันดับในกลุ่ม + leaderboard ทีม | v1.7.0 |
| Calendar View | สลับ List/ปฏิทิน, คลิกวันดู worklog | v1.7.0 |
| Room Usage Calendar | iOS-style compact calendar ตารางห้องวันนี้บน Dashboard (ตารางเรียน + คุมสอบ DL) | v2.4.0 |
| iCloud Calendar Strip | ปฏิทินรายวัน iOS-style พร้อม Time Grid แสดงตารางเรียน + คุมสอบ DL พร้อมชื่อผู้คุมสอบ, นำทางข้ามวัน, now-line สีแดง, รองรับ overlap events แบบ side-by-side; **บน Mobile แสดงเฉพาะ Compact Cards** (ไม่มี Timeline) ป้องกันล้นหน้าจอ | v2.6.0–v2.8.0 |
| Thai Holidays | แสดงวันหยุดนักขัตฤกษ์ไทยในปฏิทิน | v1.7.3 |
| Export CSV | Export ข้อมูลของตัวเอง | v1.5.0 |
| พิมพ์รายงานประจำเดือน (Print Summary) | ปุ่ม "พิมพ์รายงาน" บน Dashboard พร้อม print header (ชื่อองค์กร, ช่วงวันที่, วันที่พิมพ์) และ CSS @media print ซ่อน sidebar/nav/filter (เฉพาะ Admin/Superadmin) | v2.0.0 |

### 👑 Admin (ผู้ดูแลระบบ)

| ฟีเจอร์ | รายละเอียด | เวอร์ชันที่เพิ่ม |
|---------|-----------|----------------|
| บันทึกงานให้พนักงาน | เลือกพนักงานจาก dropdown แล้วบันทึกในนามพนักงาน | v1.8.0 |
| Navbar Icon-only + Hover Expand | Admin/Superadmin บน PC เห็น navbar เป็น icon ย่อ เมื่อ hover แสดงชื่อเมนู (ป้องกันตัวหนังสือซ้อนกัน) | v2.8.0 |
| Mobile Drawer แบบ Grouped | เมนู mobile แบ่งกลุ่ม "ทั่วไป" / "จัดการระบบ" พร้อม role badge | v2.8.0 |
| Admin Nav ครบทุกหน้า | เข้าถึง วิเคราะห์ประสิทธิภาพ, สุขภาพอุปกรณ์, Audit Logs ได้จาก navbar/drawer โดยตรง | v2.8.0 |
| จัดการ Templates | เพิ่ม/แก้ไข/ลบ Quick Log Templates + Combo Templates | v1.8.0 |
| Template Options | `requireRecipient`, `requireComment`, `isSmart` | v1.9.4 |
| Dashboard ทีม | สถิติรวม, เฉลี่ยต่อคน, Top 3, รายชื่อทุกคน | v1.7.0 |
| RoomUsageCalendar (Week View) | ตาราง Time Grid แบบ iOS 1วัน/3วัน/สัปดาห์ + View Toggle บนหน้า admin/record | v2.4.0 |
| จัดการตารางเรียนชั้น 4 | แสดงทุกสถานะ (active/inactive), สร้าง/แก้ไข/ลบตารางเรียน, checkbox selection + bulk toggle เปิด/ปิดที่เลือก, ภาพรวมห้องวันนี้แยกสี | v2.6.0 |
| จัดการตารางคุมสอบ DL | สร้าง/แก้ไข/ลบตารางคุมสอบ, ภาพรวม 406/407/CEM + ผู้คุมสอบ displayName | v2.6.0 |
| Workload Heatmap | กราฟ DOW × Hour แสดงความถี่งาน | v1.7.1 |
| Hour-of-Day Chart | กราฟแท่งแสดงงานตามช่วงเวลา | v1.7.0 |
| Custom Date Filter | Filter ตามช่วงวันที่ พร้อม quota alert (>90 วัน) | v1.6.0 |
| Export CSV | Export ข้อมูลทุกคนกรองตามวันที่/พนักงาน | v1.5.0 |
| พิมพ์รายงานประจำเดือน (Print Summary) | ปุ่ม "พิมพ์รายงาน" บน Dashboard พร้อม print header และ CSS @media print ซ่อน UI ที่ไม่จำเป็น | v2.0.0 |
| Push Notification Settings | ตั้งค่าวัน/เวลาส่ง Push Reminder (Render + Cron-job.org), เปิด/ปิด toggle, เลือกวันที่ส่ง (จ–อา) | v2.1.0 |
| จัดการ Users | อนุมัติ/ปฏิเสธคำขอสมัคร, เปิด/ปิดใช้งาน | v1.0.0 |
| ดู System Logs | Audit log การใช้งานระบบ | v1.0.0 |

### 🔱 Superadmin (ผู้ดูแลสูงสุด)

| ฟีเจอร์ | รายละเอียด | เวอร์ชันที่เพิ่ม |
|---------|-----------|----------------|
| แต่งตั้ง Admin → Superadmin | พร้อม confirm modal | v1.6.0 |
| Broadcast Notification | ส่งประกาศถึง all/staff/admin/superadmin | v1.0.0 |
| Broadcast Push Notification | ส่ง Push Notification ถึงทุกคนผ่าน Backend (Render) พร้อม UI ใน Settings — ระบุ Title/Body, แสดงผลจำนวนส่งสำเร็จ/ล้มเหลว | v2.1.0 |
| Bulk Import | นำเข้า worklogs จาก tab-separated text | v1.1.0 |
| อนุมัติ Admin Promotion | อนุมัติ/ปฏิเสธคำขอเลื่อนตำแหน่งจาก Admin | v1.6.0 |
| ดู System Logs ทั้งหมด | Audit log ครบทุก action | v1.0.0 |
| จัดการ Firestore | สิทธิ์เต็มรูปแบบในฐานข้อมูล | v1.0.0 |

---

## สถาปัตยกรรมระบบ (System Architecture)

```
┌──────────────────────────────────────────────────────────────────┐
│                    Client Layer (Frontend)                        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐              │
│  │  Next.js 15  │ │   React 19   │ │  TailwindCSS │              │
│  │  (App Router)│ │   (Hooks)    │ │   (Styling)  │              │
│  └──────────────┘ └──────────────┘ └──────────────┘              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐              │
│  │ next-intl    │ │ Recharts     │ │ next-pwa     │              │
│  │ (i18n TH)    │ │ (Charts)     │ │ (PWA/FCM SW) │              │
│  └──────────────┘ └──────────────┘ └──────────────┘              │
└──────────────────────────────────────────────────────────────────┘
              │ HTTPS                        │ FCM Push
              ▼                              ▼
┌─────────────────────────────┐   ┌──────────────────────────────┐
│      Firebase Platform      │   │   Backend (Render.com)        │
│  ┌──────────────────────┐   │   │   Express.js + Firebase Admin │
│  │ Authentication       │   │   │   ┌──────────────────────┐    │
│  │ (Google Sign-In)     │   │   │   │ POST /daily-reminder  │    │
│  └──────────────────────┘   │   │   │ POST /broadcast       │    │
│  ┌──────────────────────┐   │   │   │ GET  /health          │    │
│  │ Cloud Firestore      │◄──┼───┤   └──────────────────────┘    │
│  │ (NoSQL, real-time)   │   │   │              ▲                 │
│  └──────────────────────┘   │   │              │ HTTP (CRON_SECRET)
│  ┌──────────────────────┐   │   └──────────────────────────────┘
│  │ Hosting (CDN/SSL)    │   │              ▲
│  └──────────────────────┘   │              │ Trigger ทุกวัน 17:00
└─────────────────────────────┘   ┌──────────────────────────────┐
              │                   │   Cron-job.org (Scheduler)    │
              │ Real-time         │   - Daily Reminder (17:00)    │
              ▼                   │   - Health Ping (ทุก 14 นาที) │
┌─────────────────────────────┐   └──────────────────────────────┘
│      External Services      │
│  ┌──────────────┐           │
│  │ iApp API     │           │
│  │ (Thai Holiday│           │
│  └──────────────┘           │
└─────────────────────────────┘
```

### Data Flow Diagram

```
User Action → Frontend Component → Firebase Auth Check → Firestore Operation
                                                          ↓
                                                    Real-time Update
                                                          ↓
                                              onSnapshot Listener (All Clients)

Cron-job.org (17:00 daily)
    → GET /api/notify/daily-reminder?secret=CRON_SECRET
    → Backend checks Firestore for users without today's log
    → Sends FCM push to matching users
    → Users receive OS push notification
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15 (App Router, Static Export), React 19, Tailwind CSS |
| **Charts** | Recharts (lazy-loaded via `next/dynamic`, no SSR) |
| **Auth** | Firebase Authentication (Google Sign-In, domain restricted) |
| **Database** | Cloud Firestore (NoSQL, real-time `onSnapshot`) |
| **Hosting** | Firebase Hosting (CDN, SSL, HTTP/2) |
| **PWA** | `next-pwa`, Web App Manifest, Service Worker, FCM SW |
| **Push Notification** | Firebase Cloud Messaging (FCM) — foreground + background |
| **Backend** | Express.js on Render.com (Node 20) — FCM multicast sender |
| **Scheduler** | Cron-job.org — daily reminder trigger + health ping |
| **Icons** | Lucide React |
| **i18n** | next-intl (Thai, static messages) |
| **Security** | Snyk SAST, DOMPurify input sanitization, CSP headers, Firestore Rules |
| **Testing** | Playwright (E2E), Vitest (unit) |

---

## โครงสร้างโปรเจ็กต์

```
employee-workload-app/
├── frontend/                        # Next.js 15 App (Static Export → Firebase Hosting)
│   ├── app/
│   │   ├── layout.js                # Root layout — NextIntlClientProvider + AuthProvider
│   │   ├── dashboard/page.js        # Dashboard หลัก (charts, stats, filter, calendar)
│   │   ├── worklogs/
│   │   │   ├── page.js              # รายการ worklogs + calendar view
│   │   │   └── new/page.js          # บันทึกงานใหม่ (Quick Log + Combo + Manual)
│   │   ├── export/page.js           # Export CSV (ตัวเอง / ทุกคนถ้า Admin)
│   │   ├── profile/page.js          # โปรไฟล์ผู้ใช้
│   │   ├── help/page.js             # คู่มือการใช้งาน (accordion 8 หัวข้อ)
│   │   ├── login/page.js            # หน้า Login (Google Sign-In)
│   │   └── admin/
│   │       ├── users/page.js        # จัดการ users (อนุมัติ/ปฏิเสธ/เปิดปิด)
│   │       ├── record/page.js       # Admin บันทึกงานให้พนักงาน
│   │       ├── settings/page.js     # ตั้งค่าระบบ (ทั่วไป/แจ้งเตือน/ข้อมูล/ความปลอดภัย)
│   │       ├── audit-logs/page.js   # Audit logs (Superadmin only)
│   │       ├── system/page.js       # จัดการระบบ (Templates/ตารางเรียน/คุมสอบ/Broadcast)
│   │       ├── staff-analytics/page.js   # วิเคราะห์ประสิทธิภาพพนักงาน (Radar + List/Single view)
│   │       └── equipment-health/page.js  # สุขภาพอุปกรณ์ (filter วัน/สัปดาห์/เดือน/ไตรมาส/ปี)
│   ├── components/
│   │   ├── AuthProvider.js          # Firebase Auth context + loginWithGoogle
│   │   ├── AppShell.js              # Layout shell + navigation (icon-only navbar สำหรับ Admin)
│   │   ├── NotificationBell.js      # In-app + FCM foreground notification
│   │   ├── DashboardCharts.js       # Recharts: Heatmap, HourOfDay, Trend, Pie, Bar
│   │   ├── StaffRadarChart.js       # Radar chart สำหรับ Staff Analytics
│   │   ├── RoomEquipmentStatus.js   # Widget สถานะห้อง + อุปกรณ์ real-time
│   │   ├── iCloudCalendarStrip.js   # iOS-style Time Grid calendar
│   │   ├── FABVersionControl.js     # FAB badge แสดง version
│   │   ├── MinorTaskSelector.js
│   │   └── CommentSuggestions.js
│   ├── lib/
│   │   ├── firebase.js              # Firebase init + getFCMToken + onFCMMessage
│   │   ├── staffMetrics.js          # คำนวณ metrics 6 มิติ (Volume/Versatility/Consistency/...)
│   │   ├── commentSuggestions.js
│   │   ├── thaiHolidays.js          # Thai public holidays (iApp API + localStorage cache + fallback)
│   │   ├── validation.js            # Form validation helpers
│   │   └── systemLog.js             # Audit log helper
│   ├── messages/
│   │   ├── th.json                  # Thai translations (next-intl)
│   │   └── en.json                  # English translations
│   └── public/
│       ├── manifest.json            # PWA manifest
│       ├── firebase-messaging-sw.js # FCM Service Worker (background push)
│       └── sw.js                    # Service Worker (next-pwa)
├── backend/                         # Express.js Backend (Render.com)
│   └── src/
│       ├── server.js                # Express app entry point
│       ├── config/env.js            # Environment config (PORT, CRON_SECRET, etc.)
│       ├── routes/notify.js         # GET/POST /api/notify/daily-reminder + /broadcast + /health
│       └── services/fcm.js          # Firebase Admin SDK — ส่ง FCM, ดึง tokens, ตรวจ missing log
├── firebase/
│   ├── firestore.rules              # Firestore security rules
│   ├── firestore.indexes.json       # Composite indexes
│   └── firebase.json                # Hosting + rules config
└── README.md
```

---

## ฐานข้อมูล (Database Schema)

ระบบใช้ **Cloud Firestore** (NoSQL Document Database) เก็บข้อมูลทั้งหมด มี Collection structure ดังนี้:

### Collection Overview

| Collection | จำนวน Documents (โดยประมาณ) | คำอธิบาย |
|------------|------------------------------|----------|
| `users` | 15-30 | ข้อมูลผู้ใช้งานทั้งหมด |
| `worklogs` | 1,000-10,000/ปี | บันทึกภาระงาน |
| `notifications` | 100-500 | การแจ้งเตือน |
| `globalTemplates` | 20-50 | Quick Log Templates |
| `RoomEquipmentStatus` | 1 | สถานะห้องและอุปกรณ์ real-time |
| `systemLogs` | 1,000+ | Audit logs |
| `categories` | 10-20 | หมวดหมู่งาน |
| `settings` | 5-10 | การตั้งค่าระบบ |
| `adminPromotionRequests` | 0-10 | คำขอเลื่อนตำแหน่ง |
| `pendingUsers` | 0-20 | คำขอสมัครที่รออนุมัติ |

### `users/{uid}`

เก็บข้อมูลผู้ใช้งานทั้งหมด

```javascript
{
  uid: string,                    // Firebase Auth UID
  email: string,                  // @icit.kmutnb.ac.th เท่านั้น
  displayName: string,            // ชื่อที่แสดง (แก้ไขได้)
  fullName: string,               // ชื่อ-นามสกุลเต็ม
  nickname: string,               // ชื่อเล่น
  role: "staff" | "admin" | "superadmin",
  active: boolean,                // true = ใช้งานได้, false = ถูกระงับ
  createdAt: Timestamp,           // วันที่สร้าง
  lastLoginAt: Timestamp,         // วันที่ login ล่าสุด
  promotedBy: string | null,      // uid ของผู้แต่งตั้ง (admin/superadmin)
  department: string | null       // แผนก (optional)
}
```

**Indexes ที่ใช้:**
- `role` + `active` (สำหรับ admin ดึงรายชื่อ users)
- `createdAt` DESC (สำหรับ sort)

### `worklogs/{id}`

เก็บบันทึกภาระงานทั้งหมด

```javascript
{
  // Primary Fields
  id: string,                     // Auto-generated Firestore ID
  date: string,                   // "YYYY-MM-DD" (ISO format)
  time: string,                   // "HH:MM" (24-hour format)
  
  // Work Details
  dutyGroup: string,              // กลุ่มงานหลัก
  mainDuty: string,               // หน้าที่หลัก
  minorTask: string,              // งานย่อย
  comment: string,                // หมายเหตุ/รายละเอียด
  recipient: string,              // ผู้รับบริการ (optional)
  
  // Employee Reference (denormalized สำหรับ performance)
  employeeId: string,             // uid ของผู้บันทึก
  employeeDisplayName: string,    // ชื่อที่แสดง
  employeeFullName: string,       // ชื่อเต็ม
  employeeNickname: string,       // ชื่อเล่น
  
  // Status
  status: "บันทึกแล้ว" | "รอดำเนินการ" | "ยกเลิก",
  locked: boolean,                // true = ล็อคหลัง 23:59 ของวันนั้น
  
  // Metadata
  createdAt: Timestamp,         // วันที่สร้าง (server timestamp)
  updatedAt: Timestamp,           // วันที่แก้ไขล่าสุด
  createdBy: string,              // uid ผู้สร้าง (admin อาจสร้างให้ staff)
  
  // Equipment/Room (optional)
  equipment: string | null,      // รหัสอุปกรณ์ เช่น "ICIT01"
  room: string | null             // ห้อง เช่น "303"
}
```

**Indexes ที่จำเป็น:**
```json
{
  "indexes": [
    {
      "collectionGroup": "worklogs",
      "fields": [
        { "fieldPath": "employeeId", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "worklogs",
      "fields": [
        { "fieldPath": "date", "order": "DESCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

### `notifications/{id}`

เก็บการแจ้งเตือนแบบ real-time

```javascript
{
  id: string,
  userId: string,                 // uid | "all" | "staff" | "admin" | "superadmin"
  title: string,                  // หัวข้อแจ้งเตือน
  message: string,                // ข้อความ
  read: boolean,                  // false = ยังไม่อ่าน
  readAt: Timestamp | null,       // วันที่อ่าน
  timestamp: Timestamp,           // วันที่สร้าง
  type: string | null,            // "admin_promotion_request" | "broadcast" | "reminder"
  data: object | null             // ข้อมูลเพิ่มเติม (optional)
}
```

### `globalTemplates/{id}`

Quick Log Templates ที่ใช้ซ้ำได้

```javascript
{
  id: string,
  name: string,                   // ชื่อ template (แสดงบนปุ่ม)
  minorTask: string,              // งานย่อย
  mainDuty: string,               // หน้าที่หลัก
  dutyGroup: string,              // กลุ่มงาน
  
  // Template Options
  requireRecipient: boolean,      // ต้องกรอกผู้รับบริการ?
  requireComment: boolean,        // ต้องกรอก comment?
  isSmart: boolean,               // เป็น smart template (ห้อง/อุปกรณ์)?
  
  // Usage Stats
  usageCount: number,             // จำนวนครั้งที่ใช้
  lastUsedAt: Timestamp,          // ใช้ล่าสุด
  createdAt: Timestamp,
  createdBy: string,                // uid ผู้สร้าง
  updatedAt: Timestamp
}
```

### `RoomEquipmentStatus/{statusId}`

สถานะห้องและอุปกรณ์แบบ real-time

```javascript
{
  id: "equipment",                // Fixed ID
  
  // Rooms (ชั้น 3: แลกเปลี่ยนความรู้)
  rooms: {
    "303": "available" | "in_use" | "maintenance",
    "303_user": string | null,    // uid ผู้ใช้งาน
    "303_timestamp": string,       // ISO timestamp
    "304": "available" | "in_use",
    ...
    "306": "available" | "in_use"
  },
  
  // Rooms (ชั้น 4: ห้องเรียน)
  "401": "available" | "in_use" | "maintenance",
  ...
  "407": "available" | "in_use",
  
  // Headphones (หูฟัง)
  headphones: {
    "ICIT01": "available" | "in_use",
    "ICIT01_user": string | null,
    "ICIT01_timestamp": string,
    ...
    "ICIT20": "available" | "in_use"
  },
  
  // Power Plugs (ปลั๊กไฟ)
  power: {
    "ICIT21": "available" | "in_use",
    ...
    "ICIT25": "available" | "in_use"
  },
  
  lastUpdated: Timestamp
}
```

### `systemLogs/{id}`

Audit logs สำหรับติดตามการใช้งานระบบ

```javascript
{
  id: string,
  action: string,                 // "WORKLOG_CREATE" | "WORKLOG_DELETE" | "USER_LOGIN" | etc.
  description: string,            // คำอธิบาย action
  userId: string,                   // uid ผู้กระทำ
  userEmail: string,              // email ผู้กระทำ
  userRole: string,               // role ผู้กระทำ
  timestamp: Timestamp,           // เวลาที่เกิด action
  metadata: object,               // ข้อมูลเพิ่มเติม (optional)
  ipAddress: string | null        // IP address (ถ้ามี)
}
```

### `categories/{id}`

หมวดหมู่งาน (duty groups, main duties, minor tasks)

```javascript
{
  id: string,
  name: string,                   // ชื่อหมวดหมู่
  type: "dutyGroup" | "mainDuty" | "minorTask",
  parentId: string | null,        // สำหรับ hierarchy
  order: number,                  // ลำดับการแสดง
  active: boolean,
  createdAt: Timestamp
}
```

### `settings/{settingId}`

การตั้งค่าระบบ

```javascript
{
  id: "general" | "notifications" | "reminder",
  
  // สำหรับ id="reminder"
  reminderTime: string,           // "22:00" (HH:MM format)
  reminderEnabled: boolean,
  
  // สำหรับ id="notifications"
  broadcastEnabled: boolean,
  
  updatedAt: Timestamp,
  updatedBy: string               // uid ผู้แก้ไขล่าสุด
}
```

### `adminPromotionRequests/{id}`

คำขอเลื่อนตำแหน่งจาก Admin → Superadmin

```javascript
{
  id: string,
  userId: string,                 // uid ของ staff ที่ขอเลื่อน
  requestedBy: string,            // uid ของ admin ที่ส่งคำขอ
  status: "pending" | "approved" | "rejected",
  requestedRole: "admin" | "superadmin",
  createdAt: Timestamp,
  resolvedAt: Timestamp | null,
  resolvedBy: string | null       // uid ของ superadmin ที่อนุมัติ/ปฏิเสธ
}
```

---

## สิทธิ์ผู้ใช้งาน (Roles & Permissions)

### Role Hierarchy

```
superadmin (สูงสุด)
    └── สามารถทำทุกอย่าง + แต่งตั้ง admin
    
admin (ผู้ดูแล)
    └── จัดการทีม ดูรายงาน อนุมัติ users ไม่สามารถแต่งตั้ง superadmin
    
staff (พนักงาน)
    └── บันทึกงานตัวเอง ดูสถิติส่วนตัว ไม่เห็นข้อมูลคนอื่น
```

### Permission Matrix

| การกระทำ | Staff | Admin | Superadmin | Firestore Rule |
|----------|-------|-------|------------|----------------|
| บันทึก worklog ของตัวเอง | ✅ | ✅ | ✅ | `isAuthenticated()` |
| บันทึก worklog ให้พนักงานคนอื่น | ❌ | ✅ | ✅ | `isAdmin()` |
| Quick Log Templates | ✅ | ✅* | ✅ | `isAuthenticated()` |
| แก้ไข/ลบ worklog ตัวเอง | ✅** | ✅ | ✅ | `isWorkLogOwner() && !locked` |
| แก้ไข/ลบ worklog คนอื่น | ❌ | ✅ | ✅ | `isAdmin()` |
| ดู Dashboard ส่วนตัว | ✅ | ✅ | ✅ | `isAuthenticated()` |
| ดู Dashboard ทีม | ❌ | ✅ | ✅ | `isAdmin()` |
| Export CSV (ตัวเอง) | ✅ | ✅ | ✅ | `employeeId == uid` |
| Export CSV (ทุกคน) | ❌ | ✅ | ✅ | `isAdmin()` |
| จัดการ Users | ❌ | ✅ | ✅ | `isAdmin()` |
| จัดการ Templates | ❌ | ✅ | ✅ | `isAdmin()` |
| ดู System Logs | ❌ | ❌ | ✅ | `isSuperAdmin()` |
| Broadcast Notification | ❌ | ❌ | ✅ | `isSuperAdmin()` |
| Bulk Import | ❌ | ❌ | ✅ | `isSuperAdmin()` |
| แต่งตั้ง Admin | ❌ | ❌ | ✅ | `isSuperAdmin()` |
| อนุมัติ Admin Promotion | ❌ | ❌ | ✅ | `isSuperAdmin()` |

**หมายเหตุ:**
- \* Admin ต้องเลือกพนักงานก่อนใช้ Quick Log
- \** Staff แก้ไขได้เฉพาะวันเดียวกัน (client-side check + Firestore `locked` field)

### Firestore Security Rules

ระบบใช้ Firestore Security Rules ควบคุมการเข้าถึงข้อมูลแบบ role-based:

```javascript
// Helper functions ใน firestore.rules
function isAuthenticated() { return request.auth != null; }
function isAdmin() { /* check role in users collection */ }
function isSuperAdmin() { /* check role == 'superadmin' */ }
function isWorkLogOwner(worklog) { 
  return worklog.employeeId == request.auth.uid; 
}
function isSameDay(worklog) {
  return worklog.date == request.time.toDate().format('yyyy-MM-dd');
}
```

**Key Rules:**
1. **Users Collection**: Read ได้ทุกคนที่ login, Write ได้เฉพาะตัวเอง (ยกเว้น role) หรือ Admin
2. **Worklogs Collection**: Create ได้ทุกคน, Update/Delete ได้เฉพาะเจ้าของ (หรือ Admin) และต้องไม่ locked
3. **System Logs**: Read ได้เฉพาะ Superadmin
4. **Notifications**: Read ได้เฉพาะของตัวเอง + broadcast

---

## Backend API (Render.com)

Backend เป็น Express.js service ที่ deploy บน Render.com ทำหน้าที่หลักคือส่ง Push Notification ผ่าน Firebase Admin SDK เท่านั้น (ไม่จัดการ business logic อื่น)

### URL & Endpoints

| Method | Endpoint | Auth | คำอธิบาย |
|--------|----------|------|---------|
| `GET` | `/health` | ไม่ต้อง | Health check — ใช้ Cron-job.org ping ป้องกัน Render sleep |
| `GET/POST` | `/api/notify/daily-reminder` | `x-cron-secret` header หรือ `?secret=` | ส่ง daily reminder ให้ users ที่ยังไม่ได้ลงงานวันนี้ |
| `POST` | `/api/notify/broadcast` | Firebase ID Token + superadmin role | Broadcast push ถึงทุก user ที่มี FCM token |

> **Base URL:** `https://employee-workload-app.onrender.com`

### Environment Variables (Render)

```env
CRON_SECRET=<random-secret>          # ใช้ authenticate /daily-reminder
FIREBASE_SERVICE_ACCOUNT=<json>      # Firebase Admin SDK credentials (base64 หรือ JSON string)
PORT=10000                           # Render default
```

### Push Notification Flow

```
1. Cron-job.org ยิง GET /api/notify/daily-reminder?secret=CRON_SECRET ทุกวัน 17:00 ICT
2. Backend ดึง reminderSettings จาก Firestore (เวลา/วันที่เปิดใช้งาน)
3. ตรวจสอบ isReminderDay() + isReminderTime() (±5 นาที)
4. ดึง users ทั้งหมดที่มี fcmToken ใน Firestore
5. กรอง users ที่ยังไม่มี worklog วันนี้ (getUsersWithoutTodayLog)
6. ส่ง FCM multicast ไปยัง tokens เหล่านั้น
7. Return { sentCount, failedCount, targetUsers }
```

### Cron-job.org Configuration

| Job | URL | Method | ความถี่ | Header |
|-----|-----|--------|---------|--------|
| Health Ping | `/health` | GET | ทุก 14 นาที | — |
| Daily Reminder | `/api/notify/daily-reminder` | GET | ทุกวัน 17:00 ICT | `x-cron-secret: <secret>` หรือ `?secret=<secret>` |

---

## Staff Analytics (วิเคราะห์ประสิทธิภาพพนักงาน)

หน้า `/admin/staff-analytics` ให้ Admin/Superadmin วิเคราะห์ประสิทธิภาพพนักงานผ่าน **Radar Chart 6 มิติ**

### 6 Metric Dimensions

| Metric | ชื่อไทย | การคำนวณ | ฟังก์ชัน |
|--------|---------|---------|---------|
| **Volume** | ปริมาณงาน | จำนวน worklogs ÷ เป้าหมาย (normalize 0–100) | `calcVolumeScore()` |
| **Versatility** | ความหลากหลาย | จำนวน unique `minorTask` ÷ max ของทีม | `calcVersatilityScore()` |
| **Consistency** | ความสม่ำเสมอ | `100 - CV` (Coefficient of Variation ของงานต่อวัน) | `calcConsistencyScore()` |
| **Peak Handling** | จัดการช่วงพีค | สัดส่วนงานช่วง 14:00–17:00 | `calcPeakScore()` |
| **Documentation** | เอกสารละเอียด | สัดส่วน comment ≥ 20 ตัวอักษร | `calcDocumentationScore()` |
| **Combo Usage** | ใช้ combo | อัตราการใช้ Combo Templates | `calcComboScore()` |

คำนวณโดย `frontend/lib/staffMetrics.js` — แสดงผลผ่าน `StaffRadarChart` component

### 2 View Modes

| View | คำอธิบาย |
|------|---------|
| **List View** | ตารางพนักงานทุกคน พร้อม metrics 6 มิติ + คะแนนเฉลี่ย ค้นหา/เรียงลำดับ/Export CSV |
| **Single View** | แสดงทีละคนพร้อม Radar Chart ขนาดใหญ่ นำทางด้วยปุ่ม ‹ › |

### Date Range Filters

`วัน / สัปดาห์ / เดือน / ไตรมาส / ปีงบประมาณ (ต.ค.–ก.ย.) / ปี / กำหนดเอง`

---

## Equipment Health (สุขภาพอุปกรณ์)

หน้า `/admin/equipment-health` ให้ Admin/Superadmin ติดตามสภาพอุปกรณ์ (หูฟัง ICIT01–20, ปลั๊กไฟ ICIT21–25)

### Date Range Filters

| โหมด | คำอธิบาย |
|------|---------|
| วัน | วันปัจจุบัน |
| สัปดาห์ | 7 วันล่าสุด |
| เดือน | เดือนปัจจุบัน (default) |
| ไตรมาส | Q1–Q4 ปัจจุบัน |
| ปีงบประมาณ | ต.ค.–ก.ย. (Thai fiscal year) |
| ปี | ปีปฏิทิน |
| กำหนดเอง | เลือกช่วงวันที่เอง |

### Widgets

- **StatCards** — รวมรายงานชำรุด/สูญหาย, อุปกรณ์ที่มีปัญหา, % สุขภาพ
- **EquipmentDamageChart** — แท่งกราฟจำนวน damage/loss ต่อวัน
- **DamageCategoryPie** — Pie chart แยกประเภทอุปกรณ์
- **EquipmentHealthTimeline** — Timeline สถานะอุปกรณ์รายชิ้น
- **Export CSV** — Export รายการชำรุด/สูญหายตามช่วงเวลาที่กรอง

---

## คู่มือการใช้งาน (User Guide)

### 🚀 เริ่มต้นใช้งานครั้งแรก

#### ขั้นตอนที่ 1 — เข้าสู่ระบบ

1. เปิด https://labboy-workload-app.web.app
2. กดปุ่ม **"เข้าสู่ระบบด้วย Google"**
3. เลือก account `@icit.kmutnb.ac.th` ของคุณ
4. รอผู้ดูแล (Admin) **อนุมัติ account** ภายใน 1-2 วันทำการ
5. หลังอนุมัติ Login ใหม่ — ระบบจะนำไปยังหน้าหลักตาม Role

> **หมายเหตุ:** account ที่ยังไม่ได้รับอนุมัติจะเข้าสู่หน้า "รอการอนุมัติ"

#### ขั้นตอนที่ 2 — ตั้งชื่อที่ใช้แสดง

1. ไปที่เมนู **"โปรไฟล์"**
2. กรอก **ชื่อที่ใช้ลงงาน** (ภาษาไทย เช่น "พงศกร", "สมชาย")
3. กด **บันทึก** — ชื่อนี้จะแสดงใน Dashboard และรายงาน

#### ขั้นตอนที่ 3 — ติดตั้งเป็น App (PWA)

**iOS (Safari):**
1. เปิดเว็บใน Safari
2. กดปุ่ม Share → "Add to Home Screen"
3. ตั้งชื่อ "labboy Workload" → Add

**Android (Chrome):**
1. เปิดเว็บใน Chrome
2. แถบล่างจะมี Banner ถาม "Add to Home screen" → กด Add
3. หรือกด Menu (⋮) → "Install app"

---

### 👤 คู่มือ Staff (พนักงาน)

#### การบันทึกงาน (บันทึกงานใหม่)

**วิธีที่ 1 — Quick Log (แนะนำ)**

Quick Log คือปุ่มลัดสำหรับงานที่ทำซ้ำบ่อย กดครั้งเดียวบันทึกได้ทันที

1. ไปที่หน้า **"บันทึกงาน"** (`/worklogs/new`)
2. เห็นปุ่ม Quick Log เรียงเป็นแถว
3. **กดค้าง 3 วินาที** บนปุ่มงานที่ต้องการ — รอแถบ progress เต็ม
4. ถ้า template ต้องการ "ผู้รับบริการ" หรือ "comment" จะมี modal ให้กรอกก่อน
5. ระบบบันทึกงานและแสดง Toast สีเขียว "บันทึกสำเร็จ"

**วิธีที่ 2 — Combo Template**

สำหรับงานที่ต้องบันทึกพร้อมกันหลายรายการ (เช่น ผูก Account ครบชุด)

1. เลื่อนไปที่ปุ่ม Combo (มี badge สีม่วง + จำนวนงาน)
2. กดค้าง 3 วินาที
3. modal แสดงรายการงานทั้งหมด → กรอก "ผู้รับบริการ" ครั้งเดียว
4. กด **"บันทึกทั้งหมด"** — บันทึกพร้อมกันทุกรายการ

**วิธีที่ 3 — กรอกเอง (Manual)**

1. กดปุ่ม **"กรอกเอง"** (มุมขวาบน Mobile / ด้านล่างปุ่ม Quick Log)
2. เลือก **กลุ่มงาน** → **หน้าที่หลัก** → **งานย่อย (หัวข้อรอง)**
3. กรอก **วันที่** และ **เวลา**
4. กรอก **ผู้รับบริการ** (ถ้ามี) และ **หมายเหตุ**
5. กด **"บันทึกงาน"**

#### การดูและแก้ไขงาน

1. ไปที่หน้า **"รายการงาน"** (`/worklogs`)
2. สลับมุมมองระหว่าง **รายการ (List)** และ **ปฏิทิน (Calendar)**
3. กดรายการงานที่ต้องการ → กดไอคอน **แก้ไข** (ดินสอ)
4. **ข้อจำกัด:** Staff แก้ไขได้เฉพาะวันเดียวกัน (lock หลัง 23:59)

#### การลบงาน

1. กดไอคอน **ลบ** (ถังขยะ) บนรายการงาน
2. มี **Undo 30 วินาที** — กด "ยกเลิก" เพื่อกู้คืน
3. หลัง 30 วินาที ลบถาวร

#### การ Export ข้อมูล

1. ไปที่หน้า **"ส่งออกข้อมูล"** (`/export`)
2. เลือก **ช่วงวันที่** (หรือเลือกปีงบประมาณ)
3. กด **"Export CSV"**
4. ไฟล์ CSV จะดาวน์โหลดอัตโนมัติ (รองรับ Thai encoding + Excel)

#### การดู Dashboard ส่วนตัว

ไปที่หน้า **"แดชบอร์ด"** (`/dashboard`) จะเห็น:

| Widget | คำอธิบาย |
|--------|----------|
| **สถิติงานวันนี้/สัปดาห์/เดือน** | จำนวนงานและชั่วโมงรวม |
| **อันดับในกลุ่ม** | เปรียบเทียบกับเพื่อนร่วมทีม |
| **Workload Heatmap** | กราฟความถี่งาน วัน × ชั่วโมง |
| **Hour-of-Day Chart** | กราฟแท่งแสดงช่วงเวลาที่ทำงานบ่อย |
| **ตารางห้องวันนี้** | สถานะห้องเรียนชั้น 4 และ DL Exam |
| **Radar Chart ทักษะ** | แสดง Top 8 หัวข้อรองที่ทำบ่อยที่สุด |

#### การดูตารางห้องและคุมสอบ

ไปที่หน้า **"บันทึกงาน"** → แท็บ **"ตารางห้อง"** หรือดูบน Dashboard:

- **iCloudCalendarStrip** — ปฏิทินรายวัน iOS-style, Time Grid 07:00–22:00
- ลาก drag เพื่อเลื่อนดูช่วงเวลา
- กดปุ่มลูกศร ‹ / › เพื่อเปลี่ยนวัน
- กดปุ่ม **"วันนี้"** เพื่อกลับมายังวันปัจจุบัน
- แถบสีแดง = เวลาปัจจุบัน (Now line)
- Card สีน้ำเงิน = ตารางเรียนปกติ, Card สีม่วง = คุมสอบ DL

---

### 👑 คู่มือ Admin/Superadmin

#### การบันทึกงานให้พนักงาน

1. ไปที่หน้า **"บันทึกงานให้พนักงาน"** (`/admin/record`)
2. **เลือกพนักงาน** จาก dropdown ด้านบน
3. ใช้ Quick Log หรือกรอกเองเช่นเดียวกับ Staff
4. งานจะถูกบันทึกในนามพนักงานที่เลือก

#### การจัดการตารางเรียน (Classroom Schedule)

1. ไปที่ **"จัดการระบบ"** → แท็บ **"ตารางเรียน"**
2. **เพิ่มตารางใหม่:** กรอกห้อง, วิชา, อาจารย์, วัน, เวลาเริ่ม/สิ้นสุด → กด "เพิ่ม"
3. **เปิด/ปิดรายการ:** ติ๊ก checkbox หลายรายการ → กด "เปิดใช้งาน" หรือ "ปิดใช้งาน"
4. **ลบรายการ:** กดปุ่ม "ลบ" → ยืนยัน (ลบถาวรออกจาก Firestore)
5. **ภาพรวมวันนี้:** แถบสีด้านบนแสดงสถานะห้อง 401/402/406/407

#### การจัดการตารางคุมสอบ DL

1. ไปที่ **"จัดการระบบ"** → แท็บ **"คุมสอบ DL"**
2. **เพิ่มการสอบ:** เลือกวันที่, วิชา, ประเภท (นศ./บุคลากร), ห้อง, ช่วงเวลา, ผู้คุมสอบ
3. ผู้คุมสอบค้นหาจาก `displayName` ของ users ในระบบ
4. **ภาพรวม:** แสดงแผนผัง 406/407/CEM พร้อมชื่อผู้คุมสอบแต่ละคน

#### การจัดการ Users

1. ไปที่หน้า **"จัดการผู้ใช้"** (`/admin/users`)
2. **อนุมัติ users ใหม่:** แท็บ "รออนุมัติ" → กด "อนุมัติ" หรือ "ปฏิเสธ"
3. **เปิด/ปิดใช้งาน:** สลับ toggle บน user card
4. **Superadmin เท่านั้น:** เลื่อนตำแหน่ง staff → admin → superadmin

#### การจัดการ Templates

1. ไปที่ **"จัดการระบบ"** → แท็บ **"Templates"**
2. **เพิ่ม Template ใหม่:** กรอกชื่อปุ่ม, กลุ่มงาน, หน้าที่หลัก, งานย่อย → กด "เพิ่ม"
3. **Template Options:**
   - `requireRecipient` — ต้องกรอกผู้รับบริการก่อนบันทึก
   - `requireComment` — ต้องกรอก comment ก่อนบันทึก
   - `isSmart` — แสดง Smart Room/Equipment picker
4. **Combo Template:** เปิด toggle "Combo" → เพิ่มงานย่อยหลายรายการ

#### การตั้งค่า Push Notification

1. ไปที่ **"จัดการระบบ"** → แท็บ **"ตั้งค่า"**
2. เปิด/ปิด **"ส่ง Daily Reminder"**
3. เลือก **เวลาส่ง** (เช่น 20:00)
4. เลือก **วันที่ส่ง** (จ–อา)
5. กด **"บันทึกการตั้งค่า"**

**Broadcast Push (Superadmin เท่านั้น):**
1. กรอก Title และ Body ของข้อความ
2. กด **"ส่งถึงทุกคน"**
3. ระบบแสดงผลจำนวนส่งสำเร็จ/ล้มเหลว

#### การดู Dashboard ทีม

ไปที่หน้า **"แดชบอร์ด"** จะเห็นข้อมูลเพิ่มเติมสำหรับ Admin:

| Widget | คำอธิบาย |
|--------|----------|
| **สถิติรวมทีม** | จำนวนงานและชั่วโมงรวมทั้งทีม |
| **Top 3 พนักงาน** | พนักงานที่มีงานมากที่สุดในช่วงที่เลือก |
| **Leaderboard** | อันดับพนักงานทุกคน |
| **Seasonal Chart** | แนวโน้มงานรายสัปดาห์ |
| **Export ทีม** | ดาวน์โหลด CSV ข้อมูลทุกคน |
| **พิมพ์รายงาน** | Print รายงานประจำเดือนพร้อม header |

---

### 📱 การใช้งานบน Mobile

#### iOS PWA
- Login ผ่าน Safari ครั้งแรก → Add to Home Screen
- หน้าจอจะเต็มจอ ไม่มี browser bar
- กด Back gesture (swipe จากซ้าย) เพื่อย้อนกลับ

#### Android PWA
- Login ผ่าน Chrome → Install App
- กด Back button ของ Android เพื่อย้อนกลับ

#### Mobile Navigation
- แถบ navigation ด้านบน: **‹ ชื่อหน้า ›**
- กด **‹** หรือ **›** เพื่อไปหน้าก่อน/หน้า
- กดชื่อหน้ากลาง เพื่อเปิด **Drawer Menu** (เมนูทั้งหมด)

---

## API Documentation

### Firebase Client SDK APIs

ระบบใช้ Firebase Client SDK (v12.13.0) สำหรับทุก operation:

#### Authentication APIs

```javascript
// Sign in with Google
import { signInWithPopup, signInWithRedirect, GoogleAuthProvider } from 'firebase/auth';

// ใช้ redirect บน Desktop/Android, popup บน iOS standalone
const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  hd: 'icit.kmutnb.ac.th'  // จำกัดโดเมน
});

// iOS PWA ใช้ popup (ITP จำกัด redirect)
await signInWithPopup(auth, provider);

// Desktop/Android ใช้ redirect
await signInWithRedirect(auth, provider);
```

#### Firestore APIs

```javascript
// Read with real-time listener
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';

const q = query(
  collection(db, 'worklogs'),
  where('employeeId', '==', userId),
  where('date', '>=', startDate),
  where('date', '<=', endDate),
  orderBy('date', 'desc'),
  orderBy('time', 'desc')
);

const unsubscribe = onSnapshot(q, (snapshot) => {
  // Real-time updates
  const worklogs = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
});

// Create
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

await addDoc(collection(db, 'worklogs'), {
  date: '2026-05-29',
  time: '14:30',
  dutyGroup: 'Lab Support',
  mainDuty: 'Hardware Support',
  minorTask: 'ยืมหูฟัง',
  employeeId: user.uid,
  createdAt: serverTimestamp()
});

// Update
import { doc, updateDoc } from 'firebase/firestore';

await updateDoc(doc(db, 'worklogs', worklogId), {
  comment: 'Updated comment',
  updatedAt: serverTimestamp()
});

// Delete
import { deleteDoc, doc } from 'firebase/firestore';

await deleteDoc(doc(db, 'worklogs', worklogId));
```

### Component APIs

#### Quick Log Templates API

```javascript
// lib/quickLogTemplates.js

// Get templates for user
async function getTemplatesForUser(department) {
  // Returns: Array<Template>
  // ดึงจาก globalTemplates collection
}

// Log from template
async function logFromTemplate(templateId, userId, extraData) {
  // Creates worklog from template + extraData
  // Updates usageCount and lastUsedAt
}
```

#### System Logging API

```javascript
// lib/systemLog.js

export const SystemActions = {
  WORKLOG_CREATE: 'WORKLOG_CREATE',
  WORKLOG_DELETE: 'WORKLOG_DELETE',
  WORKLOG_UPDATE: 'WORKLOG_UPDATE',
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  TEMPLATE_USE: 'TEMPLATE_USE',
  BROADCAST_SEND: 'BROADCAST_SEND'
};

// Log system action
async function logSystemAction(action, description, metadata = {}) {
  // Creates entry in systemLogs collection
}
```

### Dashboard Data APIs

```javascript
// lib/api.js (key functions)

// Get worklogs with filtering
async function getWorklogs(filters) {
  // filters: { employeeId, startDate, endDate, dutyGroup }
}

// Get dashboard stats
async function getDashboardStats(dateRange) {
  // Returns: { totalWorklogs, totalHours, topDutyGroups, trends }
}

// Get leaderboard
async function getLeaderboard(dateRange, limit = 10) {
  // Returns: Array<{ employeeId, displayName, worklogCount, totalHours }>
}
```

---

## การติดตั้ง (Installation)

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| Node.js | v18.0.0 | v20.0.0+ |
| npm | v9.0.0 | v10.0.0+ |
| Firebase CLI | v13.0.0 | Latest |
| Browser | Chrome 90+, Firefox 90+, Safari 14+, Edge 90+ | Latest |
| OS | Windows 10, macOS 11, Ubuntu 20.04 | Latest |

### Step 1: Clone Repository

```bash
# Clone จาก GitHub
git clone https://github.com/PongsakonBe1/employee-workload-app.git

# เข้าไปยัง directory
cd employee-workload-app

# ตรวจสอบโครงสร้าง
ls -la
# ควรเห็น: frontend/, firebase/, docs/, README.md
```

### Step 2: Create Firebase Project

1. ไปที่ [Firebase Console](https://console.firebase.google.com)
2. คลิก **Create Project**
3. ตั้งชื่อ project (เช่น `labboy-workload-app`)
4. **Enable Google Analytics** (optional)
5. เลือก Analytics account
6. รอสร้าง project เสร็จ

#### Enable Services

ใน Firebase Console เปิดใช้งาน services ต่อไปนี้:

**Authentication:**
- ไปที่ **Build → Authentication**
- คลิก **Get Started**
- เปิด **Google** sign-in provider
- ตั้งค่า **Support email**
- บันทึก **Web API Key** ไว้ใช้ใน .env

**Firestore Database:**
- ไปที่ **Build → Firestore Database**
- คลิก **Create Database**
- เลือก **Production mode** (locked)
- เลือก region **asia-southeast1** (Singapore) - ใกล้ไทยที่สุด

**Hosting:**
- ไปที่ **Build → Hosting**
- คลิก **Get Started**
- ไม่ต้องทำตาม wizard ตอนนี้ (จะ deploy ผ่าน CLI)

### Step 3: Environment Configuration

สร้างไฟล์ `frontend/.env.local`:

```env
# Firebase Configuration
# หาได้จาก: Firebase Console → Project Settings → Your apps → Web app
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456

# iApp Thai Holiday API (Optional)
# ขอ API key: https://iapp.co.th/control/api-keys
# ถ้าไม่ใส่ จะใช้ข้อมูล fallback 2024-2026
NEXT_PUBLIC_IAPP_HOLIDAY_API_KEY=your_iapp_key_here

# Development
NEXT_PUBLIC_DEBUG=false
```

**⚠️ Security Note:** ไฟล์ `.env.local` อยู่ใน `.gitignore` แล้ว ไม่ต้องกังวลเรื่อง commit secrets

### Step 4: Install Dependencies

```bash
# Frontend dependencies
cd frontend
npm install

# ตรวจสอบว่าติดตั้งสำเร็จ
npm list next firebase react
```

Expected packages:
- `next@15.x`
- `firebase@12.x`
- `react@19.x`
- `recharts@2.x`
- `lucide-react@0.x`

### Step 5: Firebase CLI Setup

```bash
# Install Firebase CLI globally
npm install -g firebase-tools

# Login to Firebase
firebase login
# จะเปิด browser ให้ login ด้วย Google account ที่เป็น project owner

# Associate project
cd ../firebase
firebase use --add
# เลือก project ที่สร้างไว้
# ตั้งชื่อ alias: production (หรือชื่ออื่นที่ต้องการ)
```

### Step 6: Deploy Firestore Rules & Indexes

```bash
cd firebase

# Deploy security rules
firebase deploy --only firestore:rules

# Deploy indexes
firebase deploy --only firestore:indexes

# หรือ deploy ทั้งสองอย่างพร้อมกัน
firebase deploy --only firestore
```

**ตรวจสอบ indexes สำเร็จ:**
- ไป Firebase Console → Firestore Database → Indexes tab
- ควรเห็น indexes สำหรับ `worklogs` collection

### Step 7: Create First Superadmin

หลังจาก setup เสร็จ ต้องสร้าง superadmin คนแรกด้วยตนเอง:

**1. รัน dev server:**
```bash
cd frontend
npm run dev
```

**2. เปิด http://localhost:3000 และ Login:**
- กด "Sign in with Google"
- ใช้ email @icit.kmutnb.ac.th
- ครั้งแรกจะถูกสร้างเป็น user ที่ยังไม่มี role

**3. ไป Firebase Console ตั้งค่า role:**
- Firestore Database → `users` collection
- หา document ตัวเอง (ดูจาก email)
- แก้ไข:
  ```json
  {
    "role": "superadmin",
    "active": true
  }
  ```

**4. Refresh หน้าเว็บ:**
- ควรเห็นเมนู Admin และ System แล้ว
- สามารถอนุมัติ users อื่นได้ผ่าน Admin → Users

### Step 8: Development Server

```bash
cd frontend

# Development mode (with hot reload)
npm run dev

# เปิด http://localhost:3000
# สามารถเข้าจากเครื่องอื่นใน network ได้ผ่าน IP
```

**Development Features:**
- Hot Module Replacement (HMR)
- Source maps
- Error overlay
- API request logging (ถ้าเปิด debug)

### Step 9: Production Build

```bash
cd frontend

# สร้าง production build
npm run build

# Output อยู่ใน `frontend/out` และถูก copy ไป `firebase/out` อัตโนมัติ
# ตรวจสอบว่า build สำเร็จ:
ls ../firebase/out
```

**Build Checklist:**
- [ ] ไม่มี build errors
- [ ] Static HTML generated สำเร็จ
- [ ] Files อยู่ใน `firebase/out/`
- [ ] `firebase/out/index.html` มีขนาด > 10KB

### Step 10: Deploy to Production

```bash
cd firebase

# Deploy hosting + firestore rules
firebase deploy --only hosting,firestore:rules

# หรือ deploy ทุกอย่าง
firebase deploy
```

**Deploy สำเร็จ:**
- จะได้ URL: `https://your-project-id.web.app`
- หรือ custom domain (ถ้าตั้งค่าไว้)

### Post-Deploy Verification

**1. Test Authentication:**
- Sign in with Google
- ตรวจสอบ redirect กลับมาถูกต้อง

**2. Test Firestore Connection:**
- สร้าง worklog ใหม่
- ตรวจสอบว่าปรากฏใน list

**3. Test Real-time:**
- เปิด 2 browsers (2 users)
- ให้ user A สร้าง worklog
- User B ควรเห็น worklog ใหม่ทันที

### Version Convention

**ทุกครั้งที่ deploy ต้องอัพเดท:**

1. **AppShell.js:**
   ```javascript
   // frontend/components/AppShell.js line ~308
   labboy Workload Recorder — v1.9.5
   ```

2. **README.md:**
   - เพิ่ม entry ใน Changelog
   - อัพเดท version ที่ header

3. **package.json (optional):**
   ```json
   "version": "1.9.5"
   ```

4. **Git tag (recommended):**
   ```bash
   git tag -a v1.9.5 -m "Release v1.9.5 - QuickLog fixes"
   git push origin v1.9.5
   ```

---

## การ Deploy (Deployment)

### Firebase Pricing Plan

ระบบใช้ **Firebase Spark Plan (Free Tier)**:

| Service | Free Quota | Current Usage (Est.) | Notes |
|---------|-----------|---------------------|-------|
| Firestore Reads | 50,000/วัน | ~5,000/วัน | Real-time listeners ใช้ 1 read/ doc |
| Firestore Writes | 20,000/วัน | ~500/วัน | แต่ละ worklog = 1 write |
| Firestore Deletes | 20,000/วัน | ~50/วัน | น้อยมาก |
| Hosting Bandwidth | 10 GB/เดือน | ~500 MB/เดือน | Static site, optimized |
| Hosting Storage | 1 GB | ~50 MB | Next.js output |
| Authentication | ไม่จำกัด | ~20 users | ไม่คิดค่าใช้จ่าย |
| Cloud Functions | ไม่มีใน Spark | - | ระบบไม่ใช้ Functions |

**Cost Estimate:** $0/เดือน (อยู่ใน free tier)

### Deployment Environments

```
Development (localhost:3000)
    └── ใช้ .env.local
    
Staging (optional)
    └── Firebase project: labboy-workload-app-staging
    
Production (labboy-workload-app.web.app)
    └── Firebase project: labboy-workload-app
    └── Custom domain: (optional)
```

### Pre-Deployment Checklist

- [ ] All tests pass (`npm run test` if available)
- [ ] No console errors in development
- [ ] Build สำเร็จ (`npm run build`)
- [ ] Environment variables ถูกต้อง
- [ ] Version number อัพเดทใน AppShell.js
- [ ] Changelog อัพเดท
- [ ] Firestore rules deploy สำเร็จ
- [ ] Indexed สร้างครบถ้วน

### Deploy Commands

```bash
# 1. Build production
cd frontend
npm run build

# ตรวจสอบ build สำเร็จ
ls ../firebase/out

# 2. Deploy hosting + rules
cd ../firebase
firebase deploy --only hosting,firestore:rules

# Deploy เฉพาะ hosting (ถ้า rules ไม่เปลี่ยน)
firebase deploy --only hosting

# Deploy ทุกอย่าง
firebase deploy

# Deploy ไปยัง specific project
firebase deploy --project=production
```

### Rollback Procedure

หาก deploy มีปัญหา:

```bash
# ดู release history
firebase hosting:releases:list

# Rollback ไปยัง version ก่อนหน้า
firebase hosting:clone production:VERSION_ID production:latest
```

**Manual Rollback:**
1. Revert code ไปยัง commit ก่อนหน้า
2. Build ใหม่
3. Deploy อีกครั้ง

### Monitoring After Deploy

**Firebase Console:**
- **Firestore**: Usage tab → ดู reads/writes
- **Hosting**: Usage tab → ดู bandwidth
- **Authentication**: Users tab → ดู active users
- **Performance**: ดู Core Web Vitals

**Health Checks:**
- [ ] Sign in ได้
- [ ] Create worklog ได้
- [ ] Real-time sync ทำงาน
- [ ] Export CSV ได้
- [ ] Admin functions ทำงาน

### Custom Domain (Optional)

**Setup Custom Domain:**

1. Firebase Console → Hosting → Custom Domain
2. Add custom domain (เช่น `workload.icit.kmutnb.ac.th`)
3. ทำตามขั้นตอน verify domain
4. ตั้งค่า DNS records ตามที่ Firebase แนะนำ
5. รอ SSL certificate provision (~1-24 ชั่วโมง)

**CDN Benefits:**
- Firebase Hosting มี CDN ทั่วโลก
- Edge locations ใน Singapore, Hong Kong, Japan (ใกล้ไทย)
- Automatic SSL (HTTPS)
- HTTP/2 enabled

---

## ความปลอดภัย (Security)

### Security Audit Summary

| Category | Status | Tool/Method |
|----------|--------|-------------|
| Dependency Vulnerabilities | ✅ 0 Critical/High | Snyk SAST |
| DOM XSS | ✅ Protected | DOMPurify + Snyk |
| Authentication | ✅ Secure | Firebase Auth + Google OAuth 2.0 |
| Authorization | ✅ Role-based | Firestore Security Rules |
| Data Validation | ✅ Server-side | Firestore Rules + Client Validation |
| HTTPS | ✅ Enforced | Firebase Hosting |
| Security Headers | ✅ Configured | Firebase Hosting Headers |
| Input Sanitization | ✅ Implemented | DOMPurify |

### Dependency Security (Snyk)

ระบบสแกนด้วย Snyk ทุก release:

```bash
# Snyk CLI สแกน
cd frontend
snyk test

# Snyk Code สแกน source code
snyk code test
```

**Current Status:**
- 0 critical vulnerabilities
- 0 high vulnerabilities
- 0 medium vulnerabilities (ที่เกี่ยวข้องกับ production code)

### Input Sanitization

**DOMPurify ใช้ใน:**
- `comment` fields (worklog comments)
- `recipient` fields (ผู้รับบริการ)
- `equipment` identifiers

```javascript
// ตัวอย่างการใช้ DOMPurify
import DOMPurify from 'dompurify';

const cleanComment = DOMPurify.sanitize(dirtyInput, {
  ALLOWED_TAGS: [], // ไม่อนุญาต HTML tags
  ALLOWED_ATTR: [] // ไม่อนุญาต attributes
});
```

### Firestore Security Rules

**Key Security Patterns:**

1. **Authentication Required:**
   ```javascript
   function isAuthenticated() {
     return request.auth != null;
   }
   ```

2. **Role Verification:**
   ```javascript
   function isAdmin() {
     return isAuthenticated() && 
       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'superadmin'];
   }
   ```

3. **Data Ownership:**
   ```javascript
   function isWorkLogOwner(worklog) {
     return worklog.employeeId == request.auth.uid;
   }
   ```

4. **Time-based Locks:**
   ```javascript
   // Staff แก้ไขได้เฉพาะวันเดียวกัน
   allow update: if isAdmin() || 
     (isWorkLogOwner(resource.data) && !resource.data.locked);
   ```

### Security Headers

Firebase Hosting `firebase.json`:

```json
{
  "hosting": {
    "headers": [
      {
        "source": "**",
        "headers": [
          {
            "key": "X-Frame-Options",
            "value": "DENY"
          },
          {
            "key": "X-Content-Type-Options",
            "value": "nosniff"
          },
          {
            "key": "X-XSS-Protection",
            "value": "1; mode=block"
          },
          {
            "key": "Referrer-Policy",
            "value": "strict-origin-when-cross-origin"
          },
          {
            "key": "Permissions-Policy",
            "value": "camera=(), microphone=(), geolocation=()"
          }
        ]
      }
    ]
  }
}
```

### Email Domain Restriction

รองรับเฉพาะ @icit.kmutnb.ac.th:

```javascript
// Google Auth Provider
const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  hd: 'icit.kmutnb.ac.th'  // Hosted Domain restriction
});
```

**Note:** Restriction นี้เป็นแค่ UI hint ต้อง validation เพิ่มเติมใน Firestore rules.

### Best Practices Followed

1. **No Secrets in Client Code:** ใช้ environment variables สำหรับ API keys
2. **Least Privilege:** Firestore rules ให้สิทธิ์น้อยที่สุดที่จำเป็น
3. **Defense in Depth:** Validation ทั้ง client-side และ server-side
4. **Audit Logging:** บันทึกทุก critical action ใน systemLogs
5. **Regular Updates:** Dependencies อัพเดทผ่าน `npm audit fix`

### Reporting Security Issues

หากพบช่องโหว่ กรุณาแจ้ง:
- Email: pongsakon.be1@gmail.com
- ไม่ต้องเปิด public issue ก่อนแจ้ง
- ให้รายละเอียด steps to reproduce

---

## การทดสอบระบบ (Testing)

### กลยุทธ์การทดสอบ

ระบบใช้การทดสอบ 3 ระดับ:

```
Unit Tests (Vitest)          — ทดสอบ Pure Functions & Validation Logic
         │
E2E Tests (Playwright)       — ทดสอบ User Flow บน Real Browser
         │
Security Tests (Snyk + Manual) — ทดสอบ Auth, Firestore Rules, OWASP Top 10
```

### E2E Tests (Playwright)

ระบบใช้ **Playwright** สำหรับ End-to-End Testing ครอบคลุม:

| Test Suite | จำนวน Tests | สถานะ |
|-----------|-------------|-------|
| Authentication — unauthenticated redirect | 4 | ✅ Pass |
| Authentication — staff permissions | 6 | ✅ Pass |
| Authentication — admin permissions | 5 | ✅ Pass |
| Security — Firestore rules boundary | 8 | ✅ Pass |
| Push Notification — health check | 3 | ✅ Pass |
| E2E Flow — login → record → export | 4 | ✅ Pass |
| **รวม** | **~42 tests** | **40/42 ✅** |

> 2 tests ที่ skip: ขึ้นกับ `RENDER_URL` (Push Notification backend ที่ต้องการ env variable)

**รันทดสอบ:**

```bash
cd frontend

# รันทุก tests
npx playwright test

# รันเฉพาะ security suite
npx playwright test --grep "security"

# รันพร้อม UI (Headed mode)
npx playwright test --headed

# ดู test report
npx playwright show-report
```

**ตัวอย่าง Test Cases สำคัญ:**

```javascript
// ทดสอบ: unauthenticated user ต้อง redirect ไป /login
test('should redirect unauthenticated users from /dashboard to /login', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/login/);
});

// ทดสอบ: Staff ไม่สามารถเข้า /admin/*
test('should block staff from admin pages', async ({ page }) => {
  // ... login as staff
  await page.goto('/admin/users');
  await expect(page).toHaveURL(/login|dashboard/);
});
```

### Unit Tests (Vitest)

ทดสอบ Pure Functions ที่ critical:

```bash
cd frontend
npx vitest run
```

**Functions ที่ทดสอบ:**

| Module | Function | ครอบคลุม |
|--------|---------|---------|
| `lib/validation.js` | `validateWorklog()` | Required fields, date format, time format |
| `lib/csvExport.js` | `generateCSV()` | Header, encoding BOM, Thai fiscal year |
| `lib/thaiHolidays.js` | `isHoliday()` | Hardcoded + API holidays |
| `lib/commentSuggestions.js` | `getSuggestions()` | minorTask → suggestion mapping |

### Security Testing (Snyk)

```bash
cd frontend

# Scan Open Source dependencies
snyk test

# Scan Source Code (SAST)
snyk code test

# Container scan (ถ้ามี)
snyk container test
```

**ผลการสแกน (v2.7.0):**

| Category | Critical | High | Medium | Low |
|----------|---------|------|--------|-----|
| Open Source | 0 | 0 | 0 | 0 |
| Source Code (SAST) | 0 | 0 | 0 | 2* |

> *2 Low items เป็น false positive ที่ไม่กระทบ production code

### Manual Testing Checklist

ทุก Release ต้องทดสอบ:

**Functional:**
- [ ] Login ด้วย Google Account @icit.kmutnb.ac.th ได้
- [ ] Quick Log บันทึกสำเร็จและแสดง toast
- [ ] Combo Template บันทึกหลายงานพร้อมกัน
- [ ] Dashboard แสดงสถิติถูกต้อง
- [ ] Export CSV ดาวน์โหลดได้และเปิดใน Excel ได้
- [ ] Admin สามารถดู worklog ของทุกคน
- [ ] Staff ไม่สามารถแก้ไขงานข้ามวัน

**Responsive / Cross-Browser:**
- [ ] Chrome (Desktop)
- [ ] Safari (iOS)
- [ ] Chrome (Android)
- [ ] Mobile (375px viewport)
- [ ] Tablet (768px viewport)

**PWA:**
- [ ] Install บน iOS ได้ (Add to Home Screen)
- [ ] Install บน Android ได้
- [ ] Offline page แสดงเมื่อไม่มี internet

**Performance (Lighthouse):**
- [ ] Performance Score > 85
- [ ] Accessibility Score > 90
- [ ] Best Practices > 90
- [ ] SEO > 80

---

## ข้อจำกัดระบบ (Limitations)

### ✅ สิ่งที่ระบบทำได้

| ฟีเจอร์ | รายละเอียด |
|---------|-----------|
| บันทึก/แก้ไข/ลบ worklog | ได้เฉพาะวันเดียวกัน (staff), ไม่จำกัดวัน (admin/superadmin) |
| Quick Log + Combo Template | บันทึกงานซ้ำๆ ด้วยปุ่มเดียว หรือหลายงานพร้อมกัน |
| ดูตารางห้องเรียน + คุมสอบ DL | iOS-style calendar รายวัน พร้อมชื่อผู้คุมสอบ |
| จัดการตารางเรียนชั้น 4 | สร้าง/แก้ไข/ลบ, bulk toggle เปิด/ปิดรายการที่เลือก |
| จัดการตารางคุมสอบ DL | สร้าง/แก้ไข/ลบ, ภาพรวม 406/407/CEM + ผู้คุมสอบ |
| Export CSV | staff ส่งออกข้อมูลตัวเอง, admin/superadmin ส่งออกทุกคน |
| Push Notification | แจ้งเตือนเมื่อลืมบันทึกงาน (Render + Cron-job.org) |
| Dashboard & Analytics | Heatmap, Hour-of-Day chart, leaderboard, filter ช่วงวันที่ |
| สถานะห้องและอุปกรณ์ Real-time | ห้อง 303-407, หูฟัง ICIT01-20, ปลั๊ก ICIT21-25 |
| PWA | ติดตั้งเป็น App บน iOS/Android/Desktop, offline บางส่วน |

### ❌ สิ่งที่ระบบทำไม่ได้ — ข้อจำกัดตามสิทธิ์

| ข้อจำกัด | รายละเอียด |
|----------|-----------|
| **แก้ไข worklog ข้ามวัน (Staff)** | Staff แก้ไขได้เฉพาะวันที่บันทึก ถ้าเลย 23:59 จะถูก lock — ต้องให้ Admin/Superadmin แก้แทน |
| **ลบ worklog (Staff)** | Staff ลบได้เฉพาะวันเดียวกัน มี Undo 30 วินาที |
| **ดูข้อมูล worklog ของคนอื่น (Staff)** | Staff เห็นเฉพาะงานตัวเอง |
| **Export ข้อมูลทุกคน (Staff)** | Export ได้เฉพาะข้อมูลตัวเอง — Admin/Superadmin เท่านั้น export ทั้งหมดได้ |
| **สร้าง/แก้ไข Templates** | เฉพาะ Admin/Superadmin — Staff ใช้ได้แต่สร้างหรือแก้ไขไม่ได้ |
| **แต่งตั้ง Superadmin** | เฉพาะ Superadmin — Admin แต่งตั้งไม่ได้ |
| **Broadcast Push Notification** | เฉพาะ Superadmin — Admin ส่ง broadcast ไม่ได้ |
| **ดู System Logs / Staff Analytics / Equipment Health** | เฉพาะ Admin/Superadmin — Staff ไม่มีสิทธิ์เข้าถึง |
| **ปฏิทินรายวันแบบข้ามเดือน** | iCloudCalendarStrip โหลด DL exam เฉพาะสัปดาห์ปัจจุบัน |
| **Offline ครบถ้วน** | บันทึกงานใหม่และ real-time data ต้องการ internet |
| **Login ด้วย email อื่น** | รองรับเฉพาะ @icit.kmutnb.ac.th เท่านั้น |
| **Bulk Import (Admin)** | เฉพาะ Superadmin เท่านั้น |

### 🚧 ฟีเจอร์ที่ยังไม่ได้ implement (Planned / TODO)

| ฟีเจอร์ | สถานะ | หมายเหตุ |
|---------|-------|---------|
| **Profile Radar Chart** | 📋 Planned | แสดง Top 8 minorTask ที่ทำบ่อยสุดเป็น radar บนหน้า Profile ของ staff แต่ละคน |
| **InfoTooltip บน Seasonal Chart** | 📋 Planned | อธิบายสี/ความหมายแท่งกราฟ Seasonal Pattern บน Dashboard |
| **2FA สำหรับ Admin** | 🔲 UI-only | UI ใน Settings มีแล้ว แต่ logic ยังไม่ implement — แสดง note "coming soon" |
| **Session Timeout จริง** | 🔲 UI-only | UI ตั้งค่าใน Settings มีแล้ว แต่ยังไม่ enforce ใน AuthProvider |
| **Push Notification E2E Tests** | ⚠️ Skip | 2 tests skip เพราะต้องการ `RENDER_URL` + `SUPERADMIN_ID_TOKEN` env ใน CI |
| **`displayName` Lock (Staff)** | 📋 Planned | ป้องกัน staff แก้ไข `displayName` ใน Firestore Rules + ซ่อน input บน profile page |

---

## ประวัติการเปลี่ยนแปลง (Changelog)

| Version | วันที่ | การเปลี่ยนแปลง |
|---------|--------|----------------|
| **v2.9.0** | 2026-07-17 | **FIX: Dashboard query limit**: เปลี่ยนจาก `limit(1000)` เป็น paginated fetch (batch 1000, loop จนครบ) — แก้ปัญหาปีงบแสดงไม่ครบเมื่อมี >1000 worklogs; **FIX: Classroom alert สำหรับ Staff**: เพิ่ม `ScheduleAlertBanner` ใน `worklogs/new/page.js` — เดิมแสดงเฉพาะ admin/record; **UX: Pie chart color palette**: เปลี่ยนจาก grayscale 6 สี → 8 สีสันแยกชัด (print-friendly) + label % บน slice; **UX: PDF export กราฟแนวโน้มรายวัน**: แก้ `DailyWorkloadTrend` — fixed height container, `isAnimationActive=false`, tick formatter DD/MM, `interval=preserveStartEnd`; **UX: Print CSS**: เพิ่ม min-height สำหรับ recharts containers + Pie label visibility |
| **v2.8.1** | 2026-06-20 | **FIX: Settings page crash**: เพิ่ม `Lock` icon import ที่ขาดหายใน `settings/page.js` (root cause ของ `TypeError: Illegal constructor`); **FIX: layout.js static export**: แทน `getLocale()/getMessages()` (server-only) ด้วย import `th.json` โดยตรง รองรับ `output: "export"`; **FIX: Backend daily-reminder GET**: เพิ่ม `GET /api/notify/daily-reminder` route และรับ secret จาก `?secret=` query param — แก้ปัญหา Cron-job.org ส่ง GET แต่ server รับแค่ POST (`Route not found`); **FIX: CORS no-origin block**: อนุญาต no-origin requests ผ่านได้ (security ยังอยู่ที่ CRON_SECRET) — Cron-job.org ไม่มี `origin` header จึงถูก block ใน production |
| **v2.8.0** | 2026-06-20 | **UX: Admin/Superadmin Navbar Redesign**: navbar บน PC เปลี่ยนเป็น icon-only pills; hover แสดงชื่อเมนูแบบ expand (ป้องกันตัวหนังสือซ้อนกันเมื่อมีเมนูเยอะ); **UX: Mobile Drawer Grouped**: แบ่งกลุ่ม "ทั่วไป" / "จัดการระบบ" + role badge (purple/blue) ใน header; **FEAT: Admin Nav ครบ**: เพิ่ม วิเคราะห์ประสิทธิภาพ, สุขภาพอุปกรณ์, Audit Logs ใน nav ทั้ง desktop + mobile drawer; **UX: iCloudCalendarStrip Mobile**: ซ่อน Timeline บน mobile (`hidden sm:block`) — แสดงเฉพาะ Compact Cards พร้อม `max-h` + scroll ป้องกันล้นหน้าจอ; **FIX: RoomEquipmentStatus**: แยก Pass 2A (room logs) / 2B (equipment logs) filter อิสระ — แก้ bug สถานะ equipment reset กลับเป็น available หลัง reload; **FIX: SmartEquipmentModal**: condition อ่านจาก return log เท่านั้น (limit 500) — สถานะ damaged/lost คงอยู่ถูกต้อง; **VCS: Footer + FABVersionControl** อัปเดต v2.8.0 |
| **v2.7.0** | 2026-06-17 | **UX: iCloudCalendarStrip redesign**: ขยาย timeline scope 07:00–22:00; card background ใช้สีโปร่งใสประจำห้อง (blue/violet/emerald/sky); subject font ปรับขนาด dynamic ตาม card height (sm ≥90px / xs ≥64px / 11px); แสดง proctor ครบทุกคน (ลบ cap 2 คน); **FIX: Classroom Schedules delete**: เปลี่ยน soft delete → hard delete (`deleteDoc`) ลบออกจาก Firestore จริง; **UX: NotificationBell alert**: ย้าย toast จาก `top-4` → `bottom-20` ไม่บัง navbar; **UX: ScheduleAlertBanner**: toast bottom-right ไม่บัง navbar; **VCS: FABVersionControl** อัปเดต v2.7.0 features/changes |
| **v2.6.0** | 2026-06-17 | **FEAT: iCloudCalendarStrip**: ปฏิทินรายวัน iOS-style — Time Grid 07:00–19:00, now-line สีแดง, วันนี้ตัวเลข+ชื่อวันสีแดง, ปุ่ม วันนี้ สีแดง, นำทางข้ามวัน, overlap events แบบ side-by-side lanes, ซ่อน scrollbar, ชื่อผู้คุมสอบ DL ใช้ displayName; **FEAT: ScheduleManager**: checkbox selection + bulk toggle เปิด/ปิดรายการที่เลือก, ภาพรวมห้อง 401/402/406/407 วันนี้แบบสี; **FEAT: DLExamManager**: ภาพรวม 406/407/CEM + ผู้คุมสอบ (displayName), ลบ RoomUsageCalendar weekly view ออกจาก system tabs; **FIX: ScheduleManager isActive**: แก้ isActive ตอนสร้างตารางใหม่อ่านค่าจาก checkbox จริง; **FIX: ScheduleManager delete**: แสดงตารางทุกสถานะ (ไม่กรองเฉพาะ active); **UX: Mobile worklogs/new**: ปุ่มกรอกเอง + calendar toggle + ซ่อน TodayRoomSchedule ซ้ำซ้อน |
| **v2.5.0** | 2026-06-17 | **FEAT: TodayRoomSchedule (iOS Compact)**: Dashboard แสดง widget ตารางห้องเรียนชั้น 4 วันนี้แบบ iOS Calendar style — ห้องที่ต้องเปิด (pill badges), กิจกรรม active/upcoming/past (color-coded cards), นาฬิกา real-time tick ทุก 1 นาที, รองรับทั้งตารางเรียน (recurring by day-of-week) และตาราง DL Exam (date-specific); **FEAT: User Manual (/help)**: หน้าคู่มือการใช้งานแบบ Accordion 8 หัวข้อ (ภาพรวม/Dashboard/บันทึกงาน/ห้องเรียน/ประวัติ/Export/Admin/FAQ); **UX: Footer**: เพิ่ม link "คู่มือการใช้งาน" ใน Footer และ Nav Drawer (Mobile); **UX: AppShell Footer**: อัปเดต version เป็น v2.5.0 |
| **v2.4.0** | 2026-06-17 | **FEAT: RoomUsageCalendar Desktop View Toggle**: ปุ่ม 1วัน/3วัน/สัปดาห์ บนหน้า admin/record — ลบ Calendar ซ้ำออก เหลืออันเดียวพร้อม `allowViewToggle`; **UX: admin/record Layout**: สลับ Desktop layout — Calendar ซ้าย (60%), Form ขวา (40%); **FIX: Dashboard**: ลบ RoomUsageCalendar compact view ออกจาก Dashboard (แทนด้วย TodayRoomSchedule v2.5.0) |
| **v2.3.0** | 2026-06-06 | **FEAT: Equipment Borrow/Return Export**: Admin/Superadmin ส่งออกประวัติการยืม/คืนอุปกรณ์เป็น CSV พร้อม date range picker (เลือกช่วงวันที่) — query Firestore `worklogs` จับคู่ log ยืม+คืน อัตโนมัติ, CSV columns: วันที่ยืม/เวลายืม/Barcode/รหัสอุปกรณ์/ผู้ยืม/สถานะ/ผู้รับคืน/เวลาคืน/สภาพ/หมายเหตุ, BOM สำหรับ Thai encoding; **FIX: Equipment Lost Color**: เปลี่ยนสี `lost` จากแดงเข้ม → สเลท/เทา (`slate-400/500`) ให้สื่อ "disabled/unavailable" (Apple iOS semantic); **FIX: Nested Button Hydration Error**: แก้ `<button>` ซ้อน `<button>` ใน `RoomEquipmentStatus` — เปลี่ยน inner เป็น `<div role="button">`; **FIX: คู่มืออ่านกราฟ z-index**: แก้ popup ถูก container อื่นกลบด้วย `createPortal` + `fixed z-[9999]`; **UX: Export Buttons**: ปรับ export buttons ให้ minimal Apple/iOS style — `bg-white border-slate-200/60 shadow-sm`, font 10px, icon strokeWidth 1.5; **UX: Seasonal Chart Label**: เปลี่ยน "พยากรณ์ช่วงพีค" → "ช่วงที่อาจมีงานมาก" พร้อม note "จากตารางการศึกษา (ข้อมูล 1 ปี ไม่เพียงพอสำหรับ statistical prediction)" |
| **v2.2.0** | 2026-06-03 | **FEAT: Combo Template**: เพิ่มระบบ Combo Template — Admin สร้าง template ที่ประกอบด้วยหลาย minorTask, Staff กดครั้งเดียว กรอก recipient ครั้งเดียว → บันทึก worklogs หลายรายการพร้อมกัน (`Promise.all`); ปุ่ม combo แสดง badge สีม่วงจำนวนงาน, modal preview ก่อนบันทึก; `TemplateManager.js` เพิ่ม isCombo toggle + comboItems editor; `QuickLogButtons.js` เพิ่ม combo modal + handler; `quickLogTemplates.js` เพิ่ม `logFromComboTemplate()` |
| **v2.1.0** | 2026-06-03 | **FEAT: Background Push Notification**: เพิ่มระบบส่ง Push Notification ผ่าน Backend (Render + Cron-job.org) — daily reminder แจ้งเตือนพนักงานที่ยังไม่ลงงาน + broadcast push สำหรับ Superadmin; **Backend**: เพิ่ม Express server (`backend/`) พร้อม endpoints `/api/notify/daily-reminder` (CRON_SECRET auth + `crypto.timingSafeEqual`), `/api/notify/broadcast` (Firebase ID Token + superadmin role check), `/api/notify/health`; **FCM Service**: `backend/src/services/fcm.js` ใช้ firebase-admin SDK ส่ง multicast push; **Frontend — Settings UI**: เพิ่มหน้าตั้งค่า Push Notification ใน Admin Settings — toggle เปิด/ปิด, เลือกเวลาส่ง `pushReminderTime`, เลือกวัน `reminderDays` (จ–อา) พร้อม `aria-pressed` accessibility; **Frontend — Broadcast UI**: Superadmin เห็น Broadcast section ใน Settings — กรอก Title/Body แล้วส่ง push ถึงทุกคน แสดงผล sent/failed count; **Security — CRON_SECRET guard (FIX-4)**: เพิ่ม production guard ใน `backend/src/config/env.js` — throw error ถ้าไม่ตั้ง `CRON_SECRET` env var ใน production ป้องกันการใช้ค่า default; **Firestore Rules**: อนุญาต user update `fcmToken` field อย่างจำกัด; **QA Sign-off**: Snyk SAST ผ่าน (0 actionable issues ใน production code), Playwright E2E 32 tests — 22 passed, 10 skipped (รอ RENDER_URL), 0 failed |
| **v2.0.2** | 2026-06-02 | **Firestore Rules — `isValidWorkLogUpdate` fix**: แก้ไข helper function ที่บังคับตรวจ `date` และ `time` ทุกครั้ง ทำให้ staff ที่ส่งเฉพาะฟิลด์ที่แก้ไข (partial update) ถูก Firestore ปฏิเสธด้วย `permission-denied` — เปลี่ยนเป็น optional check ด้วย `hasAny()` ตรวจเฉพาะฟิลด์ที่ส่งมาจริง |
| **v2.0.1** | 2026-06-02 | **Firestore Rules — `isSameDay` fix**: แก้การเรียก `.format()` บน Timestamp ที่ไม่รองรับใน Firestore Rules — เปลี่ยนเป็น manual zero-pad ด้วย `.year()/.month()/.day()`; **QuickLog modal UI**: ปรับ UI ของ modal ใน `QuickLogButtons.js`; **Audit Logs — Superadmin access**: แก้หน้า `audit-logs/page.js` ที่จำกัดเฉพาะ `admin` ให้รองรับ `superadmin` ด้วย — แก้ทั้ง redirect guard, data fetch condition, และ loading fallback; **Audit Logs — details null crash**: แก้ `log.details.toLowerCase()` ที่ crash เมื่อ `details` เป็น `""` หรือ `null` → เพิ่ม `(log.details \|\| "")` |
| **v2.0.0** | 2026-06-02 | **Security — Firestore Rules (Critical)**: ปิดช่องโหว่ 3 จุด — `pendingUsers` read/delete จำกัดเฉพาะ `isAdmin()`, `notifications create` ล็อคป้องกัน unauthorized write, ลบ `'admin'` ออกจาก self-creation role list; **Security — Auth Guard (Critical)**: แก้ `AppShell.js` ที่ข้ามการ redirect `/admin/*` เมื่อ unauthenticated ทำให้ UI ถูก expose โดยไม่ต้อง login; **Notification Bug Fix**: แก้ broadcast notification ถูกลบพร้อมกันทุก user — เปลี่ยนจาก `deleteDoc` เป็น soft-delete ด้วย `readBy: arrayUnion(uid)` + อัปเดต Firestore rule รองรับ `readBy` field; **FEAT: Print Summary (พิมพ์รายงานประจำเดือน)**: ปุ่มพิมพ์รายงานบน Dashboard (Admin/Superadmin) พร้อม print header (ชื่อองค์กร, ช่วงวันที่, วันที่พิมพ์) และ `@media print` CSS; **UX/Accessibility (WCAG 2.1 AA)**: เพิ่ม `role="status"` บน toast, `role="dialog"` บน custom date modal, `aria-pressed` บน filter buttons, `aria-label` บน icon-only buttons, `role="alert"` บน limit warning; **E2E Tests**: security test suite 11 tests ผ่านทั้งหมด (Playwright) |
| **v1.9.5** | 2026-05-29 | **QuickLog hold fix**: เปลี่ยน `holdRafRef`/`executingRef` จาก plain object เป็น `useRef` จริง — แก้ปัญหา guard ถูก reset ทุก render ทำให้กดค้างไม่ครบแล้วกดใหม่บันทึกซ้ำ; **Pagination**: แสดง 6 templates ต่อหน้า มีปุ่ม ‹ ก่อนหน้า / ถัดไป › เมื่อมีมากกว่า 6 รายการ |
| **v1.9.4** | 2026-05-29 | **QuickLog fix**: เพิ่ม `executingRef` guard ป้องกัน double-log เมื่อกดค้างบน PWA, ตั้ง `HOLD_DURATION=3000ms` ให้ชัดเจน, เพิ่ม `e.preventDefault()` บน touchStart/touchEnd ป้องกัน onClick ซ้ำ; **Template**: เพิ่ม option `requireComment` สำหรับ template ที่ต้องกรอกความคิดเห็น (ปฏิบัติงานตามผู้บังคับบัญชา) — เปิด modal กรอกรายละเอียดก่อนบันทึก |
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

## การพัฒนาเพิ่มเติม (Development)

### Development Workflow

```
1. Plan (ออกแบบฟีเจอร์)
   ↓
2. Develop (เขียนโค้ด)
   ↓
3. Test (ทดสอบ)
   ↓
4. Review (ตรวจสอบ)
   ↓
5. Deploy (ปล่อย production)
```

### Branch Strategy

| Branch | Purpose | Protection |
|--------|---------|------------|
| `main` | Production code | Protected, requires PR |
| `develop` | Integration branch | Protected |
| `feature/*` | New features | - |
| `fix/*` | Bug fixes | - |
| `hotfix/*` | Urgent fixes | - |

### Getting Started with Development

```bash
# 1. Fork repository (ถ้าทำ feature ใหม่)
# 2. Clone

git clone https://github.com/PongsakonBe1/employee-workload-app.git
cd employee-workload-app

# 3. Create feature branch
git checkout -b feature/my-new-feature

# 4. ติดตั้ง dependencies
cd frontend
npm install

# 5. สร้าง .env.local (ดูรายละเอียดใน Installation)

# 6. รัน dev server
npm run dev
```

### Code Style

**JavaScript/React:**
- ใช้ single quotes สำหรับ strings
- ใช้ semicolons
- Indent 2 spaces
- Max line length: 100 characters
- ใช้ functional components + hooks

**Example:**
```javascript
// Good
import { useState, useEffect } from 'react';

export default function MyComponent({ userId }) {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    fetchData(userId).then(setData);
  }, [userId]);
  
  if (!data) return <Loading />;
  
  return (
    <div className="p-4">
      <h1>{data.title}</h1>
    </div>
  );
}

// Bad
function MyComponent(props) {
  var data = null;
  // ...
}
```

### Testing

**Manual Testing Checklist:**

ฟีเจอร์ใหม่ต้องทดสอบ:
- [ ] ทำงานบน Chrome
- [ ] ทำงานบน Firefox
- [ ] ทำงานบน Safari (ถ้าใช้ Mac)
- [ ] Responsive บน mobile (375px)
- [ ] Responsive บน tablet (768px)
- [ ] ไม่มี console errors
- [ ] ไม่มี accessibility issues (WCAG 2.1 AA)

**Performance Testing:**
- Lighthouse score > 90
- First Contentful Paint < 1.5s
- Time to Interactive < 3s

### Commit Convention

ใช้ Conventional Commits:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
| Type | ใช้เมื่อ | Example |
|------|----------|---------|
| `feat` | ฟีเจอร์ใหม่ | `feat: add dark mode` |
| `fix` | แก้ bug | `fix: resolve login error` |
| `docs` | แก้เอกสาร | `docs: update README` |
| `style` | แก้ style (ไม่กระทบ logic) | `style: fix indentation` |
| `refactor` | Refactor code | `refactor: extract component` |
| `perf` | Performance | `perf: optimize query` |
| `test` | Tests | `test: add unit tests` |
| `chore` | Maintenance | `chore: update deps` |

**Examples:**
```bash
git commit -m "feat(quicklog): add hold-to-confirm gesture"
git commit -m "fix(auth): resolve iOS PWA redirect loop"
git commit -m "docs(readme): update deployment guide"
```

### Pull Request Process

1. **Before Submitting:**
   - Rebase กับ `develop` ล่าสุด
   - ตรวจสอบว่า tests pass
   - ตรวจสอบว่า build สำเร็จ
   - อัพเดท documentation ถ้าจำเป็น

2. **PR Description ต้องมี:**
   - สรุปการเปลี่ยนแปลง
   - Steps to test
   - Screenshots (ถ้าเป็น UI change)
   - Breaking changes (ถ้ามี)

3. **Review Process:**
   - ต้องมี 1 approval ก่อน merge
   - CI checks ต้องผ่าน
   - Resolve conflicts ถ้ามี

### Project Structure Guidelines

**Adding New Components:**
```
components/
├── ComponentName.js        # Main component
├── ComponentName.test.js   # Tests (ถ้ามี)
└── index.js                # Export (optional)
```

**Adding New Pages:**
```
app/
└── new-page/
    ├── page.js            # Page component
    ├── layout.js          # Layout (ถ้าต่างจาก root)
    └── loading.js         # Loading state
```

**Adding New Libraries:**
1. ตรวจสอบขนาด (bundle size impact)
2. ตรวจสอบ license (ต้อง compatible กับ MIT)
3. อ่าน security advisories
4. ใช้ `npm audit` ตรวจสอบ vulnerabilities

### Useful Commands

```bash
# Development
cd frontend && npm run dev

# Build for production
cd frontend && npm run build

# Lint
cd frontend && npm run lint

# Security audit
cd frontend && npm audit

# Update dependencies
cd frontend && npm update

# Deploy
cd firebase && firebase deploy
```

## Contributing

1. Fork repository
2. สร้าง branch: `git checkout -b feature/your-feature`
3. Commit: `git commit -m 'feat: add your feature'`
4. Push: `git push origin feature/your-feature`
5. เปิด Pull Request

---

## License

MIT © ICIT KMUTNB
