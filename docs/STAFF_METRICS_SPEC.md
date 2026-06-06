# Staff Metrics Specification
## Phase 3 SR-1 — Staff Efficiency Radar Chart

**Prepared by:** DA (Data Analyst)  
**Date:** 2026-06-04  
**Version:** 1.0  
**Target:** v2.3.0 Phase 3  

---

## Overview

Specification สำหรับ 6 metrics ใช้ใน Staff Efficiency Radar Chart ประเมินพนักงานแบบ objective โดยไม่ต้องใช้อัตราแก้ไขสำเร็จหรือความเร็วในการตอบสนอง (ไม่มีข้อมูลในระบบ)

**Principles:**
- คำนวณจาก `worklogs` ที่มีอยู่ทั้งหมด
- Normalize เป็น scale 0-100 เพื่อแสดงบน radar chart
- แต่ละ metric มีค่า max ที่ achievable (ไม่ใช่ theoretical max)

---

## Metrics Definition

### 1. Volume
**คำอธิบาย:** จำนวนงานที่พนักงานทำในช่วงเวลาที่เลือก

**Formula:**
```javascript
volume = Math.min((totalWorklogs / 50) * 100, 100)
```

**Parameters:**
- `totalWorklogs` — จำนวน worklogs ของพนักงานใน date range
- `maxReference` — 50 งาน (baseline สำหรับ 100%)

**Interpretation:**
- 100% = 50+ งานใน period (เช่น 1 เดือน)
- 50% = 25 งาน
- เกณฑ์: ประมาณ 2 งาน/วัน = 100% ต่อเดือน

**Calculation:**
```javascript
function calculateVolume(employeeId, worklogs, dateRange) {
  const empLogs = worklogs.filter(w => 
    w.employeeId === employeeId &&
    w.date >= dateRange.start &&
    w.date <= dateRange.end
  );
  return Math.min((empLogs.length / 50) * 100, 100);
}
```

---

### 2. Versatility
**คำอธิบาย:** ความหลากหลายของประเภทงานที่ทำ (multi-skilling)

**Formula:**
```javascript
versatility = Math.min((uniqueMinorTasks / 10) * 100, 100)
```

**Parameters:**
- `uniqueMinorTasks` — จำนวน unique `minorTask` ที่พนักงานทำ
- `maxReference` — 10 unique tasks (baseline สำหรับ 100%)

**Interpretation:**
- 100% = ทำงานได้ 10+ ประเภท
- 50% = 5 ประเภท
- พนักงานที่ทำงานซ้ำซากจะมีค่าต่ำ

**Calculation:**
```javascript
function calculateVersatility(employeeId, worklogs, dateRange) {
  const empLogs = worklogs.filter(w => 
    w.employeeId === employeeId &&
    w.date >= dateRange.start &&
    w.date <= dateRange.end
  );
  const uniqueTasks = new Set(empLogs.map(w => w.minorTask)).size;
  return Math.min((uniqueTasks / 10) * 100, 100);
}
```

---

### 3. Consistency
**คำอธิบาย:** ความสม่ำเสมอของจำนวนงานรายวัน (ไม่กระจุกตัว)

**Formula:**
```javascript
// Coefficient of Variation (CV) = std / mean
cv = standardDeviation(dailyCounts) / mean(dailyCounts)
consistency = Math.max(0, 100 - (cv * 50))
```

**Parameters:**
- `dailyCounts` — array ของจำนวนงานต่อวัน
- `mean` — ค่าเฉลี่ยงานต่อวัน
- `std` — standard deviation

**Interpretation:**
- 100% = ทำงานจำนวนเท่ากันทุกวัน (CV = 0)
- 50% = CV = 1.0 (std = mean)
- 0% = CV >= 2.0 (fluctuation สูงมาก)

**Calculation:**
```javascript
function calculateConsistency(employeeId, worklogs, dateRange) {
  const empLogs = worklogs.filter(w => 
    w.employeeId === employeeId &&
    w.date >= dateRange.start &&
    w.date <= dateRange.end
  );
  
  // Group by date
  const byDate = {};
  empLogs.forEach(w => {
    byDate[w.date] = (byDate[w.date] || 0) + 1;
  });
  
  const dailyCounts = Object.values(byDate);
  if (dailyCounts.length === 0) return 0;
  if (dailyCounts.length === 1) return 100; // ทำงานแค่วันเดียว = perfect consistency
  
  const mean = dailyCounts.reduce((a, b) => a + b, 0) / dailyCounts.length;
  const variance = dailyCounts.reduce((sum, count) => 
    sum + Math.pow(count - mean, 2), 0) / dailyCounts.length;
  const std = Math.sqrt(variance);
  
  const cv = std / mean;
  return Math.max(0, 100 - (cv * 50));
}
```

**Edge Cases:**
- ไม่มีงาน → 0%
- ทำงานแค่วันเดียว → 100% (perfect consistency)
- ทำงานทุกวันเท่ากันพอดี → 100%

