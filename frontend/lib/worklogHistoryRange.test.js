import { describe, expect, it } from "vitest";
import { worklogHistoryMonth, worklogHistoryRange } from "./worklogHistoryRange";

describe("worklog history date scope", () => {
  it("queries the exact calendar month across leap days and year boundaries", () => {
    expect(worklogHistoryRange({}, "2024-02-01")).toEqual({ start: "2024-02-01", end: "2024-02-29", empty: false });
    expect(worklogHistoryRange({}, "2026-12-01")).toEqual({ start: "2026-12-01", end: "2026-12-31", empty: false });
  });

  it("intersects an applied range with the visible month", () => {
    expect(worklogHistoryRange({ from: "2026-10-21", to: "2026-12-02" }, "2026-11-01"))
      .toEqual({ start: "2026-11-01", end: "2026-11-30", empty: false });
    expect(worklogHistoryRange({ from: "2026-11-19" }, "2026-11-01"))
      .toEqual({ start: "2026-11-19", end: "2026-11-30", empty: false });
    expect(worklogHistoryRange({ to: "2026-11-06" }, "2026-11-01"))
      .toEqual({ start: "2026-11-01", end: "2026-11-06", empty: false });
  });

  it("skips a disjoint month and opens the nearest bound when applying a filter", () => {
    const november = { from: "2026-11-19", to: "2026-11-20" };
    expect(worklogHistoryRange(november, "2026-10-01").empty).toBe(true);
    expect(worklogHistoryRange(november, "2026-12-01").empty).toBe(true);
    expect(worklogHistoryMonth(november, "2026-10-01")).toBe("2026-11-01");
    expect(worklogHistoryMonth({ from: "2026-08-15", to: "2026-10-16" }, "2026-11-01")).toBe("2026-10-01");
    expect(worklogHistoryMonth(november, "2026-11-01")).toBe("2026-11-01");
  });

  it("keeps the list date range uncoupled from the calendar", () => {
    expect(worklogHistoryRange({ from: "2026-08-15" })).toEqual({ start: "2026-08-15", end: "", empty: false });
    expect(worklogHistoryRange({ from: "2026-12-10", to: "2026-12-01" }).empty).toBe(true);
  });
});
