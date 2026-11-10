# ผล Cloud QA การเพิ่มตารางพร้อมกัน

10 พฤศจิกายน 2569 · `codex/calendar-role-concurrency-qa`

ผ่านชุดที่อนุมัติครบ 4 กรณี: concurrency 3 กรณี และ PDF negative import review 1 กรณี บน `labboy-workload-app-staging` โดยใช้ Google ของบัญชีผู้ทดสอบเดิมใน Edge สองแท็บที่เข้าสู่ระบบแยกกัน ผ่าน UI ของ `/dev/calendar-staging-write` ไม่มีการนำ token ออกจาก browser และไม่ใช้ CLI/Admin SDK เขียนแทนผู้ทดสอบ

## ขอบเขตและผล

ใช้ manifest ที่ผู้ใช้อนุมัติ SHA-256 `43dfd0c8723f74dd84c549d9794b8504ed696d8c2b9f6dad6f6281ec8173191f` ก่อนเริ่มตรวจช่วง QA ว่าง ไม่มี QA schedules/receipts และ revision 5

| กรณี | รายการที่ส่ง | ผล UI และที่จัดเก็บ | revision |
|---|---|---|---|
| เวลาชน | 19 เม.ย. 2570 ห้อง 401: A 10:00–11:00 / B 10:30–11:30 | B เพิ่ม 1; A แจ้งชนและยังไม่ได้เพิ่มรายการใด; พบ 1 schedule / 1 receipt | 6 |
| ชุดเดียวกัน | 20 เม.ย. ห้อง 402 10:00–11:00 ชื่อและ metadata ตรงกันทั้งสอง session | B เพิ่ม 1; A บันทึก 0 ข้ามเดิม 1; เพิ่มเพียง 1 schedule / 1 receipt | 7 |
| คนละห้อง | 21 เม.ย. ห้อง 401 และ 402 10:00–11:00 | ทั้งสอง session เพิ่มสำเร็จ; เพิ่ม 2 schedules / 2 receipts | 9 |
| PDF มีรายการชนและรายการว่าง | 19 เม.ย. ห้อง 401 10:00–11:30 + 22 เม.ย. ห้อง 402 14:00–15:00 | เลือกทั้ง 2 รายการ ยืนยันช่วง 19–22 เม.ย. 2570 พบชนเฉพาะรายการแรกและหยุดที่ review ก่อน commit ทั้งชุด; ไม่เพิ่มทั้งสองเอกสารหรือ receipt | 9 |

ส่ง click requests ของแต่ละคู่ใน cell เดียวกันด้วย `Promise.allSettled` มี timestamp ใน `cloud-browser-report.json` เป็นหลักฐาน UI attempts พร้อมกัน ไม่อ้างว่าได้ตรวจ network trace, snapshot transaction หรือการ retry ภายใน SDK

ตัวตรวจ privileged แบบอ่านอย่างเดียวคำนวณ document/receipt IDs จาก manifest แล้วใช้ field masks ตรวจทุกค่า business field และ operation reference ของแต่ละ QA schedule โดยตรง ไม่อ่านชื่อผู้ใช้หรือ credentials ผลปลายทางตรงกับจำนวนและรายละเอียดที่ UI แสดง การอ่านนี้ใช้ยืนยันข้อมูลที่เก็บเท่านั้น ไม่ใช่หลักฐาน rules ของผู้ใช้

กดโหลดข้อมูล staging ใหม่ใน session B หลังทั้งสองคำขอเสร็จ เห็น QA ครบ 4 รายการในสัปดาห์ 19–25 เม.ย. 2570 และอ่านรวม 29 ตารางเรียน / 0 รอบสอบของเดือนนั้น ยืนยัน fresh server read ผ่าน ยังไม่ได้ F5 หรือ sign-out/sign-in ใหม่หลังสร้าง QA สี่รายการนี้ ผล UAT reload/sign-in เดิมเป็นหลักฐานคนละรอบ

หลัง negative PDF ตรวจซ้ำด้วย `qaAudit after` พบ schedules 4 / receipts 4 / revision 9 เท่าเดิม ไม่มีทั้ง `QA-CLOUD-ATOMIC-COLLISION`, `QA-CLOUD-ATOMIC-GOOD` หรือ receipt ของ batch จากนั้นยกเลิกหน้าตรวจไฟล์และกดโหลดข้อมูล staging ใหม่ใน session A เห็น QA ครบ 4 รายการอีกครั้ง กรณี PDF นี้ตรวจการป้องกันใน UI review ก่อน commit ไม่ได้ส่ง malformed commit ไปทดสอบ server transaction atomicity

## หลักฐาน

