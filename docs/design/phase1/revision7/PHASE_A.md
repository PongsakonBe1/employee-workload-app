# เฟส A — ผลปรับ readability และ touch ของ R07

วันที่ 5 พฤศจิกายน 2569 · branch `codex/hig-phase-a-readability` · ฐาน R07 `6fa5ed8` พร้อมเอกสารเฟส 0 `4e2e63b`

## สิ่งที่ทำ

- **A1:** ป้ายรีวิวอยู่ท้ายเอกสารด้านขวาใน normal flow จึงไม่ลอยทับ sidebar บัญชี หรือปุ่มในตาราง มือถือยังซ่อนป้ายนี้
- **A2:** เพิ่ม `--text-caption`, `--text-support`, `--text-body` และปรับข้อความย่อย/metadata/tab labels/badges เป็น rem พร้อมตัวปรับ scoped สำหรับสไตล์ที่สืบทอดจาก R05/R06 ไม่แก้ไฟล์ baseline เหล่านั้น
- ชดเชยตัวอักษร SVG ตามอัตราย่อจริงของ viewBox เพื่อให้ขนาดที่วาดไม่ต่ำกว่า 12 CSS px ขยายแกนเวลาตารางและต้นฉบับจำลองอย่างเป็นสัดส่วนเพื่อรองรับข้อความที่ใหญ่ขึ้น คงตำแหน่งเวลาและเลนข้อมูลเดิม ใช้ scroller ภายในตารางเมื่อพื้นที่ไม่พอ
- **A3:** coarse/any-coarse controls มี hit regions ขั้นต่ำ 44×44 CSS px และไม่ถูก flex บีบ แยก label hit region ของ checkbox/radio จากขนาด glyph ทดสอบจุดกลางและจุดขอบด้านในของตัวควบคุมหลักกับ dialog
- **A4:** คง `system-ui` ก่อน เพิ่ม `Leelawadee UI` และ `Noto Sans Thai` ใน fallback ไม่มีการดาวน์โหลดหรือแจก SF Pro/ฟอนต์ใหม่ การเลือก glyph ที่ใช้จริงยังต้องตรวจบนแต่ละ OS
- **A5:** เพิ่มชุดตรวจ accessibility/contrast/browser zoom และเชื่อมคำสั่ง `verify.cjs --accessibility` กับชุดเดิม

ค่าขั้นต่ำ 12 CSS px, supporting text Desktop เป้าหมาย 13px และ hit region 44×44 CSS px เป็นเกณฑ์โครงการ อ้างหลัก readability/spacing/การรองรับหลายอินพุตจาก HIG ไม่ใช่ค่าที่วัดจาก UI Kit

ตัวปรับ `applyAccessA()` มีขอบเขตเฉพาะ isolated prototype ซึ่งสืบทอดหลาย revision เพื่อ review ก่อนใช้ production ต้องแปลงเป็น semantic React components/tokens ไม่ควรยก DOM scan ไปเป็นสถาปัตยกรรมแอปจริง

## ผลตรวจ

| การตรวจ | หลักฐานและขอบเขต |
|---|---|
| 30 routes × 5 contexts × Light/Dark = 300 states | `output/playwright/ux-phase1/phase-a/accessibility-report.json`, ต้องมี `completed:true`, failures/errors ว่าง |
| contexts | 1440 pointer fine; 1024, 768, 390 และ 375 touch ใช้ browser emulation ไม่ใช่เครื่องจริง |
| ขยายข้อความ 150% | Record, Worklogs, Classrooms, Imports ในแต่ละ context; แยกจาก browser zoom |
| Room/Combo dialogs และ import review | วัด font, label/control regions และ hit-testing; ไม่อ้างว่าครบทุก dialog |
| Light/Dark × Regular/Solid × Reduce Motion | 8 combinations ต่อ context พร้อม Increased Contrast CSS behavior; reduced-transparency ตรวจ CSS และ Solid เพราะ runtime ไม่จำลอง setting นี้โดยตรง |
| Native browser zoom 200% | `browser-zoom-report.json`: Edge test profile แยก ใช้ default zoom preference; viewport 1416→708 CSS px และ DPR 1→2, root 16px และ CSS zoom=1 คงเดิมทั้ง 4 หน้าหลัก |
| ภาพและ regression | `output/playwright/ux-phase1/revision7/report.json`, 120 ภาพและ 11 scenarios เดิม |
| คอนทราสต์ | `contrast-report.json`: 30 คู่สีพื้นทึบจาก CSS R07 ปัจจุบัน ผ่าน 4.5:1 ค่าต่ำสุด 5.22:1 |
| Before/after | ภาพฐาน 4 ตัวอย่างอยู่ `output/playwright/ux-phase1/phase-a/before/`; ภาพหลังครบอยู่โฟลเดอร์ R07 พร้อม gallery และคลิปปรับใหม่ |

การตรวจ zoom ใช้ profile ชั่วคราวที่สร้างเพื่อทดสอบ ไม่อ่านหรือแก้ profile ผู้ใช้ ไม่ใช้ CSS zoom, pinch zoom หรือ device-metrics override ตรวจรูปแบบ preference จาก [Chromium source](https://chromium.googlesource.com/chromium/src/+/main/chrome/browser/ui/zoom/chrome_zoom_level_prefs.cc) ก่อนยืนยันผล

## คำสั่งตรวจ

ใช้ Playwright module และ Edge executable ที่ติดตั้งอยู่แล้วเป็น arguments:

```powershell
node docs/design/phase1/revision7/verify.cjs <playwright-module> <edge-executable>
node docs/design/phase1/revision7/verify.cjs <playwright-module> <edge-executable> --accessibility
node docs/design/phase1/revision7/check-contrast-a.cjs
node docs/design/phase1/revision7/verify-zoom-a.cjs <playwright-module> <edge-executable>
node docs/design/phase1/revision7/record-motion.cjs <playwright-module> <edge-executable>
node docs/design/phase1/revision7/review-boards.cjs <playwright-module> <edge-executable>
```

การรัน matrix ต้องรอ render frames/animation จริงก่อนวัด; report ระบุ `completed` และ error เมื่อหยุดก่อนจบ ผล scan หรือ states-only ใช้ debug เท่านั้น ไม่ทดแทนผลครบ 300 states

## ข้อจำกัดและขั้นต่อไป

- ยังต้อง UAT บน iPhone Safari/PWA, Android Chrome/PWA และ Windows/Mac Chrome จริง รวมภาษาไทย VoiceOver/TalkBack และ performance
- ไม่รับรอง contrast หลัง compositing ของ Glass บนทุก backdrop, ทุก hover/disabled state หรือ WCAG conformance ทั้งระบบจากตัวเลขคู่สีพื้นทึบ
- ไม่เปลี่ยน grabber/gesture model, menu keyboard model, metric semantics, PDF/OCR, auth หรือ production persistence ในเฟสนี้
- **ยังไม่เริ่มเฟส B:** ไม่มี Glisse install, lockfile/source frontend เปลี่ยน, push หรือ deploy ให้ผู้ใช้ตรวจเฟส A ก่อนเสนอ spike B
