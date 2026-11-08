# การแก้ 8 failures เดิม

แก้ใน branch `codex/assessment-summary-analytics` แยก commit จาก UI ไม่มี skip/ลดจำนวนเทสต์

| กลุ่ม | สาเหตุและการแก้ |
| --- | --- |
| validateDate (1) | เทียบ UTC midnight กับ local midnight ทำให้วันพรุ่งนี้ถูกปฏิเสธ ใช้วันปฏิทิน Asia/Bangkok และเทียบ date-only อนุญาตถึงวันถัดไปตาม contract เดิม |
| predictNextPeak (2) | อ้าง key ปฏิทินเก่าที่ไม่มีจริงและเรียงเดือนแบบ hardcode เปลี่ยนไปใช้ช่วงสอบที่มีวันเริ่ม/สิ้นสุดใน repo เรียงวันและจำกัด horizon ไม่สมมติวันสอบของปีที่ไม่มีปฏิทิน; รับ referenceDate เพื่อทดสอบได้แน่นอน |
| Outlier (2) | fixture มี 5 ค่า ซึ่งค่าสูงสุดไม่เกิน mean+2 population SD ตามสูตรเดิม เพิ่มค่าฐานเป็น 6 ค่าเพื่อทดสอบ outlier และเพิ่ม regression ยืนยันข้อจำกัดของ 5 ค่า ไม่เปลี่ยน threshold ให้ผ่านเทสต์ |
| Consistency (1) | เทสต์สมมติวันไม่มีข้อมูลเป็นศูนย์ แต่ contract/code ใช้เฉพาะวันที่มีบันทึก ปรับเทสต์ให้ตรวจว่าไม่เดาศูนย์จากวันที่ขาด และเพิ่ม fixture จำนวนต่อวันที่ต่างกันจริง ตรวจสูตร population SD |
| Radar (1) | fixture 25 แถว มี 13 แถวตามเงื่อนไข ค่าที่ถูกคือ 52% แก้ expected จาก 50 เป็น 52 |
| Trend (1) | contract มากกว่า 10% แต่ fixture ใช้ 10% พอดี เพิ่มกรณีขอบ ±10% เป็น stable และ >10% จึง up/down |

หมายเหตุ: สถิติ outlier แบบ 2 SD ยังเป็น heuristic เดิม ไม่ใช่หลักฐานประสิทธิภาพบุคลากร การอนุมานจากข้อมูลหลายปีก็ยังไม่ใช่โมเดลที่ผ่านการวัดความแม่นยำ UI Staff ใหม่ไม่ใช้คะแนนเหล่านี้ประเมินคุณภาพพนักงาน

หลักฐาน: `output/playwright/assessment-summary/unit-after-legacy.json` และ `timezone-check.json` ตรวจ validation ภายใต้ host TZ Asia/Bangkok, UTC และ America/Los_Angeles ผ่านทั้งสามแบบ
