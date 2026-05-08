# Firebase Deployment Guide

## Step 1: สร้าง Firebase Project (Web Console)

### 1.1 ไปที่ Firebase Console
```
https://console.firebase.google.com/
```

### 1.2 Click "Create a project"
- **Project name**: `ICIT Workload App`
- **Project ID**: ปล่อยให้ Google สร้างอัตโนมัติ (จะได้แบบ `icit-workload-app-xxxxx`)
- Click **Continue**

### 1.3 Google Analytics (เลือกได้)
- Enable หรือ Disable ก็ได้ (ไม่มีผลกับการใช้งาน)
- Click **Create project**

### 1.4 รอสร้างเสร็จ (~1-2 นาที)
- Click **Continue** เมื่อเสร็จ

---

## Step 2: Enable Services

### 2.1 Firestore Database
1. ซ้ายมือ: **Build** → **Firestore Database**
2. Click **Create database**
3. **Start in production mode** → **Next**
4. **Location**: `asia-southeast1 (Singapore)` → **Enable**

### 2.2 Authentication
1. ซ้ายมือ: **Build** → **Authentication**
2. Click **Get started**
3. **Sign-in method** → **Email/Password** → **Enable** → **Save**
4. **Authorized domains**: เพิ่ม `localhost` (สำหรับ dev)

### 2.3 Functions (เปิดใช้อัตโนมัติเมื่อ deploy ครั้งแรก)

---

## Step 3: Link Project กับ CLI

### 3.1 ใน Terminal (PowerShell/CMD):
```powershell
cd C:\Users\ICIT-Admin\employee-workload-app\firebase
firebase login
```

### 3.2 Link project:
```powershell
firebase use --add
```
- เลือก project ที่เพิ่งสร้าง (ชื่อ `ICIT Workload App`)
- ตั้งชื่อ alias: `default` หรือ `prod`

---

## Step 4: Deploy Firestore Rules

```powershell
firebase deploy --only firestore:rules
```

ผลลัพธ์ที่ควรเห็น:
```
✔ Deploy complete!
Project Console: https://console.firebase.google.com/project/icit-workload-app-xxxxx/overview
```

---

## Step 5: Deploy Functions

### 5.1 Install dependencies:
```powershell
cd functions
npm install
```

### 5.2 Build TypeScript:
```powershell
npm run build
```

### 5.3 Deploy:
```powershell
firebase deploy --only functions
```

**หมายเหตุ**: ครั้งแรกจะใช้เวลา ~3-5 นาที (ต้องสร้าง Cloud Functions environment)

---

## Step 6: Seed Initial Data

### 6.1 สร้าง Service Account Key:
1. ไปที่ https://console.cloud.google.com/
2. เลือก project ของคุณ
3. **IAM & Admin** → **Service Accounts**
4. เลือก `firebase-adminsdk-xxxxx`
5. **Keys** → **Add Key** → **Create new key** → **JSON**
6. ไฟล์จะ download อัตโนมัติ
7. **ย้ายไฟล์ไปที่**: `firebase/seed-data/serviceAccountKey.json`

### 6.2 Run seed script:
```powershell
cd seed-data
node seed-script.js
```

ผลลัพธ์:
```
🌱 Starting Firebase seed...

✓ Categories seeded
✓ User created: admin (uid-xxxxx)
✓ User created: wichai (uid-xxxxx)
...
✅ Seed completed successfully!
```

---

## Step 7: Verify Setup

### 7.1 Check Firestore Database:
ไปที่ https://console.firebase.google.com/ → Firestore Database
ควรเห็น collections:
- `categories/config` ✅
- `users/` (8 documents) ✅

### 7.2 Check Functions:
ไปที่ https://console.firebase.google.com/ → Functions
ควรเห็น:
- `onUserCreated` ✅
- `onWorklogCreated` ✅
- `onWorklogUpdated` ✅
- `onWorklogDeleted` ✅
- `lockWorklogs` ✅

### 7.3 Test Authentication:
ไปที่ https://console.firebase.google.com/ → Authentication → Users
ควรเห็น 8 users

---

## 🔧 Troubleshooting

### Error: "Permission denied"
```
firebase logout
firebase login
firebase use --add
```

### Error: "Cannot find module 'firebase-functions'"
```powershell
cd functions
npm install
npm run build
```

### Functions deploy ช้ามาก
เป็น normal - ครั้งแรกต้องสร้าง infrastructure
รอ 5-10 นาที

### Seed script error: "Cannot find module './serviceAccountKey.json'"
ต้องสร้าง service account key ก่อน (ดู Step 6.1)

---

## ✅ Success Criteria

- [ ] Project สร้างสำเร็จ
- [ ] Firestore Database ทำงาน
- [ ] Authentication เปิดใช้
- [ ] Functions deploy ครบทุกตัว
- [ ] Seed data อยู่ใน database
- [ ] ไม่มี error ใน Console

---

## 🚀 Next: Update Frontend

เมื่อ Firebase setup เสร็จแล้ว ต้องอัพเดต Frontend ให้ใช้ Firebase SDK แทน API ปัจจุบัน

ดู guide ต่อใน: [../frontend/FIREBASE_MIGRATION.md](../frontend/FIREBASE_MIGRATION.md)
