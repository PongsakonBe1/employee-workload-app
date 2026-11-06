# QuickLiquid Pilot — ทดลองวัสดุและ motion ใน Development

6 พฤศจิกายน 2569 · branch `codex/develop-ui-foundation` · ฐาน `acf09e5`

ผู้ใช้ให้ Continue ตามแผนทดลองที่ประเมินไว้ เพิ่ม `quick-liquid@0.1.2` แบบตรึงเวอร์ชัน เฉพาะ toolbar, mobile tab bar และ selected indicator ในหน้า `/dev/ui` มีปุ่ม **CSS เดิม / QuickLiquid** สำหรับเทียบ โดยคงค่าธีมและร่างฟอร์ม

## สิ่งที่ทำ

1. สำรอง package metadata/lock ก่อนติดตั้ง ติดตั้งเพียงหนึ่ง package ด้วย `--ignore-scripts` และเก็บ MIT notice ที่ `/licenses/quick-liquid.txt`
2. ใช้ core engine กับชั้นตกแต่งที่เป็น sibling ของ controls ปุ่มและลิงก์ไม่ได้อยู่ใน `.ql-content` หรือพื้นที่ `overflow: hidden` ของ library จึงไม่เปลี่ยนพื้นที่กด/focus ของ controls
3. ใช้ Spring ของ library เคลื่อนและปรับความกว้างของ selected indicator หลัง React เปลี่ยนสถานะเมนู ไม่เพิ่ม click handler ที่สั่ง navigation ซ้ำ
4. ใช้ SVG เฉพาะการทดลองบน Chromium; Safari/Firefox/iOS brands ใช้ explicit CSS optics fallback ไม่อาศัย computed-style probe เพียงอย่างเดียว
5. ส่ง resolved theme ของแอปเข้า engine โดยตรง; ลดความเคลื่อนไหวปิด pointer lighting และหยุด spring, พื้นทึบ/forced colors ทำลาย optical engines และกลับไปใช้ surface เดิม
6. เปลี่ยนธีมด้วย `setConfig` ไม่ครอบ/ย้ายฟอร์ม เมื่อปิดทดลองหรือซ่อน tab bar จะ cleanup observer, pointer listeners, animation frames และ engine/cache
7. ถ้า encoding map ไม่สำเร็จหรือรอนานเกินขอบเขต จะใช้ CSS optics ต่อ แทนปล่อย SVG ค้าง หน้าเมนูและฟอร์มยังใช้งานได้

Core engine แทน React wrapper ถูกเลือกเพื่อรักษาโครงสร้าง navigation และ notification popup เดิม ใช้ dynamic imports หลัง mount เท่านั้น พร้อม guard `NODE_ENV` และค่าเริ่มต้น `glassMode="css"` ของ `WorkspaceFrame` แอปจริงที่ใช้ `AppShell` จึงยังคง baseline; หน้า development ตรวจแบบเป็นผู้ opt in การทดลองนี้ ไม่ใช่การเปิดใช้ทั่วทุกหน้าใน production

ไม่เพิ่ม Firestore query, ไม่แก้ AuthContext, backend, schema หรือ data mutations และยังไม่ได้ deploy/push

## วิธีตรวจ

รัน `node scripts/dev-ui.mjs` แล้วเปิด `/dev/ui` เลือก QuickLiquid/CSS เดิมด้านบน ลองเปลี่ยนเมนูมือถือ สลับธีมและพื้นหลัง และเปิดรูปแบบการแสดงผลเพื่อลองลดความโปร่งใส/การเคลื่อนไหว

Cloudflare ใช้ tunnel development เดิมตาม [คู่มือส่วนกลาง](../ui-foundation/README.md) URL ชั่วคราวอยู่ในผลตรวจ `public/report.json` เมื่อหยุดเครื่อง/tunnel ลิงก์จะใช้ไม่ได้

## ผลตรวจ

