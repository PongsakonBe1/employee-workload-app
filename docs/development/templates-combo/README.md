# เทมเพลตและ Combo ร่วมกับ Quick Log

9 พฤศจิกายน 2569 · Branch `codex/templates-combo-flow` จาก `236f3c3` · Development เท่านั้น

## สิ่งที่ทำได้แล้ว

- `/dev/templates` ใช้โครงแบบ Review 10: PC เป็นรายการกับ inspector; ที่กว้างไม่เกิน 900px เปิดรายละเอียดใน dialog ก่อนแก้ไข มีค้นหา กรองชนิดและสถานะ รวมเทมเพลตที่หยุดใช้
- Admin/Superadmin สร้าง แก้ไข จัดลำดับ หยุดใช้ เปิดใช้อีกครั้ง และ Undo การเปลี่ยนแปลงล่าสุดได้ Staff ใช้รายการที่เปิดอยู่จาก Quick Log
- ใช้ catalog สังเคราะห์ชุดเดียวกับ `/dev/record` การเปลี่ยนชื่อ รายการ Combo และเงื่อนไขผู้รับบริการ/รายละเอียดจึงมีผลกับการเปิดบันทึกครั้งถัดไป ไม่ต้องแก้ fixture สองหน้า
- สร้างเทมเพลตทั่วไปหรือ Combo 2–30 งานได้ เพิ่ม ลบ และย้ายลำดับงานภายในชุด พร้อมเลือกหัวข้อรองจาก catalog ใน repo ไม่อนุมานหมวดจากชื่องาน
- Combo เริ่มโดยไม่เลือกงานเสมอ ต้องเลือกสิ่งที่ทำจริงก่อนตรวจและบันทึก หนึ่งรายการย่อย = หนึ่งบันทึก แม้ใช้หัวข้อรองเดียวกัน ยอดกลับไป Overview และแบบประเมินตรงกัน
- เงื่อนไขที่บังคับกรอกส่งต่อไป Quick Log พร้อม focus ช่องที่ขาดข้อมูล รับสายโทรศัพท์ยังต้องมีผู้รับบริการและรายละเอียด
- ฟอร์มรับสายและงานมอบหมายใช้หัวข้อรอง/รายละเอียดตั้งต้นและเงื่อนไขล่าสุดจาก catalog ตัวอย่างชุดเดียวกัน โดยคงป้ายชื่อรายการเป็นหัวข้อรองตาม flow เดิมและเก็บชื่อเทมเพลตแยกไว้ หน้าตรวจ Combo แสดงรายละเอียดที่จะบันทึกด้วย
- เทมเพลต Smart เดิมคงกลไกห้อง/อุปกรณ์ รหัสผู้ยืม และ validation เดิม แก้ชื่อ ลำดับ และสถานะได้ โดยไม่เปลี่ยนชนิดหรือสร้าง Smart action ใหม่จากข้อความ
- บันทึกเก่าเก็บชื่อ รายละเอียด และ version ณ เวลาบันทึก การแก้หรือหยุดใช้เทมเพลตไม่เขียนทับประวัติงาน
- ใช้ revision ตรวจร่างเก่าและ request ID ป้องกันบันทึกซ้ำ มี failure simulation/retry โดยรักษาร่างและไม่เพิ่มรายการซ้ำ Undo configuration แสดงในหน้าจัดการเทมเพลต และมีสิทธิ์เฉพาะผู้ดูแล
- Quick Log มีค้นหาและแบ่งหน้าตามจำนวนจริง เพิ่มจนเป็นสามหน้าแล้วลดกลับสองหน้าจะปรับหน้าปัจจุบันให้อยู่ในช่วง

## จุดแก้ในบริการเดิม

`createTemplate` เดิมไม่ได้ส่ง `isCombo`, `comboItems` และ `requireCheckbox` แม้ฟอร์มมีข้อมูลเหล่านี้ แยก serializer เป็น `templateCreateFields` และส่ง field ครบ ทดสอบผ่านการเรียกบริการจริงโดย mock Firebase/Firestore ทั้งหมด ไม่มีการเชื่อมต่อ collection จริง

