# Dock navigation และชุดไอคอน — Develop pilot

Branch `codex/dock-navigation-pilot` · ฐาน `845bf84` · 9 พฤศจิกายน 2569

**แบบล่าสุด:** [Dock ตามเมาส์และ Launchpad เต็มพื้นที่เว็บ](LAUNCHPAD.md) แทนรายการเครื่องมือใน modal ของเฟสก่อน

ปรับการเคลื่อนไหวต่อใน [Dock motion pass](MOTION.md): spring magnification, ไอคอนข้างเคียงเลื่อนรับกัน และหน้าเครื่องมือใช้ชุดไอคอนเดียวกับ Dock

เปิด [หน้าบันทึกงาน](https://northwest-revised-domains-varies.trycloudflare.com/dev/record) หรือ [ปฏิทิน](https://northwest-revised-domains-varies.trycloudflare.com/dev/calendar) เพื่อทดลอง ลิงก์ใช้ได้ขณะเครื่อง develop และ tunnel ทำงาน

## ขอบเขตที่ส่งตรวจ

- PC ใช้ Dock กระจกด้านซ้าย พร้อม 5 ปลายทางหลัก: บันทึกงาน ประวัติงาน ตาราง ทรัพยากร ภาพรวม และปุ่มเครื่องมือ/การแสดงผล/บัญชี
- ใช้ QuickLiquid A เดิมเป็นชั้นตกแต่งของ Dock เพิ่ม 1 engine ลิงก์และปุ่มจริงเป็น native controls อยู่นอก optical layer ไม่มีการติดตั้งแพ็กเกจเพิ่ม
- ไอคอน Dock มีพื้นสีและมิติ ขนาด tile 46px / glyph 27px ที่ขนาดปกติ เป้าหมายกดอย่างน้อย 44px ปรับตามความสูงหน้าต่าง
- ปรับ glyph บันทึกงานเป็นกระดาษ/ปากกา ประวัติเป็นรายการ/นาฬิกา ทรัพยากรเป็นหมวดรวม และวิเคราะห์บุคลากรแยกจากจัดการผู้ใช้ หูฟังใน Quick Log และหน้าทรัพยากรยังใช้รูปหูฟังผ่านชื่อ symbol เฉพาะ ชุดนี้เป็น SVG ของโครงการ
- Hover ขยาย tile และเพื่อนบ้านอย่างพอดีผ่าน transform โดยเว้นพื้นที่เนื้อหาไว้ ป้ายชื่อใช้ portal จึงไม่ถูกตัดเมื่อ Dock ต้องเลื่อนในหน้าต่างเตี้ย ป้ายชื่อมี animation และแสดงเมื่อ focus ด้วย
- Tab, Enter, Arrow Up/Down, Home/End และ Escape ใช้งานได้ โดย native anchors ยังคงรองรับเปิดแท็บใหม่/modified click
- มือถือคง 4 tabs พร้อมชื่อเดิม ใช้ glyph ชุดที่ปรับแล้ว ไม่มี magnification จาก touch
- รองรับ light/dark, ลด motion, ลด transparency และ forced colors โหมดลดการเคลื่อนไหวปิด magnification/animation ป้ายชื่อ

## สลับกลับและขอบเขตข้อมูล

ที่ **รูปแบบการแสดงผล → เมนูบนคอมพิวเตอร์ · Develop** เลือก **Sidebar แบบเดิม** หรือ **Dock ลอยตัว** ได้ โดย draft ในหน้าปัจจุบันยังอยู่ บันทึกเฉพาะ display preference ใน browser เดิม เก็บค่า theme/background/material/motion เดิมครบ และรองรับ preference รุ่นเก่าที่ไม่มี navigation

ค่า `auto` ใช้ Dock ใน develop ส่วน production code path ใช้ Sidebar ไม่มีการเปิด Dock ให้ production อัตโนมัติ ไม่ push/deploy และไม่เชื่อมข้อมูลจริง เมนูเครื่องมือยังกรองตามบทบาทเดิม ข้อนี้เป็นการคง UI role filtering ไม่ใช่ผล audit สิทธิ์ backend

ไม่มี feature route ใหม่ หน้าที่มี feature preview ยัง 9 หน้า เมนูที่ยังไม่ย้ายฟีเจอร์ยังคงสถานะเดิม `all-pages-ready = false` รายละเอียดใน [Coverage](../ui-coverage-history/COVERAGE.md)

## หลักฐานตรวจ

- Unit suite **362/362 ผ่าน** รวมการอ่าน preference รุ่นเก่า/ค่าที่ไม่รองรับ และคงค่าแสดงผลอื่น
- Chrome local / Edge local / Chrome Cloudflare: อย่างละ **36 render checks** (9 routes × 2 viewport × 2 themes) รวม 108 ไม่มี root overflow หรือ page/console/HTTP errors ของเอกสาร/สคริปต์/สไตล์
- Interaction ในแต่ละชุด: สลับ Sidebar/Dock โดยรักษา manual draft, เปลี่ยน record/calendar แบบ Next navigation โดยรักษา draft, tooltip/magnification, keyboard, role-specific tools, หน้าต่างสูง 480px และ reduced motion/solid fallback
- บันทึกงานเดิม **11 กลุ่มผ่านขณะเปิด Dock** รวม room/borrow-return/13-digit ID/Combo/manual/suggestions/Undo และ touch widths 375/390/430/768 จำนวน optical engines ปกติ desktop เพิ่มจาก 2 เป็น 3 และยังตรวจว่าต้องเหลือ 0 เมื่อปิด optics/ใช้ solid/forced colors
- ปฏิทินเดิม **11 กลุ่มผ่านใน Sidebar fallback** เพื่อคง compact sidebar, 4 views, filters, DL 75 คน/รอบเย็น, recurrence, copy และ keyboard
- Native Edge zoom **200% ผ่าน** ใช้ browser profile แยก ไม่ใช้ CSS zoom
- Targeted ESLint และ compatibility export ผ่าน หน้า fixture ไม่ render ใน production export ผลอยู่ใน `output/playwright/dock-navigation-pilot/`

การตรวจหลาย routes ส่วนหนึ่งเป็น render/layout checks ไม่ใช่การทดสอบทุกคำสั่งของทุกฟีเจอร์ Safari/iPhone/Android เครื่องจริงยังต้องให้ทีมทดลอง ไม่มีผลวัด FPS/แบตเตอรี่ จึงไม่อ้างอัตราเฟรมบนมือถือ

## แนวทางที่อ้างอิง

ดูคลิป [Glassy Sidebar V7 ของ code.xr](https://www.instagram.com/reel/Dfe1ilgzcPL/) ผ่าน browser แล้ว นำแนวคิดแถบกระจกลอยตัวมาปรับกับงานของแอป ใช้หลักเรื่องชั้น navigation/เนื้อหาและป้ายชื่อจาก [Apple Sidebars](https://developer.apple.com/design/human-interface-guidelines/sidebars), [Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars) และความสม่ำเสมอ/ความหมายของ [Icons](https://developer.apple.com/design/human-interface-guidelines/icons)

ขั้นต่อไปหลังผู้ใช้ตรวจเฟสนี้: เสนอเฟสนำเข้าตารางสอบ DL จากภาพ โดยคง 75 คนต่อรอบ ผู้คุมตามต้นฉบับ และรอบเย็น 17:00–18:30
