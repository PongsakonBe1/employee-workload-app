# ซอร์สอ้างอิงของรุ่น production

ชุดซอร์สนี้นำหน้าเว็บจาก commit `f156121` ที่ใช้กับ Firebase Hosting version `2b733bf742bea90b` และ backend จาก Render commit `39ec8d8` มาเก็บไว้บนสายพัฒนาหลัก ใช้ Firestore Rules ฉบับที่ตรวจตอนเปิด Calendar writer โดยมี SHA-256 `a220ce95711a832942c0a49c8b53ac0d9139e90015c1db249051346d7b0dbb39`

## สร้าง Firebase Hosting artifact

ใช้ Node.js 24 และติดตั้ง dependencies จาก lockfile ที่ root ของ repo โดยใช้ `npm ci` จากนั้นรันคำสั่งตรวจ build ด้วยค่าจำลอง

```text
npm run build:production-hosting -- --verify
```

ผลตรวจจะอยู่ใน `.tools/production-hosting/verify-*` โดยมี `verificationOnly: true` ใน manifest และไม่มีไฟล์ deploy config ใช้ตรวจ Next.js static export และไฟล์ PDF.js/OCR ที่ bundle มาด้วย

สำหรับ release ให้กำหนด public Firebase Web SDK settings ของ `labboy-workload-app` ใน build environment ได้แก่ `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID` และ `NEXT_PUBLIC_FIREBASE_VAPID_KEY` แล้วรัน `npm run build:production-hosting` จาก checkout ที่ commit เรียบร้อย

ใช้ `manifest.json` ในโฟลเดอร์ `release-*` เพื่อยืนยัน commit, project และ hash ก่อนเผยแพร่ เมื่อได้รับอนุมัติให้เผยแพร่ Hosting ให้ใช้ `firebase.json` ในโฟลเดอร์เดียวกับ manifest และใช้ `--only hosting --project labboy-workload-app` จุด rollback ของ release อ้างอิงคือ `0075ad608f728310`

## Backend และ Firestore

- Render ติดตั้งจากไดเรกทอรี `backend/` จึงมี Calendar runtime และ Resource Status อยู่ภายในแพ็กเกจเดียวกันกับ server entrypoint ชุดทดสอบ Calendar ที่ root ใช้โมดูลต้นทาง ให้ตรวจว่าไฟล์ในแพ็กเกจ Render ยังตรงกับโมดูลต้นทางทุกครั้งที่เปลี่ยน Calendar
- ค่าเปิด Calendar writer และข้อมูลรับรองของ Render ตั้งที่ service environment ตาม release ที่อนุมัติ เก็บ service account ไว้นอก Git
- ตรวจ Rules บน Emulator ก่อนเสนอเปลี่ยน Rules บน cloud แยกจากการ build หรือ deploy Hosting
