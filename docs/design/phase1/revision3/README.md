# UI review 03 — Liquid Glass สำหรับทั้งระบบ

สถานะวันที่ 2 พฤศจิกายน 2569: ต้นแบบเว็บพร้อมให้ตรวจ 24 มุมมอง พร้อม desktop/mobile และ Light/Dark รวม 96 รูปแบบ ยังไม่ได้อัปเดตชุดใหม่นี้เข้า Figma เพราะ Figma MCP แจ้งถึงขีดจำกัดของแผน Starter และยังไม่ใช่ implementation ของแอป production

ผู้ใช้อนุมัติให้ขยายงานออกแบบจากหน้าบันทึกงานไปยังหน้าอื่นทั้งเว็บ โดยต้องการให้ภาษาภาพใกล้ macOS 27 Golden Gate และ Liquid Glass มากขึ้น ขอบเขตนี้ไม่รวม push, deploy, ติดตั้ง dependency, แก้ schema หรือข้อมูลจริง

## เปิดตรวจ

- [ต้นแบบที่กดใช้งานได้](index.html) — เปิดด้วย Edge/Chrome โดยตรง
- [บอร์ดรวม](gallery.html) — เลือก Desktop/Mobile และ Light/Dark กด “แสดงครบทุกหน้า” แล้วเลือกหน้าที่ต้องการเปิด
- [บอร์ดหน้าหลัก Light](../../../../output/playwright/ux-phase1/revision3/review-board-light.png)
- [บอร์ดหน้าหลัก Dark](../../../../output/playwright/ux-phase1/revision3/review-board-dark.png)
- [ครบ 24 หน้า Desktop/Dark](../../../../output/playwright/ux-phase1/revision3/all-views-desktop-dark.png)
- [ครบ 24 หน้า Mobile/Light](../../../../output/playwright/ux-phase1/revision3/all-views-mobile-light.png)
- [ผลตรวจ browser](../../../../output/playwright/ux-phase1/revision3/report.json)
- [สถานะ Figma และข้อจำกัดการส่งต่อ](FIGMA_STATUS.md)

ระหว่างเซสชันเปิดได้ที่ `http://127.0.0.1:4193/` และ `http://127.0.0.1:4193/gallery.html` หาก server หยุดแล้ว รันจากโฟลเดอร์ repo:

```powershell
node docs/design/phase1/revision3/serve.cjs
```

Server ฟังเฉพาะ `127.0.0.1` และให้บริการเฉพาะต้นแบบ ภาพ review และโลโก้สาธารณะที่ระบุไว้ ไม่ให้บริการไฟล์อื่นใน repo

## หน้าที่ครอบคลุม

| มุมมองในต้นแบบ | เส้นทางหรือส่วนเดิมที่ใช้อ้างอิง |
| --- | --- |
| ภาพรวม | `/dashboard` |
| บันทึกงาน | `/admin/record` |
| กรอกบันทึกงาน | `/worklogs/new` |
| รายการงาน | `/worklogs` |
| ตารางสอบ DL | `/admin/dl-exam-schedules`, แท็บ DL ใน `/admin/system` |
| ตารางเรียน | `/admin/classroom-schedules`, แท็บตารางเรียนใน `/admin/system` |
| จัดการอุปกรณ์ | `/admin/equipment-items` |
| การใช้งานอุปกรณ์ | เสนอปรับ `/admin/equipment-health` ตามความต้องการผู้ใช้ |
| Staff Analytics | `/admin/staff-analytics` |
| โปรไฟล์ | `/profile` |
| ส่งออกข้อมูล | `/export`, ส่วน export ใน `/admin/system` |
| ศูนย์ผู้ดูแล | `/admin` |
| ผู้ใช้ | `/admin/users` |
| บันทึกด่วนและ Combo | `/admin/templates` |
| จัดการระบบ | `/admin/system` |
| ตั้งค่า | `/admin/settings` |
| ประวัติระบบ | `/admin/audit-logs` |
| ประกาศและแจ้งเตือน | แท็บ broadcast ใน `/admin/system` |
| นำเข้าตารางจากรูป | ประสบการณ์ใหม่ตาม requirement ตาราง DL จากรูป |
| ตรวจข้อมูลซ้ำ | `/admin/cleanup` |
| คู่มือ | `/help` |
| เข้าสู่ระบบ | `/login` |
| รออนุมัติ | `/pending` |
| ชุด UI และสถานะ | หน้าตรวจแบบเพิ่มเติม ไม่มี production route |

จำนวน 24 มุมมองรวมหน้าตรวจแบบและการแยกบางแท็บเดิมออกมาให้อ่านง่าย ไม่ใช่การเพิ่ม production routes แล้ว 24 หน้า

## ภาษาภาพและเหตุผล

คงโลโก้ labboy, IBM Plex Sans Thai, พื้นฟ้า–มิ้นต์ และ navigation ด้านบนที่สัมพันธ์กับแอปจริง แล้วเพิ่มรายละเอียดดังนี้:

