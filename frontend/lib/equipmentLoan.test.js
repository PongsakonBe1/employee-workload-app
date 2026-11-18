import { describe, expect, it } from "vitest";
import { equipmentLoanKind, equipmentLoanTask, isEquipmentStudentCode } from "./equipmentLoan.js";

describe("Smart Quick Log equipment scan", () => {
  it("keeps a thirteen-digit code with leading zeroes as text", () => {
    expect(isEquipmentStudentCode("0000000000123")).toBe(true);
  });

  it.each(["แป้นผิด", "๑๒๓๔๕๖๗๘๙๐๑๒๓", "000000000012", "00000000001234", "0000000000123\n", "00000000001A3", 1234567890123])("rejects scanner input %s", value => {
    expect(isEquipmentStudentCode(value)).toBe(false);
  });

  it.each([
    [{ name: "หูฟัง ชั้น 3" }, "headphones", "คืนหูฟัง"],
    [{ minorTask: "ยืมปลั๊กไฟ" }, "power", "คืนปลั๊กไฟ"],
    [{ minorTask: "ยืม usb" }, "usb", "คืน USB"]
  ])("routes each equipment template and keeps the existing return task label", (template, kind, returning) => {
    expect(equipmentLoanKind(template)).toBe(kind);
    expect(equipmentLoanTask(kind, true)).toBe(returning);
  });

  it("keeps unrelated USB support work out of the loan flow", () => {
    expect(equipmentLoanKind({ name: "ติดตั้ง USB driver" })).toBeNull();
  });
});
