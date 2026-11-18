# Release checklist กลาง — UI ใหม่และข้อมูลจริง

Freeze วันที่ **18 พฤศจิกายน 2569** · baseline `316e6c5` · branch เอกสาร `codex/production-release-freeze`

**สถานะ: ยังไม่พร้อม production ทั้งเวอร์ชัน** เอกสารนี้เป็นจุดติดตามงาน release หลักแทนการนับเฟสย่อยว่าเสร็จเท่ากับพร้อมทั้งระบบ ผู้ใช้อนุมัติให้ freeze ฟีเจอร์ใหม่และจัดงานค้างเป็น checklist เดียว รอบจัดทำเอกสารนี้ไม่เปลี่ยน runtime, cloud, credentials หรือข้อมูลจริง

## 1. ขอบเขตที่ freeze

Release นี้คือ **เว็บแอป UI ที่รับรองแล้ว พร้อมเชื่อมข้อมูลจริงและรักษาฟังก์ชันเดิม** ไม่ใช่การเปิดเฉพาะ Calendar แล้วเรียกว่ารุ่นใหม่ทั้งระบบ แบบอ้างอิงคือ [Review 10](../design/phase1/revision7/REVIEW_10.md), [ต้นแบบ revision7](../design/phase1/revision7/index.html) และการปรับที่ผู้ใช้รับรองภายหลังซึ่งอยู่ใน baseline นี้ ไม่เปลี่ยน palette, icon family, Liquid Glass library, navigation หรือ motion ใหม่ระหว่าง release โดยไม่มีเหตุผลด้าน defect/accessibility และการตรวจรับ

ข้อกำหนดที่ต้องรักษา:

- Staff/Admin/Superadmin และ pending/inactive/anonymous ใช้ขอบเขตข้อมูลและคำสั่งที่ถูกต้อง ทั้ง UI และ server/Rules ไม่ใช้การซ่อนเมนูเป็น authorization
- Quick Log/กรอกเอง/ประวัติ ใช้ catalog และเงื่อนไขจริง เช่น รับสายต้องมีผู้รับบริการ; manual suggestions เดิมไม่หาย; Combo เริ่มไม่เลือกและนับแต่ละหัวข้อรองเป็นหนึ่งบันทึก
- ช่องสแกนผู้ยืมอุปกรณ์เป็นเลข 13 หลัก; ตอนคืนใช้รหัสผู้ยืมเดิม ไม่บังคับช่องผู้รับบริการของงานชนิดอื่นเป็น barcode โดยไม่มี contract รองรับ งานประจำที่รับรองให้บันทึกทันทีต้องมี Undo ที่สอดคล้องกับธุรกรรมจริง
- Resource/equipment ใช้ stable IDs, สถานะ/สังกัด/รายการที่เพิ่มหรือหยุดใช้สะท้อนใน Quick Log และทุกหน้าที่เกี่ยวข้อง ไม่จับคู่คนหรืออุปกรณ์ด้วยชื่อหน้าที่คล้ายกัน
- Calendar มี day/week/month/list, filter/สีห้อง/ประเภทกิจกรรมที่สื่อความหมาย, holidays พร้อมปีอ้างอิง, dark mode และ mobile layout ตามที่รับรอง ไม่เปลี่ยนการกรองคาบเทียบกับเวลาปัจจุบันจากความเข้าใจผิดที่ผู้ใช้แก้แล้ว
- PDF ตารางเรียนและภาพ DL มี review/edit/mapping ก่อนยืนยัน; ปวช. 2 พ.ย. 2569–14 มี.ค. 2570 และ ป.ตรี 23 พ.ย. 2569–14 มี.ค. 2570 เป็นช่วงที่ผู้ใช้ยืนยันสำหรับตัวอย่าง ไม่ hard-code เป็นทุกภาคเรียน ช่อง “งดให้บริการ” ใน PDF ไม่กลายเป็นกฎห้าม Admin เพิ่มตารางโดยอัตโนมัติ
- DL มีรอบเย็น 17:00–18:30; ตัวอย่าง 75 คนคือ **ต่อรอบ** ใช้ 406+407 และผูกผู้คุมกับ directory ID จริง ไม่ persist คนชั่วคราวจาก OCR
- Overview/Staff Analytics เริ่มรายสัปดาห์ เลือกวัน/เดือน/ไตรมาส/ปีงบประมาณไทยและช่วงเองตาม contract ที่รับรอง Apply/cache/query ต้องไม่โหลดข้อมูลทั้งระบบโดยไม่จำเป็น
- แสดงค่าที่วัดได้จากข้อมูลจริง พร้อม drill-down, unknown/partial/empty/error states ไม่แปลงจำนวนบันทึกเป็นคะแนนคุณภาพ/ชั่วโมง/ความยาก JD ใช้ชุดเดียวทั้งทีมและต้องตรวจน้ำหนักจากเอกสารจริง ไม่เดาตัวเลข; Profile Radar คง Top 8 `minorTask` ตาม AGENTS.md
- สรุปแบบประเมินนับตามบันทึกแต่ละหัวข้อรอง รองรับช่วงที่ผู้ใช้เลือกสำหรับรอบประเมินปีงบละ 3 ครั้งและช่วงพนักงานใหม่ ไม่เดาวันแบ่งรอบ ไม่สร้างคะแนน/ลายเซ็น/ผลประเมินแทนผู้ประเมิน รูปแบบเอกสารที่ส่งมอบต้องตรวจเทียบตัวอย่างที่ผู้ใช้ให้
- PC/mobile ใช้งานได้ทั้ง light/dark, keyboard/focus/validation, reduced motion และ glass fallback; ฟอร์ม iOS ไม่ล้นหรือ zoom เพราะขนาดอักษรเล็ก Dock/Launchpad/controls คงแบบที่รับรอง
- เมนูและงานเดิมที่ยังไม่ได้ย้าย UI ต้องมีข้อสรุปก่อน release **ห้ามตัดฟีเจอร์เดิมหรือคงหน้าเก่าเป็นข้อยกเว้นโดยเงียบ ๆ** การยอมรับหน้าเก่าบางหน้าต้องได้รับความเห็นชอบจาก Tech Lead และระบุใน release notes

