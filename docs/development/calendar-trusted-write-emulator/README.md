# Calendar trusted write: เฟส Local / Emulator

Branch `codex/calendar-trusted-write-emulator` จาก `9be4514` · ตรวจ 12 พฤศจิกายน 2569 เวลาไทย

ผู้ใช้อนุมัติให้เพิ่ม API สำหรับ create/edit/soft-cancel และเชื่อม `/calendar` ด้วย flag เฉพาะ development/Emulator คง UI เดิม ไม่ติดตั้ง package ไม่เปลี่ยน cloud Rules, profile, billing, production หรือ deploy/push

## สิ่งที่เปลี่ยน

- เพิ่ม Express entry `backend/src/calendar/server.js` แยกจาก server เดิม ไม่โหลด dotenv/MongoDB/FCM configuration ของเดิม
- อนุญาตเฉพาะ `demo-calendar-trusted`, Auth `127.0.0.1:19199`, Firestore `127.0.0.1:18180`, API `127.0.0.1:4321` และ UI `http://127.0.0.1:4313` เท่านั้น Runtime ปฏิเสธ settings อื่นก่อน initialize SDK
- ใช้ Admin Auth ตรวจ ID token/revocation และ project audience/issuer จากนั้นอ่าน profile ใน transaction ใหม่ทุกครั้ง ต้อง active Admin/Superadmin และ `calendarWriter=true` ไม่เชื่อ role/actor/metadata จาก request
- ใช้ pure planners เดิมใน `frontend/lib/calendarCreatePlan.js`, `calendarMutationPlan.js`, `calendarDataAdapter.js` และ `calendarView.js` โดยตรงใน monorepo ไม่ fork กฎธุรกิจหรือเปลี่ยน schema/collection/operation ID
- อ่าน gate, profile, directory, target, receipt และ queries สำหรับ conflict ภายใน Admin transaction ทุก attempt ให้ create/edit/cancel ของ server ใช้ gate เดียวกัน
- จำกัด 100 รายการ/ชุด, ช่วงไม่เกิน 400 วัน และ 200 เอกสารต่อ query เมื่อเกินขอบเขตจะปฏิเสธทั้งชุด ไม่มี partial write
- Server คำนวณ deterministic IDs/operation IDs และสร้าง creation/mutation metadata เอง ปฏิเสธ stale target และไม่เขียนทับ inactive target ใช้ receipt schema 1 สำหรับ create และ schema 2 สำหรับ mutation เช่นเดิม
- อ่านข้อมูลผ่าน reader/cache เดิม แต่เปลี่ยนการเขียนเป็น HTTP transport เฉพาะ runtime ใหม่นี้ ไม่ fallback ไป client writer เมื่อ API ล้มเหลว
- ปิดลิงก์ QA replay สำหรับ cloud เมื่อใช้ Emulator เพราะไม่ตรงกับ frozen packet ของ cloud QA

Firestore Emulator ใช้ **STANDARD edition** ตาม startup log และใช้ Rules อ่านอย่างเดียวเดิมจาก `firebase/calendar-emulator/firestore.rules` โดยไม่แก้ source Rules จึงทดสอบได้ว่า browser เขียนตรงไม่ได้แม้เป็น Admin ส่วน server เป็น privileged SDK และบังคับ business invariants เอง

## Contract

```text
POST /api/calendar/create
Authorization: Bearer <synthetic Emulator ID token>
Content-Type: application/json
Body: { rules, events }
Result: { created, skipped, operationId, repeated }

POST /api/calendar/mutate
Body: { action: "edit" | "cancel", original, replacement? }
Result: { action, changed, operationId, repeated }
```

Server ไม่รับ path ของ project/database/collection โดยอิสระ target ของ mutation ต้องผ่าน planner allowlist/document/version contract ไม่เพิ่ม endpoint สำหรับ physical delete, Undo หรือสอบรายวิชาที่ไม่มี contract

- 400/413 `calendar-write-validation`: ข้อมูลไม่ถูกต้อง/เกินขนาด ไม่บันทึก
- 409 `calendar-write-stale`: รายการเปลี่ยนแล้ว ให้โหลดและตรวจใหม่
- 401/403: token หรือ profile ไม่อนุญาต
- 503/timeout/network error หลังส่ง: ยังยืนยันผลไม่ได้ ไม่อ้างว่าถูกยกเลิก ให้ใช้ชุดเดิมตรวจ receipt

