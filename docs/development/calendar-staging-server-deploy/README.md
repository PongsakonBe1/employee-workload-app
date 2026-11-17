# Deploy Calendar staging แบบปิดเขียน

วันที่ดำเนินการ: 17 พฤศจิกายน 2569 · branch `codex/calendar-staging-server-prep`

## ขอบเขตที่อนุมัติ

ตรวจ readiness และ push branch ที่แยกไว้ จากนั้นสร้าง Render staging service แบบ `CALENDAR_SERVER_WRITE=0` ตรวจ clean install/build, HTTPS, health, CORS, cold start และการปฏิเสธ write requests รอบนี้ไม่เพิ่ม IAM/credentials ไม่เปลี่ยน Firestore Rules/profile และไม่ส่งคำสั่งอ่านหรือเขียนข้อมูล Firebase

## Resource และ revision

| รายการ | ค่าที่ตรวจจาก Dashboard |
|---|---|
| Workspace | My Workspace (`tea-d8fbbgq8qa3s738qtkhg`) |
| Service ใหม่ | `labboy-calendar-staging` (`srv-dbu3qvdckfvc73b16ku0`) |
| URL | https://labboy-calendar-staging.onrender.com |
| Blueprint | `calendar-staging-readonly` (`exs-dbu3q8rl550s739rnu50`) |
| Blueprint path | `deploy/calendar-staging/render.yaml` |
| Instance / region | Free / Singapore |
| Branch | `codex/calendar-staging-server-prep` |
| Deployed source | `d9b21f30dba24b613feb71d4ae9436d3bec44f7e` |
| Service auto-deploy | Off |
| Blueprint auto-sync | No — sync เองหลัง review |
| Write flag | `0` ยืนยันด้วย health และคำตอบ write endpoints |
| Firebase project ที่ runtime ระบุ | `labboy-workload-app-staging` / `(default)` |

Hostname เป็น service ที่สร้างใน workspace นี้และตรงกับ constant ที่ review แล้ว ไม่ได้ส่ง token ไปทดสอบ ownership ใช้ public repository URL โดยไม่เพิ่มสิทธิ์การติดตั้ง GitHub App ใหม่

โควตาก่อนสร้างที่อ่านได้จาก Dashboard: Hobby, Free instance hours 30.62/750, services 1/25, bandwidth 13 MB/5 GB และ pipeline minutes 0/500 เป็น snapshot ณ เวลาตรวจ ไม่ใช่การรับประกันยอดคงเหลือในอนาคต ไม่มีการสร้าง keepalive cron สำหรับ service ใหม่นี้

## สิ่งที่พบและแก้ในเฟส deploy

1. Push `1fbe403` สำเร็จโดยไม่แก้ `main` แล้ว Render validation ปฏิเสธ `maxShutdownDelaySeconds` บน Free tier จึงตัดบรรทัดนี้ออกใน `c793b63` และใช้ค่าเริ่มต้นของแพลตฟอร์ม Blueprint ผ่านจริง จากนั้น deploy แรกสำเร็จ
2. Clean install บน Render ใช้ Node 24.15.0 และคำสั่ง `npm ci --omit=dev --workspace backend --include-workspace-root` ติดตั้ง 262 packages/audit 264 packages ผ่าน แต่แจ้ง npm audit 21 รายการ (1 low, 10 moderate, 7 high, 3 critical)
3. ตรวจ advisory ทางการพบ `body-parser` กับ compressed bodies เป็นเส้นทางที่ใช้จริงใน staging จึงพัก service ใหม่และยกเลิกรอบ idle แรกก่อน ใช้ workaround `inflate:false` เพื่อปฏิเสธ encoded bodies ก่อนสร้าง decompressor เพิ่ม HTTP 415 เป็น validation failure ที่แน่นอน โดยไม่แก้ package versions/lockfile
4. `d9b21f3` ผ่าน Unit 671 tests, ESLint, local HTTP regression และ compatibility build แล้วจึง resume และ deploy SHA นี้แบบ manual สำเร็จ เวลา deploy 1 นาที 28 วินาที คง writer ปิดตลอด