### สิ่งที่เลื่อนได้หลัง release

รายการต่อไปนี้เป็นงานเพิ่มเติมนอก baseline ไม่ใช่การย้าย requirement ที่รับรองแล้วออกจาก release:

- เปลี่ยนธีม/วัสดุ/ชุดไอคอนหรือเพิ่ม animation รอบใหม่เพื่อความสวยงามล้วน ๆ
- เพิ่มชนิดกราฟหรือ ML/forecasting/คะแนนประเมินอัตโนมัติที่ยังไม่อยู่ในข้อมูลและ contract ที่รับรอง
- เชื่อมดึงตารางจาก external DL admin อัตโนมัติ หรือรองรับไฟล์ชนิดใหม่เกิน PDF/ภาพที่ตกลงไว้
- เพิ่ม multi-organization, offline write/sync engine หรือระบบตั้งค่าใหม่ที่ไม่อยู่ใน baseline
- เปลี่ยนฐานข้อมูล/provider/โครงระบบครั้งใหญ่หรือเพิ่มแพ็กเกจเพียงเพื่อ redesign ระหว่าง release

บั๊กข้อมูลหาย/ซ้ำ/สิทธิ์ผิด/อ่านไม่ออก/ทำงานหลักไม่ได้ **เลื่อนไม่ได้** แม้การแก้จะกระทบ UI งานด้านความสวยงามที่ยังผิดจากแบบที่รับรองหรือทำให้ใช้งานไม่ได้ยังเป็น defect ของ release นี้

## 2. สถานะที่มีหลักฐานแล้ว

