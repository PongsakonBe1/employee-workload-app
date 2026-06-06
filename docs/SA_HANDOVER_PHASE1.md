# [SA] → [SE] Handover: Phase 1 Equipment Health Tracking

**วันที่:** 2026-06-04  
**Branch:** `feature/dashboard-analytics-v230`  
**จาก:** [SA] System Architect  
**ถึง:** [SE] Software Engineer (Phase 0 CF-1~CF-4 + Phase 1 EH-1~EH-9)

---

## ✅ [SA] งานที่เสร็จแล้ว (Pre-Phase 0)

### 1. Phase 1 Schema Design (EH-1)

#### Worklog Fields เพิ่มใหม่
```javascript
// worklogs collection - fields ใหม่
{
  equipmentCondition: "normal" | "damaged" | "lost",  // enum 3 ค่า
  equipmentNote: "string"  // บันทึกสาเหตุ/รายละเอียดเพิ่มเติม
}
```

#### กรณีใช้งาน (Use Cases)
| equipmentCondition | สถานการณ์ | UI Behavior |
|-------------------|-----------|-------------|
| `normal` | คืนอุปกรณ์ปกติ | Default checked, ไม่ต้องกรอก note |
| `damaged` | อุปกรณ์ชำรุด | Unchecked normal, บังคับกรอก note |
| `lost` | อุปกรณ์สูญหาย | Unchecked normal, บังคับกรอก note |

---

### 2. Firestore Rules (EH-2) — ✅ Deployed

#### บรรทัดที่แก้ไข
```javascript
// firebase/firestore.rules (line ~112-115)
// อนุญาติให้ worklog create/update มี equipmentCondition + equipmentNote

// อยู่ใน generic validation function isValidWorkLog() อยู่แล้ว
// ไม่ต้องแก้ rules เพิ่ม — SE ใช้ได้เลย
```

#### Security Rules ที่เกี่ยวข้อง
| Operation | Rule | สถานะ |
|-----------|------|--------|
| Create worklog | `isValidWorkLog()` ตรวจ schema | ✅ พร้อม |
| Update worklog | `isOwner() && !isLocked() && isSameDay()` | ✅ พร้อม |
| Delete worklog | `isAdmin() \|\| (isOwner() && !isLocked() && isSameDay())` | ✅ พร้อม |

**Note:** `equipmentCondition` และ `equipmentNote` ผ่าน generic validation อยู่แล้ว ไม่ต้องแก้ rules

---

## 🔄 ส่งต่อให้ [SE] — งานที่ต้องทำ

### Phase 0 (ทำก่อน Day 1-2)

#### CF-1: Timezone Bug Fix
```javascript
// แก้ไขใน dashboard aggregation
// เปลี่ยนใช้ startOfDay Bangkok timezone แทน UTC
const bangkokDate = new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' });
```

#### CF-2: Aggregate Data Logic
```javascript
// รวมข้อมูลหลายช่วงเวลาให้ถูกต้อง
// ใช้ fiscal year calculation จาก DA Audit
```

#### CF-3: Error Display
```javascript
// แสดง error message ชัดเจนเมื่อ fetch ข้อมูลล้มเหลว
// ใช้ error boundary หรือ toast notification
```

#### CF-4: Query Redundancy
```javascript
// ลบ query ซ้ำซ้อน รวมเป็น single batch query
// ใช้ Promise.all() สำหรับ parallel requests
```

---

### Phase 1 (Day 3-5, หลัง CF-4 เสร็จ)

#### EH-3 → EH-4: EquipmentReturnModal
```javascript
// สร้าง component ใหม่ frontend/components/EquipmentReturnModal.js
// Pattern: ใช้ SmartEquipmentModal เป็น reference

const [equipmentCondition, setEquipmentCondition] = useState('normal');
const [equipmentNote, setEquipmentNote] = useState('');

// Validation
const isValid = equipmentCondition === 'normal' || equipmentNote.trim().length > 0;
```

#### EH-7: Equipment Charts
```javascript
// 3 charts ใหม่:
// 1. EquipmentDamageChart - แสดงอัตราชำรุดรายเดือน
// 2. EquipmentHealthTimeline - timeline ของอุปกรณ์แต่ละชิ้น
// 3. DamageCategoryPie - สัดส่วนประเภทความเสียหาย
```

#### EH-6: Admin Equipment Health Page
```javascript
// สร้าง frontend/app/admin/equipment-health/page.js
// Features: Damage Rate, Timeline, Pie Chart, Export CSV
```

---

## 📋 Dependencies ตามลำดับ

```
[SA] Schema Design ✅
    ↓
[UX/UI] EH-3 Design
    ↓
[SE] CF-1 ~ CF-4 (Phase 0)  ← ทำตอนนี้
    ↓
[SE] EH-4 ~ EH-7 (Phase 1)
    ↓
[DA] EH-5 Backfill
    ↓
[QA] EH-8 Test
    ↓
[Doc] EH-9 Documentation
```

---

## 🔗 Files ที่ [SE] ต้องแก้ไข

### Phase 0 (CF-1~CF-4)
| File | การเปลี่ยนแปลง |
|------|---------------|
| `frontend/app/dashboard/page.js` | Timezone, aggregation, error handling, query optimization |

### Phase 1 (EH-4~EH-7)
| File | การเปลี่ยนแปลง |
|------|---------------|
| `frontend/components/EquipmentReturnModal.js` | สร้างใหม่ |
| `frontend/components/EquipmentCharts.js` | สร้างใหม่ (3 charts) |
| `frontend/app/admin/equipment-health/page.js` | สร้างใหม่ |
| `frontend/components/QuickLogButtons.js` | เชื่อม EquipmentReturnModal |

---

## ⚠️ Important Notes

### สำหรับ Phase 0 (CF-1~CF-4)
1. **ทดสอบบน timezone Bangkok** - อย่าใช้ UTC date
2. **Aggregate ข้อมูล** - ตรวจสอบ fiscal year ตาม academic calendar
3. **Error handling** - แสดง UI ชัดเจนเมื่อเกิด error
4. **Performance** - ลดจำนวน query ไป Firestore

### สำหรับ Phase 1 (EH-1~EH-9)
1. **ใช้ Schema ที่ [SA] ออกแบบ** - อย่าเปลี่ยน field names
2. **Firestore Rules พร้อมแล้ว** - ไม่ต้องรอ SA
3. **Pattern จาก SmartEquipmentModal** - ใช้เป็น reference ได้เลย
4. **EquipmentNote validation** - บังคับกรอกถ้าไม่ใช่ 'normal'

---

## 📞 Questions?

ถ้ามีคำถามเรื่อง:
- **Schema/Firestore Rules** → ถาม [SA]
- **UI/UX Design** → ถาม [UX/UI] (EH-3)
- **Implementation** → [SE] ทำเอง (ตามนี้)
- **Testing** → ถาม [QA] (หลัง EH-8)

---

**[SA] Handover Complete** ✅  
**[SE] Ready to start CF-1~CF-4** 🚀

---

## ประวัติการแก้ไข

| วันที่ | ผู้แก้ไข | รายละเอียด |
|--------|---------|-----------|
| 2026-06-04 | [SA] | ออกแบบ Schema Phase 1, ตรวจสอบ Firestore Rules |
