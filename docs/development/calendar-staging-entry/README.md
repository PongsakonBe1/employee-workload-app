# ปฏิทินใหม่ใน flow หลักของ staging

11 พฤศจิกายน 2569 · Branch `codex/calendar-staging-entry` · Agent QA ผ่านตามขอบเขต รอผู้ใช้ตรวจรับ

## ขอบเขตที่อนุมัติ

นำ shared Calendar workspace ที่ผ่านการ review มาเปิดที่ `/calendar` ใน runtime staging แยก อ่านข้อมูลผ่าน Google session ของผู้ทดสอบจริง เมนูที่ยังไม่เชื่อมแสดงหน้าพักใน staging และรักษา Auth/ปฏิทินเดิมเมื่อปิด feature flag เฟสนี้ไม่เพิ่มตาราง ไม่แก้ profile/rules และไม่ deploy หรือ push

## การแยกสภาพแวดล้อม

- `node scripts/dev-staging-ui.mjs` เปิด `http://127.0.0.1:4311/calendar` พร้อม flag อ่านอย่างเดียวและ cache build แยก `.next-staging-entry`
- ใช้เฉพาะ public config ที่ validate ว่าเป็น `labboy-workload-app-staging` เท่านั้น ถ้า config หายหรือผิดจะปิดการเข้าถึง ไม่ fallback ไป production
- Named Firebase app ใช้ Auth ใน memory และ SDK ที่ไม่มี writer/role QA API ทั้ง Staff และ Superadmin
- Auth เดิมเลือก `[DEFAULT]` ชัดเจน ไม่เลือก named staging app จากลำดับ app ที่ initialize
- `node scripts/dev-staging-ui.mjs --legacy` ปิด entry flag โดยคง cache runtime แยก ส่วน runtime เดิมพอร์ต 4310 กำหนด flag ปิดเสมอ
- Flag เปิดได้เฉพาะ `NODE_ENV=development` แม้ส่ง public flag เป็น `1` ใน production build ก็ยังใช้ legacy page

## สิ่งที่เปลี่ยน

ย้าย Calendar workspace/views/forms/CSS และ holiday fixture ไป shared paths โดยคง thin re-export ของหน้า develop เดิม รองรับข้อมูล/session/navigation ผ่าน props จึงไม่ดึง mock fixtures จาก develop เข้าหน้า staging หลัก

Provider อยู่เหนือ route เพื่อคง named app และ reader cache ระหว่างการสลับเมนู ปรับ href ของ Dock/sidebar/launcher/mobile/profile/help ให้ปลอดภัยทั้งคลิกปกติและเปิดแท็บใหม่ เส้นทางที่ยังไม่เปิดจะไป `/staging?section=…` และตรวจ section ตามบทบาท Deep link ที่ไม่ได้อนุญาตจะไม่ render legacy children

Logout ล้าง user/cache และ invalidate ผล sign-in/read ที่ยังไม่กลับมา บัญชีใหม่ไม่รับ snapshot จากบัญชีเดิม เมื่ออ่านถูกปฏิเสธจะล้าง session ปิดข้อมูลและให้เข้าสู่ระบบใหม่ การ reload เต็มหน้าใช้ Auth ใน memory จึงต้องเข้าสู่ Google ใหม่โดยตั้งใจ

หน้า `/calendar` ใช้วันปัจจุบันตาม Bangkok และ UI เดิมที่รับรองแล้ว ปิดเพิ่ม/นำเข้า/แก้ไขสำหรับทุกบทบาท มีสถานะ loading/error/empty/incomplete และ reload ข้อมูล Reader cache เดิมคงอยู่ตาม TTL; ตัวเลขคำขอที่แสดงไม่ใช่ billed reads และไม่รวมขั้นอ่าน profile ก่อนเปิดหน้า

## หลักฐานการตรวจ

