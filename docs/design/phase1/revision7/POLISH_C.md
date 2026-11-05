# Review 08 — เก็บรายละเอียด controls และฟอร์ม

6 พฤศจิกายน 2569 · branch `codex/liquid-glass-review-08` · ฐาน `9393990`

ผู้ใช้อนุมัติชุดเก็บรายละเอียดก่อน Analytics/JD พร้อมให้ศึกษาการใช้ Liquid Glass กับ controls เพิ่ม งานนี้อยู่ในต้นแบบข้อมูลสังเคราะห์ ใช้ public preview เดิม ไม่แก้ Next.js production, Firestore, dependency, ชื่อผู้ใช้จริง หรือประวัติงาน และไม่ push/deploy

## สิ่งที่ปรับ

- ห้องชั้น 3/4: PC กว้างตั้งแต่ 1100px วาง 4 ห้องแถวเดียว ขยาย modal ให้พอ จอเล็กลงใช้ 2 คอลัมน์ เปิดมีพื้นเขียว/เครื่องหมายถูก ปิดมีพื้นกลาง/สัญลักษณ์พัก มีข้อความและคำสั่งเปิด/ปิด กดยังบันทึกทันทีและ Undo ได้ เปิด modal ใหม่อ่านสถานะล่าสุด
- อุปกรณ์: พร้อมยืมเป็นเขียว/เครื่องหมายถูก กำลังยืมเป็นน้ำเงิน/นาฬิกา ไม่พร้อมใช้เป็นสีเตือน แสดงคำสั่งยืมหรือคืนรายชิ้น แยกจากกรอบชิ้นที่เลือก คืนยังใช้ผู้ยืมเดิม
- เมนูและ Quick Log: รูปทรงมุมมน ชั้นสีและขอบแสง Quick Log มีไอคอนใหญ่ขึ้น เมนูมีข้อความกำกับ ใช้ SVG ของโครงการ ไม่มี SF Symbols/ฟอนต์ Apple แจกในเว็บ
- Checkbox ใช้ input จริง รองรับ Space, focus ring, checked/unchecked/indeterminate และ native fallback ใน Forced Colors มีพื้นแถวที่เลือก Combo ยังเริ่มว่างทุกครั้ง
- ช่องกรอกมี label คงอยู่ พื้นอ่านชัด ขอบแสงบางและ focus ring รองรับ Reduce Motion และขนาดอักษรมือถืออย่างน้อย 16px
- Template แบ่งเป็นข้อมูลเทมเพลต / เงื่อนไข / รายการงานในชุด แสดงรายการตามชนิด เพิ่ม/ลบรายการโดยไม่ล้างช่องอื่น ซ่อนตัวเลือกเก่าที่ขัดกับข้อกำหนดให้ผู้ใช้เลือกงานจริงก่อนบันทึก
- ผู้ลงงาน: แสดงชื่อที่ตั้งไว้ครบและชื่อเต็มบรรทัดรอง ค้นชื่อเต็ม/ชื่อเล่น/ชื่อที่ลงงานได้ เลือกด้วย ID ไม่ตัดชื่อต้นหรือเติมวงเล็บซ้ำ
- พื้นหลังเลือกเรียบหรือ gradient ฟ้า–ม่วง–เขียวอ่อนได้จากรูปแบบการแสดงผล/Settings ตัวเลือกคงอยู่ขณะเปลี่ยนหน้าและธีมใน session ต้นแบบ เมื่อ reload เริ่มใหม่

## เอกสาร Apple → การนำมาใช้

