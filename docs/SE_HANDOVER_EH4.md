# [SE] → Handover: EH-4 EquipmentReturnModal Complete

**วันที่:** 2026-06-04  
**Branch:** `feature/dashboard-analytics-v230`  
**จาก:** [SE] Software Engineer  
**ถึง:** [DA] EH-5, [QA] EH-8, [Doc] EH-9

---

## ✅ งานที่เสร็จแล้ว (EH-4)

### ไฟล์ที่สร้าง/แก้ไข

| ไฟล์ | การเปลี่ยนแปลง |
|------|--------------|
| `frontend/components/EquipmentReturnModal.js` | **ใหม่** — modal เลือกสภาพอุปกรณ์ตาม EH-3 design spec |
| `frontend/components/QuickLogButtons.js` | เพิ่ม `isReturnTemplate()`, state, handler, render |
| `frontend/lib/quickLogTemplates.js` | เพิ่ม `equipmentCondition` + `equipmentNote` ใน `logFromTemplate()` |

### ฟีเจอร์ที่ implement

- **EquipmentReturnModal**: 3 choices (สมบูรณ์/ชำรุด/สูญหาย) + conditional textarea + portal + Escape key
- **Routing**: Template ชื่อมี "คืนหูฟัง" / "คืนปลั๊กไฟ" → เปิด `EquipmentReturnModal` แทน `SmartEquipmentModal`
- **Firestore**: บันทึก `equipmentCondition` + `equipmentNote` ลง worklog document ตาม SA schema
- **Event dispatch**: `equipmentStatusUpdated` → `SmartEquipmentModal` รับและอัปเดต status ทันที
- **Success message**: แจ้ง "บันทึก ... — สมบูรณ์/ชำรุด/สูญหาย เรียบร้อย"

---

## 🔄 งานที่ต้องทำต่อ

### [DA] — EH-5 (สามารถเริ่มได้เลย)
- สร้าง `scripts/backfillEquipmentCondition.js`
- Parse comment หา "ชำรุด/เสีย/หัก/สูญหาย" → อัปเดต `equipmentCondition` ย้อนหลัง
- **Schema ที่ใช้:** `equipmentCondition: "normal"|"damaged"|"lost"`, `equipmentNote: string`
- **Safety:** รันบน dev + backup ก่อน production

### [QA] — EH-8 (หลัง EH-5 เสร็จ)
Test cases ที่ต้องครอบคลุม:
1. คืนหูฟัง → เลือก **สมบูรณ์** → กด ยืนยัน → Firestore doc มี `equipmentCondition: "normal"`, `equipmentNote: ""`
2. คืนหูฟัง → เลือก **ชำรุด** → ปุ่มยืนยัน disabled จนกรอกโน้ต → กรอก → กด ยืนยัน → `equipmentCondition: "damaged"`, `equipmentNote: "สายขาด"`
3. คืนหูฟัง → เลือก **สูญหาย** → กรอกโน้ต → กด ยืนยัน → `equipmentCondition: "lost"`
4. กด **ยกเลิก** / backdrop / Escape → modal ปิด, ไม่บันทึก
5. SmartEquipmentModal สถานะอุปกรณ์ update เป็น available หลังคืน
- **บันทึกผลใน** `QA_REPORT.md`

### [SE] — EH-7 + EH-6 (ลำดับถัดไป)
- **EH-7** (3 hr): `frontend/components/EquipmentCharts.js` — `EquipmentDamageChart`, `EquipmentHealthTimeline`, `DamageCategoryPie`
- **EH-6** (4 hr): `frontend/app/admin/equipment-health/page.js` — Damage Rate, Timeline, Pie, Export CSV
- *Dependency: EH-7 ก่อน EH-6*

### [Doc] — EH-9 (หลัง EH-8 pass)
- อัปเดต `README.md` เพิ่ม Equipment Health Tracking section
- สร้าง `docs/EQUIPMENT_HEALTH.md`: วิธีใช้ modal, field schema, วิธีอ่าน dashboard

---

## 📋 Schema Reference (ตาม SA EH-1)

```javascript
// worklogs collection — fields ที่เพิ่มใหม่
{
  equipmentCondition: "normal" | "damaged" | "lost",
  equipmentNote: string  // "" เมื่อ normal, required เมื่อ damaged/lost
}
```

---

## ⚠️ Notes

- **Template Routing**: `isReturnTemplate()` ตรวจ "คืนหูฟัง" / "คืนปลั๊กไฟ" ใน `name` หรือ `minorTask` — ถ้ามี template ชื่ออื่นที่ควร route มา return modal ให้แจ้ง SE เพิ่ม pattern ใน `isReturnTemplate()`
- **equipmentCondition default**: `logFromTemplate()` ใส่ default `"normal"` ทุก worklog ใหม่ — DA backfill จะมาปรับ worklog เก่า
- **Build status**: ✅ `npm run build` ผ่าน ไม่มี error

---

## ประวัติการแก้ไข

| วันที่ | ผู้แก้ไข | รายละเอียด |
|--------|---------|-----------|
| 2026-06-04 | [SE] | EH-4 implement EquipmentReturnModal + wire QuickLogButtons + quickLogTemplates |
