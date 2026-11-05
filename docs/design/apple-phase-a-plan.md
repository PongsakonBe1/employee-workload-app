# แผนเฟส A สำหรับอนุมัติ

เสนอวันที่ 2026-11-05 หลัง [เฟส 0](apple-design-notes.md) และ [การวัดช่องว่าง](apple-r07-gap-analysis.md) สถานะ **รอ Tech Lead อนุมัติ** ไม่เริ่ม A หรือ B โดยอัตโนมัติ

## 1. จะทำอะไร ตามลำดับ

1. แยก branch จาก R07 ที่ผู้ใช้ตรวจอยู่ เก็บ before screenshots และระบุฐาน commit; จำกัดแก้ `docs/design/phase1/revision7/` กับหลักฐานตรวจและเอกสาร ไม่มี frontend production เปลี่ยน
2. **A1:** ย้าย review label ไปขวา ให้แยกจาก account/sidebar footer ตรวจพื้นที่ทับเนื้อหาและไม่บัง controls ไม่ย้ายไปทับ mobile safe area
3. **A2:** สร้าง text tokens ใช้ rem ให้ข้อความ UI ที่แสดงจริงไม่น้อยกว่า 12 CSS px ที่ขนาดมาตรฐาน เป้าหมาย supporting text Desktop 13px พร้อมรักษา hierarchy กวาดทั้ง R07 และผล cascade จาก R06/R05 รวม tab labels, badges, actor metadata, import steps, form help, table และ chart labels
4. **A3:** แก้ hit regions ตาม coarse/hybrid input ให้เป้าหมายโครงการ 44×44 CSS px ตรวจ native checkbox/radio รวม label ไม่ทำให้ targets ทับกัน ไม่บังคับ icon graphic ใหญ่ 44px และไม่ขยายแถวปฏิทินแบบทำลายสัดส่วนเวลา
5. **A4:** เก็บ `system-ui` เป็นตัวแรก เพิ่ม fallback ไทยที่มีสิทธิ์ใช้และติดตั้งในเครื่อง เช่น Leelawadee UI/Noto Sans Thai โดยไม่โหลดไฟล์ใหม่ ยืนยันว่าการเปลี่ยน font stack ต้องตรวจ rendered font ภายหลัง
6. **A5:** เพิ่มการตรวจ minimum font และ target regions ใน `verify.cjs`; ตรวจ Dark/Light, coarse 1024px, phone 375/390px, desktop, 150% text ทุก flow หลักและ selected dialogs ตรวจ browser zoom แยกจาก text enlargement
7. Render ทั้ง 30 routes, ตรวจ 11 scenarios เดิมรวม immediate room save/Undo/Combo/import และเก็บ diff/คลิปเฉพาะที่เปลี่ยน สรุปผลและให้ผู้ใช้ลอง iPhone/Android ก่อนขอเริ่ม B

## 2. ทำไมเลือกแนวทางนี้

การวัดสดพบปัญหาที่ selectors ปัจจุบันและ cascade จริง การแก้ข้อความ/พื้นที่แตะก่อนเพิ่ม library ช่วยแยกสาเหตุความผิดพลาดและให้เห็นคุณภาพบนอุปกรณ์เดิมได้ทันที คง topology navigation และ requirement ผู้ใช้ที่ตกลงแล้ว: 4 tabs, FY/month planning, minorTask top 8 และ room save + Undo

HIG ใช้เป็นเหตุผลเรื่อง readability, clear hierarchy, familiar inputs และ controls/content separation ค่าตัวเลข floor, target และจำนวน tabs เป็นข้อกำหนดโครงการตามที่ระบุใน notes

## 3. ความเสี่ยงและการถอยกลับ

