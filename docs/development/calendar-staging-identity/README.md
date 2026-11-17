# Calendar staging identity — สร้างและตรวจสิทธิ์แล้ว

วันที่ 18 พฤศจิกายน 2569 (เวลาไทย) · branch `codex/calendar-staging-identity` · base `4483b46`

## ขอบเขตที่ผู้ใช้อนุมัติ

สร้าง service account, custom role และ IAM binding เฉพาะ `labboy-workload-app-staging` ตาม draft 7 permissions โดยคง Calendar API writer ปิด ไม่ออก key ไม่เพิ่ม credentials ไม่เปลี่ยนแผนบริการ ไม่ deploy แอป/Rules ไม่แก้ profile หรือข้อมูล Firestore และไม่ grant สิทธิ์บน production

| Resource | ผลจริง |
|---|---|
| Service account | `calendar-staging-server@labboy-workload-app-staging.iam.gserviceaccount.com` |
| Display name | Calendar Staging Server |
| Status | Enabled |
| Custom role | `projects/labboy-workload-app-staging/roles/calendarStagingServerPilot` |
| Title / launch stage | Calendar Staging Server Pilot / Alpha |
| Binding resource | Project `labboy-workload-app-staging` |
| Direct project bindings ของ identity ใหม่ | 1 รายการ ตรงกับ custom role นี้ ไม่มี condition |
| User-managed keys | **0** ยืนยันจาก IAM API และ Console |
| API health | 200, staging project ถูกต้อง, `writesEnabled:false` |

ก่อนเริ่มมีเพียง Firebase Admin SDK service account เดิมและไม่มี custom role นี้ บัญชี Gmail ที่ใช้ตรวจครั้งแรกไม่มีสิทธิ์ดู IAM ของ project จึงใช้บัญชี ICIT ที่ผู้ใช้ยืนยันตัวตนแล้ว ไม่มีการเพิ่มสิทธิ์ให้บัญชีบุคคล บัญชี Firebase Admin SDK เดิมและ bindings อื่นคงเดิม

## สิทธิ์ที่บันทึกจริง

| Permission | ใช้สำหรับ |
|---|---|
| `datastore.databases.get` | เริ่ม/rollback transaction |
| `datastore.databases.getMetadata` | อ่าน database metadata |
| `datastore.entities.get` | อ่านเอกสารที่ตรวจใน transaction |
| `datastore.entities.list` | queries สำหรับ conflict/profile directory |
| `datastore.entities.create` | สร้าง schedule และ receipt |
| `datastore.entities.update` | เปลี่ยน gate revision, edit และ soft-cancel |
| `firebaseauth.users.get` | ตรวจสถานะบัญชีและ token revocation |

สิทธิ์ถูกอ่านกลับจาก Console และ IAM API เทียบกับ `iam-role.review.json` ครบทั้ง 7 รายการ ไม่เพิ่ม physical delete, Auth user management, Rules deployment, IAM management หรือ role Owner/Editor

**ขอบเขต IAM เป็น project grant** และ data permissions ไม่ใช่ sandbox ราย collection Runtime ยังคงตรวจ project/default database และ collection allowlist เอง แต่ไม่ได้ลดขอบเขต IAM grant ให้เป็นราย collection เฟสนี้ไม่ได้ audit effective permissions จาก organization/folder/group/principal sets ทั้งระบบ จึงไม่อ้างว่าตรวจสิทธิ์สืบทอดทุกแหล่งแล้ว

## วิธีดำเนินการและเหตุการณ์ที่พบ

1. แยก branch และบันทึก resource/permissions ใน `deploy/calendar-staging/identity-manifest.review.json` ก่อน apply
2. สร้าง custom role ผ่าน Console แล้วอ่านกลับผ่าน Console และ API ตรงกัน 7 permissions
3. ใช้ helper `scripts/calendar-staging-identity.mjs` ผ่าน authenticated client ของ Firebase CLI **15.18.0** ที่ติดตั้งอยู่ ไม่เปิดอ่าน credential files ไม่ดึง/แสดง access token ไม่ใช้ ADC หรือเพิ่มแพ็กเกจ
4. Helper ตรวจ project/account, role และ baseline ก่อนสร้าง identity เก็บ IAM policy snapshots ใน `.tools/calendar-staging/identity-policy-before-*.json` ซึ่งถูก gitignore ไว้ ไม่แสดงหรือ commit รายชื่อ principals ใน backup
5. คำขอแรกสร้าง identity สำเร็จ แต่การ set binding ได้ HTTP **400** จึงอ่านสถานะใหม่ พบ identity จริงแต่ยังไม่มี target binding ไม่ถือว่าทั้งคำสั่งล้มเหลวหรือสร้าง identity ซ้ำ
6. ส่งเฉพาะ binding ชุดเดิมด้วย policy `etag` ใหม่หลังตรวจ identity/description/role และ keys แล้วสำเร็จ ไม่ขยายสิทธิ์ สาเหตุ HTTP 400 แรกยังยืนยันไม่ได้ เก็บ failure report เดิมไว้แยกจากผลสำเร็จ
7. อ่านกลับแยกอีกครั้ง และเทียบ policy ปัจจุบันกับ snapshots ก่อนเปลี่ยนทั้งสองชุด ผลต่างมีเพียง role/member ที่อนุมัติ ไม่มี unrelated binding ถูกเปลี่ยน

