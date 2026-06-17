# RoomUsageCalendar - คู่มือการใช้งาน

## ภาพรวม
**RoomUsageCalendar** คือปฏิทินแสดงการใช้งานห้องเรียนชั้น 4 ในรูปแบบ Apple Calendar (iOS Style) รองรับการแสดงผลแบบ Week View, Day View และ Compact View พร้อมรองรับโซนเวลาประเทศไทย (UTC+7)

---

## ฟีเจอร์หลัก

### 1. Interactive View Toggle
- **Week View**: แสดงตาราง 7 วัน (อา-ส) พร้อมช่วงเวลา 08:00-20:00
- **Day View**: แสดงรายละเอียดของวันเดียว (เหมาะสำหรับมือถือ)
- **Compact View**: แสดงเฉพาะเหตุการณ์วันนี้แบบสั้น (Sidebar)

### 2. ประเภทเหตุการณ์
| สี | ประเภท | รายละเอียด |
|---|---|---|
| 🔵 ฟ้า | ตารางเรียน | วิชา, อาจารย์, ห้อง |
| 🟠 ส้ม | สอบ DL | ผู้คุมสอบ, จำนวนนักศึกษา, ห้อง |
| 🔴 แดง | สอบ CEM | เฉพาะเดือนปัจจุบัน |
| 🟢 เขียว | วันหยุดราชการ | แสดงอัตโนมัติ |

### 3. การนำทาง
- **ปุ่ม ◀**: ย้อนกลับ (สัปดาห์/วันก่อน)
- **ปุ่ม วันนี้**: กลับไปวันปัจจุบัน
- **ปุ่ม ▶**: ไปข้างหน้า (สัปดาห์/วันถัดไป)

---

## การใช้งานในแต่ละหน้า

### 1. หน้า Admin Record (`/admin/record`)
```jsx
// Week View บน + Compact View ล่าง
<RoomUsageCalendar view="week" showDLExam={true} />
<RoomUsageCalendar view="compact" showDLExam={true} />
```
**การใช้งาน**: ดูตารางใช้ห้องควบคู่กับการบันทึกงาน

### 2. หน้า Worklog New (`/worklogs/new`)
```jsx
// Week View บน + Compact View ล่าง
<RoomUsageCalendar view="week" showDLExam={true} />
<RoomUsageCalendar view="compact" showDLExam={true} />
```
**การใช้งาน**: พนักงานดูตารางก่อนบันทึกงาน

### 3. หน้า Dashboard (`/dashboard`)
```jsx
// แสดงเฉพาะตารางเรียนวันนี้ (ไม่แสดง "ห้องเรียนชั้น 4 วันนี้")
```
**การใช้งาน**: Overview ข้อมูลสำคัญ

---

## Props ที่รองรับ

| Prop | ค่า | ค่าเริ่มต้น | คำอธิบาย |
|------|-----|------------|---------|
| `view` | `"week"` \| `"day"` \| `"compact"` | `"week"` | โหมดการแสดงผล |
| `showDLExam` | `boolean` | `true` | แสดงตารางสอบ DL |
| `showCEMExam` | `boolean` | `false` | แสดงตารางสอบ CEM (เฉพาะเดือนปัจจุบัน) |
| `showHolidays` | `boolean` | `true` | แสดงวันหยุด |
| `initialDate` | `Date` | `new Date()` | วันเริ่มต้น |

---

## การจัดการโซนเวลา (Timezone)

ใช้ **Asia/Bangkok (UTC+7)** ทั้งหมด:
```javascript
const thailandTime = new Date(now.toLocaleString("en-US", { 
  timeZone: "Asia/Bangkok" 
}));
```

**หมายเหตุ**: ไม่ใช้ `toISOString()` เพราะจะเป็น UTC

---

## การแมปชื่อผู้คุมสอบ

