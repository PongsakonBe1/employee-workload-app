# เตรียม UAT นำเข้ารูปตารางสอบ DL บน staging

วันที่ 10 พฤศจิกายน 2569 · Branch `codex/dl-staging-import-uat`

## ปัญหาและสิ่งที่แก้

หน้าเชื่อม staging/Emulator เดิมยังแสดงคำแนะนำ รายชื่อ A–H และปุ่ม “ใช้ชื่อนี้ชั่วคราว” ของ preview ทั้งที่ callback และ writer protocol อนุญาตเฉพาะ ID ผู้คุมที่อยู่ใน directory ทำให้หน้าจอเสนอทางเลือกที่ใช้บันทึกไม่ได้

- เมื่อมี `writeTarget` แสดงคำแนะนำให้เลือกจากรายชื่อในระบบ การจับคู่หนึ่งครั้งยังใช้กับทุกรอบที่พบชื่อ OCR เดียวกัน
- ซ่อนช่องแก้ชื่อและปุ่มสร้างชื่อชั่วคราวในโหมดนี้ พร้อมกัน callback สร้างชื่อชั่วคราวอีกชั้น ไม่สร้างผู้ใช้หรือบัญชีใด
- หาก directory ว่าง จะแจ้งว่าต้องให้ผู้ดูแลเตรียมรายชื่อก่อนยืนยันนำเข้า
- Preview ที่ไม่เชื่อม writer ยังแก้/ใช้ชื่อชั่วคราวในแท็บได้ตามเดิม

ไม่เปลี่ยน OCR engine, schema, Auth, rules, query/cache, writer protocol หรือข้อมูล cloud การย้อนกลับใช้ revert commit ของเฟสนี้ ไม่ต้อง migrate ข้อมูล

## ผลตรวจในเครื่อง

- `npm test`: **518 tests / 31 files ผ่าน** รวม pure logic ของ OCR geometry/time parsing, proctor mapping, import planning และ writer protocol เดิม
- Targeted ESLint ของ `DlImageImport.js`, Node syntax check ของ verifier และ `git diff --check` ผ่าน
- `verify-dl-staging-import.cjs`: **2 กรณีผ่าน** บน Chrome 1440 px/light และ touch emulation 390 px/dark โดยใช้ภาพตารางสังเคราะห์ผ่าน OCR จริง ไม่มีการ mock ผล OCR
- อ่าน 2 แถวภาพเป็น 4 รอบสอบ เวลา 09:00–10:30 และ 17:00–18:30 ครบ 2 วัน จับคู่ผู้คุมกับ synthetic directory 3 คนอย่างชัดเจน
- ตรวจ focus ช่องผู้คุมที่ยังไม่จับคู่, กันผู้คุมซ้ำในรอบ, กันรอบที่ห้องชนกัน และไม่เขียนข้อมูลระหว่าง OCR/review/validation
- ก่อนบันทึกต้องเลือกประเภทผู้เข้าสอบและตรวจยืนยัน รายการใช้ 75 คนต่อรอบและห้อง 406 + 407 ตามเกณฑ์เดิม
- เพิ่มผ่าน UI ไปยัง `demo-calendar-writer` บน loopback หลัง hard reload และเข้าสู่ระบบจำลองใหม่ยังพบ 4 รอบพร้อมจำนวนคน ห้อง และรายชื่อผู้คุมครบในแต่ละกรณี
- เปิดภาพเดิมอ่านซ้ำและจับคู่แล้วตรวจพบรายการชน/ซ้ำ ไม่เพิ่มคำขอ commit; บัญชี Staff จำลองถูกปิดการนำเข้า
- มือถือเปิดรายละเอียดจาก agenda ใต้เดือนตาม layout ที่ผู้ใช้เห็นจริง ตรวจ input/select อย่างน้อย 16 px และไม่มีหน้าจอล้นแนวนอน
- Regression OCR เดิมผ่าน **7 กลุ่ม** รวม preview, atomic import/duplicate/Undo, Staff และการยกเลิกอ่านก่อน/ระหว่าง OCR
- Compatibility build ผ่าน ใช้ configuration สังเคราะห์และ output แยก `frontend/.ui-build-check` ไม่เผยแพร่ development fixtures ใน production export
- ตรวจภาพหน้าจับคู่ผู้คุมทั้ง 2 viewport แยกอีกครั้งโดยไม่เขียน Firestore ดู `visual-review.json` และ `mapping-*.png`
- ลิงก์ Cloudflare ของ staging เปิดได้ HTTP 200 ใน browser แยกที่ไม่ล็อกอิน ปุ่มนำเข้าถูกปิด และไม่มีการเข้าสู่ Google หรืออ่าน/เขียนเอกสาร cloud ดู `public-smoke.json`

**OCR ชื่อไม่ใช่ตัวระบุบัญชี**: ภาพสังเคราะห์บางช่อง เช่น Staff C อ่านได้คลาดเคลื่อน การทดสอบจึงตรวจเทียบคอลัมน์ของภาพที่กำหนดไว้แล้วเลือก ID ผู้คุมจาก dropdown ไม่อ้างว่าการสะกดชื่อ OCR ถูกทั้งหมด และไม่ใช้ข้อความ OCR สร้าง ID อัตโนมัติ

## ขอบเขต Emulator และ artifacts

