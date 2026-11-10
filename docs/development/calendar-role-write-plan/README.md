# แผนตรวจการสร้างตารางบน cloud ด้วย Staff/Superadmin

11 พฤศจิกายน 2569 · Branch `codex/calendar-role-write-plan` · ผู้ใช้อนุมัติ manifest แล้วด้วยคำตอบ “approve” ดำเนินการต่อบน `codex/calendar-role-write-qa` ตาม [รายงาน executor และผลทดสอบ](../calendar-role-write-qa/README.md) ข้อความแผนด้านล่างคงไว้เป็นฉบับที่เสนอ

ผู้ใช้รับเฟสอ่าน/controls แล้วและให้เตรียมเฟสต่อ รวมอนุญาตให้เลือกบัญชี Google ที่ระบุผ่าน browser ได้ ขั้นนี้สร้าง manifest, pure validator, tests และเครื่องมือ preflight แบบอ่านอย่างเดียว ยังไม่เปิดปุ่มยิงคำขอเขียน QA หรือเขียนตาราง cloud

## 1. ทำอะไรตามลำดับ

ทดสอบเฉพาะ `labboy-workload-app-staging` / database `(default)` แบบ STANDARD ใช้ Google สองบัญชีเดิมที่ยืนยันบทบาทแล้ว ไม่เปลี่ยน profile หรือสิทธิ์เพิ่ม อนุญาตการเลือกบัญชีใน browser หมายถึงเลือก Google identity; บทบาทจริงอ่านจาก profile บน server ไม่ได้เลือก role ใน Google

Fixture เดียวใน [staging-fixture.json](staging-fixture.json):

| หัวข้อ | ค่า |
|---|---|
| ชื่อ | `QA-ROLE-CLOUD-CREATE` |
| วัน | ศุกร์ 23 เม.ย. 2570 (`2027-04-23`) |
| ห้อง / เวลา | 402 / 10:00–11:00 |
| การเกิดซ้ำ | ครั้งเดียว `validFrom=validTo=2027-04-23` |
| ภาคเรียน / ผู้สอน | `2/2569` / ว่าง |
| งบข้อมูลใหม่ทั้งเฟส | สูงสุด 1 schedule, 1 receipt, gate revision เพิ่ม 1 ครั้ง |

หลังอนุมัติจึงพัฒนาและทดสอบ executor บน Emulator ก่อนเปิด cloud actions ลำดับที่จะดำเนินการ:

1. ตรวจ manifest SHA-256 ตรงกับฉบับอนุมัติ ตรวจ fresh role/profile, gate revision 9, QA เดิม 4 schedules/4 receipts, fixture/receipt ใหม่ยังไม่มี และห้องว่าง หากข้อมูลเปลี่ยนให้หยุดก่อนส่ง ไม่แก้ revision ใน manifest หรือขยายวันเอง
2. **Staff raw SDK create**: ใช้ session ICIT ส่ง `writeBatch` โดยตรงเพื่อข้ามการปิดปุ่มและ guard ใน client writer เอกสารจำกัดเฉพาะ schedule/receipt เดียวกันกับ fixture และ `calendarWriteState/main` ที่ revision 9→10; metadata ใช้ UID ปัจจุบันใน SDK กับ server timestamps ไม่ส่ง token ออกมา คาดหวัง `permission-denied` และตรวจ privileged audit ว่าทั้ง batch ไม่เกิดผล
3. เมื่อขั้น Staff ถูกปฏิเสธและ audit ยัง 4/4/revision 9 เท่านั้น จึงใช้ **Superadmin เพิ่มผ่านฟอร์มปฏิทินปกติ** ด้วย fixture นี้ คาดเพิ่ม 1 รายการและ 1 receipt, revision 10
4. **Superadmin ส่ง fixture เดิมซ้ำผ่าน sanctioned writer เดิม** ด้วยปุ่ม QA ที่รับได้เฉพาะ manifest ไม่ผ่านฟอร์มเพิ่มที่กันห้องชนไว้ก่อนถึง server คาด `created=0`, `skipped=1`, `repeated=true`, ไม่เพิ่ม schedule/receipt/revision
5. โหลดข้อมูลใหม่ ตรวจวัน/ห้อง/เวลาและ exact fields ของ QA เดิมกับ fixture ใหม่ เก็บผล UI, SDK และ privileged audit แยกกัน

ตารางที่เพิ่มสำเร็จเป็นข้อมูลสังเคราะห์คงอยู่เพื่อให้ตรวจรับ ไม่ลบ cleanup ในเฟสนี้ ไม่ส่ง update/delete ของตารางเดิม ไม่ deploy rules/UI หรือ push

## 2. ทำไมเลือกแนวทางนี้

ผลเฟสก่อนยืนยันสิทธิ์อ่านและปุ่ม แต่ยังไม่ยืนยันการปฏิเสธคำขอเขียนที่ข้าม UI การใช้ raw SDK batch ของ Staff ทำให้ตรวจ rules จริง ส่วน Superadmin ใช้ workflow ที่ผู้ใช้ใช้งานจริงและ writer เดิมในการส่งซ้ำ

ใช้ fixture เดียวกันทั้งสองบทบาทจึงจำกัดจำนวนข้อมูลใหม่ได้ แม้ Staff เขียนผ่านผิดคาดก็สร้างได้เฉพาะ fixture นี้ ไม่เปิดทางให้เพิ่มตารางชุดอื่นจากเครื่องมือ QA ปุ่ม QA ฝั่ง browser ต้องตรวจ manifest, project, session และบทบาทจริงทุกครั้ง ไม่มีการดึง UID/token ไปเขียนแทนด้วย CLI

