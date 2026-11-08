# ภาพรวมงานและ Staff Analytics — Development

8 พฤศจิกายน 2569 · branch `codex/dashboard-staff-analytics` · เริ่มจาก `41c3ff9`

## ขอบเขตและแบบอ้างอิง

ย้ายหน้า `dashboard` และ `staff` จาก Review 10 (`docs/design/phase1/revision7/planning-d.js` และ `planning-model-d.js`) มาทำงานร่วมกับ shared preview ledger โดยคงลำดับสรุป → แนวโน้ม → หัวข้อรอง/รายชื่อทีม → บริบท และตาราง Staff → รายละเอียด → JD กลาง ไม่เปลี่ยนหน้า production

- `/dev/dashboard`: Staff เห็นตนเอง; Admin/Superadmin เลือกทุกคนหรือรายคนได้
- `/dev/staff`: เฉพาะบทบาท Admin/Superadmin จำลอง; Staff มีทางกลับภาพรวมของตน
- เมนูใน workspace preview เชื่อมไปสองหน้านี้; ยังไม่เปลี่ยน routing ของระบบจริง
- ใช้ QuickLiquid เดิมใน navigation/controls; รายการข้อมูลและกราฟใช้พื้นมาตรฐานที่อ่านชัด มี light/dark, reduced motion และ forced colors

## ความหมายของข้อมูล

ทุกค่ามาจากเอกสารที่โหลดและผ่าน date/employee scope ชุดเดียวกัน ใช้ stable employee ID ไม่ตัดชื่อหน้าและไม่เดาบุคคลจากชื่อคล้ายกัน กิจกรรมซ้ำ ID เดียวกันนับครั้งเดียว

| ค่า | ความหมาย |
| --- | --- |
| กิจกรรม | จำนวนบันทึกย่อยในช่วงที่เลือก |
| ผู้มีบันทึก | จำนวน employee IDs ที่จับคู่รายชื่อได้ |
| วันที่มีบันทึก | จำนวนวันที่มีรายการ; ไม่ใช่วันมาทำงาน |
| หัวข้อรอง | จำนวน minorTask ที่ต่างกัน |
| Combo | นับเฉพาะ comboGroupId ที่มีจริง แยกตาม employee ID; งานเดิมไม่มีรหัสจะไม่เดาจำนวนครั้งบริการ |
| รูปแบบช่วงเวลา | จำนวนบันทึกตามเวลาที่กรอก; ไม่ใช่ชั่วโมงทำงาน |

ไม่มีคะแนนคุณภาพ ประสิทธิภาพ ความขยัน หรืออันดับบุคลากรจากความถี่บันทึก ไม่มีการคาดการณ์เมื่อข้อมูลไม่รองรับ Profile radar และ analytics ของหน้า production ไม่ถูกแก้ไข

## ช่วงเวลาและขอบเขตอ่าน

ค่าเริ่มต้นรายสัปดาห์ จันทร์–อาทิตย์ อ้างอิงวันที่ข้อมูลตัวอย่างในหน้าบันทึกงาน เลือกรายวัน รายเดือน ไตรมาส ปีงบไทย หรือกำหนดเองได้ มีช่วงก่อนหน้า/ถัดไป ช่วงข้อมูลใช้ร่วมระหว่างสองหน้าใน tab เดียว

- ปีงบ: 1 ต.ค.–30 ก.ย.; ไตรมาส ต.ค.–ธ.ค. คือ Q1 ของปีงบ
- แนวโน้มมีช่องวันที่ไม่มีบันทึก; ใช้รายวันถึง 62 วัน รายเดือนถึง 730 วัน และรายปีสำหรับช่วงยาวกว่า
- แสดงไม่เกิน 1,000 รายการก่อน ต้องกดโหลดเพิ่มเอง แสดงคำเตือนยอดยังไม่ครบทั้งในหน้าและ CSV
- ตัวกรองกับรายละเอียดไม่โหลดข้อมูลทั้งหมดอัตโนมัติ
- `planningQueryPlan` ระบุ date bounds, employee scope, orderBy date, limit 1000 และ cursor contract เท่านั้น **ยังไม่ใช่ Firestore adapter**
- การกดโหลดเพิ่มใน develop ใช้ array จำลอง จึงยังพิสูจน์ค่า billing reads, indexes, cursor และ cache บน Firestore จริงไม่ได้

## JD กลาง

หนึ่งชุดต่อปีงบ ใช้ร่วมกันทั้งทีม น้ำหนักต้องรวม 100% และจับคู่หัวข้อรองได้หนึ่งหมวด ข้อมูลที่ยังไม่จับคู่แสดงแยก นับเฉพาะปีงบที่เลือกและอยู่ในช่วงข้อมูลปัจจุบัน ไม่คัดลอกน้ำหนักข้ามปี ไม่ใช้ส่วนต่างของเปอร์เซ็นต์กับจำนวนกิจกรรมเป็นคะแนน

ไม่มี JD จริงที่ยืนยันในเฟสนี้ ค่าเริ่มต้นจึงยังไม่กำหนดน้ำหนัก แบบฟอร์มให้ทดลอง UI ด้วยค่าที่ reviewer กรอก และระบุว่าเป็นข้อมูล develop เก็บในหน่วยความจำ tab เท่านั้น

