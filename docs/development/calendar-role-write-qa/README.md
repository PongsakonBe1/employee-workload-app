# Executor และผลทดสอบการสร้าง fixture ด้วย Staff/Superadmin

11 พฤศจิกายน 2569 · Branch `codex/calendar-role-write-qa` · สถานะ: ผ่านสามกรณี cloud ตามขอบเขตที่อนุมัติ รอผู้ใช้ตรวจรับ

ผู้ใช้ตอบ “approve” ต่อ [แผน](../calendar-role-write-plan/README.md) และ manifest SHA-256 `cc046d34339f6a02bee2c5af99b5036c24dbfae8624baee2f2db3e2f8354ff55` อนุญาต Staff raw SDK denial, Superadmin เพิ่มผ่าน UI และส่งซ้ำด้วย writer เดิม ใช้ `QA-ROLE-CLOUD-CREATE` วันที่ 23 เม.ย. 2570 ห้อง 402 เวลา 10:00–11:00 ครั้งเดียว ผู้สอนว่าง ภาคเรียน 2/2569 เพิ่มได้สูงสุด 1 ตาราง/1 receipt/revision 1 ครั้ง ไม่เปลี่ยนบทบาท ไม่ cleanup cloud และไม่แตะ production

## โค้ดและ guard ที่เพิ่ม

- หน้า development-only `/dev/calendar-staging-role-write` เปิด QA actions เพิ่มเติมเฉพาะ route นี้ route อ่านเดิมไม่มี executor และ production compatibility export ไม่ render workspace
- `calendarRoleWriteQa.js` ตรวจ manifest ที่อนุมัติด้วย canonical SHA-256 ควบคู่ raw manifest SHA และ deterministic schedule/operation IDs; ไม่รับ fixture อื่นจากฟอร์ม
- Staff ตรวจ own profile จาก server ว่าเป็น active Staff/capability false และ target ยังไม่มี จากนั้นส่ง raw SDK batch ครั้งเดียว ประกอบด้วย target, receipt และ gate 9→10 แบบ atomic ไม่มีการอ่าน/ส่ง token ออกจาก browser
- คำขอ Superadmin ตรวจ role/capability จริง, target/receipt absent และ gate 9 ก่อนเรียก writer ปกติจากฟอร์ม ต้องยืนยัน checkbox หลังตรวจ Staff denial audit แล้ว checkbox เป็นตัวคุมลำดับ QA ไม่ใช่สิทธิ์แทน Firebase Rules
- เพิ่ม options `expectedRevision` และ `requireExistingReceipt` ให้ writer เดิมเป็นค่าเลือกใช้ เฉพาะ executor ตรึง revision ภายใน transaction ด้วย ค่า default ของ writer หน้าปกติคงพฤติกรรมเดิมและมี unit regression ยืนยัน
- การส่งซ้ำตรวจ exact business fields, operation, ผู้สร้าง/receipt และ gate ที่ revision 10 ก่อนเรียก writer แบบ require-existing-receipt จึงไม่ recreate ถ้า receipt หาย คำขอแต่ละชนิดใช้ได้ครั้งเดียวต่อ client และไม่มี auto-retry หลังผลคลุมเครือ
- `qaRoleWriteAudit` ใช้ CLI แบบอ่านอย่างเดียว ดู exact fields/metadata/expected actor ของ fixture และ digest สำหรับเทียบก่อน/หลัง โดยไม่บันทึก UID/email จริงใน report แยกออกจากหลักฐาน user SDK

Canonical hash ของข้อมูล manifest ที่ใช้ใน browser: `092f06fbd07867f8dd5b57f1395c318a8f81489d7b55bae35045223d2767bb35` ตรงกับ JSON ฉบับ raw hash ข้างต้น ไม่ขึ้นกับ whitespace หรือ line endings ของ bundler

## ผลที่ตรวจแล้ว

หลักฐานอยู่ใน `output/playwright/calendar-role-write-qa/`:

| ชั้นตรวจ | ผล |
|---|---|
| Vitest | 541 tests / 34 files ผ่าน รวม executor และ optional pinned writer guards |
| Emulator SDK integration | 6 กรณีผ่าน ใช้ SDK ของ Staff/Superadmin สังเคราะห์จริง |
| Targeted ESLint / syntax | ผ่านสำหรับไฟล์ที่เปลี่ยน |
| Compatibility export | ผ่าน แยก output `.ui-build-check`, route QA มี artifact แต่ไม่ render development workspace |
| Fresh cloud preflight | ห้องว่าง, target/receipt absent, QA เดิม 4/4 exact, revision 9 |
| Cloud Staff raw SDK | `permission-denied`; ปุ่มซ้ำปิด; audit target/receipt absent และ digest gate ไม่เปลี่ยนจาก revision 9 |
| Cloud Superadmin UI create | เพิ่ม 1 / ข้าม 0 ผ่านฟอร์มปกติ; exact fields/actor/receipt ตรง, revision 10 |
| Cloud repeat writer | เพิ่ม 0 / ข้าม 1 / repeated true; digest ของ schedule/receipt/gate ไม่เปลี่ยน |
| Fresh cloud read | โหลดจาก server ใหม่ เห็น 30 ตารางเรียน / 0 รอบสอบในเดือนเมษายน และ QA 5 รายการในสัปดาห์ 19–25 เม.ย. |