Verifier ใช้เฉพาะ origin ของ dev server, Auth Emulator และ Firestore Emulator ไม่อนุญาต network อื่น ไม่อ่าน credentials หรือใช้ Google session และไม่ reset namespace เดิม

แต่ละ viewport เลือกเดือนที่ยังไม่มี event แสดงภายใต้ทุกภาคเรียน โดยค้นจากเดือนทดสอบที่กำหนดไม่เกิน 12 เดือน แล้วเพิ่ม 4 รอบสังเคราะห์ในเดือนนั้น การรันซ้ำอาจเพิ่มรอบทดสอบในเดือนถัดไป ข้อมูลสังเคราะห์จากการรันก่อนหน้ายังคงอยู่ ไม่มีการลบหรือเขียนทับข้อมูล staging cloud

ผลรอบที่ผ่านและวันที่ที่ใช้บันทึกอยู่ใน `output/playwright/dl-staging-import-uat/report.json` พร้อม `cloudUsed: false`, `emulatorReset: false` ชุดนี้เป็นผล Emulator ไม่ใช่ผล UAT ของ cloud

```powershell
npm test
node node_modules/eslint/bin/eslint.js -c scripts/ui-eslint.config.mjs frontend/app/dev/calendar/DlImageImport.js
node scripts/verify-dl-staging-import.cjs $playwrightModule $chromeExecutable
node scripts/verify-dl-image-flows.cjs $playwrightModule $chromeExecutable http://127.0.0.1:4310 dl-staging-import-uat
node scripts/check-ui-build.mjs dl-staging-import-uat
```

ต้องมี dev server 4310, Auth Emulator 19099 และ Firestore Emulator 18080 พร้อม fixture writer เดิมที่มีสิทธิ์อยู่แล้ว ไม่ต้อง seed/reset เพื่อรัน verifier นี้ `$playwrightModule` และ `$chromeExecutable` คือ path ของ dependencies ที่ติดตั้งอยู่บนเครื่อง

## แนวทาง UAT บน staging

1. ตรวจว่ารายชื่อผู้คุมใน dropdown มีครบตามภาพที่จะใช้ หากยังเป็น directory จำลอง 3 คน ห้ามถือว่าจับคู่บุคลากรทั้งทีมจากภาพจริงได้ครบ ต้องเตรียมรายชื่อที่เหมาะกับ UAT เป็นขอบเขตถัดไปก่อน
2. ที่ `/dev/calendar-staging-write` เลือก “นำเข้าตาราง → ตารางสอบ DL · รูปภาพ” แล้วเลือกภาพในอุปกรณ์ของผู้ทดสอบ
3. ตรวจวันที่ เวลา จำนวนรอบ และจำนวนคนต่อรอบกับภาพ เลือกประเภทผู้เข้าสอบ ภาคเรียน และจับคู่ชื่อกับ directory โดยไม่สร้างชื่อชั่วคราว ภาพตัวอย่างเดิมมี 9 วัน × 2 รอบ = 18 รอบ และ 75 คนต่อรอบ ต้องตรวจผล OCR อีกครั้งทุกช่อง
4. ตรวจข้อความห้องชน/ซ้ำกับตารางเรียนที่นำเข้าไว้ ไม่เปลี่ยนวันหรือข้ามเงื่อนไขเพียงเพื่อหลบ conflict ถ้ารายการถูกต้องและพร้อมจึงยืนยันเพิ่ม
5. ตรวจปฏิทินและรายละเอียด จากนั้น reload/เข้าสู่ระบบ staging ใหม่และตรวจอีกครั้ง รวมผลบน iPhone/Safari หรือ Android เครื่องจริง

ตอนส่งส่วนเตรียมทดสอบไม่ได้เปิดอ่านรายชื่อ cloud หรือเพิ่ม directory cloud และไม่ได้ใช้ผล Emulator เป็นหลักฐาน UAT บน cloud

## ผู้ใช้ยืนยันผลนำเข้า — 10 พฤศจิกายน 2569

หลังส่งหน้าจับคู่และขั้น UAT ผู้ใช้แจ้งว่า **“ได้แล้ว ทำได้แล้ว”** จึงบันทึกว่าการนำเข้ารูปตาราง DL บน staging ผ่าน UAT เบื้องต้นตามการยืนยันของผู้ใช้ ดู `output/playwright/dl-staging-import-uat/cloud-uat-report.json`

ข้อความนี้ไม่ได้ระบุแยกจำนวนรอบที่นำเข้า ไฟล์ที่ใช้ รายชื่อผู้คุมครบทุกช่อง อุปกรณ์ หรือผล hard reload/login ใหม่ จึงไม่อนุมานรายละเอียดเหล่านั้น ผล persistence บน Emulator ที่ผ่านแล้วเป็นหลักฐานคนละส่วนกับ staging

ขั้นบันทึกผลนี้แก้เฉพาะเอกสาร/JSON ไม่เข้าสู่บัญชีผู้ใช้ ไม่อ่านหรือเขียน cloud เพิ่ม ตรวจ JSON syntax และ diff โดยตรง ไม่รัน Unit/build ซ้ำเพราะ runtime ไม่เปลี่ยน ขั้นถัดไปที่เสนอคือให้ผู้ใช้ตรวจข้อมูลหลัง reload และเข้าสู่ staging ใหม่ก่อนเริ่มเฟสขยายสิทธิ์หรือ production
