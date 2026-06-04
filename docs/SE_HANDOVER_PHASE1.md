# [SE] → Handover: Phase 0 Complete + Phase 1 Ready

**วันที่:** 2026-06-04  
**Branch:** `hotfix/bugfix-sprint-jun04`  
**จาก:** [SE] Software Engineer  
**ถึง:** [UX/UI], [DA], [QA], [Doc]

---

## ✅ งานที่เสร็จแล้ว

### Bugfix Sprint Jun 04 (branch: `hotfix/bugfix-sprint-jun04`)

| Bug | ไฟล์ | สถานะ |
|-----|------|--------|
| BUG-1: SmartEquipmentModal สถานะค้าง | `SmartEquipmentModal.js` — reverse logs ascending | ✅ |
| BUG-1: SmartModal ไม่รับ CustomEvent | `SmartEquipmentModal.js`, `SmartRoomModal.js` | ✅ |
| BUG-3: CSV dutyGroup แสดง raw key | `export/page.js` — `dutyGroupLabel()` | ✅ |
| BUG-4: QuickLog/Combo ไม่มี status | `quickLogTemplates.js` — เพิ่ม `status: "บันทึกแล้ว"` | ✅ |
| BUG-5: Staff ลบ/แก้ไข worklog ไม่ได้ | `firestore.rules` + `worklogs/page.js` | ✅ |

### Phase 0 Critical Fixes (branch: `feature/dashboard-analytics-v230`)

| Task | รายละเอียด | สถานะ |
|------|-----------|--------|
| CF-1: Timezone Bug | `log.date + "T00:00:00"` — ป้องกัน UTC shift | ✅ แก้แล้ว |
| CF-2: Aggregate Data | ใช้ `allWorklogsInRange.forEach` แทน `worklogs.forEach` | ✅ แก้แล้ว |
| CF-3: Duplicate Error | error block เหลือ 1 จุด (บรรทัด 798) | ✅ แก้แล้ว |
| CF-4: Leaderboard Query | ใช้ `allWorklogsInRange` แทน query Firestore ซ้ำ | ✅ แก้แล้ว |

### อื่นๆ
- Version bump → `v2.2.1` ใน `AppShell.js`
- Edit success toast (yellow, portal) ใน `worklogs/page.js`
- Firestore Rules `resource.data.get('locked', false)` + `get('createdBy', '')` สำหรับ optional fields

---

## 🔄 งานที่ต้องทำต่อ (Phase 1)

### สำหรับ [UX/UI] — EH-3 (ต้องทำก่อน SE เริ่ม EH-4)
- ออกแบบ `EquipmentReturnModal`: trigger ตอนคืนหูฟัง/ปลั๊กไฟ/ปิดห้อง
- Pattern: ดู `SmartEquipmentModal.js` เป็น reference
- Default: `[✓] สมบูรณ์`, option: `[ชำรุด]` → text input, max 2 clicks ถ้าปกติ
- **Schema ที่ SA ออกแบบ:** `equipmentCondition: "normal"|"damaged"|"lost"`, `equipmentNote: string`

### สำหรับ [DA] — EH-5
- สร้าง `scripts/backfillEquipmentCondition.js`
- Parse comment หา "ชำรุด/เสีย/หัก/สูญหาย" → อัปเดต `equipmentCondition` ย้อนหลัง
- **Safety:** รันบน dev ก่อน + backup ก่อน production

### สำหรับ [QA] — QA-1 + EH-8
- สร้าง Playwright auth fixtures: `superadmin.json`, `staff.json`
- เขียน test BUG-5: staff login → worklog list → ปุ่มลบ/แก้ไขวันนี้กดได้
- หลัง EH-4~EH-7 เสร็จ: ทดสอบ ยืม→คืนปกติ, ยืม→คืน+ชำรุด+โน๊ต

### สำหรับ [SE] (Phase 1 ต่อ — รอ EH-3 จาก UX/UI)
- **EH-4** (3 hr): สร้าง `frontend/components/EquipmentReturnModal.js` + เชื่อมจาก `QuickLogButtons.js`
- **EH-7** (3 hr): สร้าง `frontend/components/EquipmentCharts.js` (3 charts)
- **EH-6** (4 hr): สร้าง `frontend/app/admin/equipment-health/page.js`

---

## 📋 Dependencies Phase 1

```
[UX/UI] EH-3 Design ← ต้องทำก่อน
    ↓
[SE] EH-4 EquipmentReturnModal
    ↓
[SE] EH-7 EquipmentCharts (parallel กับ EH-4)
    ↓
[SE] EH-6 Admin Equipment Health Page
    ↓
[DA] EH-5 Backfill (parallel กับ SE EH-6)
    ↓
[QA] EH-8 Test
    ↓
[Doc] EH-9 README + EQUIPMENT_HEALTH.md
```

---

## ⚠️ Notes สำหรับทุกฝ่าย

- **Firestore Rules** พร้อมแล้ว — ไม่ต้องรอ SA
- **Schema fields:** ใช้ `equipmentCondition` และ `equipmentNote` ตามที่ SA กำหนดเท่านั้น อย่าเปลี่ยน
- **Branch ปัจจุบัน:** `hotfix/bugfix-sprint-jun04` — ยัง merge เข้า main ยังไม่ได้ รอ QA sign off
- **Dashboard Phase 0** อยู่ใน branch `feature/dashboard-analytics-v230`

---

## ประวัติการแก้ไข

| วันที่ | ผู้แก้ไข | รายละเอียด |
|--------|---------|-----------|
| 2026-06-04 | [SE] | Bugfix Sprint Jun 04 + Phase 0 CF-1~CF-4 complete |
