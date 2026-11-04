# วัสดุและการเคลื่อนไหว — Review 06

## หลักการ

การเคลื่อนไหวสื่อว่าคำสั่งมาจากไหน กำลังเปลี่ยนอะไร และจบตรงไหน ไม่เลื่อนทุกการ์ดหรือหน่วงการบันทึกเพื่อโชว์เอฟเฟกต์ ใช้ Glass กับชั้นควบคุมเหนือเนื้อหา และรักษาพื้นฟอร์ม/ตาราง/กราฟให้อ่านง่ายตาม [Apple HIG Materials](https://developer.apple.com/design/human-interface-guidelines/materials) และ [Motion](https://developer.apple.com/design/human-interface-guidelines/motion)

ค่าด้านล่างเป็นการเลือกสำหรับต้นแบบ ไม่ใช่ค่าที่ Apple บังคับ

| Interaction | จังหวะ | พฤติกรรม |
|---|---|---|
| Press | 115 ms | แสงตอบสนองตรงจุดกดและ flex เบา ๆ ไม่ขยับ layout |
| Segmented / tab selection | 310 ms | lens เคลื่อนจากตำแหน่งเดิมไปตัวเลือกใหม่ ต่อเนื่องแม้กดแทรก |
| เปลี่ยนหน้า | 210–260 ms | title และพื้นที่หลักเผยขึ้น 5–7 px ไม่ animate ทุกแถว |
| Menu | 240 ms | ขยายจากตำแหน่งปุ่มบน Desktop, รักษา toolbar context |
| Dialog | 300 ms | ขยายเบา ๆ ตาม origin ของคำสั่ง มี focus ภายใน |
| Mobile bottom sheet | 350 ms | เผยขึ้น 34 px และเข้าที่เหนือ safe inset |
| เปลี่ยนขั้นใน dialog | 170 ms | crossfade/เลื่อน 3 px ภายในหน้าต่างเดิม ไม่ปิด–เปิด modal ซ้ำ |
| ปิด dialog / menu | 160 ms | ปิด modality ทันทีแล้วใช้ visual clone ที่ inert และไม่รับ pointer จบ animation |
| Toast | 270 ms | ยกขึ้น 10 px และเผยสถานะ ไม่แย่ง focus |

ใช้ Web Animations API กับ transform/opacity เป็นหลัก ไม่มี animation library เพิ่ม ใช้ geometry ขององค์ประกอบจริงสำหรับ selection lens ไม่กำหนดระยะทางตาม index แบบตายตัว

## Interruption และ focus

- คำสั่งเปลี่ยน state ทันที ไม่รอ animation ก่อนบันทึกหรือเปลี่ยนหน้า
- เปิดหน้าต่างใหม่ระหว่าง closing transition ได้ โดยลบ visual clone เดิม ไม่เกิดชั้นรับ input ค้าง
- Closing clone ลบ ID/name/action และเป็น inert/aria-hidden จึงไม่เพิ่ม control ซ้ำให้ keyboard หรือ screen reader
- Escape และปุ่มปิดคืน focus ให้ตัวเปิดเดิม แม้ form ผ่านหลายขั้นหรือหน้า re-render แล้ว
- Import queue รักษา focus ในคิว ไม่กระโดดไปปุ่มที่ชี้ข้อมูลเดียวกันในภาพต้นฉบับ
- การเปลี่ยน filter ไม่ replay route entrance และไม่ทิ้ง draft ของ form

## Reduced Motion และพื้นทึบ

App preference และ `prefers-reduced-motion` ของ OS มีผลร่วมกัน หากอย่างใดเปิดอยู่ จะไม่ใช้ scaling/translation/selection travel และยกเลิก animation ที่กำลังเล่น โดยไม่ปิดฟอร์มหรือเปลี่ยนข้อมูล

Solid Material ปิด backdrop/optical filters ควบคุมยังทำงานเหมือนเดิม รองรับ `prefers-reduced-transparency` และ increased contrast เท่าที่ browser รองรับ

## วัสดุ

- พื้นฟ้า–เขียวอ่อนใน Light และ navy–teal เบา ๆ ใน Dark ให้บริบทแสงของ workspace
- ใช้ signed-distance field สร้าง rounded rim displacement เฉพาะขอบ controls ไม่บิดข้อความบนปุ่ม
- แผนที่เลนส์ cache ตามขนาดและรัศมี มีการเก็บกวาด geometry ที่ไม่ใช้งาน ไม่สร้าง canvas ทุก pointer frame
- Live SVG backdrop ใช้กับ Chromium; browser อื่นใช้ frosted material และ rim เป็น fallback การทดสอบจริงบน Safari/iOS ยังไม่ผ่าน UAT
- ไม่มีการ clone เนื้อหา production ไปแสดง refraction และไม่มี sensor/permission prompt
- ข้อความอยู่บนชั้นคม ไม่ animate blur/filter ของพื้นที่เนื้อหาขนาดใหญ่ ไม่ใช้ wallpaper เคลื่อนวน

แนวทาง lensing, feedback และ scroll-edge separation อ้างอิง [Meet Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/219/) ส่วนภาพเป้าหมายของ toolbar/sidebar และ contrast อ้างอิง [macOS 27](https://www.apple.com/os/macos/) โค้ดต้นแบบไม่อ้างความเหมือน native แบบ 1:1