---

### 4. Peak Handling
**คำอธิบาย:** อัตราส่วนงานที่ทำในช่วง peak hours (งานหนัก)

**Formula:**
```javascript
peakHandling = (worklogsInPeakHours / totalWorklogs) * 100
```

**Peak Hours Definition:**
```javascript
const PEAK_HOURS = [
  "08", // 08:00-08:59 — เปิดเคาน์เตอร์
  "12", // 12:00-12:59 — พักเที่ยงคนเยอะ
  "13", // 13:00-13:59 — เปิดช่วงบ่าย
  "17"  // 17:00-17:59 — ก่อนเลิกงาน
];
```

**Parameters:**
- `worklogsInPeakHours` — จำนวนงานใน peak hours
- `totalWorklogs` — จำนวนงานทั้งหมด

**Interpretation:**
- 100% = ทำงาน peak hour ทั้งหมด
- 50% = ครึ่งหนึ่งของงานอยู่ใน peak
- สูง = ยอมรับงานหนักได้ดี

**Calculation:**
```javascript
const PEAK_HOURS = ["08", "12", "13", "17"];

function calculatePeakHandling(employeeId, worklogs, dateRange) {
  const empLogs = worklogs.filter(w => 
    w.employeeId === employeeId &&
    w.date >= dateRange.start &&
    w.date <= dateRange.end
  );
  
  if (empLogs.length === 0) return 0;
  
  const peakLogs = empLogs.filter(w => {
    const hour = (w.time || "").split(":")[0];
    return PEAK_HOURS.includes(hour);
  });
  
  return (peakLogs.length / empLogs.length) * 100;
}
```

---

### 5. Documentation
**คำอธิบาย:** คุณภาพของการบันทึกรายละเอียด (comment completeness)

**Formula:**
```javascript
documentation = (logsWithDetail / totalWorklogs) * 100
```

**"Detail" Definition:**
```javascript
function hasDetail(comment) {
  return (comment || "").trim().length >= 20;
}
```

**Parameters:**
- `logsWithDetail` — จำนวน worklog ที่มี comment >= 20 ตัวอักษร
- `totalWorklogs` — จำนวน worklog ทั้งหมด

**Interpretation:**
- 100% = ทุกงานมี comment ละเอียด
- 50% = ครึ่งหนึ่งมี comment
- สูง = ลงรายละเอียดดี (helpful สำหรับ audit)

**Calculation:**
```javascript
function calculateDocumentation(employeeId, worklogs, dateRange) {
  const empLogs = worklogs.filter(w => 
    w.employeeId === employeeId &&
    w.date >= dateRange.start &&
    w.date <= dateRange.end
  );
  
  if (empLogs.length === 0) return 0;
  
  const withDetail = empLogs.filter(w => 
    (w.comment || "").trim().length >= 20
  ).length;
  
  return (withDetail / empLogs.length) * 100;
}
```

---

### 6. Combo Usage
**คำอธิบาย:** อัตราการใช้ Quick Log / Combo Template (ใช้ระบบมีประสิทธิภาพ)

**Formula:**
```javascript
comboUsage = (quickLogCount / totalWorklogs) * 100
```

**"Quick Log" Definition:**
- `source === "quick-log"` (field ที่ SE เพิ่มใน EH-4)
- หรือ `templateId` exists (บ่งบอกว่าใช้ template)

**Parameters:**
- `quickLogCount` — จำนวน worklog ที่มาจาก quick log/combo
- `totalWorklogs` — จำนวน worklog ทั้งหมด

**Interpretation:**
- 100% = ใช้ quick log ทั้งหมด
- 0% = manual input ทั้งหมด
- สูง = ใช้ระบบ efficiently (ไม่เสียเวลาพิมพ์)

**Calculation:**
```javascript
function calculateComboUsage(employeeId, worklogs, dateRange) {
  const empLogs = worklogs.filter(w => 
    w.employeeId === employeeId &&
    w.date >= dateRange.start &&
    w.date <= dateRange.end
  );
  
  if (empLogs.length === 0) return 0;
  
  const quickLogs = empLogs.filter(w => 
    w.source === "quick-log" || w.templateId || w.comboId
  ).length;
  
  return (quickLogs / empLogs.length) * 100;
}
```

---

## Aggregate Function

### calculateRadarMetrics()