- Navigation, toolbar และคำสั่งรองใช้พื้นโปร่ง, backdrop blur, saturation, แสงขอบและเงาที่มีลำดับชั้น เนื้อหาตาราง ฟอร์ม และกราฟใช้พื้นทึบกว่าเพื่อให้อ่านชัด
- Controls ใช้รูปทรงและระยะห่างชุดเดียวกัน มี hover, pressed, focus, selected, disabled และ dialog ที่ใช้ keyboard ได้
- Light/Dark ใช้ semantic color tokens ร่วมชื่อกัน และมีตัวเลือกลดความโปร่งเป็น Tinted/Solid พร้อมรองรับค่าที่ browser เปิดเผยจากระบบ
- ปุ่มหลักมีสีไล่ระดับที่ปลายสว่างยังให้ contrast กับข้อความขาวประมาณ 4.64:1 ผลนี้จำกัดเฉพาะคู่สีดังกล่าว ไม่ใช่การรับรอง WCAG ทุกองค์ประกอบ
- Desktop วางปฏิทินคู่พื้นที่บันทึก ส่วน mobile นำงานบันทึกขึ้นก่อน ใช้แถบนำทางด้านล่างและพื้นที่สำรองท้ายเนื้อหา
- ตารางรายการเปลี่ยนเป็นรายการแบบจัดกลุ่มบนมือถือ ตารางเรียนประจำสัปดาห์ยังเลื่อนแนวนอนได้ ส่วนปฏิทินเดือนใช้ปุ่มจำนวนรอบเพื่อเปิดรายละเอียดที่อ่านและแตะได้ง่ายขึ้น
- Motion ใช้ transition สั้นเพื่ออธิบายการเปลี่ยนสถานะ มีทางเลือก Reduce Motion และพื้นทึบเมื่อไม่รองรับ blur

แนวทางของ Apple ที่ใช้อ้างอิง:

