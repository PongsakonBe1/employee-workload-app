# Dock แบบตามเมาส์และ Launchpad — Develop

9 พฤศจิกายน 2569 · branch `codex/dock-navigation-pilot` · ต่อจาก `ac26325`

## พฤติกรรมที่ส่งตรวจ

Dock ขยายและเลื่อนไอคอนข้างเคียงตามตำแหน่งเมาส์ล่าสุดใน requestAnimationFrame ถัดไป แทนการรอ spring ตามตำแหน่ง ใช้ spring แบบคืนตัวเร็วเมื่อออกจาก Dock และหยุดงานเมื่อเข้าที่ ลด motion, touch และหน้าต่างเตี้ยยังใช้ข้อจำกัดเดิม

สาเหตุของอาการหน่วงเดิม: `SpringVector.setTarget()` เริ่มเวลาใหม่ เมื่อเรียกทุก pointer event ก่อนเฟรมใหม่ spring อาจยังอยู่ที่เวลาเริ่มต้นตลอดการเคลื่อนเมาส์ การตรวจเฟสก่อนยืนยันค่าตอนเมาส์หยุด จึงไม่ครอบคลุมกรณีนี้ รอบนี้เพิ่ม regression ระหว่างส่งตำแหน่งต่อเนื่อง ไม่ใช้เพียง endpoint screenshot

“หน้าและเครื่องมือ” แสดงเป็น launcher เต็ม viewport ของเว็บ โดยใช้ native dialog เพื่อรักษา modality, Escape และ focus ไม่เปิด browser Fullscreen API และไม่เปลี่ยนเส้นทางของฟีเจอร์

- PC กริด 6 คอลัมน์บนจอกว้าง / 4 คอลัมน์บนพื้นที่แคบ ไอคอน 80/72px พร้อมชื่อใต้ไอคอน
- มือถือ 3 คอลัมน์ ไอคอน 56px ช่องค้นหา 16px และหมวดแบบ native select เพื่อไม่ตัดแถบหมวดด้านข้าง
- คงชุดสีไอคอนเดิม พื้นหลังใช้ material โปร่งเบลอและ wallpaper เดิม ส่วนช่องค้นหา/ปุ่ม/หมวดใช้ glass controls
- ค้นหา กรองหมวด แสดงผลลัพธ์ว่าง เปิดด้วย Enter ใช้ลูกศร/Home/End เลือกไอคอน และ Tab วนภายใน launcher
- ปิดด้วย Esc, ปุ่มปิด หรือคลิกพื้นที่ว่าง คืน focus ไปยังต้นทาง คืน scroll style เดิม และรักษา draft
- ใช้รายการเมนูจากสิทธิ์เดิม: fixture Staff 8 ปลายทาง / Admin 18 ปลายทาง ไม่เพิ่มสิทธิ์หรือทำให้เมนูที่ยังไม่ migrate พร้อมใช้งาน
- เลือก Sidebar แบบเดิมได้ใน Appearance; production ยังคง navigation แบบเดิม

## อ้างอิงและการประยุกต์

อ่าน [Apple Motion](https://developer.apple.com/design/human-interface-guidelines/motion), [Materials](https://developer.apple.com/design/human-interface-guidelines/materials), [Layout](https://developer.apple.com/design/human-interface-guidelines/layout), [App icons](https://developer.apple.com/design/human-interface-guidelines/app-icons) และ [View and open apps on Mac](https://support.apple.com/guide/mac-help/open-apps-in-spotlight-mh35840/mac)

นำหลัก motion ที่สั้นและตามการกระทำ, กริดค้นหาแอป, การแยก controls จาก content และ layout ที่ปรับตามพื้นที่มาประยุกต์ ขนาดกริด/ไอคอนและค่า spring เป็นการออกแบบสำหรับเว็บนี้ ไม่ใช่ค่าภายในของ macOS หรือการรับรองจาก Apple ชุดไอคอนยังเป็น SVG ของโครงการ

## การตรวจและขอบเขตหลักฐาน

ผลอยู่ใน `output/playwright/dock-launchpad/`

- Unit suite 368 ผ่าน
- Motion: Chrome local และ Edge ผ่าน Cloudflare อย่างละ 6 กลุ่ม รวม stream 30 เฟรมที่ส่งหลายตำแหน่งต่อเฟรมและตรวจว่าไอคอนล่าสุดขยายในเฟรมถัดไป, คืนตัว, ไม่ทับกัน, ไม่ reflow, หน้าต่างเตี้ย และ reduced motion
- Launcher: Chrome local และ Edge ผ่าน Cloudflare อย่างละ 8 flows (1440/1024/390/320px × light/dark) รวม search/categories, role filtering, keyboard/focus, draft, reduced motion และ solid material
- Dock navigation: Edge local 36 render/layout checks จาก 9 previews × PC/mobile × light/dark รวม draft และ Sidebar toggle
- Regression บันทึกงาน 11 กลุ่ม และปฏิทิน 11 กลุ่มบน Edge รวม fallback Sidebar
- Targeted ESLint, native zoom 200% และ compatibility build แยก output ผ่าน หน้า develop ไม่แสดงใน production export

การตรวจ next-frame เป็นการตรวจ browser state หลังรับ pointer event ไม่ใช่การวัด end-to-end input latency, FPS หรือประสิทธิภาพบนทุกเครื่อง Safari/iPhone/Android เครื่องจริงยังต้อง UAT โดยทีม

## เปิดตรวจและขั้นต่อไป

เปิด [Develop preview](https://northwest-revised-domains-varies.trycloudflare.com/dev/calendar) แล้วลากเมาส์ผ่าน Dock ต่อเนื่อง จากนั้นเปิด “หน้าและเครื่องมือ” บนมือถือเปิดผ่านปุ่มค้นหาด้านบน ลิงก์ทำงานขณะเครื่อง develop และ tunnel เปิดอยู่

วิดีโอจริงอยู่ใน `motion/public/edge/dock-motion.webm` และภาพ launcher อยู่ใน `launcher/public/edge/` ใช้ข้อมูลสังเคราะห์ ไม่ได้เปิด Firebase, ติดตั้ง package, push หรือ deploy

ส่งให้ผู้ใช้ตรวจความรู้สึกและความเร็วของ Dock/launcher ก่อนเริ่มเฟสนำเข้าตารางสอบ DL จากภาพต่อ

## เพิ่มเติม: Hover โลโก้ labboy บน Dock

รวมโลโก้ labboy ด้านบนเข้าใน motion driver เดียวกับเมนู รองรับ hover และ keyboard focus โดยใช้ขนาดภาพจริง 30px แยกจาก tile เมนู 46/41px เพื่อรักษาระยะห่างระหว่างไอคอน ขยายสูงสุด 1.48 เท่าและคืนตัวพร้อมเพื่อนบ้าน การคลิกยังเปิดหน้าบันทึกงานเดิม และ reduced motion/หน้าต่างเตี้ยยังปิด magnification ตามเดิม

หลักฐานอยู่ใน `output/playwright/dock-brand-hover/`: unit 370 ผ่าน รวม geometry ของไอคอนต่างขนาด และ motion checks อย่างละ 7 กลุ่มบน Chrome local / Edge ผ่าน Cloudflare รวม hover, Home/focus, คืนขนาด 30px, ไม่ชนเมนู, navigation และ reduced motion ผ่าน targeted ESLint ด้วย รอบย่อยนี้ไม่ได้รัน compatibility build ใหม่ Safari/iPhone เครื่องจริงยังต้อง UAT ตามข้อจำกัดเดิม
