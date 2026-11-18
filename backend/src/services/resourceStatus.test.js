import { describe, expect, it } from "vitest";
import { projectIndexedResourceStatus } from "./resourceStatus.js";
import { indexedWorklogEdit, worklogResourceIndex, withWorklogResourceIndex } from "../../../frontend/lib/resourceStatusIndex.js";

describe("shared resource status by ID", () => {
  const loan = { minorTask: "ยืมหูฟัง", equipment: "ICIT01", recipient: "0123456789012", time: "09:00", employeeId: "qa-staff" };
  const returned = { minorTask: "คืนหูฟัง", equipment: "ICIT01", equipmentCondition: "damaged", recipient: loan.recipient, equipmentNote: "QA private note" };

  it("publishes only the current borrower and the actual resource selected from legacy worklogs", () => {
    const status = projectIndexedResourceStatus(new Map([
      ["401", { minorTask: "เปิดห้องเรียนชั้น 4", room: "401", comment: "402" }],
      ["ICIT01", loan]
    ]), new Map());
    expect(status.roomStatus).toMatchObject({ 401: "in_use", 402: "available" });
    expect(status.equipmentStatus.headphones.ICIT01).toBe("in_use");
    expect(status.details.ICIT01).toEqual({ user: loan.recipient, time: "09:00", action: "ยืม" });
    expect(JSON.stringify(status)).not.toContain(loan.employeeId);
  });

  it("uses the return's condition immediately and omits the borrower and private notes", () => {
    const earlier = { ...returned, equipmentCondition: "normal" };
    const status = projectIndexedResourceStatus(new Map([["ICIT01", returned]]), new Map([["ICIT01", earlier]]));
    expect(status.equipmentStatus.headphones.ICIT01).toBe("available");
    expect(status.equipmentConditions.ICIT01).toBe("damaged");
    expect(JSON.stringify(status)).not.toContain(returned.equipmentNote);
    expect(JSON.stringify(status)).not.toContain(loan.recipient);
    expect(projectIndexedResourceStatus(new Map([["ICIT01", loan]]), new Map([["ICIT01", returned]])).equipmentConditions.ICIT01).toBe("damaged");
  });

  it("rejects an index entry whose worklog does not belong to that resource", () => {
    expect(() => projectIndexedResourceStatus(new Map([["ICIT02", loan]]), new Map())).toThrow("does not match");
  });

  it("recognizes exact IDs, retains multi-room legacy logs and falls back to the Bangkok worklog date", () => {
    const room = worklogResourceIndex({ minorTask: "เช็คอินห้องแลกเปลี่ยนความรู้", comment: "ห้อง 304/iOS, 306/Linux", date: "2026-11-18", time: "09:30" });
    expect(room.resourceKeys).toEqual(["304", "306"]);
    expect(room.resourceRecordedAt.toISOString()).toBe("2026-11-18T02:30:00.000Z");
    expect(worklogResourceIndex({ minorTask: "ยืมหูฟัง", comment: "ICIT010" }).resourceKeys).toEqual([]);
    expect(() => worklogResourceIndex({ ...loan, date: "2026-02-30" })).toThrow("usable recorded date");
  });

  it("saves the same timestamp transform with the worklog and rebuilds indices when the asset changes", () => {
    const serverTimestamp = { kind: "server-timestamp" };
    expect(withWorklogResourceIndex({ ...loan, createdAt: serverTimestamp })).toMatchObject({
      resourceKeys: ["ICIT01"], resourceConditionKeys: [], resourceRecordedAt: serverTimestamp
    });
    const current = { ...returned, createdAt: new Date("2026-11-01T02:00:00.000Z") };
    expect(indexedWorklogEdit(current, { comment: "คืนหูฟัง ICIT02" })).toEqual({
      comment: "คืนหูฟัง ICIT02", equipment: "ICIT02", resourceKeys: ["ICIT02"],
      resourceConditionKeys: ["ICIT02"], resourceRecordedAt: current.createdAt
    });
  });
});