| ขอบเขต | สิ่งที่ผ่านแล้ว | ไม่ได้ยืนยันอะไร |
|---|---|---|
| Calendar local runtime | SDK14 clean install, Unit 671 tests, Emulator SIT, compatibility build | ไม่ใช่ full app production/UAT |
| Calendar Render staging | rollout revision `2aa1bd2` Live บน Free; anonymous 401, signed probe 2 ครั้ง และ Staff UI control ผ่าน; คืน writer/probe ปิดและยืนยัน health แล้ว | รอผู้ใช้ตรวจรับ bounded connectivity QA; trusted writer cloud QA/negative-auth coverage ที่เหลือยังไม่เสร็จ |
| Staging identity | service account + custom role 7 permissions, binding เดียว; owner เพิ่ม enabled user-managed key 1 ตัว, billing=false; server signed probe อ่าน staging ผ่าน | พิสูจน์เฉพาะ access ใน bounded probe ไม่รับรองทุก permission/collection และไม่เปิด key material |
| UI previews | หลาย flow ตรวจด้วย synthetic ledger และ review reference แล้ว | preview/fixture ไม่เท่ากับ persistent data integration |
| Production | รอบนี้ไม่ได้ deploy หรือเปลี่ยนข้อมูล/สิทธิ์ production | ต้องทำ baseline/schema/index/role/rollback review ก่อน cutover |

อ้างอิง: [runtime hardening](../development/calendar-runtime-hardening/README.md), [Render deployment](../development/calendar-runtime-hardening-deploy/README.md), [identity](../development/calendar-staging-identity/README.md), [coverage เดิม](../development/ui-coverage-history/COVERAGE.md)

Inventory ปัจจุบันจาก source: **43 routes = application 24 + development/QA 18 + staging entry 1** และ coverage อ้างอิงมี **30 views** เพิ่มเฉพาะ development cutover QA route ที่ไม่ render ใน production ดู [delta หลัง freeze](../development/calendar-trusted-writer-audit-prep/route-inventory-delta.json) และ [snapshot เดิม 42 routes](route-inventory.json) ซึ่งคง source commit เดิมไว้ View/dialog/anchor ไม่ใช่คนละ route และจำนวนเหล่านี้ไม่ใช่เปอร์เซ็นต์ความสำเร็จ

## 3. Matrix ครบ 24 application routes

ตารางนี้เป็นสถานะ **การย้ายเวอร์ชันใหม่** ไม่ใช่คำยืนยันว่าหน้าเดิมเสียหรือใช้งานไม่ได้ “Legacy/ยังไม่ยืนยัน” หมายถึงต้องตรวจ UI/data/สิทธิ์จริงของ release นี้ ห้ามทำเครื่องหมายผ่านจากการมีไฟล์ route เพียงอย่างเดียว

