// Display-only examples. Identities, courses and assignments are synthetic.
export const calendarPeople = [
  { id: "demo-a", label: "เจ้าหน้าที่ตัวอย่าง A" }, { id: "demo-b", label: "เจ้าหน้าที่ตัวอย่าง B" }, { id: "demo-c", label: "เจ้าหน้าที่ตัวอย่าง C" },
];
export const initialCalendar = {
  rules: [
    { id: "demo-class-1", title: "ทักษะดิจิทัล", kind: "classroom", weekday: 0, start: "08:00", end: "10:00", rooms: ["401"], teacher: "ผู้สอนตัวอย่าง A", semester: "2/2569", validFrom: "2026-11-02", validTo: "2027-03-14" },
    { id: "demo-class-2", title: "คอมพิวเตอร์พื้นฐาน", kind: "classroom", weekday: 1, start: "10:00", end: "12:00", rooms: ["402"], teacher: "ผู้สอนตัวอย่าง B", semester: "2/2569", validFrom: "2026-11-02", validTo: "2027-03-14" },
    { id: "demo-class-3", title: "ห้องปฏิบัติการ", kind: "classroom", weekday: 2, start: "13:00", end: "14:30", rooms: ["402"], teacher: "ผู้สอนตัวอย่าง C", semester: "2/2569", validFrom: "2026-11-02", validTo: "2027-03-14" },
  ],
  events: [
    ...["2026-11-03", "2026-11-04", "2026-11-05"].flatMap(date => [
      { id: `demo-dl-${date}-am`, title: "สอบ Digital Literacy", kind: "dl", date, start: "09:00", end: "10:30", rooms: ["406", "407"], participants: 75, proctors: ["demo-a", "demo-b", "demo-c"] },
      { id: `demo-dl-${date}-pm`, title: "สอบ Digital Literacy", kind: "dl", date, start: "13:30", end: "15:00", rooms: ["406", "407"], participants: 75, proctors: ["demo-a", "demo-b", "demo-c"] },
    ]),
    { id: "demo-dl-evening", title: "สอบ DL รอบเย็น", kind: "dl", date: "2026-11-06", start: "17:00", end: "18:30", rooms: ["406", "407"], participants: 75, proctors: ["demo-a", "demo-b"] },
    { id: "demo-exam", title: "สอบรายวิชาตัวอย่าง", kind: "exam", date: "2026-11-05", start: "15:30", end: "16:30", rooms: ["401"], teacher: "ผู้สอนตัวอย่าง A" },
  ],
};
