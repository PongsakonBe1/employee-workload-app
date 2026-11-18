# เตรียม post-write audit และ direct SDK denial

วันที่ 18 พฤศจิกายน 2569 · branch `codex/calendar-trusted-writer-audit-prep` จาก `90a5b89`

**เครื่องมือและการทดสอบในเครื่องพร้อมตรวจรับ ยังไม่ deploy Rules หรือส่ง cloud probe/write** รอบนี้ไม่อ่าน baseline cloud เพิ่ม ไม่เปิด writer ไม่เปลี่ยน IAM/profile/key/billing และไม่ push/deploy แอป

## สิ่งที่ทำและเหตุผล

1. เพิ่ม read-only auditor สำหรับ frozen checkpoint 0–5 เพื่อแยก commit, replay, rejection และ partial/unexpected writes ด้วย business fields, receipt และ gate จริง แทนการดูเฉพาะข้อความสำเร็จบน UI
2. เพิ่ม development QA page/SDK adapter ที่ตรึง project, origin, actor, hashes และ manual target รองรับ reader checks กับ atomic SDK denial เพียงหนึ่ง batch โดยปิดคำสั่งเป็นค่าเริ่มต้น
3. ใช้ durable reservation, fresh proof, session/role checks และสถานะ uncertain เพื่อป้องกันส่งซ้ำหรืออ้างว่าคำขอถูกยกเลิกทั้งที่ยังไม่ยืนยันผล ไม่มี fallback ไป HTTP writer และไม่มีคำสั่งลบ cloud
4. ตรวจ Unit, lint, compatibility build, browser preview และ Rules positive/negative controls ใน isolated Emulator พร้อม cleanup เฉพาะ fixtures ของตัวเอง ก่อนจัด [cloud verification manifest](cloud-verification.review.json) ให้ผู้ใช้ตรวจรับ

## Read-only auditor

`scripts/calendar-trusted-audit-plan.mjs` ตรวจ:

- Gate ต้องเป็น `17 + completed` และชี้ operation/actor ของ checkpoint ล่าสุด ไม่อนุญาตข้ามหรือย้อน checkpoint
- Schedules ต้องมี business fields/metadata ตาม frozen plan เท่านั้น; manual edit คง creation metadata และ soft-cancel คงเอกสารที่ isActive=false/version=2
- Receipts ต้องตรง action/count/schema/target/version และ metadata; receipt ของอนาคตหรือ rejection ต้องยังไม่มี
- Replay/rejection ที่ checkpoint เดิมต้องไม่เปลี่ยน gate, receipt, schedule หรือ timestamps; records เดิมที่ไม่ใช่เป้าหมาย mutation ต้องคง digest เดิม
- Profiles ของ Staff/Superadmin ต้องคง fields และ updateTime; directory active เดิม, classroom active เดิม และ DL ในช่วง 7–11 มิ.ย. 2570 ต้องคงชุด IDs/updateTime หลังแยก targets ที่ QA เป็นเจ้าของ

