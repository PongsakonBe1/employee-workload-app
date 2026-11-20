import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDocsFromServer } from "firebase/firestore";
import { analyticsActor, ANALYTICS_PAGE_SIZE, createAnalyticsReader, filterAnalyticsTeamRows } from "./analyticsWorklogs";
import { planningCSV, planningData, planningStaff, planningSummary } from "./planningPreview";

vi.mock("firebase/firestore", () => ({
  collection: (_db, name) => name,
  query: (name, ...constraints) => [name, ...constraints],
  where: (...constraint) => ["where", ...constraint],
  orderBy: (...constraint) => ["orderBy", ...constraint],
  startAfter: cursor => ["startAfter", cursor],
  limit: count => ["limit", count],
  getDocsFromServer: vi.fn()
}));

const range = { start: "2026-11-16", end: "2026-11-22" };
const staff = { id: "staff-a", role: "staff" };
const admin = { id: "admin", role: "admin" };
const from = (id, data = {}) => ({ id, data: () => data });
const snapshot = docs => ({ docs, size: docs.length });

beforeEach(() => vi.resetAllMocks());

describe("analytics Firestore reader", () => {
  it("requires an active matching profile before starting a workspace", () => {
    const profile = { uid: staff.id, active: true, role: staff.role };
    expect(analyticsActor(profile, staff.id)).toEqual(staff);
    expect(analyticsActor(profile, "staff-b")).toBeNull();
    expect(analyticsActor({ ...profile, active: false }, staff.id)).toBeNull();
    expect(analyticsActor({ ...profile, role: "pending" }, staff.id)).toBeNull();
  });

  it("bounds Staff reads by dates and UID even if another employee is supplied", async () => {
    getDocsFromServer.mockResolvedValue(snapshot([from("actual", { id: "untrusted", employeeId: staff.id, date: range.start, minorTask: "QA", comboGroupId: "combo", recipient: "omit" })]));
    const reader = createAnalyticsReader({}, () => staff.id, staff);
    const page = await reader.page(range, "staff-b", null);
    expect(getDocsFromServer).toHaveBeenCalledWith([
      "worklogs", ["where", "date", ">=", range.start], ["where", "date", "<=", range.end],
      ["where", "employeeId", "==", staff.id], ["orderBy", "date", "desc"], ["limit", ANALYTICS_PAGE_SIZE + 1]
    ]);
    expect(page.rows[0]).toMatchObject({ id: "actual", comboGroupId: "combo" });
    expect(page.rows[0]).not.toHaveProperty("recipient");
    expect(page.cursor).toBeNull();
    await expect(reader.directory()).rejects.toThrow();
    expect(getDocsFromServer).toHaveBeenCalledTimes(1);
  });

  it("uses a document snapshot cursor, with lookahead excluded from the displayed page", async () => {
    const docs = Array.from({ length: ANALYTICS_PAGE_SIZE + 1 }, (_, id) => from(String(id), { date: range.start }));
    getDocsFromServer.mockResolvedValueOnce(snapshot(docs)).mockResolvedValueOnce(snapshot([docs.at(-1)]));
    const reader = createAnalyticsReader({}, () => admin.id, admin);
    const first = await reader.page(range, "all", null);
    expect(first.rows).toHaveLength(ANALYTICS_PAGE_SIZE);
    expect(first.cursor).toBe(docs.at(-2));
    expect(getDocsFromServer.mock.calls[0][0]).not.toContainEqual(["where", "employeeId", "==", "all"]);

    const last = await reader.page(range, staff.id, first.cursor);
    expect(getDocsFromServer.mock.calls[1][0]).toContainEqual(["where", "employeeId", "==", staff.id]);
    expect(getDocsFromServer.mock.calls[1][0]).toContainEqual(["startAfter", first.cursor]);
    expect(last.rows.map(row => row.id)).toEqual([docs.at(-1).id]);
    expect(last.cursor).toBeNull();
  });

  it.each(["admin", "superadmin"])("hides inactive profiles from %s analytics, including counts and export, until reopened", async role => {
    const actor = { ...admin, role };
    const reader = createAnalyticsReader({}, () => actor.id, actor);
    const docs = active => snapshot([
      from(staff.id, { uid: "legacy-field", role: "staff", active, nickname: "QA Staff", email: "omit" }),
      from("active-peer", { role: "staff", active: true, nickname: "QA Active" }),
      from("missing-active", { role: "admin", nickname: "QA Unconfirmed" }),
      from("other-role", { role: "pending", active: true }),
    ]);
    const worklogs = [
      { id: "staff-log", employeeId: staff.id, date: range.start, minorTask: "Staff work" },
      { id: "peer-log", employeeId: "active-peer", date: range.start, minorTask: "Peer work" },
      { id: "unresolved-log", employeeId: "historical-owner", date: range.start, minorTask: "Unknown work" },
    ];
    getDocsFromServer.mockResolvedValueOnce(docs(false)).mockResolvedValueOnce(docs(true));
    const disabled = await reader.directory();
    expect(disabled.people.map(person => person.displayName)).toEqual(["QA Active"]);
    expect(disabled.inactiveIds).toEqual(new Set([staff.id, "missing-active"]));
    const scoped = planningData(filterAnalyticsTeamRows(worklogs, disabled.inactiveIds), disabled.people, range, actor);
    expect(scoped.rows.map(row => row.id)).toEqual(["peer-log", "unresolved-log"]);
    expect(planningSummary(scoped.rows)).toMatchObject({ activities: 2, people: 1, unresolved: 1 });
    expect(planningCSV(planningStaff(scoped.rows, disabled.people), range, false)).not.toContain("QA Staff");

    const reopened = await reader.directory();
    expect(reopened.people.map(person => person.id)).toEqual(["active-peer", staff.id]);
    const restored = planningData(filterAnalyticsTeamRows(worklogs, reopened.inactiveIds), reopened.people, range, actor);
    expect(planningSummary(restored.rows)).toMatchObject({ activities: 3, people: 2, unresolved: 1 });
    expect(planningCSV(planningStaff(restored.rows, reopened.people), range, false)).toContain("QA Staff");
    expect(worklogs).toHaveLength(3);
  });

  it("discards results after account changes and rejects stale queries before sending", async () => {
    let uid = admin.id;
    getDocsFromServer.mockImplementation(async () => { uid = staff.id;return snapshot([]); });
    const reader = createAnalyticsReader({}, () => uid, admin);
    await expect(reader.page(range, "all", null)).rejects.toThrow("session changed");
    await expect(reader.page(range, "all", null)).rejects.toThrow("session changed");
    expect(getDocsFromServer).toHaveBeenCalledTimes(1);
  });
});