`--apply` ไม่รับ identity ที่มีอยู่แล้วตามปกติ ส่วน `--resume-binding` ใช้ได้เฉพาะเมื่อมี failure evidence ว่าเฟสนี้สร้าง identity แล้วแต่ติดที่ bind-role พร้อมตรวจชื่อ/description/keys ก่อนส่งคำขอ ตัว manifest ปัจจุบันปิดรอบ apply ด้วยสถานะ `applied-and-verified` แล้ว ห้ามแก้สถานะกลับเพื่อ grant ซ้ำโดยไม่ review

## ผลตรวจและข้อจำกัด

- Manifest ตรงกับ draft; role API read-back มี 7 permissions; project binding ของ identity มีเพียงรายการที่อนุมัติ
- นำ `etag` จาก getIamPolicy มาใช้ใน setIamPolicy และรักษา policy/conditional bindings เดิม
- Read-only baseline verification ผ่านกับ **2 private snapshots** ว่าต่างเพียง approved binding
- User-managed keys เท่ากับ 0; Console แสดง Enabled / No keys
- GET health จริงยืนยัน writer off หลังเปลี่ยน IAM ไม่มี token หรือคำขอข้อมูล Firebase ใน health probe
- Syntax ของ helper และ JSON parse/manifest checks ผ่าน รวม `git diff --check`
- Local fail-closed checks **5 กรณีผ่าน**: ปิด apply window แล้ว, project production, permission expansion, identity นอก staging และการเปิด writer ที่ผิดจาก manifest ใช้ fixture directory ที่ไม่มี CLI ให้โหลด จึงไม่ authenticate หรือเรียก cloud จาก negative cases
- ไม่รัน Unit/Emulator/build ของแอปซ้ำ เพราะไม่ได้เปลี่ยน runtime, UI หรือ schema ในเฟสนี้ การตรวจหลักคือผล IAM/API/Console จริง ไม่ใช่การอ้างว่า app tests แทนการตรวจสิทธิ์ cloud

**ยังไม่ยืนยัน Firebase connectivity ด้วย identity ใหม่นี้** เพราะไม่มี credential ถูกจัดให้ Render และ health แบบ writer off ไม่ initialize lazy Admin SDK ไม่ได้ทดสอบ effective permission โดยปลอมตัวเป็น service account และไม่ได้อ่านเอกสาร Firestore หรือบัญชี Auth ผู้ใช้ ผลนี้ยืนยันการ provision/read-back ของ identity เท่านั้น

IAM ไม่มีค่าบริการเพิ่มในตัวเอง และเฟสนี้ไม่เปลี่ยน billing plan ค่าการใช้บริการข้อมูลยังเป็นไปตาม plan/โควตาของบริการนั้น การให้สิทธิ์ create/update ใน IAM ไม่ได้เปิด HTTP writer และการปิด HTTP writer ก็ไม่ใช่การถอน IAM grant

## ทำซ้ำเฉพาะการตรวจอ่าน

ใช้บัญชี CLI ที่มีสิทธิ์ตรวจ project เดิม โดยส่ง account ผ่าน argument ไม่ใส่รหัสผ่าน/token ในคำสั่งหรือ repo:

```powershell
node scripts/calendar-staging-identity.mjs --account <existing-cli-account> --verify-baseline
node scripts/verify-calendar-staging-identity-local.mjs
```

คำสั่งนี้ต้องมี private snapshots เดิมในเครื่องเพื่อเทียบ baseline ถ้า clone ใหม่และไม่มี snapshots ให้ใช้โดยไม่ใส่ `--verify-baseline` เพื่อตรวจสถานะปัจจุบัน แต่ห้ามอ้างว่าตรวจ historical delta แล้ว การอ่าน keys API ใช้เฉพาะ user-managed **metadata** ไม่อ่าน private key material

## หลักฐานและการย้อนกลับ

ผลอยู่ที่ `output/playwright/calendar-staging-identity/`: preflight, failure ครั้งแรก, apply, final read-back, writer health และ verification summary พร้อมภาพ role read-back, service account No keys และ filtered IAM binding ไม่มีการ commit raw IAM policy backup, credentials หรือรายชื่อบัญชีบุคคลในหลักฐาน JSON

หากจำเป็นต้องย้อนตามแผนที่อนุมัติ ให้ใช้ fresh policy/etag เอาออกเฉพาะ member ของ identity นี้จาก role นี้ โดยคง bindings อื่น แล้ว disable identity ใหม่ ไม่แทนที่ IAM policy ทั้งชุดด้วย backup เก่า ไม่ลบเอกสาร และไม่เปิด client SDK writer แทน เฟสนี้ไม่ต้องใช้ rollback เพราะ final verification ผ่าน

เก็บ **local commit เท่านั้น** ไม่ push/deploy branch นี้ API บน Render ยังคง runtime revision `8ea0c91` ส่วน identity/grant เป็น cloud configuration ที่เพิ่มในเฟสนี้

หลังผู้ใช้ตรวจรับ ขั้นถัดไปคือเสนอวิธีจัด credentials ให้ staging เท่านั้น โดยผู้ใช้จัดการ credential material เองตามกติกา ห้ามส่ง key ผ่านแชต/repo จากนั้นต้องทดสอบ Firebase connection และ signed-token authorization โดยมีแผนตรวจแบบอ่านอย่างเดียวก่อน อนุมัติ Rules cutover, frozen cloud QA manifest และการเปิด writer แยกต่างหาก

อ้างอิง: [Firestore IAM permissions](https://firebase.google.com/docs/firestore/security/iam), [IAM billing](https://docs.cloud.google.com/iam/docs/billing-questions)