ไม่ได้เปลี่ยน `getAllTemplates` เดิมที่ query เฉพาะ active และยังไม่ได้เชื่อม manager ใหม่นี้เข้ากับข้อมูลจริง การ restore รายการ inactive ในระบบจริงต้องออกแบบ adapter/query และตรวจสิทธิ์อีกเฟส

## รูปแบบ UI และข้อจำกัด

ใช้ชุด UI ร่วมที่อนุมัติแล้ว: QuickLiquid สำหรับ controls/navigation, ผิวเนื้อหาและฟอร์มอ่านง่าย, selected row แบบ inset และแยก focus กับ selection, สถานะมีข้อความประกอบสี รองรับ light/dark, reduced motion, forced colors และ native browser zoom 200% ช่องกรอกมือถืออย่างน้อย 16px

ReviewSymbol เป็น vector ของโครงการและ action icons จากชุดที่มีอยู่ ไม่ใช่การแจก SF Symbols ของ Apple และไม่มีการรับรองว่าเว็บนี้เทียบเท่า native macOS หรือผ่าน HIG ทุกข้อ

ข้อมูลเป็น synthetic in-memory ต่อ tab การ refresh เริ่มใหม่ การเปลี่ยน template ระหว่างเปิดฟอร์มทำให้ต้องเปิดฟอร์มใหม่ก่อนบันทึก มี Undo ล่าสุดร่วมกับ ledger จึงไม่มี Undo เก่าหลังทำธุรกรรมถัดไป

## ขั้นตอนตรวจรับ

1. เปิด `/dev/templates` ใน Development controls เลือก `admin` ทดสอบค้นหา/กรอง การเลือกแถวต้องไม่สร้าง worklog
2. แก้ Combo เปิดใช้บัญชี เพิ่มงาน เลื่อนลำดับ และเปลี่ยนเงื่อนไขข้อมูล เปิดหน้าบันทึกงานแล้วค้นหาชุดนี้ ต้องเริ่มไม่เลือกและบังคับเฉพาะข้อมูลที่กำหนด
3. สร้าง Combo สองรายการที่เป็น Gmail ทั้งคู่ บันทึกทั้งสองแล้วดู Overview/สรุปแบบประเมิน ต้องเพิ่มสองครั้ง
4. สร้างเทมเพลตทั่วไปที่มีรายละเอียดตั้งต้น บันทึกหนึ่งครั้ง แล้วแก้ชื่อ/รายละเอียดของเทมเพลต ประวัติงานเดิมต้องไม่เปลี่ยน
5. หยุดใช้แล้วค้นใน Quick Log ต้องไม่พบ ใช้ Undo ใน manager ต้องกลับมา และยอดประวัติต้องเท่าเดิม
6. ลองชื่อซ้ำ/ชื่อว่าง/รายการไม่ครบ และจำลองบันทึกไม่สำเร็จ ร่างต้องอยู่ กดใหม่แล้วเพิ่มเพียงครั้งเดียว
7. ตรวจมือถือ light/dark: รายละเอียด → แก้ไข → ยกเลิกกลับรายละเอียด; เพิ่ม/ลบงาน focus ช่องใกล้เคียง; Escape คืน focus ไปยังปุ่มเดิม
8. ตรวจบน Safari/iPhone/Android และให้ทีมลองข้อมูลสังเคราะห์ก่อน human UAT sign-off

## ผลตรวจอัตโนมัติ

หลักฐาน: `output/playwright/templates-combo/qc-summary.json`