| Route | จุดตั้งต้นที่พบ | งานก่อนเปิดเวอร์ชันใหม่ | Gate |
|---|---|---|---|
| `/` | redirect เดิม | เข้า route ตาม session/role ถูกต้อง ไม่มี fixture user | AUTH, UI |
| `/login` | legacy | ย้ายแบบที่รับรอง + Google session/errors/logout/expiry จริง | AUTH, UI |
| `/pending` | legacy | ยังไม่อนุมัติ/ไม่ active ถูกปฏิเสธจริง | AUTH, UI |
| `/worklogs/new` | legacy + `/dev/record` | catalog จริง, manual/Quick Log/Combo, duplicate/failure/Undo | CORE |
| `/admin/record` | legacy + `/dev/record` | flow Admin และการเลือกบุคลากร/ขอบเขตข้อมูลจริง | CORE, AUTH |
| `/worklogs` | legacy + `/dev/history` | list/calendar/detail/edit/cancel/export ตามสิทธิ์และ storage contract | CORE |
| `/resources` | legacy + `/dev/resources` | สถานะ/รายละเอียด/ประวัติ/ยืมคืนจริงและ Undo | CORE |
| `/admin/equipment-items` | legacy + `/dev/equipment` | เพิ่ม/ย้ายสังกัด/หยุดใช้แล้ว Quick Log และประวัติสอดคล้อง | CORE |
| `/admin/equipment-health` | legacy + `/dev/equipment/usage` | นับความถี่/คงค้าง/สภาพจาก events จริง ไม่เดาค่า timeline | CORE, ANALYTICS |
| `/admin/templates` | legacy + `/dev/templates` | globalTemplates/catalog/recipient/version snapshots จริง | CORE |
| `/calendar` | development-only staging entry + legacy production path | trusted read/write, imports, production runtime แยกชัด | CAL, ENV |
| `/admin/classroom-schedules` | legacy + Calendar review | manager/import/recurrence ใช้ backend เดียวกับปฏิทินและสิทธิ์จริง | CAL, UI |
| `/admin/dl-exam-schedules` | legacy + Calendar review | ผู้คุม/75 คนต่อรอบ/รอบเย็น/conflicts/นำเข้าภาพจริง | CAL, UI |
| `/dashboard` | legacy + `/dev/dashboard` | ข้อมูลจริง/ทุกหัวข้อ/ช่วงเวลา/รายงานและ drill-down ตรงกัน | ANALYTICS |
| `/admin/staff-analytics` | legacy + `/dev/staff` | ปีงบ/รายเดือน/ช่วงเอง/JD ทั้งทีม/identity mapping จริง | ANALYTICS |
| `/profile` | legacy / design reference | profile จริง + Radar Top 8 minorTask + role/empty/error | UI, AUTH |
| `/export` | legacy / design reference | ขอบเขตบุคลากร/ช่วง/CSV/สูตร/ข้อมูลส่วนบุคคล/รายงานที่ตกลง | CORE, UI |
| `/admin` | legacy / design reference | ทุกทางคลิกไปฟีเจอร์จริงตามบทบาท ไม่มี placeholder ที่ดูเหมือนทำงาน | UI, AUTH |
| `/admin/users` | legacy / design reference | pending/active/role changes + server authorization/audit | UI, AUTH |
| `/admin/system` | legacy / design reference | ตรวจ broadcast/import/export requests และ anchors ตาม Review; รักษาความสามารถเดิม | UI, OPS |
| `/admin/settings` | legacy + appearance controls | appearance ใช้จริง; ตั้งค่าแต่ละตัวต้องมีพฤติกรรมจริง/ข้อสรุป scope | UI |
| `/admin/audit-logs` | legacy / design reference | Superadmin scope และ audit ของธุรกรรมจริง ไม่มี token/credential logs | UI, AUTH |
| `/admin/cleanup` | legacy / design reference | preview/ยืนยัน/สิทธิ์/audit เดิม; ห้ามทำ physical delete เพื่อ QA โดยพลการ | UI, AUTH |
| `/help` | legacy / design reference | คู่มือตรงกับ flow/role/import/ข้อจำกัดของ release จริง | UI |

Views ที่ไม่เป็น route แยกยังต้องตรวจ: `broadcast`, `imports`, `data-import`, `export-requests`, `notifications`, `about`, `condition` และสถานะ/dialog ใน reference ส่วน `design` เป็น component lab ไม่ใช่เมนู production ใหม่ รายการ view IDs เต็มอยู่ใน inventory

## 4. Release gates — ต้องปิดก่อน Go

สถานะเริ่มต้นเป็น unchecked จนมีหลักฐาน **ตามขอบเขตนี้** การผ่านใน prototype/Emulator/SDK pilot เดิมเป็นข้อมูลตั้งต้น ไม่ใช้ปิด cloud/production gate แทน

### G0 — ยืนยันความปลอดภัยและ baseline

- [x] **SCOPE** Freeze ตาม baseline และเก็บ inventory/application routes/views ครบในเอกสารนี้
- [ ] **SEC** ตรวจ IAM metadata วันที่ 18 พ.ย. 2569 พบ key ที่ ID prefix ตรงชื่อไฟล์ credential เป็น `disabled=true` และ Get resource ซ้ำยืนยันแล้ว จึงไม่ปิด/ลบ key เพิ่ม นำไฟล์ออกจาก Git ปัจจุบันและเพิ่ม ignore โดยคงไฟล์จริงไว้ในเครื่อง ยังต้องตรวจรับการเปลี่ยนแปลงนี้และตัดสินใจเรื่อง remote/history ก่อน release ไม่เปิด key contents ไม่เปลี่ยน key ตัวอื่น
- [ ] **DATA** ได้รับอนุญาตอ่าน baseline production ที่จำเป็นแล้ว ตรวจ schema, stable employee/resource IDs, เวลา/ปีงบ/ภาคเรียน, legacy missing fields, indexes และปริมาณจริง พร้อม backup/restore plan ไม่แก้ชื่อหรือจับคู่ด้วยชื่อคล้ายกันอัตโนมัติ
- [ ] **ENV** วาง production identity/project/hostname/config แยกจาก staging และทดสอบป้องกันข้าม project; ไม่เอา guard ที่ hard-code staging ไปเปิด production โดยเพียงสลับ flag
- [ ] **DEPENDENCIES** ตรวจ dependency graph ของ frontend/legacy backend/runtime ที่ release ใช้จริงและ triage advisory ที่เกี่ยวข้อง ไม่ถือ audit 0 ของ Calendar เท่ากับทั้ง repo; Critical/High ที่ยืนยันและยังไม่ได้แก้/mitigate ต้องมีข้อสรุปก่อน Go

