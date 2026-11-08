# สีและบทบาทของปุ่ม Liquid Glass

9 พฤศจิกายน 2569 · branch `codex/glass-button-roles` จาก `52dfd61` · Develop / synthetic data

## ข้อตกลงและสิ่งที่ปรับ

ผู้ใช้อนุมัติการปรับสีและบทบาทปุ่มต่อจากเฟส Templates/Combo รักษา layout และ flow ที่อนุมัติแล้ว

| บทบาท | รูปแบบ | จุดที่ใช้ |
|---|---|---|
| การกระทำหลักที่ปลอดภัย | น้ำเงินกระจก ตัวอักษรขาว | GlassButton prominent เช่น บันทึก สร้าง ตรวจรายการ |
| คำสั่งทั่วไป / ยกเลิก | กระจกสีกลาง | กลับ ยกเลิก ดูรายละเอียด |
| Destructive | ข้อความ/ไอคอนแดง กระจกที่เน้นน้อยกว่าปุ่มหลัก | ลบงาน ยืนยันลบ ลบตาราง เอางานในร่าง Combo ออก |
| หยุดใช้ / เปิดใช้อีกครั้ง | กระจกสีกลาง | เทมเพลตและอุปกรณ์ยังเปิดกลับได้ ไม่ใช่การลบข้อมูล |
| สถานะเปิดใช้ | ป้ายเขียวพร้อมข้อความ | ป้ายสถานะแยกจากคำสั่ง ไม่เปลี่ยนปุ่มอนุมัติทุกปุ่มเป็นสีเขียว |

แยก action tint ออกจาก accent ของ selection/chart/calendar จึงไม่เปลี่ยนสีกราฟ ปฏิทิน หรือ checkbox ทั้งระบบตามสีใหม่ของปุ่ม ปุ่มหลัก dark mode เปลี่ยนจากฟ้าพาสเทลตัวอักษรเข้มเป็นน้ำเงินตัวอักษรขาว ปรับชั้น tint และ feedback เมื่อ hover/กด โดยใช้ขอบแสง/การหักเหจาก QuickLiquid เดิม

ปุ่มสีใช้ legibility backing เพื่อให้ตัวอักษรอ่านได้ แม้ภาพใต้ glass สว่างหรือมืดมาก โหมด CSS มี blur/tint fallback; Reduce Transparency ใช้พื้นทึบ; forced colors ใช้สีระบบพร้อมข้อความ/ไอคอน และ reduced motion ไม่เพิ่ม animation ฝืนความต้องการผู้ใช้

`variant="destructive"` เป็น visual intent ของ shared component ไม่ใช่ ARIA role ใหม่ ไม่ใช่การบังคับสิทธิ์ และไม่เปลี่ยน default เป็นคำสั่งลบ ส่วน handler/validation/Undo ใช้ของเดิม เพิ่มปุ่มยกเลิกที่หน้าต่างยืนยันลบประวัติงาน

## ขอบเขตการย้าย

- คำสั่งลบประวัติงานรายรายการ/หลายรายการและยืนยันลบ
- คำสั่งลบและยืนยันลบในปฏิทิน ใช้ shared GlassButton แทนปุ่มแดงเฉพาะหน้า
- ปุ่มเอางานออกจากร่าง Combo คงเงื่อนไขอย่างน้อยสองรายการและ Cancel ร่างได้
- ตัวอย่างสีและบทบาทบน `/dev/ui` มี primary, cancel, destructive, disabled และสถานะเปิดใช้แยกจากคำสั่งหยุดใช้

ยังไม่มี flow ปฏิเสธคำขอที่ย้ายมาใน feature previews ปุ่มปฏิเสธใน component lab เป็นตัวอย่างสีเท่านั้น ไม่สร้างฟีเจอร์/ธุรกรรมปฏิเสธใหม่ หน้า production เดิมไม่ได้ย้าย business flow เพิ่มในเฟสนี้

## อ้างอิงและการตีความ