| ความเสี่ยง | ป้องกัน/ตรวจ | วิธีถอย |
|---|---|---|
| ข้อความใหญ่ทำ sidebar/Quick Log/week events ล้น | ใช้ content wrapping และ layout ตามพื้นที่ ทดสอบไทยยาวและ text 150%; ไม่แก้ด้วยย่อตัวอักษรกลับ | คืนเฉพาะ commit เฟส A; เก็บ R07 ฐานไว้เทียบ |
| เพิ่ม hit box แล้วทับปุ่มข้างเคียงหรือ event | ตรวจทั้ง DOM box, hit-testing และ spacing; ไม่พึ่ง pseudo-element ที่ขยายแล้วซ้อนกัน | ถอน selector ที่มีผลกระทบแล้วเลือก layout alternative |
| hybrid input เปลี่ยน layout ไปมาระหว่าง mouse/touch | คง visual geometry เมื่อเหมาะสม เพิ่ม padding/hit region แบบไม่เปลี่ยนทันทีตาม input event | คืน coarse rule เฉพาะ component |
| font fallback ใช้ไม่ได้หรือ glyph ต่างกัน | ไม่เพิ่ม dependency/font download; ทดสอบ rendered glyph บนเครื่องจริง | คง system-ui และแก้ metrics โดยไม่บังคับชื่อฟอนต์ |
| selector override กระทบหน้าอื่นหรือ auth shell | render 30 routes และ flow regression ไม่แก้ R03–R06 | revert commit A ที่แยกไว้ |

## 4. วิธีตรวจรับ

- baseline default 16px root: visible UI text ≥12px; ข้อความสำคัญยังอ่านตาม hierarchy ไม่ได้เท่ากันหมด ตัวเลขใน SVG ตรวจขนาดเมื่อวาดจริง ไม่ตรวจเพียงค่า CSS
- touch contexts: วัดทั้ง width/height และตรวจ click/tap target ตามจุดกลาง/ขอบ ไม่ทับกัน; label เพิ่ม hit region ได้เมื่อ semantic association ถูกต้อง
- keyboard focus ไม่หลุดหลัง render, Enter/Space ใช้คำสั่งได้, Escape คืน focus, ข้อมูลใน draft และ Undo ไม่หาย
- Light/Dark × normal/Solid × reduced motion; reduced-transparency/contrast ตรวจ CSS และ behavior เท่าที่ browser จำลองได้ รายงานส่วนที่ยังจำลองไม่ได้
- ไม่อ้าง contrast ผ่านทั้งระบบจาก R06 report ต้องตรวจคู่สี R07 และ backdrop ที่เลือกใหม่ หากยังไม่ได้วัดให้รายงาน pending
- ไม่มี horizontal overflow ที่ 375/390/768/1024/1440px; text 150% และ browser zoom 200% ตรวจเป็นคนละกรณี พร้อมบันทึกข้อยกเว้น table scroller ที่ตั้งใจไว้
- สรุปคำสั่ง ผลจริง และข้อจำกัด device UAT ไม่อ้างว่า viewport emulation เท่ากับ iPhone/Android จริง

## งานที่เสนอเก็บไว้หลัง A

ยังไม่เพิ่ม swipe/detents หรือเปลี่ยน grabber, keyboard menu model, resizable columns, PDF parser/OCR, auth, persistence, metric semantics หรือ forced-colors ทั้งระบบใน A หากจำเป็นต้องเพิ่มให้เสนอขอบเขตแยกก่อน

**เฟส B ยังไม่อนุมัติ:** ก่อนเริ่มต้องตรวจ Glisse เวอร์ชันที่เผยแพร่/React 19/Next compatibility และ license จาก primary sources ให้ตรงวันทำงาน ล็อกเวอร์ชันเมื่อเลือกแล้ว แยก wrapper, feature/fallback path และการถอยกลับ ทดลองไม่กี่ controls ก่อน navigation ไม่ทำ `npm install` หรือแก้ lockfile ในเฟส 0/A

ก่อน build เฟส B ต้องระวัง script frontend ปัจจุบัน `next build && xcopy ... firebase/out` ควรใช้คำสั่ง compile ที่ไม่คัดลอก artifact ไปปลายทาง deploy โดยไม่ตั้งใจ และไม่เชื่อมฐานข้อมูล production เพื่อทดสอบ UI

การขออนุมัติครั้งถัดไปครอบคลุม A1–A5 และการตรวจรับข้างต้นเท่านั้น ไม่รวม package install, push, deploy หรือเฟส B
