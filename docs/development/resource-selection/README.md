# แก้ selected / hover / focus ของแถวทรัพยากร

8 พฤศจิกายน 2569 · branch `codex/resource-selection-states` · ฐาน `f72eafc`

ผู้ใช้ชี้ว่าแถวที่เลือกใน Dark Mode เป็นสี่เหลี่ยมสีน้ำเงินทึบเต็มแถว และอนุญาตให้แก้ รอบนี้เปลี่ยนเฉพาะ presentation ของแถวห้อง/อุปกรณ์และทะเบียน ไม่มีการเปลี่ยนธุรกรรม สิทธิ์ schema หรือ flow รายละเอียด/ประวัติ/CSV

## การแก้

| สถานะ | หน้าตา / พฤติกรรม |
|---|---|
| ปกติ | พื้นแถวโปร่งใส ไม่มีการเลือกจากการเอาเมาส์ผ่าน |
| Hover บนแถวที่ยังไม่เลือก | พื้นเน้นโทนอ่อน เฉพาะอุปกรณ์ที่มี hover/fine pointer ไม่สร้าง sticky hover บน touch |
| เลือกแล้วและ focus อยู่ที่แถว | สี accent พร้อมข้อความหลัก/รองที่อ่านได้ ใช้ inset highlight มุมโค้ง |
| เลือกแล้วแต่ focus ไปค้นหาหรือแผงรายละเอียด | พื้นเทาตามธีมพร้อมขอบ ยังคง selection และ resource ID เดิม |
| Keyboard focus | วง focus มุมโค้ง 2px แยกจากการเลือก Tab ไปยังแถวอื่นได้โดยยังไม่เปลี่ยน selection จนกด Enter |
| Reduced Motion / Forced Colors | ตัด transition ตาม preference และใช้สีระบบ/เส้น focus ใน high contrast |

พื้นสีน้ำเงินเต็มแถวเดิมถูกเอาออกทั้ง `.resource-card` และ wrapper `.equipment-row` ใช้ `::before` เป็น standard selection layer ที่เว้นขอบ 5/6px และมุมโค้ง 12px โดยคงพื้นที่กดเดิม ไม่ใส่ Liquid Glass engine ในแถวเนื้อหา

สถานะสีเขียว/เทาเปิด–ปิดห้อง และสถานะยืม/คืนยังใช้ palette เดิม จึงไม่ถูกเปลี่ยนเป็นสี selection สี focused selection ใช้สีน้ำเงินคู่กับข้อความขาว/สีรองที่ตรวจ contrast ในสองธีม แยกจากสีปุ่ม primary ใน Dark Mode

นี่เป็นการปรับจุด selected state จากต้นแบบเดิมตาม feedback ล่าสุด ไม่ใช่การอ้างว่าพื้นน้ำเงินทึบเดิมเป็นข้อกำหนดของ Apple

## ผลตรวจ

- Browser acceptance 5 scenarios บน Edge, Chrome และ Cloudflare public preview: pointer selection, hover, ย้าย focus, Tab/Enter, registry, touch 375/390/430/768/900px × Light/Dark, Reduced Motion และ Forced Colors
- ตรวจ calculated foreground/background contrast ของข้อความหลัก/รอง ทั้ง focused และ inactive ≥4.5:1 และตรวจสี/ข้อความ badge ไม่เปลี่ยนเมื่อเลือก
- กดเลือก/hover/focus ไม่สร้าง worklog หรือ Undo ใหม่; ปลายทางรายละเอียดเดิมยังถูกต้อง
- รัน regression flow รายละเอียด/ประวัติ/CSV/สิทธิ์/ยกเลิก/Undo 8 scenarios โดยเก็บผลแยกจากเฟสก่อน
- Compatibility build แยกผ่าน; dev previews ไม่ render ใน production export ตรวจ syntax scripts และ diff whitespace
- ไม่เพิ่ม unit test ที่เพียงทวน CSS และไม่รัน business unit suite ซ้ำ เพราะ runtime change อยู่ใน CSS เท่านั้น ผล full suite ล่าสุดจากเฟสก่อนคือ 301 tests / 293 ผ่าน / 8 failures เดิม ดู `../resource-detail-flow/baseline-comparison.json` ในหลักฐานก่อนหน้า

หลักฐานรอบนี้อยู่ใน `output/playwright/resource-selection/` มีภาพ focused/inactive/hover/keyboard ในสองธีม รายงาน `edge/`, `chrome/`, `public/` และ `regression/edge/` การคำนวณ contrast เป็นสีที่ใช้จริงในแถว ไม่ใช่การรับรอง WCAG ของทุกหน้าทั้งระบบ

## ตรวจซ้ำ

```powershell
node scripts/verify-resource-selection.cjs C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
node scripts/verify-resource-detail-flow.cjs C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" http://127.0.0.1:4310 resource-selection
node scripts/check-ui-build.mjs resource-selection
```

เปิด `/dev/resources` หรือ `/dev/equipment` ใน development preview แล้วเลือกแถว จากนั้นคลิกค้นหา/ปุ่มในแผงรายละเอียดเพื่อดู inactive selection สำหรับทะเบียนให้เลือก Admin ในตัวเลือก Development

ยังใช้ข้อมูลสังเคราะห์ในแต่ละแท็บ ไม่มี production reads/writes, package installation, push หรือ deploy ยังรอ human UAT และอุปกรณ์จริง Safari/iPhone/Android ไม่อ้างว่า UI ทุกหน้าในระบบย้ายครบแล้ว
