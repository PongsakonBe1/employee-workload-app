import { describe, expect, it, vi } from "vitest";
import { calendarReadMonths, createCalendarReadOnly, CALENDAR_READ_LIMIT } from "./calendarReadOnly";
const identity = {
  id: "a",
  role: "staff",
  active: true,
  displayName: "Staff A"
};
const exam = {
  id: "exam",
  date: "2026-11-03",
  startTime: "17:00",
  endTime: "18:30",
  locations: ["ห้อง 406"],
  studentCount: 30,
  proctors: ["a"],
  examType: "staff",
  isActive: true
};
function ports() {
  return {
    identity: vi.fn(async () => identity),
    directory: vi.fn(async () => [identity]),
    classrooms: vi.fn(async () => []),
    exams: vi.fn(async () => [exam])
  };
}
describe("read-only calendar windows", () => {
  it("uses complete month buckets across year/leap boundaries", () => {
    expect(calendarReadMonths("2026-12-28", "2027-01-03").map(x => [x.start, x.end])).toEqual([["2026-12-01", "2026-12-31"], ["2027-01-01", "2027-01-31"]]);
    expect(calendarReadMonths("2028-02-01", "2028-02-29")[0].end).toBe("2028-02-29");
  });
  it("rejects invalid, reversed and unbounded ranges", () => {
    for (const range of [["bad", "2026-11-03"], ["2026-11-03", "2026-11-02"], ["2026-01-01", "2030-01-01"]]) expect(() => calendarReadMonths(...range)).toThrow();
  });
  it("refuses unauthenticated access before invoking transport", async () => {
    const transport = ports(),
      reader = createCalendarReadOnly(transport);
    await expect(reader.read("2026-11-03", "2026-11-03")).rejects.toMatchObject({
      code: "unauthenticated"
    });
    expect(transport.identity).not.toHaveBeenCalled();
  });
  it.each([{
    ...identity,
    role: "user"
  }, {
    ...identity,
    active: false
  }, {
    ...identity,
    id: "other"
  }, null])("refuses an invalid directory identity before loading team data", async user => {
    const transport = ports();
    transport.identity.mockResolvedValue(user);
    const reader = createCalendarReadOnly(transport);
    reader.setSession("a");
    await expect(reader.read("2026-11-03", "2026-11-03")).rejects.toMatchObject({
      code: "permission-denied"
    });
    expect(transport.directory).not.toHaveBeenCalled();
    expect(transport.exams).not.toHaveBeenCalled();
  });
  it("deduplicates concurrent reads and reuses month data for day/week views", async () => {
    const transport = ports(),
      reader = createCalendarReadOnly(transport);
    reader.setSession("a");
    const [a, b] = await Promise.all([reader.read("2026-11-03", "2026-11-03"), reader.read("2026-11-02", "2026-11-08")]);
    expect(a.data.events[0].start).toBe("17:00");
    expect(b.identity.id).toBe("a");
    expect(transport.identity).toHaveBeenCalledTimes(1);
    expect(transport.directory).toHaveBeenCalledTimes(1);
    expect(transport.classrooms).toHaveBeenCalledTimes(1);
    expect(transport.exams).toHaveBeenCalledTimes(1);
  });
  it("only fetches additional months on a wider view", async () => {
    const transport = ports();
    transport.exams.mockImplementation(async start => start === "2026-11-01" ? [exam] : []);
    const reader = createCalendarReadOnly(transport);
    reader.setSession("a");
    await reader.read("2026-11-02", "2026-11-08");
    await reader.read("2026-10-26", "2026-12-06");
    await reader.read("2026-11-02", "2026-11-08");
    expect(transport.exams).toHaveBeenCalledTimes(3);
    expect(transport.directory).toHaveBeenCalledTimes(1);
  });
  it("expires caches and supports explicit refresh without changing session", async () => {
    let now = 0;
    const transport = ports(),
      reader = createCalendarReadOnly(transport, {
        now: () => now,
        ttl: 100
      });
    reader.setSession("a");
    await reader.read("2026-11-03", "2026-11-03");
    now = 101;
    await reader.read("2026-11-03", "2026-11-03");
    reader.refresh();
    await reader.read("2026-11-03", "2026-11-03");
    expect(transport.exams).toHaveBeenCalledTimes(3);
  });
  it("does not return cached data after sign-out or account switch", async () => {
    const transport = ports(),
      reader = createCalendarReadOnly(transport);
    reader.setSession("a");
    await reader.read("2026-11-03", "2026-11-03");
    reader.clear();
    await expect(reader.read("2026-11-03", "2026-11-03")).rejects.toMatchObject({
      code: "unauthenticated"
    });
    reader.setSession("b");
    transport.identity.mockResolvedValue({
      ...identity,
      id: "b"
    });
    await reader.read("2026-11-03", "2026-11-03");
    expect(transport.identity).toHaveBeenCalledTimes(2);
  });
  it("discards an in-flight identity read after session changes", async () => {
    let release;
    const transport = ports();
    transport.identity.mockImplementationOnce(() => new Promise(resolve => {
      release = resolve;
    }));
    const reader = createCalendarReadOnly(transport);
    reader.setSession("a");
    const pending = reader.read("2026-11-03", "2026-11-03");
    await Promise.resolve();
    reader.clear();
    release(identity);
    await expect(pending).rejects.toMatchObject({
      code: "session-changed"
    });
    expect(transport.directory).not.toHaveBeenCalled();
  });
  it("retries failures and rejects out-of-range results", async () => {
    const transport = ports();
    transport.exams.mockRejectedValueOnce(new Error("offline"));
    const reader = createCalendarReadOnly(transport);
    reader.setSession("a");
    await expect(reader.read("2026-11-03", "2026-11-03")).rejects.toThrow("offline");
    await expect(reader.read("2026-11-03", "2026-11-03")).resolves.toMatchObject({
      complete: true
    });
    reader.refresh();
    transport.exams.mockResolvedValue([{
      ...exam,
      date: "2027-01-01"
    }]);
    await expect(reader.read("2026-11-03", "2026-11-03")).rejects.toMatchObject({
      code: "invalid-range"
    });
  });
  it("rejects truncated results rather than treating a limit as complete data", async () => {
    const transport = ports();
    transport.directory.mockResolvedValue(Array.from({
      length: CALENDAR_READ_LIMIT + 1
    }, () => identity));
    const reader = createCalendarReadOnly(transport);
    reader.setSession("a");
    await expect(reader.read("2026-11-03", "2026-11-03")).rejects.toMatchObject({
      code: "too-many-records"
    });
  });
  it("has no mutating transport API and reports adapter omissions", async () => {
    const transport = ports();
    transport.exams.mockResolvedValue([{
      ...exam,
      startTime: ""
    }]);
    const reader = createCalendarReadOnly(transport);
    reader.setSession("a");
    const result = await reader.read("2026-11-03", "2026-11-03");
    expect(result.complete).toBe(false);
    expect(result.data.events).toEqual([]);
    expect(reader.write).toBeUndefined();
    expect(reader.commit).toBeUndefined();
  });
});
