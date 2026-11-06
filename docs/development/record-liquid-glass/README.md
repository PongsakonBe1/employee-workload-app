# หน้าบันทึกงาน Review 10 + Liquid Glass

6 พฤศจิกายน 2569 · branch `codex/review10-record-liquid-glass` · ฐาน `ec51d2f`

ผู้ใช้รับ QuickLiquid แล้ว และให้ใช้ UX/layout ที่ตรวจรับไว้เป็นฐาน ศึกษา Apple HIG เพิ่มก่อนนำ Glass ไปใช้กับ controls ที่เหมาะสม รอบนี้เป็นหน้า Next.js development `/dev/record` ใช้ข้อมูลสังเคราะห์และธุรกรรมในหน่วยความจำ ยังไม่เชื่อมการบันทึกจริง

## ขอบเขตและเหตุผล

1. ย้ายหน้าบันทึกงานตาม [Review 10](../../design/phase1/revision7/REVIEW_10.md) และรายละเอียด [controls/forms ที่ตรวจรับ](../../design/phase1/revision7/POLISH_C.md) แทนฟอร์มทดสอบส่วนกลางที่ทำให้ดูต่างจากแบบเดิม
2. คงลำดับ งานของฉัน/ทีม → วิธีบันทึก → Quick Logs หรือกรอกเอง → ตารางวันที่เลือก → Undo/รายการล่าสุด; desktop มีข้อมูลประกอบด้านข้าง mobile ใช้คอลัมน์เดียวและเมนูหลักเดิม
3. เพิ่ม `GlassButton` และ `GlassControlGroup` ที่ใช้ QuickLiquid เดิม ไม่มี dependency เพิ่ม ตัว semantic controls อยู่แยกจาก optical host ไม่เปลี่ยน hit area หรือ form behavior
4. รักษา production/Auth/Firestore และข้อมูลเดิม ตรวจด้วย browser สังเคราะห์และ build output แยก ย้อนกลับได้ด้วย commit ของ branch นี้

`/dev/ui` ยังเป็นห้องตรวจ components เดิม มีลิงก์ไปหน้าบันทึกงานชุดใหม่ เมนูอื่นใน `/dev/record` เปิดเฉพาะบริบท/รายการตัวอย่างหรือแจ้งขอบเขต ไม่ใช่การอ้างว่าย้ายทุกหน้าแล้ว Route ใหม่ `notFound()` เมื่อไม่ใช่ development; build check ตรวจ route ใหม่นี้ด้วย

## เอกสาร Apple ที่ศึกษาและการนำมาใช้

อ่านหัวข้อที่เกี่ยวกับหน้าบันทึกงานผ่าน Markdown ทางการ และ transcript ของวิดีโอ เอกสาร HIG เป็นแนวทางปรับตามแพลตฟอร์ม ไม่ใช่ชุด CSS สำหรับนำมาติดแล้วได้ native controls ทุกพฤติกรรม

