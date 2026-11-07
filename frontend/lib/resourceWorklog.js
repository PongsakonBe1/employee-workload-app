import { manualRecordEntry } from "./recordPreview";
import { canBorrowEquipment, EQUIPMENT_CONDITIONS } from "./equipmentPreview";
export const roomState = room => ({ label: room.open ? "เปิดอยู่" : "ปิดอยู่", tone: room.open ? "green" : "neutral" });
export function roomWorklog(room, dateTime) {
  const taskId = room.floor === "3" ? `${room.open ? "ปิด" : "เช็คอิน"}ห้องแลกเปลี่ยนความรู้` : `${room.open ? "ปิด" : "เปิด"}ห้องเรียนชั้น 4`;
  const result = manualRecordEntry({
    taskId,
    recipient: "",
    notes: room.id
  }, dateTime);
  return result.entry ? {
    entry: {
      ...result.entry,
      title: `${room.open ? "ปิด" : "เปิด"}ห้อง ${room.id}`,
      detail: room.detail,
      resource: {
        kind: "room",
        id: room.id,
        open: !room.open
      }
    }
  } : result;
}
export function deviceWorklog(device, recipient, condition, dateTime) {
  if (!device.student && !canBorrowEquipment(device)) return {
    field: "device",
    message: "อุปกรณ์ไม่พร้อมให้ยืม"
  };
  const student = device.student || recipient;
  if (!/^[0-9]{13}$/.test(student)) return {
    field: "recipient",
    message: "ใช้รหัสตัวเลข 0–9 จำนวน 13 หลักเท่านั้น"
  };
  if (device.student && !Object.hasOwn(EQUIPMENT_CONDITIONS, condition)) return {
    field: "condition",
    message: "เลือกสภาพตอนคืน หรือยังไม่ระบุ"
  };
  const taskId = `${device.student ? "คืน" : "ยืม"}${{
    headphones: "หูฟัง",
    plug: "ปลั๊กไฟ",
    usb: " USB"
  }[device.kind]}`;
  const result = manualRecordEntry({
    taskId,
    recipient: student,
    notes: device.name
  }, dateTime);
  return result.entry ? {
    entry: {
      ...result.entry,
      title: `${device.student ? "คืน" : "ยืม"}${device.name}`,
      requireRecipient: true,
      equipmentId: device.id,
      assetCodeAtEvent: device.assetCode || device.id,
      locationAtEvent: device.location,
      detail: `${device.location} · รหัสตัวอย่าง ${student}`,
      ...(device.student ? {
        returnCondition: condition,
        equipmentCondition: condition
      } : {}),
      resource: {
        kind: "device",
        id: device.id,
        student: device.student ? null : student,
        ...(device.student ? {
          condition
        } : {})
      }
    }
  } : result;
}
