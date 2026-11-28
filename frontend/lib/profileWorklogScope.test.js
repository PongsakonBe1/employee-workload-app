import { describe, expect, it } from "vitest";
import { calculateRadarData } from "./analytics.js";
import { calendarToday } from "./calendarView.js";
import { profileWorklogsInScope, recentProfileTopicWorklogs } from "./profileWorklogScope.js";

describe("profile worklog ranges", () => {
  it("uses the Bangkok month boundary even when UTC is on the previous day", () => {
    const today = calendarToday(new Date("2026-11-30T17:05:00Z"));
    const worklogs = ["2026-11-30", "2026-12-01", "2026-12-02", "2026-11-31", null].map(date => ({ date }));
    expect(profileWorklogsInScope(worklogs, "month", today)).toEqual([{ date: "2026-12-01" }]);
  });

  it("includes today and 89 previous days, and keeps the complete loaded sample for recent", () => {
    const worklogs = ["2026-09-02", "2026-09-03", "2026-12-01", "2026-12-02"].map(date => ({ date }));
    expect(profileWorklogsInScope(worklogs, "last90", "2026-12-01")).toEqual(worklogs.slice(1, 3));
    expect(profileWorklogsInScope(worklogs, "recent", "2026-12-01")).toBe(worklogs);
    expect(profileWorklogsInScope([], "month", "2026-12-01")).toEqual([]);
  });

  it("uses the same topic as the radar and caps details to the latest five sorted by work date and time", () => {
    const worklogs = [
      ...Array.from({ length: 6 }, (_, index) => ({ id: index, date: "2026-12-01", time: `0${index}:00`, minorTask: "Wifi" })),
      { id: 6, date: "2026-12-01", time: "11:00", category: "Wifi" },
      { id: 7, date: "2026-12-01", time: "10:00", minorTask: "บัญชี", category: "Wifi" },
    ];
    expect(calculateRadarData(worklogs)[0]).toMatchObject({ subject: "Wifi", count: 7 });
    expect(recentProfileTopicWorklogs(worklogs, "Wifi").map(({ id }) => id)).toEqual([6, 5, 4, 3, 2]);
    expect(worklogs[0].id).toBe(0);
  });
});
