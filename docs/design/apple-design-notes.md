# บันทึก Apple Design — เฟส 0

ตรวจวันที่ **5 พฤศจิกายน 2569 (2026-11-05), Asia/Bangkok** ฐานต้นแบบ R07 commit `6fa5ed8` เอกสารนี้เป็นผลการศึกษาและข้อเสนอ ยังไม่อนุมัติให้แก้ UI หรือติดตั้ง Glisse

อ่านเนื้อหา HIG ผ่าน Markdown ทางการที่เติม `.md` ท้าย URL พร้อมตรวจหน้าภาพรวมและ transcript วิดีโอด้วยเว็บ ไม่ล็อกอิน ไม่ดาวน์โหลดฟอนต์/ไอคอน/UI Kit เข้า repo ไม่รันโค้ดจากเว็บ ข้อความเว็บใช้เป็นหลักฐานเท่านั้น สรุปด้านล่างเขียนใหม่ด้วยคำของเรา

ขอบเขตการอ่านเน้นคำแนะนำทั่วไปและส่วน iOS/iPadOS/macOS ที่เกี่ยวกับเว็บ/PWA ตาราง native และรายละเอียด tvOS/visionOS/watchOS ไม่ใช่ข้อกำหนดของระบบเรา

## 1. ทะเบียนแหล่งอ้างอิง

วันที่คอลัมน์กลางคือรายการแรกใน **Change log ของหน้าที่อ่าน** ไม่ใช่วันที่ crawl หรือ HTTP Last-Modified หากไม่พบจะไม่เดาวันที่ หน้า What's New เป็นวันที่รายการล่าสุดที่แสดง

