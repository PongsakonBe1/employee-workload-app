# เตรียม Calendar staging server — ยังไม่ deploy

วันที่ตรวจ: 17 พฤศจิกายน 2569 · branch `codex/calendar-staging-server-prep` · ฐาน `14da90c`

เฟสนี้เตรียม runtime/config และหลักฐานทดสอบในเครื่องสำหรับย้าย writer จาก browser SDK ไป trusted HTTP server โดยคง UI เดิม เป้าหมาย cloud ที่เสนอมีเพียง `labboy-workload-app-staging` ฐาน `(default)` ยังไม่สร้าง service/account/key ไม่แก้ IAM, Rules, profile หรือข้อมูลบน cloud และไม่ push/deploy

## สิ่งที่ทำแล้ว

- `backend/src/calendar/staging-server.js`: entry แยกจาก backend เดิม ไม่มี dotenv/MongoDB/FCM ตรวจ config ก่อนเริ่ม และเริ่ม SDK เมื่อจำเป็น ค่าเริ่มต้น `CALENDAR_SERVER_WRITE=0`; health ทำงานได้โดยไม่เปิด credentials
- จำกัด project, database, credential **ตำแหน่งไฟล์**, API origin และ client origins ที่ระบุแน่นอน ไม่รับ wildcard, production project หรือ Emulator config ใน runtime staging ข้อมูล credentials จริงยังไม่ได้ตรวจหรือใช้
- ใช้ transaction/planners เดิม: ตรวจ profile สด, gate, conflict, deterministic targets และ receipt รวมชุดสูงสุด 100 รายการ ช่วงไม่เกิน 400 วัน; query จำกัด 200 รายการแล้วปฏิเสธชุดเกินขอบเขต ไม่มีการบันทึกบางส่วน
- ตรวจ token audience/issuer และ revocation; จำกัด 60 POST/นาทีทั่ว process, 12/UID/นาที และ transaction พร้อมกันสูงสุด 2 คำขอ ปฏิเสธ global limit ก่อนตรวจ Auth Log เก็บเฉพาะ request ID, status และเวลา ไม่เก็บ body/token/UID
- Browser แยก `connecting` ออกจาก `sending`: GET health โดยไม่ส่ง token รอได้สูงสุด 90 วินาที ผ่านได้เมื่อ project/mode/protocol และ write flag ตรงกัน จากนั้นจึง POST พร้อม token เมื่อเริ่ม POST แล้วความล้มเหลวที่ยืนยันผลไม่ได้ยังคง frozen draft/receipt เดิม
- ป้องกันกดซ้ำและ session เปลี่ยนระหว่าง warmup; preflight failure และ admission 429 แยกจากผล write ที่ยังไม่แน่นอน; commit สำเร็จแต่อ่านกลับไม่ได้ยังรายงานว่า commit แล้ว
- ปิด legacy cloud replay QA ใน HTTP runtime ใหม่ เพราะ receipt/gate จะเป็น server-only หน้า preview และ runtime pilot เดิมยังคงอยู่

## ชุด review ก่อน cloud

| ไฟล์ | สถานะ/จุดตรวจ |
|---|---|
| `deploy/calendar-staging/render.yaml` | service เดียว แยกจาก backend เดิม, Free/Singapore, auto deploy ปิด, write ปิด, build จาก repository root เพื่อให้ import planners ใน `frontend/lib` ได้ |
| `deploy/calendar-staging/iam-role.review.json` | ข้อเสนอ role/service account เท่านั้น ไม่ใช่คำสั่ง apply; ไม่มี delete/Auth management/Rules/IAM management; IAM ไม่ได้จำกัดราย collection |
| `deploy/calendar-staging/firestore.review.rules` | prototype สำหรับ staging cutover: reader active อ่าน users/classroom/DL ได้; client writes ทุก path ปิด; receipt/gate อ่านด้วย SDK ไม่ได้ ผ่าน Emulator แต่ยังต้อง review ก่อน deploy |
| `cloud-qa.review.json` | **ยังไม่อนุมัติการเขียน cloud**: สูงสุด 5 schedules ใน 5 write operations และ replay ชุดเดิม ใช้ aliases แทน UID จริง ต้องตรึง payload/IDs หลังตรวจ baseline |