SEC มีหลักฐานจาก filename/Git metadata, คำยืนยันเจ้าของ และ IAM List/Get ของ key ที่ตรง prefix ใน production หลังเจ้าของมอบหมายและอนุมัติ metadata ชัดเจน ไม่ได้เปิด credential เพื่อตรวจ private_key_id ภายใน ไม่ทราบเวลา/เหตุผลที่ปิดหรือการใช้งานย้อนหลัง ไม่ได้ยกเลิก session/access token เดิม และไม่พิสูจน์ว่า Render ใช้ key ใดเพราะไม่ได้เปิดค่าลับ ชื่อไฟล์สำหรับเจ้าของตรวจยังเก็บใน `.tools/calendar-staging/release-freeze-sensitive-paths.json` ที่ไม่ commit ประวัติ Git/remote ไม่ถูก rewrite หรือ push

### G1 — Calendar/Auth ทำงานจริงใน staging

- [ ] **CAL-CONNECT** จัด credentials ผ่านช่องทางที่อนุมัติและทดสอบ connection/signed token/revocation/profile แบบอ่านอย่างเดียว ขณะ writer ปิด [local connectivity probe](../development/calendar-staging-connectivity/README.md) ตรวจด้วย Emulator แล้ว และ [bounded Cloud QA](../../output/playwright/calendar-staging-connectivity-rollout/bounded-cloud-qa-report.json) ผ่านตาม [rollout manifest](../../deploy/calendar-staging/connectivity-rollout.review.json): anonymous 1 ครั้งได้ 401, Superadmin signed 2 ครั้งสำเร็จ, Staff อ่านได้แต่ปุ่ม probe/เพิ่ม/นำเข้าปิด และคืน flags 0/0 พร้อม health ยืนยัน รอผู้ใช้ตรวจรับและทบทวน revocation/negative-auth coverage ที่เหลือกับ AUTH gate โดยไม่อ้างว่าทดสอบ revoked token หรือ Staff HTTP denial บน cloud แล้ว
- [ ] **CAL-WRITE** trusted server ผ่าน approved synthetic cloud manifest: manual/PDF/DL, edit/soft-cancel, duplicate/replay, lost response/read-back failure, concurrency/atomic failure, room/proctor conflicts; จำนวนและ IDs ถูกตรวจ ไม่เขียนนอกชุดเพื่อแก้ผลทดสอบ [ข้อเสนอ QA 5 schedules / 5 operations / 13 POSTs](../development/calendar-trusted-writer-qa-prep/README.md) ตรวจ planner แล้ว และ [baseline สด](../development/calendar-trusted-writer-baseline/README.md) ผูก directory IDs/freeze inputs แล้ว gate 17 → คาด 22 มี [post-write auditor พร้อม unit guards](../development/calendar-trusted-writer-audit-prep/README.md) แล้ว แต่ยังไม่อนุมัติ trusted write window หรือส่ง write และยังมี coverage ที่แยกไว้ชัดเจน
- [ ] **CAL-CUTOVER** deploy Rules ที่ปิด direct client writes ใน staging แล้ว ผล audit ยืนยัน hash ของ Rules, gate revision 17 และไม่พบ schedule หรือ receipt ใหม่ในชุดทดสอบ Emulator ผ่านทั้งการอนุญาตภายใต้ Rules เดิมและการปฏิเสธภายใต้ Rules ใหม่ Cloud QA ยังรอตรวจ reader สองบทบาทและ SDK denial หนึ่ง batch เพราะ proof หมดอายุระหว่างล็อกอิน ดู [รายงาน cutover](../development/calendar-staging-cutover-verify/README.md)
- [ ] **AUTH** Anonymous/pending/inactive/Staff/Admin-no-capability/Admin-writer/Superadmin ถูก allow/deny ตาม contract ทั้งเรียกตรง backend/SDK และ UI; ไม่เปลี่ยน profile/role เพื่อให้เทสต์ผ่านโดยไม่อนุมัติ

