# Figma review: หน้าบันทึกงาน

วันที่ 1 พฤศจิกายน 2569 · branch `codex/ux-redesign-phase1`

[เปิดไฟล์ labboy Workload — macOS HIG Design Review](https://www.figma.com/design/aVicg4a7OqVnYZiGS31lus?node-id=8-134)

ผู้ใช้อนุมัติทิศทางต้นแบบ revision2 และให้ทำแบบใน Figma ต่อ เฟสนี้ส่งมอบหน้าบันทึกงานและสถานะประกอบเพื่อการตรวจแบบ ยังไม่ใช่การอนุมัติ implementation หรือ redesign ทั้งระบบ

## แบบที่สร้างแล้ว

| Frame | ขนาด | ลิงก์ |
| --- | --- | --- |
| Desktop / Light | 1440 × 1240 | [เปิด](https://www.figma.com/design/aVicg4a7OqVnYZiGS31lus?node-id=8-134) |
| Desktop / Dark | 1440 × 1240 | [เปิด](https://www.figma.com/design/aVicg4a7OqVnYZiGS31lus?node-id=8-340) |
| Mobile / Light | 390 × 844 | [เปิด](https://www.figma.com/design/aVicg4a7OqVnYZiGS31lus?node-id=8-546) |
| Mobile / Dark | 390 × 844 | [เปิด](https://www.figma.com/design/aVicg4a7OqVnYZiGS31lus?node-id=8-751) |
| Equipment picker / Light | 390 × 844 | [เปิด](https://www.figma.com/design/aVicg4a7OqVnYZiGS31lus?node-id=8-956) |
| Equipment picker / Dark | 390 × 844 | [เปิด](https://www.figma.com/design/aVicg4a7OqVnYZiGS31lus?node-id=8-1199) |
| Confirmation / Light | 390 × 844 | [เปิด](https://www.figma.com/design/aVicg4a7OqVnYZiGS31lus?node-id=8-1442) |
| Confirmation / Dark | 390 × 844 | [เปิด](https://www.figma.com/design/aVicg4a7OqVnYZiGS31lus?node-id=9-513) |

ข้อความและ vector แก้ไขได้ ใช้ Auto Layout, local component instances และ semantic variables มี bitmap เฉพาะโลโก้ในแต่ละหน้าจอ แบบอ้างอิงหลักคือ revision2 ซึ่งออกแบบหลังตรวจเว็บที่ผู้ใช้ล็อกอินอยู่จริง ใช้ IBM Plex Sans Thai ให้ต่อเนื่องกับแอปเดิม

คงพื้นฟ้า–มิ้นต์ แถบนำทางด้านบน ปฏิทินคู่พื้นที่บันทึกบน desktop และยกพื้นที่บันทึกขึ้นก่อนบน mobile ออกแบบ Light/Dark ให้ครอบคลุมพื้นที่เนื้อหาและ dialog พร้อมเลือกอุปกรณ์ตามชิ้นและตรวจ Combo ก่อนยืนยัน

Prototype reactions ที่สร้างไว้: สลับ Light/Dark บนหน้าหลัก, เปิด equipment picker/Combo บน mobile, ปิดหรือยืนยันเพื่อกลับหน้าหลัก เป็น navigation demo; ปุ่มและฟอร์มทั้งหมดไม่ได้ทำงานเหมือนระบบจริง และยังไม่ได้ทดสอบ interaction ใน Figma Present ครบทุกลิงก์

## หลักฐานและขอบเขตการตรวจ

- อ่านโครงสร้างหลังสร้าง ได้ frame IDs, component IDs, font families และขนาด bitmap; เก็บ ledger ใน `output/figma/`
- ตรวจภาพหลังประกอบและแก้สี preview/export ที่ไม่ตรงกับ variable aliases, ไอคอนอุปกรณ์, badge Combo, ความสูงการ์ด และเวลาปลายปฏิทินที่ถูกตัด
- ภาพสุดท้ายผ่านการตรวจ desktop Light และ mobile Dark ผ่าน MCP; ตรวจ desktop Dark และ equipment Light/Dark กับ confirmation Dark ผ่านหน้า Figma โดยตรง
- [ภาพหลักฐานหน้า Figma](../../../../output/figma/equipment-review.jpg)
- [ภาพ desktop/mobile](../../../../output/figma/desktop-mobile-review.jpg)
- ตรวจ syntax ของ JavaScript สำหรับ Plugin API ด้วย AsyncFunction โดยไม่ execute และ parse JSON ledger ทั้ง 3 ไฟล์ผ่านแล้ว
- Functional/responsive/contrast checks 7/7 เป็นผลของ HTML revision2 ตาม README ไม่ใช่ผลทดสอบ Figma หรือแอป production
- ไม่ได้รัน unit tests ของแอปซ้ำ เนื่องจากไม่มี runtime source เปลี่ยน; baseline ที่บันทึกไว้เดิม 217 ผ่าน/8 ล้มเหลว
- ตัวเลขอุปกรณ์และบุคลากรเป็นข้อมูลสังเคราะห์ รอบเย็นเป็นตัวอย่าง requirement ใหม่ รูปต้นทางไม่ได้ระบุรอบเย็น

## ข้อจำกัดที่พบจริง

1. ค้นพบ macOS 27 library แต่การ import components ถูกปฏิเสธด้วยสิทธิ์ของ library จึงสร้าง local labboy components; ไม่อ้างว่าใช้ Apple components โดยตรงหรือผ่านการรับรองจาก Apple
2. แผน Starter อนุญาตหนึ่ง mode ต่อ collection จึงแยก Light/Dark collections โดยคงชื่อ semantic tokens ให้สัมพันธ์กัน
3. ระหว่างตรวจรายละเอียด Figma MCP แจ้งถึงขีดจำกัดแผน Starter จึงเปลี่ยนไปตรวจด้วย browser ซึ่งอยู่ในสถานะ anonymous/view-only ไม่ได้เปลี่ยนแผนหรือสิทธิ์
4. Source capture frame `3:2` ชื่อ `labboy · บันทึกงาน — Design review 02` ยังอยู่ทางซ้ายเป็น reference นอก 8 deliverable frames ต้องเก็บกวาดและทำ final structural/reaction audit เมื่อ MCP กลับมาใช้งานได้ ไม่ถือว่า cleanup และ QA ทั้งหมดเสร็จแล้ว
5. ยังไม่มีผล UAT จากทีม 8 คน, Safari/iOS จริง หรือหลักฐานว่าใช้เวลาน้อยลง ต้องตรวจความเข้าใจ การเลือกชิ้น/คืน และความหนาแน่นข้อมูลก่อนนำไปพัฒนา

## การทำซ้ำและงานต่อ

`figma-build.js`, `figma-refine.js`, `figma-finalize.js` เป็นบันทึก JavaScript สำหรับ Figma Plugin API ผ่าน `use_figma` ไม่ใช่ Node runtime scripts ขั้น refinement อ้าง ID ของไฟล์นี้ ไม่ควรรันซ้ำโดยไม่ตรวจ state และไม่ควรใช้ script สร้างใหม่ทับงานที่แก้ด้วยมือ

เมื่อตรวจแบบแล้ว ให้เสนอ implementation plan และรอ Tech Lead อนุมัติเฟสถัดไป ขอบเขตอื่นยังอยู่ใน backlog: อุปกรณ์/Quick Log sync, นำเข้าตาราง DL จากรูปพร้อมตรวจทาน, ตารางเรียน, สถิติการยืม และ Staff Analytics ตามปีงบประมาณ การแก้ข้อมูลจริง migration, dependency, push และ deploy ต้องอนุมัติแยกตามแนวทางโครงการ