## 3. ความเสี่ยงและวิธีหยุด/ย้อนกลับ

- หาก **Staff เขียนสำเร็จผิดคาด** ให้หยุดทั้งเฟสทันที ไม่ทำขั้น Superadmin ต่อ ไม่ retry และไม่ลบหลักฐาน งบสูงสุดยังเป็น 1 schedule/1 receipt เดิม ต้องวิเคราะห์สิทธิ์ก่อนดำเนินต่อ
- หาก gate, profile, occupancy หรือผลตอบกลับไม่ตรงคาด รวมถึงผล commit ไม่ชัดเจน ให้ audit ก่อน ไม่กดส่งซ้ำโดยเดา การตรวจครั้งเตรียมแผนไม่ใช่ lock ห้อง จึงต้อง preflight ใหม่ก่อนคำขอจริง
- Raw batch ต้องเป็น payload ที่ถูกต้องสำหรับผู้มีสิทธิ์ เพื่อไม่สรุปผิดว่าเป็น role denial ทั้งที่ schema/metadata ผิด ก่อน cloud ต้องพิสูจน์ payload เดียวกันใน Emulator ว่า Staff ถูกปฏิเสธและ Superadmin ยอมรับ และ compare business fields กับ writer ปกติ
- หลัง Staff denial ต้องยืนยัน revision ยัง 9 และ positive Superadmin payload ตรง fixture เพื่อจำกัดข้อสงสัยเรื่อง stale revision หรือคนละข้อมูล ไม่ใช้ผลนี้แทนการแยกทุกปัจจัย role/capability
- คง UI/executor ใน development-only branch; ปิด executor หรือย้อนเฉพาะไฟล์ของเฟสได้จาก Git โดยไม่แก้ branch production การยกเลิก/ลบ fixture cloud เป็น scope ใหม่ที่ต้องยืนยันแยก ไม่ลบอัตโนมัติ

## 4. ตรวจสอบอย่างไรและเกณฑ์รับ

- Unit tests ของ manifest, bounds, duplicate IDs และ occupancy; reject production, เพิ่มงบ, เปลี่ยน fixture, สลับลำดับ, เปิด cleanup/role changes และข้อมูลอ่านไม่ครบ
- Emulator integration ของ raw batch เทียบสองบทบาท รวม single-use/duplicate handling ของ executor ก่อนใช้ cloud ไม่ใช้ owner provisioning เป็นหลักฐาน user rules
- Browser E2E ผ่าน Edge กับ Google sessions แยก ใช้บัญชี Staff/Superadmin เดิมและใช้เพียง DOM/UI ในการควบคุม; SDK ทำงานภายในแอปตามปกติ ไม่คัดลอก token หรือ credentials
- Staff: `permission-denied` จาก server, target/receipt ไม่เกิดขึ้น, QA เดิม exact และ gate คง 9
- Superadmin: เพิ่มผ่าน UI ได้ 1 รายการ, writer ส่งซ้ำสร้าง 0/ข้าม 1, QA รวมที่เกี่ยวกับสองเฟส 5 schedules/5 receipts และ revision 10
- ตรวจ diff, syntax/lint และ compatibility export สำหรับไฟล์ runtime ที่จะเพิ่ม ไม่ render QA controls ใน production

ยังไม่ครอบคลุม Admin-no-capability/pending/inactive, update/delete authorization, network-loss atomicity หรือ trusted-server business invariants จึงไม่สรุปว่าผ่าน full cloud role matrix หรือพร้อม production

## ผลเตรียมแผนที่ตรวจแล้ว

หลักฐานอยู่ใน `output/playwright/calendar-role-write-plan/` ได้แก่ `cloud-preflight.json`, `cloud-storage-audit-before.json`, `prepared-fixture.json`, `plan-checks.json` และ `unit-summary.json`

Manifest ฉบับที่เสนอ SHA-256: `cc046d34339f6a02bee2c5af99b5036c24dbfae8624baee2f2db3e2f8354ff55` คำนวณจาก bytes ของไฟล์ที่ตรวจครั้งนี้ หาก hash เปลี่ยนให้หยุดและตรวจฉบับอนุมัติ ไม่ยอมรับ payload ใหม่เงียบ ๆ

อ่าน staging แบบ field projection เฉพาะห้อง/วัน/เวลาและ existence/revision ไม่เลือกชื่อ ผู้คุม หรือข้อมูล production พบ active classrooms 29, exams ในวัน fixture 0, ห้องว่าง ณ เวลาตรวจ, schedule/receipt ของ fixture ยังไม่มี และ revision 9; QA เดิม 4/4 fields และ operation references ตรง manifest เดิม ต้องตรวจใหม่ก่อนรันจริง

คำสั่งที่ใช้ตรวจรอบเตรียม:

```text
node --test scripts/calendar-role-write-plan.test.mjs scripts/calendar-staging-qa-plan.test.mjs scripts/calendar-staging-role-plan.test.mjs
node --check scripts/calendar-staging-admin.mjs
node scripts/calendar-staging-admin.mjs <approved-cli-operator> qaRoleWritePreflight
node scripts/calendar-staging-admin.mjs <approved-cli-operator> qaAudit before role-write-plan
git diff --check
```

รอบนี้ไม่มี frontend runtime changes จึงไม่รัน application build/Vitest suite เดิมซ้ำ ผล Node tests รวม 46 กรณี (ใหม่ 15 + regression plans เดิม 31) ไม่อ้างว่า Emulator/cloud write tests ผ่านแล้ว
