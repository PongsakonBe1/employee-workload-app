# สิทธิ์บัญชี ประวัติงาน และสถานะที่ใช้ร่วมกัน

ทำบน branch `codex/worklog-access-boundary` จาก `59fc631` ใช้โปรไฟล์ Firebase Auth ที่อีเมลยืนยันแล้วและโปรไฟล์ active เป็นเงื่อนไขของบทบาท โปรไฟล์เดิมยังใช้ได้ การเชื่อม UID เก่าต้องเป็นอีเมลเดียวกันและคงบทบาทที่อนุมัติไว้ ผู้สมัครใหม่ของ ICIT ยังเข้าคิวรอ Admin อนุมัติ และอ่านสถานะของคำขอตนเองได้เมื่อเข้าอีกครั้ง

Rules จำกัด `worklogs` ให้ Staff อ่านและแก้เฉพาะเอกสารที่มี `employeeId` ของตน บัญชี Admin และ Superadmin ที่ active ยังเข้าถึงข้อมูลทีมตามบทบาท

Quick Log ห้อง อุปกรณ์ และหน้าทรัพยากรใช้ `GET /api/resource-status` บน backend เดิม ตรวจ Firebase ID token และโปรไฟล์ active ก่อนตอบสถานะ Backend ใช้ Firestore listener ร่วมกันที่ 500 บันทึกล่าสุดตามขอบเขตการอ่านเดิม และหยุด listener หลังไม่มีคำขอ 6 นาที ผลตอบกลับมีสภาพอุปกรณ์และรหัสของรายการที่ยังยืมอยู่ รหัสจะออกจากสถานะร่วมเมื่อคืน การอ่านข้ามบัญชีผ่าน API จึงไม่ต้องเปิดสิทธิ์ให้ Staff อ่านประวัติของกันและกัน

## ผลทดสอบในเครื่อง

- 20 targeted Unit tests และ production-mode export ผ่าน
- SDK บน Firebase Emulator ยืนยันสิทธิ์ Staff, Admin, Superadmin, pending, inactive และอีเมลยังไม่ยืนยัน รวมถึงการคงบทบาทเมื่อเชื่อมโปรไฟล์เดิมและการอนุมัติผู้รอ
- API ปฏิเสธบัญชีที่อ่านไม่ได้ และส่งเฉพาะสถานะข้ามบัญชีเมื่อ Staff คนหนึ่งเปิดห้องและยืม USB อีกคนปิดห้องและคืนอุปกรณ์
- Edge ขนาด desktop และ viewport 390 พิกเซล ผ่านการเปิด–ปิดห้อง 401 และยืม–คืนหูฟัง ICIT01 ข้ามบัญชี ตรวจกลับใน Emulator พบแต่ละรายการอย่างละครั้ง รหัสยืมและคืนตรงกัน และหน้าประวัติ Staff แสดงเฉพาะรายการของตน [ผล Browser QA](../../../output/playwright/worklog-access-boundary/browser-report.json)

รัน `node scripts/worklog-workspace-smoke.mjs build --analytics` แล้วเปิด `emulators` และ `serve` ก่อนรัน `node scripts/verify-worklog-access-emulator.mjs` ซึ่งสร้างบัญชีและเทมเพลตสังเคราะห์ใน Emulator ใหม่ จากนั้นรัน `node scripts/verify-resource-status-browser.cjs <playwright-runtime> <edge-executable>`

## ลำดับก่อนเปิดจริง

ตรวจบัญชีเดิมที่ยังต้องจับคู่ UID และสถานะห้อง/อุปกรณ์ที่มีบันทึกเก่ากว่าช่วง 500 รายการก่อนเปิดใช้ การติดตั้ง Rules จำกัด `worklogs` ต้องเกิดหลัง backend เดิมพร้อมให้บริการ API และ frontend/PWA โหลดรุ่นที่ใช้ API แล้ว เพราะ Quick Log รุ่นเก่ายังอ่านบันทึกข้ามบัญชี หากย้อน frontend เป็นรุ่นเก่า ให้ทบทวน Rules ที่จะเปิดใช้คู่กันและเลือกจุดย้อนกลับก่อน deploy งานรอบนี้อยู่ในเครื่องและไม่แก้สิทธิ์หรือข้อมูล production
