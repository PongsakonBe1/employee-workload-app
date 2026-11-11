# ปรับข้อความรายละเอียดปฏิทินและปิดจุดล้นของกล่อง QA

11 พฤศจิกายน 2569 · Branch `codex/calendar-detail-polish` · Agent QA ผ่านตามขอบเขต รอผู้ใช้ตรวจรับ

ผู้ใช้อนุมัติให้แยก branch แก้รายละเอียดรายการครั้งเดียว/รายสัปดาห์ และตรวจ desktop/mobile ต่อจาก [ผลทดสอบ cloud writes](../calendar-role-write-qa/README.md) เฟสนี้ไม่มีคำขอเขียน cloud หรือเพิ่มข้อมูลตัวอย่างใหม่

## สิ่งที่เปลี่ยน

ข้อมูล classroom ที่ผ่าน adapter อาจเก็บรายการครั้งเดียวเป็น rule ที่ `validFrom=validTo` แต่ `expandCalendar` ให้ `recurring=true` ตามรูปแบบการจัดเก็บ หน้ารายละเอียดเดิมจึงแสดง “ตารางรายสัปดาห์” ทุก rule

เพิ่ม `calendarDetailPeriod` ใน `frontend/lib/calendarView.js` เพื่อคำนวณข้อความแสดงผลแยกจาก storage/occurrence logic:

- Rule ที่มีวันเริ่มและสิ้นสุดตรงกัน: แสดง **การเกิดซ้ำ / ครั้งเดียว** ใช้วันที่เดิมในส่วนวันที่ของรายละเอียด
- Rule ที่มีช่วงหลายวัน: คงหัวข้อ **ตารางรายสัปดาห์** และช่วงวันที่เดิม แม้มุมมองที่เปิดจะแสดงเพียงหนึ่งคาบ
- Dated events คง layout รายละเอียดเดิม; bounds ที่ไม่สมบูรณ์ไม่สร้างข้อความช่วงผิดและไม่ส่งวันที่ invalid เข้า formatter

เปลี่ยนเฉพาะการ render facts ใน `frontend/app/dev/calendar/workspace.js` ไม่เปลี่ยน `recurring`, schema, expansion, date filters, การบันทึก หรือสิทธิ์

ขณะตรวจมือถือพบผล JSON ในกล่อง development QA มี operation hash ยาว ทำให้หน้าเบื้องหลังล้นแนวนอน เพิ่ม `pre-wrap/overflow-wrap:anywhere` เฉพาะ `pre` ภายใน `.cal-import-dataset-note` ใน `calendar.css` หลังแก้ document scroll width เท่ากับ client width การแก้นี้ไม่เปลี่ยนข้อมูลหรือ actions ของ QA

## ผลตรวจ

| กรณี browser | ข้อมูล | ผล |
|---|---|---|
| Desktop ครั้งเดียว | `QA-ROLE-CLOUD-CREATE` เดิมใน staging วันที่ 23 เม.ย. 2570 ห้อง 402 10:00–11:00 | “การเกิดซ้ำ / ครั้งเดียว”; ไม่ใช้หัวข้อรายสัปดาห์ |
| Desktop รายสัปดาห์ | fixture สังเคราะห์เดิม “ทักษะดิจิทัล” ใน preview | “ตารางรายสัปดาห์ / 2 พฤศจิกายน 2569 – 14 มีนาคม 2570” |
| Mobile ครั้งเดียว | fixture staging เดิม | ข้อความถูกต้อง dialog อยู่ในขอบจอและไม่มี document overflow |
| Mobile รายสัปดาห์ | fixture preview เดิม | ช่วงวันที่ถูกต้องและ dialog อยู่ในขอบจอ |

ทดสอบ Edge desktop ที่ `innerWidth=1912` และ viewport มือถือที่ร้องขอ `390×844` โดยตรวจ `innerWidth=390` จริง; client width 380 เพราะ scrollbar ของ browser, dialog width 364 และขอบ 8–372 ไม่เกิน client width คืน viewport เป็น desktop เดิมและปิดแท็บ preview ที่ใช้ทดสอบแล้ว ภาพ desktop รายสัปดาห์รอบแรกจับก่อน compositor วาด modal จึงจับใหม่หลังอ่าน DOM ในคนละ tool call และตรวจภาพฉบับที่เก็บแล้ว

ข้อมูล staging ใช้ session/snapshot เดิมที่เปิดอยู่ ระหว่างเปลี่ยนเดือนมีสถานะอ่าน 30 ตารางเรียน/18 รอบสอบในพฤศจิกายน และกลับเมษายน 30/0 ไม่เข้าสู่ Google ใหม่หรือทดสอบสิทธิ์ซ้ำ เฟสนี้ไม่อ้างเป็น Auth/SIT ใหม่ หรือเป็นการทดสอบบนเครื่อง iPhone/Android จริง ทดสอบ appearance สีมืดเดิม ไม่เปลี่ยน theme ของผู้ใช้

- Vitest ผ่าน **545 tests / 34 files** เพิ่ม 4 tests ครอบคลุม bounded one-off, weekly ที่มีหนึ่งคาบในมุมมอง, dated event และ invalid bounds รวมยืนยันข้อมูล/การเกิดคาบไม่ถูกเปลี่ยน
- Targeted ESLint และ `git diff --check` ผ่าน
- Compatibility build ผ่านด้วย configuration สังเคราะห์ใน `.ui-build-check` และ workspace development ไม่ render ใน export
- Projected read-only cloud audit เทียบกับผลส่งซ้ำเฟสก่อน: digest ของ schedule/receipt/gate ตรงเดิมทั้งหมด, revision 10, ไม่เขียน records

## หลักฐาน

อยู่ใน `output/playwright/calendar-detail-polish/`:

- `browser-report.json` และภาพ `desktop-once.jpg`, `desktop-weekly.jpg`, `mobile-once.jpg`, `mobile-weekly.jpg`
- `unit-summary.json`, `build-report.json`, `verification-summary.json`
- `cloud-audit-after.json` และ baseline ที่อ้างอิง `../calendar-role-write-qa/cloud-audit-repeated.json`

```text
npm test -- --reporter=json --outputFile=output/playwright/calendar-detail-polish/unit-report.json
node node_modules/eslint/bin/eslint.js --config scripts/ui-eslint.config.mjs frontend/lib/calendarView.js frontend/app/dev/calendar/workspace.js
node scripts/check-ui-build.mjs calendar-detail-polish
git diff --check
```

## ตรวจรับและข้อจำกัด

Agent QA ของข้อความนี้ผ่านแล้ว ยังไม่บันทึก user UAT accepted จนกว่าผู้ใช้ตรวจรับ ไม่ใช้ผลนี้แทน full cloud role matrix หรือ production readiness ไม่เปลี่ยน edit/delete behavior ที่อิงรูปแบบ storage และไม่ push/deploy

ผู้ใช้ตรวจรายการเดิมได้ที่หน้า develop ที่เปิดไว้ หรือ `http://127.0.0.1:4310/dev/calendar-staging` หลังเข้าสู่ staging ส่วน preview สังเคราะห์อยู่ที่ `/dev/calendar` ข้อมูล QA cloud จากเฟสก่อนยังคงเดิม
