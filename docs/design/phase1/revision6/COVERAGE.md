# ขอบเขตต้นแบบและ regression — Review 06

สืบทอด inventory 30 มุมมองจาก [Review 05](../revision5/COVERAGE.md) รอบนี้ปรับโครง UX อย่างละเอียดที่บันทึกงาน ตาราง และนำเข้าตาราง ส่วนวัสดุ สี และ motion ใช้ร่วมทั้งเว็บ ไม่ถือว่าทุก backend flow ถูกย้ายหรือแก้แล้ว

| กลุ่มงาน | รอบนี้ทำอะไร | ขอบเขต |
|---|---|---|
| App shell / navigation | desktop workspace เดียว, mobile tabs 5 รายการเหมือนกันทุกบทบาท, role-aware menu | local prototype |
| Record / manual / Quick Log | 3 คอลัมน์ Desktop, 2 คอลัมน์ Mobile, draft และบริบทตาราง | คง Smart, Account 5, Software 6 และการบันทึกแทน |
| Worklogs | shared materials/motion, list/detail/sheet และ focus | คง filter/edit/multi-delete/undo จาก baseline |
| ตารางรวม | recurring class + DL + สอบรายวิชา, room/type/week filters, proportional grid และ agenda | มีวันอาทิตย์เมื่อมีรายการ, overlap lanes ไม่ทับกันจาก chain |
| ฟอร์มตาราง | ช่วงมีผลของตารางเรียน, class/DL ตรวจห้องชนข้ามประเภท | ตัวอย่างในหน่วยความจำ; ไม่ใช่ transaction ฝั่ง server |
| DL manager | เวลา explicit, 75 คนต่อรอบใน sample, 3 ผู้คุม, CEM และรอบเย็น | คง flow เดิมพร้อม motion ใหม่ |
| Schedule import | linked source/queue/editor, draft, validation, reviewed flags, duplicates/conflicts และ summary | **ไม่มี PDF parser/OCR** ภาพต้นฉบับสร้างจาก sample เดียวกับแถว |
| Registry / resources / usage / condition | shared materials, สี borrowed เป็น blue และ damaged ของ seed ตรงกับ return history | stable IDs/realtime ใน production ยังเป็นงานถัดไป |
| Dashboard / Staff / Profile | FY ทุกเดือน, finite chart coordinates, current FY ไม่สร้างเดือนอนาคตเป็นศูนย์ | Profile ยังคง top 8 minorTask; ไม่อ้างคะแนนคุณภาพบุคลากร |
| Export / approvals / users / templates | ใช้ motion และวัสดุร่วม คง validation/confirm ที่มีอยู่ | ไม่เปลี่ยน Auth identity หรือส่งออกข้อมูลจริง |
| Broadcast / notifications | anchored menu, draft/preview, badge และ toast | ไม่มีการส่งจริงหรือขอ notification permission |
| Settings / help / auth / system tools | responsive shell/motion และ Reduce Motion | settings enforcement, auth, cleanup/audit จริงยัง pending |

## Sample import และการจัดการ conflict

- ใช้โครงตารางเรียน 25 บล็อกใน 4 ห้อง (9/7/2/7) และ DL 18 รอบ/9 วัน เป็นข้อมูลสังเคราะห์ ไม่มีชื่อจริงเป็น fixture
- ตัวอย่าง 3 รายการมี review flag เพื่อทดลองตรวจทาน ไม่ใช่ค่า confidence ที่วัดจาก OCR
- แถวที่กำลังแก้เก็บ draft ก่อนเปลี่ยนแถวหรือไป summary ถ้าวัน/เวลาหรือข้อมูลไม่ถูกต้องจะอยู่หน้าเดิมพร้อมเหตุผล
- ผู้คุม DL เก็บ ID ที่เลือกไว้และนำชื่อจาก ID ชุดนั้นไปสร้างรายการ ไม่แทนด้วย A/C/E ตายตัว
- ปฏิทินต้นฉบับจำลองและ editor ใช้แถวเดียวกัน สำหรับ DL แสดงตารางตามวันที่เพื่อไม่ให้รอบหลายสัปดาห์ซ้อนตำแหน่งกัน
- Seed เดิมมีตารางชนกับ sample 6 รายการ (2 ชนตารางเรียน + 4 ชน DL) หลังตรวจครบจะเพิ่มได้ 19 จาก 25 และพัก 6 ไว้ ผู้ใช้ต้องรับทราบก่อนยืนยัน ไม่เขียนทับตารางเดิม
- Duplicate ข้ามโดยไม่เพิ่มซ้ำ ผลลัพธ์บอกจำนวนที่เพิ่ม/ซ้ำ/พัก/เลือกข้ามแยกกัน กดกลับไปดูตารางรวมได้
- ช่องสีเทา “งดให้บริการ” เป็นข้อมูลประกอบ ไม่ใช้สร้างข้อห้ามเพิ่มตารางเรียน
- ไม่เติมวันสิ้นสุด ป.ตรีที่ผู้ใช้ยังไม่ยืนยันเอง ปุ่มช่วงตัวอย่างระบุชัดว่าเป็น sample
- Recurring exceptions/วันหยุด/ยกเลิกเฉพาะครั้ง, confidence extraction, name matching กับบัญชีจริง และ concurrent commit ยังต้องกำหนดและพัฒนาในเฟส implementation

## สิ่งที่ยังไม่อ้างว่าผ่าน

ผล Edge เป็นการตรวจ HTML prototype บน Desktop/Mobile viewport ไม่ใช่ device UAT ผล WebKit ยัง not verified เพราะ matching engine ไม่มีในเครื่อง ยังต้อง Safari/iOS/VoiceOver, zoom/contrast กับเอกสารจริง และ performance บนเครื่องของทีม

Production issues จาก audit ได้แก่ registry hardcoding, UTC date conversion, เวลา DL หลายชุด, settings consumer และความหมายของ metrics ยังไม่ได้แก้ใน source production รอบนี้ ต้องแก้พร้อม tests และ environment แยกในเฟสถัดไป

ไม่มี package install, Firebase write, migration, push หรือ deploy และยังไม่อัปเดต Figma รอบนี้