- [Apple HIG: Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons): แยก style/content/role, primary ใช้ accent และ destructive ใช้ system red; ไม่ทำ destructive เป็น primary โดยอัตโนมัติ
- [Apple HIG: Color](https://developer.apple.com/design/human-interface-guidelines/color): Liquid Glass รับสีจากเนื้อหา เติมสีเพื่อเน้นสถานะหรือการกระทำหลักอย่างพอดี
- [WWDC25: Build an AppKit app with the new design](https://developer.apple.com/videos/play/wwdc2025/310/): control prominence และ glass tint ช่วยแยกความสำคัญของคำสั่ง

การคง “หยุดใช้” เป็นสีกลางเป็นการตีความตามผลของคำสั่งในแอปนี้ ไม่ใช่ข้อกำหนดตายตัวของ HIG สีที่เลือกเป็น web tokens ที่ทดสอบ contrast ไม่อ้างว่าเป็น native Apple system color ตรงทุก platform หรือผ่าน HIG ทุกข้อ

## ตรวจรับ

1. เปิด `/dev/ui` ดู “สีและบทบาทของปุ่ม” สลับ light/dark และ CSS/QuickLiquid ผ่านตัวเลือก Development
2. เปรียบเทียบ primary/neutral/destructive และทดสอบหยุดใช้ตัวอย่าง ป้ายสถานะต้องเปลี่ยนโดยปุ่มไม่กลายเป็นเขียว/แดงตามสถานะ
3. เปิด `/dev/templates` เลือก Admin หยุดใช้ชุดงานแล้ว Undo; แก้ Combo เอางานออกแล้ว Cancel ต้องคงชุดเดิม
4. เปิด `/dev/history` เลือก Admin ดูรายการ ลบ → ยกเลิก ยอดต้องไม่เปลี่ยน; ลบจริงในข้อมูลตัวอย่างแล้ว Undo ยอดต้องกลับ
5. เปิด `/dev/calendar` ตรวจรายละเอียด → ลบตาราง → ยกเลิก/ลบ/Undo ตาม flow เดิม
6. ตรวจบนอุปกรณ์จริงของทีม โดยเฉพาะ Safari/iPhone และ Android ก่อน human UAT sign-off

## หลักฐาน QC

ผลที่ตรวจยืนยันได้อยู่ใน `output/playwright/glass-button-roles/qc-summary.json` พร้อมภาพ/รายงานราย browser และ regression

- Unit ทั้งชุด 342/342 ไม่ skip; ไม่มีการเพิ่ม unit tests ที่เพียงตรวจชื่อ CSS class
- Browser tests ตรวจ contrast ของ fill/label ที่อ่านจาก CSS ที่ render จริง ทั้ง idle/hover/pressed, ต้นและปลาย gradient เหนือขอบเขตพื้นดำ/ขาว ต้องไม่น้อยกว่า 4.5:1 วิธีนี้เป็นขอบเขตการผสมสีที่เลือก ไม่ใช่การวัดทุก pixel ของภาพหักเห
- ตรวจ native buttons/keyboard/disabled, label+icon ไม่พึ่งสีอย่างเดียว, solid/reduced-motion/forced-colors
- Local 375/390/430/768px และ PC 1440px; Edge sample ทั้ง 9 feature previews × 390/1440 × light/dark; Chrome/public sample record/history/calendar/templates
- รัน flow regressions ของ Quick Log, history, calendar และ Templates/Combo ด้วย synthetic ledger
- Targeted ESLint, script syntax, native zoom 200% และ isolated compatibility build แยกจาก production output

รอบสุดท้าย: ชุดตรวจสี/บทบาท 7/7 บน Edge, Chrome และ Cloudflare; contrast 96 ตัวอย่างต่อ browser ค่าต่ำสุด 4.69:1; regressions Quick Log 11/11, history 9/9, calendar 11/11 และ Templates/Combo 7/7 ปฏิทินตรวจรูปทรง shared control และ Cancel ก่อนยืนยันลบด้วย

Cloudflare รอบแรกตอบ 502 ของไฟล์ script และรอ hydration ไม่สำเร็จ จึงไม่นับว่าผ่าน เก็บรายงานไว้ใน `attempts/public-initial.json` ทดสอบทั้งชุดซ้ำผ่านโดยไม่เพิ่ม retry เพื่อซ่อนผล ลิงก์ชั่วคราวยังมีข้อจำกัดด้านความเสถียรนี้

ยังไม่มี Firebase/Auth/backend SIT หรือ physical Safari/iPhone/Android UAT ไม่มีการติดตั้งแพ็กเกจ push หรือ deploy ลิงก์ Cloudflare เป็น temporary develop preview ข้อมูลใน ledger เริ่มใหม่เมื่อ refresh และ **all-pages-ready = false**

หลัง Tech Lead ตรวจ UI/flow เฟสนี้แล้ว จึงเลือกเฟสถัดไป ไม่ถือว่าผ่าน production gate จากการทดสอบข้อมูลสังเคราะห์
