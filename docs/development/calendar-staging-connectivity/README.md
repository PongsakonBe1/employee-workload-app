# Calendar/Auth connectivity probe — local verification

วันที่ 18 พฤศจิกายน 2569 · branch `codex/calendar-staging-connectivity-probe` จาก `40e95de` · เป็นงานย่อยของ release work package A

## สิ่งที่ทำแล้ว

- เพิ่ม `POST /api/calendar/connectivity` ซึ่งเปิดแยกด้วย `CALENDAR_SERVER_CONNECTIVITY=1` และต้องระบุ `CALENDAR_SERVER_WRITE=0` ชัดเจน ค่าเริ่มต้นปิด และ configuration ปฏิเสธการเปิดพร้อม writer
- `/health` ยังไม่สร้าง Firebase SDK/resolve credentials และรายงานเพียง configuration; ค่า `connectivityEnabled` ไม่ใช่หลักฐานว่าเชื่อม Firebase สำเร็จ
- คำขอ probe รับเฉพาะ JSON `{}` ใช้ Google session เดิมของ staging ตรวจ signed token พร้อม revocation และ audience/issuer/UID ไม่รับ role หรือ target จาก browser
- ตรวจ profile ใหม่เฉพาะ UID ของผู้เรียก ต้อง active Admin/Superadmin และ `calendarWriter=true` จากนั้นอ่าน `calendarWriteState/main`, `classroomSchedules.limit(1)` และ `dlExamSchedules.limit(1)` ตามลำดับ ไม่อ่าน directory ทั้งชุด/worklogs/receipt และไม่เรียก transaction เขียน
- เป็นการอ่านได้สูงสุด 4 documents ตามขอบเขต query ไม่ใช่การรับรอง billed reads; การตรวจ revocation ใช้ Auth API เพิ่มด้วย ผลตอบกลับมีเฉพาะ peer/protocol, `writesEnabled=false` และ booleans ไม่คืนเอกสาร ชื่อ UID หรือ token
- สืบทอด exact Host/Origin, JSON size/encoding guard, no-store, rate/concurrency limits และ sanitized logs จาก API เดิม ความผิดพลาด credentials/IAM ไม่แสดงรายละเอียดและไม่กล่าวว่า user token หมดอายุโดยไม่มีหลักฐาน
- หน้า `/calendar` มีปุ่มตรวจเฉพาะ runtime ที่ opt-in; Staff ใช้ไม่ได้ กดซ้ำไม่ได้ระหว่างตรวจ ผลที่กลับหลังเปลี่ยน session ไม่ถูกแสดง และไม่ invalidate cache/เพิ่ม write revision/สร้าง receipt
- ฝั่ง frontend ต้อง `NODE_ENV=development`, staging entry เปิด, `NEXT_PUBLIC_CALENDAR_CONNECTIVITY=1`, write flag `0` และเป็น peer ที่กำหนดเท่านั้น Production export ไม่เปิดหน้าทดลองแม้ตั้ง flag

## ทดลองด้วย Emulator

ใช้เครื่องมือที่ติดตั้งไว้เดิม ไม่ติดตั้งแพ็กเกจใหม่ ไม่เปิดไฟล์ credentials และไม่อ่าน/เขียน cloud

1. เปิด terminal: `node scripts/start-calendar-trusted-emulator.mjs`
2. อีก terminal: `node scripts/dev-calendar-trusted.mjs --connectivity`
3. อีก terminal: `node scripts/verify-calendar-connectivity.mjs` — ต้องเป็น namespace ว่างของ `demo-calendar-trusted` เท่านั้น สร้างเพียงบัญชี/profile/gate สังเคราะห์สำหรับ QA และไม่สร้างตาราง
4. เปิด `http://127.0.0.1:4313/calendar` เลือก Admin/Superadmin จำลอง ตรวจ probe; Staff อ่านได้แต่ตรวจ probe/เขียนไม่ได้
5. จบแล้ว `node scripts/verify-calendar-connectivity.mjs --cleanup` ลบเฉพาะ fixtures ที่ script เป็นเจ้าของด้วย precondition หยุดถ้ามีข้อมูลอื่น ไม่ reset namespace จากนั้นหยุด runtime ที่เปิดเอง

