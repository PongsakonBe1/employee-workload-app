# ปฏิทิน staging อ่านอย่างเดียว

10 พฤศจิกายน 2569 · Branch `codex/calendar-staging-readonly` · ต่อจากแผน `22f617d`

ผู้ใช้อนุมัติการสร้าง staging แยก ตั้ง Auth/Firestore เตรียมข้อมูลสังเคราะห์ deploy rules/indexes เฉพาะ staging และทดสอบก่อนเลื่อนขั้น ตาม [แผนที่อนุมัติ](../calendar-staging-plan/README.md) เอกสารนี้รายงานผลดำเนินการจริง ส่วนแผนเดิมคงเป็นประวัติก่อน provision

## สิ่งที่ตั้งค่าแล้ว

| ส่วน | ผลที่ตรวจได้ |
|---|---|
| Project | `labboy-workload-app-staging` แยกจาก `labboy-workload-app` |
| Firestore | `(default)` · `STANDARD` · `FIRESTORE_NATIVE` · `asia-southeast1` |
| Billing | ตรวจหลังตั้งค่าแล้ว `billingEnabled=false` ไม่มีการผูก billing account |
| Web App | `1:299459134462:web:5f1bd25089a933cdf7b6af` |
| Auth | Google Sign-in เปิดแล้ว แยกจาก production; ไม่คัดลอกบัญชี/รหัสผ่าน Emulator |
| ข้อมูล | 11 documents สังเคราะห์จาก fixture เดิม: users 5, classroomSchedules 1, dlExamSchedules 5 และ profile ขั้นต่ำของผู้ทดสอบที่อนุมัติอีก 1 document |
| Indexes | users(active, role) และ dlExamSchedules(isActive, date) สถานะ `READY` ทั้งคู่ |
| Deployment | เฉพาะ Auth, rules และ indexes ของ staging ไม่มี Hosting/Functions/UI deployment |

Google OAuth redirect URI ใช้ callback ของ Firebase Auth เท่านั้น: `https://labboy-workload-app-staging.firebaseapp.com/__/auth/handler` ส่วน localhost, loopback และ hostname ของ Cloudflare อยู่ใน authorized domains แยกกัน การใส่ client origin เป็น OAuth redirect URI ถูกบริการปฏิเสธและแก้ไขแล้ว

ใช้ CLI 15.18.0 ที่ติดตั้งอยู่ ไม่ติดตั้งแพ็กเกจเพิ่ม ไม่เปลี่ยน `.firebaserc` หรือ alias เดิม เครื่องมือบังคับ Project ID staging/บัญชีผู้ปฏิบัติงานและใช้การยืนยันตัวตนของ CLI โดยไม่อ่าน credential files หรือส่ง token ออกมา Config ฝั่ง browser มีเฉพาะ public Firebase Web SDK fields เก็บในไฟล์ ignored `frontend/public/dev-staging-config.json`; raw CLI/debug logs และ auth setup runtime อยู่ใน `.tools/calendar-staging/` ที่ ignored ไม่อยู่ใน commit

## Flow ที่พัฒนา

เปิด `/dev/calendar-staging` → เข้าสู่ Google ของผู้ทดสอบ → อ่าน profile ตาม UID → ตรวจ active/role → อ่าน directory และ active classrooms → อ่าน DL ตามเดือนที่ครอบคลุมมุมมอง → adapter → ปฏิทินเดิม โดยทุกคำสั่งเพิ่ม/แก้ไข/ลบ/นำเข้าปิดอยู่

- Named Firebase app และ in-memory Auth แยกจาก production/Emulator ไม่มี lastLogin/migration writes จาก AuthProvider เดิม
- ตรวจ exact Project ID, Web App ID และ Auth domain ก่อน SDK initialize ไม่ fallback ไป default config
- แชร์ query transport กับ Emulator ที่ผ่านทดสอบแล้ว ใช้ server reads, limit 200 + หนึ่งรายการเพื่อตรวจผลเกิน, cache อายุ 2 นาที และ explicit refresh
- จำนวนคำขออ่านที่ UI แสดงไม่ใช่ billed document reads; month grid อาจครอบคลุมหลายเดือน
- ล้างข้อมูลเมื่อ logout/session เปลี่ยนหรืออ่านล้มเหลว; timeout 12 วินาทีปิด client แล้วให้เข้าสู่ระบบใหม่
- Route ใช้ได้เฉพาะ development และตรวจว่าไม่ render workspace ใน production compatibility export

