# Design review 02: หน้าบันทึกงาน

สถานะ: เสนอทิศทางใหม่หลังผู้ใช้ไม่รับต้นแบบรอบแรก รอ Tech Lead ตรวจแบบ ไม่ใช่การแก้แอป production

เปิด [index.html](index.html) ด้วย browser แล้วเลือกรูปแบบสีจากปุ่ม appearance บนแถบนำทาง รองรับ System / Light / Dark

## เป้าหมายที่ผู้ใช้ยืนยันเพิ่มเติม

- ต้องการพัฒนา UX/UI ตาม Apple Human Interface Guidelines และแนวทาง macOS 27 Golden Gate ให้สวยและใช้ง่ายจริง ไม่ใช่เพียงรักษา UI เดิมทุกจุด
- ใช้คอมพิวเตอร์และมือถือพอ ๆ กัน ต้องออกแบบทั้งสองรูปแบบตั้งแต่ต้น
- ต้นแบบแรกที่ใช้ sidebar และการ์ดทั่วไปยังไม่ผ่านการยอมรับด้านการออกแบบ ผล functional tests ไม่ใช่หลักฐานว่า UX ดี

## สิ่งที่ตรวจจากระบบจริงก่อนออกแบบรอบนี้

ตรวจด้วย browser ผ่านแท็บ Edge ที่ผู้ใช้ล็อกอินอยู่ แบบอ่านอย่างเดียว:

- `/admin/record`: พื้นหลังไล่สี แถบนำทางด้านบน แถบสถานะย่อ/ขยาย ปฏิทินคู่ฟอร์มและ Quick Log
- แถบอุปกรณ์: การแบ่งชั้น 3/Finn Space และพื้นที่ preview อุปกรณ์
- `/admin/equipment-health`: แถบช่วงเวลา KPI กราฟ และ timeline
- `/admin/staff-analytics`: สรุปทีม ตาราง metrics และตัวเลือกดูทีละคน
- `/admin/system` แท็บ DL: ตัวเลือกเดือน ตาราง และปุ่มเพิ่มรอบสอบ

ดูสถานะ Quick Log หลังเลือกพนักงานในฟอร์มแล้วคืนการเลือกเดิม โดยไม่กดบันทึกหรือแก้ข้อมูล ไม่เก็บรายชื่อหรือคะแนนบุคลากรจริงเป็น fixture ต้นแบบนี้ใช้ข้อมูลสังเคราะห์ทั้งหมด

## หลัก HIG ที่ใช้และการแปลเป็นเว็บ

