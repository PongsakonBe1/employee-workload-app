# แก้ไขและยกเลิกปฏิทิน staging

Branch `codex/calendar-staging-edit-cancel` จาก `32f9982` ผู้ใช้อนุมัติแผน 4 ข้อก่อนเริ่มเฟสนี้

## พฤติกรรมที่ทำแล้ว

- `/calendar` ใช้ session เดิม เพิ่มคำสั่งแก้ไขและยกเลิกเฉพาะ active Admin/Superadmin ที่มี `calendarWriter=true` และเปิด mutation flag เพิ่มจาก write flag
- ค่าเริ่มต้นอ่านอย่างเดียว; `--writer` เดิมยังเพิ่ม/นำเข้าได้อย่างเดียว ต้องระบุ `--writer --mutations` จึงเสนอคำสั่งเปลี่ยนรายการเดิม **การเปิด flag ไม่ deploy Rules หรือเพิ่มสิทธิ์ให้บัญชี**
- แก้ไขครั้งละหนึ่งเอกสาร คง document ID และ creation metadata เดิม ตารางรายสัปดาห์แก้ทั้งชุดในช่วงวันที่ ไม่มี exception สำหรับวันเดียว/ตั้งแต่วันนี้เป็นต้นไป
- แยกวันเรียนประจำสัปดาห์ออกจากวันเริ่มภาคเรียน: เช่น ภาคเรียนเริ่มจันทร์ แต่คาบประจำเป็นพุธ การแก้ชื่อไม่เปลี่ยนวันเรียน ผู้ใช้เปลี่ยนวันเรียนผ่าน control โดยตั้งใจได้
- ยกเลิกด้วย `isActive=false` ทั้งตารางเรียนและ DL ไม่มี physical delete หรือ restore/Undo ในเฟสนี้ แสดงคำยืนยันว่ารายสัปดาห์มีผลทั้งชุด
- ฟอร์มแก้ไขไม่ให้เปลี่ยนประเภท collection หรือขยายเป็นหลายเอกสารพร้อมกัน รายการที่ไม่มี mutation source/version ของ pilot ต้องตรวจรูปแบบก่อน ไม่ migrate ข้อมูลเดิมอัตโนมัติ
- ขณะส่งใช้สถานะ busy เดิมของ dialog ป้องกันส่งซ้ำและปิดผ่าน controls ปกติ Validation/conflict/stale คงร่างและพา focus ไปที่ปัญหา
- เน็ตหลุดหรือเปลี่ยน session หลังส่งไม่อ้างว่ายกเลิก write สำเร็จ เก็บคำสั่งเดิมในหน่วยความจำเมื่อ session เดิมยังอยู่ และ retry ด้วย operation เดิมก่อนส่งงานใหม่ แยก commit สำเร็จจาก read-back ล้มเหลว
- หลัง commit invalidate cache และอ่านกลับจาก server ฟังก์ชันเพิ่ม/นำเข้าและ preview เดิมยังคงพฤติกรรมเดิม คัดลอก/Undo ของ preview ไม่ถูกเปิดบน staging

## Contract และ transaction

`mutate({ action: 'edit' | 'cancel', original, replacement? })` คืน `{action, changed, operationId, repeated}`

`original.source` อ้าง collection/document ID, creation operation และ version ที่อ่านมา ไม่ใช้ occurrence ID เป็น document ID ตรวจ expected business fields ร่วมกับ version เพื่อกัน stale และ ABA ปฏิเสธ no-op, ช่วงเกิน 400 วัน และข้อมูลเกินขอบเขตการอ่าน pilot

Transaction อ่าน profile, gate, receipt และ target ก่อนเขียน Edit ตรวจห้อง/ผู้คุมชนด้วยข้อมูล server ใหม่โดยไม่นับ target ของตัวเอง Gate เดียวกับ create pilot ทำให้ sanctioned writers ต้องตรวจใหม่เมื่อมีคน commit ระหว่างทาง Version เพิ่มหนึ่งเมื่อแก้/ยกเลิก สำเร็จแบบ atomic ร่วมกับ receipt และ gate

เอกสารยังใช้ `schemaVersion=1` และ creation metadata เดิม เพิ่ม `mutationVersion`, `lastOperationId`, `updatedBy`, `updatedAt` เมื่อเปลี่ยนครั้งแรก Receipt mutation ใน collection เดิมใช้ `schemaVersion=2`, action, targetCollection/targetId, expectedVersion และ count/skipped โดย receipt เดิมแก้ไขไม่ได้ เป็นประวัติผู้กระทำ/คำสั่ง/เวอร์ชัน **ไม่ได้เก็บภาพข้อมูลก่อนแก้ทุกเวอร์ชันเพื่อทำ Undo**

## Rules และขอบเขต cloud

Rules ใหม่แยกที่ `firebase/calendar-mutations/firestore.rules` ไม่เขียนทับ `firebase/calendar-writer/firestore.rules` หรือ Rules ของ production ยังไม่ได้ deploy Rules ใหม่นี้ไป cloud และไม่มี cloud write/profile change ในเฟสนี้

Prototype ตรวจ role/capability, schema/ขนาด/ชนิดข้อมูล, immutable creation fields, version +1, actor/timestamp, gate และ receipt ที่อ้าง target เดียวกัน การ cancel ห้ามเปลี่ยน business fields และต้องเปลี่ยน active → inactive เท่านั้น ไม่อนุญาต physical delete, แก้ receipt หรือเขียน profile

