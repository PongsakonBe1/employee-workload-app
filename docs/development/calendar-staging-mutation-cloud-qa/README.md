# เตรียม Cloud QA สำหรับแก้ไขและยกเลิกปฏิทิน

Branch `codex/calendar-staging-mutation-cloud-qa` จาก `554f432` ผู้ใช้อนุมัติเฉพาะ **เตรียม manifest/Rules/เครื่องมือตรวจ และทดสอบ Emulator** ยังไม่อนุมัติ deploy Rules หรือ cloud mutation

## Manifest ที่เสนอ

`staging-manifest.json` ล็อก project `labboy-workload-app-staging`, database `(default)`, target ID เดิม 2 รายการ และลำดับ 4 operations:

| ลำดับ | รายการ | คำสั่ง | Version ก่อน → หลัง | Gate ก่อน → หลัง |
|---|---|---|---|---|
| 1 | QA-ENTRY-MANUAL · 17 พ.ค. 2570 ห้อง 401 | 09:00–10:00 → 10:00–11:00 | 0 → 1 | 13 → 14 |
| 2 | DL · 19 พ.ค. 2570 | ชื่อเดิม → QA-MUTATION-DL | 0 → 1 | 14 → 15 |
| 3 | รายการข้อ 1 | ยกเลิกด้วย isActive=false | 1 → 2 | 15 → 16 |
| 4 | รายการข้อ 2 | ยกเลิกด้วย isActive=false | 1 → 2 | 16 → 17 |

DL คงเวลา 17:00–18:30, 75 คนต่อรอบ, ห้อง 406+407 และผู้คุม UID เดิม ไม่เพิ่ม schedule ใหม่ ไม่แก้ profile ไม่ลบเอกสารหรือ receipt เดิม ไม่แตะ production หลังจบรอบ QA รายการสังเคราะห์ทั้งสองจะถูกเก็บในสถานะ inactive ไม่มี Undo/restore ใน flow นี้

SHA256 ของ manifest: `d0ebac68d1b06fc2cf12753ea46e53a9f48421a98a84c64ed4465866272dbd17`

การตรวจ hash ใช้ LF และตัด whitespace เฉพาะท้ายไฟล์ ไม่ normalize payload ภายในไฟล์ หากเปลี่ยนเนื้อหาต้องตรวจอนุมัติใหม่

## Rules ที่เตรียม

- สร้างจาก source mutation prototype ที่ pin hash ไว้ โดยไม่แก้ `firebase/calendar-writer/firestore.rules` หรือ Rules ที่ deploy อยู่
- จำกัด mutation เฉพาะ UID ที่ resolve จากบัญชี Google alias `superadmin` ที่ผู้ใช้อนุมัติ ไม่เปิดเพิ่มให้ Admin/Superadmin writer คนอื่น
- จำกัด collection/document ID, operation ID, expected version, gate revision และ business map ก่อน–หลังตรง manifest
- คง validator ของตารางเรียน/DL, immutable creation metadata และ transaction ที่ผูก target/receipt/gate; ไม่อนุญาต physical delete หรือ client profile write
- อนุญาต v2 receipt เฉพาะ operation ทั้งสี่ ปฏิเสธการแย่งใช้ ID เดียวกันด้วย v1 receipt และป้องกันแนบ create เพิ่มมากับ v2 mutation ส่วน create/read v1 เดิมยังคงนโยบายเดิม
- ยังคงเป็น prototype สำหรับ staging ที่จำกัดผู้ทดสอบ ไม่ใช่ production Rules หรือ trusted server สำหรับ business invariants ทั้งระบบ

`rules-review.synthetic.rules` และ `.diff` ใช้ UID สังเคราะห์เพื่อ review โครงสร้าง **ห้ามนำไฟล์สังเคราะห์นี้ deploy** ตัวจริงที่ผูก UID อยู่เฉพาะ local ignored directory:

```text
.tools/calendar-staging/mutation-cloud-qa/firestore.rules
.tools/calendar-staging/mutation-cloud-qa/rollback.rules
.tools/calendar-staging/mutation-cloud-qa/firebase.json
.tools/calendar-staging/mutation-cloud-qa/firebase.rollback.json
.tools/calendar-staging/mutation-cloud-qa/prepared.json
.tools/calendar-staging/mutation-cloud-qa/reviewed-operations.json
```

