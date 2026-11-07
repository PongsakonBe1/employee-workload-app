# เก็บรายละเอียด UI ห้องและอุปกรณ์

8 พฤศจิกายน 2569 · branch `codex/resources-ui-refinement` · ฐาน `75859a5`

ผู้ใช้อนุญาตให้แก้ตาม flow หลัง review 6 ประเด็น เฟสนี้แก้ UI บน development preview โดยคงธุรกรรมยืม–คืน ทะเบียน ประวัติ และ Undo เดิม ใช้ข้อมูลสังเคราะห์เท่านั้น ไม่มี Firebase Console, production writes, package installation, push หรือ deploy

## สิ่งที่แก้ตาม review

| ประเด็น | การแก้ |
|---|---|
| เมนูล่างมือถือจาง | พบ selection lens มี z-index 7 แต่ข้อความมี z-index auto ระหว่าง optics ยังโหลดหรือปิดอยู่ ทำให้ lens ทับข้อความ แก้ให้ links อยู่เหนือ lens เสมอ ไม่ขึ้นกับ optical phase |
| สีสถานะห้องต่างกัน | ใช้ `roomState` ร่วมในรายการ แผงรายละเอียด resource dialog และ Quick Log: เปิด = เขียวพร้อมข้อความ “เปิดอยู่”; ปิด = neutral พร้อม “ปิดอยู่” สีสถานะอุปกรณ์ยืม/คืนคงเดิม |
| Controls หน้าสถิติมือถือแน่น | แยก view tabs เต็มแถวจากช่วงเวลา ยุบประเภท/สังกัด/บุคลากรใน “ตัวกรอง” พร้อมจำนวนตัวกรองที่ใช้อยู่ ปิด panel แล้วไม่ล้างค่า PC เปิด panel เริ่มต้น |
| ฟอร์มยาวและปุ่มอยู่ไกล | แบ่งข้อมูลอุปกรณ์ / พื้นที่และสถานะ / ข้อมูลเพิ่มเติม ช่อง barcode และ order ยังคงอยู่ในส่วนเพิ่มเติม แยก footer ออกจาก body ที่เลื่อน โดยเชื่อม submit button ด้วย native form association ไม่ซ้อน form |
| Checkbox กำกวม | ย้าย checkbox ออกจากแต่ละแถวไปแผงรายละเอียดและ sheet ใช้ข้อความ “แสดงในบันทึกด่วน” พร้อมคำอธิบาย รายการที่ยืมค้างยังคืนได้และ Undo ยังทำงาน |
| ตัวอักษรรองจาง/เล็ก | เพิ่มขนาดรหัส คำอธิบาย ตัววัด และหมายเหตุในหน้าอุปกรณ์ พร้อมลดสถานะ badge เต็มแถวบนมือถือให้ขนาดพอดีกับข้อความ คง semantic tokens Light/Dark |

เมนูล่างและ Dialog เป็น shared components จึงตรวจ regression ของ shell และ Quick Log ด้วย Footer เป็น optional slot; dialogs เดิมที่ไม่ส่ง footer คงโครงสร้างเดิม ไม่เปลี่ยน role/auth หรือข้อมูลจริง

## สิ่งที่ตรวจจริง