### G2 — UI ที่รับรองเชื่อมข้อมูลจริงครบขอบเขต

- [ ] **CORE** record/history/templates/resources/equipment/export ใช้บริการจริงที่สอดคล้องกัน ผ่าน refresh/ข้ามหน้า/ข้าม session, duplicate submit, concurrent operation, draft/focus และ Undo ตาม storage contract ไม่มี in-memory ledger ถูกใช้เป็นข้อมูล production
- [ ] **ANALYTICS** Overview/Staff/equipment/report อ่านข้อมูลจริงตามช่วงที่เลือก; aggregate/count/drill-down/export ตรงกัน; JD จริงและแบบประเมินผ่านการตรวจ; unknown/partial data ไม่กลายเป็นศูนย์หรือคะแนนปลอม
- [ ] **UI** ปิดงานทั้ง 24 routes และ views ที่เกี่ยวข้องตาม Matrix + Review; เลิกอ้างอิง fixture data/role picker ของ develop ใน production ทุกปุ่มมีปลายทาง; ข้อยกเว้นคงหน้าเดิมต้องมี Tech Lead ลงความเห็นชอบก่อน
- [ ] **PROD-BUILD** production build แสดง UI ใหม่ผ่าน entry/config ที่ตั้งใจรองรับ production โดยไม่ตั้ง NODE_ENV=development; QA tools/role switcher/fixtures/secrets และ staging config ไม่หลุดเข้า production export ต้องแก้ความคาดหวังของ compatibility tests อย่างมีเหตุผล

### G3 — ทดสอบและเปิดใช้แบบควบคุม

- [ ] **TESTS** Unit ที่เกี่ยวข้อง, full suite, targeted lint, integration/E2E ตาม feature ที่เปลี่ยนและ production compatibility build ผ่าน ตรวจ diff/อาร์ติแฟกต์จริง ไม่รัน suite กว้างซ้ำเพียงเพื่อสะสมผล
- [ ] **UAT** ผู้ใช้ตรวจรับบน PC Chrome Windows/Mac, iPhone Safari, Android Chrome, เครื่องสแกน และ PWA ตามการใช้จริง; ไม่มี blocker/critical ที่ค้าง ผล viewport emulation ไม่แทนผลเครื่องจริง
- [ ] **COST** วัด queries/reads ที่เกี่ยวข้องกับช่วงเวลา/cache/pagination และกรณี reload พร้อม quota assumptions; ไม่เรียกตัวนับคำขอว่า billed reads ไม่เพิ่ม cron/plan/บริการเสียเงินโดยอัตโนมัติ
- [ ] **OPS** ตรวจ Auth domains/CORS/indexes/PWA cache/service worker, imports assets, FCM/broadcast ที่ยังใช้ และ cron เป้าหมายเดิม; backup/restore, logs ไม่เก็บ secrets, release notes/known limits/support/rollback พร้อม
- [ ] **GO** ระบุ release commit/lock/config/Rules hashes, UAT sign-off และ approved exceptions; Tech Lead ให้ Go ก่อน production write/deploy ไม่ใช้การอนุมัติ feature freeze เป็นคำอนุมัติ cutover

## 5. UAT ชุดเดียวที่อ้างอิงร่วมกัน

ทุก scenario ต้องระบุ device/browser/role/dataset/version, expected/actual และหลักฐาน ไม่มีจริงให้ระบุ pending ไม่ลง “ผ่าน” ล่วงหน้า

