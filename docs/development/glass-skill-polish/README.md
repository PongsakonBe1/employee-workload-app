# Review 10 — ปรับรายละเอียดตาม Liquid Glass skill

7 พฤศจิกายน 2569 · branch `codex/review10-glass-interaction-polish` · ฐาน `8da6b31`

ผู้ใช้อนุมัติให้ปรับต่อโดยใช้ skill ที่ส่งมา และรักษา UI ที่ตรวจรับแล้ว เฟสนี้ปรับรายละเอียดของหน้าบันทึกงาน ปฏิทิน และ controls ส่วนกลางใน development ไม่ย้ายหน้าหรือธุรกรรมใหม่

## Reference และการประยุกต์

ลิงก์จริงในข้อความผู้ใช้ชี้ไป [Jamkris liquid-glass-design](https://skills.rest/skill/liquid-glass-design-jamkris) จึงอ่าน [SKILL.md ต้นทาง](https://github.com/Jamkris/everything-gemini-code/blob/main/skills/liquid-glass-design/SKILL.md) โดยตรง มี provenance/hash ใน `output/playwright/glass-skill-polish/skill-source.json` ไม่ติดตั้ง skill ทั่วเครื่อง ไม่รัน installer และไม่เพิ่มแพ็กเกจ

Skill อธิบาย SwiftUI/UIKit/WidgetKit ของ iOS 26 จึงประยุกต์หลักการเข้ากับ Next.js และ QuickLiquid ที่มีอยู่ ไม่อ้างว่าเว็บเรียก native API ได้หรือรองรับ OS รุ่นใดครบทุกข้อ ใช้เอกสาร Apple เรื่อง [GlassEffectContainer](https://developer.apple.com/documentation/swiftui/glasseffectcontainer) และ [Applying Liquid Glass to custom views](https://developer.apple.com/documentation/swiftui/applying-liquid-glass-to-custom-views) ตรวจแนวทางเพิ่มเติม

| หลักการ | สิ่งที่ทำในเว็บ |
|---|---|
| รวม controls ที่เกี่ยวข้องในวัสดุเดียว | ปุ่มเปลี่ยนมุมมอง/โหมดใช้ optical surface ต่อกลุ่ม และเลื่อน selection ระหว่าง native buttons |
| การเปลี่ยนสถานะต่อเนื่อง | ใช้ Spring เดิมของ QuickLiquid เปลี่ยนตำแหน่ง/ความกว้างของ selection ไม่สร้าง engine ใหม่ต่อ segment |
| Interactive material เฉพาะสิ่งที่กดได้ | Sidebar ปฏิทินยังมี optics แต่ไม่ตอบสนองแสงต่อ pointer ทั้งแผง ปุ่มที่ disabled ไม่รับ feedback |
| เนื้อหาต้องอ่านง่าย | การ์ดงานยังเป็น content surface เดิม ไม่มี refraction เพิ่มบนข้อความ/เนื้อหาทุกการ์ด |
| การเข้าถึงและ fallback | Native button/link รับ focus/keyboard ตามเดิม; reduced motion หยุด Spring, solid/CSS/forced colors แสดง selected fill ได้ |

Selection เป็นการประยุกต์ motion บนเว็บ ไม่ใช่ native glass union/morphing API และไม่ใช่หลักฐานประสิทธิภาพเทียบ native

## รักษาแบบที่ตรวจรับ

เปิด static Review 10 ใน browser แยกจาก development แล้ววัดที่ PC 1440px และมือถือ 390px พบว่ารายละเอียดบางส่วนของรอบ migration คลาดเคลื่อน จึงคืนขนาดและสีตามค่าที่วัดจริง:

| รายการ | ก่อนรอบนี้ | หลังปรับ = Review 10 |
|---|---|---|
| การ์ด Quick Log PC | สูง 174px | 149px, padding 18px, radius 17px |
| การ์ด Quick Log มือถือ | สูง 164px | 155px, padding 17px 15px, radius 19px |
| หัวข้อการ์ดมือถือ | 13px | 15px / line-height 21.75px |
| คำอธิบายการ์ด PC | 12px | 13px / line-height 19.5px |
| หัวข้อหน้ามือถือ | 28px | 30px |
| ไอคอน | มีชั้นไล่สีขาวเพิ่มเติม | คืนไล่สีประจำหมวด ขอบแสงและมิติแบบ Review 10 |

หลักฐาน `before-fidelity.json`, `after-fidelity.json` และภาพ `reference-review10-*` อยู่ในโฟลเดอร์ผลตรวจ ไม่เปลี่ยนไฟล์แบบที่ตรวจรับ ไม่มีการแจกจ่ายฟอนต์ SF หรือไอคอน Apple; ใช้ system font และไอคอน SVG ของโครงการ

## ผลตรวจ

ผลที่รันจริงอยู่ใน `output/playwright/glass-skill-polish/validation-summary.json`:

- Verifier รอบนี้ผ่าน 6 กลุ่มทั้ง localhost และ Cloudflare: geometry/type/icon ramp เทียบแบบ, Spring และ keyboard, rapid selection/resize, passive feedback, appearance/draft, touch/iOS policy
- Regression บันทึกงาน 11 กลุ่ม, ปฏิทิน 11 กลุ่ม, ส่วนกลาง 11 กลุ่ม และ QuickLiquid optics 8 กลุ่มผ่าน
- Targeted unit 15/15 ผ่าน; targeted ESLint, isolated compatibility build และ browser zoom จริง 200% ของหน้าบันทึกงานผ่าน
- Full Vitest 241 ผ่าน / 8 ไม่ผ่าน จาก 249 ข้อ ชื่อ failures ทั้ง 8 ตรง baseline เดิม และไฟล์ analytics/validation ที่เกี่ยวข้องไม่เปลี่ยน ไม่ถือว่า full suite ผ่าน
- ตรวจ public runtime HTTP 200 และหน้าข้อมูลเวอร์ชันแสดง branch รอบนี้แล้วใน `public/runtime-smoke.json`

การจำลอง touch/iOS UA ใน Chromium ตรวจได้เฉพาะ policy/layout ยังต้อง UAT บน Safari/iPhone และ Android จริง Safari ใช้ CSS optics fallback ไม่รับรอง refraction/FPS เท่ากันทุก browser

## เปิดตรวจ

- Local: `http://127.0.0.1:4310/dev/record` และ `/dev/calendar`
- [บันทึกงาน — Cloudflare ใหม่](https://income-translator-census-dude.trycloudflare.com/dev/record)
- [ปฏิทิน — Cloudflare ใหม่](https://income-translator-census-dude.trycloudflare.com/dev/calendar)

ลิงก์ชั่วคราวใช้ได้ขณะ Next และ tunnel บนเครื่องนี้ทำงาน ใช้ข้อมูลสังเคราะห์ ไม่ใช่ production; ลิงก์เดิมหมดอายุจึงเปิด tunnel ใหม่ด้วย binary/config เดิม ไม่ติดตั้ง service ไม่ deploy

ยังไม่ push/merge/deploy ไม่เปลี่ยน dependencies, backend, Auth, Firestore rules/queries หรือ Profile Radar Top 8 `minorTask` รอ Tech Lead ตรวจเฟสนี้ก่อนขยายฟีเจอร์/หน้าถัดไป
