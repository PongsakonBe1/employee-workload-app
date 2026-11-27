export const roomStatusLabels = {
  in_use: "เปิดอยู่",
  available: "ปิดอยู่",
  unknown: "ยังไม่ยืนยัน",
};

export const equipmentStatusLabels = { ready: "พร้อมใช้", inUse: "กำลังใช้", issue: "ต้องตรวจ" };

export function roomDisplayState(status) {
  return status === "in_use" || status === "available" ? status : "unknown";
}

export function roomAction(status) {
  if (status === "available") return "เปิดห้อง";
  if (status === "in_use") return "ปิดห้อง";
  return null;
}

export function equipmentDisplayState(status, condition) {
  if (status === "in_use") return "inUse";
  if (status !== "available" || condition === "damaged" || condition === "lost") return "issue";
  return "ready";
}