- `output/playwright/calendar-role-concurrency-qa/cloud-browser-report.json`: ผล UI, click timestamps และ fresh server reload
- `cloud-storage-audit-before.json`: baseline 0 schedules / 0 receipts / revision 5
- `cloud-storage-audit-overlap.json`, `cloud-storage-audit-identical.json`, `cloud-storage-audit-different-rooms.json`: ผลหลังแต่ละคู่
- `cloud-storage-audit-after.json`: ตรวจ exact fields และ operation reference ของเอกสารที่สร้างอีกครั้ง
- `cloud-storage-audit-atomic-rejection.json`: ตรวจยอดและ absence ของทั้งสอง negative targets/receipt หลัง review ปฏิเสธ
- `cloud-four-qa-schedules.jpg`, `cloud-overlap-conflict.jpg`, `cloud-identical-skipped.jpg`: ภาพผล UI
- `cloud-atomic-rejection.jpg`, `cloud-final-calendar.jpg`: ภาพ negative review และปฏิทินหลังโหลดข้อมูลใหม่
- `cloud-result-checks.json`: ผลเทียบ raw evidence กับ manifest และขอบเขตที่ยืนยันแล้ว

ชื่อไฟล์ที่ไม่ระบุ directory ในรายการนี้อยู่ใน `output/playwright/calendar-role-concurrency-qa/`

## ประเด็นระหว่างทดสอบ

เครื่องมือ `.fill` สำหรับ native date/time input เปลี่ยนค่าที่เห็น แต่ไม่คงค่าผ่าน React rerender ในรอบแรก ทำให้ client validation ปฏิเสธคำขอก่อนเขียน cloud ตรวจยืนยัน 0 QA schedules / 0 receipts / revision 5 แล้วเปลี่ยนเป็นการกรอกผ่าน keyboard และตรวจหลังเปลี่ยน checkbox ก่อนส่งจริง ไม่สรุปว่าเป็น bug ของการกรอกด้วยมือจากหลักฐานเครื่องมือเพียงอย่างเดียว

พบข้อความ conflict เก่ายังค้างในฟอร์มเมื่อแก้ชื่อ/วัน/เวลา ก่อนกดบันทึกครั้งต่อไป เป็นประเด็น UX ที่ควรแก้รอบถัดไป การทดสอบรอบนี้ไม่เปลี่ยน application runtime

ประเด็น feedback นี้แก้ภายหลังบน branch `codex/calendar-form-feedback` แล้ว ตรวจ Unit 518 tests และ browser/SIT 26 assertions ผ่าน โดยไม่เขียน cloud เพิ่ม ผู้ใช้ยืนยันรับการแก้โดยรวมแล้วเมื่อ 10 พฤศจิกายน 2569 ไม่ได้ระบุอุปกรณ์หรือผลราย testcase ดู [ผลการแก้ฟอร์มและขั้นตรวจรับ](../calendar-form-feedback/README.md)

ผู้ใช้แจ้งว่าเปิด file-URL permission แล้ว แต่ `setFiles` ยังรายงานว่าไม่มีสิทธิ์ browser policy ไม่อนุญาตให้เครื่องมือเปิด `edge://extensions` จึงไม่ได้ตรวจหรือเปลี่ยนการตั้งค่าผ่านช่องทางอื่น ใช้ทางเลือกที่ไม่ต้องเปิดหน้าดังกล่าว: Windows file picker ตามปกติ เลือกเฉพาะ PDF สังเคราะห์ที่อนุมัติสำเร็จ ส่วนไฟล์ `com_lab-BKK_2.pdf` ที่มีผู้เลือกในช่วงนั้นไม่ได้ถูกบันทึกเพิ่ม

## งานที่เหลือและข้อจำกัด

ชุดที่อนุมัติใน manifest ตรวจครบแล้ว ขอบเขต negative PDF จำกัดที่ import review และข้อมูลที่เก็บหลัง review ไม่ใช้ผลนี้แทนการโจมตี/ทดสอบ raw SDK ที่ข้าม client validation บน cloud

ไม่ถือว่าผ่าน cloud role matrix: รอบนี้ใช้บัญชีผู้ทดสอบเดิมเพียงบัญชีเดียว ไม่ได้เปลี่ยน roles/capability หรือสร้าง Auth accounts เพื่อจำลอง Staff/Superadmin/pending/inactive และไม่อ้างผล Emulator แทน cloud

QA สี่ตารางและ receipts คงอยู่ ไม่มีการลบหรือ cleanup ไม่มีการ push/deploy/เขียน production ขอบเขต production ยังต้องพิจารณา trusted-server business invariants ของ pilot แยกจากผล sanctioned-client concurrency นี้
