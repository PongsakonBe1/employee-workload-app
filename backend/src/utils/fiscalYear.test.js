import { describe, it, expect } from "vitest";
import { normalizeFiscalYear, getFiscalYearRange, parseDateOnly } from "./fiscalYear.js";

describe("normalizeFiscalYear", () => {
  it("returns Gregorian year as-is when below 2400", () => {
    expect(normalizeFiscalYear(2026)).toBe(2026);
  });

  it("converts Buddhist Era year (>= 2400) to Gregorian", () => {
    expect(normalizeFiscalYear(2569)).toBe(2026);
  });

  it("handles boundary at 2400 (converts)", () => {
    expect(normalizeFiscalYear(2400)).toBe(1857);
  });

  it("handles year 2399 (does not convert)", () => {
    expect(normalizeFiscalYear(2399)).toBe(2399);
  });

  it("accepts string input that parses to integer", () => {
    expect(normalizeFiscalYear("2026")).toBe(2026);
  });

  it("throws for non-integer input", () => {
    expect(() => normalizeFiscalYear("abc")).toThrow("Fiscal year must be an integer");
  });

  it("throws for float input", () => {
    expect(() => normalizeFiscalYear(2026.5)).toThrow("Fiscal year must be an integer");
  });
});

describe("getFiscalYearRange", () => {
  it("returns correct range for Gregorian FY 2026", () => {
    const result = getFiscalYearRange(2026);
    expect(result.gregorianFiscalYear).toBe(2026);
    expect(result.buddhistFiscalYear).toBe(2569);
    expect(result.startDate).toBe("2025-10-01");
    expect(result.endDateInclusive).toBe("2026-09-30");
  });

  it("returns correct range for Buddhist Era FY 2569", () => {
    const result = getFiscalYearRange(2569);
    expect(result.gregorianFiscalYear).toBe(2026);
    expect(result.buddhistFiscalYear).toBe(2569);
    expect(result.startDate).toBe("2025-10-01");
    expect(result.endDateInclusive).toBe("2026-09-30");
  });

  it("start is a Date object at midnight UTC Oct 1 of previous year", () => {
    const result = getFiscalYearRange(2026);
    expect(result.start).toBeInstanceOf(Date);
    expect(result.start.toISOString()).toBe("2025-10-01T00:00:00.000Z");
  });

  it("endExclusive is midnight UTC Oct 1 of the fiscal year", () => {
    const result = getFiscalYearRange(2026);
    expect(result.endExclusive.toISOString()).toBe("2026-10-01T00:00:00.000Z");
  });
});

describe("parseDateOnly", () => {
  it("returns null for falsy input", () => {
    expect(parseDateOnly(null)).toBeNull();
    expect(parseDateOnly(undefined)).toBeNull();
    expect(parseDateOnly("")).toBeNull();
  });

  it("parses valid YYYY-MM-DD string to UTC Date", () => {
    const date = parseDateOnly("2026-03-15");
    expect(date).toBeInstanceOf(Date);
    expect(date.toISOString()).toBe("2026-03-15T00:00:00.000Z");
  });

  it("throws for invalid format (DD/MM/YYYY)", () => {
    expect(() => parseDateOnly("15/03/2026")).toThrow("Date must use YYYY-MM-DD format");
  });

  it("throws for partial date", () => {
    expect(() => parseDateOnly("2026-03")).toThrow("Date must use YYYY-MM-DD format");
  });

  it("converts numeric input to string before validating", () => {
    expect(() => parseDateOnly(20260315)).toThrow("Date must use YYYY-MM-DD format");
  });
});
