# ปิดชุดสาธิตตั้งต้นบน staging

10 พฤศจิกายน 2569 · Branch `codex/calendar-staging-fixture-cleanup` จาก `ba697cb`

ผู้ใช้อนุมัติให้ปิดใช้งานเฉพาะชุดสาธิตตั้งต้นที่ยัง active: ตารางเรียน 1 รายการและ DL 4 รอบ รวมรอบเดือนธันวาคม เพื่อให้ตรวจนำเข้า PDF ได้โดยไม่ชนข้อมูลสาธิต

## รายการที่อนุมัติและผลจริง

| Collection / ID | ผล |
|---|---|
| classroomSchedules / class-one | isActive=false |
| dlExamSchedules / dl-morning | isActive=false |
| dlExamSchedules / dl-evening | isActive=false |
| dlExamSchedules / dl-historic | isActive=false |
| dlExamSchedules / dl-december | isActive=false |

ดำเนินการเฉพาะ `labboy-workload-app-staging/(default)` เก็บเอกสารทั้ง 5 ไว้ เปลี่ยนเพียง active flags พร้อม revision **2 → 3** และ maintenance audit ใหม่ใน atomic commit รวม 7 writes ตรวจหลัง commit แล้ว active query คืน fixture ที่อนุมัติ **0 รายการ**

ไม่แก้ users, รายการที่ผู้ใช้สร้าง/นำเข้า, fixture `dl-inactive` ที่ปิดอยู่แล้ว, receipts หรือ audit เดิม ไม่มีการแก้ frontend/rules/permissions, push หรือ deploy และไม่เข้าถึง production

## การป้องกันผิดชุดและ concurrency

- allowlist จำกัด 5 IDs และ project staging; Emulator ใช้ namespace แยก `demo-calendar-fixture-cleanup`
- ตรวจเนื้อหาทุกฟิลด์กับ fingerprint ของ fixture ที่อนุมัติ รวมชื่อวิชา เวลา ห้อง วัน จำนวนคน และผู้คุม หากเนื้อหาหรือต้นแบบเปลี่ยนจะหยุด ไม่แทนที่ด้วยค่าจาก fixture
- ยืนยัน verified Google account ของ CLI operator และ profile active Admin/Superadmin อ่าน role/active ผ่าน field masks ไม่แสดง UID/อีเมล/token
- ก่อนทำต้องเป็น revision 2 และ operation จาก cleanup ห้อง 402 ครั้งก่อน พร้อมผู้ปฏิบัติงานคนเดียวกัน แต่ละ schedule และ gate มี `updateTime` precondition และ audit ต้องยังไม่มีอยู่ จึงไม่เกิดการปิดเพียงบางส่วนหากมี concurrent change
- CLI default เป็น inspect; apply ใช้เฉพาะการอนุมัติรอบนี้ เรียกซ้ำไม่เขียนเพิ่มเมื่อ audit ตรงและทั้ง 5 inactive หากรายการถูก restore ภายหลังจะหยุด ไม่ปิดซ้ำอัตโนมัติ
- audit มีเพียงข้อมูลที่จำเป็น เช่น actor UID, target IDs, version ก่อนทำ และ revision; ไม่คัดลอกเนื้อหาตารางลง audit/report ไม่เปิดอ่าน credential files หรือ debug logs

## ผลตรวจ

Unit เฉพาะ guard **10/10 ผ่าน**, REST integration **4 กลุ่มผ่าน** บน loopback: fixture เปลี่ยนทำให้ปฏิเสธทั้ง batch, gate เปลี่ยนทำให้ปฏิเสธทั้ง batch, ปิดครบ 5 และเก็บข้อมูลอื่น/รายชื่อ/receipt เดิมครบ, การเรียกซ้ำไม่มี writes ระหว่างทดสอบพบ server timestamp ใน audit และเพิ่ม decoder/test ก่อนดำเนินการ cloud

Cloud inspect ก่อน apply พบ fingerprint ตรง, active 5, revision 2 และยังไม่มี audit หลัง apply พบ active 0, revision 3, audit มีและตรวจได้ เอกสารยังอยู่ 5 รายการ หลักฐานใน `output/playwright/calendar-staging-fixture-cleanup/`

ตรวจ syntax และ diff ตามขอบเขต ไม่มี app runtime เปลี่ยนจึงไม่รัน frontend build หรือ suite อื่นซ้ำ ไม่ใช่ผล UAT ว่า PDF ทั้งไฟล์นำเข้าผ่านแล้ว

ผลติดตาม UAT หลัง cleanup: ผู้ใช้ยืนยัน **“นำเข้าได้แล้ว อ่านตารางถูกต้อง สลับเดือนสลับวันก็ถูกต้อง”** บันทึกว่าการนำเข้า PDF และความถูกต้องในการแสดงผล/เปลี่ยนเดือนและวันผ่านตามที่ผู้ใช้ตรวจ ไม่ได้อ่านหรือแก้ข้อมูล cloud เพิ่มในขั้นบันทึกผลนี้

## ลองนำเข้าต่อ

ปิดหน้าต่างนำเข้าที่เปิดค้าง → กด **โหลดข้อมูล staging ใหม่** → เปิดนำเข้าและเลือก PDF อีกครั้ง → ตรวจรายการก่อนยืนยัน Cache ของแท็บผู้ใช้ไม่ได้ถูกล้างโดย CLI อัตโนมัติ

หากต้องคืนสถานะชุดสาธิต ต้องตรวจการชนกับข้อมูลนำเข้าใหม่และขออนุมัติ maintenance แยก ไม่ลด revision หรือ reset ข้อมูลของผู้ใช้