ผู้ทดสอบต้อง Google sign-in ใน staging อย่างน้อยหนึ่งครั้งก่อน เครื่องมือ `provisionReader` จึงผูก UID ของบัญชีที่อนุมัติกับ profile ขั้นต่ำ `displayName/role/active` ได้ โดยไม่บันทึกอีเมลหรือ UID จริงใน repo/report และไม่ให้ browser สร้างหรือเลื่อน role เอง ชื่อแสดงเป็นชื่อทั่วไป ไม่คัดลอกโปรไฟล์จริง

## Rules ต้นแบบ

อนุญาตเฉพาะ authenticated UID ที่มี profile active และ role staff/admin/superadmin อ่านสาม collections ที่ใช้ ปฏิเสธ client writes ทุกบทบาทและปฏิเสธ paths อื่น Directory ของ pilot มีเฉพาะข้อมูลสังเคราะห์และ profile ขั้นต่ำ ไม่มีอีเมล/ข้อมูลผู้รับบริการจริง ห้ามนำ rules นี้ไปเปิด users collection ของ production ที่มีข้อมูลส่วนบุคคล

I've set up prototype Security Rules to keep the data in Firestore safe. They are designed to be secure for this isolated read-only staging pilot because reads require an active authorized profile, every client write is denied, and the directory contains only synthetic or minimal test profiles. However, you should review and verify them before broadly sharing your app. If you'd like, I can help you harden these rules.

## ผลตรวจและข้อจำกัด

หลักฐานใน `output/playwright/calendar-staging-readonly/`

- Unit **467/467 ผ่าน** รวม config isolation 6 ข้อ; targeted ESLint ผ่าน
- Emulator SDK/Rules/SIT หลังแยก shared transport **3 กลุ่มผ่าน / 15 writes ถูกปฏิเสธ** ตาม `output/playwright/calendar-emulator-readonly/integration-report.json`
- Cloud staging anonymous SDK **4 reads / 3 writes ถูกปฏิเสธ** ไม่ทดสอบ negative writes กับ production
- Cloud query/index/adapter ตรวจด้วยสิทธิ์เครื่องมือเตรียมระบบ: **1 ตารางเรียน / 3 รอบสอบเดือนพฤศจิกายน**, เวลาเริ่ม 09:00, 15:00, 17:00 และ adapter issues 0 การตรวจนี้ยังไม่ใช่หลักฐานการอนุญาตอ่านของ app-user
- Chrome local และ Edge ผ่าน Cloudflare หน้า signed-out **1440 light / 390 dark ผ่าน** config พร้อมใช้ ไม่มี horizontal overflow และ mutation controls ปิดอยู่ ไม่ให้ automation เข้าสู่บัญชี Google
- Calendar regression เดิม **11 กลุ่มผ่าน**, compatibility build ผ่านและไม่เปลี่ยน production output
- ตรวจ syntax ของ scripts และ JSON, `git diff --check` ผ่าน; จัดรูปแบบ staging scripts 4 ไฟล์ด้วย Babel ที่ติดตั้งอยู่และตรวจ AST ว่าไม่เปลี่ยน
- **สถานะล่าสุด:** ผู้ใช้ Google sign-in สำเร็จ ผูก reader profile แล้วและยืนยันว่าเห็นตารางเรียน/รอบสอบตามบันทึก UAT ด้านล่าง ยังไม่ยืนยัน cloud authenticated allow/deny matrix, range/cache/logout จากผู้ใช้, browser coverage บนเครื่องจริง, latency/quota หรือการทำงานของ production

## วิธีตรวจงาน

