# เตรียม trusted writer cloud QA

วันที่ 18 พฤศจิกายน 2569 · branch `codex/calendar-trusted-writer-qa-prep` จาก `ba66899`

**เฟสนี้เตรียมในเครื่องเท่านั้น ยังไม่อนุมัติการเขียน cloud, เปลี่ยน Rules หรือเปิด writer** การเชื่อม Render/Firebase staging ผ่าน bounded signed probe แล้ว ผลนั้นพิสูจน์การอ่านของ server และผู้ทดสอบ ไม่ใช่ผล create/edit/cancel บน trusted server

## ขอบเขตและเหตุผล

1. ตรวจ contract และแยกข้อเสนอ [cloud QA manifest](cloud-qa.review.json) จาก manifest ของ writer pilot เก่า กำหนดจำนวนเอกสาร/receipt/gate และทุก POST ให้ตรวจรับได้
2. ใช้ candidate deny-client-write Rules เดิมโดยไม่แก้ไฟล์ เพราะ server SDK ผ่าน IAM ไม่ผ่าน Rules; ถ้า SDK writer เก่ายังเปิดอยู่ business invariants ของ server สามารถถูกข้ามได้
3. ทดลอง payload สังเคราะห์ด้วย pure planners ในเครื่องเพื่อจับวันที่ ห้อง จำนวนผู้สอบ conflict และ version ผิด ก่อนแตะข้อมูลจริง ไม่เอา synthetic IDs ไปเขียน cloud
4. ตรวจ JSON, frozen hashes, request budgets และผล planner พร้อม local commit; ไม่ push/deploy ไม่อ่าน baseline cloud เพิ่ม ไม่เปิด credentials และไม่สร้างบัญชี/profile ใหม่

## ข้อเท็จจริงที่ใช้เป็น baseline

- Runtime ที่ตรวจผ่าน: `2aa1bd27f1795890871297d1ffdf0d1d6acdd2e5`; Render `labboy-calendar-staging`, Free; Firebase `labboy-workload-app-staging` ฐาน `(default)`
- ก่อนเริ่มเฟสนี้ health ยืนยัน writer=false / connectivity=false; source และการตั้งค่า cloud ไม่เปลี่ยนในเฟสเตรียม
- Server ตรวจ token revocation/audience/issuer, profile สดใน transaction, gate, directory และ conflicts ก่อนบันทึก ใช้ receipt เดิมตรวจ replay และไม่เพิ่ม collection/schema ในเฟสนี้
- ขอบเขต server: 100 รายการต่อ batch, ช่วงไม่เกิน 400 วัน, query ที่เกี่ยวข้องไม่เกิน 200 เอกสารและปฏิเสธเมื่อเกิน ไม่ใช่การรับประกัน billed reads หรือค่าใช้จ่ายเป็นศูนย์ทุกสถานการณ์
- ยังไม่อ่าน Rules ที่ deploy ปัจจุบันหรือ gate สดในเฟสนี้ จึงไม่อ้างว่า candidate hash ตรงกับ cloud หรือวันทดสอบว่างจริง

## ชุดทดสอบที่เสนอ

