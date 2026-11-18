import { describe, expect, it } from "vitest";
import review from "../../docs/development/calendar-staging-writer-smoke/review.json";
import { cutoverValueHash } from "./calendarDirectDenialQa.js";
import { assertCalendarSmokeReply, calendarSmokeFresh, CALENDAR_SMOKE_REVIEW_HASH } from "./calendarTrustedSmoke.js";

describe("Calendar staging writer smoke", () => {
  it("pins the exact eight requests and accepts only an unexpired writer proof", async () => {
    const now = Date.parse("2026-11-18T14:00:00Z");
    const proof = { auditedAt: new Date(now).toISOString(), writerSmokeReviewHash: CALENDAR_SMOKE_REVIEW_HASH, readerChecksApproved: false, directWriteProbeApproved: false };
    expect(await cutoverValueHash(review)).toBe(CALENDAR_SMOKE_REVIEW_HASH);
    expect(review.requests).toHaveLength(8);
    expect(calendarSmokeFresh(proof, now)).toBe(true);
    expect(calendarSmokeFresh(proof, now + 600001)).toBe(false);
    expect(calendarSmokeFresh({ ...proof, directWriteProbeApproved: true }, now)).toBe(false);
  });
  it("requires actual HTTP 403 from Staff, rather than an expired login", () => {
    const denied = { code: "permission-denied" };
    expect(() => assertCalendarSmokeReply(review.requests[0], 403, denied)).not.toThrow();
    expect(() => assertCalendarSmokeReply(review.requests[0], 401, denied)).toThrow();
  });
  it("checks the operation identity and stops on partial or unexpected replay results", () => {
    const step = review.requests.find(value => value.id === "manual-replay");
    const operation = { operationId: "synthetic-operation" };
    const result = { ...operation, created: 0, skipped: 1, repeated: true };
    expect(() => assertCalendarSmokeReply(step, 200, result, operation)).not.toThrow();
    expect(() => assertCalendarSmokeReply(step, 200, { ...result, created: 1 }, operation)).toThrow();
    expect(() => assertCalendarSmokeReply(step, 200, { ...result, operationId: "different" }, operation)).toThrow();
  });
});
