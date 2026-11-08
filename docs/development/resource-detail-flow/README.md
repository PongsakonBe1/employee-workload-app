# Flow รายละเอียด ประวัติ และส่งออกทรัพยากร

Selected state รอบล่าสุด: [แยก hover/focus/inactive selection](../resource-selection/README.md) รายงานด้านล่างคงผลของเฟส flow ไว้

8 พฤศจิกายน 2569 · branch `codex/resource-detail-history-export` · ฐาน `b6bd33c`

ผู้ใช้อนุญาตให้เก็บ flow ที่ยังไม่ตรงแบบก่อนเริ่มหน้าใหม่ รอบนี้ทำ 3 ส่วน: การเลือกรายการเพื่อดูรายละเอียด ประวัติรายทรัพยากร/CSV และตรวจสถานะก่อนดาวน์โหลด CSV ไม่ได้อ้างว่า UI ทุกหน้าในระบบย้ายครบแล้ว

## สิ่งที่ทำ

- PC: คลิกห้องหรืออุปกรณ์แล้วเลือกแถวและแสดงแผงรายละเอียด โดยไม่เปิดหน้าต่างทำรายการและไม่เขียน ledger
- มือถือ/พื้นที่แคบ: คลิกแล้วเปิด sheet รายละเอียดก่อน มีคำสั่งทำรายการ ดูประวัติ และแก้ทะเบียนตามสิทธิ์ ใช้จุดเปลี่ยน 900px ให้ตรงกับต้นแบบที่รับรอง
- คำว่า “ดูรายละเอียด” บนรายการสื่อปลายทางจริง แยกจากคำสั่งเปิด–ปิด/ยืม–คืนในรายละเอียด Quick Log เดิมยังคง flow บันทึกทันทีและ Undo
- ประวัติห้อง/อุปกรณ์/ทะเบียนใช้ helper เดียวกัน จับคู่ด้วยชนิดทรัพยากรและ ID ไม่เดาจากชื่อ/comment; รองรับ equipmentId เก่าที่ตรงกันด้วย
- ประวัติมีช่วงวันที่พร้อม validation/คืนค่าร่าง แสดง empty state และดาวน์โหลด CSV ของแถวที่มีสิทธิ์ดูได้ Staff เห็นงานตนเอง Admin/Superadmin เห็นทีมตามขอบเขต preview เดิม
- ปุ่ม “กลับรายละเอียด” คืนบริบทเดิม ส่วน X/Escape ปิดหน้าต่างกลับรายการตามต้นแบบ ไม่มี modal ค้างซ้อนกัน การแก้/ซ่อนอุปกรณ์จากรายละเอียดมือถือยังเก็บ ID เดิมไว้แม้รายการจะหายจาก Quick Log
- “ส่งออกสถานะ” เปิดหน้าตรวจไฟล์ก่อนดาวน์โหลด แสดงสถานะปัจจุบันทุกห้องและอุปกรณ์รวมที่หยุดใช้ ไม่ขึ้นกับคำค้นปัจจุบัน ยกเลิกโดยไม่ดาวน์โหลดได้
- CSV สถานะใช้ snapshot scalar rows ตอนเปิด preview ไม่มีคอลัมน์ผู้ยืมหรือรหัสนักศึกษา ส่วนประวัติเก็บรหัส/สังกัด ณ เหตุการณ์ที่มีจริง แถวเก่าที่ไม่มีระบุแสดง “ไม่ระบุ”
- รหัสใน CSV สถานะคือ `assetCode` (ใช้ `id` เมื่อไม่มีรหัสแสดงผล) ส่วน CSV ประวัติเก็บ resource ID เดิม พร้อมรหัสอุปกรณ์ขณะทำรายการแยกคอลัมน์
- CSV ใช้ UTF-8 BOM, quote fields/escape quotes และป้องกัน leading formula characters ไฟล์ที่มี barcode เลขศูนย์นำหน้ายังเป็นข้อความใน raw CSV; การให้ Excel เดาชนิดข้อมูลเองอยู่นอกขอบเขต typed spreadsheet export
- หากสร้างไฟล์ CSV ไม่สำเร็จ หน้าต่างและข้อมูลตรวจไฟล์ยังอยู่และลองใหม่ได้ ไม่เพิ่ม worklog ไม่เรียกบริการจริงเพื่อสร้างไฟล์

## หลักฐานตรงแบบและ flow

แบบที่เทียบคือ `docs/design/phase1/revision7/index.html` ซึ่งโหลด renderer/detail actions จาก revision5 และ refinements ที่ผู้ใช้รับรอง การตรวจใช้ browser คลิกทั้งต้นแบบและ Next implementation จริงที่ 1440, 901, 900 และ 390px แล้วเทียบ:

1. จำนวน modal หลังเลือกรายการ: PC ไม่มี / พื้นที่ ≤900px มีรายละเอียด
2. “ดูประวัติ” เปิดหัวข้อ “ประวัติทรัพยากร”
3. X ปิดประวัติกลับรายการ
4. “ส่งออกสถานะ” เปิดหัวข้อ “ตรวจไฟล์สถานะ”

