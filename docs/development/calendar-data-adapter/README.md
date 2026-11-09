# ตัวแปลงข้อมูลปฏิทิน — Develop แบบไม่เชื่อมบริการ

Branch `codex/calendar-data-adapter` ต่อจาก `fde9282` เฟสนี้ใช้เอกสารสังเคราะห์รูปแบบเดียวกับโค้ดเดิม ไม่เปิด Firebase Console/CLI ไม่ใช้บัญชีจริง ไม่เพิ่มแพ็กเกจ ไม่แก้ rules/hooks/production routes และไม่ push/deploy

## วิธีตรวจ

เปิด [ปฏิทิน Develop](https://northwest-revised-domains-varies.trycloudflare.com/dev/calendar) แล้วเลือก **ข้อมูลเดิมจำลอง** ข้างชุดตัวอย่างและพื้นที่ทดลองนำเข้า ข้อมูลและ Undo ของทั้งสามชุดแยกกัน คงแบบปฏิทินและ controls เดิม

- วันที่ 3 พ.ย. 2569 มีรอบ 09:00–10:30 และ 17:00–18:30 ผู้คุมใช้ ID จาก directory จำลอง
- วันที่ 4 พ.ย. มีรายการเก่าเวลา 15:00–16:00 แม้ชื่อรอบเป็น `evening` ยังคงเวลาที่เก็บไว้ ไม่เปลี่ยนประวัติเป็น 17:00
- ตารางเรียนจำลองห้อง 401 วันจันทร์ 08:00–10:00 มีวันเริ่ม/สิ้นสุดที่กำหนดให้เอกสารนั้นอย่างชัดเจน
- ทดลองแก้ไข/นำเข้า PDF หรือภาพ DL และ Undo ได้ในหน่วยความจำ รีเฟรชแล้วข้อมูลทดลองหาย
- เปิด **ตัวเลือกตรวจแบบ · Development → ตรวจการแก้ไขกับรูปแบบข้อมูลเดิม** เพื่อดูผล dry-run ของรายการที่เปลี่ยนเทียบกับ snapshot เริ่มต้น ไม่ส่งคำสั่งไปฐานข้อมูล เมื่อไม่เปลี่ยนข้อมูลต้องเป็น 0 คำสั่ง การแก้เฉพาะ metadata ของ view ต้องไม่เพิ่มคำสั่งเช่นกัน
- รายชื่อชั่วคราวยังใช้ทดลองนำเข้าได้ แต่ dry-run สำหรับการบันทึกจริงจะถูกกันไว้จนกว่าจะเลือก ID จาก directory และระบุประเภทผู้สอบให้ครบ ฟอร์ม DL preview เดิมยังไม่ได้เพิ่มตัวเลือกประเภทผู้สอบในเฟสนี้ ไม่เติมว่าเป็นบุคลากรหรือนักศึกษาให้อัตโนมัติ

จำนวน “โหลดชุดเอกสารจำลอง 1 ครั้ง” ใน inspector เป็นจำนวนการเรียก loader สังเคราะห์ ไม่ใช่จำนวน billed Firestore reads และไม่ใช่หลักฐานค่าใช้จ่ายจริง

## สิ่งที่ตรวจพบใน repo และการแปลง

| ข้อมูลเดิม | ข้อมูลสำหรับปฏิทินใหม่ | การป้องกันข้อมูลคลาดเคลื่อน |
|---|---|---|
| `classroomSchedules`: `room`, `dayOfWeek`, `startTime/endTime`, `subject` | `rules`: `rooms`, weekday จันทร์ = 0, `start/end`, `title` | แปลงครบทั้ง 7 วัน รักษา source collection/document ID |
| ตารางเรียนเก่าไม่ได้กำหนดช่วงภาคเรียนครบในฟอร์ม | `validFrom/validTo` ของแต่ละ rule | ต้องมีในเอกสารหรือกำหนด `boundsById` อย่างชัดเจน ไม่ขยายเป็นตารางตลอดไปหรือเดาจากภาคเรียน |
| `dlExamSchedules`: `locations` หรือ `location` | `events.rooms` | แปลงห้องที่รองรับทั้งหมด หากมี CEM/ห้องอื่นที่ UI ไม่รองรับ แจ้งปัญหาและไม่แสดงรายการนั้น ไม่ตัดห้องทิ้งเงียบ ๆ |
| `startTime/endTime` และ `timeSlot` ที่โค้ดเดิมใช้ไม่ตรงกัน | `start/end` | คู่เวลาที่บันทึกจริงมาก่อน label เสมอ ถ้าไม่ครบไม่เติมจาก slot หากไม่มีทั้งคู่ยอมรับ `timesById` ที่ผู้ตรวจระบุเป็นรายเอกสาร พร้อม warning |
| `proctors`: string ID หรือ object `id/userId` | ID ใน `people` และ `events.proctors` | ต้องตรง directory ของ staff/admin/superadmin ไม่จับคู่ชื่อคล้ายกัน ไม่เปลี่ยนชื่อเป็น UID และไม่ให้ ID ซ้ำในรอบเดียว |
| `users`: `displayName`, `nickname`, `name` | label และ identity จาก directory | ใช้ลำดับ displayName → nickname → name โดย ID เป็นตัวตัดสินตัวบุคคล ไม่ใช้ label เป็น key |
| `studentCount`, `examType`, `isActive` | `participants`, ประเภทผู้สอบ และสถานะ | จำนวนต้องเป็นจำนวนเต็ม วันเป็น date-only ถูกต้อง ไม่แสดงรายการที่หยุดใช้ |

เอกสารจากคนละ collection ใช้ namespace ของ ID ต่างกัน แม้ document ID เหมือนกัน ไม่ trim หรือเปลี่ยน identifier ของเอกสารเดิม

`adaptCalendarDocuments` ส่งกลับข้อมูลที่แปลงได้พร้อม issues/warnings และ `complete` หากมีปัญหา UI แจ้งว่ามีรายการยังไม่แสดงและปิดการแก้ไขชุดนั้น เพื่อไม่ให้ตีความปฏิทินไม่ครบว่าไม่มีรายการชน

## ขอบเขตของ dry-run และ cache

`planCalendarDocumentChanges` สร้างเฉพาะคำอธิบาย `create/update/delete` พร้อม reference/payload หากมีปัญหาในชุดจะไม่คืนบางคำสั่งให้ไปทำต่อ ไม่ใช่ Firebase writer, authorization enforcement, transaction หรือการรับประกันป้องกันคนสองคนบันทึกพร้อมกัน

- การแก้เอกสารเดิมต้องรักษา reference เดิม ห้ามเปลี่ยนไป collection/เอกสารอื่น รายการใหม่ใช้ client ID ชั่วคราว ยังไม่ได้จัดสรร Firestore document ID
- payload เก็บเวลาเริ่ม/สิ้นสุดจริง ชื่อวิชา/สอบ จำนวนคน ประเภทผู้สอบ และช่วงวันที่ ไม่รวม metadata ของ view
- การลบอิงพฤติกรรม hook เดิม: ตารางเรียนเป็น delete ส่วน DL เป็น update `isActive:false` ยังไม่มีการดำเนินการจริง
- จำกัด role ในแผนจำลองเป็น Admin/Superadmin และตรวจ ID ผู้คุมจาก directory การตรวจนี้ไม่ทดแทน Auth/Rules ฝั่งบริการ
- `createCalendarDocumentCache` รับ loader ผ่าน dependency injection โหลดซ้ำซ้อนพร้อมกันเป็นครั้งเดียว ใช้ snapshot ที่ freeze แล้ว กรองช่วงวันในหน่วยความจำ โหลดใหม่หลัง invalidate อย่างชัดเจน และไม่ให้ response เก่าทับ cache ใหม่เมื่อ invalidate ระหว่างโหลด
- cache นี้ใช้เฉพาะ fixture ในแท็บ ไม่เก็บชื่อ/ตารางใน Web Storage การเปลี่ยนบัญชี/สิทธิ์ในระบบจริงต้องออกแบบขอบเขต cache และ invalidate เพิ่มก่อนเชื่อมบริการ

## ผลตรวจ

หลักฐานอยู่ใน `output/playwright/calendar-data-adapter/`

- Full unit **446 ผ่าน** รวม adapter ใหม่ **38 ข้อ**: mapping/วัน/เวลา/ภาคเรียน/UID/ข้อมูลไม่ครบ, provenance, payload round-trip, no-op, role guard, atomic planning, PDF/DL planner integration, range/cache/concurrent load/failure/stale response
- Browser Chrome localhost และ Edge ผ่าน Cloudflare อย่างละ **6 กลุ่ม**: desktop 1440 light / touch 390 dark, เวลาเก่าและเวลาเย็นใหม่, ชื่อผู้คุม, edit/no-op/Undo, PDF/worker และ OCR ภาพจริงสังเคราะห์, dry-run สองตารางเรียน, guard ชื่อชั่วคราว, Staff และชุดข้อมูลแยก
- เปลี่ยนวัน/สัปดาห์/เดือน/รายการ และ Next navigation แล้ว loader จำลองยังถูกเรียกเพียง 1 ครั้ง ไม่พบ page errors, origin ภายนอก หรือ HTTP write requests ใน browser flows
- Regression ปฏิทินเดิม **11 กลุ่ม**, PDF **4 viewport/theme cases**, DL image **7 กลุ่ม**, targeted ESLint และ compatibility build แยก output ผ่าน ไม่ render fixture workspace ใน production export
- จัดรูปแบบไฟล์ใหม่ 4 ไฟล์ด้วย Babel ที่ติดมากับ Next และเปรียบเทียบ AST ก่อน/หลังว่าไม่เปลี่ยน ไม่ติดตั้ง formatter เพิ่ม
- Touch Chromium emulation ไม่ใช่ UAT ของ Safari/iPhone/Android เครื่องจริง

## งานที่ยังไม่อยู่ในเฟสนี้

ยังไม่เชื่อมข้อมูลจริง ไม่ยืนยัน Firestore edition/schema/index/Rules ที่ deploy อยู่ และไม่อ้างว่า all-pages-ready หรือพร้อม production

ก่อนต่อ writer จริงต้องแก้ consumer เดิมให้ใช้ explicit time และช่วงวันที่ด้วย ปัจจุบัน `TodayRoomSchedule` ยังใช้ slot map ของตัวเอง ขณะที่ `DLExamManager` สมมติว่ารอบอยู่ในรายการตายตัว ส่วนตารางเรียนเดิมบาง consumer ยังไม่ตรวจ validFrom/validTo ดังนั้น payload ที่ผ่าน dry-run ไม่ได้แปลว่า UI production เดิมทั้งหมดรองรับแล้ว

ขั้นถัดไปหลังผู้ใช้ตรวจเฟสนี้: กำหนด read-only integration ในสภาพแวดล้อมทดสอบ พร้อมยืนยันแหล่งรายชื่อ/UID, ช่วงภาคเรียนของเอกสารเก่า, ประเภทผู้สอบ, Firestore edition และสิทธิ์เข้าถึง ก่อนเขียน SDK queries/Rules/writer จริงแยกเฟส การทดสอบกับข้อมูลสังเคราะห์ยังไม่ยืนยันข้อมูลจริงเหล่านี้