UID ในไฟล์เหล่านี้จำเป็นสำหรับ allowlist/ตรวจ payload แต่ไม่ใช่ credentials ไม่ commit UID จริงหรือข้อมูลรับรอง ไฟล์ใหม่เขียนด้วย `wx` ปฏิเสธการเขียนทับ candidate เดิม ฉบับ review แรกที่ยังไม่ผ่านการตรวจเก็บแยกใน `.tools/calendar-staging/mutation-cloud-qa-review-v1/` ไม่ใช้เป็นฉบับขออนุมัติ

**ฉบับขออนุมัติล่าสุด**:

- Rules candidate SHA256: `b5a7546749f4ecd32a194e809d72ea2656ba11c3c422a243935d3a3c8e6c3ace`
- Rules rollback SHA256: `6cd83e8b8a287f301725b26adbb36c987f789351a8aea1475a6150d40bae458f`

ข้อความกำกับจาก skill:

> I've set up prototype Security Rules to keep the data in Firestore safe. They are designed to be secure for this bounded staging QA through an actor/target/operation allowlist, exact reviewed state transitions, and atomic receipt/gate checks. However, you should review and verify them before broadly sharing your app. If you'd like, I can help you harden these rules.

## เครื่องมืออ่านและตรวจผล

`calendar-mutation-cloud-prepare.mjs` มีเฉพาะ `prepare`, `audit 0..4` และ `rollback-check` **ไม่มี deployment API หรือ API เขียน Firestore** ใช้ installed Firebase CLI client ที่ล็อก version โดยไม่เปิด credential files/token ออกมา

- `prepare`: ตรวจ Google identities, role/capability, profile version digests, schedule/receipt digests เดิมและ gate; อ่าน bounded calendar queries เพื่อตรวจห้อง/ผู้คุมชน แล้วสร้างไฟล์ review ใหม่ในเครื่อง
- `audit N`: อ่าน target, receipt, gate และ profile แบบ projection ตรวจหลัง operation N พร้อมตรวจ digest ของ receipts จาก checkpoint ก่อนหน้า ตรวจซ้ำได้โดยเปรียบเทียบ digest กับ checkpoint ต้นฉบับและเขียนไฟล์ check ใหม่ ไม่เขียนทับหลักฐานเดิมหรือเขียน cloud
- `rollback-check`: อนุญาตให้เสนอการคืน Rules เฉพาะเมื่อ hash ที่ deploy อยู่ยังตรง candidate นี้ ไม่คืนทับ release ของผู้อื่น ไม่ได้ทำ rollback เอง

คำสั่งใช้ operator ที่อนุมัติและ identity aliases ผ่าน arguments ไม่ใส่อีเมลจริงลง fixture ใน repo ข้อมูล output ใช้ aliases/digests เท่าที่จำเป็น

```text
node scripts/calendar-mutation-cloud-prepare.mjs <operator> prepare staff=<approved-staff> superadmin=<approved-superadmin>
node scripts/calendar-mutation-cloud-prepare.mjs <operator> audit 0
node scripts/calendar-mutation-cloud-prepare.mjs <operator> audit 1
node scripts/calendar-mutation-cloud-prepare.mjs <operator> rollback-check
```

ขณะนี้ `audit 0` ผ่านและ Rules ยังเป็น append-only ดังนั้น `rollback-check` จะปฏิเสธอย่างถูกต้องจนกว่าจะมีการ deploy candidate นี้ตามคำอนุมัติใหม่ ใช้ไฟล์ `reviewed-operations.json` สำหรับ frozen input เดิม การกดแก้ใหม่จาก state ล่าสุดไม่ถือเป็น receipt replay เพราะอาจได้ operation ใหม่

Audit เป็น privileged read เพื่อเทียบ state ไม่ใช่หลักฐาน Rules enforcement และไม่ได้สแกนทั้งฐานข้อมูล การอนุมัติรอบ cloud ต้องแยกจากผล Emulator/Google session เดิม หากมีการเขียนหรือ deploy อื่นระหว่าง QA ให้หยุดและทบทวน baseline ใหม่