| เอกสาร | หลักที่นำมาใช้กับหน้านี้ |
|---|---|
| [Adopting Liquid Glass](https://developer.apple.com/documentation/TechnologyOverviews/adopting-liquid-glass) | ใช้ชั้น controls/navigation, ลดพื้นตกแต่งที่บัง Glass, ทดสอบ accessibility; APIs อย่าง `glassProminent` เป็น native framework เว็บใช้ implementation ของโครงการ |
| [Materials](https://developer.apple.com/design/human-interface-guidelines/materials) | ไม่ทำกระจกในทุกแถวข้อมูลหรือทุก input; selected segment เป็น fill บน Glass กลุ่มเดียว ไม่ใส่ engine ซ้อนกัน |
| [Meet Liquid Glass · WWDC25/219](https://developer.apple.com/videos/play/wwdc2025/219/) | ศึกษา lensing, feedback, การแยก content/control, ข้อจำกัด clear/regular และ tint; บนเว็บยังไม่มี native brightness-aware tint/morphing ทั้งระบบ |
| [Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons) | ปุ่มหลักมี tint หนึ่งปุ่มต่อ form/ขั้นตอน ปุ่มรองลดน้ำหนัก; ใช้ style แยกความสำคัญ ไม่ขยายปุ่มหลักให้ใหญ่กว่าปุ่มรองอย่างไม่มีเหตุผล |
| [Layout](https://developer.apple.com/design/human-interface-guidelines/layout) | รักษาลำดับงานเดิม จัดแนวข้อมูล แบ่งกลุ่มด้วยระยะและพื้นข้อมูล; ไม่บีบ desktop ทั้งหน้าไปเป็น mobile |
| [Color](https://developer.apple.com/design/human-interface-guidelines/color) | ใช้ semantic tokens ของโครงการที่ปรับ Light/Dark ได้ เปิดห้อง/พร้อมยืมเขียว กำลังยืมน้ำเงิน ไม่พร้อมใช้สีเตือน มีข้อความและไอคอนเสมอ |
| [Icons](https://developer.apple.com/design/human-interface-guidelines/icons) | ใช้ SVG/Lucide น้ำหนักเดียวกัน มีชื่อที่อ่านได้และ label สำหรับ icon-only ไม่อ้างว่าเป็น SF Symbols; ไม่เพิ่มแพ็กเกจไอคอนหรือไฟล์ฟอนต์ Apple |
| [Motion](https://developer.apple.com/design/human-interface-guidelines/motion) | hover/press และเปลี่ยนสถานะสั้น ๆ ตอบการกระทำ ไม่เพิ่ม animation วน; เคารพ Reduce Motion จากส่วนกลาง |
| [Segmented controls](https://developer.apple.com/design/human-interface-guidelines/segmented-controls) | สองตัวเลือกเกี่ยวข้องกันและมี selection ชัด ใช้ pattern icon+ข้อความเหมือนกันทั้งคู่ ไม่ปนปุ่มสั่งงานอื่นในกลุ่ม |
| [Text fields](https://developer.apple.com/design/human-interface-guidelines/text-fields) / [Entering data](https://developer.apple.com/design/human-interface-guidelines/entering-data) | label คงอยู่ ข้อความแนะนำที่กดเพิ่มได้ แจ้ง error ใกล้ช่องพร้อม focus; เลขรหัสเป็น text+numeric keyboard เพื่อรักษาศูนย์นำหน้า ไม่ตัดค่าที่ยาวผิดเป็นรหัสใหม่ |
| [Toggles](https://developer.apple.com/design/human-interface-guidelines/toggles) | Combo ใช้ checkbox จริงซึ่งสื่อการเลือกงานอิสระ รองรับ Space/Forced Colors ไม่ใช้ switch แทนรายการเลือก |
| [Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets) | กลางจอ PC / sheet จอเล็ก ใช้ dialog เดียวเปลี่ยนขั้น review ไม่เปิด modal ซ้อน modal และมีเส้นทางกลับ/ยกเลิก |
| [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) | focus ring, Escape/focus restore, สีพร้อมข้อความ, รองรับ zoom และตัวเลือก motion/solid; ช่องกรอกอย่างน้อย 16px บนจอเล็กและอุปกรณ์สัมผัส |

## พฤติกรรมที่ตรวจได้ใน preview

- ห้องชั้น 3/4: PC ตั้งแต่ 1100px แสดงสี่ห้องแถวเดียว จอเล็กสองคอลัมน์ สถานะกับคำสั่งเปิด/ปิดชัด บันทึกทันทีแล้วมี Undo ที่ไม่หายตามเวลา
- Quick Logs สองหน้า: ห้องสองชั้น หูฟัง บัญชี โปรแกรม โทรศัพท์ ปลั๊กไฟ USB มีจำนวนงานใน Combo และข้อความกำกับ
- Combo เปิดใหม่เริ่มว่าง เลือกเอง/ทั้งหมด/ล้างได้ ตรวจเฉพาะงานที่เลือกและผู้รับบริการก่อนบันทึก กลับจาก review ยังรักษาข้อมูล
- อุปกรณ์ใช้ inventory fixture เดียวกับตัวเลือก สถานะพร้อม/ยืม/ไม่พร้อมใช้ต่างกัน คืนแสดงรหัสผู้ยืมเดิมและไม่ต้องสแกนซ้ำ การยืมรับ ASCII digits 13 หลักเท่านั้น ไม่ตัดรหัส 14 หลักให้เหลือ 13 หลัก
- กรอกเองรักษาร่างเมื่อเปิดตัวเลือกหัวข้อ เปลี่ยนวันเวลา สลับโหมด/วัสดุ; suggestion เปลี่ยนตามหัวข้อและกดเพิ่มข้อความได้ ตัวอย่างนี้ยังไม่ดึง suggestion จากฐานจริง
- รายการล่าสุด/ประวัติ/รายละเอียดมาจากข้อมูลตัวอย่างชุดเดียว Undo ย้อนธุรกรรมล่าสุดรวมสถานะห้อง/อุปกรณ์และจำนวนรายการ
- ผู้ปฏิบัติงานคง display label ที่มีชื่อเล่น เลือกด้วย ID; Staff ใช้บัญชีตัวเอง ส่วน Admin ใน fixture เลือกบุคคลตัวอย่างได้ ไม่เปลี่ยน role จริง
- วันที่เลือกกรองทั้งจำนวนงานและ agenda รองรับตัวอย่าง DL รอบเย็น 17:00–18:30 ไม่แสดงตารางวันเดิมซ้ำเมื่อเปลี่ยนวัน

## การใช้งานและข้อจำกัด

ใช้ runtime `node scripts/dev-ui.mjs` เดิม เปิด `/dev/record` ได้ทันที ค่าเริ่มต้น QuickLiquid เปลี่ยนธีมและ accessibility จากเมนูรูปแบบการแสดงผล ส่วนตัวเลือกบทบาทและ CSS A/B อยู่ใน disclosure ท้ายหน้าเพื่อไม่เบียด layout ที่ตรวจรับ

Chrome/Edge ใช้ SVG experiment ตาม policy เดิม Safari/Firefox/iOS ใช้ CSS fallback จึงไม่ได้รับประกันภาพเท่ากัน native Liquid Glass/ระบบสี/การ morph ของ Apple ไม่ได้ถูกยกมาใช้โดยตรง ต้องทดลอง Safari/iPhone และ Android จริงก่อนขยายไปหน้าถัดไป

ทั้ง route, fixtures, handlers และรายการทดลองนี้ไม่เรียก API ไม่ส่งรหัสตัวอย่างไปที่บริการ และไม่เพิ่ม cloud reads ไม่มีการ push/merge/deploy หรือแก้ business transactions ของหน้าบันทึกงาน production

## ตรวจสอบ

ใช้ `scripts/verify-record-glass.cjs` กับ Playwright runtime และ Edge ที่มีอยู่ ไม่ติดตั้ง browser/test package เพิ่ม ผลและภาพอยู่ที่ `output/playwright/record-liquid-glass/` รายงานทดสอบเป็นหลักฐานเฉพาะ scope นี้ ไม่ใช่การรับรอง HIG/WCAG ทั้งระบบ

การตรวจประกอบ: targeted ESLint, ชุด regression ส่วนกลางเดิม, QuickLiquid policy/interaction เดิม, native Edge zoom 200%, และ export compatibility ที่ไม่ render development fixtures ใน output production รายละเอียดผลจริงดู `validation-summary.json`

Full Vitest จากฐานก่อนเฟสนี้ยังมี 8 failures เดิม (analytics/staffMetrics/date validation) รอบนี้ไม่ได้แก้สูตรหรือไฟล์เหล่านั้น และไม่ใช้ผล UI แทนผลผ่านของทั้งระบบ

ผลตรวจสุดท้าย: หน้าบันทึกงาน 11 กลุ่มผ่านทั้ง localhost และ Cloudflare, regression ส่วนกลาง 11 กลุ่มและ QuickLiquid เดิม 8 กลุ่มผ่าน, targeted ESLint / export compatibility / native zoom 200% ผ่าน สีข้อความที่สุ่มตรวจมี contrast ต่ำสุด 4.75:1 เฉพาะคู่สีและ tint ที่ระบุใน report ไม่ใช่ทุกพิกเซลของทั้งหน้า

ตัวเปิด runtime อ่านชื่อ branch จาก Git แทนค่าที่ผูกกับ branch เก่าแล้ว ตรวจหลังรีสตาร์ตว่าลิงก์ Cloudflare เดิมตอบ HTTP 200, Glass พร้อม และหน้าข้อมูลเวอร์ชันแสดง `codex/review10-record-liquid-glass` ผลอยู่ใน `public/runtime-smoke.json` ไม่มีการรีสตาร์ต tunnel หรือเปลี่ยน hostname

ตัวอย่างคำสั่ง (argument สองตัวแรกใช้ Playwright package และ browser executable ที่มีในเครื่อง):

```powershell
node scripts/verify-record-glass.cjs <playwright-package-path> <edge-executable-path>
node scripts/verify-record-glass.cjs <playwright-package-path> <edge-executable-path> <cloudflare-origin>
node scripts/verify-ui-zoom.cjs <playwright-package-path> <edge-executable-path> /dev/record
node scripts/check-ui-build.mjs
node node_modules/eslint/bin/eslint.js --config scripts/ui-eslint.config.mjs frontend/components/ui frontend/app/dev/ui frontend/app/dev/record
```

รอ Tech Lead ตรวจ layout/controls ผ่าน PC และมือถือ ก่อนเริ่มย้าย calendar หรือเชื่อมธุรกรรมจริงเป็นเฟสถัดไป