| หลักการ | การตัดสินใจในต้นแบบ | แหล่งอ้างอิง |
| --- | --- | --- |
| แยกชั้น controls/navigation ออกจากเนื้อหา | ใช้ material โปร่งกับ navigation; พื้นตาราง ฟอร์มและรายการมีความทึบเพียงพอ ไม่ทำ glass ทุกการ์ด | [Materials](https://developer.apple.com/design/human-interface-guidelines/materials) |
| จัดลำดับความสำคัญและเผยรายละเอียดเมื่อจำเป็น | สถานะทรัพยากรแบบย่อ → รายละเอียด; Quick Log → เลือกชิ้น → preview → ยืนยัน; ตัวเลือกดูแลระบบอยู่ในเมนูเพิ่มเติม | [Layout](https://developer.apple.com/design/human-interface-guidelines/layout) |
| ใช้หน้าจอใหญ่ลดการซ้อนหลายขั้น | คอมพิวเตอร์เห็นตารางงานคู่พื้นที่บันทึก; การดูตารางไม่ต้องออกจากงานที่กำลังทำ | [Designing for macOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-macos/) |
| เลือก navigation ตามพื้นที่ใช้งาน | ไม่ใส่ sidebar โดยอัตโนมัติ; desktop ใช้แถบบนแบบจัดกลุ่ม ส่วน mobile ใช้แถบล่างและนำงานบันทึกขึ้นก่อน | [Sidebars](https://developer.apple.com/design/human-interface-guidelines/sidebars) |
| ธีมต้องรองรับเนื้อหาและ control ทั้งชุด | เปลี่ยน semantic colors ทั้งหน้า รวม calendar event, selected state, sheet, input และ focus | [Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode) |

การอ้างอิง HIG เป็นการประยุกต์หลักการกับ PWA ไม่ได้หมายความว่า CSS ให้พฤติกรรม native Liquid Glass เท่ากับ SwiftUI/AppKit และไม่อ้างว่าผ่านการรับรอง Apple ทั้งระบบ

ต้นแบบใช้ logo เดิมจาก `frontend/public/labboy-logo.png` และ font IBM Plex Sans Thai แบบเดียวกับแอป (โหลดจาก Google Fonts ถ้าออนไลน์ และใช้ system fallback เมื่อ offline) ไม่ติดตั้งแพ็กเกจใหม่หรือคัดลอก Apple proprietary assets

## ลองตรวจได้

1. กดหูฟังชั้น 3/Finn เลือกชิ้น → ยืนยันยืม → ดูสถานะและบันทึกล่าสุด → กลับมาคืน
2. กดผูกบัญชีครบชุด → ดู preview 3 รายการ → ยกเลิกหรือยืนยัน
3. เปลี่ยนผู้ปฏิบัติงาน → กรอกเอง → กรอกผู้รับบริการ/รายละเอียด → ตรวจ preview ก่อนยืนยัน
4. สลับวันในปฏิทินและเปิดรายละเอียดรอบสอบ รวม 17:00–18:30
5. สลับ Light/Dark/System และลองที่ความกว้างมือถือ

การเปลี่ยนสถานะหรือบันทึกอยู่ใน memory ของต้นแบบเท่านั้น Refresh จะคืนข้อมูลตั้งต้น วันและเวลาตัวอย่างกำหนดไว้สำหรับตรวจแบบ ไม่ใช่ข้อมูลสด

เมนูเพิ่มเติมแสดงโครงสร้างที่เสนอ ยังไม่เชื่อมหน้าอื่น รอบนี้ตั้งใจให้ตรวจคุณภาพและ flow ของหน้าบันทึกงานหนึ่งหน้าก่อน ระบบจัดการตาราง/นำเข้ารูป, สถิติการยืม, FY analytics และ CRUD อุปกรณ์ ยังเป็น requirement ของเฟสถัดไป ไม่ได้ถูกแทนที่ด้วยต้นแบบนี้

## ความเสี่ยง UX ที่ต้องตรวจต่อ

- จัดกลุ่มเมนูหลักเหลือ 4 กลุ่มเป็นข้อเสนอ ต้องยืนยันว่าผู้ดูแลหาเมนูเดิมได้เร็วขึ้นจริง
- เปลี่ยน hold 3 วินาทีเป็น preview + confirm เป็นข้อเสนอ เพื่อรองรับ mouse/touch/keyboard ให้เสมอกัน ต้องวัดเวลาและความผิดพลาดเทียบกับของเดิม
- ข้อมูลที่ระบบจริงโหลดผิดพลาดต้องมี loading/error/stale states แยกจากพร้อมใช้; ต้นแบบนี้ยังไม่ได้ครอบคลุม states เหล่านั้นทั้งหมด
- รอบเย็นในต้นแบบเป็นตัวอย่างความสามารถใหม่ ไม่ใช่ผลอ่านจากรูปเดือนพฤศจิกายนที่ผู้ใช้ให้มา
- ยังไม่ได้นำ preview อุปกรณ์แบบ 3D เดิมมาทั้งหมด ต้องตรวจว่าผู้ใช้ต้องการคงไว้ตำแหน่งใดก่อนพัฒนา

## ผลตรวจ

ใช้ Edge headless/Playwright กับไฟล์ต้นแบบ ไม่เชื่อม Firebase ไม่แก้ข้อมูลจริง:

- ผ่าน 7/7 browser scenarios: logo/calendar; ยืม/คืน; Combo ยกเลิก/ยืนยัน; Manual + ผู้ปฏิบัติงาน/ผู้รับบริการ/รายละเอียด; calendar + keyboard + System theme; responsive; contrast tokens + runtime errors
- ตรวจความกว้าง 1440, 1024, 768, 760, 390 และ 375px ไม่พบ overflow แนวนอนระดับ document
- ตรวจ semantic color pairs 8 คู่ทั้ง Light/Dark ได้ contrast ≥4.5:1 ไม่ใช่การรับรอง WCAG ทุกองค์ประกอบ
- ไม่พบ JavaScript runtime errors ระหว่าง scenarios
- ตรวจภาพ desktop Light/Dark และ mobile ด้วยสายตา แล้วปรับการจัดข้อความ/ขนาดเป้าสัมผัสบนมือถือ
- ไม่ได้รัน unit tests ของแอปซ้ำ เพราะไม่มี application source เปลี่ยน Baseline เดิมยัง 217 ผ่าน/8 ล้มเหลว
- ยังไม่ได้ทำ UAT กับทีม 8 คน, ทดสอบ Safari/iOS จริง หรือพิสูจน์ว่าทำงานเร็วกว่า UI เดิม

รันตรวจซ้ำโดยใช้ Playwright ที่ติดตั้งอยู่:

```powershell
node docs/design/phase1/revision2/check-review.cjs '<playwright-module-path>' '<browser-executable-path>'
```

หลักฐาน:

- [Light](../../../../output/playwright/ux-phase1/revision2/record-light.png)
- [Dark](../../../../output/playwright/ux-phase1/revision2/record-dark.png)
- [Mobile](../../../../output/playwright/ux-phase1/revision2/record-mobile.png)
- [Equipment sheet บนมือถือ](../../../../output/playwright/ux-phase1/revision2/equipment-sheet-mobile.png)
- [Browser report](../../../../output/playwright/ux-phase1/revision2/report.json)

ขั้นต่อไป: ให้ Tech Lead ตรวจ visual direction, ความหนาแน่นข้อมูล และ flow ของหน้านี้ก่อนขยายไปหน้าอื่นตามจุดอนุมัติเฟสออกแบบ
