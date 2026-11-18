import { describe, expect, it } from "vitest";
import { projectResourceStatus } from "./resourceStatus.js";

describe("shared resource status", () => {
  it("publishes an open room and a still-active loan across dates without staff fields", () => {
    const status = projectResourceStatus([
      { minorTask: "เปิดห้องเรียนชั้น 4", room: "401", comment: "402" },
      { minorTask: "ยืม USB", comment: "ยืม USB ICIT27", recipient: "0123456789012", employeeId: "staff-a", time: "09:30", date: "2026-11-17" }
    ]);
    expect(status.roomStatus).toMatchObject({ 401: "in_use", 402: "available" });
    expect(status.equipmentStatus.usb.ICIT27).toBe("in_use");
    expect(status.details.ICIT27).toEqual({ user: "0123456789012", time: "09:30", action: "ยืม" });
    expect(JSON.stringify(status)).not.toContain("staff-a");
  });

  it("clears the borrower after return and preserves the last recorded condition", () => {
    const loan = { minorTask: "ยืมหูฟัง", equipment: "ICIT01", recipient: "0123456789012" };
    const returned = { minorTask: "คืนหูฟัง", equipment: "ICIT01", equipmentCondition: "damaged", recipient: loan.recipient, equipmentNote: "QA private note" };
    const status = projectResourceStatus([returned, loan]);
    expect(status.equipmentStatus.headphones.ICIT01).toBe("available");
    expect(status.details).not.toHaveProperty("ICIT01");
    expect(status.equipmentConditions.ICIT01).toBe("damaged");
    expect(JSON.stringify(status)).not.toContain(returned.equipmentNote);
    expect(JSON.stringify(status)).not.toContain(loan.recipient);
    expect(projectResourceStatus([loan, returned]).equipmentConditions.ICIT01).toBe("damaged");
  });

  it("recognizes legacy room markers and matches exact equipment codes", () => {
    const status = projectResourceStatus([
      { minorTask: "เช็คอินห้องแลกเปลี่ยนความรู้", comment: "304/iOS" },
      { minorTask: "ยืมหูฟัง", comment: "ICIT010" },
      { minorTask: "ยืมปลั๊กไฟ", comment: "ยืมปลั๊กไฟ ICIT25" }
    ]);
    expect(status.roomStatus[304]).toBe("in_use");
    expect(status.equipmentStatus.headphones.ICIT01).toBe("available");
    expect(status.equipmentStatus.power.ICIT25).toBe("in_use");
  });
});
