# ผล Calendar Rules cutover บน staging

ติดตั้ง Rules ตาม [manifest ที่ตรวจทาน](../calendar-trusted-writer-audit-prep/cloud-verification.review.json) ใน `labboy-workload-app-staging` ฐาน `(default)` แล้ว ยืนยัน SHA-256 `4762054e74b3723bc4345f351b01bb43ee450ae8c7e6a399c4fd6473b717a1c7` จาก Rules ที่ deploy จริง จุดตรวจ Render ก่อน cutover พบแผน Free และปิด API writer กับ connectivity probe

Audit ก่อนและหลัง deploy รวม 4 รอบ รอบละ 7 คำขออ่าน รวม 28 คำขอ ตัวเลขนี้นับคำขอ API ไม่ใช่จำนวน Firestore billed reads [Audit รอบปิดงาน](../../../output/playwright/calendar-trusted-writer-audit-prep/cloud-audit-0-4.json) ยืนยัน gate revision 17, ไม่มีตารางหรือ receipt ใหม่ในชุดตรวจ และเอกสารที่ติดตามยังมีเวอร์ชันเดิม

Proof อายุ 120 วินาทีหมดระหว่างเลือกบัญชี Google ยังไม่ได้เริ่ม reader QA หรือส่ง SDK batch และยังไม่มี attempt ถูกใช้ หน้า QA บน localhost รองรับตรวจไฟล์ชุดใหม่และใช้ Google session เดิมจากแท็บที่เปิดอยู่ คำสั่งทดสอบยังตรวจอายุ proof และสิทธิ์บัญชีปัจจุบัน จากนั้นใช้ attempt เดิมใน IndexedDB เพื่อกันการส่งซ้ำ

Unit tests ผ่าน 740 รายการ, Node tests สำหรับ audit ผ่าน 15 รายการ, targeted ESLint และ compatibility build ผ่าน Edge เชื่อมต่อได้หลังอัปเดตส่วนขยายและยืนยันว่า proof หมดอายุปิดทั้งปุ่มตรวจ reader และปุ่มส่ง SDK batch เมื่อโหลด proof รอบใหม่ในแท็บ Staff และ Superadmin ทั้งสองแท็บใช้ Google session เดิมได้

เมื่อยืนยัน session ทั้งสองบทบาทและได้รับอนุมัติ audit เพิ่มสองรอบ ได้ทำ [audit ก่อนทดสอบ](../../../output/playwright/calendar-trusted-writer-audit-prep/cloud-audit-0-5.json) และออก proof ใหม่ Staff และ Superadmin อ่าน staging ผ่านบทบาทละหนึ่งครั้ง จากนั้น Superadmin ส่ง SDK batch ชุดที่ตรึงไว้หนึ่งครั้งและได้รับ `permission-denied` จาก Firestore ขั้นก่อนส่งยืนยัน API writer และ connectivity probe ปิดอยู่ ส่วน [audit หลังทดสอบ](../../../output/playwright/calendar-trusted-writer-audit-prep/cloud-audit-0-6.json) ยืนยัน gate revision 17, ไม่มีตารางหรือ receipt ใหม่ และ fingerprint ของเอกสารที่ติดตามตรงกับรอบก่อน รวมทั้งเฟส 42 คำขออ่านผ่าน CLI ตามขอบเขตที่อนุมัติ

ผลนี้ปิดการตรวจ Rules cutover บน staging ขั้นถัดไปของ Calendar คือ trusted API writer cloud QA ตาม [manifest แยก](../calendar-trusted-writer-qa-prep/README.md) หลัง Tech Lead ตรวจรับผลและอนุมัติขอบเขตการเขียน
