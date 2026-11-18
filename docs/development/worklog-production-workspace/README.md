# บันทึกงานและประวัติบน production build

Branch `codex/worklog-production-workspace` จาก `a5df721` ใช้ `NEXT_PUBLIC_WORKLOG_WORKSPACE=1` ตอน build เพื่อเปิด UI ใหม่ที่ `/worklogs/new` และ `/worklogs` ค่าเริ่มต้นยังเปิดหน้าเดิมระหว่างรอตรวจรับ ถ้าต้องทำ build ด้วยหน้าเดิม ใช้ค่า `0` หรือไม่กำหนดตัวแปร

- หน้า Staff กรอกเองใช้ตัวเลือกหัวข้อรองจาก catalog เดิม เก็บข้อความแนะนำ ตรวจรายการก่อนยืนยัน และเขียนลง `worklogs` ด้วย Firebase Auth และ schema เดิม หน้าเดียวกันยังใช้ Quick Log และส่วนห้องกับอุปกรณ์จริงที่มีอยู่ โดยตัดตัวช่วย seed template ออกจากหน้าใหม่
- ประวัติอ่าน Firestore ตามบัญชีจริง เปิดรายละเอียดข้างรายการบน desktop และเปิด sheet บนมือถือ เก็บมุมมองปฏิทินและปุ่มจัดการตามสิทธิ์เดิม Staff ใช้ query เรียงวันที่กับ index ที่ประกาศใน `firebase/firestore.indexes.json` ก่อนเปิด flag ใน production ต้องตรวจว่า index นี้พร้อมใช้งานจริง
- Staging Web SDK config ย้ายเป็นไฟล์ ignored `.tools/calendar-staging/web-sdk-config.json` โหลดผ่าน `/dev/staging-web-config` ได้ใน development เท่านั้น หาก checkout มีไฟล์เดิมใน `frontend/public` ให้ย้ายไฟล์ก่อนสร้าง production build ตัว build จะหยุดเพื่อกันการคัดลอกไฟล์ดังกล่าวโดยไม่ตั้งใจ

ทดสอบจาก production-mode export ที่ชี้ไปยัง Firebase Auth และ Firestore Emulator บน localhost ใช้ Staff สังเคราะห์และ Rules จาก repo บันทึกจาก desktop และ viewport 390px อย่างละหนึ่งรายการ เปิดประวัติ reload แล้วเปิดรายละเอียดได้ทั้งคู่ ตรวจกลับจาก Emulator พบสองเอกสารตรง schema และบัญชีที่ทดสอบ ตัวกรองวันที่บนมือถือที่ล้นจอถูกแก้และตรวจซ้ำแล้ว [ผล Browser QA](../../../output/playwright/worklog-workspace-smoke/browser-report.json)

Targeted unit tests ผ่าน 68 รายการ, lint เฉพาะส่วนผ่าน, production-mode export ไม่พบ SDK config ของ staging และตรวจ route ของ development ตรง project ที่กำหนด การทดสอบนี้ยังไม่ครอบคลุมเครื่องมือถือจริง เครื่องสแกน การบันทึกแทนทีมที่ `/admin/record` หรือ quick log ทุกชนิด หน้าเหล่านั้นยังใช้พฤติกรรมเดิม

รันซ้ำได้ด้วย `node scripts/worklog-workspace-smoke.mjs build` และเปิด `emulators`, `seed`, `serve` ด้วยสคริปต์เดียวกัน จากนั้นเรียก `scripts/verify-worklog-workspace-browser.cjs` พร้อม path ของ Playwright ที่ติดตั้งอยู่และ executable ของ Edge แล้วรัน `node scripts/worklog-workspace-smoke.mjs verify` เพื่อยืนยันจำนวนและ schema ของข้อมูลทดสอบ
