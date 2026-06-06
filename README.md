# labboy Workload Recorder - ICIT Workload Management System

ระบบบันทึกภาระงานพนักงาน สำหรับสำนักคอมพิวเตอร์ ICIT มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ (KMUTNB)  
ระบบรองรับ PWA (Progressive Web App), Firebase Backend, Google Sign-In Authentication, Real-time Notifications และ Quick Log Templates

🌐 **Production URL:** https://labboy-workload-app.web.app  
📦 **Current Version:** v2.3.0  
📅 **Last Updated:** 2026-06-06  
🏢 **Organization:** ICIT KMUTNB  
📄 **License:** MIT License

---

## สารบัญ (Table of Contents)

1. [ภาพรวมระบบ (System Overview)](#ภาพรวมระบบ-system-overview)
2. [คุณสมบัติหลัก (Features)](#คุณสมบัติหลัก-features)
3. [สถาปัตยกรรมระบบ (System Architecture)](#สถาปัตยกรรมระบบ-system-architecture)
4. [Tech Stack](#tech-stack)
5. [โครงสร้างโปรเจ็กต์ (Project Structure)](#โครงสร้างโปรเจ็กต์-project-structure)
6. [ฐานข้อมูล (Database Schema)](#ฐานข้อมูล-database-schema)
7. [สิทธิ์ผู้ใช้งาน (Roles & Permissions)](#สิทธิ์ผู้ใช้งาน-roles--permissions)
8. [API Documentation](#api-documentation)
9. [การติดตั้ง (Installation)](#การติดตั้ง-installation)
10. [การ Deploy (Deployment)](#การ-deploy-deployment)
11. [ความปลอดภัย (Security)](#ความปลอดภัย-security)
12. [ประวัติการเปลี่ยนแปลง (Changelog)](#changelog)
13. [การพัฒนาเพิ่มเติม (Development)](#การพัฒนาเพิ่มเติม-development)

---

## ภาพรวมระบบ (System Overview)

**labboy Workload Recorder** เป็นระบบบันทึกภาระงานดิจิทัลสำหรับพนักงานสำนักคอมพิวเตอร์ มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ (ICIT KMUTNB) ระบบพัฒนาด้วย Next.js และ Firebase รองรับการทำงานแบบ PWA (Progressive Web App) บนมือถือ iOS/Android และ Desktop

### วัตถุประสงค์ของระบบ

1. **บันทึกภาระงานดิจิทัล** — แทนการจดบันทึกด้วยกระดาษ
2. **ติดตามการทำงานแบบ Real-time** — รู้สถานะการทำงานของทีมได้ทันที
3. **สรุปสถิติการทำงาน** — Dashboard แสดงภาพรวมพร้อมกราฟวิเคราะห์
4. **จัดการสถานะห้องและอุปกรณ์** — ติดตามการใช้งานห้องและอุปกรณ์ IoT
5. **แจ้งเตือนอัตโนมัติ** — แจ้งเตือนเมื่อลืมบันทึกงาน

### ผู้ใช้งานระบบ

| ประเภท | จำนวน (โดยประมาณ) | คำอธิบาย |
|--------|-------------------|----------|
| Staff (พนักงาน) | 8-10 คน | บันทึกงานตัวเอง, ดูสถิติส่วนตัว |
| Admin (ผู้ดูแล) | 2-3 คน | จัดการทีม, อนุมัติ users, ดูรายงาน |
| Superadmin | 1-2 คน | ดูแลระบบทั้งหมด, จัดการสิทธิ์ |

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
| Thai Holidays | แสดงวันหยุดนักขัตฤกษ์ไทยในปฏิทิน | v1.7.3 |
| Export CSV | Export ข้อมูลของตัวเอง | v1.5.0 |
| พิมพ์รายงานประจำเดือน (Print Summary) | ปุ่ม "พิมพ์รายงาน" บน Dashboard พร้อม print header (ชื่อองค์กร, ช่วงวันที่, วันที่พิมพ์) และ CSS @media print ซ่อน sidebar/nav/filter (เฉพาะ Admin/Superadmin) | v2.0.0 |

### 👑 Admin (ผู้ดูแลระบบ)

| ฟีเจอร์ | รายละเอียด | เวอร์ชันที่เพิ่ม |
|---------|-----------|----------------|
| บันทึกงานให้พนักงาน | เลือกพนักงานจาก dropdown แล้วบันทึกในนามพนักงาน | v1.8.0 |
| จัดการ Templates | เพิ่ม/แก้ไข/ลบ Quick Log Templates + Combo Templates | v1.8.0 |
| Template Options | `requireRecipient`, `requireComment`, `isSmart` | v1.9.4 |
| Dashboard ทีม | สถิติรวม, เฉลี่ยต่อคน, Top 3, รายชื่อทุกคน | v1.7.0 |
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
┌─────────────────────────────────────────────────────────────────┐
│                    Client Layer (Frontend)                       │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │  Next.js 15  │ │   React 19   │ │  TailwindCSS │             │
│  │  (App Router)│ │   (Hooks)    │ │   (Styling)  │             │
│  └──────────────┘ └──────────────┘ └──────────────┘             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │ next-intl    │ │ Recharts     │ │ next-pwa     │             │
│  │ (i18n TH/EN) │ │ (Charts)     │ │ (PWA)        │             │
│  └──────────────┘ └──────────────┘ └──────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Firebase Platform                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │
│  │  Authentication │  │  Cloud Firestore │  │   Hosting       │   │
│  │  (Google Sign-In)│  │  (NoSQL Database)│  │  (CDN/SSL)      │   │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Real-time
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    External Services                             │
│  ┌─────────────────┐  ┌─────────────────┐                       │
│  │ iApp API        │  │ Google APIs     │                       │
│  │ (Thai Holidays) │  │ (Auth/Fonts)    │                       │
│  └─────────────────┘  └─────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow Diagram

```
User Action → Frontend Component → Firebase Auth Check → Firestore Operation
                                                          ↓
                                                    Real-time Update
                                                          ↓
                                              onSnapshot Listener (All Clients)
```

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

## ประวัติการเปลี่ยนแปลง (Changelog)

| Version | วันที่ | การเปลี่ยนแปลง |
|---------|--------|----------------|
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
