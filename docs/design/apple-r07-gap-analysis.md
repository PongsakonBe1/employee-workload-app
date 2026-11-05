# ตารางช่องว่าง R07 — เฟส 0

ตรวจ 2026-11-05 ฐาน `6fa5ed8` เชื่อมกับ [หลักฐาน Apple และการตีความ](apple-design-notes.md)

## หลักฐานและขอบเขต

- อ่าน source R07 และ dependency prototype R06/R05, README, report และ frontend layout/package โดยไม่อ่าน credentials
- วัดสด 8 routes ด้วย Edge/Playwright ที่มีอยู่ 3 contexts: Desktop 1440×900 pointer fine, touch Desktop 1024×900 (`hasTouch:true`, ยืนยัน `(pointer:coarse)` เป็น true), Mobile 390×900 touch
- วัด light/default state, superadmin, หน้าเริ่มต้นแต่ละ route ไม่เปิด dialog หรือ import ขั้นลึกในรอบวัดนี้ ไม่เปลี่ยนไฟล์ UI หรือเขียนฐานข้อมูล
- ตัวเลข tiny text นับ element ที่มี text node ตรงและมี layout box จาก `#content`, sidebar และ tab bar ไม่รวม SVG; ไม่ได้จำกัดเฉพาะส่วนที่อยู่ใน viewport และไม่ใช่จำนวนประเภทปัญหาที่ไม่ซ้ำ
- ตัวเลข target เป็น broad candidate count ของ `button,a,input,select` ที่มี box และกว้างหรือสูง <44px รวม native checkboxes/links จึงใช้ชี้จุดตรวจต่อ **ไม่ใช่จำนวน WCAG failures** ยังไม่ได้วัด accessible associated-label hit region
- คำว่า pointer fine ไม่ผ่าน 44px เป็นเพียงข้อมูลเปรียบเทียบ การมีปุ่ม Desktop สูง 34–38px ไม่ผิด HIG โดยตัวมันเอง

## ผลวัดที่ทำซ้ำได้จากหน้าปัจจุบัน

| Route | Text <12px Desktop / Mobile | target candidates <44px touch 1024 / Mobile | ข้อสังเกต |
|---|---:|---:|---|
| record | 20 / 10 | 18 / 3 | metadata ผู้ปฏิบัติงาน/Combo badge 10px, segment มือถือ 40px |
| worklogs | 17 / 4 | 40 / 3 | tab labels 11px, segment 40px; checkbox ต้องตรวจ label hit region เพิ่ม |
| classrooms | 55 / 22 | 29 / 9 | event time/type 11px, room filter 40px, ปุ่มวันนี้กว้าง 37px บนมือถือ |
| imports | 5 / 8 | 15 / 1 | step labels 10px บนมือถือ ต้องตรวจขั้น 2–4 เพิ่มใน A |
| staff | 27 / 5 | 19 / 1 | scope caption 11px; SVG labels ยังไม่รวมใน count |
| settings | 5 / 4 | 15 / 1 | หน้าเริ่มต้นยังไม่วัด switch ภายในหมวด |
| resources | 22 / 12 | 17 / 3 | status tags 11px, segment 40px |
| profile | 8 / 8 | 18 / 1 | KPI captions 10px; radar SVG ยังต้องตรวจเมื่อ scale |

Sidebar links สูง 38px ทั้ง pointer fine และ touch 1024px; mobile brand link สูงประมาณ 29px กว้าง 58px; shared tab labels 11px แผน A ควรตรวจพื้นหลักและข้อความในฟอร์ม ไม่หยุดเฉพาะ `.quick-card small`

## ช่องว่างตามหน้าหรือกลุ่มฟีเจอร์

สถานะ: **ยืนยัน** = source/ผลวัดรองรับ, **บางส่วน** = มี implementation แต่หลักฐานไม่ครบ, **ยังไม่ยืนยัน** = ต้องทดลองเพิ่ม ไม่ตีความเป็น bug ที่ยืนยันแล้ว

