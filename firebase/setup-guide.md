# Firebase Setup - Troubleshooting

## ปัญหา: สร้าง Project ไม่ได้

### แก้ไขวิธีที่ 1: ใช้ชื่อที่ไม่ซ้ำ (แนะนำ)
```bash
# เพิ่มตัวเลขหรือชื่อของคุณ
firebase projects:create icit-workload-app-2026
# หรือ
firebase projects:create icit-workload-kmutnb
# หรือ
firebase projects:create yourname-icit-workload
```

### แก้ไขวิธีที่ 2: สร้างผ่าน Web Console ก่อน (ง่ายกว่า)
1. ไปที่ https://console.firebase.google.com/
2. Click **"Create a project"**
3. ตั้งชื่อ: `ICIT Workload App`
4. Google จะสร้าง Project ID ให้อัตโนมัติ (เช่น `icit-workload-app-12345`)
5. เสร็จแล้วกลับมาใช้ CLI:
   ```bash
   firebase use --add
   # เลือก project ที่เพิ่งสร้าง
   ```

### แก้ไขวิธีที่ 3: ใช้ Google Cloud Project ที่มีอยู่แล้ว
ถ้ามี Google Cloud Project อยู่แล้ว:
```bash
firebase projects:list
firebase use <project-id>
```

## ขั้นตอนที่ถูกต้อง

### 1. สร้าง Project ผ่าน Web (แนะนำ)
```
https://console.firebase.google.com/
→ Create Project
→ ชื่อ: ICIT Workload App
→ Continue
→ Enable Google Analytics (optional)
→ Create Project
```

### 2. Add Firebase ให้กับ Project
```bash
cd C:\Users\ICIT-Admin\employee-workload-app\firebase
firebase login
firebase use --add
# เลือก project ที่สร้างไว้
```

### 3. Enable Services
ไปที่ Firebase Console:
- [ ] Build → Firestore Database → Create Database
- [ ] Build → Authentication → Get Started → Email/Password
- [ ] Build → Functions

### 4. Deploy
```bash
cd functions
npm install
npm run build
firebase deploy --only firestore:rules
firebase deploy --only functions
```

## ⚠️ ข้อควรระวัง

### Project ID Rules
- ต้อง unique ทั่วโลก (ไม่มีใครใช้แล้ว)
- ใช้ตัวพิมพ์เล็ก, ตัวเลข, ขีด
- ไม่มีช่องว่าง
- ความยาว 6-30 ตัวอักษร

### Billing
- Spark Plan = ฟรี (ใช้ได้)
- ไม่ต้องใส่ credit card
- ถ้าถามเรื่อง billing → เลือก "Spark (Free)"

## 🔍 Debug

ถ้ายังไม่ได้ ดู log:
```bash
type firebase-debug.log
```

หรือลองสร้างผ่าน Google Cloud แทน:
```
https://console.cloud.google.com/projectcreate
→ สร้าง project
→ แล้ว add Firebase ที่หลัง
```

## ✅ ถ้าสำเร็จจะเห็น
```
✔ Project creation successful!
Project ID: icit-workload-app-xxxxx
```

จากนั้นทำตาม [README.md](README.md) ต่อได้เลย
