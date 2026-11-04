# Design Review 06 — Glass และ motion สำหรับงานจริง

วันที่ 5 พฤศจิกายน 2569 · Branch `codex/macos27-glass-motion-review-06` · ฐาน Review 05: `5334504`

สถานะ: ต้นแบบ UX/UI ที่ผู้ใช้อนุมัติให้ปรับ app shell, วัสดุ และสาม flow หลัก พร้อมเพิ่ม animation รอบนี้ยังไม่ใช่ production implementation

## เปิดตรวจ

```powershell
node docs/design/phase1/revision6/serve.cjs
```

- [ต้นแบบ](http://127.0.0.1:4196/#/record)
- [บอร์ด 30 มุมมองและวิดีโอ](http://127.0.0.1:4196/gallery.html)
- [Desktop motion](../../../../output/playwright/ux-phase1/revision6/motion-desktop.webm)
- [Mobile motion](../../../../output/playwright/ux-phase1/revision6/motion-mobile.webm)
- [พื้นที่ทดลอง motion / Reduce Motion](http://127.0.0.1:4196/#/design)
- [รายละเอียด motion และวัสดุ](MOTION_SPEC.md), [ความครอบคลุมและข้อจำกัด](COVERAGE.md)

ปุ่ม ⌘ ใช้เปลี่ยนบทบาทและ state สำหรับตรวจแบบ ข้อมูลทั้งหมดเป็นสังเคราะห์ A–H และจะเริ่มใหม่เมื่อ reload ไม่เชื่อมฐานข้อมูล ไม่อ่าน credentials ไม่ส่งข้อความหรือไฟล์จริง

## สิ่งที่เปลี่ยน

1. รวม sidebar และ toolbar เป็น workspace เดียว รักษาพื้นหลังฟ้า–เขียวอ่อนของเว็บเดิม พร้อม Dark Mode เนื้อหาใช้พื้นอ่านชัด ส่วนควบคุมใช้วัสดุโปร่งและขอบเลนส์
2. เพิ่ม rounded SVG rim displacement กับ backdrop ที่ Chromium รองรับ, แสงขอบ และแสงตอบสนองต่อ pointer ใช้ CSS frosted material เป็น fallback ไม่ติดตั้ง Glisse หรือแพ็กเกจอื่น
3. ใช้ selection lens ที่เลื่อนต่อเนื่อง, route transition, anchored menu, desktop dialog, mobile bottom sheet และ toast จังหวะสั้น กดแทรกหรือยกเลิกได้โดยไม่รอ animation จบ
4. หน้าบันทึกงานลดกรอบซ้อน Desktop แสดง Quick Log 3 คอลัมน์กับบริบทตารางด้านข้าง Mobile แสดง 2 คอลัมน์และพับบริบทได้ แถบล่างใช้ บันทึก/ประวัติ/ตาราง/ทรัพยากร/เพิ่มเติม ทุกบทบาท
5. รวมตารางเรียน สอบรายวิชา และ DL ในมุมมองสัปดาห์/รายการ มีตัวกรองห้อง/ประเภท/ภาคเรียน เปิดรายละเอียดแล้วแก้ด้วยฟอร์มตามประเภทเดิม แสดงวันอาทิตย์เมื่อมีรายการ
6. ขั้นตรวจ import เชื่อมแถวกับต้นฉบับจำลอง เก็บ draft ข้ามการเลือกแถว ตรวจรายการที่ต้องยืนยัน แยกข้อมูลซ้ำและเวลาชน พร้อมแสดงรายการที่พักไว้ก่อนยืนยัน
7. แก้ต้นแบบที่พบระหว่าง audit: กราฟมกราคม–กันยายนอ่านปีผิด, all-zero SVG เป็น NaN, เดือนอนาคตแสดงเป็นศูนย์, วันอาทิตย์หาย, ผู้คุม import ถูกแทนด้วยชุดตายตัว และสถานะ damaged ของ seed ไม่ตรงกัน

Glisse ใช้เป็น reference ของวัสดุและ interaction ไม่ใช่ package ที่ติดตั้งในรอบนี้ โค้ด SVG/CSS ในต้นแบบเป็น custom web approximation **ไม่ใช่ native Apple rendering หรือคำรับรองความเหมือน 1:1**

อ้างอิง [Apple HIG Motion](https://developer.apple.com/design/human-interface-guidelines/motion), [Materials](https://developer.apple.com/design/human-interface-guidelines/materials), [Meet Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/219/), [macOS 27 Golden Gate](https://www.apple.com/os/macos/) และ [Glisse](https://glisse.kelvinzhang.ca/) ที่ตรวจในรอบนี้

## ผลตรวจ

- `verify.cjs`: 120 renders = 30 มุมมอง × Desktop/Mobile × Light/Dark และ regression 31 flow รวมการตรวจ 375/760/768/1024 px ดู [report.json](../../../../output/playwright/ux-phase1/revision6/report.json)
- `verify-motion.cjs`: 16 กรณี ตรวจภาพที่วาดจริงของ optics, ตำแหน่ง lens ระหว่างเคลื่อน, การกดต่อเนื่อง, modal interruption/focus, OS/App Reduce Motion, Solid Material, FY ทุกเดือน, Sunday, overlap lanes, draft, UID ผู้คุม และรายการเวลาชน ดู [motion-report.json](../../../../output/playwright/ux-phase1/revision6/motion-report.json)
- `check-tokens.cjs`: 30 semantic text/background pairs บนพื้นทึบผ่าน 4.5:1 ค่าต่ำสุด 5.41:1 ดู [contrast.json](../../../../output/playwright/ux-phase1/revision6/contrast.json) ผลนี้ไม่ครอบคลุมทุก backdrop ของ Glass
- WebKit: **ยังไม่ยืนยัน** matching build ของ runtime ไม่มีในเครื่อง ลอง build เก่าที่มีแล้วไม่จบ จึงหยุด helper โดยไม่ดาวน์โหลดเพิ่ม ดู [webkit-report.json](../../../../output/playwright/ux-phase1/revision6/webkit-report.json)
- วิดีโอเป็นการบันทึก browser ที่กดต้นแบบจริง มี cursor overlay เฉพาะในไฟล์บันทึก ไม่ได้เป็นฟีเจอร์ของแอป

ใช้ Playwright/Edge/ffmpeg ที่มีอยู่แล้ว ไม่มี package install คำสั่งตรวจจากราก repository:

```powershell
node docs/design/phase1/revision6/verify.cjs <existing-playwright-module> <edge-executable>
node docs/design/phase1/revision6/verify-motion.cjs <existing-playwright-module> <edge-executable>
node docs/design/phase1/revision6/check-tokens.cjs
node docs/design/phase1/revision6/record-motion.cjs <existing-playwright-module> <edge-executable>
node docs/design/phase1/revision6/review-boards.cjs <existing-playwright-module> <edge-executable>
```

## ขอบเขตและงานถัดไป

- ไฟล์ Review 03–05 และ source production คงเดิม ต้นแบบยังต่อยอด global functions เพื่อ review ต้องแปลงเป็น shared React components ก่อนใช้จริง
- Import ใช้ตารางสังเคราะห์ ยังไม่ parse PDF/OCR, upload, จับชื่อจริง หรือบันทึก Firestore ข้อผิดพลาดใน production ที่ audit พบยังเป็น backlog
- ยังต้อง UAT บน Safari/iOS, VoiceOver, touch device จริง และ performance กับข้อมูลจริง ไม่อ้าง 60fps จาก headless verification
- ยังไม่อัปเดต Figma และไม่ deploy/push รอบนี้ ให้ Tech Lead ตรวจวิดีโอและกดงานหลักก่อนเสนอเฟส implementation
