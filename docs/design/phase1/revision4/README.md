# UI review 04 — Materials และความครอบคลุมฟังก์ชัน

วันที่ตรวจ: 2 พฤศจิกายน 2569 · Branch `codex/ux-redesign-phase1`

รอบนี้ตอบข้อเสนอของ Tech Lead ให้เพิ่มความรู้สึก Liquid Glass แก้สีที่ไม่สัมพันธ์กัน และตรวจฟังก์ชันกับเว็บเดิมที่เปิดใช้งานจริงก่อนออกแบบเพิ่ม ยังอยู่ในเฟสออกแบบและรอตรวจรับ ไม่ใช่ implementation ของระบบจริง

## เปิดตรวจ

- [ต้นแบบที่กดใช้งานได้](index.html#/record)
- [บอร์ดรวม 30 มุมมอง](gallery.html) เลือก Desktop/Mobile และ Light/Dark แล้วกดแสดงครบทุกหน้า
- [รายการเทียบกับเว็บเดิมและช่องว่างที่เหลือ](COVERAGE.md)
- [สถานะ Figma](FIGMA_STATUS.md)

เปิดไฟล์โดยตรงได้ หรือใช้ `node docs/design/phase1/revision4/serve.cjs` แล้วเปิด `http://127.0.0.1:4194/` Server รับเฉพาะ localhost และให้บริการเฉพาะไฟล์ต้นแบบ/ภาพที่กำหนด ไม่ให้เรียกฐานข้อมูลหรืออ่านไฟล์อื่นใน repo

กดปุ่ม ⌘ มุมล่างซ้ายเพื่อเปลี่ยนบทบาท/สถานะข้อมูลสำหรับตรวจแบบ และใช้ Ctrl/Cmd+K เปิดเมนูทุกหน้า การเปลี่ยนข้อมูลอยู่ในหน่วยความจำ เมื่อ reload จะกลับเป็นข้อมูลเริ่มต้น ทุกบุคคลเป็นข้อมูลสังเคราะห์ A–H และ `example.invalid`

## สิ่งที่เปลี่ยนด้าน UI

- ใช้พื้นผิวกลาง ขาว/กราไฟต์ แทนการกระจายฟ้า ม่วง เขียวตามการ์ด สีฟ้าใช้กับคำสั่งสำคัญและข้อมูลที่เลือก สีสถานะมีข้อความกำกับเสมอ
- เพิ่ม Glass ใน navigation, แถบเครื่องมือ, search, segmented controls, ปุ่มคำสั่งรอง, settings sidebar, selection bar และส่วนหัว/ท้าย dialog พื้นเนื้อหา ตาราง และฟอร์มใช้วัสดุที่ทึบกว่าเพื่ออ่านชัด
- วัสดุประกอบด้วยชั้นโปร่ง สีจากพื้นหลัง blur ขอบสะท้อน และเงาระยะยก แยก selected/hover/focus/disabled ทั้งสองธีม เป็นการประมาณด้วย CSS ไม่ใช่ native Liquid Glass renderer หรือการรับรองจาก Apple
- Desktop ใช้ popover ที่สัมพันธ์กับตำแหน่งควบคุม; Mobile ใช้ bottom sheet และ floating tab bar พร้อมพื้นที่ท้ายเนื้อหาไม่ถูกแถบทับ
- มี System/Light/Dark, วัสดุทึบ, reduced motion, focus-visible, dialog focus trap และ fallback ตาม `prefers-contrast`/`prefers-reduced-transparency` ที่ browser รองรับ ยังต้องตรวจ VoiceOver และ Safari จริง

## ฟังก์ชันที่เพิ่มกลับจากการตรวจเว็บเดิม

รายละเอียดอยู่ใน COVERAGE รวมถึง Combo บัญชี 5/Software 6 แบบเลือกงาน, หน้าห้องและอุปกรณ์/Barcode/Item No., ค้นหัวข้อรองและงานหลักอัตโนมัติ, ประวัติงานปฏิทิน/รายการ/แก้ไข/เลือกหลายรายการ, Staff Analytics รายคน 6 มิติและปีงบ/เดือน, คำขอส่งออกและเหตุผลไม่อนุมัติ, นำเข้า worklog แบบ TSV แยกจากรูปตาราง DL, ชนิดผู้เข้าสอบ/CEM/หมายเหตุ, เทมเพลตที่อัปเดต Quick Log, ประกาศหลายช่องทาง และการแจ้งเตือน

คง Profile Radar เป็น 8 `minorTask` ที่ใช้บ่อยตาม AGENTS.md แยกจาก radar 6 มิติของ Staff Analytics ใช้เพื่อวางแผนงาน ไม่ตีความว่าเป็นคะแนนคุณภาพบุคลากร

สำหรับตารางจากรูป: 75 คนหมายถึงต่อรอบ และผู้คุมสอบ 3 คนตามที่ผู้ใช้ยืนยัน รอบเย็นใหม่เป็น 17:00–18:30 ส่วนรอบเดิมเก็บ start/end ชัดเจน ไม่เปลี่ยน 15:00–16:00 ให้เป็นช่วงใหม่จากชื่อรอบเพียงอย่างเดียว

## หลักฐานตรวจสอบ

ใช้ Playwright/Edge ที่มีอยู่ในเครื่อง ไม่ติดตั้งแพ็กเกจ:

```powershell
node docs/design/phase1/revision4/verify.cjs C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
node docs/design/phase1/revision4/review-boards.cjs C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
```

- 30 มุมมอง × Desktop 1440/Mobile 390 × Light/Dark = 120 render checks พร้อมภาพ
- ทดสอบความกว้าง 375/760/768/1024 อีก 120 route-width checks
- 22 interaction scenarios ผ่าน รวม shared equipment state, Combo, CRUD/undo worklog, FY boundaries, schedules, approval/own-only CSV, TSV dedupe, role views, offline และ keyboard
- ไม่มี browser runtime errors ในชุดตรวจ; request ภายนอกมีเฉพาะ Google Fonts ไม่เรียก Firebase/API จริง
- ผลอยู่ที่ `output/playwright/ux-phase1/revision4/report.json` และภาพในโฟลเดอร์เดียวกัน
- Source ของ production ไม่เปลี่ยน จึงไม่ได้รัน application suite ซ้ำ และไม่ได้อ้างว่า app baseline ที่เคยมี 8 failures หายแล้ว

ผลทดสอบต้นแบบไม่แทน integration test: OCR, persistence, rules/RBAC, live aggregates, scheduler และการบังคับ security settings ยังไม่ได้พัฒนาในรอบนี้ กราฟเวลา/ภาคเรียนบางส่วนเป็นภาพสาธิตคงที่ มีข้อความกำกับในต้นแบบ

## แหล่งอ้างอิงและการตรวจจริง

- เปิดคลิกเว็บเดิมที่ผู้ใช้เปิดอยู่: `/admin/record`, `/worklogs`, `/dashboard`, `/admin/staff-analytics`, `/admin/system`, `/export`, `/admin/users`, `/admin/equipment-health`, `/admin/equipment-items`, profile/settings และแผง notification/version ไม่กดบันทึก ส่งประกาศ อนุมัติ หรือลบข้อมูลจริง
- ตรวจ source ที่เกี่ยวข้อง เช่น `frontend/lib/commentSuggestions.js`, `frontend/lib/worklogUtils.js`, `frontend/lib/quickLogTemplates.js` โดยไม่อ่าน credentials
- ตรวจภาพและคำอธิบายจากหน้า [macOS 27](https://www.apple.com/os/macos/) และ [iOS 27](https://www.apple.com/os/ios/): neutral tool capsules และแยกชั้นควบคุมจากเนื้อหา
- [Apple HIG: Materials](https://developer.apple.com/design/human-interface-guidelines/materials): Liquid Glass สำหรับ controls/navigation โดยให้ regular material อ่านข้อความได้ชัด
- [Apple HIG: Color](https://developer.apple.com/design/human-interface-guidelines/color): ใช้สีอย่างมีความหมายและจำกัด ไม่ระบาย accent ทั่วพื้นผิวแก้ว

## ขั้นต่อไปหลังตรวจรับแบบ

ตรวจความหนาแน่น/ความอ่านง่ายของหน้างานจริงทั้งสองอุปกรณ์ และรายการที่ยังเป็น partial ใน COVERAGE ก่อนเลือกงาน implementation เป็นชุด: shared equipment/template data, FY analytics, DL image review และ schedules การประเมิน DSR ควรวัดเวลา ความผิดพลาด และจำนวนขั้นตอนเทียบระบบเดิม ไม่สรุปผลจากความสวยหรือ screenshot เพียงอย่างเดียว
