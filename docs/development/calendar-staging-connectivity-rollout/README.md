# เตรียม rollout ของ read-only connectivity probe

วันที่ 18 พฤศจิกายน 2569 · branch `codex/calendar-staging-connectivity-rollout` จาก `786bfb8`

**สถานะดำเนินการ: bounded Cloud QA ผ่านตาม manifest แล้ว รอผู้ใช้ตรวจรับ** Anonymous ถูกปฏิเสธ, Superadmin ตรวจ signed API ผ่าน 2 ครั้ง, Staff อ่านปฏิทินได้แต่ปุ่ม probe/เพิ่ม/นำเข้าปิด และคืน writer/probe เป็นปิดพร้อมยืนยัน health แล้ว [manifest ที่ตรวจรับ](../../../deploy/calendar-staging/connectivity-rollout.review.json) คงไฟล์ snapshot เดิมเพื่อรักษา digest การอนุมัติจริงและสถานะดำเนินการเก็บใน [execution record](../../../output/playwright/calendar-staging-connectivity-rollout/execution-progress.json) แยกจาก snapshot ที่เดิมยังระบุ pending

## ผลดำเนินการหลังอนุมัติ

- Push เฉพาะ branch rollout สำเร็จที่ `2aa1bd27f1795890871297d1ffdf0d1d6acdd2e5` ไม่แก้ main/force-push/history
- เปลี่ยน source branch ของ Blueprint เดิม และ review Manual sync พบเพียง update branch ของ `labboy-calendar-staging` กับเพิ่ม `CALENDAR_SERVER_CONNECTIVITY` ตาม YAML จากนั้นอนุมัติ sync ตามขอบเขตผู้ใช้
- Render deploy `dep-dbug3emc6qcc73dlok6g` เป็น Live ที่ `2aa1bd2` ใช้เวลา 1 นาที 36 วินาที คง Free; อ่าน Settings ยืนยัน Auto-Deploy Off และ Blueprint คง Sync paused/Auto Sync No
- [HTTPS preflight](../../../output/playwright/calendar-staging-connectivity-rollout/initial-https-preflight.json) ผ่าน 5 requests: GET/HEAD health, allowed-Origin GET, denied-Origin GET และ OPTIONS connectivity ผล health ระบุ staging, writer=false, connectivity=false; ไม่ส่ง token, probe POST หรือ create/mutate
- ใช้ health GET ไป 3 ครั้ง จากวงสูงสุด 30 ครั้ง; anonymous probe 0/1 และ authenticated probe 0/2 ยังไม่ถูกใช้
- IAM metadata ก่อน handoff เวลา 08:41 น. ไทย ยืนยัน identity เปิดใช้งานและ user-managed keys 0 ไม่สร้าง key โดย agent
- เตรียม Google Console ด้วยบัญชี ICIT ที่มีสิทธิ์ บนแท็บ Keys ของ service account ที่ถูกต้อง ซึ่งแสดง No rows to display และ Render Secret Files เตรียมเฉพาะชื่อ `calendar-staging-admin.json` ไม่เปิด Contents หรือกด Save แทนเจ้าของ
- ให้เจ้าของสร้าง key และกรอก Contents เอง บันทึก Save only และออกจากฟอร์มค่าลับก่อนแจ้งเสร็จ หลังยืนยันจะตรวจ metadata/Live และ deploy ต่อหากจำเป็น ยังไม่ถือว่า Firebase connection ผ่าน

อัปเดต credentials: [IAM metadata](../../../output/playwright/calendar-staging-connectivity-rollout/owner-key-metadata.json) ยืนยัน staging มี enabled key 1 ตัว และ billingEnabled=false ช่วงแรก Secret Files ยังไม่ปรากฏหลัง reload ต่อมาเจ้าของเพิ่มใหม่และเห็นไฟล์ที่ใช้ชื่อดาวน์โหลด จึงเปลี่ยนเฉพาะชื่อเป็น `calendar-staging-admin.json` โดยไม่เปิด Contents และยืนยันว่าชื่อคงอยู่หลัง reload ไม่สร้าง key เพิ่ม

รอบ QA แรก: deploy `dep-dbuikbifngtc73ctll30` ของ `2aa1bd2` เป็น Live และ health ยืนยัน probe=true, writer=false [anonymous probe](../../../output/playwright/calendar-staging-connectivity-rollout/anonymous-probe-report.json) 1 ครั้งได้ 401 ตามคาด ช่วงนั้นยังติด Google popup จึงคืน flags เป็น 0/0 และ deploy revision เดิม `dep-dbuipf49v7es738mnor0` เป็น Live [ผลตรวจ HTTPS หลังคืนค่ารอบแรก](../../../output/playwright/calendar-staging-connectivity-rollout/probe-off-restore-report.json) เวลา 11:44 น. ไทย เป็นหลักฐานการหยุดรออย่างปลอดภัย ไม่ใช่ผล QA สุดท้าย

## ผล Cloud QA หลังเจ้าของเลือกบัญชี