REQUEST_TIME ของ server transform มีความละเอียดระดับ millisecond และใช้ timestamp เดียวกันใน transaction ส่วน document metadata ใช้รูปแบบ fractional digits ได้หลายระดับ จึงตรวจ timestamp ภายใน transaction ผ่าน receipt และตรวจความคงเดิมของ metadata แยกกัน **ไม่บังคับให้ `serverTimestamp` เท่ากับ `createTime/updateTime` ทุกหลัก** ตาม [Write/ServerValue](https://firebase.google.com/docs/firestore/reference/rest/v1/Write#ServerValue) และ [Document metadata](https://firebase.google.com/docs/firestore/reference/rest/v1/projects.databases.documents#Document) มี regression สำหรับความละเอียดต่างกันแล้ว

`scripts/audit-calendar-trusted-writer.mjs` ใช้ CLI session เดิม ไม่อ่าน key/token files มี read API allowlist เดิมและ lock ป้องกัน audit ซ้อน จองคำขอก่อนส่ง ทุก attempt จำกัด 7 API read requests: Rules release/source 2, owned records+gate 1, actor profile projections 1 และ protected-version queries 3 แต่ละ query จำกัด 201 เพื่อปฏิเสธเมื่อเกิน 200 ไม่แสดง UID หรือ raw provider errors ในรายงาน

กำหนด CLI request retries=0, timeout 20 วินาที และปิด body/response-body/query-parameter debug logs ไว้โดยตรง รอบก่อน cutover มีเพดานหนึ่ง attempt และ verification หลัง cutover สอง attempts; `--trusted-window` เป็นโหมดแยกสำหรับงานที่ต้องอนุมัติภายหลัง รวมทั้งหน้าต่างไม่เกิน 13 audits/91 API reads ไม่ใช่จำนวน token-refresh calls หรือ billed reads

```powershell
# ต้องได้รับอนุมัติสำหรับ cloud read/cutover window ก่อน คำสั่งนี้ไม่ deploy หรือเขียน Firestore
node scripts/audit-calendar-trusted-writer.mjs <approved-operator> 0 --before-cutover

# หลัง deploy candidate ที่อนุมัติ: ก่อน SDK probe และหลัง SDK probe อย่างละครั้ง
node scripts/audit-calendar-trusted-writer.mjs <approved-operator> 0

# ใช้เฉพาะเมื่ออนุมัติ trusted write window แยกแล้ว
node scripts/audit-calendar-trusted-writer.mjs <approved-operator> <completed-0-to-5> --trusted-window
```

Read-only gate/receipt audits ใช้ privileged CLI จึง **ไม่ใช่หลักฐานว่า Rules อนุญาตหรือปฏิเสธ SDK** Auditor ไม่รับ commit/delete/deploy action รายงาน `cloudRecordsWritten=0` หมายถึงตัว auditor ไม่เขียน ไม่ใช่ว่า QA ก่อนหน้าสร้างข้อมูลไปแล้วเป็นศูนย์

ชุด protected versions เป็น bounded active-query scope ไม่ใช่การสแกนทุก document/collection ทั้ง project หากมี privileged writer นอก protocol หรือข้อมูลนอก query scope ยังต้องตรวจตาม release DATA/AUTH gates

## Direct SDK denial QA

หน้า `/dev/calendar-trusted-cutover` มี server guard: development และ `CALENDAR_TRUSTED_DENIAL_UI=1` เท่านั้น ไม่อยู่ในเมนู product และ production export ไม่ render แม้ flag=1

```powershell
# Preview-only origin: Firebase actions ถูกปิดโดย SDK guard
node scripts/dev-calendar-cutover-qa.mjs
# http://127.0.0.1:4315/dev/calendar-trusted-cutover

# เฉพาะหลังอนุมัติ staging verification; ไม่เปิด API writer/probe
# ต้องหยุด runtime เดิมที่ใช้พอร์ต 4311 ก่อน โดยรักษางาน/session ที่เกี่ยวข้อง
node scripts/dev-calendar-cutover-qa.mjs --staging-session
```

ใช้ Google staging session แยกแบบ in-memory และ public staging config ที่มีอยู่ ไม่มี production fallback ไม่มี token export และไม่เปลี่ยน Google provider/domain/permissions

- โหลด frozen operations และ fresh proof JSON ใน browser memory ไม่ส่งไฟล์ทั้งชุดขึ้น app server ไม่แสดง UID จริง
- Proof ต้องผูก snapshot/frozen/candidate/source hashes, checkpoint=0, gate=17 และมีอายุไม่เกิน 120 วินาที พร้อม approvals แบบ boolean แยก reader/SDK probe
- ตัวสร้าง proof อ่านเฉพาะ audit checkpoint 0 หลัง candidate deploy และตรวจ integrity ของ audit/report ก่อน ค่าเริ่มต้น approvals=false; flags อนุมัติใช้ได้หลังผู้ใช้อนุมัติ action นั้นจริงเท่านั้น เป็น local operator packet ไม่ใช่ลายเซ็นรับรองจาก Firebase
- จอง attempt ด้วย IndexedDB `add` ก่อน RPC แรก ผูก frozen hash/action key; duplicate, blocked storage หรือ reload ไม่เปิด slot ใหม่ ไม่มีปุ่ม reset การควบคุมนี้เป็น QA workflow ไม่ใช่ authorization ของ server และไม่ให้ย้าย browser/ล้าง storage เพื่อส่งซ้ำ
- ก่อน batch ตรวจ Superadmin profile สด, health staging writer=false/probe=false, manual target ยังไม่มี และ gate/receipt SDK reads ต้อง permission-denied ก่อน
- Batch มีเพียง fixed manual schedule, fixed receipt และ gate increment +1 แบบ atomic ไม่ใช้ physical delete หรือ transaction/write fallback
- ผล SDK permission-denied ยังต้อง audit checkpoint 0 ซ้ำ ส่วน unexpected success หรือ network/session ambiguity ต้องหยุด รักษาหลักฐานและไม่ส่งซ้ำ

```powershell
# หลัง fresh candidate audit 0; ไม่มี flags จะสร้าง packet ที่ยังไม่อนุมัติ
node scripts/prepare-calendar-cutover-proof.mjs

# ตัวอย่างเฉพาะหลังผู้ใช้อนุมัติทั้งสอง actions แล้ว; ไม่ใช่คำสั่งให้รันในเฟสเตรียมนี้
node scripts/prepare-calendar-cutover-proof.mjs --approve-readers --approve-sdk-denial
```

Fresh proof ที่หมดอายุหรือ attempt ที่ใช้แล้วให้หยุด review ใหม่ ไม่สร้างโอกาสส่งเพิ่มเอง SDK reader ใช้ monthly contract เดิม จึงอ่าน DL **ทั้งเดือนมิถุนายน 2570** ส่วน conflict baseline/protected DL audit จำกัด 7–11 มิ.ย. ต้องแยก scope นี้ในคำอนุมัติ ไม่อ้างว่า SDK อ่านเฉพาะห้าวัน

## ผลทดสอบจริง

| การตรวจ | ผล |
|---|---|
| Full Vitest | **735 tests / 48 files ผ่าน** รวม controller/adapter ใหม่ 16 กรณี |
| Node tools unit | **15 tests ผ่าน**: baseline guards 7 และ auditor 8 รวม precision regression |
| Targeted ESLint / Node syntax / diff | ผ่าน |
| Compatibility build | ผ่านหลังเพิ่ม QA page/CSS; production export แยก `.ui-build-check`, ไม่ render development workspace/QA แม้ flag=1; production `out` ไม่เปลี่ยน |
| Emulator SIT | `demo-calendar-cutover` Standard, loopback ports แยก; batch manual/receipt/gate ที่ตรึงไว้ผ่าน append-only Rules เดิม และ candidate ปฏิเสธ batch เดียวกันแบบ atomic; Staff/Superadmin reader queries ผ่านและ SDK gate/receipt reads ถูกปฏิเสธ |
| Owned cleanup | เก็บ/ล้างเฉพาะ fixtures และ Auth Emulator accounts ของรอบนี้ พร้อม document updateTime preconditions ไม่มี namespace reset; หยุด preview/Emulator แล้วและตรวจพอร์ตปิด |
| Browser preview | Edge desktop และ 390×844: default/หลัง reload ปุ่ม login/reader/probe ปิด; checkbox อย่างเดียวไม่เปิดคำสั่ง; document width 380 ≤ viewport 390; คืน viewport เดิมแล้ว |

Unit รอบแรกติด sandbox loopback `EACCES` 10 HTTP tests เดิม จึงเก็บผลเดิมไว้และรัน suite เดิมนอกข้อจำกัดจนผ่านทั้งหมด ไม่แก้/ข้าม tests ให้ผ่าน Node warning เรื่อง module type และ Browserslist snapshot เก่ายังคงอยู่ ไม่ติดตั้ง/อัปเดต dependency เพื่อกลบ warning

Browser รอบนี้ไม่ login ไม่โหลด UID-bound files และไม่ส่ง cloud requests ของ QA; เป็นการตรวจหน้าปิดและ layout ไม่ใช่ real cloud SDK denial หรือ physical iOS/Android UAT การจำลอง durable reservation อยู่ใน unit tests ยังไม่อ้างว่าทดสอบ recovery ของ browser/storage ทุกชนิด

หลักฐานอยู่ใน `output/playwright/calendar-trusted-writer-audit-prep/`: [summary](../../../output/playwright/calendar-trusted-writer-audit-prep/verification-summary.json), [Emulator SIT](../../../output/playwright/calendar-trusted-writer-audit-prep/emulator-denial-report.json), [compatibility build](../../../output/playwright/calendar-trusted-writer-audit-prep/build-report.json), [desktop preview](../../../output/playwright/calendar-trusted-writer-audit-prep/qa-preview-disabled.jpg) และ [mobile preview](../../../output/playwright/calendar-trusted-writer-audit-prep/qa-preview-mobile-disabled.jpg)

## รอบ cloud ที่เสนอถัดไปและต้องอนุมัติแยก

1. **ทำอะไร:** revalidate source/Free/flags และ baseline หนึ่งครั้ง; deploy candidate Rules SHA `4762054e74b3723bc4345f351b01bb43ee450ae8c7e6a399c4fd6473b717a1c7` เฉพาะ `labboy-workload-app-staging` / `(default)`; candidate audit 0, reader ของสองบทบาท, Superadmin SDK batch หนึ่งครั้งที่คาดว่าต้อง deny, แล้ว audit 0 อีกครั้ง คง API writer/probe=0/0 ตลอด ไม่ส่ง 13 trusted API POSTs
2. **ทำไม:** ยืนยันว่า reader ยังใช้ได้และ legacy SDK writer ถูกปิดก่อนเปิด trusted service เพื่อไม่ให้ข้าม business invariants
3. **ความเสี่ยง/คืนค่า:** หาก Rules ผิด batch อาจสร้าง manual fixture+receipt และ gate +1 จริง ต้องหยุดทันทีและคงข้อมูลให้ตรวจ ไม่ลบ/ย้อนข้อมูลอัตโนมัติ คง server/UI writer ปิดและไม่เปิด append-only SDK writers คืนเป็น rollback ถ้า source/hash/gate/profile ไม่ตรงให้หยุดก่อน deploy
4. **ตรวจอย่างไร:** ใช้ manifest ที่นับคำขอแยกชัดเจน: pre-audit 1 + candidate audits 2 รวมไม่เกิน 21 CLI API read requests, health ไม่เกิน 4, reader คนละหนึ่งครั้ง, SDK logical reads ไม่เกิน 14 และ atomic SDK commit attempt 1; expected committed writes=0 ตัวเลขเหล่านี้ไม่ใช่ billed reads

นี่เป็น action ที่เปลี่ยน Rules และอาจเขียน staging หาก policy ผิด จึงต้องอนุมัติ exact resource/action ตาม `AGENTS.md` ก่อนทำ ตาม [manifest](cloud-verification.review.json) approvals ยัง false ทั้งหมด และ trusted writer cloud window ยังต้องอนุมัติแยกหลัง verification ผ่าน ไม่มีการเปลี่ยน billing/card/plan, IAM/profile/key, production หรือ application push/deploy ในข้อเสนอนี้

เตรียมเฉพาะ local config `.tools/calendar-staging/trusted-writer-audit-prep/firebase.cutover.review.json` และสำเนา `candidate.firestore.rules` hash ตรงต้นฉบับแล้ว ยังไม่ได้เรียก Firebase deploy สำเนาอยู่ใน ignored directory และต้องตรวจ hash ใหม่ก่อนใช้ โดยใช้ explicit project/account และ deploy เฉพาะ `firestore:rules` ไม่รวม indexes/Auth/Hosting
