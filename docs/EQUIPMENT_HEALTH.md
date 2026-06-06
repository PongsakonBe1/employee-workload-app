# Equipment Health Dashboard — คู่มือใช้งาน

**เวอร์ชัน:** v2.3.0  
**สถานะ:** ✅ QA Sign-off (EH-8 — 7/7 test cases passed)  
**ผู้รับผิดชอบ:** [SE] + [QA] + [Doc]

---

## ภาพรวม

ระบบติดตามสุขภาพอุปกรณ์ของ ICIT — บันทึกสภาพอุปกรณ์ (หูฟัง/ปลั๊กไฟ) ทุกครั้งที่ Staff คืน เพื่อให้ Admin ดูแนวโน้มชำรุด/สูญหาย และวางแผนซ่อมบำรุงได้

---

## Flow การใช้งาน (Staff)

```
Staff กด "คืนหูฟัง" / "คืนปลั๊กไฟ"
        │
        ▼
EquipmentReturnModal เปิดขึ้น
        │
        ├─ [✓ สมบูรณ์]   → บันทึก equipmentCondition: "normal"   (1 click)
        ├─ [⚠️ ชำรุด]   → กรอก note → บันทึก equipmentCondition: "damaged"
        └─ [❌ สูญหาย]   → กรอก note → บันทึก equipmentCondition: "lost"
        │
        ▼
worklog document ถูก update ด้วย equipmentCondition + equipmentNote
```

**Trigger:** เฉพาะ `minorTask` ในกลุ่ม "คืน" เช่น:
- `"คืนหูฟัง"`
- `"คืนปลั๊กไฟ"`
- `"ปิดห้อง"` (ถ้าตั้งค่าไว้)

---

## หน้า Dashboard — `/admin/equipment-health`

### สิทธิ์การเข้าถึง

| Role | การเข้าถึง |
|------|-----------|
| Staff | ❌ redirect → `/dashboard` |
| Admin | ✅ |
| Superadmin | ✅ |

### องค์ประกอบหน้า

#### 1. Stat Cards (4 ใบ)

| Card | นับจาก | สี |
|------|-------|-----|
| สมบูรณ์ | `equipmentCondition === "normal"` | เขียว |
| ชำรุด | `equipmentCondition === "damaged"` | เหลือง |
| สูญหาย | `equipmentCondition === "lost"` | แดง |
| คืนทั้งหมด | ทุก record ที่มี equipmentCondition | น้ำเงิน |

#### 2. Filters

**Filter ประเภท:**
- ทั้งหมด
- หูฟัง (ICIT01–ICIT20)
- ปลั๊กไฟ (ICIT21–ICIT25)

**Filter สภาพ:**
- ทุกสภาพ
- สมบูรณ์ (`normal`)
- ชำรุด (`damaged`)
- สูญหาย (`lost`)

#### 3. Charts

| Component | ชนิด | ข้อมูล |
|-----------|------|--------|
| `EquipmentDamageChart` | Stacked Bar Chart | normal/damaged/lost รายเดือน |
| `DamageCategoryPie` | Pie Chart + Legend | สัดส่วนสภาพทั้งหมด |
| `EquipmentHealthTimeline` | Line Chart | trend หูฟัง vs ปลั๊กไฟ รายเดือน |