| หน้า/กลุ่ม | สถานะและช่องว่าง | หลัก HIG | เฟสที่เสนอ |
|---|---|---|---|
| Shared shell ทุกหน้า | ยืนยัน: `.review-label` ยังซ้อนพื้นที่ footer; source กำหนด 10–11px หลายจุด; ไม่มี coarse rule ใน R07 | Layout, Typography, Gestures | A1–A3 |
| Record / new-log / Quick Log / Combo | ยืนยัน: badge/actor caption เล็ก; บางส่วน: immediate room save + persistent Undo มีแล้ว การบันทึกประเภทอื่นยังมีข้อมูลที่ต้องกรอก | Agency, Buttons, Typography | A2/A5; ไม่เปลี่ยน flow เพิ่มใน A |
| Worklogs / detail / edit | ยืนยัน: font/hit-box gaps ข้างต้น; บางส่วน: list/detail และ selection มีแล้ว แต่ selection indicator/column sizing ต้องตรวจเพิ่ม | Lists and tables, Split views | A2/A5; column resize เป็น backlog ไม่ใช่งานอัตโนมัติ |
| Classrooms / DL | ยืนยัน: ตัวเลขและ filters เล็ก; เสี่ยงที่เพิ่ม font แล้ว event ระยะสั้นล้น ต้องรักษาเวลา/เลน ไม่บีบตัวหนังสือกลับ | Layout, Typography | A2/A3/A5 |
| Schedule import | ยืนยัน: step text เล็ก; บางส่วน: sample review/draft/conflict flow มี; ยังไม่มี PDF parser/OCR | Sheets, Layout, Responsibility | A2/A5; parser เป็นเฟสอื่น |
| Equipment / resources / usage / condition | ยืนยัน: tags และ scope/filter เล็ก; บางส่วน: local registry consistency มี แต่ production ยังไม่ได้ย้าย | Color, Lists, Typography | A2/A5; integration หลัง spike |
| Dashboard / Staff / Profile | ยืนยัน: captions เล็ก; ยังไม่ยืนยัน actual rendered font ของ SVG หลังย่อ; คง FY/month planning และ radar top 8 minorTask | Typography, Color | A2/A5; ไม่เปลี่ยน metric semantics |
| Templates / export / requests / users / admin | ยังไม่วัดสด dialogs และทุก state; source สืบทอด controls หลายขนาด จึงต้องรวมใน selector sweep | Buttons, Menus, Layout | A2/A3/A5 |
| Settings / account / notifications / broadcast | บางส่วน: system appearance/override มี; ยังไม่ยืนยัน contrast ทุก backdrop และ keyboard menu semantics | Dark Mode, Color, Menus | A5 + backlog บางส่วน |
| Sheets และ popovers ทุก flow | ยืนยันจาก source: แสดง grabber แต่ไม่มี drag/detent handlers ใน R07; keyboard/Escape รองรับจาก R06; gesture resizing ยังไม่ยืนยัน | Sheets, Gestures | แจ้งแยกไว้ ไม่เพิ่ม gesture library ใน A; เสนอแก้ affordance ภายหลัง |
| Help / about / audit / cleanup / data-import / system | ยังไม่วัดสดครบ แต่ shared typography เปลี่ยนจะกระทบ ต้อง render ทั้ง 30 routes | Consistency, Layout | A5 |
| Login / pending | มี auth shell แยก แต่ยังไม่ตรวจข้อความ/hit regions เพิ่ม; ไม่เชื่อม auth จริงใน prototype | Layout, Responsibility | A5 |
| Motion / icon system | บางส่วน: มี finite feedback, Reduce Motion และ local focus tests; ยังไม่ยืนยัน VoiceOver/TalkBack, touch performance; ไม่ใช่ SF Symbols assets | Motion, Icons, Accessibility | regression A5; UAT ก่อนตัดสิน B |
| Material fallback | ยืนยัน: R06 CSS มี reduced-transparency/contrast และ Solid; R07 เพิ่ม contrast บางส่วน แต่ยังไม่มี forced-colors coverage และไม่ยืนยัน compositor Safari | Materials, Accessibility | จัด test states ใน A5; wrapper/fallback integration ใน B |
| Frontend จริง / PWA | ยืนยัน: `frontend/app/layout.js` themeColor ตายตัวและไม่พบ viewportFit; manifest theme_color ตายตัว; dependencies ไม่มี Glisse | Adaptability, Layout | B เท่านั้น |

## แก้ความเข้าใจจากเอกสารแนบ

1. R07 มี 120 rendered previews, 11 interaction scenarios และคลิปสองขนาดจออยู่แล้ว หลักฐานนี้ไม่ครอบคลุม font minimum/coarse targets ทั่วระบบ และไม่ทดแทน device UAT
2. What's New ปัจจุบันมีรายการถึง 2026-10-28 รวม touch บน Mac และ kit 27 ในปี 2026 จึงไม่ใช้ข้อสรุปว่าหน้าหยุดอยู่ปี 2025
3. HIG Dark Mode มีคำแนะนำ contrast 4.5:1; เพดาน 3 Glass groups และ font floor 12 CSS px เป็นของโครงการ
4. Search tab เป็นทางเลือก ไม่ต้องเพิ่มแท็บใหม่เพียงเพื่อเลียนแบบระบบ
5. รูปแบบ icon+label ในปุ่มไม่ผิดโดยรวม ต้องดูการจัดกลุ่ม toolbar ตามบริบท
6. ปุ่มสัมผัสต้องพิจารณาทั้ง width/height, spacing, label target และ hybrid input การเพิ่ม min-height อย่างเดียวไม่พอ
7. ชื่อฟอนต์ท้าย stack ไม่รับประกันว่า glyph ไทยจะใช้ฟอนต์นั้น ไม่มีผลดาวน์โหลดหรือติดตั้งฟอนต์เอง
8. ข้อมูล package Glisse ในแผนเป็นสมมติฐานที่ยังไม่ตรวจใหม่ในเฟส 0 ไม่รับรองจำนวนผู้ดูแล ดาว commit หรือ compatibility จนกว่าจะทำ B0

## สิ่งที่ยังตรวจไม่ได้

- dimensions จาก node ใน official UI Kit: มีเพียง public preview cover ในการอ่านครั้งนี้ ไม่มีตัวเลขที่วัดจริง
- Safari/iPhone/Android/Mac จริง, PWA safe areas/keyboard และ font glyph fallback ข้ามระบบ
- contrast หลัง compositing ทุก backdrop และ forced-colors ทั้งแอป
- 150% text test เดิมครอบคลุมสามหน้าหลัก ไม่รับรองทุก dialog หรือ browser zoom 200%
- ไม่มีการวัด FPS/พลังงานหรือ performance ของ Glisse จึงไม่สรุปว่าใส่ library แล้วเร็วหรือช้ากว่าเดิม