| การตรวจ | ผล |
|---|---|
| Unit policy/appearance/navigation | 14 ผ่าน รวม policy ใหม่ 7 รายการ: production guard, browser fallback, motion, solid/forced colors และการส่ง theme |
| Optics/interaction ในเครื่อง | 8 กลุ่มผ่าน: engine ที่ซ่อนอยู่, A/B/draft/cache, theme/solid/contrast, rendered displacement, encoding failure, touch/spring, iOS fallback policy และ keyboard |
| ผ่าน Cloudflare | ชุดเดียวกัน 8 กลุ่มผ่านบน URL HTTPS จริง |
| Regression ส่วนกลาง | 11 กลุ่มผ่าน |
| Build compatibility | compile/export ผ่านใน `frontend/.ui-build-check` ด้วยค่าทดสอบ ไม่มี development fixture ที่ render ใน export |
| Zoom | native Edge 200% ผ่าน |
| targeted lint | ผ่าน scope ของ components/preview/policy ที่แก้ |
| Full Vitest | 231 ผ่าน / 8 ไม่ผ่าน จาก 239; failures ทั้ง 8 ชื่อเดิมตรงกับหลักฐานฐาน `dc80fbb` ไม่ได้ปรับสูตรหรือ expectation เพื่อทำให้ผ่าน |

ผลหลักอยู่ใน `output/playwright/quick-liquid-pilot/` รวมภาพ A/B, ภาพผ่าน Cloudflare, คลิปการเคลื่อนไหวจริง และรายงาน มี transient HTTP 502 ระหว่าง warm development ครั้งแรก การตรวจ public ซ้ำหลัง server พร้อมผ่านทั้งหมด ไม่อ้าง uptime guarantee ของ Quick Tunnel

### หลักฐานการหักเห

การประกาศ `backdrop-filter: url(...)` ไม่เพียงพอ จึงวางพื้นหลังแถบสีชั่วคราวใต้ toolbar ใน browser test แล้วเปลี่ยนเฉพาะ `feDisplacementMap.scale` เป็นศูนย์ โดยคง blur, tint, geometry และลด motion ไว้ ภาพในเครื่องแตกต่าง 1,663 พิกเซลจากภาพเดิมขนาด 134×48 ขณะที่ภาพซ้ำก่อนเปลี่ยนมี noise 0 แสดงว่าการหักเหเกิดใน rendered pixels ของ Chromium ที่ตรวจจริง ไม่ใช่เพียง parse CSS ผ่าน

ตัวเลขนี้เป็น probe ของโครงการ ไม่ใช่คะแนนความเหมือน native Apple หรือหลักฐานว่า browser ทุกตัวให้ผลเท่ากัน ภาพ `refraction-on.png` และ `refraction-zero.png` เป็นพื้นหลังตรวจชั่วคราว ไม่ใช่สี UI ใหม่

### Performance และข้อจำกัด

- desktop ใช้ optical engine หนึ่งตัว ไม่สร้าง map ของ tab bar ที่ซ่อนอยู่; touch/mobile ใช้สองตัวและคุณภาพ low
- ปิดทดลองแล้ว live engine และ unique maps เป็นศูนย์ใน stress test ที่ตรวจ เก็บ geometry/encoding/CPU metrics ใน report แต่ไม่ตีความเป็น FPS หรือ battery usage ของทั้งหน้า
- iOS UA test ยืนยันเส้นทาง fallback ของเราเท่านั้น browser ที่ใช้ตรวจยังเป็น Chromium ต้องทดลอง Safari/iPhone/Android จริงผ่านลิงก์
- รูปแบบทั้งแอปยังต้องทยอยย้ายรายหน้า อย่าใช้การทดลองนี้เป็นเหตุข้ามปัญหาเทสต์เดิม 8 รายการหรือการตรวจข้อมูลจริงก่อน release

## จุดตรวจรับ

1. อ่านตัวอักษรและเห็นปุ่มชัดทั้งสองธีม โดยเฉพาะขณะเลื่อนข้อความผ่านใต้ toolbar/tab bar
2. กดเมนูมือถือทุกอันและสังเกต indicator เคลื่อนตาม โดยไม่มีการนำทางซ้ำ
3. สลับ CSS เดิม/QuickLiquid ขณะมีร่างฟอร์ม ร่างต้องคงอยู่
4. ลดความโปร่งใส/เคลื่อนไหวต้องมีผลจริง และเปิดเมนูบัญชี/รูปแบบ/ค้นหาได้ครบ
5. ตรวจบนมือถือจริงก่อนพิจารณาขยายเอฟเฟกต์ไปส่วนอื่น
