# Deploy Calendar runtime hardening บน staging

เริ่มดำเนินการ 17 พฤศจิกายน 2569 (เวลาไทย) ตามคำอนุมัติให้ทำเฟสถัดไป หลัง local hardening ผ่านแล้ว

## ขอบเขต

Push branch `codex/calendar-runtime-hardening` และ deploy commit `8ea0c916f4559acde08602e0857eb05750f46ff7` ไป **service เดิม** `labboy-calendar-staging` เท่านั้น โดยคง writer ปิด ไม่เพิ่ม resource/credentials ไม่เปลี่ยน Firebase IAM, Rules, profile หรือ production

| รายการ | ค่า |
|---|---|
| Render workspace | My Workspace (`tea-d8fbbgq8qa3s738qtkhg`) |
| Service | `labboy-calendar-staging` (`srv-dbu3qvdckfvc73b16ku0`) |
| URL | https://labboy-calendar-staging.onrender.com |
| Blueprint | `calendar-staging-readonly` (`exs-dbu3q8rl550s739rnu50`) |
| Blueprint path | `deploy/calendar-staging/render.yaml` |
| Sync | `exe-dbu7vqsipgvc73dq4pb0` |
| Deploy | `dep-dbu8027f3r2c73dabimg` |
| Previous live revision | `d9b21f30dba24b613feb71d4ae9436d3bec44f7e` |
| Target revision | `8ea0c916f4559acde08602e0857eb05750f46ff7` |

## การเปลี่ยนแปลงบน Render

ก่อน apply หน้า sync แสดงเพียง 3 รายการ: เปลี่ยน service branch, build command และ start command ไม่มี environment change หรือ resource ใหม่

```text
branch: codex/calendar-runtime-hardening
build: npm ci --omit=dev --ignore-scripts --workspace calendar-server --include-workspace-root=false
start: node calendar-server/src/staging-server.js
```

คง Free / Singapore และ writer `0` ใช้ repository root เพื่อให้ shared pure modules resolve ได้ ไม่เปิดดู secret values หรือ deploy/sync hook ไม่เพิ่ม connector, CLI หรือ key เพื่อทำงานนี้

หลัง apply ยืนยัน service auto-deploy **Off** และ Blueprint auto-sync **No** จากค่าที่แสดงใน settings โดยตรง Production deploy list ยังคง `main` / `48c08be6b308a7f8ef6c346f4cc525752e6075ea` ไม่มี deploy ใหม่จากการทำงานรอบนี้

## หลักฐาน build และการตรวจ

Render checkout target revision ถูกต้องและใช้ Node **24.15.0** จากนั้น scoped `npm ci` ติดตั้ง **216 packages**, audit **218 packages**, รายงาน **0 vulnerabilities** และ build สำเร็จ ตัวเลขนี้เป็นของชุด Calendar ที่ติดตั้งใน deployment นี้ ไม่ใช่ผล security scan ทั้ง repo หรือ backend production

Deployment เป็น **Live** ใช้เวลา **2 นาที 7 วินาที** Runtime log ระบุ `mode:staging`, `writesEnabled:false` มี warning `MODULE_TYPELESS_PACKAGE_JSON` จาก shared frontend ESM module ที่ไม่ได้ประกาศ module type; Node reparse แล้วเริ่ม service สำเร็จ ไม่ได้เปลี่ยน frontend module type ทั้ง workspace เพื่อกำจัด warning ในเฟส rollout นี้ ข้อความ port scan ครั้งแรกที่ยังไม่พบ port เกิดก่อน Live และไม่ได้กลายเป็น startup failure

| Public HTTPS check | ผลจริง |
|---|---|
| GET health | 200; exact staging project/mode/protocol; writer false; emulator false; no-store |
| HEAD health | 200; ไม่มี response body |
| Allowed Origin | รับเฉพาะ `http://127.0.0.1:4311`; Vary Origin |
| create / mutate | empty JSON ไม่มี token ถูกปฏิเสธด้วย 503 `calendar-write-disabled` |
| Benign gzip | 415 `calendar-write-validation`; health ถัดไปยัง 200 |
| POST preflight | Origin ที่อนุญาตได้ 204 |
| Unreviewed Origin | GET และ OPTIONS ถูกปฏิเสธ 403; ไม่สะท้อน CORS |

Smoke รอบนี้มี 10 HTTP requests; ไม่ใช้ Firebase SDK หรือข้อมูลตาราง ดูเวลาและ status แยกรายคำขอใน `https-smoke-report.json`

