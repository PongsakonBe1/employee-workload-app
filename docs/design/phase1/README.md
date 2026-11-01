# เฟส 1: ออกแบบประสบการณ์ใช้งาน labboy Workload

สถานะ: ต้นแบบเพื่อให้ Tech Lead ตรวจรับการออกแบบ ยังไม่ใช่ implementation ของแอป

- วันที่: 1 พฤศจิกายน 2569 (Asia/Bangkok)
- Branch: `codex/ux-redesign-phase1`
- ฐานงาน: `6a69ad3b7487963c487c3d0c35d4501f2bcf73d4`
- กลุ่มใช้งาน: 8 คน ใช้งานจริงมา 6 เดือน ตามข้อมูลจากผู้ใช้
- เป้าหมาย: สมดุลการใช้งานจริงกับการประเมินงานวิจัยแบบ DSR

## เปิดตรวจต้นแบบ

เปิด [prototype.html](prototype.html) ด้วย browser โดยตรง ไม่ต้องติดตั้งแพ็กเกจหรือเชื่อม Firebase

ต้นแบบมี 4 หน้าผ่านเมนูด้านข้าง: อุปกรณ์และบันทึกด่วน, การใช้งานอุปกรณ์, ตารางสอบและเรียน, และภาระงานบุคลากร เลือก System / Light / Dark ได้ทุกหน้า ใช้ข้อมูลสังเคราะห์ทั้งหมดและเก็บการเปลี่ยนแปลงในหน่วยความจำ การ refresh จะเริ่มต้นใหม่

การเลือกรูปแสดง preview ในเครื่องเท่านั้น ปุ่ม “ใช้ตารางตัวอย่าง” โหลดข้อมูลสังเคราะห์ที่เตรียมไว้ ไม่ได้อ่านตัวอักษรจากรูป ไม่มี OCR, AI service, การส่งรูป หรือการบันทึกฐานข้อมูลอยู่ในต้นแบบ

อ่าน [requirements.md](requirements.md) สำหรับ requirement และเกณฑ์ยอมรับ และ [verification.md](verification.md) สำหรับ baseline, ผลตรวจต้นแบบ และแผนตรวจ implementation

## ลำดับเฟสและจุดอนุมัติ

1. เฟสนี้: requirement, flow, design tokens, interactive prototype และตรวจต้นแบบ
2. รอผู้ใช้ตรวจและอนุมัติการออกแบบ ก่อนพัฒนาแอปจริง
3. เสนอแผน implementation แยกตามงาน: UI/ธีมและอุปกรณ์ → ตาราง → Staff Analytics
4. ตรวจ unit/integration/E2E ด้วยข้อมูลสังเคราะห์ใน environment แยก แล้วให้ผู้ใช้ทำ UAT
5. ขออนุมัติแยกสำหรับ migration, ติดตั้ง dependency, push และ deploy

## ขอบเขตที่ยังไม่ดำเนินการ

- ไม่แก้ source ของ frontend/backend, Firestore rules, schema หรือไฟล์ตั้งค่าที่ใช้งานอยู่
- ไม่เชื่อม production ไม่อ่าน credentials และไม่นำรายชื่อจากรูปมาใช้เป็น fixture
- System Settings เป็นเรื่องรองตามคำตัดสินใจผู้ใช้
- ประเด็น lock, atomic Combo และสิทธิ์จากการวิเคราะห์ยังคงเป็น risk backlog ไม่ถือว่าแก้แล้ว

## แนวทาง UI

ใช้ Apple HIG เป็นแนวทางในการจัดลำดับข้อมูลและพฤติกรรม ไม่อ้างว่าเป็น native macOS หรือได้รับการรับรองจาก Apple:

- sidebar สำหรับเลือกงาน, toolbar สำหรับคำสั่งเฉพาะหน้า, inspector/dialog สำหรับแก้รายการ
- สีตามความหมาย: พื้นผิว ข้อความ เส้นแบ่ง accent สถานะ และ focus เปลี่ยนตามธีมได้
- ใช้ผิวโปร่งเฉพาะ navigation/toolbar เนื้อหาตารางและกราฟต้องอ่านชัด
- desktop ใช้หลายคอลัมน์; mobile เปลี่ยน navigation เป็นแถบเลื่อนและเรียงเนื้อหาแนวตั้ง
- รองรับ keyboard, label, focus-visible, reduced motion และ reduced transparency ตามที่ browser รองรับ
- Light/Dark/System เป็นความชอบรายบุคคล ไม่ใช่การตั้งค่าที่บังคับทุกคน

แหล่งอ้างอิงที่ตรวจวันที่ 1 พฤศจิกายน 2569:

- [Apple HIG: Materials](https://developer.apple.com/design/human-interface-guidelines/materials)
- [Apple HIG: Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode)
- [macOS Golden Gate](https://www.apple.com/os/macos/)

## การตรวจรับที่ต้องการจาก Tech Lead

- โครงหน้า ความหนาแน่นข้อมูล และ Light/Dark เหมาะกับงานจริงหรือไม่
- flow ย้ายอุปกรณ์แล้วตรวจในบันทึกด่วนเข้าใจง่ายหรือไม่
- ขั้นตรวจตารางจากรูปและจับคู่ผู้คุมสอบลดงานซ้ำได้หรือไม่
- อันดับจำนวนครั้งยืมและการเลือกปีงบตอบคำถามเพื่อวางแผนได้หรือไม่
- รูปแบบต้นทางของตารางเรียนยังต้องยืนยันแยกจากตารางสอบ DL
