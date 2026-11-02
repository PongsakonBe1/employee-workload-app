# สถานะ Figma — Review 04

ไฟล์เดิม: [labboy Workload — Design Review](https://www.figma.com/design/aVicg4a7OqVnYZiGS31lus?node-id=8-134)

ไฟล์บน Figma ยังเป็น 8 frames จาก revision2 การตรวจครั้งล่าสุดในรอบก่อนวันที่ 2 พฤศจิกายน 2569 พบ Starter MCP tool-call limit จึงยังไม่อัปเดต Review 03/04 และไม่อ้างว่า Figma ชุดใหม่เสร็จแล้ว รอบนี้ไม่ซื้อแผน เปลี่ยนสิทธิ์ หรือนำข้อมูลผู้ใช้จริงขึ้น Figma

Review 04 อยู่ใน [ต้นแบบเว็บ](index.html#/record) และ [บอร์ดรวม](gallery.html) เตรียม `prepare-handoff.cjs`, `export-scene.js`, `figma-import-template.js` เพื่อสร้าง geometry candidates สำหรับ 30 มุมมอง × 4 รูปแบบ ไม่มีการเขียน Figma อัตโนมัติจากสคริปต์ใน repo

รัน prepare แล้วได้ 120 geometry candidates ตรวจ local syntax/bounds/text ผ่าน ผลอยู่ที่ `output/playwright/ux-phase1/revision4/figma-preparation/manifest.json` สถานะ `prepared-only` การตรวจ syntax/bounds/text ในเครื่องไม่เท่ากับ execute หรือ visual QA ใน Figma

เมื่อบริการใช้ได้ ต้องอ่าน skills `figma-use`, `figma-generate-design` และ `figma-generate-library` ตรวจไฟล์/ledger ปัจจุบันก่อน import แล้วจัด Auto Layout, reusable components, variables Light/Dark, text bounds, native glass effects และ prototype reactions ให้ครบ ห้ามถือว่าการแปะ screenshot ทั้งหน้าเป็น editable UI ที่เสร็จแล้ว และห้ามนำ batch เดิมเข้าซ้ำโดยไม่ตรวจ node IDs
