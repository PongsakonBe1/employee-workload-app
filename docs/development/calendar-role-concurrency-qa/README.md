# QA สิทธิ์และการเพิ่มตารางพร้อมกัน

10 พฤศจิกายน 2569 · Branch `codex/calendar-role-concurrency-qa`

ผลล่าสุด: [Cloud QA](cloud-uat-results.md) ผ่าน concurrent writes 3 กรณีด้วย Google ผู้ทดสอบเดิมใน Edge สองแท็บ เพิ่มจริง 4 ตาราง / 4 receipts / revision 5 → 9 ตรวจรายละเอียดและโหลดกลับจาก server แล้ว เหลือการเลือก PDF สังเคราะห์เพื่อทดสอบ negative import review และยังไม่ถือว่าผ่าน cloud role matrix ทั้งชุด

## ขอบเขต

ตรวจ calendar pilot ผ่าน Web SDK, Auth Emulator และ Firestore Emulator จริงบน `demo-calendar-writer` รวม UI ที่ `/dev/calendar-write` ไม่มีการเปลี่ยน application runtime, rules, providers, สิทธิ์บัญชี cloud หรือ production ไม่ reset namespace หรือรัน seed เดิมทับข้อมูล

## ผล SDK/SIT

`verify-calendar-role-concurrency.mjs` ผ่าน **7 กลุ่ม / 9 สถานะบัญชี** และปฏิเสธ **16 SDK operations** ตามคาด จำนวนนี้รวมคำขออ่านที่ไม่มีสิทธิ์ ไม่ใช่ทั้งหมดเป็น transaction

| สถานะ | อ่านตาราง/directory | เพิ่มตาราง |
|---|---|---|
| Admin active + writer capability | ได้ | ได้ |
| Superadmin active + writer capability | ได้ | ได้ |
| Staff active | ได้ | ไม่ได้ |
| Admin active ไม่มี capability | ได้ | ไม่ได้ |
| Superadmin active ไม่มี capability | ได้ | ไม่ได้ |
| Staff ที่มี writer flag ผิดบทบาท | ได้ | ไม่ได้ |
| Pending / inactive / ไม่เข้าสู่ระบบ | ไม่ได้ | ไม่ได้ |

กรณีไม่อนุญาตตรวจทั้ง writer API และ batch ที่ประกอบ metadata/receipt/gate แล้วส่งตรงผ่าน SDK เพื่อให้ rules เป็นผู้ปฏิเสธ ตรวจว่า revision, schedules และ receipt ไม่เปลี่ยนจากคำขอที่ถูกปฏิเสธ

กรณีเพิ่มพร้อมกัน:

- Admin กับ Superadmin จองห้องเดียวกันและเวลาซ้อน: commit ได้หนึ่งรายการ อีกฝ่ายได้รับข้อความ conflict หลังตรวจข้อมูลใหม่ มีหนึ่ง schedule และหนึ่ง receipt
- สอง session แยกของ Admin เดียวกันส่งชุดเดียวกัน: เพิ่มหนึ่งครั้ง อีก session ข้ามรายการเดิม การ replay โดย Superadmin ไม่เลื่อน revision เพิ่ม
- คนละห้องในเวลาเดียวกันเพิ่มได้ทั้งคู่ เช่นเดียวกับเวลาแตะขอบสิ้นสุดของอีกรายการที่ใช้ห้องเดียวกัน
- ชุดที่มีทั้งรายการดีและรายการชน: ไม่บันทึกบางส่วน ไม่เพิ่ม receipt หรือ revision
- Admin/Superadmin ที่เปิด writer ยัง update/delete ตาราง หรือเลื่อนสิทธิ์ Staff ผ่าน client ไม่ได้

### ข้อมูลเดิมและ teardown

รอบที่ผ่านบันทึกตาราง QA ใหม่ 8 รายการในช่วงว่างที่อยู่ห่างจากข้อมูลใช้งานจำลอง โดยค้นช่วงว่างก่อนบันทึกและบันทึกวันที่ใน `sdk-report.json` ไม่ลบตาราง/receipt ของการทดสอบก่อนหน้า และหยุดก่อนเขียนหากจำนวนตารางเข้าใกล้ read limit ของ pilot

สร้างบัญชีสังเคราะห์ชั่วคราว 3 ตัวผ่าน Auth SDK เฉพาะใน Emulator และสร้างโปรไฟล์แบบ create-only เพื่อทดสอบกรณีไม่มี capability/Staff ที่มี flag จากนั้นลบบัญชีของตัวเองและโปรไฟล์ที่ตรงกับข้อมูล/เวอร์ชันที่สร้างในรอบนี้ ไม่แก้ profile ของบัญชีเดิม

หลัง teardown ตรวจ profile ทั้งชุดเท่ากับก่อนทดสอบ รวมตรวจ schedule/exam เดิมทุกเอกสารว่าค่าไม่เปลี่ยน การเทียบ JSON เรียง key เพื่อไม่ผูกกับลำดับ field ภายใน SDK ผล `preexistingDocumentsPreserved`, `postCleanupProfileBaselinePreserved` และ `cleanup.errors` อยู่ในรายงาน

## ผล Browser/E2E

`verify-calendar-role-ui.cjs` ผ่าน **12 กรณี**: 6 สถานะ × 1440 px/light และ 390 px/dark (Chrome touch emulation)