ตัวแอปไม่ได้อัปเกรด dependency ทั้งชุด คำเตือน audit จึงยังคงอยู่ ผล mitigation ไม่ได้หมายความว่า audit กลายเป็นศูนย์หรือผ่าน production security review

## ผลตรวจและข้อจำกัด

- HTTPS GET health ระบุ project/mode/protocol ตรงกัน `writesEnabled:false`, `emulator:false` และ `Cache-Control:no-store`
- HEAD health HTTP 200 ไม่มี body
- Origin `http://127.0.0.1:4311` อ่าน health และทำ POST preflight ได้ ส่วน Origin ที่ไม่ได้อนุมัติถูกปฏิเสธด้วย 403 โดยไม่สะท้อน CORS
- POST ว่างไม่มี token ไปทั้ง create/mutate ได้ 503 `calendar-write-disabled` ก่อน Auth/execute ไม่มี schedule payload, ID token หรือ SDK Firebase ถูกใช้ในการตรวจ cloud
- gzip ปกติขนาดเล็กบน service จริงได้ 415 และ health ยังตอบ 200 ไม่ส่ง exploit payload ไป cloud; gzip ที่มี trailing bytes ทดสอบเฉพาะ local fixtures และถูกปฏิเสธก่อน Auth/execute
- Server entry เป็นแบบ lazy SDK และ phase นี้ไม่จัด credential file ดังนั้น health ผ่าน **ไม่ได้ยืนยัน Firebase connectivity หรือสิทธิ์ IAM**
- การปิด writer นี้จำกัดเฉพาะ service ใหม่ ไม่ได้ถอน capability หรือเปลี่ยน Rules ของ pilot เดิม จึงไม่ใช่คำยืนยันว่าทุกช่องทางใน Firebase project ถูกปิดเขียนแล้ว
- service เดิม `employee-workload-app` ใน Production ยังอยู่ที่ deployment `48c08be` ล่าสุด 5 เดือนก่อน และ branch `main` ไม่มี deploy ใหม่จากรอบนี้ ตรวจผ่าน Dashboard แบบอ่านอย่างเดียว ไม่เปิด environment values หรือ deploy hook
- ผล cold start เก็บแยกใน `cold-start-report.json` และเวลาที่เว้นคำขอใน `idle-window.json` ให้ใช้ผลจริงสองไฟล์นี้ประกอบ ไม่ใช้เพียงความรู้สึกจากการเปิดหน้าเว็บ
- รอบ cold-start ที่จบจริง: เว้นคำขอจาก 18:57:07 ถึง 19:13:07 น. (เวลาไทย) จากนั้นใช้ readiness module ของ frontend ยิงเฉพาะ GET ได้ timeout 10 วินาที 3 ครั้ง ก่อน API พร้อม รวม 42,176 ms ภายใน budget 90 วินาที คำขอ warm ถัดไป 54 ms ตัว readiness ปฏิเสธ write-disabled peer ตามที่ควร ไม่มี token หรือ POST ถูกส่ง ไม่ได้ควบคุม traffic ของบุคคลอื่นและไม่ได้ยืนยัน lifecycle จาก log restart ใหม่

## Dependency audit ที่ยังต้องจัดการ

ยอด audit เป็นผลการจับคู่ dependency versions กับ advisory ไม่ใช่จำนวนช่องโหว่ของแอปที่พิสูจน์ exploit แล้วทั้งหมด:

