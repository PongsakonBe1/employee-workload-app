import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  validateRecipient,
  validateComment,
  validateTime,
  validateDate,
  validateMinorTask,
  validateWorklogForm,
  checkRateLimit,
  sanitizeInput,
  validateEmail,
  VALID_MINOR_TASKS,
} from "./validation.js";

// ── validateRecipient ────────────────────────────────────────────────────────

describe("validateRecipient", () => {
  it("returns valid for empty/null (optional field)", () => {
    expect(validateRecipient("")).toEqual({ valid: true });
    expect(validateRecipient(null)).toEqual({ valid: true });
    expect(validateRecipient(undefined)).toEqual({ valid: true });
  });

  it("returns valid for whitespace-only input (treated as empty)", () => {
    expect(validateRecipient("   ")).toEqual({ valid: true });
  });

  it("accepts valid alphanumeric recipient", () => {
    expect(validateRecipient("John")).toEqual({ valid: true });
  });

  it("accepts Thai characters", () => {
    expect(validateRecipient("สมชาย")).toEqual({ valid: true });
  });

  it("accepts allowed symbols (-, _, ., @, /, #)", () => {
    expect(validateRecipient("user@domain.com")).toEqual({ valid: true });
    expect(validateRecipient("room #303")).toEqual({ valid: true });
  });

  it("rejects disallowed characters", () => {
    const result = validateRecipient("user<script>");
    expect(result.valid).toBe(false);
  });

  it("rejects recipient exceeding 50 characters", () => {
    const long = "a".repeat(51);
    const result = validateRecipient(long);
    expect(result.valid).toBe(false);
  });

  it("accepts recipient at exactly 50 characters", () => {
    const exact = "a".repeat(50);
    expect(validateRecipient(exact).valid).toBe(true);
  });
});

// ── validateComment ──────────────────────────────────────────────────────────

describe("validateComment", () => {
  it("returns valid for null/undefined (optional)", () => {
    expect(validateComment(null)).toEqual({ valid: true });
    expect(validateComment(undefined)).toEqual({ valid: true });
  });

  it("returns valid for empty string", () => {
    expect(validateComment("")).toEqual({ valid: true });
  });

  it("accepts comment within 500 chars", () => {
    expect(validateComment("short comment")).toEqual({ valid: true });
  });

  it("rejects comment exceeding 500 chars", () => {
    const long = "x".repeat(501);
    const result = validateComment(long);
    expect(result.valid).toBe(false);
  });

  it("accepts comment at exactly 500 chars", () => {
    const exact = "x".repeat(500);
    expect(validateComment(exact).valid).toBe(true);
  });
});

// ── validateTime ─────────────────────────────────────────────────────────────

describe("validateTime", () => {
  it("rejects null/undefined/empty", () => {
    expect(validateTime(null).valid).toBe(false);
    expect(validateTime(undefined).valid).toBe(false);
    expect(validateTime("").valid).toBe(false);
  });

  it("accepts valid times", () => {
    expect(validateTime("00:00").valid).toBe(true);
    expect(validateTime("12:30").valid).toBe(true);
    expect(validateTime("23:59").valid).toBe(true);
  });

  it("rejects invalid hour", () => {
    expect(validateTime("24:00").valid).toBe(false);
    expect(validateTime("25:00").valid).toBe(false);
  });

  it("rejects invalid minute", () => {
    expect(validateTime("12:60").valid).toBe(false);
  });

  it("rejects malformed time", () => {
    expect(validateTime("1230").valid).toBe(false);
    expect(validateTime("12:3").valid).toBe(false);
    expect(validateTime("abc").valid).toBe(false);
  });
});

// ── validateDate ─────────────────────────────────────────────────────────────

describe("validateDate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-04T10:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects null/undefined/empty", () => {
    expect(validateDate(null).valid).toBe(false);
    expect(validateDate("").valid).toBe(false);
  });

  it("rejects invalid format", () => {
    expect(validateDate("04/06/2026").valid).toBe(false);
    expect(validateDate("2026-6-4").valid).toBe(false);
  });

  it("accepts today's date", () => {
    expect(validateDate("2026-06-04").valid).toBe(true);
  });

  it("accepts past dates", () => {
    expect(validateDate("2025-01-01").valid).toBe(true);
  });

  it("accepts tomorrow (allows 1 day ahead for late-night entries)", () => {
    expect(validateDate("2026-06-05").valid).toBe(true);
  });

  it("rejects dates more than 1 day in the future", () => {
    expect(validateDate("2026-06-06").valid).toBe(false);
  });

  it("accepts rolled-over calendar dates (JS Date behavior: Feb 30 → Mar 2)", () => {
    // Note: JavaScript's Date constructor does not reject invalid day-of-month;
    // "2026-02-30" becomes "2026-03-02". The validation only checks format + NaN.
    expect(validateDate("2026-02-30").valid).toBe(true);
  });

  it("rejects truly invalid date strings", () => {
    expect(validateDate("not-a-date").valid).toBe(false);
  });
});

