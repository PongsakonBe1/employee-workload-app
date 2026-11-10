# ตรวจ session และเตรียมทดสอบบทบาทบน staging

11 พฤศจิกายน 2569 · Branch `codex/calendar-cloud-session-qa`

## ขอบเขตปัจจุบัน

ต่อจากการรับแก้ feedback ของฟอร์มโดยผู้ใช้ ตรวจการอ่าน QA เดิมหลังเปิดหน้าใหม่/F5/Google sign-in และตรวจ metadata ขั้นต่ำของบัญชีทดสอบสองบทบาท ไม่สร้างตาราง cloud เพิ่ม ไม่เปลี่ยนบัญชี สิทธิ์ rules หรือข้อมูล production

เพิ่ม action อ่านอย่างเดียว `qaRolePreflight` ใน `scripts/calendar-staging-admin.mjs` บังคับ project `labboy-workload-app-staging` และตรวจ Auth กับ fields `role/active/calendarWriter` ของ profile ที่ผูก UID โดยตรง รายงานใช้ชื่อบทบาทแทน email/UID การอ่านด้วย CLI สิทธิ์ผู้ดูแลเป็นหลักฐาน metadata เท่านั้น ไม่ใช่ผลทดสอบ Firestore Rules ของผู้ใช้

ผลตรวจจริงอยู่ใน `output/playwright/calendar-cloud-session-qa/role-preflight.json`:

| บัญชีที่ผู้ใช้ระบุ | สถานะ staging ที่ตรวจได้ | สิ่งที่ยังต้องทำก่อนทดสอบบทบาทนั้น |
|---|---|---|
| Staff — บัญชี ICIT เดิม | Google verified, profile active, role `admin`, `calendarWriter=true` | ยังใช้ผลนี้เป็น Staff QA ไม่ได้ ต้องอนุมัติการเปลี่ยน profile ก่อน |
| Superadmin — บัญชีส่วนตัวที่ผู้ใช้ระบุ | ไม่พบ Auth account ใน staging | ยังระบุ profile ตาม UID ไม่ได้ ต้องเข้าสู่ staging ครั้งแรกและอนุมัติ provision แยก |

สิทธิ์ที่ผู้ใช้เคยตั้งใน production ไม่ได้รับการคัดลอกไป staging ไม่ได้เปิดตรวจ profile หรือ Auth ของ production

## Session QA

Cloudflare hostname เดิมตอบ `ERR_NAME_NOT_RESOLVED` และ process tunnel/dev server เดิมไม่ทำงาน จึงเปิด dev server เดิมด้วย `node scripts/dev-ui.mjs` ที่ `127.0.0.1:4310` ใช้ configuration สังเคราะห์และ staging client แยกตามเดิม ไม่ติดตั้งหรือ deploy ไม่เพิ่ม OAuth authorized domain ใหม่

เปิด Edge หน้า `/dev/calendar-staging-write` ใหม่ เข้าสู่ Google สำเร็จ อ่าน 29 ตารางเรียน และเลือก 19–25 เม.ย. 2570 เห็น QA ทั้ง 4 รายการเดิม เวลา/ห้องตรงกับ manifest ก่อนหน้า (เดือนเมษายนอ่าน 0 รอบสอบ) จากนั้น F5 พบสถานะยังไม่เข้าสู่ระบบ ปุ่มเพิ่ม/นำเข้าปิด และไม่มี QA ค้างในหน้า สอดคล้องกับ Auth แบบ in-memory

หลัง F5 เปิด Google sign-in ได้ แต่เครื่องมือเลือกบัญชีใน popup ไม่สำเร็จ จึงส่งให้ผู้ใช้เลือกบัญชี ICIT เดิม ขั้นอ่านหลัง sign-in รอบนี้ยังรอผลจริง ไม่ถือว่าผ่านจากรอบก่อนหน้า

หลักฐาน session ล่าสุดให้ดู `output/playwright/calendar-cloud-session-qa/session-report.json` เมื่อบันทึกผล ไม่ใช้คำว่า session persistence เพื่ออ้างว่า Google session ต้องคงอยู่หลัง F5 เพราะ client นี้ตั้งใจใช้ in-memory persistence

## แผนเฟสบทบาท — รออนุมัติ ยังไม่ดำเนินการ

### 1. ทำอะไร ตามลำดับ

