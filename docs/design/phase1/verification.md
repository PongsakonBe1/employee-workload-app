# ผลตรวจเฟสออกแบบและแผนทดสอบระบบ

วันที่ตรวจ: 1 พฤศจิกายน 2569 (Asia/Bangkok)

## สรุปสถานะ

- เฟสออกแบบมี requirement, interactive prototype และ browser checks ที่รันได้
- Browser scenarios ของต้นแบบผ่าน 8/8; ไม่พบ runtime JavaScript errors หรือ HTTP requests ระหว่างตรวจ
- ชุด unit tests ของแอปเดิมผ่าน 217/225 และล้มเหลว 8 tests ก่อนแก้ application source
- ไม่ได้แก้ application source จึงยังไม่ใช่ผลว่า feature ใน production ผ่านแล้ว
- ไม่ได้รัน application build, Firebase Emulator, production E2E, OCR accuracy, Safari/iOS จริง หรือ UAT ของผู้ใช้
- ยังต้องรอ Tech Lead ตรวจแบบก่อนเริ่ม implementation

## Baseline ก่อนเปลี่ยนแปลงแอป

คำสั่ง: `npm test` จาก root ของ repo

ครั้งแรกใน sandbox ไม่เริ่ม test ได้เพราะ `EPERM` ระหว่าง rename transform cache ของ Vitest จึงรันคำสั่งเดิมด้วยสิทธิ์ที่ระบบอนุมัติ ผลจริง:

| ชุดทดสอบ | ผล |
| --- | --- |
| `analytics.test.js` | ล้มเหลว 5: seasonal outliers, daily outliers, nextPeakPeriod, next academic label, trend threshold |
| `staffMetrics.test.js` | ล้มเหลว 2: consistency ของ daily counts และค่า peakHandling ใน metrics รวม |
| `validation.test.js` | ล้มเหลว 1: accepts tomorrow ได้ false แทน true |
| ชุด fiscalYear, CSV, workLogFilters, commentSuggestions | ผ่านทั้ง 4 suites |
| รวม | 217 ผ่าน / 8 ล้มเหลว / 225 tests / 7 files |

พบ warning เรื่อง ESM ใน `vitest.config.js` ที่ถูกโหลดเป็น CommonJS ด้วย ไม่ได้แก้ config หรือปรับ expectation เพื่อให้ baseline ผ่านในเฟสนี้

## ตรวจต้นแบบจริงใน browser

ใช้ Playwright ที่มีอยู่ใน bundled runtime และ Edge headless ด้วย profile ชั่วคราว เปิดเฉพาะ `file:///.../prototype.html` ไม่ได้เชื่อม Firebase หรือส่งรูปออกภายนอก

เครื่องมือ browser connector เปิด `file:` ไม่ได้และเข้า localhost ของ workspace ไม่ได้ ส่วน browser ใน sandbox ติดสิทธิ์การเขียน profile จึงรันสคริปต์ต่อไปนี้นอก sandbox ด้วยสิทธิ์ที่ระบบอนุมัติ โดยไม่ติดตั้งแพ็กเกจ:

```powershell
# ใช้เมื่อ environment มี playwright อยู่ใน module resolution แล้ว
node docs/design/phase1/check-prototype.cjs

# หรือระบุ path ของ module และ browser ที่ติดตั้งอยู่
node docs/design/phase1/check-prototype.cjs '<playwright-module-path>' '<browser-executable-path>'
```

สคริปต์รันด้วยข้อมูลสังเคราะห์เท่านั้น เขียน report และภาพลง `output/playwright/ux-phase1/` การตรวจรอบสุดท้ายผ่าน:

| # | Scenario | ผล |
| --- | --- | --- |
| 1 | ย้าย DEMO-001 ไป Finn → ยืม/คืนใน Quick Log → ประวัติชั้น 3 ยัง 64 ครั้ง และ Finn มีการยืมใหม่ 1 ครั้ง | ผ่าน |
| 2 | เพิ่มอุปกรณ์ใหม่แล้วปรากฏใน Quick Log; พักใช้งานแล้วปุ่มยืมใหม่ถูกปิด | ผ่าน |
| 3 | เลือกรูปเป็น blob ภายในเครื่อง; draft 18 รอบ; ต้องจับคู่ชื่อและตรวจทานก่อนยืนยัน; จำนวนคน 0 ถูกปฏิเสธ; 40 ใช้ 406 และ 75 ใช้ 406+407 | ผ่าน |
| 4 | ยืนยันได้ 9 วัน/18 รอบ/75 คน; เพิ่ม 17:00–18:30 ได้หนึ่งครั้ง; นำเข้าชุดเดิมซ้ำถูกปิดยืนยัน; Escape ปิด dialog | ผ่าน |
| 5 | FY 2569/2570 และเดือนพฤศจิกายนคำนวณวันต้น/ปลายถูก; KPI, กราฟ, ตารางและยอด CSV ตรงกัน; เปลี่ยน FY แล้ว reset เดือน | ผ่าน |
| 6 | สี่หน้าที่ 1440/1024/768/390/375px ไม่มี overflow แนวนอนระดับ document; System ตามธีม browser; dialog mobile อยู่ใน viewport | ผ่าน |
| 7 | semantic token pairs 8 คู่ทั้ง Light/Dark มี contrast ≥4.5:1; Tab วนอยู่ใน dialog และ Escape ปิดได้ | ผ่าน |
| 8 | ไม่พบ runtime JavaScript errors และไม่มี HTTP requests | ผ่าน |