- Unit: **562 tests ผ่าน / 36 files** รวม feature flag, safe route, default app selection, cache reuse, logout, account switch, late login/read และ inactive profile
- Targeted ESLint และ `git diff --check` ผ่าน
- Compatibility build ผ่านโดยตั้ง public staging flag เป็น `1` ใน production build เพื่อยืนยันว่า entry ไม่ render ใน export และไม่แตะ production `out`
- Browser QA ที่ตรวจแล้ว: deep link `/admin/users` ใน runtime 4311 เปลี่ยนไป `/staging?section=users` ก่อนเข้าสู่ระบบ; runtime เดิมพอร์ต 4310 เมื่อเปิด `/calendar` ยังคง redirect ไป legacy `/login` และไม่มี staging gate
- Browser QA รวม **18 กรณีผ่าน**: Staff และ Superadmin ใช้ Google session จริง อ่านพฤศจิกายนได้ 30 ตารางเรียน/18 รอบสอบ และเมษายน 30/0; เพิ่ม/นำเข้าปิดสำหรับทั้งสองบทบาท รายละเอียดคาบครั้งเดียวถูกต้องและไม่มีปุ่มแก้ไข
- Staff เปลี่ยนวัน/ตัวกรองห้อง 402 แล้วสลับเมนูทรัพยากรและกลับมาได้โดยไม่เข้าสู่ Google ใหม่ วันที่ มุมมอง และตัวกรองคงเดิม จำนวนคำขออ่านยังเป็น 5 ครั้งตาม cache ในช่วงทดสอบ; Superadmin เริ่มด้วย view state ของบัญชีตนเอง ไม่มีค่าเดือนเมษายนของ Staff ติดมา
- Superadmin เปิดจัดการผู้ใช้ผ่าน launcher ไปหน้าพัก `/staging?section=users` ได้; Staff ที่เข้าด้วย query นี้แสดงหน้าพักทั่วไป ไม่เปิดหน้าจัดการผู้ใช้
- Edge viewport มือถือ `390×844`: `innerWidth=390`, client/scroll width เท่ากันที่ 380; detail dialog กว้าง 364 ขอบซ้าย 8 ขอบขวา 372 ภายในจอ ตรวจ month view และ filter dialog เปลี่ยนห้องได้ คืน viewport เป็น desktop หลังจบ
- Logout Staff ล้างข้อมูลทันที และ reload ยังไม่เข้าสู่ระบบ; reload ระหว่างมี session Superadmin กลับหน้าล็อกอินตาม Auth ใน memory ไม่มีตารางค้าง จึงต้องเลือก Google ใหม่เมื่อ F5 เต็มหน้าโดยตั้งใจ
- Projected read-only audit ก่อน/หลัง: profile version digest ของทั้งสองบัญชีเหมือนเดิม gate digest เหมือนเดิม revision 10 ไม่มี profile/rules/calendar write จากรอบนี้
- Console ไม่พบ hydration mismatch มี error ข้อความ message channel ปิดก่อน listener ตอบ 2 รายการ ซึ่งไม่ทำให้ flow ที่ทดสอบล้มเหลว ยังไม่ยืนยันต้นทางของ listener จึงไม่อ้างว่า console สะอาดทั้งหมด

ผล Unit/compatibility build ไม่ถือแทนผล SIT ของ Google session หรือ Firestore Rules ส่วน browser report เป็นหลักฐาน flow อ่านจริงเฉพาะที่ระบุ audit เปรียบเทียบ projected metadata ไม่ใช่ full collection diff หรือการทดสอบ Rules ทุกสิทธิ์ ไม่อ้างว่าทุกเมนูเชื่อม backend แล้ว

## ไฟล์หลักฐาน

อยู่ใน `output/playwright/calendar-staging-entry/`: `unit-summary.json`, `build-report.json`, `browser-report.json`, `verification-summary.json`, `cloud-audit-before.json`, `cloud-audit-after.json`, `cloud-audit-comparison.json` และภาพ desktop/mobile ของ calendar, detail และ account menu ใช้คาบ QA สังเคราะห์ในภาพที่เก็บสำหรับ review

```text
npm test -- --reporter=json --outputFile=output/playwright/calendar-staging-entry/unit-report.json
node node_modules/eslint/bin/eslint.js --config scripts/ui-eslint.config.mjs frontend/components/calendar frontend/components/staging frontend/components/ui/WorkspaceFrame.js frontend/components/DevelopmentAuthBoundary.js frontend/app/staging frontend/app/calendar/page.js frontend/app/calendar/legacy.js frontend/lib/calendarStagingClient.js frontend/lib/calendarStagingEntry.js frontend/lib/calendarStagingSession.js frontend/lib/firebaseAppSelection.js frontend/lib/firebase.js frontend/lib/previewState.js
node scripts/check-ui-build.mjs calendar-staging-entry
git diff --check
```

## ข้อจำกัดและขั้นต่อไป

ยังเป็น develop runtime บน localhost ไม่เปิดผ่าน Cloudflare รอบนี้ ส่วนอื่นนอกปฏิทินเป็นหน้าพัก ไม่มี production rollout หรือสิทธิ์เพิ่มใหม่ ไม่ได้ทดสอบเครื่อง Safari/iPhone/Android จริง รอผู้ใช้ตรวจรับ flow อ่านอย่างเดียวก่อนเสนอเฟสเชื่อมเพิ่ม/นำเข้าใน flow หลักของ staging
