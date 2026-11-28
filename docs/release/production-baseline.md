# ซอร์สอ้างอิงของรุ่น production

## รุ่นที่ตรวจยืนยันเมื่อ 28 พฤศจิกายน 2569

| ระบบ | Commit ต้นทาง | รุ่นที่ให้บริการ |
| --- | --- | --- |
| Firebase Hosting | `33ce82f` | `0685f9e8dc70a969` |
| Render API | `fcafb72` | `dep-dc4g29e1egvs738aeo6g` |

Hosting รุ่นนี้เปิดท่าลากสลับเมนูมือถือและมีจุด rollback ที่ version `f01e620fc0d9d9b5`
Firestore Rules ที่ตรวจในรอบเปิด Calendar writer มี SHA-256 `a220ce95711a832942c0a49c8b53ac0d9139e90015c1db249051346d7b0dbb39`

## สร้าง Firebase Hosting artifact

ใช้ Node.js 24 และติดตั้ง dependencies จาก lockfile ที่ root ของ repo โดยใช้ `npm ci` จากนั้นรันคำสั่งตรวจ build ด้วยค่าจำลอง

```text
npm run build:production-hosting -- --verify --mobile-tab-scrub
```

ผลตรวจจะอยู่ใน `.tools/production-hosting/verify-*` โดยมี `verificationOnly: true` ใน manifest และไม่มีไฟล์ deploy config ใช้ตรวจ Next.js static export และไฟล์ PDF.js/OCR ที่ bundle มาด้วย

สำหรับ release ให้กำหนด public Firebase Web SDK settings ของ `labboy-workload-app` ใน build environment ได้แก่ `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID` และ `NEXT_PUBLIC_FIREBASE_VAPID_KEY` แล้วรัน `npm run build:production-hosting -- --mobile-tab-scrub` จาก checkout ที่ commit เรียบร้อย

ใช้ `manifest.json` ในโฟลเดอร์ `release-*` เพื่อยืนยัน commit, project และ hash ก่อนเผยแพร่ บันทึก version ของ live channel เป็นจุด rollback ของรอบนั้น เมื่อได้รับอนุมัติให้เผยแพร่ Hosting ให้ใช้ `firebase.json` ในโฟลเดอร์เดียวกับ manifest และใช้ `--only hosting --project labboy-workload-app`

## Backend และ Firestore

- Render ติดตั้งจากไดเรกทอรี `backend/` จึงมี Calendar runtime และ Resource Status อยู่ภายในแพ็กเกจเดียวกันกับ server entrypoint ชุดทดสอบ Calendar ที่ root ใช้โมดูลต้นทาง ให้ตรวจว่าไฟล์ในแพ็กเกจ Render ยังตรงกับโมดูลต้นทางทุกครั้งที่เปลี่ยน Calendar
- Resource Status อนุญาต Origin จาก `labboy-workload-app.web.app` และ `labboy-workload-app.firebaseapp.com` เทสต์ใน `backend/src/routes/resourceStatus.test.js` ยืนยันว่าทั้งสองโดเมนผ่าน CORS คำขออ่านยังต้องเข้าสู่ระบบ และโดเมนอื่นถูกปฏิเสธ
- ค่าเปิด Calendar writer และข้อมูลรับรองของ Render ตั้งที่ service environment ตาม release ที่อนุมัติ เก็บ service account ไว้นอก Git
- ตรวจ Rules บน Emulator ก่อนเสนอเปลี่ยน Rules บน cloud แยกจากการ build หรือ deploy Hosting
