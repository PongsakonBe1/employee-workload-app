# ปฏิทินและ Controls — Apple HIG + MockFlow reference

6 พฤศจิกายน 2569 · branch `codex/calendar-liquid-glass-review` · ฐาน `6a7e96e`

ผู้ใช้ให้ทำต่อและยืนยันว่ารอบนี้เน้น **ตาราง/ปฏิทินและ controls ที่ยังไม่ตรงแบบ** ใช้ UX จาก Review 09/10 เป็นฐาน ไม่ออกแบบเส้นทางงานใหม่ทั้งระบบ เปิดตรวจใน Next development ที่ `/dev/calendar` และเชื่อมกับ `/dev/record`

## Reference และการตัดสินใจ

อ่าน [MockFlow macOS 27 Golden Gate](https://mockflow.com/uikits/wireframe/macos-27-golden-gate) และเปิดภาพ preview ใน browser จริง ชุดนี้เป็น wireframe kit สำหรับ MockFlow ไม่ใช่ React component library ของ Apple ใช้เป็น reference ของกลุ่มปุ่มทรงแคปซูล ขอบแสงบาง ช่องค้นหา mini calendar และ sidebar โดยเขียน CSS/components ของโครงการเอง ไม่ import kit, ฟอนต์ หรือภาพไอคอนจาก preview ลง runtime และไม่มี dependency เพิ่ม

HIG เป็นหลักเมื่อรายละเอียดใน kit ไม่เหมาะกับงานข้อมูลหรือการเข้าถึง:

| เอกสาร Apple | การประยุกต์ในเฟสนี้ |
|---|---|
| [Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars) | แยกเปลี่ยนช่วงวันที่/เปลี่ยนมุมมอง/คำสั่งเพิ่มเติม ให้คำสั่งรองอยู่ใน More ลดความแออัดบนมือถือ |
| [Menus](https://developer.apple.com/design/human-interface-guidelines/menus) | เมนูยึดตำแหน่งกับปุ่ม มีชื่อชัดและ ellipsis สำหรับขั้นตอนต่อไป รองรับ Arrow/Home/End/Escape และสถานะ disabled |
| [Pickers](https://developer.apple.com/design/human-interface-guidelines/pickers) | เดือน/วันที่เข้าถึงได้ในบริบทเดิม ใช้ date/time input จริงและปฏิทินย่อพร้อม keyboard ไม่ย้ายไปหน้าใหม่เพื่อเลือกค่า |
| [Sidebars](https://developer.apple.com/design/human-interface-guidelines/sidebars) | PC ย่อเมนูหลักเพื่อเพิ่มพื้นที่ตาราง มี mini calendar และตัวกรองพับได้ มือถือย้ายตัวกรองเข้าหน้าต่างเฉพาะ |
| [Materials](https://developer.apple.com/design/human-interface-guidelines/materials) | QuickLiquid กับ toolbar, กลุ่ม controls, คำสั่ง, functional sidebar และ More; เนื้อหาตาราง/การ์ดกิจกรรมใช้ผิวอ่านชัด ไม่ทำกระจกทุกช่อง |
| [Layout](https://developer.apple.com/design/human-interface-guidelines/layout) | คงโครงที่รับไว้ จัดแนวเดือน/ช่วงวันที่/มุมมอง บนมือถือไม่มีหัววันที่ซ้ำกับแถบเลือกวัน และไม่ทำ vertical scroller ซ้อนในตารางรายวัน |
| [Color](https://developer.apple.com/design/human-interface-guidelines/color) | ตารางเรียนม่วง DL เขียว สอบรายวิชาสีอำพัน วันหยุดแดง วันสำคัญ neutral; ทุกอย่างปรับตาม Light/Dark และมีข้อความกำกับ |
| [Motion](https://developer.apple.com/design/human-interface-guidelines/motion) | menu/press feedback สั้น ใช้ motion preferences ส่วนกลาง ไม่เพิ่ม animation วนหรือบังคับ scroll เมื่อเปิดหน้า |
| [Entering data](https://developer.apple.com/design/human-interface-guidelines/entering-data) / [Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons) | แบ่ง form เป็นกิจกรรม/เวลา/ห้องและผู้รับผิดชอบ แจ้ง error พร้อม focus ปุ่มหลักชัด การลบมีขั้นยืนยันและ Undo |
| [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) | native buttons/checkboxes, focus, ขนาดแตะวัน 44px ใน touch views, inputs อย่างน้อย 16px บน touch, native zoom 200%, Forced Colors และ Reduce Motion/Transparency |

แนวทางนี้เป็นเว็บที่ประยุกต์ HIG ไม่ใช่ native SwiftUI/AppKit และไม่ได้อ้างว่ารองรับพฤติกรรมของ Apple ทุกข้อหรือได้รับการรับรอง HIG/WCAG

## สิ่งที่ทำ

- วัน/สัปดาห์/เดือน/รายการใช้ข้อมูลและตัวกรองชุดเดียว PC เริ่มสัปดาห์ มือถือเริ่มวัน การเลือกวันในเดือนยังคงโหมดเดือนและแสดงรายละเอียดด้านล่าง
- PC มี rail ส่วนกลางที่ย่ออัตโนมัติ ปฏิทินย่อและตัวกรองด้านข้างซ่อน/แสดงได้; มือถือมีแถบเลือกวัน More ที่ไม่ถูกซ่อน และ filters dialog ที่ยกเลิกร่างได้
- ปฏิทินย่อใช้ Arrow/ขึ้นลง/Home/End/PageUp/PageDown ได้ มี roving tab stop ไม่ต้อง Tab ผ่านทุกวัน
- timeline แยก lane เมื่อเวลาซ้อน แสดง 08:00–20:00 หรือขยายตามข้อมูล กิจกรรมที่แคบตัดชื่อเพื่อรักษาข้อความเวลา/ห้อง และอ่านรายละเอียดเต็มได้จากปุ่ม/accessible name
- Dark Mode ใช้พื้นม่วงเข้มของ token เดิม ไม่ใช้ม่วงขาวของ Light; filter, mode selection, More และปุ่มคำสั่งใช้ภาษาภาพเดียวกัน
- วันหยุดใช้ subset 2569–2570 จาก snapshot Google ประเทศไทยที่ review ก่อนหน้า เก็บ source/fetchedAt ไว้ แยก public holiday กับ observance ปิด/เปิดได้ ปีนอก coverage แสดงว่าไม่มีชุดข้อมูล ไม่ตีความว่าไม่มีวันหยุด
- วันหยุดเป็นข้อมูลประกอบ ไม่ห้ามเพิ่มตาราง และไม่แปลงเป็นการปิดห้องของระบบ
- เพิ่ม/แก้/ลบตารางตัวอย่าง และ Undo ที่คงอยู่จนมีธุรกรรมถัดไป ตารางรายสัปดาห์ประกาศผลกระทบต่อทั้งชุดชัดเจน ไม่ลบทุกครั้งโดยไม่ยืนยัน
- DL รองรับรอบเย็น 17:00–18:30 จำนวน 75 เป็นคนต่อรอบ และเพิ่ม 407 ต่อจาก 406 เมื่อมากกว่า 40 ตามแบบเดิม ผู้คุมสอบเป็น fixture ที่ผู้ตรวจเลือกเอง
- ตรวจข้อมูลวัน เวลา ห้อง ผู้คุม และห้องชน ก่อนแก้ข้อมูลตัวอย่าง การคัดลอกสอบเป็นทั้งชุดหรือไม่เพิ่มเลย ไม่ทำสำเร็จบางรายการโดยไม่แจ้ง
- คัดลอกเฉพาะรายการสอบที่ตรงตัวกรองในสัปดาห์ ไม่คัดลอกตารางเรียนที่เกิดซ้ำอยู่แล้ว
- มีหน้าตรวจแบบการนำเข้าและชุดตัวอย่างให้ทบทวนชัดเจน **ยังไม่มีตัวอ่าน PDF/ภาพ/OCR และไม่แสดง file picker ที่แสร้งว่าอ่านไฟล์ได้**
- Staff ใน fixture อ่านรายละเอียดได้ แต่ไม่มีสิทธิ์เพิ่ม/แก้/คัดลอก/นำเข้า; ไม่ใช้ role fixture สร้าง Auth/session หรือสิทธิ์ backend
- `/dev/record` และ `/dev/calendar` เชื่อมด้วย navigation จริง รักษาร่าง/โหมด/ข้อมูลตัวอย่างที่เกี่ยวข้องในหน่วยความจำของ tab ไม่เขียนลง localStorage/sessionStorage และเริ่มใหม่เมื่อ refresh
- Ctrl+K ของส่วนกลางไม่เปิด modal ซ้อนบนฟอร์มที่เปิดอยู่ ส่วนการค้นหาหน้าตามเดิมยังใช้ได้เมื่อไม่มี dialog

## ขอบเขตข้อมูลและข้อจำกัด

รูปแบบ calendar ใหม่อยู่ใน development route เท่านั้น ไม่แทนที่ `RoomUsageCalendar` หรือ query ของ production และยังไม่เชื่อมการนำเข้า/ธุรกรรม/แหล่งข้อมูลจริง ฝั่ง preview ไม่เรียก Firestore/API และการตรวจ browser บล็อก origin ภายนอกทั้งหมด ไม่ใช่หลักฐานว่าลด cloud reads ใน production แล้ว

fixture classroom, exam, ผู้สอน/ผู้คุม/เจ้าหน้าที่เป็นข้อมูลสังเคราะห์ ข้อมูลวันหยุดเป็น snapshot สาธารณะตาม metadata ไม่ใช่การ sync Google Calendar สด และไม่ใช่การยืนยันวันหยุดพิเศษของมหาวิทยาลัย

ร่างใน preview คงอยู่ระหว่างสองหน้าใน tab เดียว แต่ตารางตัวอย่างกับ agenda ของหน้าบันทึกงานยังไม่ใช่ shared business data source; ต้องเชื่อมผ่าน data adapter/บริการในเฟสธุรกรรมจริงหลังตรวจ UI

Safari/iOS ใช้ CSS optics fallback ตาม policy ส่วนกลาง ยังต้อง UAT บน Safari/iPhone และ Android จริง ไม่อ้างความเหมือนภาพ/การหักเห/FPS/battery เท่ากันทุก browser

## การตรวจ

ผลจริงอยู่ที่ `output/playwright/calendar-liquid-glass/` และ `validation-summary.json`:

- `calendarView.test.js`: date-only, Bangkok today, leap/month boundaries, bounded ranges, recurring occurrences/semester, room/type filters, overlap lanes, half-open conflicts/holidays และ validation
- `verify-calendar-glass.cjs`: hierarchy/views, More/mini calendar keyboard, filters/cancel, holidays/observances, DL evening/room conflicts/edit/delete/Undo, recurrence, copy/import review, Dark/solid/forced colors/A-B, Staff controls, cross-page draft และ touch widths 375/390/430/768
- `verify-record-glass.cjs` และ `verify-ui-foundation.cjs`: regression หน้าบันทึกงานและส่วนกลาง
- targeted ESLint, `check-ui-build.mjs` (รวม development route ใหม่) และ native zoom 200% ด้วย `verify-ui-zoom.cjs ... /dev/calendar`
- Full Vitest เทียบ failures กับ baseline เดิม แยกจากข้อผิดพลาดใหม่ ไม่แก้สูตร Analytics/validation ในเฟส UI

ผลสุดท้าย: calendar **11 กลุ่มผ่านทั้ง localhost และ Cloudflare**, regression หน้าบันทึกงาน **11 กลุ่มผ่าน**, ส่วนกลาง **11 กลุ่มผ่าน**, unit ใหม่ **9/9 ผ่าน**, targeted ESLint / build compatibility / native zoom 200% ผ่าน Full Vitest **240 ผ่าน / 8 ไม่ผ่าน จาก 248** โดยชื่อ failures ทั้ง 8 ตรง baseline เดิม ยืนยันไฟล์ analytics/validation และหน้า calendar production ไม่เปลี่ยนใน `validation-summary.json`

ตรวจ runtime หลังรีสตาร์ตแล้ว: URL Cloudflare เดิมตอบ HTTP 200, optical sidebar พร้อม และหน้าข้อมูลเวอร์ชันแสดง branch `codex/calendar-liquid-glass-review` ไม่ได้เปลี่ยน tunnel/hostname ผลอยู่ใน `public/runtime-smoke.json`

ตัวเก็บภาพรอเฉพาะ transient menu/dialog animations แบบมีขอบเขต ไม่รอ animations ของ framework/dev tools ที่อาจถูก pause ไม่ได้ใช้ภาพนิ่งเป็นหลักฐาน FPS หรือแทนการทดสอบ motion บนอุปกรณ์จริง

ยังไม่ push/merge/deploy ไม่เพิ่มแพ็กเกจ ไม่เปลี่ยน Firebase/Auth/rules/backend และ Profile Radar Top 8 `minorTask` ตาม AGENTS.md คงเดิม รอ Tech Lead ตรวจปฏิทินและ controls ก่อนขยายหน้าถัดไป
