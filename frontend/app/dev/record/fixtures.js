// Synthetic display fixtures only. No production identity, student ID or API client.
import { recordTasks } from "../../../lib/recordPreview";
export const people = [
  { id: "fixture-a", displayName: "เจ้าหน้าที่ A (เอ)", fullName: "เจ้าหน้าที่ตัวอย่าง A", initial: "A" },
  { id: "fixture-b", displayName: "เจ้าหน้าที่ B (บี)", fullName: "เจ้าหน้าที่ตัวอย่าง B", initial: "B" },
];
export const initialRooms = [
  ...["303", "304", "305", "306"].map((id, i) => ({ id, floor: "3", detail: ["Windows", "iOS", "Android", "Linux"][i], open: i === 1 })),
  ...["401", "402", "406", "407"].map((id, i) => ({ id, floor: "4", detail: "ห้องเรียนคอมพิวเตอร์", open: i === 2 })),
];
export const initialDevices = [
  { id: "demo-h1", name: "หูฟังตัวอย่าง 01", kind: "headphones", location: "Finn Space", student: null, available: true },
  { id: "demo-h2", name: "หูฟังตัวอย่าง 02", kind: "headphones", location: "Finn Space", student: "0000000000000", available: true },
  { id: "demo-h3", name: "หูฟังตัวอย่าง 03", kind: "headphones", location: "ชั้น 3", student: null, available: false },
  { id: "demo-p1", name: "ปลั๊กไฟตัวอย่าง 01", kind: "plug", location: "Finn Space", student: null, available: true },
  { id: "demo-u1", name: "USB ตัวอย่าง 01", kind: "usb", location: "ชั้น 3", student: null, available: true },
];
export const tasks = recordTasks;
export const combos = {
  // Approved Review 10 labels; live globalTemplates verification remains separate.
  account: { title: "เปิดใช้บัญชี", tasks: ["เปิดใช้ Microsoft Authenticator", "เปิดใช้ Google Account", "เปิดใช้ KMUTNB SSO", "เปิดใช้ 2SV Google", "เปิดใช้ ICIT account"] },
  software: { title: "ติดตั้งโปรแกรม", tasks: ["ติดตั้ง SolidWork", "ติดตั้ง MatLab", "ติดตั้ง Microsoft365", "ติดตั้ง Visio", "ติดตั้ง Adobe", "ติดตั้ง ESET"] },
};
export const initialLogs = [
  { id: "sample-1", title: "ยืมหูฟัง", detail: "หูฟังตัวอย่าง 02 · Finn Space", person: "เจ้าหน้าที่ A (เอ)", date: "2026-11-06", time: "10:55" },
  { id: "sample-2", title: "ช่วยเหลือการใช้งานคอมพิวเตอร์", detail: "แนะนำการใช้งานระบบ", person: "เจ้าหน้าที่ B (บี)", date: "2026-11-06", time: "10:52" },
  { id: "sample-3", title: "คุมสอบ Digital Literacy", detail: "รอบเช้า · ห้อง 406 + 407", person: "เจ้าหน้าที่ A (เอ)", date: "2026-11-06", time: "10:30" },
];
export const schedule = [
  { id: "demo-am", date: "2026-11-06", title: "คุมสอบ Digital Literacy", start: "09:00", end: "10:30", room: "406 + 407" },
  { id: "demo-pm", date: "2026-11-06", title: "คุมสอบ DL รอบเย็น", start: "17:00", end: "18:30", room: "406" },
];
