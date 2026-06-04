/**
 * Shared worklog domain helpers.
 *
 * Consolidates logic duplicated in worklogs/new and admin/record pages.
 */

import { getMainDutyFromMinorTask } from "./commentSuggestions";

/** Map a minorTask to the appropriate dutyGroup label. */
export function getDutyGroupFromMinorTask(minorTask) {
  const mainDuty = getMainDutyFromMinorTask(minorTask);
  if (mainDuty === "ดูแลห้องบริการคอมพิวเตอร์") {
    return "งานในหน้าที่หลัก (ห้องบริการ)";
  } else if (mainDuty === "ให้บริการรับแจ้งและแก้ไขปัญหาระบบสารสนเทศ") {
    return "งานในหน้าที่หลัก (รับแจ้งปัญหา)";
  } else if (mainDuty === "คุมสอบ DL") {
    return "งานในหน้าที่หลัก (คุมสอบ DL)";
  }
  return "งานอื่นๆ ที่ได้รับมอบหมาย";
}

/**
 * Normalize legacy English status values to Thai equivalents.
 * Supports both old (EN: completed/pending) and new (TH) formats.
 */
export function normalizeStatus(status) {
  if (!status) return "บันทึกแล้ว";
  const map = {
    completed: "บันทึกแล้ว",
    pending: "รอดำเนินการ",
    cancelled: "ยกเลิก",
    canceled: "ยกเลิก",
  };
  return map[status.toLowerCase()] || status;
}

/**
 * Dispatch equipment/room status events after a worklog is saved.
 * Extracts equipment IDs or room numbers from minorTask + comment
 * and fires CustomEvents so RoomEquipmentStatus can react.
 */
export function dispatchEquipmentStatusEvents(minorTask, comment) {
  const lowerComment = (comment || "").toLowerCase();
  const lowerTask = (minorTask || "").toLowerCase();

  // Headphones ICIT01-12
  if (lowerTask.includes("ยืมหูฟัง") || lowerTask.includes("คืนหูฟัง")) {
    for (let i = 1; i <= 12; i++) {
      const equipment = `ICIT${String(i).padStart(2, "0")}`;
      if (lowerComment.includes(equipment)) {
        const newStatus = lowerTask.includes("ยืม") ? "in_use" : "available";
        window.dispatchEvent(
          new CustomEvent("equipmentStatusUpdated", {
            detail: { equipmentType: "headphones", equipment, status: newStatus },
          }),
        );
        break;
      }
    }
  }

  // Power strips ICIT21-23
  if (lowerTask.includes("ยืมปลั๊กไฟ") || lowerTask.includes("คืนปลั๊กไฟ")) {
    for (let i = 21; i <= 23; i++) {
      const equipment = `ICIT${i}`;
      if (lowerComment.includes(equipment)) {
        const newStatus = lowerTask.includes("ยืม") ? "in_use" : "available";
        window.dispatchEvent(
          new CustomEvent("equipmentStatusUpdated", {
            detail: { equipmentType: "power", equipment, status: newStatus },
          }),
        );
        break;
      }
    }
  }

  // Rooms 401-407
  if (lowerTask.includes("เปิดห้อง") || lowerTask.includes("ปิดห้อง")) {
    const rooms = ["401", "402", "406", "407"];
    rooms.forEach((room) => {
      if (lowerComment.includes(room)) {
        const newStatus = lowerTask.includes("เปิด") ? "in_use" : "available";
        window.dispatchEvent(
          new CustomEvent("roomStatusUpdated", {
            detail: { room, status: newStatus },
          }),
        );
      }
    });
  }
}
