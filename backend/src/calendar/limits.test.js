import { describe, it, expect } from "vitest";
import { createCalendarLimits } from "./limits.js";
describe("bounded per-process calendar admission", () => {
  it("caps requests before expensive auth and resets the window", () => {
    let now = 0;const limit = createCalendarLimits({ now: () => now, globalLimit: 2 });
    expect(limit.request()).toBe(true);expect(limit.request()).toBe(true);expect(limit.request()).toBe(false);now = 60000;expect(limit.request()).toBe(true);
  });
  it("bounds concurrency and releases a slot only once", () => {
    const limit = createCalendarLimits({ concurrent: 1 });const release = limit.enter("synthetic-a");
    expect(limit.enter("synthetic-b")).toBeNull();release();release();expect(typeof limit.enter("synthetic-b")).toBe("function");expect(limit.enter("synthetic-c")).toBeNull();
  });
  it("bounds users and user rates without retaining them beyond the window", () => {
    let now = 0;const limit = createCalendarLimits({ now: () => now, maxUsers: 1, userLimit: 1 });limit.enter("synthetic-a")();
    expect(limit.enter("synthetic-a")).toBeNull();expect(limit.enter("synthetic-b")).toBeNull();now = 60000;expect(typeof limit.enter("synthetic-b")).toBe("function");
  });
});
