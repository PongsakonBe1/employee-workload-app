# เพิ่ม/นำเข้าตารางบน staging

10 พฤศจิกายน 2569 · Branch `codex/calendar-staging-import` จาก `dacc24b`

ผู้ใช้อนุมัติเฟสเพิ่ม/นำเข้าข้อมูลต่อจากการตรวจ cache/session ใช้ UI ที่ตรวจรับแล้วและ Firebase project แยก `labboy-workload-app-staging` ไม่เชื่อม writer เข้ากับ production

## ขอบเขตที่เปิด

| หน้า | การใช้งาน |
|---|---|
| `/dev/calendar-staging-write` | Google sign-in ของ staging; เพิ่มตารางเรียนและ DL, นำเข้า PDF และรายการ DL จากภาพที่ตรวจแล้ว |
| `/dev/calendar-write` | ทดสอบแบบเดียวกันกับ namespace `demo-calendar-writer` บน loopback Emulator เท่านั้น |
| `/dev/calendar-staging` และ `/dev/calendar-readonly` | โหมดอ่านเดิม ไม่มี create API เปิดให้ UI |

Writer เปิดเฉพาะบัญชี active Admin/Superadmin ที่ผู้ดูแลตั้ง `calendarWriter=true` เพิ่มรายการใหม่เท่านั้น ทุกบทบาทยังแก้ไข/ลบตารางและเขียน users จาก browser ไม่ได้ โหมด writer ไม่เปิด copy/Undo ฐานข้อมูล หรือกิจกรรมสอบรายวิชาที่ยังไม่มี document contract ส่วนโหมดตัวอย่างเดิมยังทำงานตามเดิม

ไฟล์ PDF/ภาพอ่านในอุปกรณ์ เมื่อยืนยันจึงส่งเฉพาะข้อมูลตารางไปยัง staging ผู้คุมต้องเลือกจาก directory ที่มีอยู่ ชื่อชั่วคราวไม่ใช้แทน ID เพิ่มตัวเลือกประเภทผู้เข้าสอบอย่างชัดเจน ไม่เดาว่าเป็นนักศึกษาหรือบุคลากร รองรับรอบเย็น 17:00–18:30 และจำนวน 75 คน **ต่อรอบ** ใช้ห้อง 406+407 เมื่อเกิน 40 คน

## วิธีบันทึกและเหตุผล

1. ตรวจรูปแบบและจำกัดไม่เกิน **100 รายการต่อชุด** รวมช่วงวันที่ไม่เกิน 400 วัน ใช้ contract เดิม ไม่เขียนทับเอกสารเก่า
2. สร้าง deterministic ID จากข้อมูลที่ normalize แล้ว และ operation ID จากชุดเอกสาร ชื่อผู้คุมไม่ถูกคัดลอกซ้ำลง schedule ใช้ directory ID เวลา retry ใช้รายการเดิมเพื่อหาผลเดิมได้
3. อ่าน profile และ revision gate ใน transaction จากนั้นอ่าน directory/tables จาก server ใหม่ ตรวจข้อมูลไม่ครบ ตารางชน และผู้คุมชนอีกครั้ง ไม่ใช้ cache ปฏิทินตัดสินผลบันทึก
4. เขียน schedules + receipt + revision ใหม่แบบ atomic หาก gate เปลี่ยนระหว่างตรวจ transaction ต้องตรวจใหม่ ผู้เขียนที่ใช้ protocol เดียวกันจึงไม่ผ่านการตรวจบน snapshot เก่าแล้วเขียนทับกัน
5. หลัง commit ล้าง cache และโหลดปฏิทินใหม่ ขณะ commit ปิดการกดซ้ำ/ปิด dialog พร้อมสถานะสำหรับผู้ใช้และ screen reader หากยังยืนยันผลไม่ได้ให้ลองใหม่ด้วยชุดเดิม ไม่รายงานว่าไม่เกิด write แน่นอน