HTTP จำกัด JSON 256kb, ผูก loopback, ตรวจ Host/Origin, ไม่ใช้ cookies และไม่ตาม redirect ไม่ log request body/token/Admin credential/error details ให้ response ใช้ `no-store` CORS เป็นข้อจำกัด browser เพิ่มเติม ไม่ใช่ระบบ authorization

Session boundary เดิม freeze input, ป้องกัน double submit/บัญชีเปลี่ยน, แยก commit จาก read-back failure และ invalidate cache หลังผลสำเร็จ การขยาย `validateConfig` เป็น dependency สำหรับ config ของ demo นี้เท่านั้น ค่าเริ่มต้นของ session ยังตรวจ staging config เดิม SDK client เองตรวจ flags/origin/config ซ้ำก่อน initialize

## การรัน

ใช้ CLI 15.18.0, JDK และ Firestore jar ที่มีอยู่แล้ว ไม่ download/install หรืออ่าน credential files:

```powershell
# Terminal A: dedicated Emulator (ไม่หยุด Emulator เดิม)
node scripts/start-calendar-trusted-emulator.mjs

# Terminal B: API + UI opt-in
node scripts/dev-calendar-trusted.mjs --writer

# สร้าง owned fixtures และรัน SIT; คง fixtures ชั่วคราวไว้สำหรับ browser QA
node scripts/verify-calendar-trusted.mjs
```

UI: `http://127.0.0.1:4313/calendar` เลือกบทบาทสังเคราะห์แล้วเข้าสู่ Emulator ไม่มี Google session/ข้อมูลจริง ล็อกอินใช้ fixture password สาธารณะเดิมใน repo ไม่ใช่ credentials ของบัญชีผู้ใช้

ค่าเริ่มต้น `node scripts/dev-calendar-trusted.mjs` ไม่เริ่ม API และปิด write/mutation flags แม้ Admin ก็อ่านอย่างเดียว ต้องหยุด writer runtime ก่อนสลับโหมดเพราะใช้พอร์ตเดียวกัน โหมด cloud staging เดิมพอร์ต 4311 ไม่เปลี่ยน

`verify-calendar-trusted-extra.mjs` เป็น continuation QA ซึ่งคาดว่า browser ทำ create/edit/cancel ของ `Trusted API · Browser E2E` ครบแล้ว จึงตรวจ gate 11 และ metadata ของรายการนั้น **ไม่ใช่คำสั่งทดสอบ standalone**

```powershell
# หลัง browser QA ตาม flow ในรายงาน
node scripts/verify-calendar-trusted-extra.mjs

# Cleanup เฉพาะ owned synthetic fixtures/accounts ด้วย document update-time preconditions
node scripts/verify-calendar-trusted.mjs --cleanup
```

Seeder ปฏิเสธ namespace ที่ไม่ว่าง เก็บ ownership ใน ignored `.tools/calendar-staging/trusted-fixture.json` และไม่ใช้ reset namespace Cleanup ทำได้แม้ API ปิดอยู่ โดยเรียกเฉพาะ loopback Emulator

## ผลตรวจจริง

