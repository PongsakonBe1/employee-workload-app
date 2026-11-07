# แก้รายละเอียดบันทึกงานให้ตรงแบบและ catalog เดิม

7 พฤศจิกายน 2569 · branch `codex/record-contract-review-fixes` · ฐาน `e7cd0dc`

ผู้ใช้ให้แก้ Quick Log โทรศัพท์, เนื้อหา Combo, ฟอร์มกรอกเอง, ไอคอนและ hover เมนูซ้าย โดยคงแบบที่อนุมัติ และยืนยันภายหลังว่า **ใช้ข้อมูลใน repo ก่อน ยังไม่เปิด Firebase** รอบนี้จึงอ้างอิงโค้ดและ Review 10 โดยไม่รอสิทธิ์อ่านฐานข้อมูลและไม่อ้างว่าตรงกับค่าปัจจุบันในฐานข้อมูลสด

## สิ่งที่แก้

- โทรศัพท์ต้องมีผู้รับบริการและรายละเอียด ตรวจผู้รับบริการก่อน พร้อม focus/เลื่อนช่องที่ขาด ใช้หัวข้อรองเดิม `รับแจ้งและแก้ปัญหาทางโทรศัพท์` เก็บ `recipient` กับ `comment` แยกกัน มี Undo ใน preview ช่องนี้รับข้อความภาษาไทยได้ ข้อจำกัดรหัส 13 หลักยังใช้เฉพาะการยืมอุปกรณ์
- ถอนรายการ Combo ที่แต่งใหม่ใน migration คืน 5 รายการบัญชีและ 6 รายการติดตั้งจากต้นแบบที่อนุมัติ ตรวจเทียบข้อความกับ dialog ในต้นแบบที่เปิดแยกจริง ไม่อ้างว่าเป็น snapshot ฐานข้อมูลสด ทุกรอบเริ่มไม่เลือกรายการ
- กรอกเองคืนลำดับจาก Review: เลือกหัวข้อรอง → วันที่/เวลา → งานหลักและกลุ่มงานแบบอ่านอย่างเดียว → ผู้รับบริการและรายละเอียด → ตรวจรายการ → ยืนยันบันทึก มีแก้ไขก่อนยืนยันและคงร่าง ไม่บังคับรายละเอียดที่แบบเดิมกำหนดเป็น optional
- ใช้ `MINOR_TASKS` ครบ 30 หัวข้อ พร้อม mapping งานหลัก/กลุ่มงานและ suggestion จาก `commentSuggestions.js`/`worklogUtils.js` เดิม แทน 3 หัวข้อตัวอย่าง Suggestion แทนข้อความและแสดงสถานะที่เลือกตามแบบ ไม่เพิ่มข้อความเดิมซ้ำเมื่อกดซ้ำ ไม่มีการโหลดประวัติหรือผู้ใช้จริง
- พื้นฟอร์มโปร่งและปุ่มตรวจรายการแบบ glass ตาม Review เดิม ไม่ครอบด้วยการ์ดขาวใหม่ ตรวจ date/time ที่ว่างและวันที่ไม่ถูกต้องโดยไม่ทำให้หน้าพัง มือถือ input อย่างน้อย 16px และไม่ล้น
- เมนู PC/mobile และไอคอนหลัก Quick Log ใช้ SVG จาก Review ใน `ReviewSymbol` รักษาชั้นสี calendar/history/headphones ไม่ใช้ Lucide แทนรูปที่เคยตรวจรับ ไอคอน controls ย่อยยังใช้ library เดิม
- เมนูซ้ายมี optical hover surface เดียวเคลื่อนระหว่าง native links รองรับ focus, clear เมื่อเลื่อน/resize, ไม่ขวาง pointer และไม่เพิ่ม engine ต่อทุกเมนู ไม่มี animation ต่อเนื่องขณะ idle และเคารพ Reduce Motion/Solid/Forced Colors
- เพิ่ม `react/jsx-no-undef` ใน targeted lint เพื่อจับ JSX ที่อ้าง component แต่ไม่ได้ import ปรับ regression ให้ตรวจพฤติกรรมที่คืนตามแบบ และแยก optical surfaces ที่ active ออกจาก hover surface ที่ยังไม่เปิดใน Safari policy test

## ไอคอนและ HIG

