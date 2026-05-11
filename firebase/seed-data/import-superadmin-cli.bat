@echo off
chcp 65001
echo ==========================================
echo  Import Superadmin via Firebase CLI
echo ==========================================
echo.

:: ใช้ Firebase CLI สร้าง document โดยตรง
firebase firestore:set users/pongsakon.be1@gmail.com superadmin-data.json --project labboy-workload-app

if %errorlevel% neq 0 (
  echo.
  echo ❌ เกิดข้อผิดพลาด
  echo ลองใช้วิธี: node create-superadmin.js แทน
  pause
  exit /b 1
)

echo.
echo ✅ Superadmin created successfully!
pause
