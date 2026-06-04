# Staff Analytics Guide — คู่มือวิเคราะห์ประสิทธิภาพพนักงาน

**เวอร์ชัน:** v2.3.0 (Phase 3)  
**สถานะ:** ✅ QA Sign-off (SR-7 — 6/6 test cases passed)  
**Branch:** `feature/dashboard-analytics-v230`  
**Metrics Spec:** ดูรายละเอียดเต็มที่ [`docs/STAFF_METRICS_SPEC.md`](STAFF_METRICS_SPEC.md)

---

## ภาพรวม

ระบบประเมินประสิทธิภาพพนักงาน 6 มิติด้วย Radar Chart — ช่วย Admin เห็นจุดแข็ง/จุดพัฒนาของแต่ละคน เปรียบเทียบสูงสุด 3 คน และใช้ข้อมูลในการ 1-on-1 coaching หรือวางแผน staffing

---

## ตำแหน่งในระบบ

**Admin Menu → "Staff Analytics"** → `/admin/staff-analytics`

- เข้าถึงได้: **Admin / Superadmin เท่านั้น**
- Staff ถูก redirect ไป `/dashboard` อัตโนมัติ

---

## วิธีอ่าน Radar Chart 6 มิติ

```
             Volume (ปริมาณ)
                  △
                 /|\
                / | \
Versatility ◁──/──●──\──▷ Combo Usage
(ความหลากหลาย)  / ╲ / \   (ใช้ combo)
              /   ╲/   \
             ▽    ▽    ▽
    Consistency  Peak   Documentation
    (สม่ำเสมอ)  Handling (เอกสาร)
               (ช่วงพีค)
```

**กฎง่ายๆ:** พื้นที่ hexagon ใหญ่ = ประสิทธิภาพโดยรวมดี

---

## คำอธิบาย 6 มิติ (Axes)

| # | มิติ | ชื่อไทย | วัดจาก | คะแนนสูง = ? |
|---|-----|--------|--------|-------------|
| 1 | **Volume** | ปริมาณงาน | จำนวน worklogs ต่อช่วงเวลา | บันทึกงานมาก/สม่ำเสมอ |
| 2 | **Versatility** | ความหลากหลาย | จำนวน `minorTask` ที่แตกต่างกัน | ทำงานหลายประเภท |
| 3 | **Consistency** | ความสม่ำเสมอ | CV (Coefficient of Variation) งานต่อวัน | งานสม่ำเสมอทุกวัน |
| 4 | **Peak Handling** | จัดการช่วงพีค | สัดส่วนงานช่วง 14:00–17:00 | รับงานช่วงไฟแรงได้ดี |
| 5 | **Documentation** | เอกสารละเอียด | สัดส่วน comment ≥ 20 ตัวอักษร | บันทึกรายละเอียดครบ |
| 6 | **Combo Usage** | ใช้ combo | อัตราการใช้ Combo Template | ใช้เครื่องมือช่วยงาน |

**ช่วงคะแนน:** 0–100 ทุกมิติ (normalized)

---

## ส่วนประกอบของหน้า

### 1. Time Range Selector

| ตัวเลือก | ช่วงเวลา |
|---------|---------|
| 1M | 1 เดือนล่าสุด |
| 3M | 3 เดือนล่าสุด |
| 6M | 6 เดือนล่าสุด |
| 1Y | 1 ปีล่าสุด |

> ยิ่งช่วงเวลายาว ค่า Consistency ยิ่งน่าเชื่อถือ — แนะนำ **3M+** สำหรับการประเมินจริง

### 2. Rankings Table

ตารางเรียงอันดับพนักงานตามคะแนนเฉลี่ยทุกมิติ:
- คลิก header เปลี่ยน sort ได้ (Volume / Versatility / ฯลฯ)
- แถบสีแสดงระดับคะแนน: 🟢 ≥70 / 🟡 40–69 / 🔴 <40
- ปุ่ม **"เลือกเปรียบเทียบ"** เพิ่มเข้า Compare mode (สูงสุด 3 คน)

### 3. Radar Chart — Single Mode

เลือก 1 คน → แสดง:
- **Radar Chart** สีน้ำเงิน (`indigo-500`)
- **เส้นประเทา** = ค่าเฉลี่ยทีม (benchmark)
- **ScoreBadge** ข้างกราฟ: คะแนนรวม, จุดแข็ง 2 อันดับ, จุดพัฒนาได้ 2 อันดับ

### 4. Radar Chart — Compare Mode

เลือก 2–3 คน → แสดงซ้อนกันใน chart เดียว:

| Slot | สี | ใช้สำหรับ |
|------|----|---------|
| 1 | 🔵 `indigo-500` | พนักงานคนแรก |
| 2 | 🟡 `amber-500` | พนักงานคนที่ 2 |
| 3 | 🟢 `emerald-500` | พนักงานคนที่ 3 |
| benchmark | ⬜ `slate-400` เส้นประ | ค่าเฉลี่ยทีม |

### 5. ScoreBadge

```
┌─────────────────────────────────┐
│  พงศกร ร.          คะแนนรวม: 74 │
│                                  │
│  จุดแข็ง:                        │
│  ● Volume          88/100        │
│  ● Documentation   82/100        │
│                                  │
│  พัฒนาได้:                        │
│  ● Combo Usage     23/100        │
│  ● Consistency     41/100        │
└─────────────────────────────────┘
```

> ⚠️ **พนักงานใหม่:** ถ้ามี worklogs < 3 รายการ จะแสดง warning "ข้อมูลน้อยเกินไป — ผลอาจไม่แม่นยำ"

### 6. Export CSV

คลิก **"Export CSV"** ได้ไฟล์ `staff-analytics-YYYY-MM-DD.csv` — 8 คอลัมน์:

