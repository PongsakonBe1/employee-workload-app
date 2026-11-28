import { describe, expect, it } from "vitest";
import { equipmentDisplayState, roomAction, roomDisplayState } from "./resourcePresentation.js";

describe("shared resource display states", () => {
  it("requires an explicit state before offering a room action", () => {
    for (const value of [null, undefined, "unknown", "unexpected"]) {
      expect(roomDisplayState(value)).toBe("unknown");
      expect(roomAction(value)).toBeNull();
    }
    expect(roomDisplayState("available")).toBe("available");
    expect(roomAction("available")).toBe("เปิดห้อง");
    expect(roomDisplayState("in_use")).toBe("in_use");
    expect(roomAction("in_use")).toBe("ปิดห้อง");
  });

  it("keeps a returnable loan in use and excludes unknown or damaged gear from availability", () => {
    expect(equipmentDisplayState("in_use", "damaged")).toBe("inUse");
    expect(equipmentDisplayState("available", "normal")).toBe("ready");
    expect(equipmentDisplayState("available", "damaged")).toBe("issue");
    expect(equipmentDisplayState("available", "lost")).toBe("issue");
    expect(equipmentDisplayState(undefined)).toBe("issue");
  });
});