- เปิด probe=1 / writer=0 และ deploy `dep-dbumss2fngtc73d9bi90` จาก revision เดิม `2aa1bd2`; ตรวจ health ตรง project staging, protocol 1 และไม่ใช่ Emulator ก่อนส่ง token ผ่าน UI
- Superadmin บน `/calendar` กดตรวจผ่าน UI 2 ครั้ง ทั้งสองครั้งขึ้น “ตรวจ Auth, สิทธิ์ และการอ่านปฏิทินผ่าน API สำเร็จ · ไม่บันทึกข้อมูล” และปุ่มเพิ่ม/นำเข้าปิดตลอด ไม่อ่านหรือคัดลอก token ออกจาก browser ไม่ส่ง probe เพิ่มเมื่อใช้ครบ 2/2 ครั้ง
- สลับ Google session เป็น Staff เดิม เมนูบัญชีแสดง Staff และอ่าน staging สำเร็จ 32 ตารางเรียน / 18 รอบสอบ ปุ่ม probe/เพิ่ม/นำเข้าปิด ไม่ส่ง authenticated HTTP probe ด้วย Staff
- คืน probe=0 / writer=0 และ deploy `dep-dbumusijnfac73doa1f0` เป็น Live; GET `/health` ยืนยัน connectivity=false และ writes=false หลัง deploy ไม่อาศัยเพียงค่าที่บันทึกใน Dashboard
- วงคำขอรวม: anonymous 1/1, signed 2/2 และ health counter 10/30 โดยนับความพยายามที่ sandbox ปิด DNS ไว้ด้วยอย่างเผื่อขอบเขต Frontend SDK อ่านข้อมูลตาม reader เดิมแยกจาก probe ไม่ใช่จำนวน billed reads
- ไม่มี cloud data writes, create/mutate requests, IAM/Rules/profile/production/billing changes หรือการสร้าง key เพิ่ม ไม่อ่าน private key material ไม่รัน Unit/build ใหม่เพราะไม่มี runtime source change

ผลรวมและข้อจำกัดอยู่ใน [bounded Cloud QA report](../../../output/playwright/calendar-staging-connectivity-rollout/bounded-cloud-qa-report.json) พร้อม [ภาพ signed probe ผ่าน](../../../output/playwright/calendar-staging-connectivity-rollout/signed-connectivity-verified.jpg), [Staff ปุ่มปิด](../../../output/playwright/calendar-staging-connectivity-rollout/staff-readonly-connectivity-disabled.jpg) และ [deploy คืน probe-off สุดท้าย](../../../output/playwright/calendar-staging-connectivity-rollout/render-probe-off-final.jpg)

**ขอบเขตการรับรอง:** ผ่านการเชื่อม Firebase ผ่าน credential ของ server และ signed user ใน staging ตาม manifest ไม่ใช่ UAT ทั้งระบบ ไม่ใช่ trusted writer cloud QA และไม่ใช่การตรวจ revoked token/ทุกบทบาทบน cloud กรณี Staff endpoint denial และ capability revocation มีหลักฐาน Emulator เดิม รอบนี้ไม่เปลี่ยน role/profile หรือ revoke session เพื่อทดสอบเพิ่ม การปิด probe ไม่ได้เพิกถอน key หรือปิด direct SDK writers ทั้งระบบ

หลักฐาน Live: [ภาพ Dashboard แรก](../../../output/playwright/calendar-staging-connectivity-rollout/render-live-initial.jpg) และ [หลังคืน probe-off](../../../output/playwright/calendar-staging-connectivity-rollout/render-probe-off-awaiting-login.jpg) รอบนี้ยังไม่แก้ IAM/Rules/profile/billing หรือบริการ production ไม่รัน Unit/build ใหม่เพราะไม่มี runtime source change จากชุดที่ตรวจแล้ว

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

ผ่านเมื่อ revision/plan/flags ตรง manifest, key ถูกเก็บใน Secret File ของ identity ที่ระบุ, probe ผ่านขอบเขตที่อนุมัติ, Staff ปุ่มปิด และคืน probe-off ได้พร้อมหลักฐาน เงื่อนไข bounded rollout นี้ตรวจผ่านแล้ว แยกผล signed Auth/Firestore จริงออกจาก health; gate CAL-CONNECT/AUTH ของ release ยังคงต้องตรวจรับและทบทวน negative-auth coverage ที่เหลือ ไม่ถือว่าทั้งหมดนี้เป็น production cutover หรือ UAT ทั้งระบบ

## ขั้นต่อไปที่เสนอหลังตรวจรับ

1. แยก branch สำหรับเตรียม trusted writer cloud QA ตรวจ runtime/Rules/cutover contract และจัด manifest ข้อมูลสังเคราะห์พร้อม IDs, จำนวน operations และผลที่คาด ก่อนเปิด writer
2. ใช้ trusted server เพื่อพิสูจน์ business invariants ในสภาพ staging จริงต่อจาก Emulator ลดความเสี่ยง direct client writes และไม่เอาผล writer pilot เดิมมาแทนหลักฐาน server ตัวใหม่
3. คง writer ปิดระหว่างเตรียม และกำหนด rollback/receipt/replay/ผลเมื่อ response หายอย่างชัดเจน ไม่เปิด Rules, แก้สิทธิ์ หรือส่ง cloud write ก่อนอนุมัติขอบเขตเฉพาะ
4. ตรวจ manifest/guards/Unit/SIT ตาม code ที่เปลี่ยน ก่อน cloud QA แบบจำกัด และให้ผู้ใช้ตรวจรับแต่ละ gate การเตรียมนี้ยังไม่ใช่การอนุมัติ production deploy

## การตรวจในเฟสเตรียมนี้

ตรวจ JSON/YAML และการตรงกันของ manifest/Blueprint/runtime config พร้อม negative guards โดยไม่ติดตั้งแพ็กเกจใหม่ ไม่รัน full Unit/build ซ้ำเพราะเฟสนี้ไม่แก้ runtime source ส่วน baseline `786bfb8` ผ่าน 719 tests / 46 ไฟล์แล้ว ผลนั้นไม่ใช่ผล cloud QA รอบนี้

ประวัติ key เก่าและ SEC gate ดู [release checklist](../../release/README.md) ห้ามสรุปว่า blob หายจากทุก remote/clone การอนุมัติ manifest นี้ไม่ใช่การอนุมัติ rewrite Git history