- [Materials](https://developer.apple.com/design/human-interface-guidelines/materials): แยกชั้น controls/navigation ออกจากชั้นเนื้อหา และใช้ glass อย่างมีเหตุผล
- [Designing for macOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-macos/): ใช้พื้นที่หน้าจอและความหนาแน่นที่เหมาะสม พร้อม keyboard interaction
- [Layout](https://developer.apple.com/design/human-interface-guidelines/layout): ลำดับความสำคัญและการปรับ layout ตามพื้นที่
- [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility): ความชัดของข้อความ การโฟกัส และการเข้าถึง controls

นี่คือการแปลหลักการเป็นเว็บด้วย CSS ไม่ใช่ native Liquid Glass renderer ของ AppKit/SwiftUI และไม่อ้างการรับรองจาก Apple ไม่จำลอง traffic lights หรือ menu bar ของระบบปฏิบัติการภายในเว็บ

## Requirement สำคัญที่แสดงในแบบ

1. อุปกรณ์และ Quick Log ใช้ state ตัวอย่างร่วมกัน เพิ่มหรือย้ายสังกัดแล้วรายการใน Quick Log เปลี่ยนตาม เก็บข้อความประวัติเดิมแยกจากตำแหน่งปัจจุบัน
2. Equipment Usage เน้นจำนวนครั้งยืมรายชิ้นและพื้นที่ แทน timeline ที่ผู้ใช้ไม่ได้ใช้
3. ตาราง DL มี 18 รอบจาก 9 วันในชุดตัวอย่าง เดือน พ.ย. 2569: 75 คนต่อรอบ ผู้คุมสอบวันละ 3 คน ใช้ชุดเดียวกันทั้งเช้าและบ่าย ใช้ชื่อสังเคราะห์ทั้งหมด
4. รอบเย็นใหม่คือ 17:00–18:30 กำหนดเวลาเริ่ม–จบชัดเจน ไม่ตีความชื่อรอบเก่าแล้วเปลี่ยนเวลาข้อมูลเดิม
5. จำนวนผู้เข้าสอบเกิน 40 คนเสนอห้อง 406 + 407 มีตัวอย่างการตรวจรอบซ้ำและผู้คุมสอบซ้ำก่อนบันทึก
6. นำเข้าจากรูปแสดงขั้นเลือกไฟล์ → ตรวจวันเวลาและผู้คุมสอบ → ยืนยันและข้ามรายการซ้ำ ต้นแบบยังไม่มี OCR ปุ่มข้อมูลตัวอย่างระบุให้เห็นชัด
7. Staff Analytics เลือกปีงบประมาณไทย 1 ต.ค.–30 ก.ย. และเจาะเดือน ใช้เพื่อวางแผนการกระจายงาน ไม่เสนอคะแนนตัดสินบุคลากร
8. Radar ในโปรไฟล์ยังใช้ `minorTask` และแสดง 8 หัวข้อรองตามข้อกำหนดโครงการ ไม่เปลี่ยนเป็นคะแนนทักษะ
9. Settings แสดงส่วนรูปลักษณ์ การแจ้งเตือน ทั่วไป ข้อมูล และบัญชี เป็นการสาธิต local state ไม่อ้างว่าบริการจริงทำงานแล้ว

## ขอบเขตพฤติกรรมในต้นแบบ

- Flow ยืม/คืน, ย้าย/เพิ่มอุปกรณ์, Combo, preview งาน, เลือกปีงบ/เดือน, เพิ่มรอบ DL และสถานะข้อมูล ใช้ state ในหน่วยความจำ Refresh แล้วกลับชุดตัวอย่าง
- บางคำสั่งใช้หน้าตรวจทานและ feedback ตัวอย่าง เช่น เทมเพลต ตารางเรียน โปรไฟล์ การอนุมัติผู้ใช้และประกาศ ยังไม่ใช่ CRUD ที่เชื่อมระบบจริงครบทุกคำสั่ง
- Role selector แสดงตัวอย่างเมนู/หน้าอนุญาต แต่ไม่ใช่กลไก authorization ของบริการหรือฐานข้อมูล
- รูปที่เลือกแสดงด้วย object URL ในเครื่อง ไม่ส่งออกไป OCR หรือบริการภายนอก
- ไม่มี Firebase SDK หรือ backend requests ในต้นแบบ มีคำขอภายนอกเฉพาะ Google Fonts ซึ่งมี fallback font หากโหลดไม่ได้
- Loading, Empty, Error, Offline และ Retry เปิดตรวจจากปุ่ม “⌘” มุมล่าง หรือหน้า “ชุด UI และสถานะ”
- กด `Ctrl/Cmd+K` เพื่อเปิดเมนูหน้าทั้งหมด และ `Escape` เพื่อปิด dialog

## ผลตรวจที่รันแล้ว

ใช้ Playwright ที่มีอยู่ในเครื่องกับ Edge headless ไม่ติดตั้งแพ็กเกจใหม่:

- ผ่าน 96/96 route renders: 24 มุมมอง × Desktop/Mobile × Light/Dark ตรวจ h1, โลโก้ และ document overflow
- ผ่าน 12/12 interaction scenarios ตามรายละเอียดใน `report.json`
- ตรวจความกว้าง 375, 760, 768 และ 1024px ครบ 24 มุมมองเพิ่มจาก viewport หลัก 1440/390px ไม่พบ document overflow แนวนอน
- สถานการณ์ครอบคลุม navigation, ยืม/คืน, ย้าย/เพิ่มอุปกรณ์, DL รอบเย็นและ validation, fiscal year/month, ขั้นตรวจรูป, appearance, offline, focus ใน dialog และตัวอย่างการเข้าถึงตามบทบาท
- ไม่พบ JavaScript runtime errors ในชุดตรวจ และตรวจ origins ของ network requests ว่าเป็น Google Fonts เท่านั้น
- ตรวจภาพบอร์ดรวมครบ 24 มุมมองทั้ง 4 รูปแบบ และตรวจรายละเอียดหน้าหลัก/มือถือที่มีการแก้ layout
- Syntax check ของ JavaScript และ parse/ตรวจ bounds ของ geometry สำหรับเตรียม Figma ผ่าน การ compile สคริปต์ไม่ได้หมายความว่า import เข้า Figma ผ่านแล้ว
- ไม่รันชุด unit tests ของแอปซ้ำ เพราะไม่ได้แก้ runtime source ของแอป Baseline เดิมยังเป็น 217 ผ่าน/8 ล้มเหลว

คำสั่งตรวจซ้ำ:

```powershell
node docs/design/phase1/revision3/verify.cjs '<existing-playwright-module>' '<browser-executable>'
node docs/design/phase1/revision3/prepare-handoff.cjs '<existing-playwright-module>' '<browser-executable>'
node docs/design/phase1/revision3/review-boards.cjs '<existing-playwright-module>' '<browser-executable>'
```

## สิ่งที่ยังต้องตรวจและจุดอนุมัติเฟสถัดไป

ยังต้องตรวจ Figma native layers, Auto Layout, component instances และ prototype reactions หลังนำเข้า รวมถึง Safari/iOS จริง, screen reader, text zoom, contrast บนทุก material/state และ UAT กับทีม 8 คน

ยังไม่มีหลักฐานว่าต้นแบบนี้ทำงานเร็วกว่าของเดิม ต้องให้ทีมลองงานยืม/คืน ลงตาราง และดูปีงบเทียบกับแอปปัจจุบันก่อนสรุปผลทางวิจัย

ให้ Tech Lead ตรวจทิศทางภาพและ flow ของชุดนี้ก่อนเสนอแผน implementation แยกตามส่วน การอนุมัติออกแบบครั้งนี้ไม่ถือเป็นอนุมัติให้ push หรือ deploy
