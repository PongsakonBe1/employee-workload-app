# PWA Testing Guide

## 1. Local Testing (npm run dev)

### 1.1 เปิด DevTools > Lighthouse
```
1. เปิด Chrome
2. ไปที่ http://localhost:3000/login
3. กด F12 (DevTools)
4. เลือกแท็บ "Lighthouse"
5. เลือก Categories: PWA, Performance, Accessibility
6. กด "Analyze page load"
7. ดูผลลัพธ์ - ต้องได้ PWA score 100%
```

### 1.2 ทดสอบ PWA บน Mobile (Chrome DevTools)
```
1. DevTools > กด icon "Toggle device toolbar" (หรือ Ctrl+Shift+M)
2. เลือก device: iPhone SE หรือ Pixel 5
3. Refresh หน้า (F5)
4. ตรวจสอบ:
   - Logo แสดงถูกต้อง
   - Favicon แสดงใน tab
   - กด "Add to Home Screen" ได้
```

### 1.3 ทดสอบ Login Flow (Manual)
```
1. เปิด http://localhost:3000/login
2. กด login with Google
3. ตรวจสอบว่าไม่มี redirect loop
4. ถ้าอยู่ในหน้า login แต่มี user แล้ว ต้อง redirect ไป dashboard
```

## 2. Automated Testing (Gray Box)

### 2.1 รัน Playwright Tests
```bash
cd frontend
npx playwright test tests/pwa-login.spec.js --project=Mobile\ Safari
npx playwright test tests/logo-display.spec.js --project=chromium
```

### 2.2 ดู Report
```bash
npx playwright show-report
```

## 3. Production Testing

### 3.1 Lighthouse บน Production
```
1. ไปที่ https://labboy-workload-app.web.app
2. DevTools > Lighthouse
3. ตรวจสอบ PWA score
```

### 3.2 Real Device Testing
```
1. เปิด Safari บน iPhone
2. ไปที่ https://labboy-workload-app.web.app
3. กด "Share" > "Add to Home Screen"
4. ปิด Safari
5. เปิดจาก Home Screen icon
6. ทดสอบ login
```

## 4. Debug PWA Login Loop

### 4.1 เปิด Console Log
```javascript
// ใน browser console
localStorage.setItem('debug', 'true')
location.reload()
```

### 4.2 ดู Auth State
```javascript
// ตรวจสอบ auth state
console.log('Auth state:', {
  user: localStorage.getItem('icit_user'),
  loading: window.__authLoading,
  pathname: location.pathname
})
```

### 4.3 Clear Cache
```javascript
// ถ้ามี redirect loop
localStorage.clear()
sessionStorage.clear()
caches.keys().then(keys => keys.forEach(k => caches.delete(k)))
location.reload()
```

## 5. ตรวจสอบ PWA Requirements

### 5.1 Manifest Checklist
- [ ] manifest.json โหลดได้
- [ ] icons มีครบทุก size
- [ ] theme_color ตั้งค่า
- [ ] start_url ถูกต้อง

### 5.2 Service Worker
- [ ] sw.js ลงทะเบียน
- [ ] offline ทำงานได้

### 5.3 HTTPS
- [ ] ใช้ HTTPS (Firebase Hosting มีให้)
