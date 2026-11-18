# เตรียม rollout ของ read-only connectivity probe

วันที่ 18 พฤศจิกายน 2569 · branch `codex/calendar-staging-connectivity-rollout` จาก `786bfb8`

**สถานะ: เตรียม local เท่านั้น ยังไม่อนุมัติ push/deploy/สร้าง key/อ่านข้อมูลผ่าน API บน cloud** การอนุมัติให้เตรียมเฟสนี้ไม่ใช่การออก credentials หรือเปลี่ยนบริการจริง ดู [manifest สำหรับตรวจรับ](../../../deploy/calendar-staging/connectivity-rollout.review.json)

## Baseline ที่ตรวจแบบอ่านอย่างเดียว

- Render `labboy-calendar-staging` / `srv-dbu3qvdckfvc73b16ku0` ยัง Live ที่ `8ea0c916f4559acde08602e0857eb05750f46ff7`, branch `codex/calendar-runtime-hardening`, Free / Singapore และ Blueprint เดิม `exs-dbu3q8rl550s739rnu50` ตรวจจาก Dashboard โดยไม่แก้ค่า
- Build/start command และ `/health` ตรงกับ Blueprint ใน repo ไม่เปิด environment secret values หรือ deploy hook และไม่เปลี่ยนบริการ production
- IAM metadata เวลา 07:45 น. ไทย: `calendar-staging-server@labboy-workload-app-staging.iam.gserviceaccount.com` มีอยู่ เปิดใช้งาน และ **user-managed keys = 0** ไม่อ่าน private key หรือ Firestore data
- Local probe อยู่ใน `d014c8b`; cleanup ของ credential เก่าอยู่ใน `786bfb8` ซึ่งเป็น parent ของ branch นี้ ไม่ใช้ production key เดิมที่ปิดแล้ว

## วิธี credentials ที่เตรียม

