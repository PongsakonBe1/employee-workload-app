# กติกาภาพและ interaction — Review 05

## วัสดุและลำดับชั้น

| ชั้น | ใช้กับ | กติกา |
|---|---|---|
| Background | พื้น workspace | neutral tint ต่ำ ไม่ใช้สีสดแข่งกับข้อมูล |
| Content | ฟอร์ม ตาราง กราฟ รายการ | พื้นทึบ ปรับ light/dark และเส้นแบ่งชัด |
| Regular Glass | sidebar, toolbar, mobile tab, dialog | blur 26px, saturation 1.24, rim และเงาเบา ใช้กับชั้นควบคุม |
| Tinted / Solid | การตั้งค่ารูปลักษณ์ | เพิ่มความทึบ/ปิด blur เพื่อความอ่านง่าย |
| Selection / Focus | รายการที่เลือกและ keyboard | selection พื้นอ่อน, focus outline 3px ไม่พึ่งสีอย่างเดียว |

Glass ไม่จำเป็นต้องคลุมทุกการ์ด HIG วาง Liquid Glass ในชั้นควบคุมและนำทางเหนือเนื้อหา ใช้ regular material เมื่อมีข้อความมาก ส่วน clear material เหมาะกับพื้นหลังสื่อภาพมากกว่า [Apple: Materials](https://developer.apple.com/design/human-interface-guidelines/materials)

## สีตามหน้าที่

| หน้าที่ | Light: ตัวอักษร / พื้น | Dark: ตัวอักษร / พื้น | ตัวอย่าง |
|---|---|---|---|
| Action | `#ffffff / #065bc8` | `#172c48 / #9dc5ff` | บันทึก เพิ่ม ตรวจรายการ |
| ข้อความหลัก | `#202124 / #ffffff` | `#f1f1f5 / #242428` | ฟอร์ม รายการ ตัวเลข |
| ข้อความรอง | `#565861 / #ffffff` | `#c2c2cb / #242428` | คำอธิบาย วันที่ |
| สำเร็จ | `#256344 / #eaf4ee` | `#b5e3c5 / #293e32` | อนุมัติ พร้อมใช้ สมบูรณ์ |
| รอ/ต้องติดตาม | `#7b5111 / #fff3dd` | `#f7d399 / #453923` | รอตรวจ กำลังยืม ชำรุด |
| ปฏิเสธ/เสียหายสำคัญ | `#a72d42 / #fcecef` | `#ffc0ca / #462b34` | ไม่อนุมัติ สูญหาย |
| ตารางเรียน | `#6253aa / #f0edf9` | `#c9bcff / #342e47` | ม่วงพร้อมชื่อวิชาและห้อง |
| DL | `#066773 / #e7f4f4` | `#9cdddd / #263b3e` | teal พร้อมคำว่า DL และเวลา |
| สอบรายวิชา | `#925620 / #fff0df` | `#efc19b / #45372c` | สีหมวดสำหรับ workflow นำเข้า |

ทุกสถานะมีข้อความ ไม่ใช้สีแทนข้อมูล ไม่ให้แต่ละ feature มี accent คนละสี ปุ่มทั่วไปใช้ neutral; สีหมวดกิจกรรมไม่ใช้แทนความสำเร็จ/ล้มเหลว [Apple: Color](https://developer.apple.com/design/human-interface-guidelines/color)

## โครงหน้าและ responsive

- Desktop sidebar 224px แบ่งงานประจำวัน / ตารางและทรัพยากร / ทีมและรายงาน / ผู้ดูแล พร้อม profile/settings ด้านล่าง รายการตรวจและรายละเอียดอยู่ข้างกัน
- Mobile ≤760px ใช้ 4 งานหลักและเพิ่มเติม ปุ่มหลักและ segmented controls สูงอย่างน้อย 44px ฟอร์มใช้ตัวอักษร 16px เพื่อลดการ zoom อัตโนมัติ
- ระหว่าง 761–900px ซ่อน inspector และเปิด detail ใน dialog เพื่อไม่บีบตาราง แบบทดสอบครอบคลุม 768px ด้วย
- Dialog mobile อยู่ล่างจอ เลื่อนเนื้อหาข้างในได้ มีปุ่มยกเลิก/ยืนยันเสมอ รายการที่ต้องกรอกหลายค่าไม่ใช้ long press เป็นช่องทางเดียว
- หน้า authentication แยก shell; หน้า design/states อยู่ในเครื่องมือผู้ตรวจ ไม่แสดงในเมนูผู้ใช้

sidebar จัดกลุ่มและเผยรายละเอียดตามบริบทเพื่อไม่ให้เมนูทุกปลายทางแย่งความสำคัญเท่ากัน [Apple: Sidebars](https://developer.apple.com/design/human-interface-guidelines/sidebars)

## Wireframe และงานหลัก

| งาน | เริ่มต้น → ตรวจ → ผลลัพธ์ | Desktop / Mobile |
|---|---|---|
| ลงงาน | เจ้าหน้าที่ → Quick/กรอกเอง → รายละเอียด → ยืนยัน | form + บริบทวันนี้ / form ก่อนแล้วเปิดบริบท |
| ประวัติงาน | filter → แถวสรุป → รายละเอียด → แก้/เลือกหลายรายการ | list + inspector / list + sheet |
| ตารางเรียน | ภาคเรียน/ห้อง → week/list → รายวิชา → ฟอร์ม | week proportional / agenda เป็นค่าเริ่มต้น |
| DL | เดือน → วันและรอบ → ห้อง/ผู้คุม → ยืนยัน | month + detail / agenda + sheet |
| นำเข้าตาราง | ชนิด/ช่วงมีผล → ตรวจแถว → สรุปซ้ำ → ยืนยัน | preview + editor / เรียง preview และ editor |
| อุปกรณ์ | ค้นหา/ประเภท → รายชิ้น → สังกัด/active → บันทึก | registry + inspector / list + sheet |
| Analytics | ปีงบ/เดือน → คนหรืออุปกรณ์ → จำนวน/คำอธิบาย | list + detail / detail sheet |
| คำขอส่งออก | ผู้ขอ/เหตุผล/ช่วง → preview → pending → พิจารณา | queue + detail / list + sheet |
| Settings | หมวด → ตัวเลือก → บันทึกตัวอย่าง | หมวดด้านซ้าย / หมวด → เจาะหน้า → กลับ |

## สูตรและข้อจำกัดที่ต้องอ่านร่วมกับกราฟ

Staff 6 มิติแสดงจำนวนงาน, จำนวน minorTask, วันที่มีบันทึก, จำนวนสูงสุดต่อวัน, สัดส่วนรายการที่มีรายละเอียด และจำนวน Combo ใช้ระเบียนในปี/เดือนที่เลือก Radar เทียบกับค่าสูงสุดทีมในช่วงเดียวกัน ไม่ใช่คะแนนคุณภาพบุคลากร

Profile เป็น **top 8 minorTask ตามความถี่** ตาม project decision 2026-06-05 แสดง legend ชื่อเต็มแยกจากตัวกราฟ

Equipment usage นับเฉพาะงานยืมที่ match อุปกรณ์ fixture แยกจากคืน/condition ต้องใช้ stable device ID ใน implementation จริง บันทึกเก่าไม่ควรแปลงความหมายจากชื่อใหม่

ภาพรวมลดกราฟที่แสดงพร้อมกัน มีปุ่มการกระจายงานเปิด main/minor/hour/person ทั้งชุด และ heatmap แยก บริบทช่วงสอบให้ตรวจจากตาราง ไม่เดาว่าทุกเดือนใดเป็นช่วงสอบ

## State และ accessibility

มี Loading/Empty/Error/Retry/Offline ในเครื่องมือผู้ตรวจ, validation ใกล้ช่อง, dialog focus, Escape, focus-visible, toast aria-live, Reduced Motion และ Solid Material มีข้อความกำกับข้อมูลสังเคราะห์ ช่วงข้อมูลว่างไม่แสดงกราฟแต่งขึ้น

Contrast ของ semantic pairs ตรวจอัตโนมัติบนพื้นทึบแยก light/dark การตรวจนั้นไม่ครอบคลุมทุก backdrop ของ Glass ต้องตรวจเนื้อหาจริง/zoom/VoiceOver/Safari และ UAT ต่อไป
