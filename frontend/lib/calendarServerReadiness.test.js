import { describe, it, expect, vi } from "vitest";
import { createCalendarServerReadiness } from "./calendarServerReadiness.js";
import { createTrustedCalendarTransport } from "./calendarTrustedTransport.js";
import { stagingCalendarServerEnabled } from "./calendarStagingServerConfig.js";
import { STAGING_CALENDAR_API_ORIGIN } from "./calendarServerProtocol.js";
const healthy = { ok: true, projectId: "labboy-workload-app-staging", mode: "staging", protocol: 1, writesEnabled: true };
const response = value => ({ ok: true, headers: { get: () => "application/json" }, text: async () => JSON.stringify(value) });
describe("server warmup is a distinct pre-submit boundary", () => {
  it("waits through a warming proxy without tokens or POST requests", async () => {
    let time = 0;const fetcher = vi.fn().mockResolvedValueOnce({ ok: true, headers: { get: () => "text/html" } }).mockRejectedValueOnce(new Error("Warming")).mockResolvedValueOnce(response(healthy));
    await createCalendarServerReadiness({ origin: STAGING_CALENDAR_API_ORIGIN, fetcher, now: () => time, pause: async ms => { time += ms; } })();
    expect(time).toBe(6000);expect(fetcher).toHaveBeenCalledTimes(3);
    for (const [, options] of fetcher.mock.calls) { expect(options.method).toBe("GET");expect(options.headers).toBeUndefined();expect(options.redirect).toBe("error");expect(options.credentials).toBe("omit"); }
  });
  it.each([{ projectId: "labboy-workload-app" }, { mode: "emulator" }, { protocol: 2 }, { writesEnabled: false }, { ok: false }])("rejects a wrong or disabled peer before writing %j", async patch => {
    const fetcher = vi.fn(async () => response({ ...healthy, ...patch }));
    await expect(createCalendarServerReadiness({ origin: STAGING_CALENDAR_API_ORIGIN, fetcher })()).rejects.toHaveProperty("code", "calendar-write-preflight");expect(fetcher).toHaveBeenCalledOnce();
  });
  it("has a finite budget for failed/HTML warmups", async () => {
    let time = 0;const fetcher = vi.fn(async () => ({ ok: false }));
    await expect(createCalendarServerReadiness({ origin: STAGING_CALENDAR_API_ORIGIN, fetcher, now: () => time, pause: async ms => { time += ms; }, budgetMs: 6000 })()).rejects.toThrow("ยังไม่ได้ส่ง");expect(time).toBe(6000);expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("does not follow arbitrary URLs or enable the staging writer in production", () => {
    expect(() => createCalendarServerReadiness({ origin: "https://example.test" })).toThrow();
    expect(stagingCalendarServerEnabled("development", "1", false, STAGING_CALENDAR_API_ORIGIN)).toBe(true);
    expect(stagingCalendarServerEnabled("production", "1", false, STAGING_CALENDAR_API_ORIGIN)).toBe(false);
    expect(stagingCalendarServerEnabled("development", "1", true, STAGING_CALENDAR_API_ORIGIN)).toBe(false);
    expect(stagingCalendarServerEnabled("development", "0", false, STAGING_CALENDAR_API_ORIGIN)).toBe(false);
  });
  it("requires a per-user preflight ticket and consumes it before POST", async () => {
    const user = { uid: "synthetic", getIdToken: vi.fn(async () => "synthetic-token") };
    const fetcher = vi.fn(async (_url, options) => options.method === "GET" ? response(healthy) : { ok: true, json: async () => ({ created: 1, skipped: 0, repeated: false, operationId: "op-" + "a".repeat(64) }) });
    const transport = createTrustedCalendarTransport({ getUser: () => user, fetcher, origin: STAGING_CALENDAR_API_ORIGIN, readiness: true });
    await expect(transport.create({})).rejects.toHaveProperty("code", "calendar-write-preflight");expect(fetcher).not.toHaveBeenCalled();
    await transport.prepareWrite();await transport.create({});expect(fetcher.mock.calls.map(([, options]) => options.method)).toEqual(["GET", "POST"]);
    await expect(transport.create({})).rejects.toHaveProperty("code", "calendar-write-preflight");
  });
});