## ผลตรวจที่ทำจริง

- Node plan/audit/rollback tests 9 กรณีผ่าน
- Bounded Rules กับ SDK จริงบน Emulator ผ่าน 14 กลุ่ม รวม actor ที่ไม่อยู่ allowlist, คำสั่งผิดลำดับ, fields/count/op ปลอม, orphan/v1-preempt receipts, piggyback create, profile/delete denial, 4 operations + 4 receipt replays, protected data และ rollback
- ฉบับ UID-bound จริง compile ผ่าน Emulator และคืน Rules เดิมแล้ว การ compile นี้ไม่ใช่การทดสอบ Google cloud session
- Full Unit suite ของแอปผ่าน ดูจำนวนล่าสุดใน `unit-summary.json`; ไม่เปลี่ยน frontend/backend/package จึงไม่รัน compatibility build หรือ browser UI รอบใหม่ในเฟสเตรียมนี้
- Cloud อ่านอย่างเดียว: 5 schedules/3 receipts เดิมและ profile สองบัญชีตรง baseline, gate 13, mutation receipts ทั้งสี่ยังไม่มี; conflict preflight ไม่พบปัญหา ข้อมูลสรุปจำนวน query ไม่ใช่ billed reads

ผลอยู่ใน `output/playwright/calendar-staging-mutation-cloud-qa/` โดย `cloud-preparation-report.json`, `cloud-audit-0.json`, `resolved-rules-syntax.json` และ `emulator-report.json` เป็นฉบับล่าสุด

ทดสอบพบปัญหาจริงก่อนผ่าน: run แรกค้างและพบ shared Auth Emulator default project ไม่ตรง namespace จึง cleanup เฉพาะ fixture ของตนและแยก runtime หลังแยกยังพบ exception จาก ternary ในตัวประเมิน Rules แก้เป็น boolean จากนั้นพบเพดาน 1000 expressions จึงเปลี่ยนการเทียบราย field ซ้ำเป็น full-map diff โดยไม่ผ่อน allowlist กรณีผิดและถูกทั้งหมดรันผ่านใหม่ เก็บรายงาน failure แยก ไม่อ้างว่า run เหล่านั้นผ่าน

Runtime แยกใช้ CLI/JDK/jar เดิม ไม่ติดตั้งเพิ่ม และไม่หยุด shared Emulator:

```text
node scripts/start-calendar-mutation-qa-emulator.mjs
node scripts/verify-calendar-mutation-cloud-qa.mjs
node --test scripts/calendar-mutation-cloud-plan.test.mjs
```

Auth `127.0.0.1:19199`, Firestore `127.0.0.1:18180` ใช้ project เดียวกัน ชุด SDK มี deadline และหยุด pending clients ก่อน cleanup ไม่ถือว่า timeout คือ write ถูกยกเลิก Cleanup เฉพาะ owned documents/accounts ด้วย preconditions ไม่ reset namespace และคืน append-only Rules หลังทดสอบ

## เงื่อนไขก่อนรอบ cloud

ขออนุมัติ manifest/hash, บัญชี Superadmin และการ deploy Rules ชั่วคราวก่อน จากนั้นตรวจ baseline/conflicts ใหม่ เปิด local runtime ด้วย `--writer --mutations` ทดสอบตามลำดับผ่าน Google session เก็บ audit ทุก checkpoint และตรวจการส่งซ้ำด้วย frozen payload/receipt หยุดทันทีเมื่อผลไม่ตรงหรือยังยืนยันไม่ได้

เมื่อจบหรือหยุด ให้ตรวจ hash ของ Rules ที่ deploy อยู่ซ้ำและคืน snapshot append-only เฉพาะเมื่อยังเป็น candidate นี้ การตรวจ hash แล้ว deploy ไม่ใช่ atomic compare-and-swap จึงต้องไม่มีการ deploy อื่นในช่วงคืน Rules การคืน Rules ไม่ rollback schedule/receipt ที่ commit แล้ว ปิด local mutation flag หลังจบ ไม่ push/deploy ตัวแอปหรือ production