อ่าน [Adopting Liquid Glass](https://developer.apple.com/documentation/TechnologyOverviews/adopting-liquid-glass) ผ่าน JSON ทางการ เพราะหน้าเอกสารใช้ JavaScript และอ่าน transcript ของ [Meet Liquid Glass — WWDC25/219](https://developer.apple.com/videos/play/wwdc2025/219/) พร้อม [Materials](https://developer.apple.com/design/human-interface-guidelines/materials), [App Icons](https://developer.apple.com/design/human-interface-guidelines/app-icons), [Toggles](https://developer.apple.com/design/human-interface-guidelines/toggles) และ [Text Fields](https://developer.apple.com/design/human-interface-guidelines/text-fields)

Controls, sheets และ popovers อยู่ในแนวทาง Liquid Glass ได้ ส่วน knob ของ slider/toggle เปลี่ยนวัสดุขณะโต้ตอบ เอกสารไม่ได้กำหนดให้ช่องกรอกและพื้น form ทุกช่องเป็นกระจกโปร่ง จึงใช้ Glass shell เดิมร่วมกับพื้น form อ่านชัดและ feedback ของ controls โดยไม่เพิ่ม blur แยกทุก input หรือซ้อน Glass หลายชั้น

การรับ effect อัตโนมัติจาก SwiftUI/UIKit/AppKit และ Icon Composer เป็นความสามารถของ native frameworks เว็บนี้ใช้ CSS/SVG ประยุกต์หลักดังกล่าว ค่าสี ขนาด และเวลาเป็นค่าของโครงการ ไม่อ้างว่าเป็น native Apple controls หรือค่าบังคับจาก Apple

## ผลตรวจ

ใช้ Node/Playwright/Edge ที่มีอยู่ ไม่ติดตั้งเพิ่ม

| การตรวจ | ผล |
|---|---|
| `verify-c.cjs` | ผ่าน 13 กลุ่ม: layout ห้องสองชั้น/สองธีม, บันทึก/Undo, สถานะยืมคืน/ผู้ยืมเดิม, checkbox/Space, เพิ่มลบ/บันทึก Template, ชื่อคล้ายแต่เลือก ID ถูก, พื้นหลัง/ร่างเดิม, Reduce Motion/Solid, contrast และมือถือ 375/390/430/768px |
| `verify-flow-fixes.cjs` | ชุดเดิม 22 กลุ่มผ่าน |
| `verify-b.cjs` | ปฏิทิน/วันหยุด/สิทธิ์/ตัวกรอง 12 กลุ่มผ่าน |
| `verify.cjs` | flow เดิม 11 กลุ่มผ่าน และภาพ 120 มุมมอง: 30 หน้า × PC/mobile × Light/Dark; `--renders-only` อัปเดตภาพหลังปรับขอบ checkbox |
| `node --check`, `git diff --check` | ตรวจ syntax และขอบเขตก่อนส่ง |

หลักฐานอยู่ที่ `output/playwright/ux-phase1/polish-c/` และภาพ/คลิปใน Gallery เดิม Contrast วัดตัวอย่าง controls และสถานะที่เพิ่ม ไม่ใช่การรับรอง WCAG ทั้งระบบหรือทุกพื้นหลังของ Glass ยังต้อง UAT บน iPhone/Safari, Android และเครื่องสแกน

## เรื่องชื่อที่แยกไปงานข้อมูล

Production code ใน `QuickLogButtons.js` และหน้ากรอกงานเลือก `displayName` ก่อนชื่อสำรอง และ Admin แก้ค่านี้ได้ จึงรักษาชื่อที่วงเล็บชื่อเล่นไว้ ไม่เปลี่ยนชื่อจริงหรือ snapshot ใน worklogs

`frontend/app/admin/system/page.js` ยังสร้าง map ชื่อ → UID ตอนนำเข้าโดยไม่แยกชื่อซ้ำ และ `frontend/app/dashboard/page.js` ยัง query ชื่อสำหรับงานเก่า ควรแก้เป็นงานข้อมูลแยก: ใช้ UID, ตรวจชื่อซ้ำก่อนนำเข้า และให้ผู้ใช้ตรวจการจับคู่งานเก่าที่ไม่มี UID ไม่เดาเจ้าของจากชื่อต้น ไม่มีการแก้ส่วนนี้ในชุด UI

รอ Tech Lead ตรวจรับก่อนเริ่ม Analytics/JD หรือย้ายส่วนใดเข้า production
