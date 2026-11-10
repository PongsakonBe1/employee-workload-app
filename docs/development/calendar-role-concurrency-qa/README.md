# QA สิทธิ์และการเพิ่มตารางพร้อมกัน

10 พฤศจิกายน 2569 · Branch `codex/calendar-role-concurrency-qa`

ผลล่าสุด: [Cloud QA](cloud-uat-results.md) ผ่านครบชุดที่อนุมัติ: concurrent writes 3 กรณี และ PDF negative import review 1 กรณีด้วย Google ผู้ทดสอบเดิม เพิ่มจริงรวม 4 ตาราง / 4 receipts / revision 5 → 9 ส่วน PDF ที่มีรายการชนถูกหยุดก่อน commit ทั้งชุด ไม่เพิ่มข้อมูลบางส่วน ตรวจรายละเอียดและโหลดกลับจาก server แล้ว ยังไม่ถือว่าผ่าน cloud role matrix ทั้งชุด

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

## ผล staging และขอบเขตที่ยังรอ

ผล Emulator ไม่ใช่ผล cloud matrix รอบ cloud นี้ใช้ Google ของผู้ทดสอบเดิมใน Edge สองแท็บโดยเข้าสู่ระบบตามปกติ ไม่มีการขอรหัสผ่าน/token หรือเปลี่ยนบทบาทผู้ใช้จริงเพื่อจำลองผล

ชุดที่ผู้ใช้อนุมัติอยู่ใน [cloud-uat-plan.md](cloud-uat-plan.md) และ manifest เจาะจง 19–22 เม.ย. 2570 ผ่าน pure plan tests 11 tests และตรวจ parser/ภาพ PDF แล้ว ผลจริง: เวลาชนเพิ่มได้หนึ่ง ส่งซ้ำเพิ่มครั้งเดียว คนละห้องเพิ่มได้ทั้งคู่ และ PDF ที่มีทั้งรายการชน/รายการว่างถูกหยุดก่อน commit ทั้งชุด

ก่อนเริ่ม writer enabled, gate ready, revision 5 และ preflight แบบเลือกเฉพาะห้อง/เวลาไม่พบ conflict ในช่วง QA ผลปลายทางมี 4 ตาราง / 4 receipts / revision 9 รายละเอียดและ operation reference ตรงตามแผน ไม่มีเอกสารหรือ receipt ของ negative PDF เพิ่ม อ่านข้อมูลกลับจาก server แล้วพบ QA ครบ 4 รายการ ตัวตรวจ CLI มีสิทธิ์จัดการจึงใช้ยืนยันข้อมูลที่เก็บเท่านั้น ไม่ใช้แทนหลักฐานสิทธิ์ของผู้ใช้

SDK ที่ไม่เข้าสู่ระบบจริงบน cloud ปฏิเสธ 4 nonexistent QA references ตามคาด ไม่มี write calls จากการตรวจ anonymous ส่วน cloud หลายบทบาทยังไม่ได้รัน ไม่อ้างผลของผู้ทดสอบเดิมบัญชีเดียวแทน Staff/Superadmin/pending/inactive

PDF negative case ตรวจด้วยไฟล์สังเคราะห์ที่อนุมัติผ่าน Windows file picker ตามปกติ เครื่องมือ extension เลือกไฟล์ยังไม่ผ่าน แต่ไม่ต้องแก้การตั้งค่าความปลอดภัยเพิ่ม การปฏิเสธเกิดที่ import review ก่อน commit จึงไม่ถือว่าได้ทดสอบ server transaction atomicity ของกรณีนี้

ไม่มีการเปิด Auth providers เปลี่ยนบัญชี cloud ลบ QA push หรือ deploy ในรอบนี้ หลักฐานและข้อจำกัดเรื่อง F5/fresh sign-in หลัง QA ใหม่อยู่ใน [cloud-uat-results.md](cloud-uat-results.md) ข้อความ conflict ค้างหลังแก้ฟอร์มเป็นงาน UX ที่บันทึกไว้รอเฟสถัดไป

Rules ของ pilot ยังเป็น prototype ที่ไม่ได้บังคับ aggregate room/proctor conflicts และ business invariants ทั้งหมดแทน trusted server การที่ sanctioned clients ผ่าน concurrency QA ไม่ได้พิสูจน์ว่า custom client ที่มี writer capability จะข้าม business validation ไม่ได้ ไม่ถือว่าผ่าน production gate จากผลนี้ และยังไม่ยืนยันทุกอุปกรณ์จริงหรือ cloud batch 100 รายการ