คง Free instance และ workspace เดิม ไม่เปิด billing/เปลี่ยนแพ็กเกจ Render [Managed OIDC](https://render.com/docs/oidc) ต้อง Pro workspace ขึ้นไป จึงไม่เลือกวิธีนั้นในรอบนี้ เตรียม [Secret File](https://render.com/docs/configure-environment-variables#secret-files) เฉพาะ service staging เดียว ชื่อ `calendar-staging-admin.json` เพื่อให้ ADC ใช้ `/etc/secrets/calendar-staging-admin.json` ตาม runtime contract เดิม

**ข้อจำกัดสำคัญ:** identity นี้ยังมี role pilot 7 permissions ที่อนุมัติไว้ รวม `datastore.entities.create/update` การปิด writer/probe ไม่ทำให้ credential เป็น IAM read-only และ IAM grant ระดับ project ไม่ใช่ sandbox แยก collection เฟสนี้ไม่เพิ่ม/ลด role ไม่ขยายไป production

การสร้าง credential และใส่ค่าลับต้องให้เจ้าของทำใน Console/Render โดยตรง Codex จะไม่สร้าง/ดาวน์โหลด/อ่าน/คัดลอก JSON private key และไม่กรอก Contents แทน ข้อกำหนดนี้มาจาก AGENTS.md ที่ห้ามอ่าน/คัดลอก credentials และ computer-use policy ที่ต้อง handoff เมื่อเปลี่ยน authentication credential ไม่ต้องส่ง key ในแชตหรือวางในโฟลเดอร์ repo

## ลำดับที่เสนอหลังอนุมัติ manifest

1. ทบทวน final local SHA/manifest แล้ว push **เฉพาะ branch นี้** ไม่แก้ main, ไม่ force-push, ไม่ rewrite history จากนั้น sync Blueprint เดิมเพียง service เดิมให้ชี้ branch นี้ ขณะ `WRITE=0`, `CONNECTIVITY=0`, auto-deploy off และ Blueprint auto-sync off
2. ตรวจ health/CORS/config ของ revision ใหม่ โดยไม่ส่ง Firebase token หรือสร้างเอกสาร จากนั้น handoff ให้เจ้าของสร้าง JSON key ใหม่สูงสุด 1 ตัวของ service account staging ที่ระบุและใส่ Secret File ให้ service นี้เท่านั้น หยุดหาก metadata มี key อยู่ก่อนหรือ project/account ไม่ตรง
3. **การ Save Secret File อาจ trigger deploy แม้ auto-deploy ปิด** ต้องได้รับอนุมัติ deploy ก่อน handoff และใช้ source ใหม่ที่ writer/probe ปิดแล้ว ตรวจ Live/health หลังบันทึก ไม่ถือว่า health ผ่านแล้ว Firebase เชื่อมสำเร็จ
4. เปิดเฉพาะ `CALENDAR_SERVER_CONNECTIVITY=1`, คง `WRITE=0` แล้ว deploy staging เพื่อ QA ตามวงคำขอด้านล่าง ใช้ `node scripts/dev-staging-ui.mjs --connectivity` พอร์ต 4311 และ Google session ของผู้ทดสอบเดิม
5. จบ/หยุด QA ให้คืน `CONNECTIVITY=0` แล้ว deploy อีกครั้ง ตรวจ health/write-off เก็บผลและ credential metadata เท่านั้น ไม่ลบ key โดยอัตโนมัติ ไม่ถือว่าปิด flag แล้วเพิกถอน credential หรือ SDK writers ทั้งระบบ

การสร้าง key เป็น security-sensitive action และการกรอกค่าลับเป็นขั้น handoff ของเจ้าของ ไม่คลิกสร้าง key หรือเปิด Contents ขณะ browser อยู่ในการควบคุมของ Codex หาก UI การบันทึกไม่ตรงรายการที่ review ให้หยุดก่อนกด ไม่สร้าง key ซ้ำหรืออัปเกรดแพ็กเกจเพื่อให้ผ่าน

## ขอบเขต Cloud QA ที่เสนอ

- API probe: JSON `{}` เท่านั้น, anonymous 1 คำขอคาด 401; signed existing active Superadmin + capability 2 คำขอ (ครั้งแรก/ตรวจซ้ำ) คาด 200 booleans ไม่มี document contents
- แต่ละ signed probe อ่านได้สูงสุด own profile 1, gate 1, classroom limit 1, DL limit 1; ไม่รับ target UID จาก browser ไม่อ่าน worklogs/directory ทั้งชุดผ่าน endpoint ไม่สร้าง receipt หรือ schedule
- Frontend `/calendar` ยังอ่านข้อมูล staging ตาม SDK reader/cache เดิมแยกจากขอบเขต endpoint นี้ ไม่อ้างว่าทั้งหน้าใช้ไม่เกิน 4 หรือ 8 billed reads
- Staff ใช้ session เดิมเพื่อดูปฏิทินและตรวจปุ่ม disabled ไม่มี authenticated HTTP probe ของ Staff ใน cloud manifest นี้ การปฏิเสธ endpoint ฝั่ง Staff ตรวจแล้วใน Emulator
- Anonymous health GET สำหรับรอ service รวมไม่เกิน 90 วินาที/30 ครั้ง ไม่ส่ง token หรือ POST ในช่วงรอ ไม่สร้าง keepalive cron
- ไม่มี create/mutate/edit/cancel/import request ไม่มีการเปลี่ยน profile/Rules/IAM, revoke session หรืออ่าน production data หาก 401/403/503 หรือ peer/revision ไม่ตรงให้หยุดและตรวจ ไม่ขยายสิทธิ์หรือส่งซ้ำเกินจำนวนที่ review

## Rollback และเกณฑ์รับงาน

คง `WRITE=0` ทุกขั้น ปิด `CONNECTIVITY=0` และ redeploy เฉพาะ staging หรือกลับ revision ที่ review `8ea0c91` หากจำเป็น ไม่เปิด key เก่าหรือ SDK writers เพิ่ม ไม่แก้บริการเดิม `employee-workload-app`

ผ่านเมื่อ revision/plan/flags ตรง manifest, key ถูกเก็บเฉพาะ Secret File ของ identity ที่ระบุ, probe ผ่านขอบเขตที่อนุมัติ, Staff ปุ่มปิด และคืน probe-off ได้พร้อมหลักฐาน แยกผล Auth/Firestore จริงออกจาก health; **CAL-CONNECT ยัง pending จนกว่าจะทดสอบจริง** และทั้งหมดนี้ไม่ใช่ production cutover หรือ UAT ทั้งระบบ

## การตรวจในเฟสเตรียมนี้

ตรวจ JSON/YAML และการตรงกันของ manifest/Blueprint/runtime config พร้อม negative guards โดยไม่ติดตั้งแพ็กเกจใหม่ ไม่รัน full Unit/build ซ้ำเพราะเฟสนี้ไม่แก้ runtime source ส่วน baseline `786bfb8` ผ่าน 719 tests / 46 ไฟล์แล้ว ผลนั้นไม่ใช่ผล cloud QA รอบนี้

ประวัติ key เก่าและ SEC gate ดู [release checklist](../../release/README.md) ห้ามสรุปว่า blob หายจากทุก remote/clone การอนุมัติ manifest นี้ไม่ใช่การอนุมัติ rewrite Git history
