# ห้อง ทะเบียน และการใช้งานอุปกรณ์ — Development

UI รอบเก็บรายละเอียด 8 พฤศจิกายน 2569: [รายงานล่าสุด](../resources-ui-refinement/README.md)

7 พฤศจิกายน 2569 · branch `codex/resources-equipment-review` · ฐาน `e651c9e`

เฟสนี้เป็นการย้าย UI ตาม Review 10 และทดสอบด้วยข้อมูลสังเคราะห์ใน repo **ยังไม่เชื่อม Firebase/Auth/backend จริง และยังไม่พร้อม release ทั้งระบบ** ข้อมูลเปลี่ยนใน memory ของแท็บและเริ่มใหม่เมื่อ refresh

## เปิดตรวจ

- ห้องและทรัพยากร: `/dev/resources`
- ทะเบียนอุปกรณ์: `/dev/equipment`
- การใช้งาน / สภาพตอนคืน: `/dev/equipment/usage`
- เปรียบเทียบ Review: `docs/design/phase1/revision7/index.html` — views `resources`, `equipment`, `usage`, `condition`

ทะเบียนและสถิติใช้ Admin/Superadmin ตัวอย่าง เปลี่ยนได้ใน “ตัวเลือกตรวจแบบ · Development” ด้านล่าง ส่วน Staff ดูสถานะและยืม–คืนได้ หน้าเก่าของ production ยังคงแยกจาก preview เหล่านี้

## สิ่งที่เปลี่ยน

- PC ใช้รายการกับแผงรายละเอียดตาม Review; มือถือเปิดรายละเอียดทะเบียนเป็น sheet แล้วจึงแก้ไข ฟอร์มเลื่อนได้และปุ่มบันทึกเข้าถึงได้
- ใช้ WorkspaceFrame, semantic colors, project-owned ReviewSymbol และ QuickLiquid controls ชุดเดิม เนื้อหาหลักเป็นพื้นอ่านง่าย รองรับ Dark/Solid/Reduced Motion/Forced Colors; ไม่ได้แจกไฟล์ SF Symbols ของ Apple หรืออ้างว่าเป็น native macOS
- เพิ่ม/แก้ชื่อ รหัส บาร์โค้ด สังกัด ประเภท ลำดับ สภาพ และสถานะใช้งาน ตรวจรหัสซ้ำข้าม asset code/barcode แบบไม่สนตัวพิมพ์ รวมรายการที่หยุดใช้แล้ว
- ทะเบียน–ทรัพยากร–Quick Log–ประวัติ–สถิติอ่าน ledger เดียวกัน เพิ่มหรือย้ายสังกัดแล้วรายการปัจจุบันเปลี่ยนทันที ไม่ต้อง reload และไม่เปลี่ยน ID ย้อนหลัง
- หยุดใช้งานแทนการลบถาวร เพื่อเก็บประวัติ อุปกรณ์ที่ยังยืมค้างยังคืนได้ แต่ยืมใหม่ไม่ได้ ประเภทเปลี่ยนไม่ได้หลังมีประวัติ resource event
- ยืมใช้เลข ASCII 13 หลักเท่านั้นและ focus ช่องที่ขาด คืนแสดงรหัสผู้ยืมเดิมแบบอ่านอย่างเดียว พร้อมตัวเลือกสภาพตอนคืน
- การเปลี่ยนทะเบียนและบันทึกทรัพยากรรองรับ revision check, request idempotency, จำลอง failure โดยไม่เปลี่ยนข้อมูล, retry และ Undo; คำสั่งทะเบียนและ Undo ทะเบียนจำกัดผู้ดูแลใน adapter จำลอง
- ประวัติอุปกรณ์ใช้ ID ตรงกันพร้อมช่วงวันที่ และยังคง scope Staff ให้เห็นงานตนเอง ไม่มีการเดาชื่อคล้ายกัน

## นิยามข้อมูลที่ไม่ทำให้สรุปเกินหลักฐาน

| ตัววัด / สถานะ | นิยาม |
|---|---|
| ครั้งยืม / ครั้งคืน | จำนวนเหตุการณ์ในช่วงวันที่และผู้ปฏิบัติงานที่เลือก ซึ่งจับคู่ ID ทะเบียนได้ นับแยกกัน |
| กำลังยืมตอนนี้ | สถานะปัจจุบันของทะเบียนที่กรองประเภท/สังกัด ไม่จำกัดช่วงวันที่หรือผู้ปฏิบัติงาน |
| อุปกรณ์ยืมบ่อย | Top 5 ตามครั้งยืม พร้อมรายการทุกชิ้นและเปิดประวัติได้ ไม่มี Health Score หรือ timeline ที่ไม่ได้ใช้ |
| จับคู่ไม่ได้ | เหตุการณ์ยืม/คืนที่ไม่มี ID ตรงกับทะเบียน แสดงแยก ไม่เดาจากชื่อหรือ comment และไม่อ้างสังกัดให้เหตุการณ์เหล่านี้ |
| สังกัดปัจจุบัน | ใช้กรองทะเบียนปัจจุบัน ประวัติใหม่เก็บ `locationAtEvent` และ `assetCodeAtEvent` ของวันทำรายการไว้ต่างหาก |
| สภาพตอนคืนไม่ระบุ | นับเป็น unknown ไม่ใช่ normal และไม่เขียนทับสภาพล่าสุดที่ทราบในทะเบียน |
| คืนชำรุด / สูญหาย | ปิดการยืมและทำให้อุปกรณ์ไม่พร้อมยืม จนผู้ดูแลประเมิน/แก้สภาพใหม่ |

