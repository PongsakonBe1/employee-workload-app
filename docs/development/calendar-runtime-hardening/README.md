# Calendar runtime hardening — ผลตรวจในเครื่อง

วันที่ 17 พฤศจิกายน 2569 · branch `codex/calendar-runtime-hardening` · base `ebd2336`

## สิ่งที่เปลี่ยน

แยก HTTP app และ entry ของ Calendar ไปไว้ใน workspace `calendar-server` เพื่อให้ dependency resolution ใช้ Firebase Admin **14.5.1**, Express **4.22.3** และ Helmet **8.3.0** โดยตรง ส่วน paths เดิมใต้ `backend/src/calendar` เป็น compatibility wrappers และยังใช้ service/planner/config เดิม ไม่เปลี่ยน document contract หรือพฤติกรรม business validation

Firebase Admin 14 ใช้ modular imports; backend เก่ายังต้องใช้ namespace API จึงคง Admin **12.7.0** ของ root/legacy graph ไว้ ไม่เปลี่ยน `backend/package.json`, FCM หรือ notify source และไม่ได้ส่งข้อความ FCM ทดสอบ การแยก workspace ไม่ได้หมายความว่า dependency ร่วมใน lockfile แยกทุกตัว: รอบนี้เปลี่ยนเวอร์ชัน existing nodes 18 รายการ เพิ่ม 45 และลบ 2 ตาม `lock-diff-report.json` รวม Express และ transitive dependencies ที่ legacy backend อาจใช้ร่วมด้วย

Direct versions ของ Next 15.5.18, React 19.2.6, Firebase Web 12.13.0 และ Vitest 4.1.11 คงเดิม การทดลอง update ที่ทำให้ lock เปลี่ยนกว้างถูกทิ้งก่อนรับงาน หลัง reconcile installation ในเครื่องด้วย lock ชุดสุดท้าย ไม่พบ missing/invalid dependencies ของ legacy graph และไม่มีการเปลี่ยนเวอร์ชันเพิ่มในขั้น reconcile

Runtime ใหม่ต้องใช้ Node >=22; ทดสอบจริงบน Windows / Node **24.15.0** มีการปิด metadata-server autodetection ด้วย `METADATA_SERVER_DETECTION=none` ใน entry ทั้งสอง หลัง validation และก่อนโหลด SDK เพื่อไม่ให้ Emulator หรือ Render runtime นี้ลองตรวจหา Google metadata endpoint โดย Render entry ยังต้องใช้ credential file ที่ผ่านการอนุมัติแยกต่างหาก

HTTP ยังปิด writer เป็นค่าเริ่มต้น คง `inflate:false`, Host/Origin checks, token audience/issuer/revocation checks, body/rate/concurrency limits และไม่เปิดเผย token/body/UID ใน logs

## Blueprint ที่เตรียมไว้

`deploy/calendar-staging/render.yaml` เป็น **local candidate ที่ยังไม่ได้ใช้บน Render**:

- branch `codex/calendar-runtime-hardening`; auto-deploy ปิด
- build: `npm ci --omit=dev --ignore-scripts --workspace calendar-server --include-workspace-root=false`
- start: `node calendar-server/src/staging-server.js`
- ใช้ repository root เพื่อเข้าถึง shared pure modules แต่ติดตั้งเฉพาะ Calendar runtime
- `CALENDAR_SERVER_WRITE=0`; ไม่เพิ่ม credentials หรือเปลี่ยน env ของ cloud

สถานะจากเฟสก่อนคือ Render ยังใช้ `d9b21f3` บน branch staging prep; เฟสนี้ไม่ได้ตรวจ live state ซ้ำ ไม่ push, deploy, เปลี่ยน IAM, Rules, profile หรือ production การตรวจ YAML ในเครื่องไม่ใช่ Render API validation

## หลักฐานการตรวจ

รายงานอยู่ที่ `output/playwright/calendar-runtime-hardening/`:

