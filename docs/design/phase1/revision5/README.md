# Design Review 05 — Apple HIG และงานจริงของทีม

วันที่ 4 พฤศจิกายน 2569 · Branch `codex/hig-design-review-05` · ฐาน Review 04: `515b69a`

สถานะ: ต้นแบบ UX/UI เพื่อให้ Tech Lead ตรวจรับ **ยังไม่ใช่การแก้แอป production** ผู้ใช้อนุมัติรอบออกแบบนี้หลังขอปรับแผน Glisse/PDF implementation เดิม

## เปิดตรวจ

รันจากราก repository ด้วย Node ที่มีอยู่แล้ว:

```powershell
node docs/design/phase1/revision5/serve.cjs
```

- [ต้นแบบกดใช้งาน](http://127.0.0.1:4195/#/record)
- [บอร์ด 30 มุมมอง](http://127.0.0.1:4195/gallery.html) เลือก Desktop/Mobile และ Light/Dark
- [ความครอบคลุมและข้อจำกัด](COVERAGE.md)
- [กติกาภาพและ interaction](DESIGN_SPEC.md)
- [ผลตรวจอัตโนมัติ](../../../../output/playwright/ux-phase1/revision5/report.json)

ปุ่ม ⌘ เป็นเครื่องมือผู้ตรวจแบบ เลือก Staff/Admin/Superadmin, Light/Dark และสถานะ Empty/Loading/Error/Offline ได้ ข้อมูลทั้งหมดเป็นสังเคราะห์ A–H การ refresh จะเริ่มข้อมูลใหม่ ไม่ได้เชื่อม Firebase หรืออ่าน credentials

HTTP server รับ GET บน localhost เท่านั้นและอนุญาตเฉพาะไฟล์ต้นแบบ/ภาพของ Revision 05 ไม่เปิดอ่านเอกสารส่วนตัว ไม่รับ upload หรือ mutation API

## ผลประเมิน Review 04 และสิ่งที่เปลี่ยน

Review 04 ยังไม่ตรงเป้าหมายครบ: ปุ่มและการ์ดซ้อน material มากเกินไป เมนูแนวนอนซ่อนปลายทางจำนวนมาก รายการงานบนมือถืออ่านยาก และสีบางสถานะ/คำอธิบายเทมเพลตไม่ตรงความหมาย

Revision 05 ปรับทั้งโครง UX และ UI:

1. Desktop ใช้ sidebar จัด 4 หมวด, toolbar กลาง และ list/detail สำหรับงานที่เลือกตรวจทีละรายการ Mobile ใช้แถบงานหลักด้านล่างและเมนูเพิ่มเติมตามบทบาท เมนูทดลอง/login/pending ไม่ปน navigation งานจริง
2. ใช้ Glass กับ navigation, toolbar, tab bar และ dialog ให้ลอยเหนือเนื้อหา ตาราง กราฟ และฟอร์มใช้ผิวทึบอ่านชัด ลดวงปุ่มนูนซ้อนกัน
3. ปรับสีเป็น semantic tokens ชุดเดียวในสองธีม: น้ำเงินสำหรับ action/focus, เขียวสำหรับสำเร็จ, อำพันสำหรับรอ/ต้องติดตาม, แดงสำหรับไม่อนุมัติ/สูญหาย สีประเภทกิจกรรมใช้ร่วมกับชื่อและเวลา
4. Mobile worklogs เปลี่ยนเป็นแถวสรุปและ sheet รายละเอียด Settings เป็นรายการหมวดแล้วเจาะหน้า ไม่ซ่อนหมวดไว้ในแถบแนวนอน
5. ตารางเรียนวางตามเวลา 08:00–21:00 จันทร์–เสาร์ มือถือเริ่มที่รายการ ตารางสอบใช้วันที่และเวลาเริ่ม/จบชัดเจน รองรับรอบ 17:00–18:30
6. Analytics เปลี่ยนปีงบ/เดือนแล้วคำนวณจาก record สังเคราะห์จริง ไม่คูณค่าคงที่ Profile ใช้ top 8 minorTask ตาม AGENTS; Staff Analytics แยก 6 ตัวชี้วัดสำหรับวางแผน
7. รักษา Quick Log/Combo, อุปกรณ์, รายงาน, สิทธิ์, การแจ้งเตือน และเครื่องมือข้อมูล พร้อมปรับ flow และรายละเอียด ดูขอบเขต local/partial ใน COVERAGE

การประเมินนี้อิง [Apple HIG: Materials](https://developer.apple.com/design/human-interface-guidelines/materials), [Color](https://developer.apple.com/design/human-interface-guidelines/color), [Sidebars](https://developer.apple.com/design/human-interface-guidelines/sidebars) และทิศทาง [macOS 27 Golden Gate](https://www.apple.com/os/macos/) ที่ตรวจวันที่ 4 พฤศจิกายน 2569 โดยเฉพาะการแยกชั้นควบคุมจากเนื้อหาและความอ่านชัด

วัสดุใน prototype เป็น CSS backdrop blur/rim/shadow เพื่อประเมินภาพและโครงหน้า **ยังไม่มี Glisse หรือ native refraction engine** ไม่อ้างว่าเทียบ native Apple แบบ 1:1 หรือได้รับการรับรอง HIG

## ผลตรวจและขอบเขต

ตรวจด้วย Edge/Chromium + Playwright ที่ติดตั้งอยู่แล้ว ไม่มีการติดตั้งแพ็กเกจ:

- 30 มุมมอง × Desktop 1440/Mobile 390 × Light/Dark = 120 ภาพ ตรวจ heading, asset และขอบเขตเอกสาร
- 31 interaction scenarios รวม Quick Log, draft, อุปกรณ์, ปีงบ, DL, ตารางเรียน, import ตัวอย่าง, export/approval, roles, settings, keyboard focus และ offline state
- ตรวจซ้ำ 31 flow หลังปรับ focus กลับปุ่มต้นทางผ่านแล้ว ดู [ผลตรวจ flow ล่าสุด](../../../../output/playwright/ux-phase1/revision5/interactions.json)
- ตรวจทั้ง 30 มุมมองที่ความกว้าง 375, 760, 768 และ 1024 px ไม่ให้เอกสารล้นแนวนอน ตารางสัปดาห์/heatmap เลื่อนได้ภายในพื้นที่ของตัวเอง
- semantic text/background 30 คู่ ผ่านเกณฑ์ 4.5:1 ทั้งสองธีม ค่าต่ำสุด 5.25:1 ดู [contrast.json](../../../../output/playwright/ux-phase1/revision5/contrast.json) ผลนี้เฉพาะพื้นทึบ ไม่ครอบคลุมทุก backdrop ของ Glass
- ตรวจ syntax ด้วย `node --check` และตรวจ diff ก่อนส่ง

```powershell
node docs/design/phase1/revision5/verify.cjs <existing-playwright-module> <edge-executable>
node docs/design/phase1/revision5/review-boards.cjs <existing-playwright-module> <edge-executable>
node docs/design/phase1/revision5/check-tokens.cjs
```

`--smoke` ตรวจ Desktop/Light; `--interactions` ตรวจเฉพาะ flow รายงานเต็มอยู่ใน `report.json` การตรวจด้วยเหตุผลและภาพไม่ถือว่า Safari/VoiceOver/UAT ผ่าน

ยังต้องตรวจบน Safari/iOS, screen reader, zoom/contrast กับข้อมูลจริง และ performance ของ Glass บนอุปกรณ์ทีม การทดสอบนี้ไม่ยืนยัน RBAC/backend/realtime/offline lifecycle ของระบบจริง

## ขั้นถัดไปหลังตรวจแบบ

ให้ Tech Lead ตรวจความหนาแน่น การค้นหางาน ความอ่านง่าย และความเร็วของ flow กับทีม 8 คนก่อน จากนั้นจึงเสนอแผน implementation แยก UI, data consistency, analytics และ PDF/image extraction พร้อม test environment

ยังไม่ติดตั้ง Glisse/pdfjs-dist ไม่ deploy/push ไม่เปลี่ยน Firestore rules/schema และไม่อัปเดต Figma ในรอบนี้ ไฟล์ Review 03/04 คงเดิมเพื่อเปรียบเทียบ
