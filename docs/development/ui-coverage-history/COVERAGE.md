# Coverage รายหน้า

9 พฤศจิกายน 2569: [สีและบทบาทของปุ่ม Liquid Glass](../glass-button-roles/README.md) — ปรับ shared controls/คำสั่งลบ; ไม่มี feature route ใหม่; feature previews ยัง 9 · all-pages-ready = false

9 พฤศจิกายน 2569: [เทมเพลตและ Combo ร่วมกับ Quick Log](../templates-combo/README.md) — Next 34 routes / dev 10 / feature previews 9; เมนู 9/18 ปลายทาง · all-pages-ready = false

8 พฤศจิกายน 2569: [ทุกหัวข้อ/สรุปแบบประเมิน/Staff Analytics และแก้ legacy failures](../assessment-summary/README.md) · ไม่มี route ใหม่ · all-pages-ready = false

8 พฤศจิกายน 2569: [ภาพรวมและ Staff Analytics](../dashboard-staff/README.md) — Next 33 routes / dev 9 / feature previews 8; เมนู 8/18 ปลายทาง · all-pages-ready = false

8 พฤศจิกายน 2569: [Flow ทรัพยากร/ประวัติ/CSV ล่าสุด](../resource-detail-flow/README.md)

อัปเดตเฟสห้อง/อุปกรณ์: Next 31 routes / dev 7 / feature previews 6; เมนู 6/18 ปลายทาง ดู [รายงานปัจจุบัน](../resources-equipment/README.md) ส่วนผลก่อนหน้าด้านล่างเป็น snapshot ของเฟสประวัติ

7 พฤศจิกายน 2569 · ใช้ข้อมูลใน repo เท่านั้น · **all-pages-ready = false**

ก่อนทำ: Next 27 routes / 3 development routes / 2 feature previews; เมนู 2/18 ปลายทางเปิด feature preview

หลังทำ: Next 28 routes / 4 development routes / 3 feature previews; เมนู 3/18 ปลายทางเปิดหน้า preview แยกได้ คำว่า preview ไม่แปลว่าฟีเจอร์ย้ายครบหรือพร้อม production

ต้นแบบ 30 views × 4 PC/mobile/theme states = 120 render/layout checks ไม่มี root overflow หลัง transition จบ ไม่มี page errors ใน audit ล่าสุด การตรวจนี้ไม่ครอบคลุมทุกคำสั่งในทุก view

