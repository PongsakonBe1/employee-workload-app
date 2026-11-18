import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDocsFromServer } from "firebase/firestore";
import { analyticsActor, ANALYTICS_PAGE_SIZE, createAnalyticsReader } from "./analyticsWorklogs";

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

  it("keeps inactive historical Staff in the directory by document ID", async () => {
    getDocsFromServer.mockResolvedValue(snapshot([
      from(staff.id, { uid: "legacy", role: "staff", active: false, nickname: "QA Staff", email: "omit" }),
      from("pending", { role: "pending" })
    ]));
    const reader = createAnalyticsReader({}, () => admin.id, admin);
    expect(await reader.directory()).toEqual([{ id: staff.id, displayName: "QA Staff", fullName: "", initial: "Q" }]);
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
