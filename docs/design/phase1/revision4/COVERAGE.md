# เทียบฟังก์ชันกับเว็บเดิม — Review 04

ตรวจจาก UI ที่เปิดคลิกจริงและ source วันที่ 2 พฤศจิกายน 2569 ไม่ถือว่าการเห็นปุ่มยืนยันว่า backend ทำงานถูกต้องทั้งหมด ตารางนี้ระบุขอบเขตต้นแบบและงานที่ยังเหลือ ไม่ใช่คำรับรองว่าได้ย้ายระบบครบแล้ว

คำว่า **local** หมายถึงกดได้และเปลี่ยนข้อมูลสังเคราะห์ในหน่วยความจำ; **partial** หมายถึงมีแบบ UI แต่พฤติกรรมบางส่วนยังสาธิต/ยังไม่ครบ; **pending** หมายถึงยังต้องพัฒนาหรือทดสอบจริง

| ฟังก์ชันที่พบในเว็บเดิม / Requirement | Review 04 | ขอบเขตและสิ่งที่เหลือ |
|---|---|---|
| หน้าบันทึกงานของ Staff/Admin เลือกเจ้าหน้าที่ | local | Staff บันทึกตัวเอง; role preview ไม่ใช่ authentication จริง |
| Quick Log หลายหน้า | local | 6 ต่อหน้า เทมเพลตเพิ่ม/แก้ไข/หยุดใช้สัมพันธ์กับ Quick Log |
| Combo บัญชี 5 และ Software 6 | local | checkbox/select all/clear, recipient, preview, batch ตามจำนวนที่เลือก; schema จริงต้อง map label ไป minorTask |
| Smart เปิด/ปิดห้องชั้น 3/4 | local | 303/304/305/306 + OS และ 401/402/406/407 เปลี่ยนตามสถานะล่าสุด มีขั้นตรวจแทนการกดค้าง |
| ยืม/คืนหูฟัง ปลั๊ก USB | local | เลือกรายชิ้น/สังกัด สภาพคืน และกันรายการหยุดใช้ |
| เพิ่ม/ย้ายสังกัดอุปกรณ์แล้วคำแนะนำไม่ตาม | local | ข้อมูล registry และ picker ชุดเดียว; ประวัติเดิมคงข้อความเดิม; realtime consistency pending |
| Registry: ชื่อ/สังกัด/ลำดับ/active/ประเภท | local | เพิ่ม Barcode/Item No. ในฟอร์มรวมด้วย เป็นการจัดเครื่องมือใหม่จากข้อมูล inspector |
| Resource status/Preview/Barcode/Item No. | partial | CSS/vector 3D representation หมุนได้ ไม่ใช่โมเดล 3D รายชิ้น; history/CSV ใช้ fixture |
| ส่งออกสถานะห้อง/อุปกรณ์และประวัติตามช่วง | local | CSV สังเคราะห์ ไม่ดาวน์โหลดข้อมูลจริง |
| Manual Worklog วันเวลา/หัวข้อรอง/งานหลัก/กลุ่ม | local | ใช้รายการ 30 minorTask และ mapping จาก source; preview ก่อน save |
| คำแนะนำ comment ตาม task | partial | มีตัวอย่าง suggestion; การดึง suggestion เฉพาะงาน/อุปกรณ์จาก backend ยัง pending |
| ประวัติงาน list/calendar/search/date | partial | list/filter ทำงาน; calendar demo ยึดเดือนพฤศจิกายน 2569 ยังต้องเพิ่ม month navigation ครบ |
| Sort/pagination/edit/multi-select/delete/undo | local | ตรวจ flow แล้ว; soft-delete/transaction/audit และ lock policy จริง pending |
| Lock และ Admin override | partial | มีสถานะแก้ย้อนหลังของ Staff; การบังคับกฎ/override เหตุผลต้องทำใน runtime |
| Dashboard time presets/range/person | partial | UI เปลี่ยนขอบเขต; time/semester charts คงที่และมีข้อความกำกับ ไม่ใช่ aggregates จริง |
| Dashboard main/minor/rank/hour/heatmap/term | partial | เก็บชนิดข้อมูลที่พบกลับมา ไม่ตัดกราฟออก; drilldown บางส่วนเป็นข้อมูลสาธิต |
| Staff Analytics ปีงบไทย/รายเดือน | local | 1 ต.ค.–30 ก.ย. ตรวจ Oct/Sep boundaries; ข้อมูลปี/เดือนเป็น fixture scaling |
| Staff list/search/sort/CSV | local | เลือก sort ได้ 6 ตัวชี้วัด + จำนวนงาน; ต่อข้อมูลจริง pending |
| Staff single/next-prev/6-metric radar | partial | navigation ทำงาน; radar/definition เป็นแบบสาธิต ต้องผูกสูตร/ค่ารายคนจริง |
| Profile radar 8 minorTask | partial | คง 8 แกนตาม AGENTS; top-8 aggregation จริง pending |
| Profile ชื่อ/full name/ขอสิทธิ์/badges/streak | partial | ชื่อ/คำขอเปลี่ยน local; badges/streak สาธิต |
| อุปกรณ์ยืมบ่อยตามรายการ/สังกัด/ปีงบ | local | รักษา usage view ตาม requirement แทน timeline เป็นคำถามหลัก |
| Equipment condition/damage/history/CSV | partial | แยก view จาก usage, คืนชำรุดเปลี่ยน condition จริงใน fixture; summary/trend เป็นภาพสาธิต |
| DL เดือน/list/calendar/detail/edit | local | explicit date/start/end; active/type/CEM/notes และผู้คุมสอบ 3 คน; delete/advanced conflict checks pending |
| DL 75 คนต่อรอบ/ห้อง 407 เพิ่มเมื่อ >40 | local | threshold และผู้คุมไม่ซ้ำทดสอบแล้ว; 17:00–18:30 ใหม่ไม่ reinterpret เวลารุ่นเก่า |
| Import รูปตาราง DL | partial | แสดงรูปในเครื่องและตารางตัวอย่างแก้ไข/skip duplicates; **ยังไม่มี OCR** ไม่มีอัปโหลดรูปไปบริการ |
| ตารางเรียน day/time/room/subject/teacher/note/active | local | week/list, เพิ่ม/แก้, filter, overlap, bulk active และ semester copy/dedupe; delete pending |
| Templates: Smart/Combo/required fields/items | partial | editor และ Quick Log ชุดเดียวกัน; Smart ที่สร้างเองยังต้องตั้ง target type, requireCheckbox behavior pending |
| Admin export ทั้งทีม/ตนเอง ปีงบ/ช่วง | local | preview และดาวน์โหลด CSV ตัวอย่าง; access validation ฝั่ง server pending |
| Staff export reason/pending/approved/rejected | local | บังคับขออนุมัติ ดาวน์โหลดเฉพาะตนเองหลังอนุมัติ |
| Admin approve/reject export + reason | local | ไม่อนุมัติต้องมีเหตุผล; audit ฝั่ง server pending |
| ผู้ใช้ active/pending/roleRequests/edit/role | partial | หน้า/ฟอร์ม/confirm/ผล local; approved pending ยังไม่สร้าง Auth identity หรือ mutate สิทธิ์จริง |
| Notification bell/read/dismiss/push permission states | local | ไม่เปิด browser permission prompt; status เป็น scenario ในต้นแบบ |
| Broadcast In-App/Push/audience/results | local | preview จำนวนผู้รับ/อุปกรณ์ ไม่กล่าวว่าส่งถึงทุกคน; ไม่มีการส่งจริง |
| Worklog TSV import จาก Spreadsheet | local | แยกจาก DL image, validate วันที่จริง เวลา staff/task, preview และ dedupe |
| ตั้งค่าระบบ general/notifications/security/data | partial | ค่า form เก็บ local; enforcement, export format/FY start และ scheduled behavior ต้องตรวจ runtime |
| รูปลักษณ์ System/Light/Dark/material/motion | local | แยกตามอุปกรณ์; OS preferences เท่าที่ browser รองรับ |
| Audit/cleanup/admin hub/help/login/pending/about | partial | มีมุมมองเพื่อ review; audit feed/cleanup/auth/help content ต้องต่อระบบจริง |
| PWA/offline/install/update | partial | มีสถานะ offline/ห้ามเขียนใน fixture; service worker/offline queue/update lifecycle pending |

