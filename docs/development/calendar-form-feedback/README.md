# แก้ข้อความ validation ค้างในฟอร์มตาราง

10 พฤศจิกายน 2569 · Branch `codex/calendar-form-feedback`

แก้ปัญหาข้อความแจ้งห้องชนของ draft เดิมยังแสดงอยู่หลังผู้ใช้แก้ข้อมูลในหน้าต่างเพิ่ม/แก้ตาราง โดยใช้ handler ของฟอร์มที่อัปเดต entry และล้าง feedback เดิมพร้อมกัน และล้าง feedback ก่อนเริ่มตรวจบันทึกรอบใหม่

เมื่อผู้ใช้เพียงเลื่อนหรือ focus ช่องเดิม ข้อความยังคงอยู่ เมื่อแก้ข้อมูลจริง ข้อความและ `aria-invalid` เดิมจะหายโดยไม่แย่ง focus กลับไปห้อง หากกดบันทึกทั้งที่ข้อมูลยังผิดหรือห้องยังชน จะตรวจและแสดง error ใหม่ตามข้อมูลปัจจุบัน รวมถึงข้อผิดพลาดที่ writer พบจากข้อมูล server ล่าสุด

## ขอบเขต

เปลี่ยนเฉพาะ `frontend/app/dev/calendar/workspace.js` ซึ่งใช้ร่วมกันใน calendar preview และ writer pilot ไม่เปลี่ยน validation/conflict rules, Firestore rules, schemas, permissions หรือ import workflow ระหว่าง writer ทำงาน Dialog มี `inert` ป้องกันแก้ draft อยู่แล้ว จึงไม่ต้องเพิ่มกลไกล็อกอีกชุด

งานอยู่บน branch แยกจาก commit QA เดิม ไม่ push หรือ deploy รอบนี้ไม่มี cloud writes และไม่แก้ตาราง QA สี่รายการใน staging

## ผลตรวจ

| การตรวจ | ผล |
|---|---|
| Unit: `npm test -- --reporter=json --outputFile=output/playwright/calendar-form-feedback/unit-report.json` | 518 tests / 31 files ผ่าน |
| Targeted ESLint: workspace.js ด้วย `scripts/ui-eslint.config.mjs` | ผ่าน |
| Next.js compatibility build ด้วย `UI_BUILD_CHECK=1` และ synthetic public configuration | ผ่าน เก็บ output ใน `.ui-build-check`; development preview ไม่ render ใน production export |
| Browser desktop 1440 × 1000 | 13 assertions ผ่าน: required title, focus, ล้างข้อความเมื่อแก้จริง, focus อย่างเดียวไม่ล้าง, ตรวจชนซ้ำ, แก้ห้อง/วัน/เวลา และบันทึกใน preview |
| Browser responsive 390 × 844 | 8 assertions ผ่าน: focus/scroll ถูกช่อง, แก้แล้วไม่แย่ง focus, ตรวจชนซ้ำ, บันทึกหลังแก้, date/time font 16 px และไม่ล้นแนวนอน |
| SIT: Google-free Auth + Firestore Emulator สอง session | 5 assertions ผ่านกับ server-originated conflict |
| Storage check ของ SIT | มี blocker 1 เอกสาร / 1 receipt; ไม่มีทั้งสอง rejected draft targets หรือ receipts |

SIT ใช้ `demo-calendar-writer`: เตรียม draft ใน A แล้วให้ B เพิ่ม `QA-FEEDBACK-SERVER-BLOCKER` วันที่ 5 ก.พ. 2578 ห้อง 401 เวลา 10:00–11:00 เมื่อ A ส่งโดยยังเห็น snapshot เก่า writer ตรวจข้อมูลล่าสุดและปฏิเสธ แก้ชื่อใน A แล้วข้อความหาย แต่ส่งซ้ำก็ยังถูกปฏิเสธถูกต้อง เก็บ blocker สังเคราะห์ไว้ใน Emulator ไม่ reset namespace หรือเปลี่ยนข้อมูลเดิม จำนวนตารางใน Emulator เพิ่มจาก 137 เป็น 138 รายการ

