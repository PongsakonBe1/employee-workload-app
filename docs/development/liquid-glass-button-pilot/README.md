# Liquid Glass Button Pilot

Branch `codex/liquid-glass-button-pilot` จาก `97a8371` · Develop เท่านั้น · ใช้ข้อมูลสังเคราะห์

## สิ่งที่นำมาใช้

ติดตั้ง `@zakisheriff/liquid-glass` **0.3.20 แบบ exact version** ใน frontend workspace ใช้ `--ignore-scripts` และ lockfile เพิ่ม dependency เดียว ไม่เปลี่ยนแพ็กเกจอื่น เก็บ MIT License และ third-party notices ที่ `/notices/liquid-glass.txt` ไม่มีการนำฟอนต์หรือ SF Symbols มาแจกเพิ่ม

ใช้ public `usePress` / `useRefraction` และ CSS ของ library กับ native `GlassButton` ของโครงการ เพื่อรักษา `type`, `form`, `disabled`, ARIA, ref และ event handlers เดิม ไม่แก้ node_modules และไม่คัดลอกหน้าตา demo มาทับ flow งาน

- ปุ่มใหม่เป็นค่าเริ่มต้นของ shared controls ในหน้า **develop**
- Navigation, selection lens และกลไกของ `GlassControlGroup` ใช้ QuickLiquid เดิม
- หน้าฟอร์ม ตาราง ข้อมูล และ input เดิมยังใช้ของโครงการ ไม่เปลี่ยนเป็น GlassInput/Sheet/Menu ของ library ในเฟสนี้
- Primary, neutral และ destructive ใช้สีและบทบาทจากเฟสก่อน รักษาตัวอักษรเหนือชั้นแสง ไม่ทำให้ข้อความไทยหักเหตามพื้นหลัง
- SVG refraction เปิดเฉพาะ Chromium ตาม policy เดิม Safari/iOS/Firefox ใช้ CSS blur/สี/ขอบของ adapter; ไม่มีการ mirror DOM ของ worklogs หรือ input

ไฟล์หลัก: `ButtonMaterialProvider.js`, `GlassControls.js`, `ZakButton.js`, `zak-button-pilot.css` และ `ButtonMaterialReview.js`

## Interaction และ fallback

Desktop ที่ไม่มี coarse pointer ใช้ spring ของ library สำหรับการกดและปล่อย บนเครื่องสัมผัสปิด gesture hook ของ library แล้วใช้ press feedback ขนาดเล็กของเรา การเลื่อนหน้าและ pinch policy จึงเป็นของ browser ไม่มี `preventDefault`, gesture interception หรือการเรียก haptic ใน adapter

Library โหลดแบบ lazy ใน development ถ้า chunk โหลดไม่สำเร็จใช้ controls เดิมต่อได้ ตั้งค่า Reduce Motion, Reduce Transparency, forced colors หรือ browser ไม่รองรับ backdrop จะใช้ controls เดิมที่รองรับ preferences เหล่านั้น

Provider เก็บตัวเลือก A/B ในหน่วยความจำของ tab ผ่าน Next navigation ไม่เก็บลงฐานข้อมูลหรือ disk การ refresh กลับค่าเริ่มต้นใหม่ การสลับวัสดุไม่เปลี่ยน shared ledger, สิทธิ์ หรือ draft ของหน้าบันทึกงาน

Production build ยังไม่เปิด engine ทดลองนี้ ไม่มีการ deploy หรืออ่าน Firebase Console/collection จริง

## ตรวจรับ A/B

1. เปิด `/dev/ui#button-materials` ใช้โหมด QuickLiquid ของแถบควบคุมเดิมเพื่อเทียบ optics ทั้งสองชุด
2. A เป็น QuickLiquid เดิม B เป็นวัสดุใหม่ ใช้ข้อความไทย พื้นหลัง และร่างผู้รับบริการเดียวกัน กดบันทึกว่างต้องเจอ native validation; กรอกแล้วบันทึกแต่ละครั้งนับหนึ่งครั้ง
3. ทดลองปุ่มปกติ tinted primary destructive disabled และ icon-only; ลบตัวอย่างต้องผ่าน dialog และยกเลิกได้ ทั้งหมดเป็นตัวอย่างไม่ใช่คำขอจริง
4. เลือกวัสดุสำหรับหน้า develop แล้วกด “ทดลองกับหน้าบันทึกงาน” ผ่าน Next navigation ใช้ Back กลับมาเปลี่ยนวัสดุได้
5. ตรวจ Combo เริ่มว่าง ผู้รับบริการ focus ถูกช่อง บันทึกเฉพาะที่เลือก ยืม–คืนยังใช้เลข 13 หลักและ Undo เดิม
6. บนมือถือเริ่มลากเลื่อนจากตรงปุ่ม การลากต้องเลื่อนหน้า ไม่ submit หรือสั่นแทรก และไม่ค้างเป็นสถานะกด
7. เปรียบเทียบ light/dark และ accessibility preferences จากเมนูบัญชีเดิม

