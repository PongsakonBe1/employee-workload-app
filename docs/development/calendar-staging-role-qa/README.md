# ผลทดสอบบทบาท Staff และ Superadmin บน staging

11 พฤศจิกายน 2569 · Branch `codex/calendar-staging-role-qa`

ต่อจาก [แผน session/บทบาท](../calendar-cloud-session-qa/README.md) ผู้ใช้ให้ดำเนินการต่อและตอบ “ok” ยืนยันการสร้าง Superadmin และลดสิทธิ์บัญชี ICIT เฉพาะ `labboy-workload-app-staging` หลังระบุบัญชี ค่า fields และผลกระทบชัดเจน บัญชีจริงไม่ได้บันทึกใน fixtures หรือ reports

## สิ่งที่เปลี่ยนจริง

| บัญชีทดสอบ | ก่อนเฟส | หลังเฟส |
|---|---|---|
| ICIT ที่ผู้ใช้ระบุเป็น Staff | `admin`, `active=true`, `calendarWriter=true` | `staff`, `active=true`, `calendarWriter=false` |
| บัญชีส่วนตัวที่ผู้ใช้ระบุเป็น Superadmin | ยังไม่มี staging Auth/profile | ผู้ใช้ Google sign-in ครั้งแรก แล้วสร้าง profile ชื่อแสดงสังเคราะห์ `superadmin`, `active=true`, `calendarWriter=true` |

CLI ไม่ได้สร้าง Auth account หรือคัดลอก production profile การ Google sign-in ของผู้ใช้สร้าง identity ของ staging ตามปกติ CLI สร้าง profile Superadmin แบบ create-only 1 document ตรวจผ่าน Edge ว่าอ่านได้และปุ่มเพิ่ม/นำเข้าพร้อมก่อนเปลี่ยน Staff อีก 1 document ใช้ field mask เฉพาะ `role/active/calendarWriter` และ update-time precondition คง fields อื่นไว้

Automatic approval review ปฏิเสธคำสั่งสร้าง Superadmin ครั้งแรกก่อนทำงาน เพราะต้องมีคำอนุมัติเฉพาะบัญชี/resource จึงหยุดและส่งรายการให้ผู้ใช้ยืนยัน หลังคำตอบ “ok” จึงรันคำสั่งเดิมตามขอบเขตที่ยืนยันสำเร็จ ไม่เปลี่ยนช่องทางเพื่อหลบการปฏิเสธ

เพิ่มเครื่องมือ provisioning/rollback ใน `scripts/calendar-staging-role-plan.mjs` และ action เฉพาะ QA ใน `scripts/calendar-staging-admin.mjs` บังคับ staging target, verified Google และสอง identities ที่เตรียม baseline ไว้ ตรวจ version ทั้งสอง profile ก่อนสร้างแผน ไม่เขียนทับ baseline หรือ profile ที่มีอยู่แล้ว

เก็บ baseline เฉพาะ UID, fields สิทธิ์เดิม และ update time กับ checkpoint/hash ใน `.tools/calendar-staging/role-qa-*.json` ซึ่ง ignored ไม่ใช่ไฟล์ credentials และไม่ส่งเข้า Git/report เครื่องมือ rollback เตรียมคืนสิทธิ์ Staff ตาม baseline พร้อมปิด `active/calendarWriter` ของ Superadmin ที่สร้างใหม่ด้วย version checks ไม่ลบบัญชีหรือเอกสารโดยพลการ รอบนี้ไม่เรียก rollback เพราะผลตรวจผ่าน

## ผล UI และ SDK ผ่านบัญชีจริง

เพิ่มหน้า development-only `/dev/calendar-staging-roles` ใช้ staging client แบบ in-memory แยกแต่ละแท็บ ไม่แสดงใน production export มีปุ่มอ่าน writer gate และ receipt ของ `QA-CLOUD-IDENTICAL` ที่มีอยู่เดิม ผ่าน `getDocFromServer` ของ Firebase SDK ใน session นั้น ไม่เอา token ออกมาใช้กับ CLI และไม่ส่งคำขอเขียน calendar/profile จาก browser

ผู้ใช้เลือกบัญชี Google ตามบทบาทใน Edge สองแท็บแยกกันใหม่ ผลที่สังเกตได้:

| กรณี | Staff | Superadmin |
|---|---|---|
| บทบาทจาก server | `staff` | `superadmin` |
| อ่านปฏิทินพฤศจิกายน 2569 | 29 ตารางเรียน / 18 รอบสอบ | 29 ตารางเรียน / 18 รอบสอบ |
| ปุ่มเพิ่มตารางและนำเข้า | ปิดทั้งสองปุ่ม | เปิดทั้งสองปุ่ม |
| SDK อ่าน `calendarWriteState/main` | `permission-denied` | พบ document, revision 9 |
| SDK อ่าน receipt QA ที่กำหนด | `permission-denied` | พบ document |