## การตรวจรับที่ควรลอง

1. เปิดภาพรวม ค่าเริ่มต้นรายสัปดาห์ เปลี่ยนช่วงแล้วทุกกราฟ/ยอดเปลี่ยนพร้อมกัน
2. กดแท่งกราฟ หัวข้อรอง ชื่อเจ้าหน้าที่ ตรวจจำนวนกับรายการต้นทาง และใช้ Escape/ปิดกลับ
3. ใน “ตัวเลือกตรวจแบบ · Development” เปลี่ยน Staff/Admin และเจ้าหน้าที่ A/B เพื่อตรวจขอบเขต
4. กดบันทึกงาน เปิด/ปิดห้อง กลับภาพรวม ยอดเพิ่มหนึ่งรายการ; Undo แล้วกลับมาดูยอดเดิม
5. เปิด Staff ค้นชื่อรวมชื่อเล่น เลือกคน ส่งออก CSV แล้วเทียบกับตารางที่แสดง
6. ทดลองชุด 1,005 กิจกรรม ตรวจคำเตือน 1,000 → กดโหลดเพิ่มเป็น 1,005; ไม่เขียนทับ ledger จริงของหน้า develop
7. กรอก JD รวมไม่ครบ 100% ต้องไม่ผ่าน; บันทึกครบแล้วตรวจหมวดที่ยังไม่จับคู่ เปลี่ยนปีงบต้องไม่ยกน้ำหนักเดิมไปเอง
8. ตรวจบนมือถือจริงทั้ง light/dark ว่าฟอร์มช่วงเวลาและรายละเอียดไม่ล้นและอ่านง่าย

## ผลตรวจและข้อจำกัด

ผลเครื่องมือและภาพอยู่ที่ `output/playwright/dashboard-staff/` ดู `qc-summary.json` ประกอบคำสั่ง/รายงานราย browser

- Targeted unit: 64/64 ผ่าน รวม 12 กรณีใหม่และ shared record/resource contracts
- Browser flows: 8/8 ผ่านทั้ง Edge, Chrome และ Cloudflare preview; matrix 375/390/430/768/900/1000/1440 × light/dark
- เทียบ Review 10 จริง: composition/ช่วงเวลา/ปลายทางรายละเอียด ผ่านที่ 390/900/1440
- Regression สี focused/inactive selection ของทรัพยากร: 5/5 ผ่าน
- Native browser zoom 200%, reduced motion, solid material และ forced colors ผ่าน
- ESLint และ compatibility build ผ่าน; output แยก `.ui-build-check` และยืนยัน fixtures ไม่ render ใน production export
- หลัง full browser flows พบและแก้ focus หลุดเมื่อเปลี่ยน modal จากบุคคล → หัวข้อรอง จึงตรวจ targeted person/task/back/Escape และ hour/source ซ้ำบน Edge/Chrome/Cloudflare ผ่าน ไม่ได้อ้างว่า rerun ทุกชุดหลังการแก้ focus นี้

คำสั่งหลัก (รันจาก root; browser scripts รับ path ของ Playwright runtime และ browser executable ตามเครื่อง):

```text
node node_modules/vitest/vitest.mjs run
node node_modules/eslint/bin/eslint.js --config scripts/ui-eslint.config.mjs frontend/app/dev/dashboard frontend/app/dev/staff frontend/lib/planningPreview.js frontend/lib/previewNavigation.js
node scripts/verify-planning-workspace.cjs <playwright-runtime> <browser-executable> [origin]
node scripts/verify-planning-reference.cjs <playwright-runtime> <browser-executable>
node scripts/verify-planning-detail-focus.cjs <playwright-runtime> <browser-executable> [origin]
node scripts/check-ui-build.mjs dashboard-staff
```

Unit tests ใหม่ 12 กรณีผ่าน ชุดรวม 313 กรณี ผ่าน 305 ไม่ผ่าน 8 ซึ่งตรง baseline เดิมทุกกรณี (`baseline-comparison.json`) จึงไม่ได้อ้างว่าชุดทดสอบรวมเขียวทั้งหมด ปัญหาเดิมอยู่ใน legacy analytics/validation; module ใหม่นี้ไม่เรียกสูตรเหล่านั้น

ยังไม่มี Firebase/Auth/backend SIT หรือ UAT โดยทีมผู้ใช้จริง และยังไม่ได้ตรวจ Safari/iPhone/Android จริง การจำลอง viewport/touch บน Chromium ไม่เท่ากับผลบนอุปกรณ์เหล่านั้น ไม่มี deploy, push หรืออ่าน production data

## ขั้นต่อไปหลังตรวจรับ

ให้ผู้ใช้ตรวจสองหน้าบนเครื่องจริงก่อนเลือกเฟสถัดไป จากนั้นจึงกำหนด JD จริงและแผนเชื่อม data adapter/cache/pagination พร้อม permission/index tests หรือเลือกย้ายฟีเจอร์ที่ยังขาดตาม coverage โดยแยกการอนุมัติเป็นเฟส