1. จบการอ่านหลัง F5 และยืนยัน QA เดิม 4 รายการก่อนเปลี่ยนสิทธิ์
2. พัฒนาเครื่องมือ provision เฉพาะบัญชีสองรายการที่ผู้ใช้ระบุ บังคับ staging และตรวจ identity จริง ไม่รับการเดา UID ไม่คัดลอกโปรไฟล์ production
3. ให้ผู้ใช้เข้าสู่ Google ด้วยบัญชี Superadmin ที่ระบุใน staging เป็นครั้งแรก เมื่อมี Auth account และ verified Google แล้วจึงสร้าง profile แบบ create-only ด้วยชื่อแสดงสังเคราะห์, `role=superadmin`, `active=true`, `calendarWriter=true` หากพบ profile มีอยู่ให้หยุดและเทียบแผนก่อน ไม่เขียนทับ
4. เปลี่ยนเฉพาะ profile ของบัญชี ICIT เดิมจาก `admin/active=true/calendarWriter=true` เป็น `staff/active=true/calendarWriter=false` โดยใช้ field mask และ update-time precondition เก็บ baseline ขั้นต่ำใน ignored local artifact เพื่อย้อนกลับ ไม่เปลี่ยน fields อื่น
5. ทดสอบคนละ Google session: Staff อ่านปฏิทินได้และปุ่มเพิ่ม/นำเข้าปิด; Superadmin อ่านได้และมี create/import controls ตรวจสิทธิ์อ่าน writer gate/receipt ผ่าน authenticated SDK ของบัญชีจริง: Staff ต้องถูกปฏิเสธ และ Superadmin ต้องอ่านได้ ใช้เครื่องมือทดสอบที่แยกจากหน้าผู้ใช้ ไม่ดึง token ออกจาก browser ไม่ส่งคำขอเขียน calendar/profile ในเฟสนี้
6. ตรวจยอดเดิมและบันทึกผลแยก UI/SDK/privileged audit ไม่เรียกว่าผ่านทั้ง cloud role matrix หากยังไม่ได้ตรวจ Admin-no-capability, pending และ inactive

### 2. เหตุผล

บัญชีเดิมเป็น Admin writer จึงไม่ใช่หลักฐานพฤติกรรม Staff ส่วน Superadmin ยังไม่มี identity ของ staging การแยก profile ตามบัญชีจริงทำให้ทดสอบ role/capability ได้ตรงกับระบบที่จะใช้ โดยยังแยก production และไม่สร้างบัญชีรหัสผ่านจำลองบน cloud

### 3. ความเสี่ยงและการย้อนกลับ

การลดสิทธิ์ ICIT ทำให้บัญชีนี้เพิ่ม/นำเข้า staging ไม่ได้ และการให้ Superadmin ทำให้บัญชีส่วนตัวที่ระบุอ่าน/สร้างข้อมูลสังเคราะห์ของ staging ได้ ต้องได้รับการอนุมัติชัดเจนก่อน provision; ทำ Superadmin ให้พร้อมก่อนลดสิทธิ์ ICIT ใช้ profile preconditions ป้องกันเขียนทับ concurrent changes หากทดสอบล้มเหลวคืนสาม fields ของ ICIT ตาม baseline และปิด `active/calendarWriter` ของ Superadmin ด้วย version check ไม่ลบบัญชี Auth หรือเอกสาร QA โดยพลการ

ไม่เพิ่ม schedules/receipts ในแผนนี้ ขอบเขต QA เดิมที่อนุมัติสูงสุด 4 ตารางใช้ครบแล้ว การทดสอบการเขียนสำเร็จโดย Superadmin หรือการส่งคำขอเขียนที่คาดว่าจะถูก rules ปฏิเสธบน cloud ต้องมี payload/fixture และอนุมัติแยกก่อน ไม่ใช้ผลการอ่านหรือปุ่มที่ปิดแทนหลักฐานการปฏิเสธการเขียน

### 4. ตรวจอย่างไร

- Unit tests ของ role/profile preconditions และ Emulator integration ตามขอบเขตที่เปลี่ยน
- Syntax/lint ของเครื่องมือและไฟล์ที่แก้ ตรวจ diff และ JSON หลักฐาน
- Browser QA ของสองบัญชีแยก session, sign-out/sign-in และกดโหลดข้อมูลใหม่; บันทึกผล Staff read/disabled controls และ Superadmin read/enabled controls ตามที่สังเกตจริง
- ตรวจ authenticated SDK reads ของ writer gate/receipt: Staff ได้ `permission-denied`, Superadmin อ่านได้ ตรวจ privileged audit ก่อน/หลังยืนยัน schedules/receipts/revision คงเดิม ไม่ใช้เพียงการซ่อนปุ่มเป็นหลักฐาน rules
- บัญชี/roles เปลี่ยนเฉพาะ staging ไม่มี rules deployment, push, production access หรือ successful calendar writes ในเฟสนี้

Cloudflare บนโทรศัพท์ยังต้องเปิด tunnel ใหม่และตรวจ hostname/authorized-domain เป็นรายการเปลี่ยนแปลงแยกก่อนใช้งาน ไม่อ้างลิงก์เดิมว่าใช้งานได้