`https://labboy-calendar-staging.onrender.com` เป็น **hostname ที่เสนอ ยังไม่สร้างและไม่ยืนยัน ownership** ห้ามเปิด HTTP writer ใน browser ก่อนตรวจว่า service อยู่ใน workspace ที่อนุมัติและใช้ commit ที่ตรวจแล้ว ถ้า hostname ใช้ไม่ได้ให้แก้และ review ทั้ง Blueprint, runtime constant, guard/tests และ manifest ก่อน ไม่เปลี่ยนปลายทางอัตโนมัติ การตอบ health ตรง schema ไม่ใช่หลักฐาน ownership

Operator ต้องจัดเตรียม credential ของ staging-only service account ผ่าน Secret File แยกหลังอนุมัติ IAM/credential โดยใช้ path `/etc/secrets/calendar-staging-admin.json` ห้าม paste key ลง chat/repo/log ไม่มี key ใน artifacts นี้ ต้องตรวจว่า identity ไม่มีสิทธิ์ production และไม่เพิ่มสิทธิ์เกิน draft เพื่อแก้ permission error โดยอัตโนมัติ

## ผลทดสอบจริง

หลักฐานอยู่ใน `output/playwright/calendar-staging-server-prep/`

| การตรวจ | ผลและขอบเขต |
|---|---|
| Full Vitest | 670 tests / 43 files ผ่าน รวม flags, SDK guard, capabilities, cold warmup, double submit, session change, retry/read-back และ rate limits |
| Targeted ESLint | ผ่านสำหรับ source ที่แก้และโมดูลใหม่ |
| HTTP smoke | ผ่าน Host/Origin, token audience/issuer, revocation argument, body/JSON limits, admission/concurrency, write-off ปฏิเสธก่อน Auth/execute และ log fields ใช้ synthetic Auth boundary ในการตรวจ staging-mode HTTP |
| Package smoke | คัดลอก layout monorepo, import service/planners และเปิด production entry แบบ write-off ได้โดยไม่มี secret file/ADC หรือ cloud requests; **ยังไม่ได้ clean npm ci หรือ build บน Render** ใช้ dependencies ที่ติดตั้งอยู่ในเครื่อง |
| Emulator SIT เดิม | 10 กลุ่มผ่าน: Auth/role/capability, manual/PDF-review output/DL evening, conflict/atomicity, concurrent writers, edit/cancel/replay และ lost reply |
| Emulator SIT เพิ่ม | 4 กลุ่มผ่าน: browser commits/version, invalid/oversized requests, commit/read-back failure และ frozen retry |
| Rules ฉบับ review | compile ไฟล์จริงใน demo Emulator; Admin/Superadmin/Staff/บัญชีไม่มี capability อ่าน query จริงได้ แต่ create/update/delete ทั้ง 5 collections ไม่ได้; gate/receipt reads ปฏิเสธ; inactive/anonymous อ่านตารางไม่ได้ |
| Warmup SIT | จำลอง proxy HTML ร่วมกับ HTTP/Auth/Firestore จริงในเครื่อง: `connecting`, zero POST/token ก่อนพร้อม, double submit ปฏิเสธ; จากนั้น commit/read-back/replay ผ่าน |
| Browser Edge | `/calendar` จริง: Admin เพิ่ม/แก้ไข/soft-cancel ผ่าน API และอ่านกลับ; reload/เข้าสู่ Staff ใหม่อ่านได้แต่เพิ่ม/นำเข้าไม่ได้; Superadmin เปิดฟอร์มบน 390×844 ได้; validation คงฟอร์มและ focus ช่องชื่อ; ไม่มี document overflow |
| Compatibility build | ผ่าน export แยก `.ui-build-check`; แม้ตั้ง staging flags ทั้งหมดเป็น 1 ใน production ก็ไม่ render staging workspace; ไม่แตะ production output |
| Cleanup | ล้างเฉพาะ fixture/account ของชุด QA ที่ตรวจ owner/updateTime แล้ว ไม่ reset namespace; หยุด runtime/Emulator ชุด QA และตรวจไม่มี listener บนพอร์ตที่ใช้ |

Browser ไม่ได้จำลอง Render cold start แบบ visual; ตรวจ warmup ใน Unit/SIT ส่วน browser ใช้ local API ที่พร้อมแล้ว ไม่ได้เปิด Google session หรือ staging HTTPS endpoint ในเฟสนี้ Import SIT ใช้ผลลัพธ์ที่ผ่าน review แล้ว ไม่ใช่การอ่าน bytes PDF/OCR ใหม่ทั้ง pipeline

คำสั่งตรวจหลัก (ใช้ dependency เดิม):

