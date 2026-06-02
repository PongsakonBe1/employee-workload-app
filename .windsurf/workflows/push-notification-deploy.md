---
description: Deploy Push Notification Backend บน Render + Cron-job.org
---

# Deploy Push Notification Backend

## ขั้นตอนที่ 1: เตรียม Firebase Service Account

### 1.1 แปลง JSON เป็น One-line String

เปิดไฟล์ `labboy-workload-app-firebase-adminsdk-fbsvc-ff828088d1.json` ใน VS Code แล้ว:

1. กด `Ctrl+A` เลือกทั้งหมด
2. กด `Ctrl+Shift+P` → พิมพ์ `Join Lines` (หรือใช้ find/replace ลบ newline)
3. หรือใช้ online tool: https://jsonformatter.org/json-minifier

ผลลัพธ์จะได้ JSON บรรทัดเดียวแบบนี้:
```
{"type":"service_account","project_id":"labboy-workload-app",...}
```

---

## ขั้นตอนที่ 2: Deploy บน Render.com

### 2.1 สร้าง Web Service ใหม่

1. เข้า https://dashboard.render.com
2. กด **"New +"** → **"Web Service"**
3. Connect GitHub repo: `PongsakonBe1/employee-workload-app`
4. Branch: `main` (หรือ branch ที่ต้องการ)

### 2.2 ตั้งค่า Build & Start

| Field | Value |
|-------|-------|
| **Root Directory** | `backend` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Plan** | `Free` |

### 2.3 ตั้งค่า Environment Variables (สำคัญ!)

กด **"Advanced"** → **"Add Environment Variable"** ใส่ทีละตัว:

```
NODE_ENV=production
PORT=10000
MONGODB_URI=<your-mongodb-uri>
JWT_SECRET=<random-secret-32-chars>
CLIENT_ORIGIN=<frontend-url>

# สำคัญ: คัดลอกทั้งหมดจากขั้นตอน 1.1
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"labboy-workload-app",...}

# สร้าง random secret เอง (อย่างน้อย 32 ตัวอักษร)
CRON_SECRET=your-random-secret-here-min-32-characters
```

⚠️ **สำคัญ:** `FIREBASE_SERVICE_ACCOUNT_JSON` ต้องเป็น one-line JSON ไม่มี whitespace หรือ newline

### 2.4 Deploy

กด **"Create Web Service"**

รอสักครู่ จะได้ URL เช่น: `https://labboy-api.onrender.com`

---

## ขั้นตอนที่ 3: ตั้งค่า Cron-job.org

### 3.1 สร้าง Job ที่ 1: Health Ping (ป้องกัน sleep)

1. เข้า https://cron-job.org/en/
2. กด **"cronjobs"** → **"Create cronjob"**

**ตั้งค่า:**
- **Title**: `Render Health Ping`
- **Address**: `https://<your-render-url>/api/notify/health`
- **Schedule**: ทุก 14 นาที (เลือก `Every 14 minutes`)

### 3.2 สร้าง Job ที่ 2: Daily Reminder

กด **"Create cronjob"** อีกครั้ง:

**ตั้งค่า:**
- **Title**: `Daily Worklog Reminder`
- **Address**: `https://<your-render-url>/api/notify/daily-reminder`
- **Method**: `POST`
- **Headers**:
  ```
  x-cron-secret: your-cron-secret-from-env
  ```
- **Schedule**: ตั้งเวลาตามต้องการ (เช่น 17:00 ทุกวัน)
  - เลือก `Weekly schedule`
  - ติ๊ก: Mon, Tue, Wed, Thu, Fri, Sat (ตามที่ตั้งในแอป)
  - เวลา: 17:00

⚠️ **หมายเหตุ:** เวลาใน Cron-job.org ต้องตรงกับ `reminderTime` ที่ admin ตั้งในแอป (backend จะ double-check)

---

## ขั้นตอนที่ 4: ทดสอบ

### 4.1 Test Health Endpoint

เปิด browser ไปที่:
```
https://<your-render-url>/api/notify/health
```

ควรได้ response:
```json
{"ok": true, "service": "icit-workload-backend", "timestamp": "..."}
```

### 4.2 Test Broadcast (Development)

ใช้ curl หรือ Postman:

```bash
curl -X POST https://<your-render-url>/api/notify/broadcast \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","body":"Hello from labboy!"}'
```

### 4.3 Test Daily Reminder (ด้วย Cron Secret)

```bash
curl -X POST https://<your-render-url>/api/notify/daily-reminder \
  -H "x-cron-secret: your-cron-secret" \
  -H "Content-Type: application/json"
```

---

## Troubleshooting

### ปัญหา: "Firebase not initialized"

**สาเหตุ:** `FIREBASE_SERVICE_ACCOUNT_JSON` ไม่ถูกต้อง

**แก้ไข:**
1. ตรวจสอบว่า JSON เป็น one-line (ไม่มี newline)
2. ตรวจสอบว่าครบทุก field: `type`, `project_id`, `private_key`, `client_email`
3. Regenerate service account key ใน Firebase Console ถ้าจำเป็น

### ปัญหา: "Unauthorized - Invalid cron secret"

**สาเหตุ:** `x-cron-secret` header ไม่ตรงกับ `CRON_SECRET` บน Render

**แก้ไข:** ตรวจสอบว่าใส่ header ถูกต้องใน Cron-job.org

### ปัญหา: Render sleep ทั้งที่มี cron job

**สาเหตุ:** Health ping ห่างเกินไป

**แก้ไข:** ตั้ง ping ทุก 10-14 นาที (ไม่เกิน 15 นาที)

---

## สรุป Files ที่แก้ไข

| ไฟล์ | การเปลี่ยนแปลง |
|------|---------------|
| `backend/package.json` | เพิ่ม `firebase-admin` dependency |
| `backend/.env.example` | เพิ่ม `FIREBASE_SERVICE_ACCOUNT_JSON`, `CRON_SECRET` |
| `backend/src/config/env.js` | เพิ่ม env vars |
| `backend/src/server.js` | Mount `notifyRouter` |
| `backend/src/services/fcm.js` | ใหม่ - Firebase FCM service |
| `backend/src/routes/notify.js` | ใหม่ - Notification endpoints |
