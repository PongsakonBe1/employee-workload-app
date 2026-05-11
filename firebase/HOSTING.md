# Firebase Hosting Setup Guide

## 🌐 Deploy Frontend to Firebase Hosting

### Prerequisites
- Firebase project already created (`icit-workload-app`)
- Firebase CLI installed (`npm install -g firebase-tools`)
- Frontend build is working locally

---

## Step 1: Build Frontend for Production

```powershell
cd C:\Users\ICIT-Admin\employee-workload-app\frontend
npm run build
```

**Check output:**
- ต้องมี folder `frontend/dist` หรือ `frontend/.next/standalone`
- ไม่มี error ใน build process

---

## Step 2: Update firebase.json for Hosting

แก้ไข `firebase/firebase.json`:

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "functions": [
    {
      "source": "functions",
      "codebase": "default",
      "ignore": [
        "node_modules",
        ".git",
        "firebase-debug.log",
        "firebase-debug.*.log"
      ]
    }
  ],
  "hosting": {
    "source": "../frontend",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "frameworksBackend": {
      "region": "asia-southeast1"
    }
  },
  "storage": {
    "rules": "storage.rules"
  }
}
```

**หมายเหตุ:** ใช้ `source` แทน `public` เพื่อให้ Firebase รู้ว่าเป็น Next.js project

---

## Step 3: Enable Web Frameworks

Firebase Hosting รองรับ Next.js แต่ต้องเปิด feature:

```powershell
cd C:\Users\ICIT-Admin\employee-workload-app\firebase
firebase experiments:enable webframeworks
```

---

## Step 4: Deploy to Hosting

```powershell
cd C:\Users\ICIT-Admin\employee-workload-app\firebase
firebase deploy --only hosting
```

**ผลลัพธ์:**
```
✔ Deploy complete!

Project Console: https://console.firebase.google.com/project/icit-workload-app/overview
Hosting URL: https://icit-workload-app.web.app
```

---

## 🔄 Alternative: Deploy with GitHub Actions (Auto-deploy)

### 1. Create GitHub Actions workflow

สร้างไฟล์ `.github/workflows/firebase-hosting.yml`:

```yaml
name: Deploy to Firebase Hosting

on:
  push:
    branches:
      - main

jobs:
  build_and_deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install Frontend Dependencies
        run: |
          cd frontend
          npm ci
          
      - name: Build Frontend
        run: |
          cd frontend
          npm run build
          
      - name: Deploy to Firebase
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
          projectId: icit-workload-app
          entryPoint: ./firebase
```

### 2. Add Firebase Service Account to GitHub Secrets

1. ไปที่ https://github.com/PongsakonBe1/employee-workload-app/settings/secrets/actions
2. New repository secret → Name: `FIREBASE_SERVICE_ACCOUNT`
3. Copy เนื้อหาจาก `serviceAccountKey.json` ใส่ Value
4. Add secret

---

## 📋 Pre-Deployment Checklist

- [ ] Frontend build สำเร็จไม่มี error
- [ ] Firebase config ถูกต้อง (apiKey, projectId)
- [ ] Firestore rules deploy แล้ว
- [ ] Functions deploy แล้ว
- [ ] Users seeded ใน Firestore
- [ ] Worklogs imported จาก CSV แล้ว (ถ้ามี)
- [ ] Authentication (Email/Password) เปิดใช้งาน

---

## 🔧 Custom Domain (Optional)

ถ้าต้องการใช้ domain ของ ICIT:

1. Firebase Console → Hosting → Add custom domain
2. ใส่ `workload.icit.kmutnb.ac.th`
3. ตั้งค่า DNS record ตามที่ Firebase ระบุ
4. รอ SSL certificate (ประมาณ 1-24 ชั่วโมง)

---

## 🧪 Test Plan After Deployment

1. **เข้าเว็บ** → https://icit-workload-app.web.app
2. **Login** ด้วย username/password
3. **Dashboard** แสดงข้อมูลถูกต้อง
4. **Worklogs** ดูรายการได้
5. **New Worklog** บันทึกงานใหม่ได้
6. **Edit/Delete** แก้ไข/ลบได้ (ถ้ายังไม่ locked)

---

## 🔥 One-Command Deploy (Complete)

```powershell
# 1. Import CSV ก่อน (ถ้ามีข้อมูลใหม่)
cd firebase/seed-data
node import-csv.js "C:\Users\ICIT-Admin\Downloads\แบบบันทึกปริมาณงานช่างเทคนิค - Main.csv"

# 2. Deploy ทั้งหมด
cd ..
firebase deploy

# หรือ deploy เฉพาะส่วน
firebase deploy --only hosting
firebase deploy --only firestore:rules
firebase deploy --only functions
```

---

## ⚠️ Common Issues

### Build Error: "Cannot find module"
```powershell
cd frontend
npm install
npm run build
```

### Deploy Error: "Authentication required"
```powershell
firebase logout
firebase login
```

### Hosting 404 Error
ตรวจสอบว่า `firebase.json` มี `rewrites` สำหรับ Next.js:
```json
"hosting": {
  "rewrites": [
    {
      "source": "**",
      "destination": "/index.html"
    }
  ]
}
```

---

**พร้อม Deploy แล้ว!** 🚀

ลองเริ่มจาก Step 1 (Build) ก่อนไหมครับ?