รอบ idle เริ่มหลังคำขอสุดท้ายเวลา 23:27:56 น. และกำหนด probe ไม่ก่อน 23:43:56 น. วันที่ 17 พฤศจิกายน 2569 (เวลาไทย) ระหว่างนี้ agent ไม่ยิง API แต่ไม่ได้ควบคุม traffic ของบุคคลอื่นหรือ lifecycle ของ Render จึงต้องอ่านผลเป็นการวัด readiness หลังเว้น agent traffic ไม่ใช่หลักฐานว่าทุกคำขอภายนอกหยุดทั้งหมด อ้างอิง [Render Free instances](https://render.com/docs/free#spinning-down-on-idle) สำหรับพฤติกรรม idle ของแพลตฟอร์ม

รอบหลัง idle ผ่านจริง: เว้น agent traffic **960,082 ms** ก่อนเริ่ม GET แรกเวลา 23:43:56 น. คำขอแรก timeout ที่ 10 วินาที จากนั้น frontend readiness รอและ GET ใหม่จนพบ peer ที่ถูกต้อง ใช้เวลารวม **13,121 ms** ภายใน budget 90 วินาที ก่อนปฏิเสธการส่งรายการเพราะ writer ปิด GET ถัดไปใช้ **53 ms** และยังระบุ writer false จบรอบเวลา 23:44:09 น. ไม่มี token หรือ POST ระหว่างรอบนี้

ผลนี้เป็น sample หลังเว้น traffic หนึ่งรอบ ไม่ใช่ SLA หรือหลักฐานว่าเร็วกว่า revision เก่าทุกครั้ง และไม่ได้ตรวจยืนยัน lifecycle restart จาก Render logs แยกต่างหาก

ผล HTTPS และ cold-start เก็บที่ `output/playwright/calendar-runtime-hardening-deploy/` แยกจากเฟสก่อน ใช้ verifier เดิมเพิ่มเพียง `--hardening` เพื่อเลือก output directory จึงไม่เขียนทับผลเดิม:

```powershell
node scripts/verify-calendar-staging-deployment.mjs --hardening
# หลังเว้น agent requests อย่างน้อย 16 นาทีเท่านั้น
node scripts/verify-calendar-staging-deployment.mjs --hardening --cold
```

Verifier ส่งเฉพาะ GET/HEAD/OPTIONS และ empty JSON POST ที่ writer ต้องปฏิเสธก่อน Auth/execute รวม benign gzip สั้น ๆ เพื่อตรวจ 415 ไม่ส่ง ID token, schedule payload, credentials หรือคำขอ Firebase SDK ไม่ส่ง exploit payload ไป cloud

## ข้อจำกัดและการย้อนกลับ

Health แบบ writer off ไม่ได้ initialize lazy Admin SDK จึงไม่ยืนยัน Google sign-in, Firebase connectivity, IAM หรือการเขียนข้อมูลจริง ยังต้องมีเฟส staging-only identity/credentials และ trusted writer QA ที่ตรวจทานแยกต่างหากก่อน production

การปิด writer จำกัดเฉพาะ API service นี้ ไม่ได้ถอน capability ของ pilot เดิมหรือเปลี่ยน Firestore Rules ทั้ง project ไม่มีการตั้ง keepalive cron ใหม่ Free tier ยังมี cold start ตามการใช้งาน

หาก revision ใหม่เริ่มไม่ได้หรือ public checks ไม่ผ่าน ให้หยุด rollout โดยคง writer ปิดและพิจารณา rollback เฉพาะ staging ไป previous revision พร้อมคืน branch/build/start configuration ที่เข้าคู่กัน ห้ามย้อน Rules เพื่อเปิด SDK writer ห้ามแตะ service production การ rollback ไป SDK graph เดิมจะนำ audit debt เดิมกลับมาด้วย จึงไม่ควรเปิด writer ระหว่างนั้น

Runtime changes อยู่ใน commit `8ea0c91`; commit รายงานที่ทำภายหลังไม่ใช่ revision ที่ deploy รอบนี้ และจะไม่สั่ง deploy เพิ่มเพียงเพื่ออัปเดตเอกสาร

ตรวจ syntax ของ verifier, parse YAML เทียบ deployed revision ว่าค่าไม่เปลี่ยน และ `git diff --check` ผ่าน ไม่ได้รัน Unit/Emulator/build ซ้ำหลัง deploy เพราะไม่ได้แก้ runtime/business logic ในเฟสนี้ ใช้หลักฐานก่อน deploy จาก local hardening: Unit 671 tests, clean install, Emulator SIT และ compatibility build ผ่าน ร่วมกับ clean build/HTTP checks จริงบน Render รอบนี้

ไฟล์หลักฐานที่เลือกส่งมอบ: `render-dashboard-report.json`, `https-smoke-report.json`, `idle-window.json`, `cold-start-report.json`, `verification-summary.json`, `render-live.jpg` และ `render-final-deploys.jpg` ไม่เก็บ hook, credential material หรือข้อมูลส่วนบุคคลของผู้ทดสอบในรายงาน

หลังตรวจรับเฟสนี้ ขั้นถัดไปที่ต้องเสนอแผนและขออนุมัติแยกคือ staging-only service identity/credential provisioning พร้อมขอบเขต IAM, Rules cutover และ frozen cloud QA manifest ตัว role draft ปัจจุบันมี data permissions ระดับ database ไม่ได้จำกัด collection ด้วย IAM จึงต้องตรวจทานขอบเขตนี้ก่อนเพิ่มสิทธิ์จริง การอนุมัติ deploy รอบนี้ไม่ใช่การอนุมัติออก key, เพิ่ม access หรือเปิด writer
