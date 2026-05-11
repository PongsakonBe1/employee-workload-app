@echo off
chcp 65001
echo ==========================================
echo  Setup Superadmin for ICIT Workload App
echo ==========================================
echo.
echo  วิธีใช้:
echo  1. ไปที่ Firebase Console
echo  2. Project Settings ^> Service Accounts
echo  3. Generate new private key
echo  4. บันทึกไฟล์เป็น serviceAccountKey.json ในโฟลเดอร์นี้
echo  5. รันไฟล์นี้อีกครั้ง
echo.

if not exist "serviceAccountKey.json" (
  echo  ❌ ไม่พบไฟล์ serviceAccountKey.json
  echo  กรุณาสร้างไฟล์ก่อน (ดูขั้นตอนข้างบน)
  pause
  exit /b 1
)

echo  ✅ พบไฟล์ serviceAccountKey.json
echo  กำลังติดตั้ง dependencies...

call npm install firebase-admin

echo  กำลังสร้าง Superadmin...

node create-superadmin.js

pause