- Unit ของ equipment/ledger/record 42 tests ผ่าน ไม่มีการเพิ่ม test ที่เพียงทวนค่า CSS หรือ helper สองสถานะ
- Unit ทั้งโครงการ 291 tests: 283 ผ่าน และ 8 failures เดิม ตรง baseline ใน `output/playwright/resources-ui-refinement/baseline-comparison.json`
- Browser matrix: 9 workflow/accessibility scenarios เดิม + 4 scenarios ใหม่ ได้แก่ navigation layers/contrast, room status ข้ามหน้า, ยุบตัวกรอง/ตำแหน่งข้อมูลสรุป และฟอร์ม/ปุ่ม/validation/cancel ดู `edge`, `chrome`, `public` reports
- มือถือ 375/390/430/768px × Light/Dark; ฟอร์มตรวจเพิ่มที่ความสูง 700px เพื่อให้มีพื้นที่จำกัด ข้อความ controls ไม่แตกหลายบรรทัด ปุ่มท้ายฟอร์มเข้าถึงได้
- เมนูที่เลือกมี calculated foreground-to-surface contrast ประมาณ 7.43:1 ใน Light และ 9.69:1 ใน Dark พร้อมตรวจว่าข้อความอยู่เหนือ lens ทั้ง active/loading ไม่ใช่การรับรอง contrast ของทุก pixel บนพื้นโปร่งใสหรือทุกหน้าจอ
- ที่มือถือ 390px ข้อมูลสรุปเริ่มประมาณ 480px จากด้านบนเมื่อยุบตัวกรอง เป็นเกณฑ์ layout ของ fixture นี้ ไม่ใช่ข้อกำหนดตายตัวของ Apple
- Regression: shell/foundation 11 scenarios และ Quick Log 11 scenarios ผ่าน รายงานอยู่ใน `regression/`
- Native browser zoom 200%, targeted ESLint, syntax checks และ compatibility export ใช้รายงานใน phase folder นี้ ไม่มีการ deploy
- หลังตรวจภาพฟอร์ม ย้ายข้อความ error มา footer ให้เห็นเหตุผลพร้อมปุ่ม แล้วรัน `form-only` เพิ่ม โดยเก็บรายงานแยกจาก matrix หลัก ไม่เขียนทับหลักฐานเดิม

การตรวจรอบแรกระหว่าง hot reload เคยได้ 404 หนึ่งครั้ง จึงรันใหม่หลัง source หยุดเปลี่ยน โดยยังบังคับ HTTP 200 ไม่มีการผ่อน assertion เพื่อข้าม failure ภาพและ reports ของรอบสำเร็จเก็บไว้ใน folder ของเฟสนี้

## เปิดตรวจ

- `/dev/resources` ห้องและทรัพยากร
- `/dev/equipment` ทะเบียน เลือก Admin ในตัวเลือก Development ด้านล่าง
- `/dev/equipment/usage` การใช้งานและสภาพตอนคืน
- [รายการตรวจรับ](./UAT.md)

ข้อมูลอยู่ใน memory ของแท็บ ใช้เมนูในเว็บเพื่อทดสอบข้ามหน้า; refresh จะเริ่มข้อมูลใหม่ หลักฐานก่อนหน้าอยู่ใน `resources-equipment` และไม่ถูกเขียนทับ

## คำสั่งตรวจ

```powershell
node node_modules/vitest/vitest.mjs run frontend/lib/equipmentPreview.test.js frontend/lib/previewLedger.test.js frontend/lib/recordPreview.test.js
node scripts/check-ui-build.mjs resources-ui-refinement
node scripts/verify-resources-refinement.cjs C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright "C:/Program Files/Google/Chrome/Application/chrome.exe"
node scripts/verify-resources-refinement.cjs C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright "C:/Program Files/Google/Chrome/Application/chrome.exe" http://127.0.0.1:4310 form-only
```

`verify-resources-equipment.cjs` เดิมเรียก suite ปัจจุบันนี้ต่อ เพื่อให้คำสั่งตรวจเก่ายังใช้งานได้โดยไม่คง selectors ที่เลิกใช้แล้ว Build/zoom scripts มีตัวเลือกเก็บผลใน phase folder นี้ และคง output default เดิมสำหรับผู้ใช้คำสั่งเดิม

## ข้อจำกัดและขั้นถัดไป

Automated browser acceptance ไม่ใช่ human UAT ยังรอ physical iPhone/Safari, Android, scanner และการเชื่อม Firebase/Auth/backend จริง ไม่อ้างว่าเป็น native macOS หรือผ่าน Apple HIG ทุกข้อ การย้าย feature ยังอยู่ที่ 6 preview routes/6 จาก 18 เมนูใน audit ก่อนหน้า **all-pages-ready = false**

ให้ Tech Lead ตรวจ UI เฟสนี้ก่อนเริ่มหน้าใหม่ งานที่เสนอหลังรับเฟสยังเป็นภาพรวมและ Staff Analytics ตาม Review และตัววัดจากข้อมูลที่ตรวจสอบย้อนกลับได้