| ชุด | ข้อมูลสังเคราะห์ | ผลที่ต้องเห็น |
|---|---|---|
| กรอกเอง + ส่งพร้อมกัน | 7 มิ.ย. 2570 ห้อง 401 เวลา 09:00–10:00 ส่ง payload เดียวกันพร้อมกัน 2 requests | เอกสารใหม่ 1, receipt 1, gate +1; คำขอหนึ่งเป็น replay |
| Atomic rejection | รายการว่าง 11 มิ.ย. ห้อง 402 พร้อมรายการชนคาบกรอกเอง | HTTP **400** ทั้งชุด ไม่ใช่ 409; ไม่มีเอกสาร/receipt/gate เพิ่ม |
| PDF หลัง review | 8 มิ.ย. ห้อง 401/402 เวลา 11:00–12:00 | 2 เอกสาร, receipt 1, gate +1 |
| DL หลัง review | 9–10 มิ.ย. เวลา 17:00–18:30 รอบละ 75 คน ใช้ 406+407 | 2 เอกสาร, receipt 1, gate +1; ผู้คุมเป็น directory IDs จริงที่ freeze ภายหลัง |
| DL conflict | ชื่อใหม่แต่วัน/เวลา/ห้อง/ผู้คุมชนรอบแรก | HTTP 400; เป็น combined overlap ไม่อ้างว่าแยก proctor-only ได้ |
| แก้คาบกรอกเอง | เป็น 10:00–11:00 โดยคง document ID | receipt 1, gate +1, mutationVersion=1 |
| Stale mutation | ใช้ original version=0 สร้าง mutation ใหม่หลังแก้แล้ว | HTTP 409 และไม่มีการเขียน; ต้องแยกจาก replay ของ receipt ที่มีอยู่ |
| หยุดใช้คาบกรอกเอง | ใช้ original หลังแก้ที่ freeze ไว้ | receipt 1, gate +1, mutationVersion=2, isActive=false; ไม่ลบเอกสาร |
| Replay ที่เหลือ | PDF/DL/edit/cancel ชุดเดิมอย่างละหนึ่งครั้ง | repeated=true; created/changed=0; counts และ gate ไม่เพิ่ม |

รวมเพดาน **5 schedules ใหม่ / 5 receipts ใหม่ / gate +5 / 13 POSTs**: successful operations 5, replay 5 (รวม concurrent duplicate แรก) และ expected rejection 3 ไม่มี retry อัตโนมัตินอกบัญชีคำขอ ถ้าเริ่มส่งแล้วผลไม่แน่นอนให้หยุดตรวจ receipt และใช้ได้เฉพาะ replay เดิมที่ยังมี quota ไม่เปลี่ยนชื่อ/วันที่เพื่อบังคับเป็น operation ใหม่

จัดจังหวะไม่เกิน **10 POSTs ต่อ UID ในช่วงเลื่อน 60 วินาที** ต่ำกว่า runtime limit 12 โดยนับ concurrent/rejected/replay ด้วย หากได้ 429 ให้หยุดรอบตาม manifest และตรวจ quota ก่อน ไม่ส่งซ้ำเองจนเกิน 13 requests

5 schedules คือ classroom 3 + DL 2; หลัง soft-cancel จะมี 4 active และคงเอกสารกรอกเองที่ inactive ไว้ ไม่เอารายการเดิมจาก QA รอบก่อนมาลบทิ้งหรือแก้เพื่อให้ผ่าน

## Preconditions ก่อนขอเปิดรอบ cloud

- ขออนุมัติอ่าน baseline staging แบบจำกัดก่อน: deployed Rules source/hash, project/service/source SHA, gate revision, metadata/ข้อมูลปฏิทินเท่าที่จำเป็นต่อ conflict, และ directory/profile ผู้ทดสอบเดิม ไม่เปิด worklogs หรือ key contents
- ตรวจ source/hash, active bounded queries และ adapter completeness; ตรวจทั้ง term bounds ของ classroom และ dated DL หยุดเมื่อข้อมูลไม่ครบ/เกิน 200 ไม่กรองข้อมูลทิ้งเพื่อให้ validator ผ่าน
- จับคู่ aliases กับ UID เดิมในไฟล์ ignored ที่ review ได้โดยไม่ส่ง PII ลงเอกสาร commit; freeze payload/target IDs/operation IDs ใหม่หลังจับคู่จริง ผล local synthetic hash ไม่ใช่ cloud payload hash โดยเฉพาะ DL
- Candidate Rules SHA-256 คือ `4762054e74b3723bc4345f351b01bb43ee450ae8c7e6a399c4fd6473b717a1c7`; เป็น hash ของไฟล์ใน repo เท่านั้น ยังไม่ใช่การยืนยัน hash ที่ deploy จริง
- ต้องมีช่องทาง read-only trusted audit ที่ตรวจรับแล้วสำหรับ gate/receipts/owned schedules เพราะ candidate Rules ปิด SDK gate/receipt reads และหน้า legacy replay ไม่รองรับ HTTP runtime นี้ ยังไม่มีการอนุมัติสร้าง audit endpoint ใหม่
- ตรวจ hash ของ candidate Rules เทียบ baseline จริง พร้อมปิด pilot/in-flight requests และประเมินผลต่อ staging features อื่น candidate เป็น calendar-only deny-all สำหรับ path อื่น จึงห้าม deploy ทับ production และต้องตรวจขอบเขตก่อน apply
- ขออนุมัติเฉพาะ Rules cutover, runtime commit/deploy, frozen cloud manifest และช่วงเปิด server/UI write flags ก่อนดำเนินการจริง ไม่ใช้คำอนุมัติ connectivity มาแทน