ช่วงเริ่มต้นเป็นรายสัปดาห์ มีรายวัน เดือน ไตรมาส ปีงบประมาณไทย 1 ต.ค.–30 ก.ย. และกำหนดเอง ข้อมูลสังเคราะห์มีน้อยจึงแสดงกราฟเท่าที่ข้อมูลรองรับ ไม่สร้างยอดยืมเพิ่มให้กราฟดูแน่น

## ผลตรวจและหลักฐาน

- ใหม่ 23 unit/synthetic integration tests ผ่าน; รวมกับ ledger/record เดิมเป็น 42 tests ผ่าน
- ทั้งโครงการ 291 tests: ผ่าน 283 และไม่ผ่าน 8 ข้อเดิม ตรง baseline ทุกข้อใน `output/playwright/resources-equipment/baseline-comparison.json` ไม่ได้แก้สูตร analytics/date validation นอกขอบเขต
- E2E ใช้ Next components จริงและ adapter สังเคราะห์ ครอบคลุม Staff guard, เพิ่ม/รหัสซ้ำ/failure/retry, Quick Log เห็นรายการใหม่, ยืม 13 หลัก, ย้ายขณะยืม, หยุดใช้แล้วยังคืนได้, สภาพ unknown, สถิติ/บุคลากร/วันที่, exact history link, Undo และ layout
- ตรวจมือถือ 375/390/430/768px × Light/Dark ทุกหน้าและ tab สภาพ รวมฟอร์มและ detail sheet; ตรวจ keyboard, Reduced Motion, Solid, Forced Colors และ native browser zoom 200%
- Regression เดิม: record 11, history 9, calendar 11 scenarios ผ่าน รายงาน JSON เก็บใน `output/playwright/resources-equipment/regression/` โดยคง screenshots ของเฟสก่อน
- ESLint ที่กำหนดสำหรับส่วนย้าย UI และ syntax scripts ผ่าน; compatibility build แยกใน `frontend/.ui-build-check` ผ่าน และ development fixtures ไม่ render ใน production export
- Edge, Chrome และ Cloudflare public URL ผ่าน 9 scenarios ต่อรอบ ไม่มี page errors หรือ external service requests ในรายงาน
- รายงานเบราว์เซอร์แยก `edge/`, `chrome/`, `public/`; เปิด `report.json` เพื่อตรวจ `completed`, checks และ errors ของแต่ละรอบ หลักฐานอยู่ใต้ `output/playwright/resources-equipment/`

## Coverage ที่ยืนยันได้

Audit มี Next 31 routes รวม dev 7 routes และ feature previews 6 routes เมนู Superadmin เปิด feature preview แยกได้ 6/18 ปลายทาง Review มี 30 views; เฟสนี้เทียบ render/layout เฉพาะ 4 views ที่ย้าย × PC/mobile × Light/Dark = 16 สถานะ ไม่พบ root overflow

**all-pages-ready = false** ภาพรวม, Staff Analytics, profile, templates, system settings และหน้าอื่นนอกตารางนี้ยังไม่ได้ย้าย feature ครบ การที่ shell หรือ reference render ได้ ไม่ได้แปลว่าทุกคำสั่งใช้งานจริงได้

## ข้อจำกัดและขั้นถัดไปที่เสนอ

1. ให้ Tech Lead ตรวจหน้าจอและ flow ตาม [UAT.md](./UAT.md) ก่อนเริ่มเฟสใหม่ Automated acceptance ไม่ใช่ human UAT
2. ยังไม่ตรวจ physical iPhone/Safari, Android, scanner หรืออุปกรณ์จริง Safari ใช้ CSS fallback ตาม material policy ของเฟสก่อน
3. ยังไม่เปิด collection จริงตามคำสั่งผู้ใช้ จึงยังไม่ยืนยัน template/registry mapping และ permission ของบริการจริง ไม่มี Firestore read/write จาก adapter นี้
4. Export สถานะทรัพยากรและรายละเอียดอื่นนอกขอบเขตหลักยังไม่ย้ายครบ; หน้า calendar ยังใช้ fixture อีกชุด ไม่ได้ sync ตารางเข้าสู่ resource ledger และยังไม่มี PDF/OCR importer จริง
5. หลังรับงานเฟสนี้ เสนอทำภาพรวมและ Staff Analytics ตาม Review โดยใช้ช่วงสัปดาห์เป็นค่าเริ่มต้น ตัววัดที่ตรวจย้อนกลับได้ และน้ำหนัก JD ชุดเดียวกันทั้งทีม ก่อนแยกเฟส integration จริง

ไม่มี push, deploy, ติดตั้งแพ็กเกจ หรือแก้ production data ในเฟสนี้

## คำสั่งตรวจหลัก

```powershell
node node_modules/vitest/vitest.mjs run frontend/lib/equipmentPreview.test.js frontend/lib/previewLedger.test.js frontend/lib/recordPreview.test.js
node node_modules/eslint/bin/eslint.js --config scripts/ui-eslint.config.mjs frontend/app/dev frontend/lib/equipmentPreview.js frontend/lib/resourceWorklog.js frontend/lib/previewNavigation.js frontend/lib/previewLedger.js frontend/lib/historyPreview.js
node scripts/check-ui-build.mjs
node scripts/verify-resources-equipment.cjs C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright "C:/Program Files/Google/Chrome/Application/chrome.exe"
```
