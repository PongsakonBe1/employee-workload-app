# ผลทดสอบแก้ไข–ยกเลิกปฏิทินบน cloud staging

วันที่ตรวจรับทางเทคนิค: 12 พฤศจิกายน 2569 (เวลาไทย)

Branch `codex/calendar-staging-mutation-cloud-execute` จาก `319f81a` ทำตาม manifest ของเฟสเตรียม โดยผู้ใช้อนุมัติการติดตั้ง/คืน Rules, การกดส่ง cloud ทั้งสี่คำสั่ง และการเลือก frozen replay packet แยกชัดเจน ไม่มี push หรือ deploy ตัวแอป/production

## ผลที่ทำจริง

ใช้ Google session ของผู้ทดสอบ Superadmin ใน Edge บน `/calendar` ของ runtime พอร์ต 4311 ส่งคำสั่งผ่าน Web SDK และ transaction เดิม ไม่ใช้ privileged script เขียนตาราง

| ลำดับ | รายการสังเคราะห์ | การเปลี่ยนแปลง | Gate หลังบันทึก |
|---|---|---|---|
| 1 | QA-ENTRY-MANUAL · 17 พ.ค. 2570 · 401 | 09:00–10:00 → 10:00–11:00 | 14 |
| 2 | DL · 19 พ.ค. 2570 | ชื่อเป็น QA-MUTATION-DL; คง 17:00–18:30, 75 คน, 406+407 และผู้คุมเดิม | 15 |
| 3 | QA-ENTRY-MANUAL | inactive; เก็บเอกสารเดิม version 2 | 16 |
| 4 | QA-MUTATION-DL | inactive; เก็บเอกสารเดิม version 2 | 17 |

ทุกคำสั่งมีผลอ่านกลับจาก server ใน UI และ audit หลังแต่ละ checkpoint ตรวจ business state, receipt, version, creation metadata และ digest ของข้อมูลที่ต้องคงไว้ การ audit เป็น privileged read เพื่อเทียบ state จึงแยกจากหลักฐานการส่งคำสั่งผ่าน Google/Web SDK

หลังคำสั่งที่สี่คืน append-only Rules ก่อนตรวจ replay ใช้ frozen input และ receipt เดิมทั้งสี่ผ่าน SDK writer ได้ `repeated=true, changed=0` ทุกคำสั่ง Audit หลัง replay ยืนยัน gate 17, receipts/digests เดิม, targets inactive/version 2, profile ทั้งสองและ protected siblings/creation receipts ไม่เปลี่ยน ไม่มีตารางใหม่หรือ physical delete

UI หลังจบอ่าน 32 classroom rules / 1 DL event ในเดือนพฤษภาคม โดย classroom count เป็นจำนวนเอกสารกฎทั้งหมดที่ reader คืนมา ไม่ใช่จำนวนคาบในสัปดาห์ รายการที่ยังแสดงในสัปดาห์ 17–23 พ.ค. คือ PDF สองรายการและ DL วันที่ 20 พ.ค. พร้อมวันหยุด

## เครื่องมือ replay ที่เพิ่ม

- `/dev/calendar-mutation-replay` เปิดเฉพาะ development staging; ไม่ปรากฏใน production export
- อ่าน JSON ใน browser memory และตรวจ SHA256 ตรง packet ที่ review แล้ว ไม่มี API อัปโหลดไฟล์ไป server
- ก่อนเรียก writer ตรวจ project, actor Superadmin, capability สด, gate 17, receipt ที่ commit และ target inactive/version 2 แล้วตรวจ gate ซ้ำหลังส่ง
- ถ้า receipt ไม่พร้อมหรือ state เปลี่ยน จะไม่เรียก writer; ใช้ session boundary เดียวกันสำหรับ double submit, revoked capability, account changes และ cache invalidation
- ลิงก์ไป–กลับใช้ Next Link รักษา Google session ที่เก็บใน memory เมื่อเปลี่ยนหน้า
- actual UID อยู่เฉพาะ ignored `.tools` packet/Rules; ไม่ใส่ UID หรือ credentials ลง fixture/รายงานที่ commit

## Rules และการปิดช่วงทดลอง

เป้าหมายเดียวคือ `labboy-workload-app-staging` ฐาน `(default)`:

- Manifest SHA256: `d0ebac68d1b06fc2cf12753ea46e53a9f48421a98a84c64ed4465866272dbd17`
- Candidate SHA256: `b5a7546749f4ecd32a194e809d72ea2656ba11c3c422a243935d3a3c8e6c3ace`
- Rules ที่คืนและตรวจ source จาก cloud แล้ว: `6cd83e8b8a287f301725b26adbb36c987f789351a8aea1475a6150d40bae458f`
- Frozen packet SHA256: `35aa3d85c2761161fb02fe6f76d672d865b028b66abd051e96eca25f5a1dd25b`