- Unit ทั้งชุด **342/342 ผ่าน**, ไม่ skip เพิ่ม 11 เคสจากเฟสก่อน 331 เคส รวม serializer/service mock, สิทธิ์, stale/retry, explicit selection และประวัติเดิม
- New UI acceptance **7/7 กลุ่ม** บน Edge, Chrome และ Cloudflare preview
- Local matrix 375/390/430/768/900/901/1440px × light/dark; Cloudflare 390/1440px × light/dark ไม่พบ root/input/dialog overflow ในกรณีที่ทดสอบ
- Pagination เพิ่มเป็นสามหน้าและ clamp หลังหยุดใช้ **ผ่านทั้งสามปลายทาง**
- Regression Quick Log เดิม **11/11** บน Edge; Overview/Staff/แบบประเมิน **10/10** บน Chrome
- Native zoom **200% ผ่าน** รวม manager/editor, targeted ESLint และ script syntax ผ่าน
- Compatibility production export ผ่านใน `.ui-build-check` แยกจาก production output และตรวจว่า development preview ไม่ render ใน export
- ตรวจภาพ PC/mobile light/dark เทียบ reference ที่ `http://127.0.0.1:4197/#/templates` และเก็บภาพ Review ใน `approved-templates.png`

Cloudflare รอบแรกพบ script chunk ตอบ 502 หนึ่งรายการและ matrix timeout จึงไม่ถือว่าผ่าน ทดสอบทั้งชุดซ้ำแล้วผ่านครบโดยไม่เพิ่ม retry เพื่อซ่อนผลใน script ผลล่าสุดอยู่ใน `public/final/report.json` การเปิด tunnel เป็น temporary development preview ไม่ใช่ deploy

ระหว่างทบทวนก่อน commit แก้การใช้หัวข้อรอง/เงื่อนไขเก่าตายตัวของฟอร์มรับสายและงานมอบหมาย พร้อมเพิ่ม E2E ตรวจการตั้งค่าใหม่และรายละเอียดที่ไม่ถูกต่อซ้ำ เทสต์เดิมจับความเปลี่ยนแปลงของป้ายชื่อรายการ จึงคงป้ายหัวข้อรองเดิมไว้ ส่วนรอบที่เกิด JavaScript error ระหว่างแก้ไฟล์ไม่ถือว่าผ่าน ใช้ผลรอบสุดท้ายที่คงโค้ดนิ่งเท่านั้น

คำสั่งจาก root (ใช้ Playwright runtime และ browser ที่มีอยู่แล้ว):

```text
node node_modules/vitest/vitest.mjs run
node scripts/verify-templates-combo.cjs <playwright-runtime> <browser-executable> [origin] final
node scripts/verify-template-pagination.cjs <playwright-runtime> <browser-executable> [origin]
node scripts/verify-record-glass.cjs <playwright-runtime> <edge-executable> http://127.0.0.1:4310 templates-combo
node scripts/verify-assessment-summary.cjs <playwright-runtime> <chrome-executable> http://127.0.0.1:4310 templates-combo
node scripts/verify-ui-zoom.cjs <playwright-runtime> <edge-executable> /dev/templates templates-combo
node scripts/check-ui-build.mjs templates-combo
```

## ขอบเขตที่ยังไม่ยืนยันและขั้นต่อไป

ยังไม่อ่าน Firebase Console/globalTemplates จริง ไม่มี Auth/backend/Firestore SIT หรือการวัด reads จริง ไม่มี human UAT หรือ physical Safari/iPhone/Android/เครื่องสแกน ไม่มีการติดตั้ง dependency, push หรือ deploy

Next page routes 34 / development routes 10 / feature previews 9; เมนู 9/18 ปลายทางเปิด feature preview ได้ **all-pages-ready = false** หน้าอื่นยังเป็นไปตาม coverage inventory

ขั้นถัดไปคือให้ Tech Lead ตรวจ UI/flow ในเฟสนี้ แล้วจึงเลือกเฟสถัดไปและขอบเขตเชื่อมข้อมูลจริง ไม่ถือว่าผ่าน production gate จากผลสังเคราะห์นี้
