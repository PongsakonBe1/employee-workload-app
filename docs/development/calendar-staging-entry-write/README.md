# เพิ่ม/นำเข้าปฏิทินใน flow หลักของ staging

11 พฤศจิกายน 2569 · Branch `codex/calendar-staging-entry-write` จาก `7c498a4` · Agent QA ตามขอบเขตหลักผ่าน รอผู้ใช้ตรวจรับ มีข้อจำกัดของการทดสอบเสริมระบุด้านล่าง

## ขอบเขต

ผู้ใช้อนุมัติแผนเชื่อม writer pilot เดิมกับ `/calendar` โดยเพิ่ม flag แยก คงค่าเริ่มต้นอ่านอย่างเดียว และทดสอบก่อน release ไม่รวมแก้ไข ลบ คัดลอกสัปดาห์ Undo ฐานข้อมูล สอบรายวิชาที่ไม่มี contract หรือการเปลี่ยนสิทธิ์/Rules/production

## พฤติกรรมที่เพิ่ม

- `node scripts/dev-staging-ui.mjs` ยังอ่านอย่างเดียว; เพิ่ม `--writer` เพื่อเปิดทดลองเพิ่ม/นำเข้า `--legacy --writer` ถูกปฏิเสธก่อนเริ่ม server
- Write flag ต้องเป็น `1` พร้อม staging entry และ `NODE_ENV=development` เท่านั้น Project/config ยังคง validate เป้าหมาย staging เดิม
- Session รองรับ `{writable:false}` เป็นค่าเริ่มต้น และเปิด Context create เฉพาะ active Admin/Superadmin ที่มี `calendarWriter=true`; อ่าน profile ใหม่ก่อนส่งและ writer ตรวจซ้ำใน transaction
- เก็บ payload ที่ตรวจแล้วก่อน preflight ป้องกัน double submit ใช้ writer `{rules,events}`/receipt เดิม เมื่อผลไม่แน่ชัดจะกันชุดใหม่และมีคำสั่งส่งชุดเดิมซ้ำ ไม่เดาว่าเน็ตหลุดเท่ากับไม่มี write
- หลัง commit ล้าง cache แล้วอ่านช่วงปฏิทินใหม่ ผลอ่านเก่าที่ถูก invalidate ไม่เขียนทับสถานะ read-back ใหม่ที่สำเร็จแล้ว แยกสถานะบันทึกสำเร็จแต่ read-back ล้มเหลวออกจาก write failure ไม่เพิ่มรายการใหม่เพื่อแก้ปัญหาการอ่าน
- Logout/เปลี่ยนบัญชีไม่รับผลเก่ามาแสดงในบัญชีใหม่ ผล write ที่ออกจากเครื่องไปแล้วอาจ commit ได้ จึงไม่อ้างว่า logout ยกเลิก write ฝั่ง server
- Dialog ใช้ busy/inert เดิมเพื่อกันแก้ฟอร์ม/ปิด/กดซ้ำระหว่างส่ง และมี beforeunload warning ขณะส่งหรือรอยืนยันผล ข้อมูลร่างไม่ถูกบันทึกลง localStorage
- PDF/ภาพยังอ่านในเครื่อง ส่งเฉพาะข้อมูลที่ตรวจแล้ว ผู้คุมใช้ directory ID ไม่มีการสร้าง profile จาก OCR สอบรายวิชาถูกซ่อนในฟอร์ม staging ส่วน preview เดิมคงตัวเลือกเดิม
- หลังบันทึกสำเร็จ เปลี่ยนภาคเรียน/เพิ่มประเภทกิจกรรมในตัวกรองให้แสดงชุดที่เพิ่งเพิ่ม ล้างคำค้นและเปิดทุกห้องเมื่อ filter เดิมซ่อนบางห้องของชุดนั้น รักษาตัวเลือกสี/วันหยุดและตัวกรองที่ยังครอบคลุมชุดใหม่ไว้

## ประเด็นที่พบและแก้ระหว่าง QA

- Expanded SIT เคยหยุดด้วยข้อความ deterministic target มีอยู่แล้ว จากตำแหน่ง throw และ unit ที่จำลองซ้ำพบช่องว่างระหว่าง server query กับ transaction target read ใน concurrent requests เพิ่ม retry สูงสุด 3 รอบเฉพาะเมื่ออ่าน gate ผ่านสิทธิ์เดิมแล้วพบ revision เปลี่ยนจริง หาก gate เท่าเดิมยังปฏิเสธเอกสารเดิม ไม่ overwrite หรือ retry กลบ permission denial เพิ่ม 3 unit regressions และ SDK/Rules SIT ชุดสุดท้ายผ่าน
- CSS ของปฏิทินที่ import ใน dynamic component หลุดระหว่าง hot reload ทำให้ sidebar แสดงบนมือถือและ root overflow 514px ย้าย CSS import ไปที่ `/calendar` และ `/staging` route โดยตรง ตรวจ fresh session และ navigation กลับมาว่า stylesheet ยังอยู่และ root scroll/client width เท่ากัน
- Mobile import dialog เดิมใช้ `100vw` ซึ่งรวม scrollbar ปรับเฉพาะ mobile เป็น `100%` หลังแก้ dialog กว้าง 364 ขอบ 8–372 ภายใน client width 380 ที่ viewport 390px; date/time inputs วัดได้ 16px
- Cloud ชุดทดสอบเป็น 1/2570 แต่ filter เดิมเป็น 2/2569 ข้อมูลจึงถูกซ่อนแม้ commit/read สำเร็จ เพิ่ม `calendarFiltersForCreated` และผูกกับกรอกเอง/PDF/DL หลัง commit พร้อม unit ที่ทดสอบผ่าน expansion/filter จริง ไม่เพิ่ม cloud writes เพื่อ rerun เพราะใช้งบครบแล้ว ตรวจอ่านและแสดงชุดเดิมทั้งห้ารายการหลังแก้ผ่าน

