# ผล Calendar Rules cutover บน staging

ติดตั้ง Rules ตาม [manifest ที่ตรวจทาน](../calendar-trusted-writer-audit-prep/cloud-verification.review.json) ใน `labboy-workload-app-staging` ฐาน `(default)` แล้ว ยืนยัน SHA-256 `4762054e74b3723bc4345f351b01bb43ee450ae8c7e6a399c4fd6473b717a1c7` จาก Rules ที่ deploy จริง จุดตรวจ Render ก่อน cutover พบแผน Free และปิด API writer กับ connectivity probe

Audit ก่อนและหลัง deploy รวม 4 รอบ รอบละ 7 คำขออ่าน รวม 28 คำขอ ตัวเลขนี้นับคำขอ API ไม่ใช่จำนวน Firestore billed reads [Audit รอบปิดงาน](../../../output/playwright/calendar-trusted-writer-audit-prep/cloud-audit-0-4.json) ยืนยัน gate revision 17, ไม่มีตารางหรือ receipt ใหม่ในชุดตรวจ และเอกสารที่ติดตามยังมีเวอร์ชันเดิม

Proof อายุ 120 วินาทีหมดระหว่างเลือกบัญชี Google ยังไม่ได้เริ่ม reader QA หรือส่ง SDK batch และยังไม่มี attempt ถูกใช้ หน้า QA บน localhost รองรับตรวจไฟล์ชุดใหม่และใช้ Google session เดิมจากแท็บที่เปิดอยู่ คำสั่งทดสอบยังตรวจอายุ proof และสิทธิ์บัญชีปัจจุบัน จากนั้นใช้ attempt เดิมใน IndexedDB เพื่อกันการส่งซ้ำ

Unit tests ผ่าน 740 รายการ, Node tests สำหรับ audit ผ่าน 15 รายการ, targeted ESLint และ compatibility build ผ่าน Edge เชื่อมต่อได้หลังอัปเดตส่วนขยายและยืนยันแล้วว่าเมื่อโหลด proof ที่หมดอายุ ทั้งปุ่มตรวจ reader และปุ่มส่ง SDK batch ถูกปิด การยืนยัน session reuse บน Edge ยังรอทดสอบหลังล็อกอินในหน้า QA ที่อัปเดต

สำหรับรอบถัดไป ให้ยืนยัน session ทั้งสองบทบาทก่อนเปิดหน้าต่างทดสอบบน cloud ขออนุมัติ audit checkpoint 0 เพิ่มสองรอบเพื่อสร้าง proof ใหม่และตรวจผลหลัง SDK batch คิดเป็นอีก 14 คำขออ่าน รวมเพดาน 42 คำขอจากจุดเริ่ม ทดสอบ reader บทบาทละหนึ่งครั้งและ SDK batch เดิมหนึ่งครั้งบน Rules ที่ deploy แล้ว บันทึกผลแล้วให้ Tech Lead ตรวจรับก่อนเปิด trusted API writer