เปิด [staging ผ่าน Cloudflare](https://northwest-revised-domains-varies.trycloudflare.com/dev/calendar-staging) แล้วกด **เข้าสู่ staging ด้วย Google** ด้วยบัญชีที่แจ้งไว้ หากขึ้นว่ายังไม่มีสิทธิ์อ่าน ให้แจ้งผู้ดูแลเพื่อ bootstrap จากนั้นกด **โหลดข้อมูล staging ใหม่** ภายในหน้าเดิม ไม่ต้องส่ง password/token/UID

ผลที่คาดเมื่อเลือกพฤศจิกายน 2569: 1 ตารางเรียน / 3 รอบสอบ; ทดสอบรายละเอียดและเปลี่ยนเดือน ส่วน month grid อาจโหลดรอบสอบเดือนข้างเคียงเพิ่ม ออกจากระบบแล้วข้อมูลต้องหาย และยังเพิ่ม/แก้ไข/ลบ/นำเข้าไม่ได้

Cloudflare URL เป็น temporary tunnel ผูกกับ develop server ที่เปิดอยู่ หาก hostname เปลี่ยนต้องตรวจและเพิ่ม authorized domain ของ staging ก่อนใช้ ไม่เปลี่ยน OAuth callback เป็น tunnel hostname

คำสั่งที่มีผลเปลี่ยน cloud ใช้เฉพาะในขอบเขตที่ผู้ใช้อนุมัติแล้ว ไม่รัน seed ซ้ำหลังมีงานทดสอบของผู้ใช้โดยไม่ตรวจขอบเขต:

```powershell
# Set this to the authorized operator account; never pass tokens.
$operatorAccount = 'authorized-account@example.invalid'
node scripts/calendar-staging-admin.mjs $operatorAccount billing
node scripts/calendar-staging-admin.mjs $operatorAccount queryValidation
node scripts/calendar-staging-admin.mjs $operatorAccount provisionReader
node scripts/verify-calendar-staging-anonymous.mjs
node scripts/check-ui-build.mjs calendar-staging-readonly
```

หาก pilot ไม่ผ่าน ให้ logout/หยุดใช้ route staging และกลับไป Emulator ที่ผ่าน UAT ไม่มีการลบ project หรือเปลี่ยน production อัตโนมัติ ขั้นถัดไปหลัง UAT คือทบทวนขอบเขต writer/import และเสนอแผนใหม่ก่อนเริ่ม

## แก้ Google popup หลังผู้ใช้ทดสอบ

ผู้ใช้พบว่าเข้าสู่ staging ไม่สำเร็จ ข้อความเดิมรวมทุกสาเหตุเป็นเรื่องบัญชี/domain จึงทำให้วินิจฉัยไม่ได้ ตรวจแล้วพบว่า `initializeAuth` กำหนดเฉพาะ in-memory persistence แต่ขาด `browserPopupRedirectResolver` ขณะที่ `signInWithPopup` ต้องใช้ resolver ตาม [Firebase: custom Auth dependencies](https://firebase.google.com/docs/auth/web/custom-dependencies) SDK ที่ติดตั้งจะคืน `auth/argument-error` ก่อนเปิด Google เมื่อไม่มี resolver; ทดสอบหน้าเดิมแล้วพบว่ากด login ล้มเหลวโดยไม่มี popup

เติม resolver โดยยังใช้ in-memory session และ client แยกแบบเดิม แยกข้อความตาม error codes ที่รู้จัก เช่น popup ถูกบล็อก, domain ไม่อนุญาต, network และผู้ใช้ปิดหน้าต่าง ไม่แสดง raw provider message/code ที่ไม่รู้จัก ซึ่งอาจมีข้อมูลบัญชีหรือรายละเอียดรับรอง ไม่แก้ cloud config หรือ production

ผลตรวจรอบแก้ไข:

- Targeted Unit **24/24 ผ่าน** (error diagnostics/config isolation/read orchestration) รวมทดสอบไม่แสดงข้อความ provider และ arbitrary error code; targeted ESLint, script syntax และ compatibility build ผ่าน
- Chrome local และ Edge ผ่าน Cloudflare **อย่างละ 2 viewports: 1440/390** ใช้ SDK จริงเปิด popup ไปถึง `accounts.google.com` ได้ ไม่พบ redirect/client rejection ที่ตรวจในหน้า Google ปิด popup แล้วหน้าเดิมแจ้ง `auth/popup-closed-by-user` และเพิ่ม/นำเข้าตารางยัง disabled
- การทดสอบใช้ browser context ใหม่ที่ไม่มีบัญชี Google ไม่กรอก credentials ไม่บันทึก OAuth URL/payload/token หลักฐานคือ `auth-unit-report.json` และ `local/popup-report.json`, `public/popup-report.json`
- การรัน Vitest ครั้งแรกใน sandbox ถูก Windows ปฏิเสธ rename cache (`EPERM`) และยังไม่ได้รัน tests จึงรันซ้ำด้วยสิทธิ์เครื่องมือที่อนุมัติแล้วได้ผล 24 ผ่าน ไม่มีการเปลี่ยนโค้ดเพื่อเลี่ยงข้อจำกัดนี้
- popup smoke test นี้ไม่ใช่ authenticated read test หรือ physical Safari UAT; ผลการอ่านด้วยบัญชีผู้ทดสอบบันทึกแยกด้านล่าง

## UAT การอ่าน staging เบื้องต้น — 10 พฤศจิกายน 2569

1. ผู้ใช้ยืนยันว่า Google sign-in สำเร็จและรอสิทธิ์อ่าน staging
2. เครื่องมือ provisioning ตรวจบัญชีที่อนุมัติว่ามี verified Google provider แล้วสร้าง profile ขั้นต่ำใน staging สำเร็จ (`active=true`, `role=admin`, ชื่อแสดงทั่วไป) ไม่มีการเปิดสิทธิ์ client writes หรือบันทึกอีเมล/UID/token ลง repo
3. ตรวจ query ด้วยสิทธิ์เครื่องมืออีกครั้งพบ active directory 4 (staff สังเคราะห์ 3 และ profile ผู้ทดสอบ 1), ตารางเรียน 1, รอบสอบพฤศจิกายน 3, adapter issues 0
4. ให้ผู้ใช้กด **โหลดข้อมูล staging ใหม่** ใน session เดิม ผู้ใช้ตอบว่า **“อ่านสำเร็จ เห็นตารางและรอบสอบแล้ว”** จึงบันทึกว่าการอ่านด้วยบัญชีผู้ทดสอบผ่าน UAT เบื้องต้น ไม่ได้อ้างว่ารัน authenticated browser automation หรือ cloud role matrix ครบแล้ว
5. ผู้ใช้ยืนยันเพิ่มเติมว่า **“ปรับโหมดก็อ่านได้ปกติ”** บันทึกว่าสลับโหมดการแสดงผลแล้วอ่านข้อมูลได้ตามที่ผู้ใช้ตรวจ โดยไม่ได้ระบุว่าทดสอบทุกโหมดหรือทุกช่วงวันที่ จึงยังไม่ถือว่ายืนยัน cache/logout หรือ browser coverage ครบแล้ว

ไม่มีการเปลี่ยน runtime code ในขั้นผูกสิทธิ์/บันทึก UAT นี้ ตรวจ JSON syntax และ diff ของรายงานโดยตรง ไม่รัน Unit/build ซ้ำเพราะไม่มีพฤติกรรมโปรแกรมเปลี่ยน ขั้นต่อไปคือทบทวน range/cache/logout และกรณีสิทธิ์บน cloud ที่ยังไม่ครบ ก่อนเสนอเฟส writer/import ให้ผู้ใช้อนุมัติแยก ไม่มีการเปิดใช้ production หรือเปิด client writes จากผล UAT นี้

## ตรวจ cache/session และแก้ cleanup — 10 พฤศจิกายน 2569

ผู้ใช้สั่งให้ดำเนินการตรวจ cache/session ต่อในเฟสอ่านอย่างเดียว ใช้ branch เดิมและข้อมูลสังเคราะห์ ไม่เปลี่ยน rules, cloud data, Google Auth config หรือเปิด client writes

### ข้อผิดพลาดที่แก้

`close()` ของ staging/Emulator เดิมเรียก sign-out → terminate Firestore → delete named app ต่อกัน เมื่อขั้นก่อน reject จะข้าม cleanup ที่เหลือ พบจาก regression tests ที่ fail ก่อนแก้ 2 ข้อ แก้ด้วย `try/finally` ให้พยายาม cleanup ทุกขั้น แม้ขั้นก่อนล้มเหลว โดยยังปฏิเสธ reads/login ทันทีที่เริ่ม close และคืน promise เดียวเมื่อเรียก close ซ้ำ

เพิ่ม tests สำหรับ late popup หลังปิด session, คำขอเดือนตอบกลับหลัง logout/refresh, cache ของ client คนละตัว, TTL boundary/บัญชีถูก deactivate, partial month failure/retry และ cleanup failure ทั้ง staging/Emulator ไม่มีการเปลี่ยนนโยบาย TTL หรือบังคับให้โหลดทั้งประวัติ

### ผลตรวจจริง

- Full Unit **482/482 ผ่าน** รวม regression เพิ่ม 12 ข้อจากชุดก่อนหน้า; targeted ESLint, script syntax, JSON syntax, diff check และ isolated compatibility build ผ่าน
- SDK/Rules/SIT บน Emulator **3 กลุ่มผ่าน / 15 writes ถูกปฏิเสธ** ใช้ query transport เดียวกับ staging
- E2E Chrome **5 กลุ่มผ่าน**: PC 1440/mobile 390, cache/refresh/TTL, logout ระหว่างคำขอค้าง, timeout → ล้าง UI → login ใหม่ และ anonymous redirects **21/21** ไม่มี page errors, origin ภายนอก หรือ Firestore write RPC
- Edge ผ่าน Cloudflare เปิด Google popup และปิดกลับมาได้ **2 viewports** ใช้ context ที่ไม่ได้ล็อกอิน ไม่กรอก credentials หรือบันทึก OAuth URL/token
- จัดรูปแบบ test/harness 3 ไฟล์ด้วย Babel ที่ติดตั้งอยู่และตรวจ AST ว่าไม่เปลี่ยน

จำนวน transport requests ที่วัดใน E2E ทั้งสองขนาด:

| ขั้น | จำนวนสะสม |
|---|---:|
| อ่านเดือนเริ่มต้น | 4 |
| เปลี่ยน day/week/agenda และ month grid ที่ครอบคลุมเดือนข้างเคียง | 6 |
| explicit refresh กลับมาอ่านเดือนปัจจุบัน | 10 |
| เลื่อน browser clock เกิน TTL แล้วเปลี่ยนมุมมอง | 14 |
| เปลี่ยนมุมมองซ้ำในเดือนเดิมหลังจากนั้น | 14 |

จำนวนเหล่านี้ไม่ใช่ billed reads; TTL ยังเป็น 2 นาที และข้อมูลสิทธิ์/ตารางที่อยู่ใน cache ไม่รับประกันความสดตลอดช่วง TTL

### การตรวจ harness

รอบเริ่มต้นผ่าน flow ปฏิทิน แต่ anonymous routing ค้างเมื่อใช้หน้า/context เดิมวนหลายเส้นทาง เปิด `/admin` แยกแล้ว redirect ปกติ จึงเปลี่ยนเป็น cold entry แยก context ต่อ route และตรวจผ่านครบ 21 เส้นทางโดยไม่ได้แก้ guard ของ production ไม่สรุปสาเหตุเชิงลึกของ browser/navigation จากอาการนี้เพียงอย่างเดียว

ทดสอบ TTL โดยติดตั้ง clock ก่อนสร้าง reader เพื่อให้ตัวอ่านที่เก็บ `Date.now` ไว้ใช้ clock จำลองจริง ส่วนการทดสอบ timeout พักคำขอไว้แล้วปล่อยหลัง logout แยกจาก network error ที่อาจ reject ทันที หลักฐานรอบแรกอยู่ใน `session-initial-browser-report.json`; ผลสุดท้ายอยู่ใน `session-browser/local/report.json` และ `session-unit-full.json` ไม่เขียนทับหลักฐาน UAT เฟส Emulator เดิม

### ขอบเขตที่ยังไม่อ้างว่าผ่าน

การทดสอบ session client ใช้ mocked SDK boundaries และ E2E อ่านจริงผ่าน Emulator ส่วน Google popup เป็น smoke test ที่ไม่เข้าสู่บัญชีจริง จึงยังไม่ใช่ authenticated cloud role-denial/session-edge-case matrix หรือ UAT ครบทุก browser บนอุปกรณ์จริง การอ่าน staging และสลับมุมมองด้วยบัญชีจริงผ่านเฉพาะที่ผู้ใช้ยืนยันไว้ก่อนหน้า ไม่มีการอ่าน credentials หรือใช้ session ของผู้ใช้ทำ automation

ขั้นถัดไปที่เสนอคือจัดแผน writer/import บน staging แยก: เลือกใช้ draft ที่ตรวจแล้ว, ตรวจสิทธิ์/ข้อมูล/การชนซ้ำก่อนบันทึก, วาง idempotency/ขอบเขต batch และผลลัพธ์การบันทึกให้ตรวจได้ แล้วทดสอบ Emulator → staging ด้วยข้อมูลสังเคราะห์ก่อนขอเปิด production ต้องให้ผู้ใช้ตรวจเฟสนี้และอนุมัติขอบเขต writer ใหม่ก่อนลงมือ
