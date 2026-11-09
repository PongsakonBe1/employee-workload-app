// Anonymous documents shaped like the legacy hooks. This module never contacts a service.
import { createCalendarDocumentCache } from "../../../lib/calendarDataAdapter";
export const legacyCalendarDocuments = {
  users: ["a", "b", "c"].map((letter, index) => ({
    id: `directory-${letter}`,
    displayName: `ผู้คุมจำลอง ${index + 1}`,
    role: "staff"
  })),
  classroomSchedules: [{
    id: "class-one",
    room: "401",
    dayOfWeek: "monday",
    startTime: "08:00",
    endTime: "10:00",
    subject: "วิชาตัวอย่างจากข้อมูลเดิม",
    teacher: "ผู้สอนจำลอง",
    semester: "2/2569",
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
    semester: "2/2569",
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
    semester: "2/2569",
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
    semester: "2/2569",
    isActive: true
  }]
};
export const legacyCalendarOptions = {
  boundsById: {
    "class-one": {
      validFrom: "2026-11-02",
      validTo: "2027-03-14"
    }
  }
};
export const legacyCalendarCache = createCalendarDocumentCache(() => structuredClone(legacyCalendarDocuments), legacyCalendarOptions);
