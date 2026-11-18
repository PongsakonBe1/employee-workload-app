// Scanner input stays a string so leading zeroes are preserved.
export const STUDENT_CODE_HINT = "ใช้เลข 0–9 ครบ 13 หลัก หากสแกนเป็นตัวอักษร ให้เปลี่ยนแป้นพิมพ์เป็น EN แล้วสแกนใหม่";

export function isEquipmentStudentCode(value) {
  return typeof value === "string" && value.length === 13 && /^[0-9]+$/.test(value);
}

export function equipmentLoanKind({ name = "", minorTask = "", isSmart = false } = {}) {
  const labels = `${minorTask ?? ""} ${name ?? ""}`;
  if (labels.includes("หูฟัง")) return "headphones";
  if (labels.includes("ปลั๊กไฟ")) return "power";
  if (/(?:ยืม|คืน)\s*usb\b/i.test(labels) || (isSmart && /\busb\b/i.test(labels))) return "usb";
  return null;
}

export function equipmentLoanTask(kind, returning) {
  const label = { headphones: "หูฟัง", power: "ปลั๊กไฟ", usb: " USB" }[kind];
  return label ? `${returning ? "คืน" : "ยืม"}${label}` : null;
}
