# QC รายหน้า และ flow บันทึกงาน–ประวัติ

เฟสต่อเนื่อง: [ห้อง ทะเบียน และการใช้งานอุปกรณ์](../resources-equipment/README.md) รายงานด้านล่างคงผลของเฟสประวัติไว้

7 พฤศจิกายน 2569 · branch `codex/ui-coverage-record-history` · ฐาน `89a1ca1`

**ยังไม่ครบทุกหน้าและยังไม่พร้อม release ทั้งระบบ** ผู้ใช้ให้ตรวจคำกล่าวว่า UI ตรวจได้ครบก่อนทำต่อ แล้วอนุญาตให้พัฒนาและทดสอบเต็มที่ โดยใช้ข้อมูลใน repo เท่านั้น ไม่เปิด Firebase

## สิ่งที่ audit ยืนยัน

ก่อนเริ่มมี Next.js 27 routes รวม development 3 routes แต่มีเพียง 2 feature previews คือบันทึกงานและปฏิทิน อีก route เป็นห้องทดสอบส่วนกลาง เมื่อคลิกเมนู Superadmin 18 ปลายทาง มีเพียง 2 ปลายทางที่เปิด feature preview เต็ม ส่วนประวัติเปิด modal และหลายเมนูแจ้งว่ายังไม่ย้ายหน้า

Review 10 มี 30 views ตรวจ render/layout 120 สถานะ (PC 1440px และมือถือ 390px × Light/Dark) โดยรอเฉพาะ animation ที่กำลังทำงานและมีเวลาจำกัด ไม่พบ root overflow หลัง transition จบ **ไม่ได้หมายความว่าตรวจทุกปุ่มใน 30 views หรือย้ายเข้าระบบครบแล้ว** ดูตารางรายหน้าใน [COVERAGE.md](./COVERAGE.md)

หลังเฟสนี้มี Next.js 28 routes รวม development 4 routes/3 feature previews เมนูหลักเปิดบันทึกงาน–ประวัติ–ปฏิทินได้จริงใน preview ที่ใช้ adapter ร่วม ยังไม่นับหน้าที่อยู่ในต้นแบบหรือหน้าเก่าที่มีเพียง shell ใหม่เป็นหน้าที่พัฒนาเสร็จ

## สิ่งที่ทำต่อและแก้จาก QC

- `/dev/history`: รายการแบบแบ่งหน้า 8 รายการ/ปฏิทิน, ค้นหา, ช่วงวันที่พร้อม validation และยกเลิก, ตัวกรองบุคลากร, เรียงวันที่, แผงรายละเอียด PC/หน้าต่างมือถือ, CSV ของข้อมูลที่กรอง, เลือกหลายรายการ, ยืนยันลบและ Undo มี empty/locked states
- ปฏิทินวัน → รายการวัน → รายละเอียด → กลับ ยังคงโหมดปฏิทิน ใช้ holiday snapshot ชุดเดียวกับตาราง และไม่นับวันหยุดเป็น worklog ชื่อยาวย่อในช่อง แต่ aria-label/หน้าต่างวันแสดงข้อมูลเต็ม
- `previewLedger`: snapshot ที่ไม่แก้ไขย้อนหลัง, subscribe, revision check, request ID ป้องกันส่งซ้ำ, fault injection, create/edit/delete แบบ atomic และ Undo ล่าสุด เก็บใน tab และเริ่มใหม่เมื่อ refresh ไม่ใช่ durable storage หรือ backend transaction
- Staff ใช้ employee ID แทนการเทียบชื่อต้นในการกรองข้อมูล ตรวจ owner/locked/ก่อน 23:59 เขตเวลา Bangkok ตามเจตนาของหน้าเดิม ส่วน Admin/Superadmin มีสิทธิ์จำลองกว้างกว่า **ไม่ใช่การยืนยัน Auth/Firestore rules**
- บันทึกงาน ประวัติ ห้องและอุปกรณ์ใช้ ledger ร่วมกัน การลบ event ทรัพยากรตัวอย่างคำนวณสถานะใหม่จาก baseline/เหตุการณ์ที่เหลือ Undo คืนทั้งประวัติและสถานะ เก็บรหัส 13 หลักเป็น string
- เก็บ `minorTask`, `mainDuty`, `dutyGroup`, `recipient`, `comment` แยกจากชื่อที่แสดง Combo ใช้ mapping จากข้อความกำกับใน Review ที่อยู่ใน repo ไม่อ้างว่าเป็นค่า live `globalTemplates`
- QC พบ Quick Log ขาด 1 รายการ: แบบมี 9 แต่ development มี 8 จึงคืน **งานที่ได้รับมอบหมาย** โดยบังคับรายละเอียดและผู้รับบริการเป็น optional ตามต้นแบบและ catalog เดิม มี unit/E2E ตั้งแต่ validation จนปรากฏในประวัติ
- แก้ mobile parent navigation ให้หมวดงานยังเลือกอยู่เมื่อเปิดประวัติ ใช้ `aria-current="location"` สำหรับหมวดแม่ และ `page` เมื่อเป็นหน้าตรง ไม่ระบุว่า URL ของหมวดแม่คือหน้าปัจจุบัน
- Visual QC แก้ปุ่มหัวหน้ามือถือที่ตัดบรรทัด ปุ่มแบ่งหน้าที่ขยายเต็มแถว และ holiday title ที่ยืดความสูงปฏิทิน คืนองค์ประกอบตาม Review เดิม
- แก้ accessible names ของ selects/textarea และคงรายละเอียดหลังแก้รายการจนข้อความไม่ตรง search เดิม พร้อมล้าง selection เมื่อผู้ใช้เปลี่ยน filter
- ตรวจหน้าเก่าพบ `/worklogs/new` เรียก `/categories` ทั้งที่ state นี้ไม่ได้ถูกใช้ และ rejection ไม่ได้ catch เกิด `Request failed` ก่อน login ลบเฉพาะ dead state/import/request นี้ออก ไม่เปลี่ยน catalog, Auth หรือการเขียน worklog ดูหลักฐาน `legacy-request-before.json` และ `legacy-request-after.json`

