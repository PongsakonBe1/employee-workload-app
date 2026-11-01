# สถานะส่งต่อเข้า Figma

วันที่ตรวจล่าสุด: 2 พฤศจิกายน 2569

ไฟล์เดิม: [labboy Workload — macOS HIG Design Review](https://www.figma.com/design/aVicg4a7OqVnYZiGS31lus?node-id=8-134)

## ข้อเท็จจริง

- ไฟล์บน Figma ยังเป็น review รอบก่อน 8 frames ยังไม่ได้อัปเดต Liquid Glass review 03 ครบระบบ
- ลองอ่านผ่าน `use_figma` อีกครั้งแล้ว ได้ข้อความว่า Figma MCP ถึง tool call limit ของแผน Starter
- ไม่ได้เปลี่ยนแผน ซื้อบริการ เปลี่ยนสิทธิ์ หรืออ้างว่าการส่งต่อสำเร็จ
- ต้นแบบเว็บและบอร์ดรวมใหม่อยู่ใน `revision3` ใช้ตรวจ UI ต่อได้ขณะที่ยังอัปเดต Figma ไม่ได้

## ไฟล์ที่เตรียมแล้ว

`output/playwright/ux-phase1/revision3/figma-preparation/manifest.json` มี 96 geometry candidates สำหรับ 24 มุมมอง × Desktop/Mobile × Light/Dark สถานะ `prepared-only`

มีไฟล์ `*.prepared.js` แยกตามมุมมอง แต่ละไฟล์บรรจุ 4 รูปแบบ เตรียมไว้สำหรับใช้ Plugin API ผ่าน `use_figma` เมื่อบริการกลับมาใช้งานได้ อ้าง `fileKey: aVicg4a7OqVnYZiGS31lus`, `pageId: 0:1` และใช้ logo hash จากไฟล์เดิม

Geometry ประกอบด้วยข้อความ แผนผังชั้น DOM, SVG vectors และ computed paints ไม่ใช่ภาพหน้าจอทั้งหน้าที่แปะเข้า frame มี bitmap เฉพาะโลโก้

ตรวจ local syntax ของทุก batch, JSON manifest, จำนวน text/image และ finite bounds ผ่านแล้ว แต่ยังไม่ได้ execute ใน Figma จึงยังยืนยัน native rendering หรือจำนวน nodes หลัง import ไม่ได้

## งานที่ต้องทำเมื่อ Figma ใช้ได้

1. อ่าน skill `figma-use`, `figma-generate-design` และ `figma-generate-library` พร้อมตรวจ state ledger เดิมและ asset ที่เกี่ยวข้องก่อนแก้ไฟล์
2. อ่าน canvas ปัจจุบันและเลือก batch ที่จะสร้าง ห้ามรันทุกไฟล์ซ้ำโดยไม่ตรวจ เพราะแต่ละ batch จะเพิ่ม frames ใหม่ ใช้ผลคืน IDs ทำ ledger และตรวจ recovery เมื่อมีข้อผิดพลาด
3. ตรวจ/แก้ import ให้สอดคล้องกับ API ที่ใช้งานจริง ปรับกลุ่มที่เกี่ยวข้องเป็น Auto Layout และ reusable component instances พร้อม property bindings ก่อนถือเป็น final Figma deliverable
4. ตรวจตำแหน่งข้อความ สีพื้นผิว blur แสงขอบ และ clipping ด้วยภาพจาก Figma ไม่ใช้ผล compile ของ local script แทน visual QA
5. Wire navigation/prototype reactions ตามเส้นทางจริง แล้วทดสอบทั้งสองอุปกรณ์และธีม
6. เก็บกวาดเฉพาะ reference IDs ที่ยืนยันแล้ว เช่น source capture `3:2` ของ review ก่อน หลังตรวจว่าไม่ได้อ้างอิงโดยงานผู้ใช้

สคริปต์เตรียม geometry ใช้ตำแหน่งจาก browser เพื่อเป็นฐาน ยังต้อง reconcile Auto Layout, component properties และ native effects ต่อ จึงไม่ถือว่าเป็นไฟล์ Figma ที่เสร็จแล้ว และไม่ควรนำขึ้น production โดยข้ามการตรวจแบบ
