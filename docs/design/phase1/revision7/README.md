# Design Review 07 — Layout, typography และ icon feedback

อัปเดตล่าสุด Review 08 ชุดสองบน branch `codex/liquid-glass-review-08`: [สี วัสดุ ไอคอน ปฏิทิน และผลตรวจ](PHASE_B.md) · [เปิดตารางใหม่](http://127.0.0.1:4197/#/classrooms) · [ภาพและคลิปครบทุกหน้า](http://127.0.0.1:4197/gallery.html)

อัปเดต Review 08 ชุดแรกบน branch `codex/liquid-glass-review-08`: [รายละเอียด การทดสอบ และรายการรอตรวจรับ](REVIEW_08_BATCH_1.md) ใช้ preview server และฐานต้นแบบในโฟลเดอร์นี้ต่อเนื่อง ชุดสี/วัสดุและ Analytics ยังไม่เริ่ม

ต้นแบบสำหรับ Tech Lead ตรวจรับ วันที่ 5 พฤศจิกายน 2569 บน branch `codex/hig-layout-icons-review-07` ฐาน R06 `fd1dd50` ยังไม่ใช่ production implementation

อัปเดตเฟส A: [ผลปรับ typography/touch และหลักฐานตรวจ](PHASE_A.md) บน branch `codex/hig-phase-a-readability` เก็บฐาน R07 เดิมใน Git และภาพ before แยกไว้ เฟส B ยังไม่เริ่ม

## เปิดตรวจ

```powershell
node docs/design/phase1/revision7/serve.cjs
```

[เปิดต้นแบบ](http://127.0.0.1:4197/#/record) · [ภาพ 30 มุมมองและคลิป](http://127.0.0.1:4197/gallery.html)

## การตัดสินใจและสิ่งที่เปลี่ยน

- คงข้อมูลสังเคราะห์และ flow จาก R06 ปรับองค์ประกอบร่วมทุกหน้า ออกแบบรายละเอียดหลักที่ Record, Worklogs และ Schedule
- Desktop ใช้ sidebar ลอยตัวที่ย่อ/ขยายได้ แยกงานประจำจากเครื่องมือรองและจัดการ งานรองยังเข้าถึงได้จาก disclosure, Search และบัญชี
- Mobile ใช้ 4 ปลายทางคงที่ งาน / ตาราง / ทรัพยากร / ภาพรวม ประวัติเปิดจากหน้างานหรือบัญชี ไม่มี More เป็น tab หลัก
- ลดกรอบการ์ดซ้อนและสีพื้นตกแต่ง เนื้อหาใช้พื้นอ่านชัด แบ่งกลุ่มด้วย spacing และ separator ใช้ Glass กับ navigation และกลุ่มคำสั่ง
- ใช้ `system-ui` บน Apple จะใช้ฟอนต์ระบบและ language fallback บน Windows/Android ใช้ฟอนต์ระบบของเครื่อง ไม่มีการแจกไฟล์ SF Pro และยังต้องตรวจภาษาไทยจริงข้ามเครื่อง
- Type scale ส่วนที่ปรับใช้ rem เพื่อรองรับการเปลี่ยนขนาดข้อความ Mobile เนื้อหาสำคัญใหญ่ขึ้น แยก label กับ supporting text ไม่ขยายทุกอย่างเท่ากันโดยไม่ดูบริบท
- เปลี่ยน core icon vectors ให้มีน้ำหนักสม่ำเสมอ เป็น SVG ที่วาดในโครงการ ไม่ใช่ SF Symbols assets ไม่อ้างว่าได้ใช้ official UI Kit components แล้ว
- เพิ่ม symbol feedback แบบ finite เมื่อเลือก navigation, hover งาน และกดแจ้งเตือน ทำงานร่วมกับ dialog/lens transitions จาก R06 และ Reduce Motion
- งานเปิด/ปิดห้อง: เลือกห้องแล้วบันทึกทันที เก็บ Undo เป็นรายการคงอยู่ในหน้าบันทึก ไม่อาศัย toast ที่หมดเวลาอย่างเดียว
- Undo ผูกกับ log ID และ version ห้อง หากมีการเปลี่ยนแปลงต่อจะไม่เขียนทับสถานะใหม่ เป็น simulation ในหน่วยความจำ ไม่ใช่ production concurrency control
- ตารางมีปุ่มวันนี้ ใช้สีแยกประเภทพร้อมข้อความ นำเข้า PDF/OCR ยังคงเป็น sample flow ตาม R06

## หลักฐานอ้างอิง → การนำมาใช้

| แหล่งทางการ | ประเด็นที่ใช้ |
|---|---|
| [HIG Layout](https://developer.apple.com/design/human-interface-guidelines/layout) | visual hierarchy, grouping, progressive disclosure, adaptive layout |
| [HIG Materials](https://developer.apple.com/design/human-interface-guidelines/materials) | Glass เป็นชั้นควบคุม เนื้อหาอ่านชัด ใช้ regular approximation |
| [HIG Color](https://developer.apple.com/design/human-interface-guidelines/color) | accent จำกัด, semantic colors, label/shape ประกอบสี |
| [HIG Typography](https://developer.apple.com/design/human-interface-guidelines/typography) / [Fonts](https://developer.apple.com/documentation/technologyoverviews/fonts) | system font, hierarchy, scalable text และ Thai fallback |
| [HIG Icons](https://developer.apple.com/design/human-interface-guidelines/icons) / [SF Symbols](https://developer.apple.com/design/human-interface-guidelines/sf-symbols) | optical consistency, familiar meaning, purposeful animation; ไม่แจก asset |
| [HIG Sidebars](https://developer.apple.com/design/human-interface-guidelines/sidebars) / [Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars) | กลุ่มเมนูพับได้, ปลายทางหลักคงที่, tab เป็น navigation |
| [HIG Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars) | คำสั่งตามบริบท แยก primary และ secondary ไม่ทำทุกคำสั่งเด่นเท่ากัน |
| [HIG Motion](https://developer.apple.com/design/human-interface-guidelines/motion) / [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) | finite feedback, interruption, reduced motion, keyboard และ touch target |
| [Get to know the new design system](https://developer.apple.com/videos/play/wwdc2025/356/) | ศึกษา transcript เรื่อง concentricity, desktop control density และ hierarchy |
| [Meet Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/219/) | ศึกษา transcript เรื่อง separation, environment, legibility และการหลีกเลี่ยง glass ซ้อน glass |
| [Applying Liquid Glass](https://developer.apple.com/documentation/swiftui/applying-liquid-glass-to-custom-views) | ศึกษา native effect container และ morphing เพื่อเข้าใจข้อจำกัดเว็บ |
| [Apple Design Resources](https://developer.apple.com/design/resources/) | พบ UI Kit macOS/iOS 27; ใช้อ้างอิงแนวทาง ยังไม่ได้ import หรือแก้ Figma ในเฟสนี้ |

การแบ่ง 4 tabs, ค่าสี/ขนาด/CSS timing และ SVG เป็นการตัดสินใจของต้นแบบ ไม่ใช่ข้อกำหนดตัวเลขของ Apple หรือ native rendering ที่เหมือน 1:1

## การตรวจและข้อจำกัด

ตรวจผ่านด้วย Playwright/Edge runtime ที่มีอยู่: render 30 routes × Desktop/Mobile × Light/Dark รวม 120 ภาพ และ 11 interaction scenarios ครอบคลุม immediate save/Undo, intervening changes, offline, navigation, focus, finite motion, Reduce Motion, Combo, sample import และ text enlargement 150% ในสามหน้าหลัก ดู `output/playwright/ux-phase1/revision7/report.json` บันทึกคลิปจากการกดต้นแบบจริงทั้ง Desktop/Mobile ไม่มี package เพิ่ม

ยังต้อง UAT บน iPhone Safari, Android Chrome, Windows Chrome และ Mac Chrome จริง รวม Thai font fallback, browser zoom, VoiceOver/TalkBack และความเร็วบนเครื่องทีม ไม่สรุปจาก viewport ว่าผ่าน device UAT

ไม่ติดตั้ง dependencies ไม่แก้ source production ไม่อ่าน credentials ไม่ push/deploy/Firebase write และไม่เปลี่ยนไฟล์ R03–R06
