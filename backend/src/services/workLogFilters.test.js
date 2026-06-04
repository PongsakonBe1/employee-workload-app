import { describe, it, expect } from "vitest";
import { buildWorkLogFilter } from "./workLogFilters.js";

describe("buildWorkLogFilter", () => {
  it("scopes to employee username for non-admin users", () => {
    const filter = buildWorkLogFilter({}, { role: "staff", username: "alice" });
    expect(filter.employeeUsername).toBe("alice");
  });

  it("does not scope to username for admin users", () => {
    const filter = buildWorkLogFilter({}, { role: "admin", username: "boss" });
    expect(filter.employeeUsername).toBeUndefined();
  });

  it("allows admin to filter by employee", () => {
    const filter = buildWorkLogFilter({ employee: " bob " }, { role: "admin" });
    expect(filter.employeeUsername).toBe("bob");
  });

  it("builds date range filter with $gte and $lt", () => {
    const filter = buildWorkLogFilter(
      { from: "2026-01-01", to: "2026-01-31" },
      { role: "admin" },
    );
    expect(filter.date.$gte).toBeInstanceOf(Date);
    expect(filter.date.$gte.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    // $lt should be the day AFTER 'to'
    expect(filter.date.$lt.toISOString()).toBe("2026-02-01T00:00:00.000Z");
  });

  it("builds date filter with only 'from'", () => {
    const filter = buildWorkLogFilter(
      { from: "2026-06-01" },
      { role: "admin" },
    );
    expect(filter.date.$gte).toBeDefined();
    expect(filter.date.$lt).toBeUndefined();
  });

  it("builds date filter with only 'to'", () => {
    const filter = buildWorkLogFilter(
      { to: "2026-06-30" },
      { role: "admin" },
    );
    expect(filter.date.$gte).toBeUndefined();
    expect(filter.date.$lt).toBeDefined();
  });

  it("includes mainDuty filter when provided", () => {
    const filter = buildWorkLogFilter(
      { mainDuty: " IT Support " },
      { role: "admin" },
    );
    expect(filter.mainDuty).toBe("IT Support");
  });

  it("includes minorTask filter when provided", () => {
    const filter = buildWorkLogFilter(
      { minorTask: "Wifi" },
      { role: "admin" },
    );
    expect(filter.minorTask).toBe("Wifi");
  });

  it("includes status filter when provided", () => {
    const filter = buildWorkLogFilter(
      { status: "approved" },
      { role: "admin" },
    );
    expect(filter.status).toBe("approved");
  });

  it("builds $or regex search across multiple fields", () => {
    const filter = buildWorkLogFilter(
      { search: "test query" },
      { role: "admin" },
    );
    expect(filter.$or).toHaveLength(5);
    expect(filter.$or[0].recipient).toBeInstanceOf(RegExp);
  });

  it("escapes regex special characters in search", () => {
    const filter = buildWorkLogFilter(
      { search: "test.query()" },
      { role: "admin" },
    );
    const regex = filter.$or[0].recipient;
    // Should NOT match unescaped dot
    expect(regex.test("testXquery()")).toBe(false);
    expect(regex.test("test.query()")).toBe(true);
  });

  it("returns empty filter when no query params and user is admin", () => {
    const filter = buildWorkLogFilter({}, { role: "admin" });
    expect(Object.keys(filter)).toHaveLength(0);
  });
});