**Color Scheme:**
- `normal` → `green-500` (#22c55e)
- `damaged` → `amber-500` (#f59e0b)
- `lost` → `red-500` (#ef4444)

#### 4. ตารางรายละเอียด

แสดงสูงสุด **200 แถว** (performance limit) — คอลัมน์:

| คอลัมน์ | Field |
|---------|-------|
| วันที่ | `date` |
| เวลา | `time` |
| พนักงาน | `employeeDisplayName` |
| อุปกรณ์ | `minorTask` |
| สภาพ | `equipmentCondition` (แปลงเป็นภาษาไทย) |
| หมายเหตุ | `equipmentNote` |

#### 5. Export CSV

- Encoding: **UTF-8 BOM** (รองรับ Excel ภาษาไทย)
- ชื่อไฟล์: `equipment-health-YYYY-MM-DD.csv`
- คอลัมน์ตรงกับตาราง

---

## Field Schema

### Fields ใหม่ใน `worklogs/{id}` (v2.3.0+)

```javascript
{
  // Equipment Health (optional — บันทึกตอนคืนอุปกรณ์เท่านั้น)
  equipmentCondition: "normal" | "damaged" | "lost" | null,
  equipmentNote: string | null,     // รายละเอียดสภาพ (เมื่อ damaged/lost)

  // Backfill Metadata (optional — จาก backfillEquipmentCondition.js)
  _backfilledAt: Timestamp | null,  // วันที่ backfill
  _backfilledBy: string | null,     // "backfill-script"
  _backfillReason: string | null    // keyword ที่ match เช่น "สายขาด"
}
```

### Backward Compatibility

- `worklogs` ที่สร้างก่อน v2.3.0 จะมี `equipmentCondition: null`
- Dashboard filter "ทุกสภาพ" รวม null records ไว้ใน stat card "คืนทั้งหมด"
- Backfill script (`scripts/backfillEquipmentCondition.js`) ช่วย parse comment เก่าและเติม field

---

## Backfill Script — `scripts/backfillEquipmentCondition.js`

### วัตถุประสงค์

Parse `comment` field ของ worklogs เก่า → ตรวจหา keyword ชำรุด/สูญหาย → เติม `equipmentCondition` ย้อนหลัง

### Keywords ที่ตรวจ

| สภาพ | Keywords |
|------|---------|
| `damaged` | ชำรุด, เสีย, หัก, พัง, broken, damaged, สายขาด, ฯลฯ (13 คำ) |
| `lost` | สูญหาย, หาย, lost, missing, not returned, ฯลฯ (8 คำ) |

### วิธีรัน

```bash
cd scripts

# Step 1: DRY RUN (ดูผลโดยไม่แก้จริง — default)
node backfillEquipmentCondition.js

# Step 2: ตรวจผล DRY RUN ให้แน่ใจก่อน

# Step 3: LIVE RUN (แก้จริง — ต้องมี serviceAccountKey.json)
DRY_RUN=false node backfillEquipmentCondition.js
```

> ⚠️ **ต้องมี `serviceAccountKey.json`** ในโฟลเดอร์ `scripts/` ก่อนรัน  
> ขอได้จาก Firebase Console → Project Settings → Service Accounts → Generate new private key  
> **อย่า commit ไฟล์นี้** — อยู่ใน `.gitignore` แล้ว

### Safety Features

| Feature | รายละเอียด |
|---------|-----------|
| DRY RUN default | ไม่แก้ข้อมูลจริงถ้าไม่ set `DRY_RUN=false` |
| 5-second delay | หน่วง 5 วินาทีพร้อม countdown ก่อน LIVE run |
| Batch processing | ประมวลผลครั้งละ 500 documents |
| Rate limiting | หน่วง 100ms ระหว่าง batch ป้องกัน Firestore throttle |
| Skip existing | ข้าม document ที่มี `equipmentCondition` อยู่แล้ว |
| Audit trail | บันทึก `_backfilledAt`, `_backfilledBy`, `_backfillReason` ทุก document ที่แก้ |
| Targeted query | Query เฉพาะ `minorTask` ที่เกี่ยวกับการคืน (8 ประเภท) |

---

## Files ที่เกี่ยวข้อง

| ไฟล์ | บรรทัด | หน้าที่ |
|------|--------|--------|
| `frontend/components/EquipmentReturnModal.js` | ~150 | Modal เลือกสภาพตอนคืน |
| `frontend/components/QuickLogButtons.js` | (แก้) | เพิ่ม `isReturnTemplate()` + state + handler |
| `frontend/lib/quickLogTemplates.js` | (แก้) | เพิ่ม `equipmentCondition` + `equipmentNote` |
| `frontend/components/EquipmentCharts.js` | ~243 | Chart components ทั้ง 3 |
| `frontend/app/admin/equipment-health/page.js` | ~336 | Dashboard page ครบชุด |
| `frontend/app/admin/page.js` | (แก้) | เพิ่ม link "สุขภาพอุปกรณ์" |
| `frontend/tests/equipment-health-eh8.spec.js` | ~11 tests | Playwright E2E tests |
| `scripts/backfillEquipmentCondition.js` | ~290 | Backfill script |

---

## QA Sign-off (EH-8)

| Test | ผล |
|------|----|
| TEST-1: Admin guard — Staff redirect | ✅ |
| TEST-2: Stat Cards 4 ใบ | ✅ |
| TEST-3: Filter ประเภท | ✅ |
| TEST-4: Filter สภาพ | ✅ |
| TEST-5: Export CSV UTF-8 BOM | ✅ |
| TEST-6: Charts Bar + Pie + Timeline | ✅ |
| TEST-7: Empty state ไม่ crash | ✅ |

**QA Sign-off: ✅ 7/7 — พร้อม production (v2.3.0)**  
รายงานเต็ม: `QA_REPORT.md` Section 9–10

---

*Equipment Health Dashboard Guide · [Doc] · 4 มิ.ย. 2569 · EH-9*