## ขอบเขตการแก้ประวัติ

รอบนี้แก้ผู้รับบริการ/รายละเอียดได้ โดยรักษา field ที่ template บังคับ และไม่เปลี่ยนผู้ยืมของ resource event ผ่านฟอร์มข้อความ การเปลี่ยนหัวข้อรอง/วันที่/เวลาในประวัติ, bulk edit, workflow ล็อก/ปลดล็อกและ audit จริง ยังไม่ย้ายครบ จึงนับหน้าประวัติว่า **partial feature migration** แม้ flow ที่ระบุจะผ่านการทดสอบ

Calendar preview กับตารางวันที่เลือกในหน้าบันทึกยังใช้ fixture คนละโมเดล ไม่อ้างว่าเชื่อม business data ของการจัดตารางครบแล้ว การนำเข้าใน preview ยังเป็น review flow ของข้อมูลตัวอย่าง ไม่ใช่ PDF/OCR parser จริง

## การตรวจและความหมายของผล

ผลจริงเก็บใน `output/playwright/ui-coverage-history/validation-summary.json` และโฟลเดอร์ราย browser:

| ชั้นตรวจ | สิ่งที่ครอบคลุม | สิ่งที่ยังไม่ยืนยัน |
|---|---|---|
| Unit | ledger, task/field validation, permission/date boundary, idempotency, failure, snapshot/Undo, CSV | Firebase server transaction/rules |
| SIT จำลอง | ฟอร์ม → adapter → query ประวัติ → resource projection และ Undo; bulk permission แบบ all-or-nothing | ระบบที่เชื่อม Firebase/Auth/backend จริง |
| E2E | Next จริงใน Edge และ Chrome ที่ติดตั้ง + Cloudflare, PC/touch widths, Light/Dark/solid/reduced motion, download และ keyboard | physical Safari/iPhone/Android/เครื่องสแกน |
| Verification | เทียบ Review เดิม, route/menu inventory, lint, isolated build, native zoom 200%, anonymous redirect smoke | WCAG/HIG certification หรือ authenticated coverage ทุกหน้า |
| Validation/UAT | มี acceptance scenarios ที่ agent ทดสอบอัตโนมัติและ checklist ให้ทีมตรวจ | ความเข้าใจ/ความสะดวกของผู้ใช้จริงและการลงนามตรวจรับ |

Full unit suite ยังมี failures เดิม 8 ข้อใน Analytics/validation ชื่อเทียบ baseline แล้วตรงเดิม ไม่แก้สูตรในเฟส UI และไม่สรุปว่า full suite ผ่าน

ผลสุดท้ายของรอบนี้: targeted unit/SIT จำลอง **42/42 ผ่าน**; full unit **260 ผ่าน / 8 ไม่ผ่าน จาก 268**; E2E **9 กลุ่มผ่านใน Edge, Chrome และ Cloudflare**; regression บันทึกงาน/ปฏิทิน/ส่วนกลางชุดละ **11 กลุ่ม** และ optics **8 กลุ่ม** ผ่าน; anonymous redirects **21/21**, lint, isolated build และ native zoom 200% ผ่าน แฟ้มใหม่ 8 แฟ้มจัดรูปแบบด้วย Babel ที่มีอยู่ใน Next โดยตรวจ AST ว่าคงเดิม ไม่ติดตั้ง formatter เพิ่ม

## Gate และลำดับต่อไป

1. ให้ Tech Lead และ Staff ตรวจ checklist ใน [UAT.md](./UAT.md) บน Chrome และมือถือจริงก่อนรับรอง flow นี้
2. ย้ายทรัพยากร/อุปกรณ์และทะเบียน/สภาพอุปกรณ์ตาม Review โดยใช้ ledger contract เดียวกัน แยก stage ของ UI ออกจากการเชื่อมข้อมูลจริง
3. ย้ายภาพรวม/Staff Analytics พร้อม period/filter/query budget และตัวชี้วัดที่อธิบายได้ แก้ baseline failures ด้วยเกณฑ์ที่ตรวจสอบได้ก่อน release
4. ย้าย templates/ผู้ใช้/ระบบ/ส่งออก/audit/notification และทำ import PDF/รูปตาม requirements เป็น feature slices พร้อม acceptance tests แยก ไม่แทนด้วย generic dashboard หรือปุ่มที่ทำงานแค่ในภาพ
5. ค่อยทำ SIT กับบริการจริงภายใต้สิทธิ์และ environment ที่ผู้ใช้อนุมัติ แล้วจึง UAT/release ไม่ได้เริ่ม Firebase/production ในรอบนี้

## เปิดตรวจ

- [บันทึกงาน](https://northwest-revised-domains-varies.trycloudflare.com/dev/record)
- [ประวัติงาน](https://northwest-revised-domains-varies.trycloudflare.com/dev/history)
- [ปฏิทิน](https://northwest-revised-domains-varies.trycloudflare.com/dev/calendar)

เป็น Cloudflare ชั่วคราว ทำงานขณะ Next/tunnel บนเครื่องนี้ทำงาน ใช้ข้อมูลสังเคราะห์ ไม่อ่าน .env/credentials ไม่ติดตั้ง package/service ไม่ push/merge/deploy และไม่เปลี่ยน backend, AuthProvider, Firestore rules หรือ Profile Radar Top 8 `minorTask`