Emulator integration ยืนยัน payload raw เดียวกันถูก Staff ปฏิเสธและ Superadmin ยอมรับ จึงแยก schema-invalid denial ออกจาก role denial จากนั้นทดสอบ writer ปกติเพิ่มหนึ่งรายการ, duplicate ไม่เขียน, stale revision ถูกปฏิเสธ และ receipt หายไม่ recreate ใช้ loopback 18080/19099 กับ namespace Emulator ชื่อ project เดียวกับ staging แต่ synthetic key/identities และ connect emulator ก่อน IO ทุกครั้ง ไม่ใช้ credentials cloud หรือ reset namespace เดิม

Integration ปฏิเสธเริ่มใน namespace ที่มีข้อมูลอยู่ สร้างเฉพาะ profiles/gate/fixture ของรอบนี้ คืน baseline เฉพาะสามเอกสารที่สร้างเพื่อแยก raw-positive control จาก normal-writer test ด้วย update-time preconditions และลบเฉพาะข้อมูล/บัญชีสังเคราะห์ที่รอบนี้เป็นเจ้าของหลังจบ ไม่อ้าง Emulator เป็นผล cloud

การเลือกบัญชี Google ผ่านเครื่องมือ browser ไม่ทำให้หน้าเลือกบัญชีเปลี่ยน จึงให้ผู้ใช้เลือกบัญชีเดิมเอง ไม่ใช้ native auth automation หรือคัดลอก credentials แทน

## หลักฐานและคำสั่ง

- `unit-summary.json`, `emulator-report.json`, `build-report.json`
- `cloud-preflight.json`, `cloud-storage-audit-before.json`, `cloud-audit-before.json`
- `cloud-audit-staff-denied.json`: target/receipt absent และ gate digest ตรง baseline
- `cloud-audit-created.json`, `cloud-audit-repeated.json`: exact business fields, timestamps, actor และ digests; receipt ผูก operation ด้วย document ID ไม่ใช่ field `operationId`
- `cloud-storage-audit-after.json`: QA เดิม 4 schedules/4 receipts และ fields/operation references คงเดิม revision เปลี่ยนเพียง 9→10
- `browser-report.json`, `staff-denied.jpg`, `superadmin-reviewed-form.jpg`, `superadmin-created.jpg`, `superadmin-repeated.jpg`, `superadmin-fixture-detail.jpg`: observed UI/SDK outcomes; ภาพผล QA จับเฉพาะบริบทที่จำเป็น

ผลเอกสารใหม่: `QA-ROLE-CLOUD-CREATE` วันที่ 23 เม.ย. 2570 ห้อง 402 10:00–11:00 `validFrom=validTo=2027-04-23` และ metadata ของบัญชี Superadmin ที่อนุมัติตรงกัน มี receipt 1 ฉบับ count 1/skipped 0/schemaVersion 1 หลังส่งซ้ำ timestamps และ metadata ของทั้งสามเอกสารไม่เปลี่ยน เมื่อรวม QA ก่อนหน้าเป็น 5 schedules/5 receipts ที่ตรวจเฉพาะ manifest สองเฟส ไม่ใช่จำนวนเอกสารทั้งหมดของระบบ

ขณะตรวจพบข้อผิดพลาดใน assertion ของเครื่องมือ audit ที่คาด `operationId` เป็น field ของ receipt จึงแก้การเทียบเป็น document reference ให้ตรง schema แล้วอ่าน audit ซ้ำผ่าน ไม่แก้ข้อมูล cloud และไม่ใช้การส่งคำขอเพิ่มซ้ำเพื่อแก้ผลตรวจ

```text
npm test -- --reporter=json --outputFile=output/playwright/calendar-role-write-qa/unit-report.json
node scripts/verify-calendar-role-write-emulator.mjs
node scripts/check-ui-build.mjs calendar-role-write-qa
node scripts/calendar-staging-admin.mjs <approved-operator> qaRoleWritePreflight role-write-qa
node scripts/calendar-staging-admin.mjs <approved-operator> qaAudit before role-write-qa
node scripts/calendar-staging-admin.mjs <approved-operator> qaRoleWriteAudit <stage> <approved-superadmin>
git diff --check
```

## ข้อจำกัด

สามกรณีที่อนุมัติผ่านทั้ง UI/SDK และ audit แล้ว แต่ไม่ใช่ full cloud role matrix ไม่ทดสอบ update/delete, Admin-no-capability, pending/inactive, network-loss atomicity หรือ physical Safari/Android รอบนี้ ไม่ใช้ผลนี้แทน trusted-server business invariants หรือ production readiness

พบข้อความในหน้ารายละเอียดที่ควรปรับต่อ: classroom ที่เกิดครั้งเดียวใช้ label “ตารางรายสัปดาห์” แม้วันที่เริ่มและสิ้นสุดเป็นวันเดียวกัน ข้อมูลและการแสดงคาบเป็นครั้งเดียวถูกต้อง บันทึกประเด็นนี้ไว้และไม่แก้ layout/ข้อความหน้าปกตินอกขอบเขต executor ในเฟสนี้

Cloud QA เดิมสี่ตารางยังคงอยู่ ไม่ลบ cleanup, ไม่ push/deploy และไม่เปลี่ยน profile/rules ของ cloud ในเฟสนี้

ผู้ใช้ตรวจรายการใหม่ผ่านหน้า develop ที่เครื่อง `http://127.0.0.1:4310/dev/calendar-staging-role-write` ได้ ผลรอบนี้เป็น agent-observed QA ยังไม่บันทึกว่า user UAT รับสามกรณีแล้วจนกว่าจะได้รับการยืนยัน