`scripts/calendar-mutation-cloud-rules.mjs` ล็อก target/hash/operator, config แบบ Rules-only และตรวจ audit 0 ก่อน install ปฏิเสธการคืนทับ release ที่ hash ไม่ใช่ candidate นี้ ไฟล์ approval เป็นบันทึกขอบเขต ไม่ใช่กลไกพิสูจน์การอนุมัติหรือสิทธิ์ของระบบ การเทียบ hash แล้ว deploy ไม่ใช่ atomic compare-and-swap

มี install/restore สองรอบ: รอบแรกหยุดก่อน cloud mutation เพราะ automatic approval review ต้องการคำอนุมัติการกดปุ่มโดยตรง จึงคืน Rules ก่อนขอเพิ่ม รอบที่สองได้รับคำอนุมัติเฉพาะและทำครบสี่คำสั่งแล้วคืนทันที Review เคยขอให้ตรวจค่าร่าง DL แยกก่อนส่งด้วย จึงตรวจเวลา/จำนวน/ห้อง/ผู้คุมครบก่อนกดจริง ไม่มีการเลี่ยง rejection หรือส่งชุดอื่น

Runtime ปิดทั้ง writer และ mutations แล้ว เปิดกลับด้วย `node scripts/dev-staging-ui.mjs` เป็น read-only การปิด flag/คืน Rules ไม่ย้อนข้อมูลที่ commit และไม่เพิกถอน create capability ของ flow อื่นที่ได้รับอนุญาตเดิม

## การตรวจสอบ

- Full Vitest: 612 tests / 38 files ผ่าน รวม replay guard และ session boundary ที่เพิ่ม
- Node plan/audit/rollback: 9 tests ผ่าน
- Targeted ESLint, `node --check` ของ Rules runner และ `git diff --check` ผ่าน
- Compatibility export ผ่านด้วย staging/write/mutation flags ที่จงใจเปิดตอน build; development UI ไม่ render ใน production output และไม่แตะ production `out`
- Cloud: Superadmin แก้ 2/ยกเลิก 2, replay 4, audit checkpoint 0–4 และตรวจหลังคืน Rules ผ่าน
- Staff Google session แยก: อ่านรายการที่เหลือได้ ปุ่มเพิ่ม/นำเข้าปิด ไม่มีแก้ไข/ยกเลิกหรือ replay link
- Mobile Edge viewport 390×844: detail dialog กว้าง 364px, ขอบซ้าย 8/ขวา 372 อยู่ใน viewport; คืน viewport override หลังตรวจ
- Staff session ไม่พบ console error ในรายการที่อ่าน; Superadmin มีข้อความ asynchronous message-channel listener ซึ่งยังไม่ได้แยกต้นทาง ไม่มี hydration error ที่พบในการตรวจนี้ ไม่อ้างว่า console ทั้งหมดสะอาด

หลักฐานอยู่ใน `output/playwright/calendar-staging-mutation-cloud-execute/` ดู `verification-summary.json`, audit และภาพ replay/Staff ประกอบ Raw unit report/build log เก็บ local; commit เฉพาะผลสรุปที่จำเป็น

ข้อจำกัด: mobile รอบนี้เป็น Chromium viewport ไม่ใช่เครื่องจริง Safari/iPhone/Android; ไม่ทดสอบ offline หรือ session revocation บน cloud ใหม่ (มี Unit/Emulator จากเฟสก่อน); Staff รอบนี้ตรวจ UI/read access ไม่ได้ส่ง raw denied write ไป cloud; audit ตรวจเฉพาะชุดเป้าหมายและ protected baseline ไม่ใช่การสแกนทั้งฐานข้อมูล ผลนี้ไม่ใช่ UAT หรือการรับรอง production ของทุกฟีเจอร์

## เฟสต่อไปที่เสนอเพื่อ review

1. กำหนด trusted server contract สำหรับ create/edit/cancel และ authorization/atomic conflict/idempotency ให้สอดคล้อง document contracts ที่ผ่านแล้ว
2. เลือก runtime ที่เหมาะกับแผน Firebase ฟรีและโฮสต์ปัจจุบันก่อนเขียนโค้ด เพื่อลดการพึ่ง client ตรวจ business invariants
3. ออกแบบ fail-closed rollout, flag, audit และ rollback; คง staging แยกและไม่เปิด production ระหว่างพัฒนา
4. ทดสอบ Unit/SIT/concurrent writers/role denial และ UAT บนเครื่องจริง ก่อนขอ release approval แยก

ยังไม่เริ่มเฟสนี้ ต้องให้ผู้ใช้ตรวจรับงาน cloud QA และอนุมัติแผน implementation ก่อน Prototype Rules ที่ตรึง actor/สองรายการไม่ได้รองรับการใช้งานทั่วไปบน production
