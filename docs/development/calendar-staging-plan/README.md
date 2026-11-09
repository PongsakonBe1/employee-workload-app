# แผน staging สำหรับปฏิทินแบบอ่านอย่างเดียว

10 พฤศจิกายน 2569 · Branch `codex/calendar-staging-plan` ต่อจาก UAT `c9f7b04`

ผู้ใช้อนุมัติให้กำหนดขอบเขต staging และมอบหมายให้เลือกวิธีตามกระบวนการพัฒนาระบบ เอกสารนี้เตรียมเป้าหมาย ข้อมูลที่จะใช้ การตรวจสอบ และขอบเขตการสร้างทรัพยากรให้ตรวจได้ **ยังไม่ได้สร้าง project หรือ deploy บน cloud**

## วิธีที่เลือก

ใช้ **Firebase project แยกสำหรับ staging** เพื่อแยก Auth, Firestore, rules, IAM และการ deploy ออกจากระบบที่ทีมใช้งานจริง ตาม [Firebase: แยก project ในแต่ละ environment](https://firebase.google.com/docs/projects/dev-workflows/general-best-practices) และ [แนวทาง development → staging → production](https://firebase.google.com/docs/projects/dev-workflows/overview-environments)

การแยกเฉพาะ database หรือ prefix collections ภายใน project เดิมยังแชร์ขอบเขตบางส่วน เช่น Auth/IAM/การตั้งค่า project จึงไม่เลือกเป็น staging หลักของงานรอบนี้

| Environment | เป้าหมาย | ใช้ทำอะไร |
|---|---|---|
| Development/Test | `demo-calendar-readonly` บน Emulator | แก้โค้ด รัน Unit/SIT/E2E/reset fixture และทดสอบคำขอที่ต้องถูกปฏิเสธ |
| Staging ที่เสนอ | `labboy-workload-app-staging` | ตรวจ SDK, Auth, index enforcement และ UAT กับบริการจริงด้วยข้อมูลสังเคราะห์ |
| Production เดิม | `labboy-workload-app` | ระบบที่ทีมใช้งานเดิม ไม่มีการอ่าน documents หรือเปลี่ยนข้อมูลจากแผนนี้ |

Project ID staging เป็นชื่อที่เสนอ ยังไม่ยืนยันความว่างของชื่อทั่วระบบ หากสร้างชื่อนี้ไม่ได้ต้องรายงานสาเหตุและเลือกชื่อใหม่ ไม่เปลี่ยนไปใช้ production แทน

## ข้อเท็จจริงที่ตรวจแล้ว

- `firebase/.firebaserc` มีทั้ง alias `default` และ `development` ชี้ `labboy-workload-app` เหมือนกัน จึงใช้ชื่อ alias เป็นหลักฐานว่าเป็น staging ไม่ได้
- อ่านเฉพาะ metadata ด้วยบัญชีที่ผู้ใช้ระบุ พบ `projects/labboy-workload-app/databases/(default)` เป็น `FIRESTORE_NATIVE`, edition `STANDARD`, location `asia-southeast1`
- จากรายการ project ที่บัญชีนี้มองเห็น ในกลุ่มชื่อ `labboy-workload-app` พบเฉพาะ project เดิม ไม่ยืนยันว่าไม่มี project ทดสอบที่ใช้ชื่ออื่น
- ไม่มีการอ่าน collection `users`, `worklogs`, `classroomSchedules` หรือ `dlExamSchedules` ของ project จริง ไม่มีการอ่าน credential files หรือแสดง raw auth errors
- Emulator ผ่าน Unit 461, SDK/Rules/SIT 3 กลุ่ม, denied writes 15, browser/anonymous redirects และ UAT การอ่านเบื้องต้นตาม [รายงานเฟสก่อน](../calendar-emulator-readonly/README.md)

หลักฐาน metadata แบบลดข้อมูลอยู่ใน `metadata-review.json` ไม่เก็บ token, อีเมล หรือรายละเอียดเอกสารจริง

## แผนดำเนินการ 4 ข้อ

1. **สร้างพื้นที่ staging แยก** หลังได้รับอนุมัติการสร้าง cloud resources ใช้ชื่อที่เสนอ, Standard Firestore `(default)`, `asia-southeast1` ให้ตรง edition/ภูมิภาคเดิม ตรวจแผน billing จริงก่อนใช้ ตั้งใจใช้ Spark และไม่ผูก billing account ไม่เปิด Functions/Storage/Hosting/Analytics เพิ่มในเฟสแรก
2. **ตั้ง Auth และข้อมูลสำหรับ read-only pilot** แยก Firebase Web App/Google Sign-in ออกจากของเดิม ใช้ SDK client/session แยก ไม่มี lastLogin/migration writes แบบ AuthProvider เดิม ผูก UID ผู้ทดสอบกับ directory ของ staging โดยชัดเจน และเตรียมเฉพาะข้อมูลสังเคราะห์ ไม่คัดลอกรายชื่อ/บันทึกจาก production ไม่ย้ายรหัสผ่านหรือบัญชีจำลองจาก Emulator ขึ้น cloud
3. **แยก config และจำกัดการใช้งาน** ทุกคำสั่ง cloud ต้องระบุ Project ID staging และบัญชีที่ใช้ ห้าม fallback ไป `.firebaserc` default ตรวจ target ก่อน deploy rules/indexes เฉพาะ staging; client ทุก role อ่านอย่างเดียว ยังไม่ publish เว็บหรือ Functions และไม่เปลี่ยน aliases/config ของ production
4. **ตรวจและให้ผู้ใช้ UAT ก่อนเลื่อนขั้น** ตรวจ metadata ของ staging ที่สร้างจริง, allow/deny reads/writes, UID/active, calendar bounds/time, index enforcement, cache/จำนวนเอกสาร, logout/session switch/offline และการเปิดจาก PC/mobile ผ่าน preview สำหรับ staging ผลผ่านนี้ยังไม่ใช่อนุมัติ production deployment หรือ writer

Spark เป็นแผนแบบไม่ต้องให้ข้อมูลการชำระเงินตาม [เอกสารแผนราคา Firebase](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans) การไม่ผูก billing account เป็นเงื่อนไขการตั้งค่าที่ต้องตรวจจริง ไม่ใช่การคาดการณ์ว่าทรัพยากรที่สร้างทุกแบบไม่มีค่าใช้จ่าย หาก API/ข้อกำหนดองค์กรต้องใช้ billing หรือสิทธิ์เพิ่มเติม จะหยุดส่วนที่ขึ้นกับเงื่อนไขนั้นและรายงานก่อนเปลี่ยนแผน

## ข้อมูลและ query ที่จะใช้ใน pilot

| ส่วน | ขอบเขต | เงื่อนไข |
|---|---|---|
| Identity | profile ของ UID ผู้ทดสอบใน staging | `active=true`, role Staff/Admin/Superadmin ไม่ใช้ role ที่เลือกเองใน UI เป็นสิทธิ์ |
| Directory | ข้อมูลสังเคราะห์ที่จำเป็นต่อรายชื่อผู้คุม | เก็บเพียง ID, displayName, role, active; ไม่มีอีเมล/เลขบัตร/ข้อมูลผู้รับบริการจริงใน fixture |
| ตารางเรียน | active schedules ของภาคเรียนที่ตรวจ | กำหนด validFrom/validTo ชัดเจน ไม่เดาช่วงของเอกสารเก่า |
| DL | เดือนที่ครอบคลุมมุมมองที่เลือก | explicit start/end มาก่อน timeSlot; รอบ 17:00–18:30 และประวัติ 15:00–16:00 ต้องไม่ถูกสลับ |
| ข้อมูลอื่น | ไม่ใช้ | ไม่อ่าน worklogs, notifications, audit logs หรือข้อมูลอุปกรณ์ใน read-only calendar pilot |

เริ่มใช้ช่วงอ้างอิงเดือนพฤศจิกายน 2569 และภาคเรียน 2/2569 ด้วย fixture ที่ตรวจได้ตามต้นแบบ 1 ตารางเรียน / 3 รอบสอบก่อนเพิ่มกรณีเดือนข้างเคียง Query จำกัดไม่เกิน 200 เอกสาร อ่านเผื่อหนึ่งเพื่อตรวจการตัดผลลัพธ์ Cache 2 นาทีและ explicit refresh; month grid อาจต้องอ่านเดือนข้างเคียง จำนวนคำขอไม่เท่ากับ billed document reads

**ผู้ทดสอบที่ login จริง** ต้องมี UID ใน Auth ของ staging โดยเฉพาะ ไม่ใช้ UID จาก production ข้าม project และไม่ใช้ข้อมูลรับรองสังเคราะห์ที่อยู่ใน repo ล็อกอินบน cloud การเตรียมบัญชี/role แรกเป็นขั้น setup ที่แยกจากสิทธิ์ read-only ของ client ข้อมูลส่วนบุคคลของผู้ทดสอบเก็บเท่าที่ Auth จำเป็นต้องใช้ ไม่ commit ลง fixture หรือรายงาน

## เกณฑ์ยอมรับและย้อนกลับ

- target ทุกคำสั่ง/SDK ต้องเป็น staging ที่อนุมัติ ไม่เป็น production หรือ Emulator และต้องยืนยัน edition/ภูมิภาคจากบริการจริง
- ไม่มีการอ่านหรือส่งสำเนาข้อมูล production เข้า staging ใช้ข้อมูลสังเคราะห์ที่ทำซ้ำได้
- client create/update/delete ต้องถูกปฏิเสธทุก role; การเตรียม fixture เป็น setup ที่ระบุขอบเขตต่างหาก
- anonymous/pending/inactive อ่านไม่ได้; Staff/Admin/Superadmin ที่อนุมัติอ่านได้ และไม่เห็น cache ของ session ก่อนหน้า
- เอกสารที่วัน/เวลา/UID ไม่ครบต้องแจ้ง ไม่แสดงปฏิทินที่ถูกตัดว่าครบถ้วน; คำขอซ้ำในเดือนเดิมใช้ cache ตามเงื่อนไขที่ทดสอบแล้ว
- ไม่มีการเปลี่ยน production aliases, credentials, rules, index หรือ deploy เว็บในขั้นเตรียม staging นี้
- หากไม่ผ่าน ให้ปิด runner/session ของ staging กลับไป Emulator ที่ผ่าน UAT และเก็บสาเหตุแบบไม่มี token/ข้อมูลจริง ไม่ reset หรือเปลี่ยน production และไม่ลบ cloud project อัตโนมัติ

## สถานะและการตรวจเอกสาร

สถานะปัจจุบัน: **แผนพร้อมตรวจ / ยังไม่ provision staging** ไฟล์ `target-plan.json` เป็นข้อมูลแผน ไม่ใช่ config ที่ต่อบริการหรือ deploy ได้ทันที ตรวจ JSON syntax, ความต่างของ Project IDs และ diff แล้ว ไม่รันซ้ำชุดทดสอบแอปเพราะยังไม่มีการแก้ runtime code

การสร้าง project/ฐานข้อมูล ตั้ง Auth/seed และ deploy rules/indexes บน staging เป็น cloud changes เฟสถัดไป ต้องอนุมัติขอบเขตนี้ตามกติกา AGENTS.md ที่ผู้ใช้ให้ไว้ก่อนเริ่ม ส่วนการเปิดอ่าน metadata ที่ระบุข้างต้นดำเนินการแล้วตามขอบเขตตรวจสภาพแวดล้อม ไม่มีการใช้ skill เป็นเหตุให้ขออนุมัติเพิ่มเอง
