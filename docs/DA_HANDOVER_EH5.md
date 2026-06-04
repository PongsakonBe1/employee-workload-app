# [DA] → Handover: EH-5 Backfill Script Complete

**วันที่:** 2026-06-04  
**Branch:** `feature/dashboard-analytics-v230`  
**จาก:** [DA] Data Analyst  
**ถึง:** [QA] EH-8, [SE] EH-6/EH-7, [PM] TASK Update

---

## ✅ งานที่เสร็จแล้ว (EH-5)

### ไฟล์ที่สร้าง

| ไฟล์ | การเปลี่ยนแปลง |
|------|--------------|
| `scripts/backfillEquipmentCondition.js` | **ใหม่** — backfill script สำหรับ equipment condition |

### ฟีเจอร์ที่ implement

- **Pattern Detection**: ตรวจจับคำสำคัญในคอมเมนต์ (Thai + English)
  - **DAMAGE**: ชำรุด, เสีย, หัก, พัง, broken, damaged, not working...
  - **LOST**: สูญหาย, หาย, lost, missing, not returned...
- **Batch Processing**: ประมวลผล 500 docs/round (Firestore limit)
- **Dry Run Mode**: ค่าเริ่มต้น DRY_RUN=true ดู preview ก่อน apply
- **Safety Features**: 
  - รอ 5 วินาทีก่อน LIVE mode
  - บันทึก `_backfilledAt`, `_backfilledBy`, `_backfillReason` ใน doc
  - Rate limiting 100ms ระหว่าง batches

---

## 🚀 วิธีใช้งาน

### 1. DRY RUN (Preview ก่อน apply)

```bash
cd scripts
node backfillEquipmentCondition.js
```

ผลลัพธ์ตัวอย่าง:
```
[DAMAGED] abc123
  Comment: หูฟัง ICIT05 สายขาด ไม่มีเสียงซ้าย...
  Keyword: สายขาด

📊 BACKFILL SUMMARY
Mode:           DRY RUN (no changes)
Total scanned:  1,247
Updated:        23
  - Damaged:    19
  - Lost:       4
Skipped:        1,224
```

### 2. LIVE RUN (Apply จริง)

⚠️ **คำเตือน**: Backup Firestore ก่อน!

```bash
cd scripts
DRY_RUN=false node backfillEquipmentCondition.js
```

---

## 📋 Schema ที่อัปเดต

Script จะเพิ่ม fields ต่อไปนี้ใน worklog docs ที่ detect ได้:

```javascript
{
  equipmentCondition: "damaged" | "lost",
  equipmentNote: string, // full comment ที่ detect
  _backfilledAt: Timestamp,
  _backfilledBy: "EH-5-script",
  _backfillReason: "Detected keyword: สายขาด"
}
```

---

## 🔄 งานที่ต้องทำต่อ

### [QA] — EH-8 (ตอนนี้ทำได้แล้ว)

Test cases เพิ่มเติมสำหรับ backfill:
1. รัน DRY RUN → ตรวจสอบว่า detect ถูกต้อง (ตัวอย่าง comment ที่มีคำสำคัญ)
2. รัน LIVE RUN บน dev → ตรวจ Firestore ว่า fields ถูกเพิ่ม
3. ตรวจสอบว่า docs ที่ไม่มีคำสำคัญ ไม่ถูกแตะ (equipmentCondition ยังเป็น null)

### [SE] — EH-6 + EH-7 (ลำดับถัดไป)

- **EH-7** (3 hr): `frontend/components/EquipmentCharts.js`
- **EH-6** (4 hr): `frontend/app/admin/equipment-health/page.js`

Data สำหรับ test:
```javascript
// ตัวอย่าง worklog ที่ backfill แล้ว
{
  id: "abc123",
  minorTask: "คืนหูฟัง",
  comment: "ICIT05 สายขาด",
  equipmentCondition: "damaged",
  equipmentNote: "ICIT05 สายขาด",
  _backfilledAt: Timestamp
}
```

### [PM] — TASKS.md Update

- [ ] ทำเครื่องหมาย EH-5 complete
- [ ] ตั้งค่า deadline EH-8 (QA)
- [ ] Assign EH-6/EH-7 ให้ SE ต่อ

---

## ⚠️ Important Notes

1. **ไม่ต้อง backfill "normal"**: worklog ใหม่จะได้ default "normal" จาก EH-4 อยู่แล้ว
2. **Reversible**: ถ้าผิดพลาด สามารถลบ fields `_backfilledAt`, `_backfilledBy`, `_backfillReason`, `equipmentCondition`, `equipmentNote` ออกได้
3. **Query ที่ใช้**: script จะ query เฉพาะ `minorTask` ที่เกี่ยวข้องกับอุปกรณ์ (ยืม/คืน/ห้อง) และมี `equipmentCondition == null`

---

## ประวัติการแก้ไข

| วันที่ | ผู้แก้ไข | รายละเอียด |
|--------|---------|-----------|
| 2026-06-04 | [DA] | EH-5 implement backfillEquipmentCondition.js |
