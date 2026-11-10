# ปิดรายการทดสอบที่ชนกับไฟล์นำเข้า

10 พฤศจิกายน 2569 · Branch `codex/calendar-staging-test-cleanup` จาก `c9598ef`

ผู้ใช้อนุมัติให้ปิดใช้งานเฉพาะ **“ทดสอบ staging” ห้อง 402 วันศุกร์ที่ 20 พฤศจิกายน 2569 เวลา 10:00–11:00** หลังตรวจพบว่าชนกับคาบในไฟล์ที่จะนำเข้า

## ผลดำเนินการจริง

- `labboy-workload-app-staging/(default)` เท่านั้น: เปลี่ยน `isActive: true → false` ของ document ที่อนุมัติ 1 รายการ เก็บเอกสารและฟิลด์อื่นไว้
- revision gate เปลี่ยน **1 → 2** พร้อม `calendarMaintenance` audit ใน atomic commit เดียวกัน ไม่แก้หรือลบ receipt การสร้างเดิม
- ตรวจอ่านหลัง commit พบเอกสารยังอยู่, active=false, audit ตรงกับรายการ และ query ที่กรอง active=true คืนรายการทดสอบนี้ **0 รายการ**
- ไม่มีการแก้ frontend, rules, สิทธิ์บัญชี หรือ production และไม่มีการ push/deploy

## การป้องกันผิดรายการและ race

CLI บังคับ project staging, บัญชี CLI ที่ระบุและ verified Google account, profile ที่ active และ role Admin/Superadmin ตรวจผู้สร้างและชื่อ/ห้อง/วัน/เวลา/ช่วงวันที่ให้ตรงกับรายการอนุมัติทั้งหมด

ผูก ID และ `updateTime` ของเอกสารกับผลตรวจที่ผู้ใช้อนุมัติ ห้าม override version ใน staging ตรวจ gate revision 1 และ operation/ผู้สร้างที่ตรงกันก่อนใช้ [Firestore Write preconditions](https://firebase.google.com/docs/firestore/reference/rest/v1/Write) กับเอกสารทั้งสอง หากถูกแก้ระหว่างตรวจและ commit จะไม่เขียนบางส่วน ใช้ [updateTime precondition](https://firebase.google.com/docs/firestore/reference/rest/v1/Precondition) เพื่อหยุดเมื่อ version เปลี่ยน

คำสั่งเป็น maintenance เฉพาะรายการนี้ ไม่มี general delete/update endpoint และไม่เปิดให้ browser ใช้ เก็บ audit ใน collection ที่ default rules ปฏิเสธ client access มี UID ผู้ปฏิบัติงานเท่าที่จำเป็นสำหรับ audit แต่ไม่ส่ง UID/อีเมล/token ลงรายงานหรือ repo ใช้ CLI authentication ตามปกติโดยไม่เปิด credential files/debug logs

การเรียกซ้ำเป็น no-op เฉพาะเมื่อ audit และสถานะ inactive ตรงกัน หากมีผู้คืนสถานะรายการภายหลังจะหยุด ไม่ปิดซ้ำอัตโนมัติ การ override เวลาใช้ได้เฉพาะ Emulator namespace สำหรับทดสอบ ไม่เป็น option ของ staging CLI

## การตรวจ

- Unit เฉพาะ cleanup **12/12 ผ่าน**: target/project, fields/actor, stale version/revision, audit, idempotency และไม่ปิดซ้ำหลัง restore
- REST integration **3 กลุ่มผ่าน** บน `demo-calendar-test-cleanup` loopback: concurrent gate change ปฏิเสธทั้ง commit, ปิดรายการพร้อม audit/รักษารายการอื่นและ receipt เดิม, repeated cleanup ไม่มี writes
- Cloud inspect ก่อน apply: active=true, revision=1, audit ไม่มี และตรงกับเงื่อนไขอนุมัติ
- Cloud apply/inspect หลังทำ: active=false, revision=2, audit มี, active query matches=0
- ตรวจ scripts/JSON syntax และ diff ไม่รัน frontend build หรือ suite อื่นซ้ำเพราะไม่ได้เปลี่ยน app runtime

หลักฐานอยู่ใน `output/playwright/calendar-staging-test-cleanup/`

## ขั้นต่อไปของ UAT

ปิดหน้าต่างนำเข้าที่เปิดค้าง → กด **โหลดข้อมูล staging ใหม่** → เปิดนำเข้าและเลือก PDF อีกครั้ง → ตรวจรายการแล้วจึงยืนยัน Cache ในหน้าที่เปิดอยู่ไม่ถูกล้างด้วย maintenance CLI อัตโนมัติ

การปิดรายการทดสอบนี้แก้เฉพาะ collision ที่เกิดจากรายการดังกล่าว ไม่ได้ยืนยันว่า PDF ทั้งไฟล์ไม่มีชนกับตารางอื่น หากต้องคืนสถานะภายหลังต้องตรวจการชนกับรายการนำเข้าใหม่ก่อน และใช้แผน maintenance ที่อนุมัติแยก ไม่ลด revision หรือย้อนข้อมูลชุดอื่น