ผลข้างต้นเป็นหลักฐานการอ่านผ่าน user rules จริง ไม่ใช้ privileged CLI reads หรือปุ่มที่ปิดเป็นตัวแทนผล SDK การอ่าน probe แสดงเพียง outcome/revision ไม่แสดง UID, email, operation data หรือ tokens ผลถูกล้างเมื่อ login/logout/โหลดช่วงใหม่; ผลที่กลับมาหลัง session เปลี่ยนถูกทิ้ง

## ตรวจสอบและหลักฐาน

หลักฐานอยู่ใน `output/playwright/calendar-staging-role-qa/`:

- `browser-report.json`, `staff-reads.jpg`, `superadmin-reads.jpg`: บทบาท, counts, ปุ่ม และ SDK outcomes
- `qaRolePrepare.json`, `qaProvisionSuper.json`, `qaSetStaff.json`: ผลการเตรียมและแก้สอง profiles โดยไม่บันทึก identities จริง
- `cloud-storage-audit-before.json` / `cloud-storage-audit-after.json`: exact QA schedules/receipts ตาม manifest เดิม
- `unit-summary.json`: Vitest ผ่าน 525 tests / 32 files, เพิ่ม probe/session tests 7 กรณี
- `provision-unit-summary.json`: Node tests ของ baseline/preconditions/rollback ผ่าน 20 tests
- `emulator-provision-report.json`: Emulator integration ผ่าน 4 กรณี ตรวจ `ALREADY_EXISTS`, `FAILED_PRECONDITION`, field-mask preservation และ atomic rollback; เป็น provisioning integration ด้วย owner บน loopback ไม่ใช่ผล user rules
- `build-report.json`: compatibility export ผ่านใน `frontend/.ui-build-check` และตรวจพบ artifact ของ route QA แต่ไม่มี development workspace render
- `verification-summary.json`: สรุปเทียบหลักฐานและ lint/syntax/diff checks

คำสั่งหลักที่ใช้ตรวจ:

```text
npm test -- --reporter=json --outputFile=output/playwright/calendar-staging-role-qa/unit-report.json
node --test scripts/calendar-staging-role-plan.test.mjs
node scripts/verify-calendar-role-plan-emulator.mjs
node node_modules/eslint/bin/eslint.js --config scripts/ui-eslint.config.mjs frontend/lib/calendarRoleProbe.js frontend/lib/calendarStagingClient.js frontend/app/dev/calendar-staging/preview.js frontend/app/dev/calendar-staging-roles/page.js
node scripts/check-ui-build.mjs calendar-staging-role-qa
node --check scripts/calendar-staging-admin.mjs
git diff --check
```

Emulator ใช้ namespace สังเคราะห์ `demo-calendar-role-provision` ไม่ reset namespace เดิม ลบเฉพาะ profiles สังเคราะห์ที่สร้างโดยรอบ integration ด้วย update-time checks ไม่ seed writer fixtures เดิม Runtime เริ่มโดยสคริปต์เดิม พบคำเตือน locator ของ Emulator suite ค้างจากรอบก่อน จากนั้น Auth/Firestore รายงานพร้อมที่ loopback และ integration ผ่าน ไม่ถือเป็นการกู้ข้อมูล Emulator รอบเก่าที่หยุดไปแล้ว

ยอด QA cloud ก่อน/หลังตรงกัน: 4 schedules, 4 receipts, revision 9, fields/operation references ตรง manifest SHA-256 `43dfd0c8723f74dd84c549d9794b8504ed696d8c2b9f6dad6f6281ec8173191f` ไม่ได้เพิ่มตารางหรือ receipt ไม่ลบข้อมูล QA ไม่ deploy rules/UI ไม่ push และไม่เปิดข้อมูล production

## ข้อจำกัดและขั้นต่อไป

เฟสนี้ผ่านเฉพาะ Staff/Superadmin calendar reads, writer-resource reads และ UI controls ยังไม่ใช่ full cloud role matrix ไม่ได้ทดสอบสร้างตารางสำเร็จด้วย Superadmin หรือส่ง write attempts ของ Staff ที่ข้าม UI; ยังไม่ครอบคลุม Admin ที่ไม่มี writer capability, pending/inactive และ physical mobile browsers ผลการเขียน/rollback ของ provisioning ที่ทดสอบบน Emulator ไม่ใช้แทนผล cloud user writes

ขั้นต่อไปเสนอชุดทดสอบ cloud calendar writes และ negative authorization ด้วย payload/fixture ที่ระบุชัดเจนก่อนขออนุมัติใหม่ เพราะงบ QA cloud เดิม 4 ตารางใช้ครบแล้ว ส่วน trusted-server business invariants ยังเป็นประเด็นที่ต้องพิจารณาก่อน production ตามรายงานเฟสก่อน

ตรวจบนเครื่องได้ที่ `http://127.0.0.1:4310/dev/calendar-staging-roles` Cloudflare hostname เดิมหมดอายุแล้ว เฟสนี้ไม่ได้เปิด tunnel/เพิ่ม authorized domain ใหม่
