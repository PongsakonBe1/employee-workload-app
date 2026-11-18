# Calendar staging smoke test

ชุดนี้ใช้ผล Rules cutover ที่ผ่านแล้วและลดการเรียก API จาก 13 เหลือ 8 ครั้ง ใช้ payload ที่ตรึงจากชุดเดิมทุกครั้ง การทดสอบ PDF และ DL ใช้ผลจากหน้าตรวจนำเข้าที่ผ่าน staging มาแล้ว เพื่อทดสอบ backend writer โดยตรง เจ้าของงานอนุมัติ [manifest](review.json) แล้ว

**ผลบน staging ผ่าน 8/8 เมื่อ 18 พ.ย. 2569** Staff ได้ 403 และชุดตารางชนได้ 400 การส่งคาบกรอกเองซ้ำคืน `repeated=true` โดยเพิ่ม 0 รายการ เพิ่มเอง ผลนำเข้า PDF/DL แก้เวลา และยกเลิกผ่านครบ [Audit หลังปิด writer](../../../output/playwright/calendar-trusted-writer-audit-prep/cloud-audit-5-8.json) ยืนยัน gate 17 → 22, ตารางใหม่ 5 รายการ (4 active และเก็บคาบที่ยกเลิกไว้ 1 รายการ), receipts 5 รายการ และข้อมูลในขอบเขตตรวจตรง baseline

คืน writer และ connectivity เป็น 0 แล้ว ยืนยันจาก deploy Live และ public health บน Render Free ที่ commit `2aa1bd2` ใช้คำขอ API 8 ครั้งและ audit 14 คำขออ่านตามวงที่อนุมัติ ระหว่างเตรียมฟอร์ม เมนู Render ทำให้ deploy revision เดิมซ้ำหนึ่งครั้งขณะ writer ยังปิด ดู [บันทึกดำเนินการ](../../../output/playwright/calendar-staging-writer-smoke/execution-progress.json)

| คำขอ | ผลที่ต้องเห็น |
|---|---|
| Staff ส่ง payload เดียวกับคาบกรอกเอง | HTTP 403 `permission-denied` |
| Superadmin สร้างคาบ 7 มิ.ย. 2570 ห้อง 401 เวลา 09:00–10:00 แล้วส่งชุดเดิมซ้ำ | สร้าง 1 รายการครั้งแรก ครั้งถัดไป `repeated=true` และเพิ่ม 0 รายการ |
| ส่งชุดที่มีคาบว่าง 11 มิ.ย. ห้อง 402 คู่กับคาบชนห้อง 401 | HTTP 400 และทั้งชุดว่างใน audit |
| นำเข้าผลตรวจ PDF 8 มิ.ย. ห้อง 401/402 และผลตรวจ DL 9–10 มิ.ย. เวลา 17:00–18:30 | เพิ่มอย่างละ 2 รายการ รอบ DL 75 คนใช้ 406+407 และผู้คุมจาก directory เดิม |
| เลื่อนคาบกรอกเองเป็น 10:00–11:00 แล้วยกเลิก | ID เดิม, เวลาตรง, version 2 และเก็บเอกสารไว้โดย `isActive=false` |

ก่อนเริ่มตรวจ source ของ Render, แผน Free และ audit checkpoint 0 ให้ตรงกับ gate 17 จากนั้นเปิด `CALENDAR_SERVER_WRITE=1` เฉพาะช่วง QA บน Render `labboy-calendar-staging` ที่ commit เดิม ช่วงที่เปิด flag บัญชี staging ที่มีสิทธิ์ writer ยังสามารถเขียนตามสิทธิ์ปกติ จึงทดสอบในช่วงที่ไม่มีงาน staging อื่น หลังผ่านหรือพบผลผิดคาดให้คืน `CALENDAR_SERVER_WRITE=0` และตรวจ health โดยคง `CALENDAR_SERVER_CONNECTIVITY=0` ตลอด

ตรวจข้อมูลอีกครั้งหลังหยุด writer เกณฑ์ผ่านคือ gate 22, 5 ตารางใหม่, 5 receipts, คาบที่ยกเลิกยังอยู่ และข้อมูลในขอบเขต audit ตรง baseline หากพบผลผิดคาดให้หยุดส่งคำขอและตรวจ checkpoint ล่าสุดที่ยืนยันได้ ขอบเขตคำขออ่านรวมสองรอบ รอบละ 7 คำขอ เขียนเพิ่มเพื่อแก้ผลหรือส่งซ้ำอัตโนมัติอยู่นอกชุดนี้

ใช้ผล Emulator เดิมสำหรับ race, stale edit, สัญญาณเครือข่ายหลุด และกรณีตัวอย่างซ้ำ ไม่รัน SDK denial ที่ผ่านแล้วซ้ำ รอบนี้เพิ่มหลักฐานเฉพาะ trusted writer และสิทธิ์เขียนของ Staff บน cloud

ตัวส่งอยู่ที่ `/dev/calendar-trusted-cutover` บน `http://127.0.0.1:4311` ใช้ Google session ของ Staff และ Superadmin ในแท็บแยก จาก audit ก่อนเปิด writer ออกไฟล์ด้วย `node scripts/prepare-calendar-cutover-proof.mjs --approve-writer-smoke` แล้วโหลด proof ซึ่งหมดอายุใน 10 นาที ให้ Staff ส่งคำขอแรกจนได้ 403 ก่อนให้ Superadmin เริ่ม 7 คำขอที่เหลือ ระบบจองแต่ละคำขอก่อนส่งใน IndexedDB เดียวกันทั้งสองแท็บ ถ้าผลไม่ตรงหรือยังสรุปไม่ได้ ระบบจะหยุดและไม่คืน slot เมื่อ reload