- Admin/Superadmin เปิดเพิ่มและนำเข้าได้ Staff อ่านได้แต่ปุ่มเพิ่ม/นำเข้าถูกปิด; pending/inactive/anonymous ไม่เห็นตาราง
- เปิดรายละเอียดได้ตามสิทธิ์อ่าน แต่ไม่มี edit/delete ใน pilot นี้ ตัวเลือกสอบรายวิชาที่ยังไม่มี writer contract ไม่ถูกเปิดให้เพิ่ม
- ใส่ role Superadmin จำลองใน legacy localStorage ก็ไม่ทำให้ข้ามสิทธิ์ Firebase ของบัญชีที่เข้าสู่ระบบจริง
- ไม่มี Firestore writes จาก browser test และไม่มีการเรียก origin นอก loopback ที่อนุญาต ไม่ล้นแนวนอน

`npm test` ผ่าน **518 tests / 31 files** และ Node syntax checks / JSON checks / `git diff --check` ผ่าน ไม่รัน compatibility build หรือ application lint ซ้ำเพราะไม่มีการแก้ application code/configuration

```powershell
npm test
node scripts/verify-calendar-role-concurrency.mjs
node scripts/verify-calendar-role-ui.cjs $playwrightModule $chromeExecutable
```

ใช้ Emulator ที่มี writer fixtures/rules เดิมอยู่บน Auth 19099 / Firestore 18080 และ dev server 4310 สคริปต์นี้ไม่เตรียมหรือ reset namespace ให้เอง การรัน SDK suite ซ้ำจะเก็บ schedules/receipts QA ไว้อีก 8 รายการต่อรอบ แต่เก็บกวาดเฉพาะบัญชี/โปรไฟล์ชั่วคราวของรอบนั้น

## ส่วน staging ที่ยังรอ

ผล Emulator ไม่ใช่ผล cloud matrix ยังไม่ยืนยันว่ามี Google ของผู้ทดสอบหลายบทบาทพร้อม จึงเสนอทดสอบสอง session ของบัญชีผู้ทดสอบเดิมก่อน ไม่ขอรหัสผ่าน/token และไม่เปลี่ยนบทบาทผู้ใช้จริงเพื่อจำลองผลโดยไม่อนุมัติ

เตรียมตาราง UAT แยกไว้ใน [cloud-uat-plan.md](cloud-uat-plan.md) พร้อม manifest เจาะจง 19–22 เม.ย. 2570 ซึ่งคาดว่าจะเพิ่ม 4 ตาราง และ PDF สังเคราะห์สำหรับ negative atomic batch ผ่าน pure plan tests 11 tests และตรวจ parser/ภาพ PDF แล้ว

อ่านสถานะ staging ได้ว่า writer enabled, gate ready, revision 5 และ read-only preflight แบบเลือกเฉพาะข้อมูลห้อง/เวลาไม่พบ conflict ในช่วงที่เสนอ ไม่ได้อ่านชื่อผู้สอนหรือผู้คุมเพื่อเตรียมชุดนี้ CLI read มีสิทธิ์จัดการจึงใช้เป็น occupancy check เท่านั้น

SDK ที่ไม่เข้าสู่ระบบจริงบน cloud ปฏิเสธ 4 nonexistent QA references ตามคาด ไม่มี write calls ส่วน browser เปิด writer ได้และปุ่มปิดก่อน login แต่ขาดการเชื่อมต่อระหว่าง Google flow จึงยังไม่ยืนยัน session หรือ authenticated cloud matrix สถานะอยู่ใน `cloud-qa-status.json` เป็น partial read-only checks ผ่าน/การเขียนยังรอ

ผู้ใช้อนุมัติชุดรายการสังเคราะห์ที่ระบุแล้วเมื่อ 10 พฤศจิกายน 2569 ตรวจซ้ำช่วง QA ยังว่างและ revision 5 แต่ browser ยังไม่เชื่อมต่อ จึงเหลือการเชื่อมต่อ browser/เข้าสู่ระบบตามปกติก่อนเริ่ม ไม่ต้องขออนุมัติชุดเดิมซ้ำ ไม่ใช้ Admin SDK หรือ CLI ที่ bypass rules แทนหลักฐานการบังคับสิทธิ์ของผู้ใช้ ไม่มีการเปิด Auth providers หรือเปลี่ยนบัญชี cloud ในขั้นนี้

ความคืบหน้าถัดมา: ยืนยัน Edge session A ของ writer แล้ว อ่าน staging สำเร็จและปุ่มเพิ่ม/นำเข้าเปิด แต่ Edge หลุดตอนเริ่ม Google ของ session B จึงยังไม่รัน concurrent writes ตัวตรวจ `qaAudit before` อ่านเฉพาะ references ที่คำนวณจากชุด QA พบ schedules 0 / receipts 0 / revision 5 ไม่มีคำขอเขียน ดูรายละเอียดใน `cloud-uat-plan.md` และ `cloud-storage-audit-before.json`

Rules ของ pilot ยังเป็น prototype ที่ไม่ได้บังคับ aggregate room/proctor conflicts และ business invariants ทั้งหมดแทน trusted server การที่ sanctioned clients ผ่าน concurrency QA ไม่ได้พิสูจน์ว่า custom client ที่มี writer capability จะข้าม business validation ไม่ได้ ไม่ถือว่าผ่าน production gate จากผลนี้ และยังไม่ยืนยันทุกอุปกรณ์จริงหรือ cloud batch 100 รายการ