รูปใน Review เดิมเป็น SVG ของโครงการ ไม่เคยเป็น SF Symbols การเปลี่ยนไปใช้ Lucide ใน migration ทำให้รูปต่างจากแบบ จึงคืนรูปที่ตรวจรับจริง เอกสาร [SF Symbols](https://developer.apple.com/sf-symbols/) อธิบาย weights, layers และ animations ของ native symbols; [Xcode Agreement ข้อ 2.10](https://www.apple.com/legal/sla/docs/xcode.pdf) จำกัด System-Provided Images สำหรับการพัฒนาแอปบนอุปกรณ์ Apple จึงไม่คัดลอกไฟล์ SF Symbols มาแจกในเว็บ Windows/Android

ใช้แนวทาง [Motion](https://developer.apple.com/design/human-interface-guidelines/motion) และ [Materials](https://developer.apple.com/design/human-interface-guidelines/materials) เพื่อให้ feedback เกี่ยวข้องกับการโต้ตอบ โดยใช้ QuickLiquid/CSS ของเว็บ ไม่อ้างว่าเป็น native API หรือผ่าน HIG ทุกข้อ

## ผลตรวจจริง

ดู `output/playwright/record-contract-review/validation-summary.json`:

- `verify-record-contract.cjs`: 6 กลุ่ม ทั้ง local/public — เปิด Review 10 อิสระเพื่อเทียบ fields/action และ Combo; โทรศัพท์/Undo; 30 tasks/suggestions/draft/review/confirmation; SVG/hover พร้อม trace ตำแหน่งระหว่าง animation; Dark/solid/reduced motion; มือถือ 375/390/430/768px
- `verify-record-glass.cjs` 11 กลุ่ม, ปฏิทิน 11 กลุ่ม, ส่วนกลาง 11 กลุ่ม และ optics 8 กลุ่มผ่าน
- Targeted unit 27/27 ผ่าน รวม domain ใหม่ 4 ข้อ; full Vitest 245 ผ่าน / 8 ไม่ผ่าน จาก 253 ข้อ โดย failures ทั้ง 8 ตรง baseline เดิม ไม่ถือว่า full suite ผ่าน
- Targeted ESLint, isolated compatibility build และ native browser zoom 200% ผ่าน ไม่คัดลอก env/deploy
- Public runtime ตอบ HTTP 200 และแสดง branch รอบนี้แล้ว ไม่รับรอง physical Safari/iPhone/Android หรือผล FPS/battery; Safari ยังใช้ CSS optics fallback

## งานค้างและเฟสถัดไป

ก่อนหน้านี้ automatic approval review ปฏิเสธการเปิด Firebase Console จึงถามสิทธิ์อ่านเฉพาะ `globalTemplates` ผู้ใช้เลือก **ใช้ข้อมูลใน repo ก่อน ยังไม่เปิด Firebase** แล้ว ไม่ได้เปิดฐานข้อมูลผ่านทางอื่นและไม่มีคำขอสิทธิ์ที่รอคำตอบสำหรับรอบนี้

ที่ตรวจได้จาก repo: `TemplateManager.js`, `QuickLogButtons.js` และ `quickLogTemplates.js` กำหนด contract ของ `comboItems`, `minorTask`, `mainDuty`, `dutyGroup` และ flags ของ template โดยโหลดค่าที่ Admin ตั้งไว้ตอน runtime ส่วนรายการ 5/6 งานที่ใช้ตรวจ UI อยู่ใน Review 10 ของ repo จึงใช้รายการนั้นเป็นฐานของ development ต่อไป ไม่ใช้ค่า default ของ editor แทน template จริง และไม่อ้างว่าได้ตรวจค่าปัจจุบันที่ Admin ตั้งในฐานข้อมูลแล้ว

หลัง Tech Lead ตรวจรับรอบนี้ เสนอเชื่อม UI ที่ตรวจรับกับ data adapter เดิมในสภาพแวดล้อมทดสอบ: ใช้ template ID และ field contracts เดิม, ตรวจ payload แยกจากข้อความที่แสดง, สิทธิ์ผู้บันทึก, write failure/duplicate submission, atomic Combo และ Undo ที่สอดคล้องกับธุรกรรมจริง ก่อนขยายหน้าถัดไป ไม่ได้เริ่มเขียนข้อมูลจริงในรอบนี้

## เปิดตรวจ

- [บันทึกงาน — development preview ใหม่](https://mustang-sons-microwave-pixels.trycloudflare.com/dev/record)
- [ปฏิทินและเมนูร่วม](https://mustang-sons-microwave-pixels.trycloudflare.com/dev/calendar)

เป็นข้อมูลสังเคราะห์และสถานะใน tab ลิงก์ทำงานขณะ Next/tunnel บนเครื่องนี้ทำงาน ลิงก์เก่าหยุดแล้วจึงเปิดใหม่ด้วย binary ที่ตรวจ checksum เดิม ไม่มีการติดตั้ง package/service, push, merge หรือ deploy และไม่เปลี่ยน backend/Auth/Firestore rules/queries/สูตร Analytics/Profile Radar