## Manifest cloud สำหรับตรวจทาน

ผู้ใช้ตอบ **approve** ต่อ manifest ที่ระบุรายการครบก่อนส่งจริงแล้ว เก็บคำอนุมัติและ hash ใน `cloud-approval.json` คงไฟล์ [staging-fixtures.json](./staging-fixtures.json) ฉบับที่เสนอไว้ไม่แก้ย้อนหลัง แม้ field สถานะในเอกสารต้นฉบับยังเป็น proposed

SHA256 ของ manifest ที่เสนอ (normalize เฉพาะ CRLF → LF เพื่อรองรับ Git checkout บน Windows): `23cb6dc5922d7d75ac03dab64078bc0d8305204177bef42679d864343f65b7af` ต้องตรวจเทียบก่อนส่งจริง หากเปลี่ยน payload หรือ whitespace อื่นให้ตรวจทานใหม่

เป้าหมาย `labboy-workload-app-staging` / `(default)` ผู้บันทึก alias `superadmin` คือบัญชี Google ผู้ทดสอบเดิม ผู้คุม alias `staff` และ `superadmin` จับคู่เฉพาะบัญชีผู้ทดสอบที่อนุมัติแล้ว ไม่เปลี่ยน profile หรือเพิ่มรายชื่อ

| Operation | ข้อมูลที่ยืนยันก่อนส่ง | เอกสารใหม่สูงสุด |
|---|---|---:|
| กรอกเอง | `QA-ENTRY-MANUAL` · 17 พ.ค. 2570 · ห้อง 401 · 09:00–10:00 · ครั้งเดียว | 1 |
| PDF สังเคราะห์ | `QA-ENTRY-PDF-401` และ `QA-ENTRY-PDF-402` · 18 พ.ค. 2570 · ห้อง 401/402 · 11:00–12:00 · วันเริ่ม=สิ้นสุด | 2 |
| ภาพ DL สังเคราะห์ | 19 และ 20 พ.ค. 2570 · 17:00–18:30 · นักศึกษา 75 คนต่อรอบ · 406+407 · ผู้คุมสอง alias ที่ระบุ | 2 |

ภาคเรียน `1/2570` ทุกชุด ไม่มีชื่อผู้สอน/ข้อมูลบุคลากรจริงใน title หรือไฟล์ fixture จำกัด **5 schedules / 3 operations** พร้อม receipt ตาม writer เดิม ผลจริงเพิ่มครบ 5 schedules / 3 receipts และ revision **10 → 13** ตรงแผน ไม่เพิ่มข้อมูลเกินงบ ไม่แก้/ลบข้อมูล cloud หรือเปลี่ยนสิทธิ์/Rules ใช้งบของ agent ครบแล้ว การเขียนใหม่ต้องมีขอบเขตที่อนุมัติเพิ่ม

## หลักฐานปัจจุบัน