| การตรวจ | ผลและขอบเขต |
|---|---|
| Unit | 671 tests / 43 files ผ่าน |
| Syntax / targeted ESLint | runtime ใหม่, compatibility wrappers และ scripts ที่แก้ ผ่าน |
| Compatibility build | ผ่าน; staging UI ยังคงไม่เปิดใน production build และไม่แตะ production `out` |
| Clean install | scoped `npm ci --ignore-scripts` ผ่าน; dependency walker พบ 216 package nodes รวม workspace ไม่มี Mongoose และไม่ fallback ไป ancestor `node_modules` |
| Clean production boot | entry จาก clean install ทำงานแบบ writer off โดยไม่ให้ credential file; health ผ่าน, create/mutate ถูกปฏิเสธ, project production ถูกปฏิเสธก่อนโหลด SDK |
| Legacy compatibility | source FCM/notify/manifest ตรง base; namespace methods ยังมี; ไม่ initialize app หรือส่ง FCM |
| Scoped npm audit | ไม่พบ advisory ทั้งจาก working lock และ clean installation ตาม scope ที่ npm เลือกให้ Calendar workspace |
| Emulator SIT | 10 กลุ่มหลัก ผ่าน รวม manual/PDF-review/DL-review, 17:00–18:30, 75 คน 406+407, conflicts, atomicity, concurrency, replay, edit/cancel, capability revocation และ lost reply |
| Additional SIT | 4 กลุ่ม ผ่าน รวม browser commits, invalid/oversized payload, commit สำเร็จแต่อ่านกลับล้มเหลว และ frozen retry |
| Warmup | 2 กลุ่ม ผ่าน: ไม่มี POST/token ระหว่าง warmup และ commit/read-back/replay หลังพร้อม |
| Rules candidate | 8 กลุ่ม ผ่านใน demo Emulator เท่านั้น รวม real SDK denials; ไม่ deploy cloud Rules |
| Browser | Edge ผ่าน `/calendar` จริงกับ API ที่ใช้ clean SDK14: Admin create/edit/soft-cancel อ่านกลับได้; Staff หลัง reload อ่านได้ แต่เพิ่ม/นำเข้าไม่ได้; viewport 390×844 ไม่มี document overflow แนวนอน |
| Cleanup | ลบเฉพาะ fixtures/accounts ของชุดทดสอบตาม ownership checks; ไม่ reset namespace; หยุด QA processes และตรวจไม่เหลือ listeners ของชุดนี้ |

ผู้ใช้อนุมัติส่ง dependency metadata ไป npm registry สำหรับ audit แล้ว ผล **0 advisory เป็นเฉพาะ scoped audit นี้** ไม่ใช่ผล audit ทั้ง repository หรือ backend เก่าที่กำลังใช้จริง ตัวเลข dependencies ใน npm audit metadata ไม่ใช่จำนวนแพ็กเกจที่ติดตั้งจริง; ใช้ clean dependency walker สำหรับหลักฐาน 216 nodes

`http-package-report.json` ทดสอบ copied layout โดยอาศัย test dependencies ที่มีอยู่ ไม่ได้ทำ clean install ภายใน script นั้น หลักฐาน clean install/boot ที่แยกจริงอยู่ใน `clean-dependency-graph.json` และ `clean-production-boot-report.json` โดย lock ใน snapshot ตรงกับ working lock ชุดสุดท้าย

SIT ของ PDF/DL ส่ง **review output** เข้า API ไม่ได้ยืนยัน OCR/PDF byte parsing ซ้ำทั้งระบบ Browser รอบนี้ไม่ใช่ UAT ทุกหน้า และไม่มีการทดสอบ Google session จริง, staging Firebase IAM/credentials, Render Linux runtime หรือส่ง FCM ข้อมูลทดสอบเป็น synthetic ใน `demo-calendar-trusted`; npm registry เป็น external service ที่ใช้ดาวน์โหลด/audit packages