การตรวจ storage ใช้เฉพาะ references ที่คำนวณจากข้อมูล QA ผ่าน loopback ของ Emulator แบบอ่านอย่างเดียว เป็นหลักฐานการจัดเก็บเพิ่มเติมจาก UI ไม่ใช่หลักฐานการบังคับสิทธิ์ของผู้ใช้

หลักฐานอยู่ใน `output/playwright/calendar-form-feedback/`: `browser-report.json`, `emulator-storage-report.json`, `unit-summary.json`, `lint-report.json`, `build-report.json`, `desktop-error-cleared.jpg` และ `mobile-error-cleared.jpg`

## ข้อจำกัดของเครื่องมือและผลตรวจ

Unit รอบแรกใน sandbox หยุดก่อนรัน tests เพราะเปลี่ยนชื่อ temporary files ของ Vitest ไม่ได้ (`EPERM`) รันบน host แล้วผ่านทั้งหมด ไม่มีการเปลี่ยนโค้ดเพื่อกลบผลตรวจ

Viewport ของแท็บใหม่ต้องกำหนดหลังสร้างแท็บ ตรวจ `innerWidth === 390` ก่อนนับผล mobile แล้ว เก็บ preflight ที่ยังเป็น 1912 px แยกไว้ในรายงาน ไม่นับรวม 26 assertions ปิดแท็บที่ปรับขนาดและคืนหน้าตรวจรับเป็นขนาดปกติแล้ว

Mobile ในการตรวจของ agent เป็น responsive viewport ของ Edge desktop ไม่ใช่ physical iPhone/Safari หรือ Android ผู้ใช้ยืนยันรับการแก้ฟอร์มแล้วเมื่อ 10 พฤศจิกายน 2569 ด้วยข้อความ “ได้แล้วๆ จัดการต่อเลย” ไม่ได้ระบุอุปกรณ์หรือผลราย testcase จึงบันทึกเป็นผลตรวจรับโดยรวม ไม่อ้างว่าได้ทดสอบครบทุก physical browser ผล cloud QA เดิมเป็นหลักฐานแยกจากการแก้ครั้งนี้

## ขั้นตรวจรับ UAT

เปิด [หน้าทดลอง](https://northwest-revised-domains-varies.trycloudflare.com/dev/calendar) ใช้ชุดตัวอย่าง แล้วเลือกวันที่ 2 พฤศจิกายน 2569

1. กดเพิ่มตาราง กรอกชื่อ ตั้งเกิดซ้ำเป็นครั้งเดียว เลือกห้อง 401 เวลา 09:00–10:30 แล้วบันทึก ต้องแจ้งชนกับทักษะดิจิทัล
2. แก้ชื่อหรือข้อมูลในช่องอื่น ข้อความเก่าต้องหายและ focus อยู่ช่องที่แก้ หากบันทึกโดยยังใช้ห้อง/เวลาเดิม ต้องแจ้งชนใหม่
3. เปลี่ยนเป็นห้อง 402 แล้วบันทึก ต้องเพิ่มรายการใน preview ได้
4. บนมือถือ ลองไม่กรอกชื่อแล้วบันทึก ต้อง focus ช่องชื่อ เมื่อเกิด conflict ต้องเลื่อนไปห้องได้สะดวก และไม่มี error เก่าค้างหลังแก้

ข้อมูลใน preview เป็นข้อมูลจำลองในแท็บ การทดสอบนี้ไม่บันทึกไป staging หรือ production หากต้องย้อนกลับ ให้ revert เฉพาะ commit การแก้ฟอร์มบน branch นี้ โดยคง commit หลักฐาน QA ก่อนหน้าไว้
