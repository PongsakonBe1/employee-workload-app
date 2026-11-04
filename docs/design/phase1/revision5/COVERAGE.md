# Inventory และการเปลี่ยนจาก Review 04 — Review 05

`local` = เปลี่ยนข้อมูลสังเคราะห์ในหน่วยความจำได้; `partial` = มี UI และ flow บางส่วนแต่ยังสาธิต; `pending` = ยังต้องพัฒนาหรือตรวจ runtime จริง การมีหน้าครบไม่หมายถึงย้าย backend สำเร็จ

| มุมมอง / งาน | สถานะ | การจัด UX/UI และข้อจำกัด |
|---|---|---|
| record | local | actor → Quick/Manual → preview, บริบทวันนี้อยู่ข้างฟอร์ม |
| new-log | local | วัน/เวลา/minorTask/main/group, draft คงอยู่เมื่อเลือก task, recipient/detail |
| Quick Log/Combo | local | 6 ต่อหน้า, Account 5/Software 6, select all/clear, checkbox ตาม template |
| Smart room | local | เปิด/ปิดตามสถานะล่าสุด ชั้น 3/4, metadata ตรงกับ task |
| worklogs | local | list/calendar, เปลี่ยนเดือนจริง, ค้นหา/ช่วงวันที่/sort/page/detail/edit/multi-delete/undo |
| dashboard | local | FY/month/person → counts/trend, main/minor/hour/person ใน detail, heatmap ใช้ scope เดียวกัน |
| staff | local | ปีงบไทย 1 ต.ค.–30 ก.ย./รายเดือน, list/search/sort/CSV/detail/next/prev/6 metrics |
| profile | partial | ชื่อ/ชื่อเต็ม, top 8 minorTask คำนวณจริงจาก fixture; badge/streak และคำขอสิทธิ์ยัง demo |
| dl | local | month/agenda, รายละเอียดวัน, type/CEM/note, >40 เพิ่ม 407, 3 ผู้คุมไม่ซ้ำ |
| DL evening | local | วันและเวลา explicit 17:00–18:30; ไม่เปลี่ยนความหมาย slot เก่าด้วยชื่อรอบ |
| classrooms | local | week จันทร์–เสาร์ 08–21, agenda, เพิ่ม/แก้/เปิดปิดหลายรายการ, overlap, copy semester/dedupe |
| Staff timetable | local | อ่านตารางเรียน/DL, เปิดรายละเอียด ไม่มีปุ่มแก้ ไม่เปลี่ยนสิทธิ์จริงในระบบ |
| imports | partial | 4 ขั้นตรวจ workflow PDF/รูปด้วยข้อมูลตัวอย่าง; **ไม่มี PDF parser/OCR** |
| equipment | local | registry/list + inspector, สังกัด/order/active/type/barcode/itemNo, add/edit |
| Shared device picker | local | เพิ่ม/ย้าย/หยุดใช้ส่งผลทันทีใน Quick Log, คืนชำรุดบันทึก condition |
| resources | partial | ห้อง/อุปกรณ์ปัจจุบัน/detail/history/CSV fixture; vector preview เป็นสาธิต |
| usage | local | อันดับรายชิ้นและจำนวนครั้งยืมตามปีงบ/เดือน แยกจาก condition |
| condition | local | คืนสมบูรณ์/ชำรุด/สูญหาย, filter/history/CSV จาก fixture ไม่ใช้ timeline เป็นตัวหลัก |
| templates | partial | list/preview/editor, required fields/Combo items/checkbox; custom Smart target ยัง pending |
| export | local | Staff reason/request/status/download หลังอนุมัติ, Admin preview/CSV ตาม scope |
| export-requests | local | queue/filter/detail, approve/reject พร้อมเหตุผล สี rejected เป็นแดง |
| users | partial | active/pending/role request/detail/ก่อน–หลัง/confirm local ไม่เปลี่ยน Auth identity จริง |
| admin | local | pending task queue และเครื่องมือที่เกี่ยวข้อง ไม่ซ้ำ system dashboard |
| system | partial | ศูนย์เครื่องมือข้อมูล/นำเข้า/audit/cleanup, การบังคับค่าระบบจริง pending |
| settings | partial | desktop list/detail, mobile drilldown, System/Light/Dark/material/motion และฟอร์มเก็บค่า local |
| audit | partial | feed/รายละเอียด/before-after สังเคราะห์ ยังไม่ใช่ audit ฝั่ง server |
| cleanup | partial | compare/explicit confirm/undo แบบสาธิต ไม่ลบข้อมูลจริง |
| broadcast | local | draft preview/in-app/push/audience/reach/result, ไม่มีการส่งข้อความจริง |
| notifications | local | bell/read/dismiss/badge/center, permission เป็น scenario ไม่ขอ browser permission |
| data-import | local | TSV จาก spreadsheet แยกจาก schedule import, validation/date/staff/task/dedupe |
| help | partial | คู่มือ flow หลักที่ปรับใหม่ ต้อง UAT ถ้อยคำกับทีม |
| about | partial | ข้อมูลตัวต้นแบบ/ข้อจำกัด ไม่อ้าง production version |
| login/pending | partial | auth shell แยก, role preview ไม่ใช่ authentication |
| design | local | internal states/components สำหรับ reviewer ไม่อยู่ในเมนูงาน |
| offline/PWA | partial | สาธิต offline แล้วไม่เขียน worklog; service worker/queue/update จริง pending |
| lock/override | partial | ข้อความสถานะและขั้น confirm; server enforcement/exception policy ยัง pending |

