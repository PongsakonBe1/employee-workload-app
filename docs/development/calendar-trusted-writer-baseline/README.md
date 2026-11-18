# Baseline สดและ frozen payload สำหรับ trusted writer

วันที่ 18 พฤศจิกายน 2569 · branch `codex/calendar-trusted-writer-baseline` จาก `77aa43f`

**อ่าน baseline และตรึง payload แล้ว ยังไม่อนุมัติหรือดำเนินการ Rules cutover / เปิด writer / เขียน cloud** ผู้ใช้ให้ดำเนินเฟสอ่าน baseline ต่อหลังตรวจเฟสเตรียม รายงานนี้แยกการอนุมัติอ่านออกจากการอนุมัติเปลี่ยน cloud อย่างชัดเจน

## ขอบเขตที่ดำเนินการ

1. ตรวจ Render source/Free และ GET health จาก service staging เดิมก่อนใช้ session CLI ที่มีอยู่
2. อ่าน database edition, deployed Rules release/source, lookup ผู้ทดสอบสอง aliases, profiles/gate และ bounded conflict queries เท่านั้น เพื่อผูก IDs จริงและตรวจว่าชุด QA ว่าง
3. เตรียม payload ด้วย planner เดิม เก็บ UID-bound inputs และ Rules snapshot เฉพาะ ignored `.tools` ไม่ commit ชื่อ/อีเมล/UID จริง ไม่เปิด credential material
4. ตรวจ targets/receipts ว่ายังไม่มีและ gate/profile ไม่เปลี่ยนระหว่าง capture รัน unit guards, syntax, integrity checks และ local commit โดยไม่ push/deploy

## ผลตรวจจริง

เก็บเมื่อ **18 พ.ย. 2569 เวลา 19:41 น. ไทย** ตาม [baseline report](../../../output/playwright/calendar-trusted-writer-baseline/baseline-report.json)

| รายการ | ผล |
|---|---|
| Firebase target | `labboy-workload-app-staging` / `(default)` / Standard |
| Render source / plan | `2aa1bd27f1795890871297d1ffdf0d1d6acdd2e5` / Free; Live `dep-dbumusijnfac73doa1f0` ตรวจจาก Dashboard แบบอ่านอย่างเดียว |
| Health | staging, protocol 1, writes=false, connectivity=false, emulator=false |
| Gate | revision **17**, คงเดิมระหว่าง capture |
| Directory query | active staff/admin/superadmin **5 ราย**; ไม่ใช่จำนวนบัญชีทั้งหมด |
| Classroom query | active **32 เอกสาร** ครอบคลุมทุกช่วงภาคเรียนที่ query กลับมาและตรวจ explicit term bounds ด้วย planner |
| DL query | active **0 เอกสารเฉพาะ 7–11 มิ.ย. 2570** ไม่ได้หมายความว่า staging ไม่มี DL ในเดือนอื่น |
| Actor profiles | Staff active / calendarWriter=false; Superadmin active / calendarWriter=true |
| Conflict preflight | ชุด manual/PDF/DL/edit ที่เสนอไม่ชน baseline ที่อ่านได้ |
| Prospective targets | schedule targets 8 และ operation receipts 8 ยังไม่มี รวมรายการที่ต้องถูกปฏิเสธด้วย |
| Read scope | API อ่าน 10 requests + health GET 1 ครั้ง ไม่ใช่จำนวน billed reads; ไม่รวม token refresh ภายใน CLI หรือ SDK reader ของ browser |
| Cloud changes | ไม่มี data writes, Rules/profile/IAM/key/billing/production changes |

Baseline ไม่ใช่ transaction snapshot เดียวทั้งระบบ การตรวจ gate/profile updateTime ซ้ำช่วยตรวจ drift ใน protocol เดิม แต่ไม่ได้พิสูจน์ว่าไม่มี privileged writer อื่นแก้ schedule โดยไม่เพิ่ม gate ต้องตรวจซ้ำทันทีก่อน cutover/เริ่มส่งจริง ไม่ใช้ snapshot นี้เป็นหลักฐานถาวร

## Rules ที่พบและผลกระทบของ cutover

ไฟล์ที่ deploy ปัจจุบันเท่ากับ `firebase/calendar-writer/firestore.rules` แบบ byte-for-byte เป็น append-only pilot ที่ยังยอมให้ writer สร้าง schedule/receipt และขยับ gate ตาม protocol เดิม การปิด server flag จึงไม่ได้ปิด SDK writers ของ project

- Raw deployed SHA-256: `360f18769fc93b3642af26b5aae5fbdada29780116503e36b145fe8a98548195`
- Hash ตามวิธี normalize CRLF และ trimEnd ของเครื่องมือ QA เดิม: `6cd83e8b8a287f301725b26adbb36c987f789351a8aea1475a6150d40bae458f` เป็น source เดียวกัน ไม่ใช่ Rules อีก release
- Candidate raw SHA-256: `4762054e74b3723bc4345f351b01bb43ee450ae8c7e6a399c4fd6473b717a1c7` จาก `deploy/calendar-staging/firestore.review.rules` ซึ่งยังไม่ได้ deploy

| Path / การทำงาน | ก่อน cutover | Candidate |
|---|---|---|
| users | active roles อ่าน directory ได้; client writes ปิด | คง active role reader, ตรวจ active เป็น boolean; client writes ปิด |
| classroomSchedules / dlExamSchedules | reader อ่านได้; capability writer สร้างตาม pilot ได้; update/delete ปิด | reader อ่านได้; client writes ทุกชนิดปิด |
| calendarWriteState/main | writer get/update ตาม protocol ได้ | client get/update/list/create/delete ปิด |
| calendarWriteOperations | writer get/create receipt ได้ | client read/write ปิด |
| Path อื่น | default deny | default deny |
| Server Admin SDK | ใช้ IAM และ service validation | ไม่ถูกบังคับด้วย Firestore Rules; business invariants ต้องผ่าน trusted service |

