import { describe, expect, it } from "vitest";
import { canEditUserNickname, canEditWorklogDisplayName, getUserNameChanges, nicknameMaxLength } from "./adminUserNames";

const profile = (role, uid, active = true) => ({ role, uid, active });
const target = (role, id) => ({ role, id });

describe("admin user name permissions", () => {
  it.each([
    ["staff", true, "staff", "other", false, false],
    ["admin", false, "staff", "other", false, false],
    ["admin", true, "staff", "other", true, true],
    ["admin", true, "admin", "actor", true, false],
    ["admin", true, "admin", "other", false, false],
    ["admin", true, "superadmin", "other", false, false],
    ["superadmin", false, "staff", "other", false, false],
    ["superadmin", true, "staff", "other", true, true],
    ["superadmin", true, "admin", "other", true, true],
    ["superadmin", true, "superadmin", "other", true, false],
    ["superadmin", true, "superadmin", "actor", true, false],
  ])("checks actor %s (active %s) editing target %s %s", (role, active, targetRole, id, nickname, displayName) => {
    const actor = profile(role, "actor", active);
    expect(canEditUserNickname(actor, target(targetRole, id))).toBe(nickname);
    expect(canEditWorklogDisplayName(actor, target(targetRole, id))).toBe(displayName);
  });
});

describe("admin user name changes", () => {
  const original = Object.freeze({ nickname: "เดิม", displayName: "ชื่อบันทึก" });

  it("writes only the nickname when the worklog name has not changed", () => {
    expect(getUserNameChanges(original, { ...original, nickname: "  ใหม่  " }, true)).toEqual({ nickname: "ใหม่" });
  });

  it("clears nickname without writing the worklog name", () => {
    expect(getUserNameChanges(original, { ...original, nickname: " " }, true)).toEqual({ nickname: "" });
  });

  it("writes a nickname on a legacy profile without a worklog name", () => {
    expect(getUserNameChanges({}, { nickname: "ใหม่", displayName: "" }, true)).toEqual({ nickname: "ใหม่" });
    expect(getUserNameChanges({}, { nickname: " ", displayName: "" }, true)).toEqual({});
  });

  it("updates only the edited fields on a profile with both names", () => {
    const draft = { nickname: "เดิม", displayName: " ชื่อใหม่ " };
    expect(getUserNameChanges(original, draft, true)).toEqual({ displayName: "ชื่อใหม่" });
    expect(getUserNameChanges(original, { ...draft, nickname: "ใหม่" }, true)).toEqual({
      nickname: "ใหม่",
      displayName: "ชื่อใหม่",
    });
  });

  it("ignores a worklog name supplied when that input is unavailable", () => {
    expect(getUserNameChanges(original, { nickname: "ใหม่", displayName: "ชื่ออื่น" }, false)).toEqual({ nickname: "ใหม่" });
  });

  it("requires the existing worklog name when edited and caps new nicknames", () => {
    expect(getUserNameChanges(original, { ...original, displayName: " " }, true)).toBeNull();
    expect(getUserNameChanges(original, { ...original, nickname: "a".repeat(nicknameMaxLength + 1) }, true)).toBeNull();
    const nickname = "a".repeat(nicknameMaxLength);
    expect(getUserNameChanges(original, { ...original, nickname }, true)).toEqual({ nickname });
  });
});