// ── validateMinorTask ────────────────────────────────────────────────────────

describe("validateMinorTask", () => {
  it("rejects null/undefined/empty", () => {
    expect(validateMinorTask(null).valid).toBe(false);
    expect(validateMinorTask("").valid).toBe(false);
    expect(validateMinorTask("   ").valid).toBe(false);
  });

  it("accepts a valid minor task", () => {
    expect(validateMinorTask("Wifi").valid).toBe(true);
    expect(validateMinorTask("Gmail").valid).toBe(true);
  });

  it("rejects unknown minor task", () => {
    expect(validateMinorTask("FakeTask").valid).toBe(false);
  });

  it("VALID_MINOR_TASKS has 28 entries", () => {
    expect(VALID_MINOR_TASKS).toHaveLength(28);
  });
});

// ── validateWorklogForm ──────────────────────────────────────────────────────

describe("validateWorklogForm", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-04T10:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns valid for a complete correct form", () => {
    const result = validateWorklogForm({
      date: "2026-06-04",
      time: "09:00",
      minorTask: "Wifi",
      recipient: "John",
      comment: "Fixed wifi",
    });
    expect(result.valid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
  });

  it("collects multiple errors at once", () => {
    const result = validateWorklogForm({
      date: "",
      time: "",
      minorTask: "",
      recipient: "a".repeat(51),
      comment: "x".repeat(501),
    });
    expect(result.valid).toBe(false);
    expect(result.errors.date).toBeDefined();
    expect(result.errors.time).toBeDefined();
    expect(result.errors.minorTask).toBeDefined();
    expect(result.errors.recipient).toBeDefined();
    expect(result.errors.comment).toBeDefined();
  });

  it("allows optional fields to be missing", () => {
    const result = validateWorklogForm({
      date: "2026-06-04",
      time: "09:00",
      minorTask: "Wifi",
    });
    expect(result.valid).toBe(true);
  });
});

// ── checkRateLimit ───────────────────────────────────────────────────────────

describe("checkRateLimit", () => {
  it("allows request when under limit", () => {
    const now = Date.now();
    const requests = [now - 1000, now - 2000];
    const result = checkRateLimit(requests, 60000, 5);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(3);
  });

  it("blocks request when at limit", () => {
    const now = Date.now();
    const requests = Array.from({ length: 100 }, (_, i) => now - i * 100);
    const result = checkRateLimit(requests, 60000, 100);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("filters out requests outside the window", () => {
    const now = Date.now();
    const requests = [now - 120000, now - 90000, now - 1000];
    const result = checkRateLimit(requests, 60000, 5);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.recentRequests).toHaveLength(1);
  });

  it("uses default windowMs and maxRequests", () => {
    const result = checkRateLimit([]);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(100);
  });
});

// ── sanitizeInput ────────────────────────────────────────────────────────────

describe("sanitizeInput", () => {
  it("removes angle brackets", () => {
    expect(sanitizeInput("<script>alert('xss')</script>")).toBe("scriptalert('xss')/script");
  });

  it("trims whitespace", () => {
    expect(sanitizeInput("  hello  ")).toBe("hello");
  });

  it("returns non-string input as-is", () => {
    expect(sanitizeInput(123)).toBe(123);
    expect(sanitizeInput(null)).toBe(null);
  });
});

// ── validateEmail ────────────────────────────────────────────────────────────

describe("validateEmail", () => {
  it("rejects null/empty", () => {
    expect(validateEmail(null).valid).toBe(false);
    expect(validateEmail("").valid).toBe(false);
  });

  it("rejects invalid email format", () => {
    expect(validateEmail("not-an-email").valid).toBe(false);
  });

  it("rejects non-ICIT domain", () => {
    const result = validateEmail("user@gmail.com");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("@icit.kmutnb.ac.th");
  });

  it("accepts valid ICIT email", () => {
    expect(validateEmail("user@icit.kmutnb.ac.th").valid).toBe(true);
  });
});
