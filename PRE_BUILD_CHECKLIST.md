# Pre-Build & Pre-Deploy Checklist

## 1. Code Verification (ก่อน commit)
- [ ] ตรวจสอบ favicon.ico มีอยู่ใน `frontend/public/favicon.ico`
- [ ] ตรวจสอบ layout.js มี icons metadata
- [ ] ตรวจสอบ AppShell.js ใช้ Image component สำหรับ logo
- [ ] ตรวจสอบ login/page.js ใช้ Image component สำหรับ logo
- [ ] ตรวจสอบ manifest.json ใช้ labboy-logo.png
- [ ] ตรวจสอบ BarChart3 ถูกแทนที่ด้วย LayoutGrid หรือรูปแล้ว

## 2. Gray Box Testing (ก่อน build)
```bash
# Run Gray Box Tests
cd frontend
npx playwright test tests/pwa-login.spec.js --project=chromium
npx playwright test tests/logo-display.spec.js --project=chromium
```

### Test Cases:
1. **PWA Login Flow Test**
   - เปิดหน้า login ใน mobile viewport (iPhone SE)
   - ตรวจสอบ logo แสดงถูกต้อง (ไม่มี broken image)
   - ตรวจสอบ Google login button ทำงาน
   - ตรวจสอบไม่มี redirect loop หลัง login

2. **Logo Display Test**
   - ตรวจสอบ logo ใน navbar (AppShell)
   - ตรวจสอบ logo ในหน้า login
   - ตรวจสอบ favicon โหลดได้

## 3. Build Verification
- [ ] Build สำเร็จไม่มี error
- [ ] ตรวจสอบไฟล์ใน `frontend/out`:
  - [ ] favicon.ico มีอยู่
  - [ ] labboy-logo.png มีอยู่
  - [ ] manifest.json มีอยู่
  - [ ] _next/static/chunks มีไฟล์ JS

## 4. Pre-Deploy Check
- [ ] Copy `frontend/out` ไป `firebase/out`
- [ ] ตรวจสอบ firebase.json public path ถูกต้อง
- [ ] ตรวจสอบ .env.production มี Firebase config

## 5. Post-Deploy Verification
- [ ] เข้า https://labboy-workload-app.web.app
- [ ] ตรวจสอบ favicon แสดงใน browser tab
- [ ] ตรวจสอบ PWA icon บน mobile (Add to Home Screen)
- [ ] ทดสอบ login ด้วย Google
- [ ] ตรวจสอบไม่มี redirect loop