- Full Vitest **585 tests / 36 files ผ่าน** และ Node tests ของ manifest preparation 4 ข้อผ่าน; targeted lint และ script syntax ผ่าน
- Compatibility build ผ่านแม้ตั้ง entry/write flags เป็น `1` ใน production build; preview ไม่ render และไม่แตะ production output
- Emulator SDK/Rules SIT **13 กลุ่มผ่าน** รวม offline preflight ไม่ queue write, session controller, planner PDF/DL → writer, รอบเย็น/75 คน/สองห้อง, conflicts, atomic batch, concurrent/identical requests, lost reply หลัง commit และ read-back failure/recovery
- Staff/Admin ไม่มี capability ถูกปฏิเสธทั้ง session และ raw SDK batch โดย Rules; การถอน capability หลัง login หยุดก่อนส่งเพิ่ม Logout ล้าง writer state/cache
- Emulator ใช้ namespace เป้าหมาย staging บน loopbackเท่านั้น ปฏิเสธ namespace ที่มีข้อมูล ไม่ reset สร้าง/เก็บกวาดเฉพาะ fixture ของรอบนี้ ใช้ Auth สังเคราะห์ ไม่ถือเป็นผล Google cloud session หรือ PDF/OCR byte parsing
- Browser core checks **14 กรณีผ่าน**: Superadmin เพิ่ม/นำเข้าเปิด, ชื่อว่าง focus ช่องที่ต้องกรอก, PDF bytes อ่าน 2 รายการและ missing term focus, OCR จริงอ่าน 2 รอบและ unmapped proctor focus, cloud create/read-back 3 ชุด, Staff ใน session ใหม่อ่านข้อมูลที่ commit แล้ว/ปุ่มเขียนปิด, mobile detail, navigation/cache/CSS, desktop แสดงห้ารายการ และ F5 กลับ login gate
- Edge desktop `innerWidth=1912`, client/scroll width 1902; mobile viewport `390×844`, client/scroll width 380 หลังแก้ คืน viewport เป็น desktop แล้ว ไม่อ้าง Chromium viewport เป็น physical iPhone/Safari
- ก่อนส่ง ตรวจ expected targets/receipts ทั้งหมด absent และ gate revision 10 หลังส่ง privileged read-only audit ตรวจ business fields/actor/metadata ของทุก target และ receipt counts 1/2/2 ตรง manifest; หลัง navigation/F5 digest ของรายการ/receipts คงเดิม Profile version digest ของทั้งสองบัญชีเหมือน baseline ทั้งหมด ผลนี้ไม่ใช่ full collection diff หรือ Rules matrix ทุกสิทธิ์
- Console ของ main flow ไม่มี hydration mismatch; มี asynchronous listener/message-channel error 2 รายการ ยังไม่ยืนยันต้นทาง ไม่มี observed application flow failure จากข้อความเหล่านี้

ผลอยู่ใน `output/playwright/calendar-staging-entry-write/` โดย raw unit/build logs เก็บ local; summary/report สำหรับ review แยกจาก raw output

ไฟล์สำคัญ: `verification-summary.json`, `browser-report.json`, `unit-summary.json`, `emulator-report.json`, `cloud-storage-audit-before.json`, `cloud-storage-audit-after.json`, `cloud-audit-before.json`, `cloud-audit-after.json`, `cloud-approval.json` และภาพ review/ผลอ่านกลับของข้อมูลสังเคราะห์

```text
npm test -- --reporter=json --outputFile=output/playwright/calendar-staging-entry-write/unit-report.json
node scripts/verify-calendar-entry-write-emulator.mjs
node --test scripts/calendar-entry-write-plan.test.mjs
node scripts/check-ui-build.mjs calendar-staging-entry-write
node node_modules/eslint/bin/eslint.js --config scripts/ui-eslint.config.mjs frontend/components/calendar frontend/components/staging frontend/app/staging frontend/lib/calendarStagingSession.js frontend/lib/calendarStagingEntry.js
git diff --check
```

## ข้อจำกัดและย้อนกลับ

Rules ยังเป็น prototype; server enforcement ของ aggregate conflicts/directory membership/จำนวนเอกสารต้องทำก่อน production การปิด write flag ปิดเฉพาะ flow หลัก ไม่เพิกถอน capability และไม่ปิดหน้า pilot เดิม ไม่ rollback ข้อมูลที่ commit ไปแล้ว ไม่ push/deploy และไม่เพิ่มแพ็กเกจ

ยังไม่ผ่าน physical iPhone/Safari/Android หรือ user UAT ต้องตรวจรับเฟสนี้ก่อนเสนอ mutation แก้ไข/ลบ

การทดสอบเสริมหลังแก้ after-create filters พยายามเปิด browser บน namespace `demo-calendar-writer` แต่ Auth Emulator ที่กำลังทำงาน resolve SDK API keys ไปยัง default project staging จึงได้ `auth/user-not-found` สำหรับบัญชีที่สร้างใน demo namespace ไม่เปลี่ยน app/บริการเพื่อข้ามข้อจำกัดนี้ และไม่อ้างว่าการทดสอบเสริมผ่าน เก็บกวาด profile/gate/บัญชีสังเคราะห์เฉพาะของรอบนี้แล้ว ไม่มี schedule ถูกเพิ่มจากความพยายามนั้น ดู `emulator-ui-cleanup.json` ส่วน SDK/Rules SIT 13 กลุ่มใช้ project ที่ตรงกันและผ่านตามรายงานแยก

Cloud create ทั้งสามชุดเกิดก่อน visibility fix ของตัวกรอง ผลแก้มี unit regression และตรวจ final read/display ของข้อมูลจริงครบโดยไม่ส่ง write เพิ่ม จึงไม่อ้าง cloud create E2E รอบใหม่หลัง fix นี้

หมายเหตุเครื่องมือ: คำสั่ง `python` ของเครื่องเรียก Python Install Manager โดยไม่คาดหมายและรายงานอัปเดต manager เป็น 26.2 แต่โหลด runtime ไม่สำเร็จ สคริปต์แก้ไฟล์ไม่ได้ทำงาน จึงหยุดใช้ launcher และใช้ Node เดิมแทน ไม่มีการติดตั้ง dependency ของโครงการ