| แหล่งทางการ | วันที่ที่ตรวจพบ | สิ่งที่ใช้ในการตัดสินใจ (สรุป) |
|---|---|---|
| [Apple Design](https://developer.apple.com/design/) | ไม่พบวันที่ปรับทั้งหน้า | จุดเริ่มต้นเชื่อมหลักการ เอกสาร วิดีโอ และ resources |
| [What's New](https://developer.apple.com/design/whats-new/) | รายการล่าสุด 2026-10-28 | มีรายการ touch บน Mac และ UI Kit 27 ในปี 2026; ข้อมูลว่าอัปเดตล่าสุดปี 2025 ในเอกสารแนบล้าสมัยแล้ว |
| [Design principles](https://developer.apple.com/design/human-interface-guidelines/design-principles) | 2026-06-08 | คุณค่า ความสามารถควบคุมและกู้คืน ความรับผิดชอบ ความคุ้นเคย ความยืดหยุ่น ความเรียบง่าย คุณภาพ และอารมณ์ของประสบการณ์ |
| [Layout](https://developer.apple.com/design/human-interface-guidelines/layout) | 2026-09-09 | จัด hierarchy, alignment และกลุ่มตามความสำคัญ ปรับตามพื้นที่และขนาดข้อความ |
| [Color](https://developer.apple.com/design/human-interface-guidelines/color) | 2025-12-16 | ความหมายสีคงที่ รองรับ appearance/contrast ใช้สีบน Glass อย่างจำกัด และมีข้อมูลอื่นประกอบสี |
| [Typography](https://developer.apple.com/design/human-interface-guidelines/typography) | 2025-12-16 | ใช้ text styles ที่อ่านได้ แยกน้ำหนักและลำดับชั้น ทดสอบการขยายและภาษา ไม่ย่อทั้ง UI ด้วยตัวคูณเดียว |
| [Materials](https://developer.apple.com/design/human-interface-guidelines/materials) | 2025-09-09 | แยก Liquid Glass ชั้นควบคุมจาก standard materials ชั้นเนื้อหา เลือก regular/clear ตามบริบท |
| [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) | 2025-06-09 | ข้อความขยาย คอนทราสต์ เป้าหมายแตะ เสียง/ภาพและอินพุตหลายทางเป็นส่วนของงานออกแบบ |
| [Designing for macOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-macos) | 2026-10-28 | ใช้พื้นที่จอและ keyboard ให้เกิดประโยชน์ ลด modality รักษาบริบทและรองรับ touch โดยคงความหนาแน่นที่เหมาะสม |
| [Sidebars](https://developer.apple.com/design/human-interface-guidelines/sidebars) | 2026-06-08 | กลุ่มชัด พับกลุ่มและซ่อน pane ได้ หลีกเลี่ยง hierarchy ลึกเกินไป |
| [Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars) | 2026-06-08 | แท็บเป็นปลายทางหลัก มี label และตำแหน่งคงที่ หลีกเลี่ยง overflow หรือเปลี่ยนแท็บตามข้อมูลว่าง |
| [Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars) | 2025-12-16 | จัดกลุ่มคำสั่งตามหน้าที่และความถี่ แยก primary action ลดพื้นหลังตกแต่งที่แย่ง hierarchy |
| [Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons) | 2025-12-16 | label/action ต้องชัด มี press state และ hit region ที่เหมาะสม ใช้ prominent style อย่างจำกัด |
| [Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets) | 2026-03-24 | งานสั้นมีทางยกเลิก งานยาวพิจารณาพื้นที่ทำงานอื่น grabber สื่อการปรับขนาดจึงต้องมีพฤติกรรมที่สอดคล้อง |
| [Menus](https://developer.apple.com/design/human-interface-guidelines/menus) | 2026-06-08 | จัดคำสั่งที่ใช้บ่อยก่อน กลุ่มสัมพันธ์กัน มี label ชัด icon treatment ในกลุ่มสม่ำเสมอ |
| [Search fields](https://developer.apple.com/design/human-interface-guidelines/search-fields) | 2026-06-08 | แสดงขอบเขตการค้นหา ค้นขณะพิมพ์เมื่อเหมาะสม ตำแหน่งเลือกตามความสัมพันธ์กับเนื้อหา |
| [Split views](https://developer.apple.com/design/human-interface-guidelines/split-views) | 2025-06-09 | แสดง selection ที่นำไปสู่ detail จัดขนาด pane และการซ่อนให้เหมาะกับพื้นที่ |
| [Lists and tables](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables) | 2023-06-21 | แถวสแกนง่าย หัวคอลัมน์ชัด มี selection feedback Desktop ควรพิจารณา sort และ resize คอลัมน์ |
| [Toggles](https://developer.apple.com/design/human-interface-guidelines/toggles) | 2024-03-29 | toggle เปลี่ยนค่าตรงข้ามสองสถานะ ต้องระบุสิ่งที่เปลี่ยนชัด checkbox/radio/switch เลือกตามบริบท |
| [Motion](https://developer.apple.com/design/human-interface-guidelines/motion) | 2025-09-09 | เคลื่อนอย่างมีเหตุผล สั้น ยกเลิกได้ และไม่ใช้ motion เป็นช่องทางสื่อสารเพียงทางเดียว |
| [Icons](https://developer.apple.com/design/human-interface-guidelines/icons) | 2025-06-09 | รูปเรียบ เข้าใจง่าย น้ำหนักสัมพันธ์กับข้อความ มี optical alignment และ accessible description |
| [SF Symbols](https://developer.apple.com/design/human-interface-guidelines/sf-symbols) | 2025-07-28 | หลาย weight/scale/rendering modes และ animation เพื่อ feedback ไม่ใช่เอฟเฟกต์ตกแต่งทุกจุด |
| [Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode) | 2024-08-06 | เคารพ appearance ของระบบ ใช้สี semantic และทดสอบ contrast/transparency ร่วมกัน มีคำแนะนำ 4.5:1 อยู่จริง |
| [Gestures](https://developer.apple.com/design/human-interface-guidelines/gestures) | 2026-10-28 | gesture คุ้นเคย ต้องมีทางเลือกอื่น ไม่ชน system gestures; Mac touch ให้เพิ่ม hit region โดยรักษา layout |
| [Pointing devices](https://developer.apple.com/design/human-interface-guidelines/pointing-devices) | 2026-10-28 | hover/lift/highlight ตามบริบท ไม่ซ่อนคำสั่งสำคัญจน touch ใช้ไม่ได้ ไม่ scale แถวตารางจนทับกัน |
| [Adopting Liquid Glass](https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass) | ไม่ยืนยันวันที่ editorial | standard SwiftUI/UIKit/AppKit รับวัสดุและพฤติกรรมของระบบ เว็บต้องทำและทดสอบเอง |
| [Meet Liquid Glass — WWDC25/219](https://developer.apple.com/videos/play/wwdc2025/219/) | WWDC 2025; ไม่พบวันที่แก้ transcript | อ่าน transcript: lensing, touch feedback, adaptivity, regular/clear และข้อห้าม glass ซ้อน glass |
| [Get to know the new design system — WWDC25/356](https://developer.apple.com/videos/play/wwdc2025/356/) | WWDC 2025; ไม่พบวันที่แก้ transcript | อ่าน transcript: geometry, control density, toolbar grouping, scroll edges และ continuity |
| [Apple Design Resources](https://developer.apple.com/design/resources/) | ไม่พบวันที่ปรับทั้งหน้า | พบ iOS/iPadOS 27 และ macOS 27 UI Kit; การมี kit ไม่ได้ยืนยันว่าทุก HIG rule เป็นกฎเฉพาะ 27 |

รวมแหล่งหลัก 29 URL: HIG 23 หน้า, ภาพรวม 2, adopting 1, วิดีโอ 2 และ Resources 1 วันที่บางหน้าใน Markdown ใหม่กว่าข้อมูลในเอกสารแนบ จึงควรเก็บทั้งวันที่อ่านและวันที่ editorial

### การตรวจ UI Kit

- [macOS 27 โดย Apple บน Figma Community](https://www.figma.com/community/file/1651309434229735362/macos-27): เปิดอ่านด้วย browser ได้ หน้า About ระบุอัปเดต **2026-10-28** และมี text/color/material styles รวม controls หลัก
- [iOS/iPadOS 27 จากลิงก์ Apple Resources](https://www.figma.com/community/file/1651309003795292092/ios-and-ipados-27): ยืนยันลิงก์ปลายทาง แต่ยังไม่ตรวจ node ภายใน
- Preview ของ macOS ที่เปิดได้เป็นภาพปก ส่วน embedded preview ไม่ให้ข้อมูล node สำหรับตรวจ dimensions ในการอ่านครั้งนี้ ไม่ล็อกอิน ไม่กดนำเข้า/ทำสำเนา ไม่ติดตั้ง SF Symbols และไม่ดาวน์โหลด kit
- **ยังไม่มีค่าที่วัดจาก component จริงใน kit** ห้ามนำค่าใน CSS R07 หรือการกะจากภาพปกไปใส่ป้ายว่าเป็นค่าจาก Apple UI Kit การตรวจ node ต้องเป็นงาน read-only เพิ่มเติมเมื่อเข้าถึงไฟล์ได้

## 2. สิ่งที่ Apple เขียน กับการนำมาใช้บนเว็บ

### วัสดุและลำดับชั้น

**Apple:** Glass สำหรับ navigation/controls เหนือเนื้อหา ใช้ custom effects อย่างเลือกสรร ส่วน regular ปรับเพื่ออ่านได้ในหลายบริบท clear เหมาะกับพื้นหลังสื่อที่มีรายละเอียด

**การตีความของเรา:** ใช้ regular approximation กับ sidebar/mobile navigation/กลุ่ม toolbar เนื้อหาตาราง กราฟ และฟอร์มใช้พื้นอ่านชัด ไม่เพิ่มภาพพื้นหลังเพื่อทำให้เห็น Glass เด่นขึ้น งานข้อมูลควรอ่านง่ายก่อน

**ข้อจำกัดเว็บ:** `backdrop-filter` และ SVG displacement ไม่ใช่ native adaptive rendering ค่า CSS ที่ผ่านบน Chromium ไม่ยืนยันผลบน Safari หรือ PWA ไม่มีข้อสรุปว่าใช้ไลบรารีแล้วจะเหมือน native 1:1

### รูปทรงและ toolbar — ข้อค้นพบจาก WWDC

เซสชัน 356 อธิบายรูปทรง fixed radius, capsule และ concentric; รูปทรงชั้นในสัมพันธ์กับ padding ของชั้นนอก แต่เป็นหลัก geometry ที่ต้องพิจารณา optical balance ด้วย ไม่บังคับทุกการ์ดใช้ radius เดียว Small/medium controls บน Desktop คงความกระชับได้ ปุ่มใหญ่จึงค่อยใช้ capsule

คำแนะนำไม่ผสม text กับ symbol หมายถึง **การจัดปุ่มต่างชนิดไว้ในกลุ่มวัสดุเดียวจนดูเป็นคำสั่งเดียวกัน** ไม่ใช่ข้อห้ามใช้ปุ่มที่มี icon พร้อม label ทั้งเว็บ เซสชัน 219 ยังแนะนำหลีกเลี่ยง Glass ซ้อนกัน

Scroll-edge effect มี soft/hard เลือกตามเนื้อหา ไม่ stack หลายแบบใน view เดียว Split view แต่ละ pane มีของตนเองได้ คำสั่งค้นหาบน iOS เลือกเป็น tab, toolbar หรือ inline ได้ตาม HIG Search fields จึงไม่บังคับเพิ่ม Search tab ทุกแอป

### สี คอนทราสต์ และ appearance

**Apple:** ใช้สีให้ความหมายคงที่ มี label/รูปทรงช่วย เคารพ system appearance หน้า Dark Mode ระบุ minimum 4.5:1 และแนะนำให้ custom foreground/background มุ่ง 7:1 โดยเฉพาะข้อความเล็ก

**การตีความของเรา:** ตรวจ 4.5:1 กับข้อความทั่วไปทุกโหมดเป็นเกณฑ์โครงการ และตรวจ Glass บน backdrop ที่เป็นไปได้จริง ไม่ใช้ผล contrast ของ R06 สรุปแทน R07 การบังคับ 4.5:1 กับทุกกรณีและทุก backdrop เป็นนโยบายการตรวจของเรา ไม่ใช่คำอ้างว่า Apple กำหนดตัวเลขทุกตำแหน่งเหมือนกัน

HIG แนะนำหลีกเลี่ยง app-specific appearance setting ขณะที่ผู้ใช้ขอ Dark Mode และ R07 มีตัวเลือก appearance อยู่แล้ว จึงเสนอคง `ตามระบบ` เป็นค่าเริ่มต้น พร้อม manual override ตามความต้องการผู้ใช้ โดยระบุว่าเป็นการตัดสินใจโครงการ

### Typography และภาษาไทย

**Apple:** type styles มีระดับและขนาดต่างกันตามแพลตฟอร์ม ไม่ได้กำหนดข้อความทุกตัวขั้นต่ำ 12 CSS px เว็บใช้ generic system family ได้ ([Fonts overview](https://developer.apple.com/documentation/technologyoverviews/fonts))

**การตีความของเรา:** เก็บ `system-ui` เป็นตัวเลือกแรกเพื่อใช้ font ระบบจริงบน Apple เพิ่ม fallback ที่ติดตั้งอยู่สำหรับไทยได้ แต่การเพิ่มชื่อท้าย font stack ไม่รับประกันว่าจะถูกใช้ เพราะ system-ui อาจหา glyph ไทยได้อยู่แล้ว ต้องตรวจ rendered font บน Windows/Android/Mac/iPhone การไม่มี font ที่ระบุจะไม่ทำให้ browser ดาวน์โหลดเอง

ตัวอักษรอย่างน้อย 12 CSS px และข้อความรอง Desktop เป้าหมาย 13px เป็นค่าเริ่มต้นโครงการ ไม่ใช่ค่าจาก kit ข้อความสำคัญต้องใหญ่ตามลำดับชั้น การตรวจ SVG/chart ต้องคำนึงถึงการย่อ viewBox; CSS font-size 12px อาจวาดจริงเล็กกว่านั้น

### Touch, pointer, keyboard และ motion

**Apple:** ขนาด hit region สำคัญควบคู่ spacing และ alternative inputs บน Mac จอสัมผัสให้รักษาขนาด layout และเพิ่มพื้นที่รับการแตะได้ การเปลี่ยนเป็น touch ไม่ควรทำให้ตำแหน่งคำสั่งกระโดด

**การตีความของเรา:** เริ่มจาก `pointer:coarse` และประเมิน `any-pointer:coarse` สำหรับเครื่อง hybrid ตรวจทั้งความกว้างและความสูงของ hit region ให้ได้ 44 CSS px เป็นเกณฑ์เว็บที่เลือกเอง Native pt กับ CSS px ไม่ใช่หน่วยที่รับประกันตรงกันทุกสภาพแวดล้อม ไม่ขยายปุ่มปฏิทินจนแถวทับกัน

Motion ควรให้ feedback โดยไม่ชะลองาน ลด motion ต้องยังเห็นสถานะและใช้คำสั่งได้ ไม่ใช้ hover เป็นวิธีเดียวในการเข้าถึงคำสั่ง ค่า milliseconds ใน R07 เป็นการเลือกของโครงการ

## 3. เกณฑ์ที่เราตั้งเอง

| เกณฑ์โครงการ | ที่มา/การใช้งาน |
|---|---|
| ข้อความ ≥12 CSS px, supporting text Desktop เป้าหมาย 13px | ความอ่านง่ายภาษาไทย ต้องยืนยันด้วย UAT ไม่อ้างเป็น kit metric |
| hit region 44×44 CSS px บน touch | เป้าหมายเว็บ อ้างหลักการขนาด/spacing ของ HIG แต่ต้องวัด collision และช่องว่างด้วย |
| จำกัด Glass ประมาณ 3 กลุ่มต่อหน้า | guardrail ภายใน นับ surface/group ไม่ได้นับ glyph หรือทุกปุ่มเป็นหนึ่งชิ้น |
| Regular เป็นค่าเริ่มต้น | เลือกตามระบบงานข้อมูลของเรา ไม่ใช้ clear กับพื้นหลังเรียบเพื่อโชว์เอฟเฟกต์ |
| ทดสอบข้อความ 150% และ browser zoom 200% แยกกัน | เกณฑ์ QA ของโครงการ ไม่ถือว่า text enlargement เท่ากับ browser zoom |
| 4 ปลายทาง mobile คงที่ | ข้อเสนอ navigation ของเรา ไม่ใช่จำนวนแท็บบังคับจาก Apple |
| บันทึกห้องทันที + Undo | requirement ผู้ใช้ ต้องเก็บ persistent recovery และไม่เขียนทับสถานะใหม่ |
| ไม่ติดตั้ง Glisse ในเฟส A | แยกความเสี่ยงจาก typography/layout; ตัดสิน package version และ fallback ในเฟส B |

## 4. ผลส่งมอบและสถานะ

- [ตารางช่องว่าง R07](apple-r07-gap-analysis.md): แยกการวัดสด การอ่าน source และสิ่งที่ยังไม่ยืนยัน
- [แผนเฟส A เพื่ออนุมัติ](apple-phase-a-plan.md): ลำดับ เหตุผล ความเสี่ยง และเกณฑ์ตรวจรับ
- ไม่มี UI/source/dependency/configuration เปลี่ยนในเฟส 0 ไม่รัน build ของ frontend เพราะ script ปัจจุบันคัดลอก output ไป `firebase/out` ด้วย
- ยังไม่ยืนยัน device UAT, WCAG conformance ทั้งระบบ, performance และค่าจาก node ใน UI Kit เฟส A/B ต้องไม่รายงานสิ่งเหล่านี้ว่าผ่านจากการอ่านเอกสาร