- Full Unit: **629 tests / 40 files ผ่าน** รวม config guard, transport result/errors, capability/session boundary และ regression เดิม
- HTTP/Admin/Auth/Firestore SIT: **10 กลุ่มผ่าน** รวม actual Web SDK direct-write denial, role/no-capability/inactive/wrong-project/origin denial, create/replay, PDF review-output batch, DL เย็น 75 คน 406+407, atomic conflict, concurrent writers, stale/edit/cancel และ lost reply
- Extra SIT: **4 กลุ่มผ่าน** ตรวจ metadata หลัง browser, JSON/จำนวน/ขนาด/ช่วงวัน, real commit + simulated read-back failure และ real lost HTTP reply + frozen `retryCreate`
- Browser Edge: Admin เพิ่ม อ่านกลับ แก้ไข ยกเลิก; ข้อมูลยังถูกหลัง reload/login ใหม่; validation ชนห้องคงชื่อและร่างไว้; Staff แยก session อ่านได้โดยเพิ่ม/นำเข้าปิด ไม่มีแก้ไข/ยกเลิก
- Mobile 390×844: ตรวจ active tab ก่อนวัด date/time font 16px และทุก input อยู่ใน viewport; Staff dialog ขอบซ้าย 8/ขวา 372, document width 380; คืน viewport override แล้ว ไม่ใช่ physical Safari/iPhone/Android UAT
- Default read-only runtime: API 4321 ไม่เปิด Admin อ่านข้อมูลได้แต่ปุ่มเขียนปิด ไม่มี client-writer fallback
- Targeted ESLint, Node syntax, diff check และ compatibility export ผ่าน เมื่อจงใจตั้ง flags ทดลองทั้งหมด 1 แต่ NODE_ENV เป็น production ก็ไม่ render development workspace
- Cleanup owned fixtures/accounts ผ่าน ไม่มี namespace reset และหยุด runtime ใหม่ทั้งหมดแล้ว ไม่เปลี่ยน runtime เดิมหรือ cloud

รายงานและภาพอยู่ใน `output/playwright/calendar-trusted-write-emulator/` Raw unit/build logs เก็บ local ส่วนผลสรุปและหลักฐานที่จำเป็นเก็บใน commit

ความผิดพลาดระหว่างพัฒนา: Admin SDK เดิมไม่รับ custom credential สำหรับ `getFirestore` จึงเปลี่ยนเป็น Firestore constructor ที่ export จาก dependency เดิม ชี้ host/ssl/project ของ Emulator โดยตรง ส่วน Auth ใช้ dummy credential สำหรับ Emulator เท่านั้น ไม่มีการ resolve ADC/secret รอบแรกของ SIT ใช้ field `studentCount` ของ document แทน `participants` ของ UI input จึงถูก validator ปฏิเสธ แก้ fixture แล้ว cleanup owned data และรันใหม่ผ่าน เก็บ failure report แยก ไม่อ้างว่า run แรกผ่าน

## ข้อจำกัดและขั้นถัดไป

นี่เป็น implementation ที่ **ตั้งใจปฏิเสธ cloud/production** ยังไม่ใช่ production-ready service:

- Token ของ Auth Emulator เป็นข้อมูลสังเคราะห์/ไม่มี signature จริง ผลนี้ไม่แทนการตรวจ Google signed token และ IAM บน staging
- PDF/OCR รอบนี้ทดสอบผลหลัง review ผ่าน API ไม่ได้ parse PDF/ภาพใหม่ ซึ่งทดสอบแยกในเฟสก่อน
- Read-back/network failure บางกรณีจำลองที่ transport/reader boundary หลัง real API commit ไม่ใช่การตัดเครือข่ายเครื่องจริง
- Query/gate แบบ bounded เหมาะกับ pilot ขนาดทีมนี้ ต้องวัด reads/latency/transaction contention บนโฮสต์จริง ไม่รับรองว่าอ่านน้อยลงหรือฟรีทั้งหมด
- ก่อน cloud rollout ต้องแยก staging server credentials/IAM, TLS, host/origin และ deployment configuration ให้ชัด เพิ่ม abuse/concurrency controls กับ observability ที่ไม่เก็บ token และกำหนดวิธีปิด **direct client writes ทุกเส้นทาง** เพื่อไม่ให้ bypass server เมื่อใช้จริง
- การปิด API/flag ไม่ย้อนข้อมูลที่ commit การคืน client writer เป็น rollback หลัง cutover จะนำความเสี่ยงด้าน business invariants กลับมา จึงควร fallback เป็นอ่านอย่างเดียว

ขั้นต่อไปเสนอให้ review contract และแผน staging server rollout/deny-direct-writes ก่อน อนุมัติ cloud deployment/Rules/IAM แยก พร้อม manifest สังเคราะห์และ rollback ที่ตรวจได้ ไม่มีการเริ่มงาน cloud นี้อัตโนมัติ

เอกสารประกอบ: [Firebase token verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens), [server SDK และ Rules/IAM](https://firebase.google.com/docs/firestore/security/rules-conditions), [transaction isolation](https://firebase.google.com/docs/firestore/transaction-data-contention)