```powershell
node scripts/verify-calendar-staging-server-prep.mjs
node scripts/start-calendar-trusted-emulator.mjs
node scripts/dev-calendar-trusted.mjs --writer --server-preflight
node scripts/verify-calendar-trusted.mjs
# ทำ browser create/edit/cancel ตามรายงานก่อน extra SIT ที่ตรวจ gate baseline
node scripts/verify-calendar-server-prep-rules.mjs
node scripts/verify-calendar-trusted-extra.mjs
node scripts/verify-calendar-server-prep-warmup.mjs
node scripts/verify-calendar-trusted.mjs --cleanup
node node_modules/vitest/vitest.mjs run
node scripts/check-ui-build.mjs calendar-staging-server-prep
```

## แผน cloud ที่ต้อง review/อนุมัติในเฟสถัดไป

1. ตรวจ metadata/baseline ของ staging, service owner/hostname/commit และ indexes ที่ query ใช้ ยืนยันเฉพาะ target นี้ ตรวจ Render build แบบ clean install ให้ผ่าน โดยยังปิด writer
2. อนุมัติและจัด provision staging-only service account/IAM/Secret File แยก แล้วเปิด service แบบ `CALENDAR_SERVER_WRITE=0` ตรวจ HTTPS health/Host/CORS จริง ไม่ส่ง token ไป hostname ที่ยังไม่ยืนยัน
3. Review hash Rules และอนุมัติ cutover: ปิด writer/UI pilot เก่าทุกทาง รอคำขอค้างจบ แล้ว deploy client-write-deny Rules ก่อนเปิด trusted writer เพื่อไม่ให้มีช่อง SDK bypass business invariants
4. อนุมัติ manifest/frozen payload และ write window ที่แน่นอน เปิด server writer และ dev UI ด้วย `node scripts/dev-staging-ui.mjs --writer --mutations --server` ตรวจ Staff/Admin/Superadmin, manual/import, conflict/replay/concurrency, server read-back/reload และ audit counts ภายในขอบเขตที่อนุมัติ
5. หลัง QA ปิด UI/server writes คง client writes เป็น deny และเก็บ records/receipts ที่ commit แล้ว ให้ผู้ใช้ตรวจรับก่อนพิจารณา production

## Rollback และข้อจำกัด

- การ rollback คือปิด `CALENDAR_SERVER_WRITE` และ UI writer/mutation/server flags แล้วกลับอ่านอย่างเดียว **ไม่ restore Rules ที่เปิด client writes** และไม่ลบ/ย้อนเอกสารที่ commit ต้องตรวจ receipt ของคำขอค้างก่อนปิดงาน
- Rate/concurrency เป็นต่อ process รีเซ็ตเมื่อ service restart ไม่ใช่ distributed quota หรือเพดานค่าใช้จ่ายรายวัน; single staging instance เท่านั้น หากขยาย instance ต้องออกแบบ shared admission ใหม่
- Admin SDK ใช้ IAM และ bypass Rules: application allowlist ไม่ใช่ collection-level IAM sandbox จึงยังต้องตรวจ identity/permissions และห้ามใช้ credential ร่วม production
- ยังไม่ได้ยืนยัน IAM บน cloud, credential จริง, deploy hash, production indexes/rollout, actual Render cold-start หรือเวลาเริ่ม API ภายใน budget 90 วินาที จึงยังไม่พร้อม deploy production
- Render Free อาจพักหลังไม่มี inbound traffic 15 นาทีและใช้โควตา Free instance hours ร่วม workspace ชุด prep ไม่ได้สร้าง keepalive job สำหรับ service ใหม่ Health Ping เดิมที่ตรวจในเฟสก่อนเป็น HEAD ทุก 10 นาทีสำหรับ **backend เดิม** ไม่ได้ปลุก service ใหม่นี้
- Log warnings ของ Node typeless frontend modules และ Vite config เป็น warnings ที่ยังมีอยู่; tests/build สำเร็จ ไม่ได้เปลี่ยน package type เพื่อหลีกเลี่ยงผลกระทบกว้าง

## เอกสารหลักที่ใช้ตรวจ

- [Render Blueprint specification](https://render.com/docs/blueprint-spec): repository root, env vars, autoDeployTrigger และ shutdown
- [Render Node version](https://render.com/docs/node-version) และ [Free services](https://render.com/docs/free)
- [Firebase ID token verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens)
- [Firestore IAM](https://firebase.google.com/docs/firestore/security/iam): Admin SDK ใช้ IAM; role draft ต้องยืนยันจริงก่อนเปิด cloud