```javascript
/**
 * Calculate all 6 metrics for radar chart
 * @param {string} employeeId — Firebase UID
 * @param {Array} worklogs — all worklogs array
 * @param {Object} dateRange — { start: "2026-06-01", end: "2026-06-30" }
 * @returns {Object} — { volume, versatility, consistency, peakHandling, documentation, comboUsage }
 */
function calculateRadarMetrics(employeeId, worklogs, dateRange) {
  return {
    volume: calculateVolume(employeeId, worklogs, dateRange),
    versatility: calculateVersatility(employeeId, worklogs, dateRange),
    consistency: calculateConsistency(employeeId, worklogs, dateRange),
    peakHandling: calculatePeakHandling(employeeId, worklogs, dateRange),
    documentation: calculateDocumentation(employeeId, worklogs, dateRange),
    comboUsage: calculateComboUsage(employeeId, worklogs, dateRange)
  };
}

/**
 * Calculate team average for benchmark
 * @param {Array} allMetrics — array of metrics objects from calculateRadarMetrics
 * @returns {Object} — team average for each metric
 */
function getTeamAverage(allMetrics) {
  const count = allMetrics.length;
  if (count === 0) return null;
  
  return {
    volume: allMetrics.reduce((sum, m) => sum + m.volume, 0) / count,
    versatility: allMetrics.reduce((sum, m) => sum + m.versatility, 0) / count,
    consistency: allMetrics.reduce((sum, m) => sum + m.consistency, 0) / count,
    peakHandling: allMetrics.reduce((sum, m) => sum + m.peakHandling, 0) / count,
    documentation: allMetrics.reduce((sum, m) => sum + m.documentation, 0) / count,
    comboUsage: allMetrics.reduce((sum, m) => sum + m.comboUsage, 0) / count
  };
}
```

---

## Radar Chart Display

### 6 Axes (clockwise from top)

```
              Volume
                 ▲
                /|\
               / | \
              /  |  \
   Versatility ◆   \ Consistency
        (หลากหลาย)    (สม่ำเสมอ)
              |
              |
   Combo Usage ----- Peak Handling
   (ใช้ระบบดี)        (รับงานหนัก)
              |
              |
         Documentation
         (ลงรายละเอียด)
```

### Visual Elements

- **Filled area** — สีพนักงาน (opacity 0.3)
- **Border line** — สีพนักงาน (solid)
- **Team average** — เส้นประสีเทา (reference line)
- **Grid** — วงกลม concentric ที่ 20, 40, 60, 80, 100
- **Labels** — แสดงค่า 0-100 ที่แต่ละแกน

---

## Interpretation Guide

### Pattern ตัวอย่าง

| Pattern | ลักษณะ | ความหมาย | Action |
|---------|--------|----------|--------|
| **High Volume, Low Versatility** | งานเยอะแต่ซ้ำซาก | Specialist / อยู่กับที่ | ให้ทำงานใหม่ทดสอบ skills |
| **Balanced** | ทุก metric สูงพอๆ กัน | All-rounder ที่ดี | Reward / Promotion candidate |
| **High Consistency, Low Peak** | สม่ำเสมอแต่หลบ peak | ชอบความ routine | ผลักดันให้ช่วยช่วง busy |
| **High Peak, Low Documentation** | รับงานหนักแต่ไม่ลง detail | เร็วแต่ไม่ละเอียด | Train ให้ comment ละเอียดขึ้น |
| **High Combo, Low Volume** | ใช้ระบบดีแต่งานน้อย | Efficient แต่ underutilized | ให้งานเพิ่ม / part-time? |

### 1-on-1 Review Template

```markdown
## Staff Review — [Name] [Period]

### Radar Chart Snapshot
[Insert chart image]

### Strengths
- [Metric highest]: [Explanation]

### Growth Areas
- [Metric lowest]: [Explanation + Action plan]

### vs Team Average
- Above average: [List]
- Below average: [List]

### Goals for Next Period
1. Improve [metric] from [X] to [Y] by [action]
```

---

## Implementation Notes

### For SR-2 (DA)
- สร้าง `frontend/lib/staffMetrics.js`
- Implement 6 calculation functions + aggregate
- Add unit tests สำหรับ edge cases

### For SR-4 (SE)
- Use Recharts `RadarChart` component
- Props: `data` (metrics object), `benchmark` (team average), `employeeName`
- Responsive: min width 300px

### For SR-5 (SE)
- `/admin/staff-analytics` page
- Multi-select: compare 2-3 staff
- Time range: month/quarter/year selector

---

## Validation Checklist

- [ ] Volume: 0-100 ถูกต้อง (50 worklogs = 100%)
- [ ] Versatility: 0-100 ถูกต้อง (10 tasks = 100%)
- [ ] Consistency: CV=0 → 100%, CV=2 → 0%
- [ ] Peak Handling: 08,12,13,17 ถูกต้อง
- [ ] Documentation: 20 chars threshold ทำงาน
- [ ] Combo Usage: source="quick-log" หรือ templateId exists
- [ ] Team average: คำนวณถูกต้อง
- [ ] Edge case: ไม่มีงาน → ทุก metric = 0
- [ ] Edge case: งานแค่วันเดียว → consistency = 100%

---

**Next:** SR-2 — [DA] implement `frontend/lib/staffMetrics.js`

**Handover to:** [DA] → SR-2 implementation