ข้อจำกัดยังเหมือน pilot: การตรวจ aggregate conflicts, logical dates และ directory membership ยังต้องบังคับบน trusted server ก่อน production การทดสอบนี้ไม่ใช่การรับรองว่า Rules ครอบคลุมผู้โจมตี/ทุก invariant ทั้งระบบ อ่าน directory ได้เฉพาะข้อมูลสังเคราะห์/ข้อมูลจำเป็นของ staging ตาม contract เดิม ไม่ใช้ Rules นี้กับ production ที่อาจมี PII เพิ่มเติม

ข้อความกำกับจาก skill Rules:

> I've set up prototype Security Rules to keep the data in Firestore safe. They are designed to be secure for the restricted staging pilot through role/capability checks, immutable creation metadata, version checks, and atomic target/receipt/gate validation. However, you should review and verify them before broadly sharing your app. If you'd like, I can help you harden these rules.

ก่อนเปิด cloud ต้องตรวจ Rules diff และอนุมัติ manifest ที่ระบุ target, expected version/business state และรายการแก้/ยกเลิกก่อน ห้ามใช้ fixture สังเคราะห์บน Emulator เป็นหลักฐานว่า Google session/cloud ผ่านแล้ว

## วิธีตรวจซ้ำในเครื่อง

ใช้ Emulator เดิมที่ `127.0.0.1:18080` และ Auth `127.0.0.1:19099` โดย project namespace ตรงกับ default Auth project ของเครื่อง สคริปต์ปฏิเสธ namespace ที่มีข้อมูล ไม่ reset และ cleanup เฉพาะเอกสาร/บัญชีของตัวเองพร้อม update-time preconditions

```text
npm test
node scripts/verify-calendar-mutation-emulator.mjs
node scripts/verify-calendar-entry-write-emulator.mjs
node scripts/check-ui-build.mjs calendar-staging-edit-cancel
```

Browser QA ใช้ main route จริงใน runtime แยก/cache แยก พอร์ต 4312:

```text
node scripts/calendar-mutation-ui-fixture.mjs prepare
node scripts/dev-calendar-mutation-emulator.mjs
# เปิด http://127.0.0.1:4312/calendar เลือกบทบาทสังเคราะห์
node scripts/calendar-mutation-ui-fixture.mjs cleanup
```

Runtime นี้ต่อ SDK ไป loopback เท่านั้น login สังเคราะห์ถูกปฏิเสธนอก development/localhost ไม่เปิด Google หรือใช้ credentials จริง ค่า test password เป็น fixture สาธารณะใน repo ไม่ใช่รหัสบัญชีจริง

## ผลตรวจ

ดูผลสรุปล่าสุดใน `output/playwright/calendar-staging-edit-cancel/verification-summary.json`

- Unit ครอบคลุม flag/default, source/version/no-op, bounds/weekday, room/proctor rules, shared submit guard, account change, uncertainty/retry, cache/read-back และ Emulator guard
- SDK/Rules SIT ใหม่ 14 กลุ่ม: แก้รายสัปดาห์, replay, stale, ห้อง/ผู้คุมชน, DL เย็น, concurrent editors, lost cancel reply, cache, Staff/no-capability denial, physical delete/profile denial, raw invalid batches, offline และ revoke capability
- รันทดสอบเพิ่ม/นำเข้าเดิมซ้ำ 13 กลุ่มผ่าน แยกรายงาน `create-regression-report.json`; PDF/OCR รอบนี้เป็น planner output ไม่ได้รัน byte parsing ใหม่
- Browser 16 กรณีบน Edge กับ Auth/Firestore Emulator จริง: Admin/Superadmin สอง session, stale draft, focus, แก้ไข/ยกเลิก, ผลทั้งชุดในสัปดาห์ถัดไป, Staff read-only, navigation/cache, reload และ weekday regression
- Mobile เป็น Chromium viewport 390×844 ไม่ใช่ physical iPhone/Safari/Android: client/scroll width 380, dialog ภายใน viewport, date/time font 16px
- ไม่พบ hydration mismatch หรือ console error ใน browser session ที่ตรวจ มี Next.js smooth-scroll warning สำหรับพฤติกรรมเวอร์ชันอนาคต
- ทดสอบ raw Rules ปฏิเสธการเปลี่ยนเนื้อหาพร้อม cancel, createdBy/createdAt, version/actor ปลอม, ข้อมูลผิดชนิด/ขอบเขต, schema pollution และ orphan receipt แบบ atomic; ไม่ถือเป็น exhaustive security audit

ภาพ `stale-draft-desktop.jpg`, `mobile-cancel-review.jpg`, `final-staff-calendar.jpg` และ `weekday-preserved-review.jpg` เป็นหลักฐาน UI ข้อมูลสังเคราะห์ Audit cancel รอบแรกแยกจาก weekday regression รอบสอง Cleanup ทั้งสองรอบแล้ว และคืน append-only Rules ของ Emulator หลังทดสอบ

ยังรอ user UAT/เครื่องจริง และ cloud rollout ตาม manifest ไม่ push/deploy หรือเปิด production

## ย้อนกลับ

ปิด mutation flag หรือรัน runtime เดิมโดยไม่ใส่ `--mutations` กลับเป็น create-only; ปิด write flag กลับ read-only การปิด flag ไม่ย้อนข้อมูลที่ commit และไม่เพิกถอน writer capability ของระบบอื่น ไม่ลบ receipt/cancelled documents เพื่อย้อนการทดสอบ cloud

สำรอง config ก่อนเพิ่ม cache runtime ไว้ใน `.tools/calendar-staging/edit-cancel-config-backups/` ซึ่งไม่ commit ไม่มีการอ่านหรือคัดลอก `.env`/credentials
