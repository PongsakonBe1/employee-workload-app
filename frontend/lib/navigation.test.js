import { describe, it, expect } from "vitest";
import { activeNavigation, getWorkspaceNavigation, mobileNavigation } from "./navigation";

describe("task-first workspace navigation", () => {
  it("keeps four mobile destinations with the correct record route per role", () => {
    for (const role of ["staff", "admin", "superadmin"]) {
      const nav = mobileNavigation(getWorkspaceNavigation(role));
      expect(nav.map(entry => entry.id)).toEqual(["record", "calendar", "resources", "dashboard"]);
      expect(nav[0].href).toBe(role === "staff" ? "/worklogs/new" : "/admin/record");
    }
  });
  it("has no anonymous/pending navigation and does not expose admin tools to staff", () => {
    for (const role of [null, "pending", "guest"]) expect(getWorkspaceNavigation(role)).toEqual([]);
    expect(getWorkspaceNavigation("staff").flatMap(group => group.items).some(entry => entry.href.startsWith("/admin"))).toBe(false);
    expect(getWorkspaceNavigation("admin").flatMap(group => group.items).some(entry => entry.id === "audit")).toBe(false);
  });
  it("keeps existing admin destinations and resolves the most specific path", () => {
    const nav = getWorkspaceNavigation("superadmin");
    expect(nav.flatMap(group => group.items).find(entry => entry.id === "audit").href).toBe("/admin/audit-logs");
    expect(activeNavigation("/admin/record", nav)).toBe("record");
    expect(activeNavigation("/admin/staff-analytics", nav)).toBe("staff");
    expect(activeNavigation("/worklogs/new", getWorkspaceNavigation("staff"))).toBe("record");
    expect(activeNavigation("/adminish", nav)).toBe(null);
  });
});