## ผลและขอบเขต QC

หลักฐานสุดท้าย: `output/playwright/liquid-glass-button-pilot/qc-summary.json`

- Full unit suite 342/342 ไม่ skip ใช้ชุดตรวจ pure logic เดิม; behavior ของ native controls ตรวจด้วย browser tests
- Pilot 8 กลุ่ม: A/B/native validation, desktop spring/keyboard, touch pan, สี/layout, preferences/iOS policy, โหลด chunk ล้มเหลว, Next navigation/Combo และ dialog/focus
- ตรวจ Edge/Chrome และ Cloudflare ทั้ง light/dark; local 375/390/430/768/1440px ส่วน public 390/1440px
- สี primary/destructive ตรวจขอบเขตการผสม fill เหนือพื้นดำ/ขาวและ highlight ของ candidate ต้องไม่ต่ำกว่า 4.5:1 เป็นการตรวจแบบจำลอง composition ที่เลือก ไม่ใช่ทุก pixel ที่หักเห
- Regression Quick Log 11 กลุ่ม, history 9, calendar 11 และ Templates/Combo 7 รวม 38 กลุ่ม ใช้ native controls กับ synthetic adapter จริง ไม่มีการแทน handler ด้วย mock ให้ flow ผ่าน
- Targeted ESLint, script syntax, isolated compatibility build และ native browser zoom 200%
- เก็บ comparative desktop sample ของแต่ละวัสดุ 20 ครั้ง พร้อม RAF/CDP metrics เป็นข้อมูลประกอบ ไม่อ้างเป็น FPS หรือ battery result ของโทรศัพท์จริง

ตัวอย่าง performance บนเครื่องนี้ (เปิดทั้งสอง A/B panes ในหน้าเดียวกัน):

| ค่าที่วัด | QuickLiquid | วัสดุใหม่ |
|---|---:|---:|
| Native submits | 20 | 20 |
| เวลา sample | 7.50 วินาที | 7.61 วินาที |
| RAF interval p95 | 5.7 ms | 5.7 ms |
| Frame intervals เกิน 50 ms | 0 | 0 |
| CDP TaskDuration เพิ่ม | 1.37 วินาที | 4.74 วินาที |

sample นี้มี TaskDuration ของวัสดุใหม่สูงกว่าประมาณ 3.5 เท่า แม้ไม่พบ frame interval เกิน 50ms จึงคง A/B/fallback และยังไม่เปิด production ผลนี้ไม่สรุปว่าโทรศัพท์ใช้ CPU/แบตเตอรี่เพิ่มในสัดส่วนเดียวกัน ไม่ใช้ heap delta จาก sample เดียวตัดสิน memory leak

ตรวจ iOS policy ด้วย user agent บน Chromium เพื่อยืนยันว่าไม่สร้าง displacement maps และ gesture policy ไม่ล็อกหน้า ผลนี้ **ไม่ใช่การรัน WebKit/Safari จริง**

CDP pinch ใน headless ไม่ขยายทั้ง target ปุ่มและพื้นหน้าควบคุม จึงยืนยันเฉพาะว่า viewport และ CSS ไม่ปิด zoom ไม่รายงานว่า physical pinch UAT ผ่าน ต้องให้ทีมตรวจ Safari/iPhone/Android จริงก่อน sign-off

Regression เดิมที่ระบุ DOM ของ QuickLiquid โดยตรงปรับให้ตรวจ renderer ปัจจุบันด้วย: native button ต้องยังเป็น `BUTTON` และ Chromium สร้าง refraction map ของ candidate ได้ ส่วน renderer เดิมคงตรวจ optical sibling เป็น `SPAN` ตามเดิม เทสต์ iOS ที่ห้าม displacement maps ยังคงไว้และผ่านหลังแก้ adapter ให้ตรง API ของเวอร์ชันที่ติดตั้ง

ไม่มี Firebase/Auth/backend SIT, ไม่มีการวัด billing reads, ไม่มี human UAT และยังไม่มีข้อสรุปว่าเว็บเหมือน native Apple ทุกประการ **all-pages-ready = false** จำนวน feature previews ยัง 9 ไม่มี feature route ใหม่

## ย้อนกลับและขั้นต่อไป

สลับ “QuickLiquid เดิม” ใน UI lab ได้ทันทีสำหรับ tab นั้น โค้ดแยก commit เพื่อย้อนกลับได้ทั้ง adapter และ dependency หลัง Tech Lead ตรวจ A/B และ flow บนอุปกรณ์ทีมแล้วจึงเลือกขยายวัสดุไปยัง controls ชนิดอื่นหรือเปิด production ในเฟสแยก

อ้างอิง: [Apple HIG: Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons), [Liquid-Glass](https://github.com/zakisheriff/Liquid-Glass) และ types ของ package 0.3.20 ที่ติดตั้งจริง