| ID | Scenario ที่ทีมต้องลอง | เกณฑ์ยอมรับ |
|---|---|---|
| U01 | login/logout/session expiry/pending/เปลี่ยนสิทธิ์ | ไม่ค้าง session ผิดบัญชี; เรียกคำสั่งตรงแล้วยังบังคับสิทธิ์ |
| U02 | Quick Log โทรศัพท์/ติดตั้ง/บัญชี + กรอกเอง | catalog/suggestions/required fields จริง; focus ไปช่องผิดบนมือถือ |
| U03 | Combo ไม่เลือก → เลือก 3 งาน → ยืนยัน/ส่งซ้ำ/Undo | ไม่เลือกอัตโนมัติ; 1 หัวข้อย่อย = 1 บันทึก; ไม่เกิด duplicate/partial |
| U04 | เปิด–ปิดห้อง + ยืม–คืนด้วย scanner/สอง session | สถานะและผู้ยืมถูกต้อง; รหัสคืนเดิม; concurrency ไม่ทำข้อมูลหาย |
| U05 | เพิ่มอุปกรณ์/ย้ายสังกัด/หยุดใช้/แก้ template แล้วไป Quick Log | ID เดิมคงอยู่และรายการ/เงื่อนไขทุกหน้าปรับจริงหลัง reload |
| U06 | ประวัติ list/calendar/detail/edit/ยกเลิก/CSV | เปิดรายละเอียดไม่เด้งกลับ list; ข้อมูล/สิทธิ์/ยอดตรงกัน |
| U07 | PDF เรียนต่างช่วง + DL ภาพ/ผู้คุม/รอบเย็น/75 คน | review ถูก; ไม่สร้างชื่อผู้คุมชั่วคราว; ตรวจ conflict จริง ไม่เขียนบางส่วน |
| U08 | Calendar วัน/สัปดาห์/เดือน/list/filter/holidays/light-dark | แสดงช่วง recurrence/สี/รายละเอียดตรงกัน และ mobile ไม่ล้น |
| U09 | Weekly default → fiscal year/month/quarter/custom → drill-down/report | ยอดตามชุดเดียวกัน; JD/unknown/partial ถูกสื่อ; ไม่อ้างคะแนนประสิทธิภาพจากความถี่ |
| U10 | เมนูผู้ดูแล/profile/export/audit/notifications/help | ทำงานตาม role/reference จริง ไม่มี preview placeholder |
| U11 | Net loss, reply lost, reload, stale draft, duplicate/concurrent | แจ้ง uncertain/committed/read-back failure ถูก; retry ชุดเดิมไม่เพิ่มข้อมูล |
| U12 | iOS date/time/keyboard, scanner, PWA install/update, reduced motion/zoom | งานหลักใช้ได้บนเครื่องจริง; cache ไม่แสดงรุ่น/ข้อมูล/สิทธิ์เก่าปะปน |

## 6. ทำงานเป็น 4 ชุดให้จบ ไม่แตกเฟสตามทุกไฟล์

| ลำดับ | Work package / ผลส่งมอบ | Gate ที่ปิด | เวลาใช้วางแผน |
|---|---|---|---|
| A | ปิด SEC/DATA baseline แล้วเชื่อม Calendar/Auth/credentials/trusted cloud QA + cutover plan | G0, G1 ที่เกี่ยวข้อง | Calendar ราว 3–5 วันทำงานหลัง dependencies พร้อม |
| B | เชื่อม record/history/templates/resources/equipment + Analytics/JD/report กับข้อมูลจริง โดยคง UI ที่รับรอง | CORE, ANALYTICS | ประมาณ 5–8 วันทำงาน; ปรับหลัง contract audit |
| C | ปิดทุกหน้า/views ที่ยังไม่ย้าย และ entry/build production โดยรักษา functionality เดิม | UI, PROD-BUILD | ประมาณ 3–5 วันทำงาน; ทำบางส่วนขนาน B ได้ |
| D | cross-role/device regression + ทีม UAT + release candidate/backup/rollback/Go | G3 | ประมาณ 2–3 วันทำงานเมื่อ candidate พร้อม |

**2–4 สัปดาห์ทำงานเป็นประมาณการวางแผน ไม่ใช่กำหนดส่งรับรอง** แต่ละชุดมี dependency และทำบางงานเหลื่อมกันได้ ไม่รวมเวลารอบัญชี/credentials/อนุมัติ/UAT และอาจเปลี่ยนจาก schema/secret finding/defect จริง หลัง audit DATA และจบ A ต้องประเมิน effort ที่เหลือใหม่จากจำนวนงานจริง ไม่คำนวณเปอร์เซ็นต์จากจำนวน phase/route/test