| คอลัมน์ | Field |
|---------|-------|
| พนักงาน | `staffName` |
| Volume | 0–100 |
| Versatility | 0–100 |
| Consistency | 0–100 |
| Peak Handling | 0–100 |
| Documentation | 0–100 |
| Combo Usage | 0–100 |
| คะแนนเฉลี่ย | avg of 6 metrics |

---

## การตีความผล — Interpretation Guide

### Pattern ที่พบบ่อยและความหมาย

| Pattern | ลักษณะ Radar | ความหมาย | แนวทาง |
|---------|-------------|----------|--------|
| **All-rounder** | Hexagon สมดุลรอบด้าน | พนักงานที่ครบ — ไว้วางใจได้ทุกงาน | ให้เป็น mentor |
| **High Volume, Low Consistency** | Volume สูง, Consistency ต่ำ | ทำงานเยอะแต่ไม่สม่ำเสมอ — อาจมีวันลืมบันทึก | ตรวจ habit การบันทึก |
| **High Versatility, Low Documentation** | Versatility สูง, Documentation ต่ำ | ทำงานหลายอย่างแต่บันทึกสั้น | สอนการเขียน comment ละเอียด |
| **Low Peak Handling** | Peak Handling ต่ำมาก | ไม่รับงานช่วงบ่าย 14–17 น. | ตรวจตารางทำงาน/ลา |
| **Low Combo Usage** | Combo ต่ำมาก | ไม่รู้จัก Combo Template | สอนใช้ Quick Log + Combo |
| **Flat Low** | Hexagon เล็กมากทุกด้าน | พนักงานใหม่ หรือ บันทึกน้อยมาก | รอข้อมูล 1 เดือน |

---

## Case Study: ใช้ใน 1-on-1 Meeting

### Scenario: พงศกร — Volume สูง แต่ Consistency ต่ำ

```
Radar ที่เห็น:
- Volume:       88 ↑ (สูงกว่า team avg 62)
- Consistency:  34 ↓ (ต่ำกว่า team avg 71)
- Versatility:  75
- Peak Handling: 68
- Documentation: 72
- Combo Usage:   45
```

**วิธีเปิดบทสนทนา:**

> "คุณพงศกรทำงานปริมาณมากมาก (อันดับ 1 ในทีม) แต่เราเห็นว่า Consistency ค่อนข้างต่ำ — มีบางสัปดาห์ที่ไม่ค่อยมีงานเลย ลองดูว่าช่วงนั้นมีอะไรเป็นพิเศษไหมครับ?"

**Action items:**
1. ตรวจ worklogs สัปดาห์ที่ gap ใหญ่ — ลาหรือลืมบันทึก?
2. ถ้าลืมบันทึก → แนะนำ Push Notification reminder
3. ถ้าลา → ข้อมูลปกติ ไม่ต้องกังวล

---

### Scenario: เปรียบเทียบ 3 คน — วางแผน Staffing ช่วงสอบ

```
ใช้ Compare mode เลือก: พงศกร / สมชาย / นิภา

สิ่งที่เห็น:
- Peak Handling: พงศกร(68) > สมชาย(45) > นิภา(82)
- นิภา มี Peak Handling สูงสุด
```

**ข้อสรุป:** ช่วงสอบ (ต.ค./มี.ค.) ที่งานหนาแน่น → จัดตาราง **นิภา** เป็น Lead ช่วง 14–17 น.

---

## Benchmark (ค่าเฉลี่ยทีม)

เส้นประเทาในกราฟคือ `getTeamAverage()` — คำนวณจากพนักงานทุกคนในช่วงเวลาที่เลือก

```javascript
import { getTeamAverage } from '@/lib/staffMetrics';

const benchmark = getTeamAverage(allStaffMetrics);
// benchmark: { volume: 62, versatility: 58, consistency: 71, ... }
```

> ค่า benchmark เปลี่ยนตาม **Time Range** ที่เลือก — เลือก range เดียวกันเสมอเมื่อเปรียบเทียบ

---

## Files ที่เกี่ยวข้อง

| ไฟล์ | หน้าที่ |
|------|--------|
| `frontend/lib/staffMetrics.js` | Core metrics: 6 calculation functions + normalizeMetric + getTeamAverage |
| `frontend/lib/staffMetrics.test.js` | Unit tests 50+ cases (SR-2) |
| `frontend/components/StaffRadarChart.js` | Radar Chart, ScoreBadge, metricsToChartData, AXES, SLOT_COLORS |
| `frontend/app/admin/staff-analytics/page.js` | Dashboard: rankings, time range, compare, CSV export |
| `frontend/app/admin/page.js` | Admin menu link |
| `frontend/tests/staff-radar-sr7.spec.js` | Playwright E2E tests (8 tests) |
| `docs/STAFF_METRICS_SPEC.md` | Metric definition ฉบับสมบูรณ์ (สูตร + edge cases) |

---

## QA Sign-off (SR-7)

| Test | รายละเอียด | ผล |
|------|-----------|-----|
| TEST-1 | Single mode: Radar + ScoreBadge | ✅ |
| TEST-2 | Compare mode: 3 staff + Legend | ✅ |
| TEST-3 | Benchmark: dashed slate line | ✅ |
| TEST-4 | CSV Export: 8 columns | ✅ |
| TEST-5 | Empty state: ไม่ crash | ✅ |
| TEST-6 | New employee: worklogs < 3 warning | ✅ |

**QA Sign-off: ✅ 6/6 — พร้อม production (v2.3.0 Phase 3)**  
รายงานเต็ม: `QA_REPORT.md` Section 12

---

*Staff Analytics Guide · [Doc] · 4 มิ.ย. 2569 · SR-8*