ตรวจภาพ desktop light/dark, หน้านำเข้า และ mobile ด้วยสายตาแล้ว มีการปรับ dialog ให้ header/footer คงอยู่ขณะเลื่อน และเปลี่ยนไอคอนอุปกรณ์ให้สื่อความหมาย

ระหว่างพัฒนาสคริปต์ตรวจ พบ selector รวมตาราง dialog ที่ปิดแล้ว, event เปลี่ยนธีมยังไม่ dispatch, และตัวอ่านสีไม่รองรับ hex 3 หลัก จึงแก้สคริปต์ตรวจให้ถูกต้อง นอกจากนี้การตรวจ keyboard พบ Tab ออกนอก dialog ได้ จึงเพิ่ม focus loop ในต้นแบบแล้วรันชุดตรวจทั้งหมดซ้ำจนผ่าน ไม่ได้เปลี่ยน test ของแอปเพื่อกลบ baseline

ผล contrast เป็นการตรวจคู่ token ที่กำหนดเท่านั้น ไม่ใช่การรับรอง WCAG ทั้งระบบ ยังไม่ได้ตรวจ screen reader, forced colors หรือ contrast ทุก pixel บนพื้นโปร่ง

หลักฐาน:

- [รายงานผล browser](../../../output/playwright/ux-phase1/report.json)
- [อุปกรณ์ Light](../../../output/playwright/ux-phase1/equipment-light.png)
- [การใช้งานอุปกรณ์ Dark](../../../output/playwright/ux-phase1/usage-dark.png)
- [นำเข้าตาราง](../../../output/playwright/ux-phase1/schedule-import-light.png)
- [ตารางที่ยืนยันในต้นแบบ](../../../output/playwright/ux-phase1/schedule-confirmed.png)
- [ภาระงานบุคลากร Dark](../../../output/playwright/ux-phase1/staff-dark.png)
- [อุปกรณ์ Mobile](../../../output/playwright/ux-phase1/equipment-mobile.png)
- [นำเข้าตาราง Mobile](../../../output/playwright/ux-phase1/import-mobile.png)

## ตรวจ syntax และขอบเขต

```powershell
node --check docs/design/phase1/prototype.js
node --check docs/design/phase1/check-prototype.cjs
git diff --cached --check
```

ตรวจว่า staged changes อยู่เฉพาะ `docs/design/phase1/` และ `output/playwright/ux-phase1/` ไม่รวม frontend/backend/firebase runtime, lockfile, credentials หรือข้อมูลส่วนบุคคลจริง

## แผนตรวจเมื่อเข้าสู่ implementation (ยังไม่รัน)

| ระดับ | สิ่งที่จะตรวจ | Gate |
| --- | --- | --- |
| Unit | FY leap year/ข้ามเดือน, date-only Bangkok, filter, borrow count, operation dedup, unresolved legacy IDs, schedule interval overlap | ทุก case ที่เปลี่ยนผ่าน และ triage baseline เดิมก่อนอ้างว่าชุดรวมผ่าน |
| Integration | ทะเบียน → Quick Log → worklog → สถานะ → report; location snapshot; atomic group; Import retry/concurrent admin | Emulator/test project ข้อมูลสังเคราะห์ ไม่ยิง production |
| Authorization | Staff/Admin/Superadmin/pending และผลการอ่าน/เขียนจริง ไม่ใช้แค่ redirect | rules tests พร้อม positive และ negative cases |
| E2E | หลายเครื่องเห็นการย้ายอุปกรณ์ตรงกัน, active/inactive, รอบเย็นทุก view, conflict confirmation, FY/CSV ตรงกัน | แยก environment และ user fixture ที่ไม่ใช้บัญชีจริง |
| Accessibility | keyboard, focus, labels, contrast, reduced motion/transparency, charts/table text alternatives | ตรวจด้วยเครื่องมือและ manual บน browser เป้าหมาย |
| PWA/Devices | Safari/iOS standalone, Android, desktop, offline draft, retry และ reconnect | ยังไม่กำหนดสัดส่วนอุปกรณ์ทีม ต้องยืนยันก่อนกำหนด matrix สุดท้าย |
| UAT/DSR | task success/time/error ของผู้ใช้ 8 คนก่อน–หลัง | Tech Lead ตรวจรับผลและข้อจำกัดก่อน deploy |

## ก่อนเริ่มเฟสถัดไป

1. Tech Lead ตรวจต้นแบบและยืนยันลำดับความสำคัญ/สิ่งที่ต้องปรับ
2. ตกลงรูปแบบต้นทางของตารางเรียน และความหมายของข้อมูลตารางเก่าที่เวลาขัดกัน
3. เลือกแนวทางอ่านรูปและข้อจำกัดข้อมูลบุคลากร/ค่าใช้จ่ายก่อนเชื่อมบริการจริง
4. เสนอแผน implementation 4 ข้อในขอบเขตที่เลือก พร้อมแผนย้อนกลับและชุดทดสอบ แล้วรออนุมัติ
