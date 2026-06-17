# RoomUsageCalendar Component Guide

## Overview
**RoomUsageCalendar** is an iOS Apple Calendar-style component for displaying classroom schedules and DL exam schedules for 4th floor rooms at labboy.

---

## Features

### View Modes
1. **Week View** (`view="week"`)
   - Displays full week (Sunday-Saturday)
   - Time-based grid layout (8:00-20:00)
   - Color-coded events (Blue=Classroom, Orange=DL Exam)
   - Thailand timezone (UTC+7) support
   - Interactive event cards

2. **Compact View** (`view="compact"`)
   - Shows only today's schedule
   - Sidebar-friendly layout
   - Sorted by time (ascending)
   - Displays room, proctors, student count

3. **Day View** (`view="day"`)
   - Mobile-optimized single day view
   - Room filter selector

---

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `view` | `"week" \| "day" \| "compact"` | `"week"` | Display mode |
| `showDLExam` | `boolean` | `true` | Show DL exam schedules |
| `initialDate` | `Date` | `new Date()` | Initial calendar date |

---

## Timezone Handling

All dates use **Thailand timezone (Asia/Bangkok, UTC+7)**:
```javascript
const thailandTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
```

### Date Format
- Firestore: `"2026-06-16"` (YYYY-MM-DD)
- Display: Localized Thai format ("16 มิ.ย. 2569")

---

## Event Types

### 1. Classroom Schedule
- **Color**: Blue gradient (`from-blue-400 to-blue-600`)
- **Data**: `classroomSchedules` collection
- **Fields**: `dayOfWeek`, `startTime`, `endTime`, `room`, `subject`, `teacher`

### 2. DL Exam
- **Color**: Orange-Red gradient (`from-orange-400 to-red-500`)
- **Data**: `dlExamSchedules` collection
- **Fields**: 
  - `date`: "2026-06-16"
  - `timeSlot`: "morning" (09:00-10:30) | "afternoon" (13:00-15:00)
  - `locations`: ["ห้อง 406", "ห้อง 407"]
  - `proctors`: User IDs array
  - `studentCount`: Number
  - `examType`: "staff" | "student"

---

## User Name Mapping

Proctor IDs are mapped to names using `users` collection:

```javascript
const users = {
  "userId1": "ชื่อพนักงาน 1",
  "userId2": "ชื่อพนักงาน 2"
};
```

### Implementation
- Fetch all users on component mount
- Map IDs to names in `useMemo` for performance
- Fallback to ID if name not found

---

## UI/UX Design

### Apple Calendar Theme
- **Header**: Clean with navigation buttons (rounded-full, shadow)
- **Today Button**: Blue gradient, rounded-full
- **Legend**: Circular colored indicators with gradients
- **Events**: Gradient backgrounds, rounded corners, shadows
- **Typography**: Inter/SF Pro-style fonts

### Responsive Breakpoints
- **Desktop**: Week View (grid layout)
- **Tablet**: Day View or responsive Week View
- **Mobile**: Day View only

---

## Usage Examples

### 1. Week View (Admin Record Page)
```jsx
<RoomUsageCalendar view="week" showDLExam={true} />
```

### 2. Compact View (Dashboard)
```jsx
<RoomUsageCalendar view="compact" showDLExam={true} />
```

### 3. Week + Compact Combined
```jsx
<div>
  <RoomUsageCalendar view="week" showDLExam={true} />
  <RoomUsageCalendar view="compact" showDLExam={true} />
</div>
```

---

## Data Flow

```
Firestore
├── classroomSchedules (Weekly recurring)
│   ├── dayOfWeek: "monday"
│   ├── startTime: "09:00"
│   ├── endTime: "12:00"
│   └── room: "406"
│
├── dlExamSchedules (Specific dates)
│   ├── date: "2026-06-16"
│   ├── timeSlot: "morning"
│   ├── locations: ["ห้อง 406"]
│   └── proctors: ["userId1"]
│
└── users (Name lookup)
    └── name: "พนักงาน 1"
```

---

## Navigation Controls

| Button | Action |
|--------|--------|
| ◀ | Previous week/day |
| วันนี้ | Go to today |
| ▶ | Next week/day |

---

## Styling (Tailwind)

### Event Cards
```css
/* Classroom */
bg-gradient-to-br from-blue-400 to-blue-600
shadow-sm shadow-blue-200

/* DL Exam */
bg-gradient-to-br from-orange-400 to-red-500
shadow-sm shadow-orange-200
```

### Header Buttons
```css
/* Today Button */
bg-blue-500 hover:bg-blue-600
text-white rounded-full
shadow-sm hover:shadow-md

/* Navigation */
bg-white border border-slate-200
rounded-full hover:shadow-md
```

---

## Troubleshooting

### Events not showing in Week View
1. Check timezone conversion: `toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" })`
2. Verify `dateStr` format matches Firestore
3. Check `isActive` field is `true`

### Proctor names showing as IDs
1. Verify users collection has data
2. Check `usersLoading` is `false` before rendering
3. Ensure `useMemo` dependencies include `users`

### Timezone offset issues
- Always use Thailand timezone for calculations
- Never use `toISOString()` directly (it's UTC)
- Use `toLocaleString("en-US", { timeZone: "Asia/Bangkok" })`

---

## Version History

### v2.4.0 (2026-06-16)
- ✅ Fixed timezone issues for DL exams
- ✅ Added user name mapping for proctors
- ✅ Updated Week View UI to Apple Calendar style
- ✅ Added Compact View below Week View
- ✅ Added Saturday option for classroom schedules
- ✅ FAB Version Control with detailed changelog

### v2.3.0 (Previous)
- Earlier improvements

### v2.2.0 (2026-06-10)
- Dashboard improvements

### v2.1.0 (2026-06-05)
- Profile Radar Chart enhancements

### v2.0.0 (2026-06-01)
- ✅ Initial Apple Calendar theme
- ✅ Week/Compact/Day view modes
- ✅ DL Exam & Classroom Schedule support

---

## Related Components

- `ScheduleManager.js` - Manage classroom schedules
- `useClassroomSchedules.js` - Hook for schedule data
- `useDLExamSchedules.js` - Hook for exam data

---

## Maintainers

- **Dev Team**: labboy Technical Staff
- **Last Updated**: 2026-06-16
- **Next Review**: 2026-07-16