ระบบจะแมป `userId` เป็น `ชื่อพนักงาน` โดยอัตโนมัติ:
1. ดึงข้อมูล users จาก Firestore
2. สร้าง mapping table: `{ userId: name }`
3. แสดงชื่อแทน ID บนปฏิทิน

---

## การแสดงผลบนอุปกรณ์ต่างๆ

### Desktop (16:9)
- Week View: Grid 7 วัน
- Compact View: ด้านข้าง
- **ไม่ต้อง scroll** (Responsive 100vh)

### Tablet
- Day View หรือ Week View แบบย่อ
- แตะเพื่อดูรายละเอียด

### Mobile
- Day View เท่านั้น
- Swipe ซ้าย/ขวาเพื่อเปลี่ยนวัน
- ปุ่ม Toggle View ด้านล่าง

---

## วันหยุดที่แสดง

ปฏิทินแสดงวันหยุดราชการไทยอัตโนมัติ:
- วันขึ้นปีใหม่ (1 ม.ค.)
- วันจักรี (6 เม.ย.)
- วันสงกรานต์ (13-15 เม.ย.)
- วันแรงงาน (1 พ.ค.)
- วันเฉลิมพระชนมพรรษา (28 ก.ค.)
- วันพ่อแห่งชาติ (5 ธ.ค.)
- วันวันขึ้นปีใหม่ (31 ธ.ค.)

---

## การแก้ไขปัญหาเบื้องต้น

### เหตุการณ์ไม่แสดงใน Week View
1. ตรวจสอบ `date` format: "YYYY-MM-DD"
2. ตรวจสอบ `isActive: true`
3. ตรวจสอบ Timezone (ควรเป็น Asia/Bangkok)

### ชื่อผู้คุมสอบแสดงเป็น ID
1. รอ users โหลดเสร็จ (จะมี loading state)
2. ตรวจสอบ users collection มีข้อมูล
3. ตรวจสอบ `isActive` ของ users

### Layout 16:9 มี scroll
1. ตรวจสอบว่าใช้ `h-screen` หรือ `100vh`
2. ปรับ `grid-cols` ให้เหมาะสม
3. ใช้ `overflow-hidden` แทน `overflow-auto`

---

## ตัวอย่างการใช้งาน

### แบบพื้นฐาน
```jsx
import RoomUsageCalendar from "../components/RoomUsageCalendar";

// Week View พื้นฐาน
<RoomUsageCalendar />

// Day View
<RoomUsageCalendar view="day" />

// Compact View (ไม่แสดง DL)
<RoomUsageCalendar view="compact" showDLExam={false} />
```

### แบบพร้อม CEM Exam
```jsx
// แสดง CEM เฉพาะเดือนปัจจุบัน
<RoomUsageCalendar 
  view="week" 
  showDLExam={true}
  showCEMExam={true}
/>
```

### แบบกำหนดวันเริ่มต้น
```jsx
<RoomUsageCalendar 
  view="week"
  initialDate={new Date("2026-06-16")}
/>
```

---

## ไฟล์ที่เกี่ยวข้อง

- `frontend/components/RoomUsageCalendar.js` - Component หลัก
- `frontend/hooks/useClassroomSchedules.js` - Hook ตารางเรียน
- `frontend/hooks/useDLExamSchedules.js` - Hook สอบ DL
- `frontend/hooks/useCEMExamSchedules.js` - Hook สอบ CEM
- `frontend/data/holidays.js` - ข้อมูลวันหยุด

---

## เวอร์ชันล่าสุด

**v2.4.0** (2026-06-16)
- ✅ Interactive View Toggle
- ✅ Apple Calendar Theme
- ✅ Thailand Timezone (UTC+7)
- ✅ User Name Mapping
- ✅ CEM Exam Support
- ✅ Holiday Display
- ✅ Mobile Responsive
- ✅ FAB Version Control

---

## ติดต่อทีมพัฒนา

- **Dev Team**: labboy Technical Staff
- **Email**: dev@labboy.com
- **Last Updated**: 2026-06-16
- **Next Review**: 2026-07-16