ผล expected/actual และภาพอ้างอิงอยู่ใน `output/playwright/resource-detail-flow/edge/report.json` และ `reference-*.png` ปุ่มกลับรายละเอียดเป็นการเพิ่มทางกลับอย่างชัดเจน โดยคงพฤติกรรม X ตามต้นแบบ ดู [FLOW-CONTRACT.md](./FLOW-CONTRACT.md)

ไม่ได้อ้าง pixel parity ทุกองค์ประกอบกับต้นแบบทั้งหมด สถานะเปิด–ปิดและสีใช้ข้อสรุป UI เฟสล่าสุด คอลัมน์ “ลำดับแสดงผล” มาจาก `order` ที่มีใน repo โดยไม่สมมติว่าเป็น Item No. อีกฟิลด์หนึ่ง

## ผลทดสอบ

- Unit ใหม่ 10 ข้อผ่าน ครอบคลุม identity collision, role scope, date bounds, old exact IDs, event location, snapshot, unknown condition, empty history และ CSV quoting/formula safety
- Targeted suite รวม 52 tests ผ่าน; ทั้งโครงการ 301 tests: 293 ผ่าน และ 8 failures เดิม ตรง baseline ไม่มี failure ใหม่ ดู `baseline-comparison.json`
- Edge ผ่าน 9 scenarios รวมการเทียบต้นแบบ; Chrome และ public Cloudflare ผ่าน 8 scenarios ต่อรอบ ใช้ Next components จริงกับ synthetic ledger
- Responsive matrix 375/390/430/768/900/901/1000/1440px × Light/Dark รวมเส้นทางเปิดรายละเอียด → ทำรายการ/ยกเลิก/บันทึก → ประวัติ → กลับ/X → ตรวจ CSV ไม่มี root overflow หรือ modal ค้างซ้อน
- ดาวน์โหลดไฟล์จริงแล้วอ่านกลับ ตรวจ BOM, จำนวนแถว/คอลัมน์, resource ID, สถานะ inactive และ ownership scope ไม่ใช่เพียงตรวจว่า click handler ถูกเรียก ไฟล์ตัวอย่างเก็บใต้ `edge/`, `chrome/`, `public/`
- Regression เดิม 13 scenarios ผ่านหลังปรับ assertions ให้ยืนยันการเลือกและทำรายการแยกขั้น ดู `regression/edge/report.json`
- ตรวจทะเบียนเพิ่มที่ 900/901/1000px × Light/Dark รวม 6 สถานะ: จุดเปิด sheet/แผงรายละเอียดตรงกัน ไม่มี root overflow และยกเลิกแก้ไขโดยไม่เพิ่มคำสั่ง ledger ดู `equipment-boundaries.json`
- Native browser zoom 200%, targeted ESLint, syntax checks และ isolated compatibility build ผ่าน Development previews ไม่ render ใน production export
- รอบจำลอง download failure ครั้งแรก stub URL ทั้งระบบทำให้กระทบภาพตกแต่ง จึงจำกัด fault ให้เฉพาะ Blob ประเภท CSV แล้วรัน suite ใหม่แบบยังบังคับ `page errors = []` ไม่ได้ผ่อน assertion หรือแก้ optics เพื่อข้าม error

## เปิดตรวจและคำสั่ง

เปิด `/dev/resources` ใช้เมนูในเว็บเชื่อมไปทะเบียนได้ บัญชีเริ่มต้นเป็น Staff เปลี่ยน Admin ใน “ตัวเลือกตรวจแบบ · Development” ข้อมูลอยู่ใน memory ของแต่ละแท็บและเริ่มใหม่เมื่อ refresh

```powershell
node node_modules/vitest/vitest.mjs run frontend/lib/resourcePreview.test.js frontend/lib/equipmentPreview.test.js frontend/lib/previewLedger.test.js frontend/lib/recordPreview.test.js
node scripts/verify-resource-detail-flow.cjs C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" http://127.0.0.1:4310 with-reference
node scripts/verify-resource-detail-flow.cjs C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright "C:/Program Files/Google/Chrome/Application/chrome.exe"
node scripts/verify-resources-refinement.cjs C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" http://127.0.0.1:4310 resource-detail-flow
node scripts/check-ui-build.mjs resource-detail-flow
```

การเทียบ reference ต้องเปิด server ต้นแบบที่ port 4197 ด้วย ส่วนการทดสอบ application ไม่ใช้ flag `with-reference` ก็ได้ `verify-resources-equipment.cjs` เป็น entry เดิมที่เรียก flow suite ล่าสุด หลักฐานเฟสก่อนคงไว้แยก folder

## ข้อจำกัดและขั้นถัดไป

ยังไม่เชื่อม Firebase/Auth/backend จริง ไม่มี schema migration, package installation, push หรือ deploy Scope checks เป็น adapter ฝั่ง client สำหรับตรวจแบบ ไม่ใช่การรับรอง security rules ของบริการจริง ยังรอ human UAT และอุปกรณ์จริง iPhone/Safari, Android และ scanner

**all-pages-ready = false** ไม่มี feature route ใหม่ในเฟสนี้ ยังคง 6 feature previews/6 จาก 18 เมนูตาม audit ก่อนหน้า ยังไม่ได้เติมภาพรวม Staff Analytics และหน้าผู้ดูแลอื่นทั้งระบบ ให้ Tech Lead ตรวจ flow ตามตารางก่อนเริ่มเฟสถัดไป
