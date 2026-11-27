import { describe, expect, it } from "vitest";
import { calendarToday } from "./calendarView.js";
import { equipmentRange } from "./equipmentRange.js";

describe("equipment report date ranges", () => {
  it.each([
    ["day", "2026-11-29", "2026-11-29", "2026-11-29"],
    ["week", "2026-11-29", "2026-11-23", "2026-11-29"],
    ["week", "2026-11-30", "2026-11-30", "2026-12-06"],
    ["month", "2026-11-28", "2026-11-01", "2026-11-30"],
    ["month", "2028-02-29", "2028-02-01", "2028-02-29"],
    ["quarter", "2026-12-31", "2026-10-01", "2026-12-31"],
    ["year", "2027-01-01", "2027-01-01", "2027-12-31"],
    ["fiscal", "2026-09-30", "2025-10-01", "2026-09-30"],
    ["fiscal", "2026-10-01", "2026-10-01", "2027-09-30"],
  ])("uses inclusive %s boundaries for %s", (mode, today, start, end) => {
    expect(equipmentRange(today, mode)).toEqual({ start, end });
  });

  it.each([
    ["2026-10-31T16:59:59Z", "2026-10-01", "2026-10-31"],
    ["2026-10-31T17:00:00Z", "2026-11-01", "2026-11-30"],
  ])("resolves the equipment month from the Bangkok date at %s", (instant, start, end) => {
    expect(equipmentRange(calendarToday(new Date(instant)), "month")).toEqual({ start, end });
  });

  it.each([
    { start: "", end: "2026-11-30" },
    { start: "2026-11-01", end: "" },
    { start: "2026-11-30", end: "2026-11-01" },
    { start: "2026-02-29", end: "2026-03-01" },
  ])("rejects an invalid custom window rather than passing through all dates", custom => {
    expect(equipmentRange("2026-11-28", "custom", custom)).toBeNull();
  });

  it("allows custom ranges across month boundaries and a single day", () => {
    for (const custom of [
      { start: "2026-11-30", end: "2026-12-01" },
      { start: "2028-02-29", end: "2028-02-29" },
    ]) {
      expect(equipmentRange("2026-11-28", "custom", custom)).toEqual(custom);
    }
  });
});