## การตัดสินใจที่ตั้งใจเปลี่ยนจากของเดิม

1. ใช้ preview + confirm สำหรับ Quick Log ที่เดิมกดค้าง ช่วยให้ใช้ keyboard/touch ได้สม่ำเสมอ ต้อง UAT ความเร็วจริงก่อนเลือกวิธีสุดท้าย
2. Equipment Health เดิมเก็บไว้เป็นสภาพ/ประวัติคืน ส่วน usage ranking เป็นหน้าหลักสำหรับคำถามว่าเครื่องใดยืมบ่อย ไม่ลบข้อมูล condition ทิ้ง
3. แยก worklog TSV และ DL image import เป็นคนละ workflow เพราะต้นทางข้อมูลต่างกัน
4. ใช้ neutral glass สำหรับกลุ่มควบคุม สีสถานะมีข้อความ/สัญลักษณ์ ไม่กำหนดสีสดให้ทุกหมวดงาน

## ช่องว่างที่ต้องปิดก่อนใช้จริง

- ตรวจ month navigation/CRUD delete/Smart template mapping และ aggregation ทุก chart ให้สัมพันธ์กับ filter อย่างครบถ้วน
- กำหนด DL conflict rules: ห้อง วัน/เวลา ผู้คุมซ้อนข้ามห้อง/ข้ามกิจกรรม และข้อยกเว้นที่อนุมัติได้ แยกจาก validation สาธิตที่กันช่วงสอบซ้ำในวันเดียว
- ทำ image extraction พร้อม confidence/การแก้ไขรายช่อง/join ผู้คุม/preview/duplicate handling และเก็บหลักฐานเฉพาะที่จำเป็น
- ทดสอบ RBAC/security rules, mutation transaction, audit, realtime, lock/override และ settings enforcement กับ test environment
- ตรวจ text/background contrast บนเนื้อหาที่หลากหลายจริง, VoiceOver/Safari/iOS, keyboard/zoom, Reduce Transparency, Reduce Motion และ performance บนอุปกรณ์ทีม
- นำแบบขึ้น Figma เป็น editable component/Auto Layout/variables และ wire interactions เมื่อ quota ใช้งานได้ แล้วตรวจ visual QA ใน Figma
- เก็บ UAT กับผู้ใช้ 8 คนทั้งมือถือและคอม: เวลา/ข้อผิดพลาด/อัตราสำเร็จในการลงงาน ย้ายอุปกรณ์ ทำตาราง และเลือกปีงบ ใช้เป็นหลักฐาน DSR

ไม่ถือว่ารอบนี้แก้ปัญหา backend แล้ว หรือว่าฟังก์ชันที่มีปุ่มครบหมายถึงพร้อม deploy การตรวจรับรอบนี้เป็นเรื่องทิศทาง UI และความครบของ inventory เพื่อวางงานเฟสถัดไป
