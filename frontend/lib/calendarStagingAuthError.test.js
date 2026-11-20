import { describe, expect, it } from "vitest";
import { calendarStagingAuthError } from "./calendarStagingAuthError.js";

describe("staging sign-in diagnostics", () => {
  it("distinguishes popup blocking, domain authorization and client initialization", () => {
    expect(calendarStagingAuthError({ code: "auth/popup-blocked" })).toContain("เบราว์เซอร์บล็อก popup");
    expect(calendarStagingAuthError({ code: "auth/unauthorized-domain" })).toContain("domain");
    expect(calendarStagingAuthError({ code: "auth/argument-error" })).toContain("ตัวเชื่อม Google popup");
  });
  it("gives retry guidance for cancellation and network errors", () => {
    for (const code of ["auth/popup-closed-by-user", "auth/cancelled-popup-request", "auth/network-request-failed"]) {
      expect(calendarStagingAuthError({ code })).toContain(code);
    }
  });
  it("does not expose provider messages, arbitrary codes or inherited properties", () => {
    for (const code of [undefined, "unknown-sensitive-value", "constructor", "__proto__"]) {
      const message = calendarStagingAuthError({ code, message: "provider-secret-details" });
      expect(message).not.toContain("provider-secret-details");
      expect(message).not.toContain(String(code));
      expect(message).toContain("แจ้งผู้ดูแล");
    }
    expect(calendarStagingAuthError(null)).toContain("แจ้งผู้ดูแล");
  });
});