| ประเด็น | หลักฐาน/สถานะ |
|---|---|
| `body-parser` compressed-body DoS | middleware ใช้จริง; เพิ่ม `inflate:false` ตาม workaround และตรวจ regression แล้ว แต่ยังต้องอัปเดตแพ็กเกจในเฟส hardening |
| `proxy-addr` ระดับ critical ตาม audit | advisory ต้องใช้ trust subnet ที่ผิด; factory นี้ใช้ `trust proxy=false` และ rate limit ตาม UID จึงยังไม่พบเงื่อนไขตรงกับ advisory จาก static/local inspection |
| `mongoose` ระดับ critical ตาม audit | ติดตั้งเป็น dependency เดิมของ backend แต่ staging entry ไม่ import/init MongoDB; ไม่ได้ยืนยันเป็นช่องโหว่ที่ใช้โจมตี entry นี้ได้ |
| `websocket-driver` ระดับ critical ตาม audit | dependency ที่ติดตั้งอยู่; entry นี้ไม่มี WebSocket endpoint และ local factory import ไม่โหลด module นี้ ยังไม่ใช่หลักฐานว่าไม่มีเส้นทางอื่นในระบบทั้งหมด |
| รายการอื่น | บันทึกผล audit ไว้ใน artifact ในเครื่อง ยังไม่ได้ทำ full security scan หรือทดสอบ exploit ทุก advisory |

ควรทำ dependency hardening และ regression เพิ่มก่อนใส่ credentials/เปิด writer และก่อน production โดยเสนอชุด version/lockfile ที่ review ได้ ไม่ใช้ `npm audit fix --force` อัตโนมัติ รอบนี้ไม่มีการแก้ package manifests หรือ lockfile และไม่แตะ backend production ที่กำลังรันอยู่

## Rollback / การเปิดเฟสถัดไป

หาก health, CORS, write-off หรือ runtime checks ไม่ผ่าน ให้พักเฉพาะ service ใหม่นี้และคง API writer ปิด ไม่ลบ records/receipts ไม่เปลี่ยน Rules/IAM ในเฟสนี้ และไม่แก้ service เดิม เมื่อทำ client-write-deny cutover ในเฟสถัดไปแล้ว การ rollback ต้องคง deny ไว้ ไม่ย้อนกลับไปเปิด SDK writer

ก่อนเชื่อม Firebase จริงต้อง review dependency ที่ค้าง, IAM/credential ของ staging-only identity, Rules hash, baseline/indexes และ manifest/frozen payload อีกครั้ง การอนุมัติ deploy แบบปิดเขียนนี้ไม่ใช่อนุมัติเพิ่ม IAM, ออก key, deploy Rules หรือเขียนข้อมูล cloud

## หลักฐาน

อยู่ใน `output/playwright/calendar-staging-server-deploy/`:

- `https-smoke-report.json`: คำขอจริงหลัง mitigation, status และเวลา
- `local-http-mitigation-report.json`: compressed-body และ admission regression ในเครื่อง
- `compatibility-build-report.json`: production flags ไม่เปิด development workspace
- `unit-report.json`: ผล Unit แบบเต็มในเครื่อง; สรุปจำนวนไว้ใน verification summary
- `npm-audit.json`: audit แบบอ่านอย่างเดียวในเครื่อง ไม่ได้ใช้ audit fix
- `dependency-audit-summary.json`: รายการแพ็กเกจ/เวอร์ชันที่ match และ advisory URLs สำหรับ review โดยแยกจากการพิสูจน์ exploit ของแอป
- `render-mitigation-live.jpg`: Dashboard ยืนยัน commit และ Live
- `cold-start-report.json`, `idle-window.json`, `verification-summary.json`: ผลสรุปหลังจบรอบตรวจ

## เอกสารอ้างอิง

- [Render Blueprint](https://render.com/docs/blueprint-spec), [Free instances](https://render.com/docs/free), [Manual deploys](https://render.com/docs/deploys)
- [body-parser advisory และ workaround](https://github.com/expressjs/body-parser/security/advisories/GHSA-27r3-jxmh-p828)
- [proxy-addr advisory](https://github.com/jshttp/proxy-addr/security/advisories/GHSA-jqcg-44mw-7w3h)
