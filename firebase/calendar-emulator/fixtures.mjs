import { calendarTestAccounts } from "../../frontend/lib/calendarEmulatorConfig.js";
export const calendarEmulatorFixtures = {
  users: calendarTestAccounts.map(account => ({
    id: account.id,
    displayName: account.label,
    role: account.role,
    active: account.active !== false
  })),
  classroomSchedules: [{
    id: "class-one",
    room: "401",
    dayOfWeek: "monday",
    startTime: "08:00",
    endTime: "10:00",
    subject: "วิชาจำลองจาก Emulator",
    teacher: "ผู้สอนจำลอง",
    semester: "2/2569",
    validFrom: "2026-11-02",
    validTo: "2027-03-14",
    isActive: true
  }],
  dlExamSchedules: [{
    id: "dl-morning",
    date: "2026-11-03",
    startTime: "09:00",
    endTime: "10:30",
    timeSlot: "morning",
    locations: ["ห้อง 406", "ห้อง 407"],
    proctors: ["directory-a", "directory-b", "directory-c"],
    studentCount: 75,
    examType: "student",
    isActive: true
  }, {
    id: "dl-evening",
    date: "2026-11-03",
    startTime: "17:00",
    endTime: "18:30",
    timeSlot: "evening",
    locations: ["ห้อง 406", "ห้อง 407"],
    proctors: ["directory-a", "directory-b"],
    studentCount: 75,
    examType: "student",
    isActive: true
  }, {
    id: "dl-historic",
    date: "2026-11-04",
    startTime: "15:00",
    endTime: "16:00",
    timeSlot: "evening",
    location: "ห้อง 406",
    proctors: [{
      userId: "directory-c"
    }],
    studentCount: 30,
    examType: "staff",
    isActive: true
  }, {
    id: "dl-december",
    date: "2026-12-03",
    startTime: "17:00",
    endTime: "18:30",
    timeSlot: "evening",
    locations: ["ห้อง 406"],
    proctors: ["directory-a"],
    studentCount: 30,
    examType: "staff",
    isActive: true
  }, {
    id: "dl-inactive",
    date: "2026-11-03",
    startTime: "11:00",
    endTime: "12:00",
    locations: ["ห้อง 406"],
    proctors: ["directory-a"],
    studentCount: 30,
    examType: "staff",
    isActive: false
  }]
};