| View ที่อนุมัติ | Source ของเดิมใน inventory | Preview ใหม่ | สถานะที่ยืนยันได้ | งานค้างหลัก |
|---|---|---|---|---|
| ภาพรวม (dashboard) | /dashboard | /dev/dashboard | Partial — shared ledger/weekly/custom/fiscal/all tasks/assessment summary/drill/partial-data UI | data adapter/cache/index/Auth จริง และ physical UAT |
| บันทึกงาน (record) | /admin/record | /dev/record | Partial — flow บันทึกด่วน/กรอกเองและ shared ledger ผ่าน | template จริง/ธุรกรรมบริการจริง/ตารางร่วมยังไม่ครบ |
| รายการงาน (worklogs) | /worklogs | /dev/history | Partial — list/calendar/details/edit text/delete/Undo/CSV ผ่าน | แก้วัน/เวลา/หัวข้อ, bulk edit, lock/audit จริง |
| กรอกบันทึกงาน (new-log) | /worklogs/new | /dev/record → กรอกเอง | Partial — catalog เดิมและ validation ผ่าน | persistent draft/server integration |
| ตารางสอบ DL (dl) | /admin/dl-exam-schedules | /dev/calendar | Partial — CRUD ตัวอย่าง/75 คน/รอบเย็น/ห้องชนผ่าน | dedicated manager/import และข้อมูลจริง |
| ตารางเรียน (classrooms) | /admin/classroom-schedules | /dev/calendar | Partial — recurrence/filter/cancel ผ่าน | dedicated manager/PDF import และข้อมูลจริง |
| จัดการอุปกรณ์ (equipment) | /admin/equipment-items | /dev/equipment | Partial — เพิ่ม/แก้/หยุดใช้/Undo และ Quick Log ร่วมผ่าน | บริการจริง/ข้อมูลจริง/physical UAT |
| การใช้งานอุปกรณ์ (usage) | /admin/equipment-health | /dev/equipment/usage | Partial — ครั้งยืม/คืน/current outstanding/ID/date/person filters ผ่าน | บริการจริง/ข้อมูลจริง/physical UAT |
| Staff Analytics (staff) | /admin/staff-analytics | /dev/staff | Partial — measured counts/count-share charts/person trend/assessment summary/person search/CSV/team-wide fiscal JD UI | JD จริง/data adapter/Auth จริง และ physical UAT |
| โปรไฟล์ของฉัน (profile) | /profile | — | ยังไม่ได้ย้าย feature UI; มีเพียงต้นแบบ/หน้าเดิม | ย้ายตาม Review + role/empty/error/data flows และ tests |
| ส่งออกข้อมูล (export) | /export | — | ยังไม่ได้ย้าย feature UI; มีเพียงต้นแบบ/หน้าเดิม | ย้ายตาม Review + role/empty/error/data flows และ tests |
| ศูนย์ผู้ดูแล (admin) | /admin | — | ยังไม่ได้ย้าย feature UI; มีเพียงต้นแบบ/หน้าเดิม | ย้ายตาม Review + role/empty/error/data flows และ tests |
| จัดการผู้ใช้ (users) | /admin/users | — | ยังไม่ได้ย้าย feature UI; มีเพียงต้นแบบ/หน้าเดิม | ย้ายตาม Review + role/empty/error/data flows และ tests |
| บันทึกด่วนและ Combo (templates) | /admin/templates | /dev/templates | Partial — shared catalog/create/edit/deactivate/Undo/role/filter/explicit Combo selection และ snapshot เดิมผ่าน | collection/query/Auth จริง และ physical UAT |
| จัดการระบบ (system) | /admin/system | — | ยังไม่ได้ย้าย feature UI; มีเพียงต้นแบบ/หน้าเดิม | ย้ายตาม Review + role/empty/error/data flows และ tests |
| ตั้งค่า (settings) | /admin/settings | /dev/ui และ AppearanceSettings | เฉพาะ appearance ร่วมผ่าน | system settings ส่วนที่เหลือยังเป็นหน้าเดิม |
| ประวัติระบบ (audit) | /admin/audit-logs | — | ยังไม่ได้ย้าย feature UI; มีเพียงต้นแบบ/หน้าเดิม | ย้ายตาม Review + role/empty/error/data flows และ tests |
| ประกาศและแจ้งเตือน (broadcast) | /admin/system#broadcast | — | ยังไม่ได้ย้าย feature UI; มีเพียงต้นแบบ/หน้าเดิม | ย้ายตาม Review + role/empty/error/data flows และ tests |
| นำเข้าข้อมูล (imports) | /admin/system#import | — | ยังไม่ได้ย้าย feature UI; มีเพียงต้นแบบ/หน้าเดิม | ย้ายตาม Review + role/empty/error/data flows และ tests |
| ตรวจข้อมูลซ้ำ (cleanup) | /admin/cleanup | — | ยังไม่ได้ย้าย feature UI; มีเพียงต้นแบบ/หน้าเดิม | ย้ายตาม Review + role/empty/error/data flows และ tests |
| คู่มือการใช้งาน (help) | /help | — | ยังไม่ได้ย้าย feature UI; มีเพียงต้นแบบ/หน้าเดิม | ย้ายตาม Review + role/empty/error/data flows และ tests |
| เข้าสู่ระบบ (login) | /login | — | ยังไม่ได้ย้าย feature UI; มีเพียงต้นแบบ/หน้าเดิม | ย้ายตาม Review + role/empty/error/data flows และ tests |
| รออนุมัติ (pending) | /pending | — | ยังไม่ได้ย้าย feature UI; มีเพียงต้นแบบ/หน้าเดิม | ย้ายตาม Review + role/empty/error/data flows และ tests |
| ชุด UI และสถานะ (design) | design-only | /dev/ui | components lab ผ่าน regression | ไม่ใช่ feature page |
| ห้องและทรัพยากร (resources) | RoomEquipmentStatus | /dev/resources | Partial — รายการ/detail/history/CSV/status export/ยืมคืน/Undo ผ่าน | ตารางร่วม/บริการจริง/physical UAT |
| สภาพและประวัติคืน (condition) | /admin/equipment-health | /dev/equipment/usage → สภาพตอนคืน | Partial — normal/damaged/lost/unknown events ผ่าน | บริการจริง/ข้อมูลจริง/physical UAT |
| คำขอส่งออก (export-requests) | /admin/system#exports | — | ยังไม่ได้ย้าย feature UI; มีเพียงต้นแบบ/หน้าเดิม | ย้ายตาม Review + role/empty/error/data flows และ tests |
| นำเข้าข้อมูลงาน (data-import) | /admin/system#import | — | ยังไม่ได้ย้าย feature UI; มีเพียงต้นแบบ/หน้าเดิม | ย้ายตาม Review + role/empty/error/data flows และ tests |
| การแจ้งเตือน (notifications) | NotificationBell | ตัวอย่างใน record/calendar | ยังเป็นข้อความตัวอย่าง | read/unread/broadcast/FCM จริงยังไม่ย้าย |
| เกี่ยวกับแอป (about) | Version Control | FAB ข้อมูลเวอร์ชัน | shared dialog/runtime branch ตรวจได้ | standalone about ไม่ได้ย้าย |

## หน้าเก่าและสิทธิ์

Anonymous redirect smoke ผ่าน 21/21 routes ที่ใช้สิทธิ์ใน config สังเคราะห์และบล็อก origins ภายนอก: `/admin/audit-logs`, `/admin/classroom-schedules`, `/admin/cleanup`, `/admin/dl-exam-schedules`, `/admin/equipment-health`, `/admin/equipment-items`, `/admin`, `/admin/record`, `/admin/settings`, `/admin/staff-analytics`, `/admin/system`, `/admin/templates`, `/admin/users`, `/calendar`, `/dashboard`, `/export`, `/help`, `/profile`, `/resources`, `/worklogs/new`, `/worklogs`.

ผลนี้ยืนยันเฉพาะการ redirect ของ client ที่ยังไม่ login ไม่ได้ทดสอบเนื้อหาหลัง login, การบังคับสิทธิ์ของ backend/Firestore rules หรือธุรกรรมจริง

## เงื่อนไขที่ยังปิด gate

- หลาย feature UI ยังไม่ย้ายตามตารางข้างบน
- Baseline failures เดิม 8 ข้อแก้แล้วในเฟส assessment-summary; ชุดล่าสุด 342/342 ผ่าน แต่ยังไม่ใช่หลักฐานว่าทุก feature flow ครบ
- ยังไม่มี SIT กับ Firebase/Auth/backend จริงตามขอบเขต repository-only
- ยังไม่มี UAT ของทีมและ physical Safari/iPhone/Android/เครื่องสแกน