## ทำซ้ำ

คำสั่งต่อไปนี้ใช้จาก repository root โดยต้องมี dependencies และ Emulator tools ที่ตรวจไว้แล้ว การ prepare/install สร้าง snapshot ใต้ `.tools/calendar-staging/` และไม่คัดลอก `.env` หรือ credentials:

```powershell
node scripts/verify-calendar-runtime-package.mjs --prepare
node scripts/verify-calendar-runtime-package.mjs --install
node scripts/verify-calendar-runtime-package.mjs
node scripts/verify-calendar-runtime-package.mjs --boot
node scripts/verify-calendar-runtime-package.mjs --legacy
node scripts/verify-calendar-staging-server-prep.mjs --hardening
```

สำหรับ Emulator ให้เปิด launcher ใน terminal แยก:

```powershell
node scripts/start-calendar-trusted-emulator.mjs
```

เปิด API จาก clean snapshot ใน terminal อีกอัน (ไม่ต้องให้ credentials):

```powershell
$calendarSnapshot = (Get-Content .tools/calendar-staging/hardening-package-state.json | ConvertFrom-Json).folder
$env:NODE_ENV = 'development'
$env:CALENDAR_TRUSTED_EMULATOR = '1'
$env:GCLOUD_PROJECT = 'demo-calendar-trusted'
$env:FIRESTORE_EMULATOR_HOST = '127.0.0.1:18180'
$env:FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:19199'
node "$calendarSnapshot/calendar-server/src/emulator-server.js"
```

เปิด UI ด้วย `node scripts/dev-calendar-trusted.mjs --writer --server-preflight --api-running` ซึ่งตรวจ health ของ fixed loopback API ก่อน ไม่ spawn API ซ้ำ รัน `verify-calendar-trusted.mjs` ก่อน จากนั้นใช้ synthetic Admin ใน UI สร้าง/แก้ไข/soft-cancel fixture ตามชุดเดิมก่อนรัน `verify-calendar-trusted-extra.mjs` เพราะ extra verifier คาดว่า gate เท่ากับ 11 แล้วจึงรัน warmup/Rules/cleanup:

```powershell
node scripts/verify-calendar-server-prep-warmup.mjs
node scripts/verify-calendar-server-prep-rules.mjs
node scripts/verify-calendar-trusted.mjs --cleanup
```

Unit ใช้ `TEMP`/`TMP` ใต้ `.tools/test-temp` แล้วรัน `npm test -- --reporter=json --outputFile=output/playwright/calendar-runtime-hardening/unit-report.json`; compatibility build ใช้ `node scripts/check-ui-build.mjs calendar-runtime-hardening` ส่วน targeted lint ใช้ local ESLint พร้อม `scripts/ui-eslint.config.mjs` ไม่ใช้ production build scripts ที่คัดลอกไฟล์ env

## ส่งมอบและขั้นถัดไป

เก็บ local commit เท่านั้น รายงานสรุป, scoped audit, graph, lock diff, test results และภาพ mobile ถูกเลือกเข้า commit; raw Unit JSON/build logs และ installation snapshots คงอยู่ในเครื่อง Backups ของไฟล์ตั้งต้นอยู่ใต้ `.tools/calendar-staging/runtime-hardening-backups/` การย้อนกลับให้กลับไป branch/base ก่อนเฟสนี้พร้อมติดตั้งตาม lock ที่เลือก ไม่ใช้ `reset --hard` หรือเขียนทับงานอื่น

รอผู้ใช้ตรวจรับ ก่อนเสนออนุมัติ push และ redeploy **staging แบบ writer off** เพื่อยืนยัน clean install บน Render, HTTPS/health/CORS และ cold start ของ revision ใหม่ หลังจากนั้นจึงเป็นเฟส IAM/credentials และ trusted writer cloud QA ตามขอบเขตที่ตรวจทาน ยังไม่พร้อมประกาศ production readiness จากผล local phase นี้