Codex รับผิดชอบ implementation/evidence; ผู้ใช้เป็น Tech Lead/Reviewer และผู้อนุมัติ release; ผู้ใช้/ผู้มีสิทธิ์จัดการ credential material เอง; ทีมใช้งานเป็นผู้ตรวจรับ UAT **ไม่ส่งข้อความหาใครหรือสร้างบัญชีแทนโดยอัตโนมัติ**

การอนุมัติแต่ละ work package ให้ทำงานภายในขอบเขตที่อนุมัติต่อเนื่อง ไม่ถามซ้ำเรื่อง implementation ย่อยตามปกติ สิ่งที่ยังต้องยืนยันเฉพาะ resource/action คือ credential/key, IAM/Rules, cloud write manifest, push/deploy และ production cutover ตามกติกาที่ตกลง ไม่ขยายสิทธิ์/ข้อมูล/จำนวน operations เอง

## 7. นโยบายเปลี่ยน scope และ Go/No-Go

การเพิ่ม/ตัด/เลื่อน requirement ที่รับรองแล้วต้องบันทึก `เหตุผล → ผลกระทบ → ทางเลือก → test/rollback → ผู้อนุมัติ/วันที่` ที่หัวข้อ Decision log ด้านล่าง รักษาข้อมูลเดิมและ compatibility ไม่เปลี่ยน provider/ธีม/แพ็กเกจเพราะมีแนวทางใหม่ระหว่าง release

เปิดทั้งเวอร์ชันได้เมื่อทุก gate ที่จำเป็นมีหลักฐานตรง scope และ Tech Lead ให้ Go ไม่มี unresolved data-loss/duplicate/authorization/critical security blocker ถ้าจะเปิด Calendar pilot ก่อน ต้องเรียกว่า **Calendar pilot** และมี scope/อนุมัติของ pilot เอง ไม่ถือว่าปล่อยทั้ง UI version แล้ว

Rollback หลัง cutover ให้ fallback read-only โดยรักษาข้อมูลที่ commit/receipts และ client-write-deny ที่จำเป็น ไม่ย้อนกลับไปเปิด SDK writer เพื่อแก้สถานการณ์ ไม่ลบข้อมูลจริงเพื่อให้เทสต์ผ่าน ต้องมี revision/config/Rules ที่เข้าคู่กันและขั้นตอน restore ที่ตรวจแล้ว

### Decision log

| วันที่ | ข้อสรุป | ผู้ตัดสินใจ / ขอบเขต |
|---|---|---|
| 18 พ.ย. 2569 | Freeze ฟีเจอร์ใหม่และจัด release checklist กลาง อ้างอิง baseline ที่รับรอง | ผู้ใช้สั่ง “ทำตามคุณแนะนำเลย”; อนุมัติงานเอกสารนี้ |
| 18 พ.ย. 2569 | ยังไม่มีข้อยกเว้นตัด feature/คงหน้าเดิม และยังไม่อนุมัติ production Go | ต้อง review การเปลี่ยน scope/rollout แยก |

## 8. ผลตรวจรอบจัดทำ checklist

ตรวจ source routes, approved-view coverage, references/JSON และ diff โดยไม่อ่าน `.env`, key material, seed users หรือข้อมูล production ตรวจเฉพาะ **ชื่อไฟล์ที่ Git track** เพื่อทำ SEC gate ไม่รัน Unit/build เพราะไม่มี runtime change ไม่เปิด Console ไม่เรียก cloud ไม่สร้าง credentials ไม่ push/deploy รอบนี้ ดู [verification summary](verification-summary.json)

เอกสารนี้เป็น master ที่อัปเดตสถานะครั้งถัดไป รายงานเฟสก่อนยังเก็บเป็นหลักฐานย้อนหลัง ห้ามแก้คำว่า “ยังไม่พร้อม” ในรายงานเก่าเพื่อให้ดูเหมือนผ่าน release ปัจจุบันแล้ว
