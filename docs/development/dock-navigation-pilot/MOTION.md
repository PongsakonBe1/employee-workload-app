# Dock motion pass — ส่งตรวจใน Develop

9 พฤศจิกายน 2569 · branch `codex/dock-navigation-pilot` · ต่อจาก `e0783c2`

## สิ่งที่ปรับ

- คงชุดสีและ SVG เดิมที่ผู้ใช้ชอบ เปลี่ยน magnification จาก CSS endpoint เป็น spring ของ QuickLiquid ที่ติดตั้งอยู่แล้ว ขยายสูงสุด 1.48 เท่า โดยค่อย ๆ ลดตามระยะเมาส์ และเลื่อนไอคอนข้างเคียงเพื่อรักษาช่องว่าง
- วัดตำแหน่งจากช่อง layout ที่อยู่นิ่ง ป้องกันการขยายย้อนกลับไปเปลี่ยนค่าระยะเมาส์เอง การเคลื่อนเกิดด้วย transform จึงไม่ดันเนื้อหาหน้าเว็บ
- แยกแผงกระจกออกจาก controls ให้แผงขยายรับการเคลื่อนไหว โดยไม่สร้าง refraction map ใหม่ทุกเฟรม หยุด RAF เมื่อ spring เข้าที่หรือหน้าเว็บถูกซ่อน
- “หน้าและเครื่องมือ” เปิดใกล้ Dock พร้อมจุดกำเนิด animation ที่ปุ่มเดิม ใช้ไอคอนสีเดียวกันในแผงสองคอลัมน์บน PC / หนึ่งคอลัมน์บนมือถือ การเปิดจาก Search หรือ Ctrl/Cmd+K ยังอยู่กลางจอ
- หยุด magnification เมื่อเปิด dialog, รองรับ Escape และคืน focus, ลดการเคลื่อนไหวตาม preference/ระบบ และปิด magnification เมื่อ Dock ต้องเลื่อนในหน้าต่างเตี้ย

เป็นการประยุกต์แนวทาง [Apple Motion](https://developer.apple.com/design/human-interface-guidelines/motion) และพฤติกรรม [Dock magnification](https://support.apple.com/en-nz/guide/mac-help/mchlp1119/mac) กับเว็บ ไม่อ้างว่าใช้ animation parameters ภายในของ macOS หรือผ่านการรับรองจาก Apple

## หลักฐานการตรวจ

หลักฐานอยู่ใน `output/playwright/dock-motion-pass/`

- Unit tests: 368 ผ่าน รวม geometry ของ magnification, ช่องว่าง, viewport limit และขอบเขต falloff
- Chrome local และ Edge ผ่าน Cloudflare: อย่างละ 36 render/layout checks จาก 9 previews × PC/mobile × light/dark รวม role filtering, navigation, draft, Sidebar toggle และ keyboard
- Motion checks บน Chrome/Edge: magnification และ neighbor displacement, เนื้อหาไม่ reflow, คืนตัวและหยุด RAF, ไอคอนไม่ทับกัน/ไม่ล้น viewport, Tools ไม่ตัดไอคอน, focus/Escape และ reduced motion
- Regression บันทึกงาน 11 กลุ่ม และปฏิทิน 11 กลุ่ม บน Edge รวม native forms, QuickLog, Undo, filters, draft และ fallback Sidebar
- Native browser zoom 200%, targeted ESLint และ compatibility build แยก output ผ่าน; หน้า develop ไม่แสดงใน production export
- วิดีโอ `motion/local/chrome/dock-motion.webm` เป็นการบันทึก browser จริงด้วยข้อมูลตัวอย่าง ไม่ใช่ภาพจำลอง animation

## ข้อจำกัดและขั้นต่อไป

ยังต้องให้ผู้ใช้ประเมินความรู้สึกของ motion จริงบนเครื่องที่ใช้งาน Safari/iPhone/Android เครื่องจริงยังไม่ได้ UAT การจำลอง touch ไม่ถือเป็นผลบนเครื่องจริง ไม่มีการวัด FPS หรือแบตเตอรี่

ยังเป็น develop pilot และไม่ได้ทำให้ทุกเมนู production พร้อมใช้งาน ดูรายการใน [Coverage](../ui-coverage-history/COVERAGE.md) ไม่ได้เปิด Firebase, เปลี่ยนข้อมูลจริง, ติดตั้ง package, push หรือ deploy

เปิด [Develop preview](https://northwest-revised-domains-varies.trycloudflare.com/dev/calendar) เพื่อเลื่อนเมาส์ผ่าน Dock และกด “หน้าและเครื่องมือ” ลิงก์ทำงานขณะเครื่อง develop และ tunnel เปิดอยู่ หลังผู้ใช้ตรวจ motion pass จึงพิจารณาเฟสนำเข้าตารางสอบ DL จากภาพต่อ
