# ภาพรวมงานและ Staff Analytics บนเส้นทางหลัก

Branch `codex/analytics-production-workspace` จาก `492ceef` ใช้ `NEXT_PUBLIC_ANALYTICS_WORKSPACE=1` ตอน build เพื่อเปิด UI ที่รับรองแล้วที่ `/dashboard` และ `/admin/staff-analytics` ค่าเริ่มต้น `0` หรือไม่กำหนดจะเปิดหน้าเดิม

- เปิดรายสัปดาห์ จันทร์–อาทิตย์ ตามเวลาไทย เลือกรายวัน รายเดือน ไตรมาส ปีงบประมาณไทย หรือกำหนดช่วงเองได้ Staff อ่านเฉพาะ UID ของตน Admin และ Superadmin เลือกทั้งทีมหรือรายคนได้
- อ่าน `worklogs` ตามช่วงวันที่และ UID เมื่อระบุคน แสดงหน้าละ 1,000 เอกสารและอ่านเผื่อท้ายหน้า 1 เอกสารเพื่อตรวจว่ามีหน้าต่อหรือไม่ เรียงวันที่ล่าสุดก่อนและใช้ DocumentSnapshot เป็น cursor เพื่อแยกรายการวันที่เดียวกัน ช่วงที่เคยเปิดมี cache ไม่เกิน 6 ขอบเขตต่อหน้าที่เปิดอยู่ โหลดหน้าใหม่เพื่ออ่านจาก server อีกครั้ง
- ยอด กราฟ รายละเอียด และ CSV ใช้รายการที่โหลดชุดเดียวกัน ยอดที่ระบุเจ้าหน้าที่ไม่ได้ยังอยู่ในภาพรวมและมีทางเปิดรายการต้นทาง เมื่อข้อมูลขาดบางหน้ายอดและ CSV จะแจ้งขอบเขต ส่วนแบบประเมินอ่านตามบุคคลกับช่วงที่ยืนยันในฟอร์ม และคัดลอกได้หลังโหลดครบ
- บัญชีหัวข้อรองมาจาก catalog เดิมของแอป ผังหัวข้อตั้งต้นของแบบประเมินยังต้องทบทวนก่อนใช้ออกเอกสารจริง และหน้าจอแสดงสถานะรอชุดน้ำหนัก JD สำหรับปีงบที่เลือก

## ตรวจรับในเครื่อง

ผ่าน 44 targeted unit tests, ESLint เฉพาะส่วน และ static export ทั้งแบบเปิดกับปิด flag ตรวจ Edge บน desktop และ viewport 390 พิกเซลด้วย Firebase Auth และ Firestore Emulator เมื่อปิด flag ทั้งสอง route เปิดหน้าเดิมได้

| เส้นทาง | ตรวจเทียบกับ Firestore Emulator |
| --- | --- |
| ภาพรวม Staff | 3 กิจกรรมจาก Combo เดียว รายละเอียดครบ 3 แบบประเมินที่เลือกช่วงกว้างกว่านับได้ 4 และเข้า Staff Analytics ไม่ได้ |
| ภาพรวม Admin | 5 กิจกรรม รวม 1 ที่จับคู่เจ้าหน้าที่ไม่ได้ |
| Staff Analytics | กรอง Staff ได้ 3 ตรงกับ CSV เลือกปีงบได้ 4 โหลด 1,000 → 1,002 เอกสารที่มีวันเดียวกัน แล้ว reload กลับค่าเริ่มต้นรายสัปดาห์ |

[ผล Browser QA](../../../output/playwright/analytics-production-workspace/browser-report.json)

ใช้ `node scripts/worklog-workspace-smoke.mjs build --analytics` ตามด้วย `emulators` และ `serve` จากสคริปต์เดิม แล้วรัน `node scripts/verify-analytics-workspace-browser.cjs <playwright-runtime> <edge-executable>` การทดสอบจะ seed เฉพาะ Emulator ใหม่ที่ว่าง เมื่อใช้ข้อมูลเดิมให้ส่ง `--reuse-fixtures` และใช้ `--reuse-fixtures --legacy` สำหรับตรวจ build ที่ปิด flag

## ก่อนเปิดใช้จริง

ยืนยัน production index `employeeId ASC, date DESC` ซึ่งประกาศใน repo แล้ว และตรวจการบังคับสิทธิ์อ่าน `worklogs` ใน Rules กับทางเข้าที่ใช้อยู่ Rules ใน repo ยังอนุญาต read หลังลงชื่อเข้าใช้ การตรวจครั้งนี้ยืนยันการกรองในแอปด้วยบัญชี Emulator ส่วนสิทธิ์ระดับฐานข้อมูลและยอดอ่านที่คิดจริงต้องตรวจแยกก่อนเปิด flag
