import { describe, it, expect, vi } from "vitest";
import { calendarStagingEntryEnabled, calendarStagingMutationEnabled, calendarStagingWriteEnabled, calendarStagingEntryPath, resolveStagingHref, stagingEntryLinks, stagingEntrySection } from "./calendarStagingEntry.js";
import { selectDefaultFirebaseApp } from "./firebaseAppSelection.js";
describe("isolated staging entry policy", () => {
  it("requires a separate exact write flag and a development staging entry", () => {
    expect(calendarStagingWriteEnabled("development", "1", "1")).toBe(true);
    for (const values of [["production","1","1"],["development","0","1"],["development","1",undefined],["development","1","true"],["test","1","1"]]) expect(calendarStagingWriteEnabled(...values)).toBe(false);
  });
  it("requires the exact flag and development mode, including when a flag leaks into production", () => {
    expect(calendarStagingEntryEnabled("development", "1")).toBe(true);
    for (const [environment, flag] of [["production", "1"], ["test", "1"], ["development", "0"], ["development", undefined], ["development", "true"]]) expect(calendarStagingEntryEnabled(environment, flag)).toBe(false);
  });
  it("allows only the actual calendar/home paths as integrated pages", () => {
    expect(calendarStagingEntryPath("/calendar")).toBe(true);expect(calendarStagingEntryPath("/staging")).toBe(true);
    for (const path of ["/calendar-other", "/admin/users", "/resources", "/login"]) expect(calendarStagingEntryPath(path)).toBe(false);
  });
  it("rewrites every role's actual links into the staging allowlist, including modified-click destinations", () => {
    for (const role of ["staff", "admin", "superadmin"]) for (const item of stagingEntryLinks(role)) {
      const resolved = resolveStagingHref(item.href);expect(resolved === "/calendar" || resolved === "/staging" || resolved.startsWith("/staging?section=")).toBe(true);
    }
    expect(resolveStagingHref("/resources")).toBe("/staging?section=resources");expect(resolveStagingHref("/profile")).toBe("/staging?section=profile");
    expect(resolveStagingHref("https://example.test/escape")).toBe("/staging");expect(resolveStagingHref("//example.test")).toBe("/staging");
  });
  it("does not expose an admin section label to Staff through a query parameter", () => {
    expect(stagingEntrySection("users", "staff").id).toBe("dashboard");expect(stagingEntrySection("users", "superadmin").id).toBe("users");
    expect(stagingEntrySection("unknown", "staff").id).toBe("dashboard");
  });
  it("never adopts a named staging app as the legacy default", () => {
    const named = { name: "calendar-staging-1" }, normal = { name: "[DEFAULT]" }, initialize = vi.fn(() => normal);
    expect(selectDefaultFirebaseApp([named], initialize)).toBe(normal);expect(initialize).toHaveBeenCalledOnce();
    initialize.mockClear();expect(selectDefaultFirebaseApp([named, normal], initialize)).toBe(normal);expect(initialize).not.toHaveBeenCalled();
  });
});

it("requires explicit development entry/write/mutation flags together", () => { expect(calendarStagingMutationEnabled("development","1","1","1")).toBe(true);for (const args of [["production","1","1","1"],["development","1","1",undefined],["development","1","0","1"],["development","0","1","1"],["development","1","1","true"]]) expect(calendarStagingMutationEnabled(...args)).toBe(false); });