ใช้ [Firestore transactions](https://firebase.google.com/docs/firestore/manage-data/transactions) และเงื่อนไข [rules/getAfter สำหรับ atomic operations](https://firebase.google.com/docs/firestore/security/rules-conditions) เป็นกลไกพื้นฐาน ส่วน global revision gate เป็น protocol ของ pilot นี้ เลือกเพราะผู้ใช้งานทีมเล็กและเขียนตารางเป็นครั้งคราว จึงแลกการ serialize งานเขียนกับความง่ายในการตรวจ concurrent requests

พบใน SIT ว่าบาง stale-revision commits ได้ `permission-denied` จาก rules ก่อน SDK retry แบบ `ABORTED` จึงเพิ่ม retry สูงสุด 3 รอบเฉพาะเมื่ออ่าน gate ผ่านสิทธิ์เดิมแล้วพบ revision เปลี่ยนจริง หาก gate ไม่เปลี่ยน หรือบัญชีไม่มีสิทธิ์ จะไม่ retry กลบปัญหา การป้องกันกดซ้ำใน client และ receipt ทำงานแยกกัน

## โครงสร้างข้อมูลเพิ่มเติม

- schedules ใหม่ใช้ `cal-<sha256>` ใน collections เดิม พร้อม `operationId/createdBy/createdAt/schemaVersion`
- `calendarWriteState/main`: revision และ operation ล่าสุด สร้างครั้งแรกโดยเครื่องมือ provisioning ที่อนุมัติแล้วเท่านั้น ไม่ reset gate ที่มีอยู่
- `calendarWriteOperations/op-<sha256>`: จำนวนสร้าง/ข้าม, ผู้สร้างตาม UID และ server timestamp; client แก้/ลบ receipt ไม่ได้
- profile มี capability `calendarWriter` แยกจาก role เครื่องมือ provisioning ตรวจ Google account ที่ยืนยันแล้วและอ่านเฉพาะ role/active ก่อนแก้ capability โดยใช้ field mask รักษาข้อมูลอื่นไว้
- client guard ยอมรับเพียง staging project ที่กำหนดหรือ `demo-calendar-writer`; ไม่ fallback ไป `.firebaserc` default

การอ่านก่อนเขียนจำกัดผล query 200+1 documents เช่นเดียวกับ reader ถ้าเกินหรือ adapter พบข้อมูลเดิมไม่ครบ จะปฏิเสธทั้งชุด จำนวนคำขออ่านปฏิทินที่ UI แสดงไม่รวม pre-write validation และไม่ใช่ billed document reads

## สถานะ cloud

- ตรวจจริงว่า `(default)` เป็น `STANDARD`, `FIRESTORE_NATIVE`, `asia-southeast1`
- deploy เฉพาะ Firestore rules/indexes จาก `firebase/calendar-writer/firebase.json` ไปยัง staging สำเร็จ ไม่มี Hosting/Functions/UI deployment
- เปิด capability ให้บัญชีผู้ทดสอบที่อนุมัติแล้วเพียงบัญชีเดียว สร้าง gate เริ่ม revision 0 โดยไม่คัดลอกข้อมูล/บัญชี production หรือ seed ผลทดสอบ 100 รายการขึ้น cloud
- ตรวจหลัง setup: writer enabled, gate ready และ `billingEnabled=false`
- anonymous cloud SDK อ่าน 4 คำขอ/เขียน 3 คำขอถูกปฏิเสธทั้งหมด หลัง deploy
- ผู้ใช้ทดลองเพิ่มตารางและยืนยันว่าแสดงในปฏิทินได้แล้ว ผ่าน UAT การเพิ่ม/แสดงผลเบื้องต้นตามบันทึกด้านล่าง ไม่อ้างว่า automation เข้าสู่บัญชี Google ของผู้ใช้

## ผลตรวจ

หลักฐานอยู่ใน `output/playwright/calendar-staging-import/`

- Unit **492/492 ผ่าน** รวม create plan 10 ข้อ: hash/idempotency, malformed input, duplicates, directory IDs, exam type, allocation, invalid sources/dates/text, conflicts, term/time boundaries, existing IDs และข้อมูลเดิมไม่ครบ
- Real SDK/Rules/SIT บน `demo-calendar-writer`: **11 กลุ่มผ่าน / 14 forbidden writes ถูกปฏิเสธ** รวม concurrent different/same batches, replay, double click, atomic failure, Staff/pending/inactive/Admin ไม่มี capability, schema/ownership, offline ไม่ queue และปิด session ระหว่าง preflight
- ทดสอบ batch **100 รายการ** ผ่านจริงบน Emulator ไม่ใช่การยืนยัน batch ใหญ่บนบริการ cloud
- E2E writer **1440 light / 390 dark ผ่าน**: commit ระหว่าง dialog busy/inert, Escape/close ถูกปิดระหว่างรอ, manual create คงอยู่หลัง full reload/login ใหม่, PDF สังเคราะห์ 2 ตาราง, manual evening DL, DL review flow และ Staff ไม่มีสิทธิ์
- DL OCR engine ไม่ได้เปลี่ยน ใน writer E2E ใช้เพิ่มรายการเองในหน้าตรวจ DL; ไม่อ้างว่ารอบนี้ทดสอบ OCR รูปใหม่ผ่านครบ
- UI/calendar regression เดิม **11 กลุ่มผ่าน**, SDK/Rules read-only namespace เดิม **3 กลุ่ม/15 denied writes ผ่าน**
- targeted ESLint, scripts/JSON syntax, isolated production compatibility export และ diff ผ่าน routes ทดลองไม่ render ใน production export
- ใช้ Babel ที่ติดตั้งอยู่จัดรูปแบบไฟล์ใหม่ 8 ไฟล์และตรวจ AST ไม่เปลี่ยน ไม่มีการติดตั้ง dependency เพิ่ม

ตรวจพบและแก้ configuration ก่อนเปิดทดสอบ: CLI ไม่ยอมอ้าง index file นอก config directory จึงเก็บ index manifest ของ writer ใน directory เดียวกัน (ค่าเหมือน staging เดิม) และอ่าน role/active ผ่าน field masks ทีละ field เพื่อหลีกเลี่ยงการ serialize array ของ CLI API client ผิดรูปแบบ ไม่มีการอ่าน debug logs/credential files เพื่อแก้ปัญหา

## UAT การเพิ่มบน cloud — 10 พฤศจิกายน 2569

ผู้ใช้ยืนยันว่า **“เพิ่มแบบที่คุณบอกแล้ว มันแสดงในตารางแล้ว ทำได้แล้ว”** จึงบันทึกว่าการเพิ่มตารางและแสดงผลบน staging ด้วยบัญชีผู้ทดสอบผ่าน UAT เบื้องต้น

ตรวจเฉพาะ writer capability และ revision หลังผู้ใช้แจ้ง พบ writer enabled, gate ready และ revision **1** จากค่าเริ่มต้น 0 สอดคล้องกับ transaction ที่บันทึกแล้ว ไม่เปิดอ่านเนื้อหาตาราง อีเมล UID หรือ token และไม่เปลี่ยน cloud data ในขั้นบันทึกผลนี้

ผู้ใช้ยังไม่ได้ระบุแยกว่า reload เต็มหน้า/เข้าสู่ระบบใหม่แล้วรายการยังอยู่ จึงไม่ถือว่ายืนยันกรณีนั้นหรือการนำเข้า PDF/DL บน cloud ครบแล้ว ขั้นต่อไปคือ UAT นำเข้าไฟล์และตรวจข้อมูลหลังโหลดหน้าใหม่ใน staging ก่อนเลื่อนเฟส

ขั้นนี้แก้เฉพาะเอกสาร/รายงาน ตรวจ JSON syntax และ diff โดยตรง ไม่รัน Unit/build ซ้ำเพราะ runtime ไม่เปลี่ยน

## Rules เป็น prototype และข้อจำกัด

I've set up prototype Security Rules to keep the data in Firestore safe. They are designed to be secure for this restricted staging pilot because only explicitly enabled administrators can create schedules through the revision protocol, while profile writes and schedule updates/deletes are denied. However, you should review and verify them before broadly sharing your app. If you'd like, I can help you harden these rules.

**Rules ไม่ได้ตรวจ aggregate conflicts ทั้งฐานข้อมูลแทน server**: รูปแบบข้อมูล สิทธิ์ ผู้สร้าง และการขยับ gate ตรวจที่ rules; ความถูกต้องของวันตามปฏิทินจริง, directory membership, จำนวนเอกสารที่ตรงกับ receipt และการไม่ชนกัน ตรวจโดย writer protocol ผู้ถือสิทธิ์ writer ที่สร้าง custom client สามารถข้าม business validation บางส่วนได้ จึงจำกัด pilot เฉพาะผู้ทดสอบที่อนุมัติ ไม่ถือว่าพร้อม production หรือเปิด writer ให้ทีมทั้งหมด

Revision protocol ใช้ได้เมื่อทุก sanctioned writer อัปเดต gate เดียวกัน งาน Admin/seed ที่ bypass rules ต้องไม่ทำระหว่าง pilot โดยไม่ประเมินผล ไม่ใช้ legacy production writer คู่กับ protocol นี้ ก่อนเปิดหลายผู้ใช้/production ต้องประเมิน trusted backend/การบังคับ business invariants, security review, cloud role/transaction matrix, quotas และอุปกรณ์จริงเพิ่มเติม

ยังไม่ยืนยัน Safari/iPhone/Android ทุกเครื่อง, cloud batch 100/concurrency/offline edge cases, หรือ production rules/data จากผล Emulator และ browser emulation นี้

## ตรวจงานและย้อนกลับ

เปิด [writer staging](https://northwest-revised-domains-varies.trycloudflare.com/dev/calendar-staging-write) → Google บัญชีเดิม → เพิ่มรายการสังเคราะห์หนึ่งรายการ → โหลดใหม่ตรวจว่าอยู่ครบ → ลองเปิด PDF แล้วตรวจรายการก่อนยืนยัน การกดนำเข้าหรือบันทึกในหน้านี้เขียน staging จริง

หากต้องปิด pilot ใช้เครื่องมือ `disableWriter` แล้ว deploy rules read-only เดิมกลับเฉพาะ staging ตามขอบเขต rollback ที่ตรวจทาน ไม่ลบ schedules/receipts หรือ reset gate อัตโนมัติ หน้าอ่านเดิมยังเปิดใช้ได้ การ rollback โค้ดไม่ย้อนข้อมูลที่ commit ไปแล้ว

```powershell
# Use the authorized operator account; never pass tokens.
$operatorAccount = 'authorized-account@example.invalid'
node scripts/calendar-staging-admin.mjs $operatorAccount writerStatus
# Rollback commands only when closing or rolling back the approved pilot:
node scripts/calendar-staging-admin.mjs $operatorAccount disableWriter
node scripts/calendar-staging-cli.mjs $operatorAccount deployFirestore
```

เริ่ม local verification ใหม่ได้ด้วย `node scripts/setup-calendar-writer-emulator.mjs` ซึ่ง reset เฉพาะ namespace `demo-calendar-writer` บน loopback และโหลด rules prototype ไม่แตะ read-only namespace หรือ staging cloud ห้ามใช้ขั้น reset นี้เป็นแนวทางลบข้อมูล cloud