## ลำดับ cutover และ rollback ที่เสนอ

1. คง writer/probe ปิด ตรวจ baseline และ ownership แล้ว freeze หลักฐานข้างต้นให้ผู้ใช้อนุมัติ
2. Deploy exact Rules ที่อนุมัติให้ direct SDK writes ปิดก่อน Verify reader query และ denial จริงแบบจำกัดที่ได้รับอนุมัติ จากนั้นจึงเปิด trusted writer; ถ้า Rules/verification ผิดให้หยุดโดยยังไม่เปิด writer
3. ตรวจ service source/health/origin และ writer flag ก่อนส่ง token ทำ QA ตาม manifest พร้อมจอง request ก่อนส่งและเก็บผล response/read-back/audit แยกกัน
4. จบหรือผิดพลาด ให้ปิด server/UI writer, connectivity=0, deploy และยืนยัน health คง deny-client-write Rules และข้อมูลที่ commit ไม่เปิด SDK writers คืน ไม่ physical-delete และไม่ rollback ข้อมูลอัตโนมัติ

การปิด writer ไม่คืนเอกสารที่ commit และไม่เพิกถอน credential หาก expected rejection เขียนได้จริง ให้หยุดและเก็บหลักฐานทันที จำนวนที่เกินเพดานเป็น defect ที่ต้องรายงาน ไม่ใช่อนุญาตให้สร้างเพิ่มหรือ cleanup เพื่อตกแต่งผล

## ข้อจำกัดและเกณฑ์ตรวจรับ

ผล local planner เป็นการตรวจ contract ในหน่วยความจำ ไม่ใช่ transaction/Emulator SIT/HTTP/Firestore cloud test ไม่รัน full Unit/build ซ้ำเพราะไม่มี runtime source change ในเฟสนี้

ตรวจซ้ำในเครื่องได้ด้วย `node --check scripts/verify-calendar-trusted-writer-review.mjs` และ `node scripts/verify-calendar-trusted-writer-review.mjs` สคริปต์อ่านเฉพาะ manifest, Rules และโมดูล planner ที่ไม่มี IO ใช้ synthetic IDs แล้วเขียนรายงานใน workspace ไม่มี SDK/HTTP/credential access

แผนนี้ยังไม่ครอบคลุม Cloud AUTH matrix ทั้งหมด, proctor-only conflict แบบแยกสาเหตุ, distinct concurrent payload ที่ชนกัน, network loss/read-back failure บน cloud ทั้งหมดมีหลักฐาน Emulator/transport เดิม แต่ถ้าจะปิด release gate ต้องจัด mapping หลักฐานและอนุมัติกรณี cloud ที่จำเป็นเพิ่ม ไม่รายงานว่าทั้ง CAL-WRITE/AUTH พร้อม production จาก 13 requests นี้เพียงอย่างเดียว

ผ่านเฟสเตรียมเมื่อ budgets/IDs ตัวอย่าง/contract ตรวจได้, manifest ระบุ approval=false, ไม่มี cloud mutation และมีรายงาน [local review](../../../output/playwright/calendar-trusted-writer-qa-prep/local-review-report.json) พร้อม candidate hash ต่อไปให้ผู้ใช้ตรวจรับ ก่อนเฟสอ่าน baseline และ freeze manifest ที่มี IDs จริง
