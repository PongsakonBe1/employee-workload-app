# ปฏิทินอ่านจาก Firebase Emulator — Develop

Branch `codex/calendar-emulator-readonly` ต่อจาก `4aea95d` ใช้ Auth/Firestore Emulator จริงกับข้อมูลสังเคราะห์ ไม่เชื่อม project จริง ไม่อ่าน service account/token/.env ไม่ deploy หรือ push และไม่แก้ rules/indexes ของ production

## เปิดตรวจ

บนเครื่องพัฒนานี้เปิด [ปฏิทิน Emulator อ่านอย่างเดียว](http://127.0.0.1:4310/dev/calendar-readonly) เลือก **Admin จำลอง** แล้วกด **เข้าสู่ระบบจำลอง** ดูวันที่ 3–4 พฤศจิกายน 2569 เพื่อเทียบเวลา/รายชื่อ และทดลองเปลี่ยนวัน สัปดาห์ เดือน รายการ

- บัญชี Admin/Staff/Superadmin อ่านได้ แต่ปุ่มเพิ่ม/นำเข้าและการแก้ไขในรายละเอียดถูกปิดทั้งหมด
- บัญชีรออนุมัติและบัญชีหยุดใช้เข้าสู่ Auth Emulator ได้ แต่ไม่มีสิทธิ์อ่าน Firestore
- ออกจากระบบล้างข้อมูลและรายละเอียดที่เปิดอยู่ ไม่เก็บ session ของ Emulator ใน Web Storage
- โหลดข้อมูลใหม่ล้าง cache แล้วอ่านจาก server อีกครั้ง หากเชื่อมต่อไม่ได้จะแจ้งปัญหาและไม่แสดงตารางเก่าค้างเป็นข้อมูลปัจจุบัน
- [Cloudflare preview](https://northwest-revised-domains-varies.trycloudflare.com/dev/calendar-readonly) แสดงข้อความว่าโหมดนี้ใช้ได้เฉพาะ localhost และไม่เริ่ม SDK/เชื่อม Emulator ของอุปกรณ์ผู้ชม มือถือเครื่องอื่นยังใช้ [UI ตัวอย่างเดิม](https://northwest-revised-domains-varies.trycloudflare.com/dev/calendar) ได้ เฟสนี้ไม่ได้เปิดพอร์ต Emulator ออกภายนอก

## เริ่มใหม่หลังปิดเครื่อง

เปิด PowerShell ในโฟลเดอร์ repo:

```powershell
# ทำครั้งแรก หรือเมื่อต้องเตรียมเครื่องมือใหม่
& ./scripts/setup-calendar-emulator.ps1

# หน้าต่างที่หนึ่ง: รันค้างไว้
node scripts/start-calendar-emulator.mjs

# หน้าต่างที่สอง: หลัง Emulator พร้อมแล้ว
node scripts/seed-calendar-emulator.mjs
node scripts/dev-ui.mjs
```

คำสั่ง seed ล้างและสร้างใหม่เฉพาะ **demo-calendar-readonly บน loopback ที่ระบุไว้ตายตัว** มี 5 บัญชีจำลอง / 11 เอกสาร ห้ามดัดแปลงให้ใช้ project/host จริง Seeder ใช้กลไก admin ของ Emulator เพื่อเตรียม fixture ไม่ใช้ข้อมูลรับรองจริง ไม่ใช่สิทธิ์ของ client ผู้ใช้งาน UI

Java อยู่ใน `.tools/calendar-emulator/` ซึ่งถูก ignore ใช้เฉพาะ PATH ของ child process ไม่เปลี่ยน Java/PATH ของระบบ Portable Temurin **21.0.13+9** และ Firestore Emulator **1.21.0** ตรวจ SHA-256 ก่อนใช้ CLI เดิม **15.18.0** ถูกตรวจรุ่นก่อนเริ่ม หาก CLI เปลี่ยนรุ่น runner จะหยุดให้ตรวจ runtime ใหม่ ไม่ติดตั้ง npm dependencies เพิ่ม

config อยู่ใน `firebase/calendar-emulator/` แยกจากของเดิม ระบุ Standard edition อย่างชัดเจนสำหรับการทดสอบครั้งนี้ ยังไม่ยืนยัน edition ของ project production ใช้ demo project ตาม [คำแนะนำ Firebase](https://firebase.google.com/docs/emulator-suite/connect_firestore) และ [Java ของ Eclipse Temurin](https://adoptium.net/temurin/releases/?version=21)

| บริการ | ที่อยู่ |
|---|---|
| Firestore | 127.0.0.1:18080 |
| Auth | 127.0.0.1:19099 |
| Hub | 127.0.0.1:14400 |
| Logging | 127.0.0.1:14500 |
| Firestore UI websocket ที่ CLI จอง | 127.0.0.1:9150 |

ตรวจ listener แล้วเป็น loopback ทั้งหมด ไม่เริ่ม Emulator UI/Functions/Hosting/Storage และไม่ export ฐานข้อมูลทดสอบเป็นข้อมูลถาวร

## การอ่านและ Auth

สร้าง named Firebase app แยก ใช้ in-memory Auth และเชื่อม Emulator ก่อนคำขอใด ๆ ไม่ import `frontend/lib/firebase.js` ใน client ใหม่นี้ แยก AuthProvider เดิมออกเฉพาะ route `/dev/calendar-readonly` ใน development เนื่องจาก flow เดิมมี lastLogin/migration writes หน้าอื่นยังใช้ provider เดิม

อ่าน profile ของ UID ที่ sign-in เพื่อตรวจ active/role จาก server จากนั้นอ่าน directory เฉพาะ active staff/admin/superadmin และตารางเรียน active โดย cache ในขอบเขต session ตาราง DL อ่านตามขอบเขตเดือนที่ครอบคลุมมุมมอง ไม่โหลดประวัติทั้งหมด การเปลี่ยน day/week ในเดือนเดิมใช้ cache เดิม ส่วน month grid ที่ข้ามเดือนจะอ่านเฉพาะเดือนเพิ่มเติม

- ไม่เชื่อ role ที่เลือกใน UI เป็นสิทธิ์ Firestore; rules อ่าน profile ของ `request.auth.uid`
- `getDocFromServer/getDocsFromServer` ไม่รายงานสำเร็จจาก SDK cache เมื่อ server ติดต่อไม่ได้
- จำกัด 200 เอกสารต่อชุด อ่านเผื่อหนึ่งเพื่อจับกรณีเกินและแจ้งข้อจำกัด ไม่แสดงผลที่ถูกตัดเป็นข้อมูลครบ
- Cache อายุ 2 นาที มี explicit refresh และล้างเมื่อเปลี่ยนบัญชี/ออกจากระบบ ตรวจ generation เพื่อกัน response เก่าข้าม session
- UI มี timeout 8 วินาทีและปิด client เก่าเพื่อยุติคำขอค้าง สามารถเข้าสู่ระบบใหม่หลังการเชื่อมต่อกลับมา
- ใช้ adapter เดิมเพื่อรักษา UID เวลาเริ่ม–สิ้นสุด และช่วงภาคเรียน ถ้าข้อมูลไม่ครบแจ้งว่าบางรายการยังไม่แสดง ไม่ใช้ปฏิทินที่ไม่ครบตัดสินห้องว่าง

จำนวนคำขออ่านที่แสดงเป็นจำนวนการเรียก transport ไม่ใช่ billed document reads ซึ่งอาจรวมการตรวจ rules และพฤติกรรมบริการอื่นในระบบจริง Cache ไม่ใช่กลไกบังคับสิทธิ์หรือการรับประกันว่าข้อมูลสดตลอดเวลา

## Rules ต้นแบบเฉพาะการทดสอบ

กฎนี้เป็น **prototype** ไม่ใช่ rules สำหรับ deploy: อนุญาตให้อ่านสาม collections เมื่อ UID มี profile ที่ active และ role ที่กำหนด ปฏิเสธ client writes ทุกบทบาทและปฏิเสธ collections อื่น ข้อมูล users จำลองมีเฉพาะ displayName/role/active ไม่มีอีเมลจริงหรือข้อมูลส่วนบุคคลจริง จึงไม่ใช่หลักฐานว่าสามารถเปิดอ่าน collection users ของ production ได้อย่างเหมาะสม

I've set up prototype Security Rules to keep the data in Firestore safe. They are designed to be secure for this local read-only test because reads require an active staff account and all client writes are denied. However, you should review and verify them before broadly sharing your app. If you'd like, I can help you harden these rules.

Skills ที่ใช้: [firebase-auth-basics](C:/Users/Admin/.codex/plugins/cache/openai-curated-remote/firebase/1.2.0/skills/firebase-auth-basics/SKILL.md), [firestore-rules-creation](C:/Users/Admin/.codex/plugins/cache/openai-curated-remote/firebase/1.2.0/skills/firestore-rules-creation/SKILL.md) และ testing-unit-tests/Playwright ตาม workflow เดิม ไม่มีการส่งข้อความหรือข้อมูลให้บุคคลอื่น

## ผลตรวจ

หลักฐานอยู่ใน `output/playwright/calendar-emulator-readonly/`

- Full unit **461 ผ่าน** รวมตัวอ่านใหม่ 15 ข้อ: เดือน/ปีอธิกสุรทิน, concurrent cache, TTL/refresh, account switch/logout, stale response, failure/retry, ข้อมูลนอกช่วง/เกินจำนวน และข้อมูลไม่ครบ
- SDK/Rules/SIT กับ Emulator จริง **3 กลุ่มผ่าน**: anonymous/pending/inactive ถูกปฏิเสธ, Staff/Admin/Superadmin อ่านได้, **15 writes ถูกปฏิเสธ**, ข้อมูลเดิมไม่เปลี่ยน, collection อื่นถูกปฏิเสธ, offline server read ไม่คืน cached success, เวลา/UID/filter/query/cache/session ถูกต้อง
- Chrome local **4 กลุ่มผ่าน**: PC 1440 light / touch 390 dark, อ่านจริง/ดูรายละเอียด/ทุกคำสั่งแก้ไขปิด, cache เพิ่มเฉพาะเดือนที่ยังไม่โหลด, logout/สิทธิ์/เปลี่ยนบัญชี, จำลองตัด Firestore connection → timeout → ล้างข้อมูลเก่า → ต่อใหม่ และ anonymous redirects ของหน้าเดิม **21/21**
- Edge ผ่าน Cloudflare **1 กลุ่มผ่าน**: ไม่เริ่ม client/ไม่เชื่อม loopback ของผู้ชม และไม่มีปุ่ม login ใน public preview ส่วน local flows มีเฉพาะการ sign-in ของ Emulator ไม่พบ Firestore write RPC หรือ legacy profile/migration writes จาก UI และไม่เรียก origin จริงนอกแอป/Emulator
- Regression ปฏิทินตัวอย่างเดิม **11 กลุ่ม**, targeted ESLint, syntax ของ scripts/PowerShell และ compatibility export แยก output ผ่าน หน้า Emulator ไม่ render ใน production export
- จัดรูปแบบไฟล์ใหม่ 12 ไฟล์ด้วย Babel ที่มากับ Next และตรวจ AST ว่าไม่เปลี่ยน ไม่ติดตั้ง formatter เพิ่ม
- ยังไม่ใช่ UAT บน Safari/iPhone/Android เครื่องจริง ไม่ได้ยืนยัน index enforcement, billing, latency, quotas หรือ rules ที่ deploy อยู่ใน production ตาม [ข้อแตกต่างของ Emulator](https://firebase.google.com/docs/emulator-suite/connect_firestore)

## ขั้นถัดไปหลังผู้ใช้ตรวจ

เลือกช่วงข้อมูลและ directory ที่เหมาะสมสำหรับ staging จริง ตรวจ active/UID และรายการเก่าที่ขาดวัน/เวลาให้ครบ แล้วพิจารณา read-only integration กับ project ทดสอบแยก เฟส writer/การนำเข้าลงฐานข้อมูลจริง, concurrent edits, rules production และการเปลี่ยน consumer เก่ายังต้องกำหนด/อนุมัติแยก `all-pages-ready = false`