นี่เป็นการเทียบ source/contract ไม่ใช่ผลทดสอบ Rules ที่ deploy บน cloud หลัง cutover ยังต้องตรวจ reader queries และ direct-client-write denial ตามชุดที่ได้รับอนุมัติ ผล compile/SDK denial เดิมใน Emulator อ้างอิงได้แต่ไม่แทนการตรวจ cloud

Candidate เป็น calendar-only prototype ของ staging ไม่ใช่ production Rules ห้าม deploy ทับทั้งไฟล์บน production และไม่คืน append-only client writers เป็น rollback

## Frozen review artifacts

[ชุดตรวจรับที่ไม่มี UID จริง](cutover-and-write.review.json) มี operation IDs, input hashes, aliases และ previews ที่ไม่ใช่ payload สำหรับส่งจริง ส่วน payload จริงเก็บเฉพาะ:

- `.tools/calendar-staging/trusted-writer-baseline/prepared.json`
- `.tools/calendar-staging/trusted-writer-baseline/reviewed-operations.json`
- `.tools/calendar-staging/trusted-writer-baseline/baseline.rules`

Frozen payload hash: `6c6b85f57289cdc2be618d690014fa073ee0fc5eb87e219be7473f6b01758f31`

ใช้ `reviewValueHash` ซึ่ง sort object keys ก่อน SHA-256 ของ JSON ไม่ใช่ hash ของ raw file bytes รายงานตรวจ integrity ของทั้ง private snapshot และ frozen inputs แล้ว หาก UID, ข้อมูลเดิม, Rules หรือ payload เปลี่ยน ให้หยุด review ใหม่ ไม่ remap หรือขยับวันเงียบ ๆ

| Operation สำเร็จที่เสนอ | เอกสารใหม่ | Gate หลัง commit |
|---|---:|---:|
| Manual 7 มิ.ย. ห้อง 401 09:00–10:00 พร้อม concurrent replay ชุดเดียวกัน | 1 | 18 |
| PDF review 8 มิ.ย. ห้อง 401/402 11:00–12:00 | 2 | 19 |
| DL review 9–10 มิ.ย. 17:00–18:30 รอบละ 75 คน ใช้ 406+407 | 2 | 20 |
| Edit manual เป็น 10:00–11:00 | 0 | 21 |
| Soft-cancel manual โดยเก็บเอกสาร | 0 | 22 |

คง 13 trusted API POSTs ตามข้อเสนอเดิม รวม replay 5 และ rejection 3; ไม่มีการส่งในเฟสนี้ กรณี atomic room conflict / combined DL conflict คาด HTTP 400 ส่วน stale version คาด 409 ไม่เอา stale input ไปแทน frozen replay

## ขั้นถัดไปที่เสนอให้ตรวจรับ

1. เตรียมและทดสอบช่องทาง **post-write audit แบบอ่านอย่างเดียว** โดยใช้ CLI API guard เดิมกับ frozen references และเปรียบเทียบ gate/receipt/schedules ไม่สร้าง privileged endpoint หรือ key ใหม่ เครื่องมือ capture รอบนี้ตรวจ baseline ได้แล้ว แต่ยังไม่ใช่ post-write audit implementation
2. ระบุและตรวจรับชุด reader/direct-write-denial verification หลัง deploy Rules ให้ชัด เพราะ 13 POSTs นี้นับเฉพาะ trusted API ไม่ใช่อนุมัติ SDK write probes เพิ่มโดยปริยาย ไม่มี physical-delete probe บน cloud
3. ขออนุมัติ deploy **candidate hash ข้างต้นเฉพาะ staging** โดย writer/probe ยังคง 0/0 ตรวจ runtime/source/baseline ซ้ำก่อน apply หาก hash/revision/profile ไม่ตรงให้หยุด ไม่ทำให้เงื่อนไขผ่านด้วยการแก้ข้อมูล
4. หลังตรวจ cutover ผ่านและได้อนุมัติ frozen manifest กับช่วงเปิด writer แล้ว จึงเปิด write flags สำหรับ 5 operations ตามเพดาน จบ/ผิดพลาดให้ปิด writer และยืนยัน health คง deny-client-write Rules และข้อมูลที่ commit

การอนุมัติเฟสอ่านครั้งนี้ไม่รวม Rules deployment, SDK probes ที่มีผลเขียนหากผิดพลาด, writer enablement หรือ API cloud writes ต้องแสดงรายการเหล่านี้ให้ผู้ใช้อนุมัติเฉพาะก่อนทำ ตามขอบเขต SDLC ใน `AGENTS.md`

## การตรวจในเครื่อง

- `node --test scripts/calendar-trusted-cloud-plan.test.mjs`: **7 tests ผ่าน** ครอบคลุม read API allowlist, production/write rejection, directory/role/capability, deterministic freeze, partial/oversized/conflicting baseline และ stale vs replay
- `node --check` ของ capture/helper/test scripts และ `git diff --check`
- Hash integrity ของ proposal เดิม, candidate Rules, private snapshot และ frozen inputs
- ไม่มี application runtime source change ไม่รัน full Vitest/build ใหม่ ไม่อ้างว่าเฟสนี้เป็น Emulator SIT, trusted writer cloud QA หรือ production readiness