## นำเข้าตาราง: ข้อกำหนดที่ยืนยันแล้ว

เอกสาร `com_lab-BKK_2.pdf` ที่ผู้ใช้ให้เป็นตาราง 4 ห้อง (401/402/406/407) จันทร์–เสาร์ ถึง 21:00 โครงสร้างตัวอย่างในแบบมี 25 บล็อก (9/7/2/7) ใช้วิชาและผู้สอนสังเคราะห์ ไม่มีรายชื่อจริงเป็น fixture

1. แยกชนิดตารางเรียนซ้ำรายสัปดาห์ / สอบรายวิชา / DL ตั้งแต่ต้น ไม่ใช้ parser ชุดเดียวโดยไม่ตรวจชนิด
2. ต้องกำหนดช่วงมีผลก่อนยืนยัน วันสิ้นสุด ป.ตรีที่ยังไม่ทราบไม่เติมเอง ปุ่มช่วงตัวอย่างระบุชัดว่าเป็นสาธิต
3. ช่องสีเทา “งดให้บริการ” เป็นข้อมูลประกอบ **ไม่สร้างข้อห้ามการเพิ่มตารางเรียนในระบบนี้**
4. ตรวจวัน เวลา ห้อง วิชา/ผู้สอน หรือผู้คุมและวันสอบ รายการซ้ำมี summary ก่อนยืนยัน
5. เพิ่มรายการด้วยฟอร์มเดิมหลัง import ได้ สอบรายวิชาเก็บแยกในสถานะสาธิต ไม่เปลี่ยนเป็นตารางเรียนถาวร
6. DL 75 คนหมายถึงต่อรอบ ผู้คุมตามตาราง; ตัวอย่างแทนชื่อด้วย A–H

ยังต้องออกแบบ extraction confidence, การผูกชื่อกับบัญชีจริง, ความขัดแย้งห้อง/ผู้คุมข้ามกิจกรรม, วันหยุด/ช่วงสอบและข้อยกเว้นที่แก้เองได้ ก่อน implementation

## สิ่งที่ยังต้องปิดก่อน production

- แปลง prototype ที่ต่อยอด global functions เป็น shared React components/tokens ตามโครงโครงการ ไม่ยกไฟล์สาธิตไปแทน runtime
- เชื่อมข้อมูล registry/stable IDs, aggregates, RBAC, transactions, audit, lock, settings enforcement และ realtime ใน test environment
- พัฒนา PDF/image extraction หลังอนุมัติแผน dependency/data handling แล้ว ไม่อ้างว่าปุ่มเลือกไฟล์ปัจจุบันอ่านข้อมูลได้
- ทดสอบ Safari/iOS, VoiceOver, keyboard/zoom, contrast กับ backdrop จริง และ performance บนอุปกรณ์ทีม
- ทำ UAT กับผู้ใช้ 8 คน: เวลา/อัตราสำเร็จ/ข้อผิดพลาดของลงงาน ย้ายอุปกรณ์ จัดตาราง และเลือก FY ใช้เป็นหลักฐาน DSR
- รอบนี้ไม่อัปเดต Figma; แบบล่าสุดอยู่ใน HTML prototype และ screenshots ไม่กล่าวว่าเป็น editable Figma ล่าสุด