สำหรับ staging cloud เตรียม launcher `node scripts/dev-staging-ui.mjs --connectivity` บนพอร์ต 4311 แต่ **ยังไม่ได้ใช้ในเฟสนี้** ต้องตรวจรับโค้ดและอนุมัติ deploy/credential provisioning/ขอบเขตอ่าน cloud แยกก่อน ไม่ใช้ไฟล์ key เดิมที่พบใน Git

## ผลตรวจ

- Full Vitest: ดู [verification summary](../../../output/playwright/calendar-staging-connectivity/verification-summary.json) รวม HTTP จริงบน loopback และ regression ของ writer/session เดิม
- Targeted ESLint และ syntax ของ launcher/SIT script ผ่าน
- Emulator SIT 6 กลุ่ม: Admin/Superadmin + transport, Staff/no-token denial, write-off ทั้งสอง route, เปรียบเทียบ snapshot ทั้งห้า collections ไม่เปลี่ยนจาก probe, ถอน capability แล้วถูกปฏิเสธทันที, gate ผิดปิดการทำงาน
- Browser Edge: Admin desktop, Superadmin 390×844, Staff mobile; ปุ่มเขียนปิด ผลสำเร็จผ่านจริงบน `/calendar`; สลับเมนูกลับมา session/ผลตรวจยังอยู่; reload กลับ login ตาม in-memory persistence เดิม ไม่เก็บ token ถาวร
- Compatibility export ผ่านด้วย flags ตั้งไว้เพื่อทดสอบ production guard; ไม่มี staging entry หรือ fixture workspace render ใน production output ไม่ใช่การยืนยันว่า UI ใหม่ทั้งระบบเปิด production แล้ว
- Invalid launcher combinations 3 กรณีถูกปฏิเสธก่อนเปิด process
- ล้าง fixtures ของรอบนี้และหยุด Emulator/API/UI ที่เปิดเพื่อทดสอบแล้ว

รายงาน/ภาพอยู่ใน [output/playwright/calendar-staging-connectivity](../../../output/playwright/calendar-staging-connectivity) รายงาน unit/build ขนาดใหญ่ยังเป็น local artifacts ตาม workflow เดิม

ครั้งแรกรัน HTTP ใน sandbox ติด `EACCES` และ build ติด `EPERM`; หลังรันด้วยสิทธิ์สำหรับ loopback/build ในเครื่องจึงผ่าน มี Vite module-config/Browserslist/module-type warnings เดิมที่ไม่ได้แก้นอกขอบเขต

## ข้อจำกัดและขั้นถัดไป

**CAL-CONNECT ยัง pending**: ไม่ได้ตรวจ effective access ของ service account บน cloud, ไม่ออก key, ไม่เปลี่ยน IAM/Rules/profile ของ cloud, ไม่ push/deploy, ไม่เปลี่ยน production และไม่ได้เปิด writer การปิด flag ไม่ใช่การเพิกถอนสิทธิ์ Firebase SDK writers เดิม

Probe นี้พิสูจน์เฉพาะ Auth/profile/gate และ query access จำกัด ไม่พิสูจน์ business invariants, indexes ของ writer ทุก query, cloud write/replay/concurrency หรือความพร้อมของเว็บแอปทั้งระบบ Limits ยังเป็น per-process pilot และ browser test เป็น viewport emulation ไม่ใช่ Safari/iPhone จริง

**อัปเดตหลัง `786bfb8`**: ตรวจ IAM metadata ตามการมอบหมายใหม่แล้ว key ที่ตรง filename prefix เป็น disabled อยู่ก่อนแล้ว นำ credential ออกจาก Git ปัจจุบันและเพิ่ม ignore แต่ไม่ rewrite history/remote ดูสถานะ SEC ปัจจุบันใน [release checklist](../../release/README.md) ผลตรวจในเอกสารนี้เป็นผลของเฟส local probe เดิม

หลังตรวจรับ local probe และยืนยันเรื่อง key แล้ว จึงจัดทำรายการ deploy/provisioning และ read-only cloud QA ที่ตรวจทานได้ก่อนขออนุมัติจริง ดู [release checklist กลาง](../../release/README.md)

แผนขั้นถัดไปที่เตรียมแล้ว: [staging connectivity rollout](../calendar-staging-connectivity-rollout/README.md) ยังไม่อนุมัติ cloud mutation จากการเตรียมเอกสาร
