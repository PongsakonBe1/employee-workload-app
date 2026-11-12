import { describe, it, expect, vi } from "vitest";
import { createTrustedCalendarTransport } from "./calendarTrustedTransport.js";
import { TRUSTED_EMULATOR_CONFIG, validateTrustedCalendarConfig, trustedCalendarRuntimeEnabled } from "./calendarTrustedConfig.js";
const saved = { created: 1, skipped: 0, repeated: false, operationId: "op-" + "a".repeat(64) };
function fixture() {
  const user = { uid: "synthetic-user", getIdToken: vi.fn(async () => "synthetic-not-a-credential") }, fetcher = vi.fn(async () => ({ ok: true, json: async () => saved })), getUser = vi.fn(() => user);
  return { user, fetcher, getUser, transport: createTrustedCalendarTransport({ fetcher, getUser }) };
}
describe("trusted calendar transport and config", () => {
  it("requires explicit development loopback flags and the exact demo config", () => {
    expect(trustedCalendarRuntimeEnabled("development", "1", true, { origin: "http://127.0.0.1:4313" })).toBe(true);
    for (const args of [["production", "1", true], ["development", "0", true], ["development", "1", false]]) expect(trustedCalendarRuntimeEnabled(...args, { origin: "http://127.0.0.1:4313" })).toBe(false);
    expect(trustedCalendarRuntimeEnabled("development", "1", true, { origin: "https://example.test" })).toBe(false);
    expect(validateTrustedCalendarConfig(TRUSTED_EMULATOR_CONFIG)).toEqual(TRUSTED_EMULATOR_CONFIG);
    expect(() => validateTrustedCalendarConfig({ ...TRUSTED_EMULATOR_CONFIG, projectId: "labboy-workload-app" })).toThrow();
  });
  it("sends frozen input only to the fixed API and omits cookies/redirects", async () => {
    const f = fixture(), input = { rules: [{ title: "Synthetic" }], events: [] }, pending = f.transport.create(input);input.rules[0].title = "Changed";
    await expect(pending).resolves.toEqual(saved);
    const [url, options] = f.fetcher.mock.calls[0];expect(url).toBe("http://127.0.0.1:4321/api/calendar/create");expect(options).toMatchObject({ credentials: "omit", redirect: "error", cache: "no-store" });expect(JSON.parse(options.body).rules[0].title).toBe("Synthetic");
  });
  it("blocks double submit and an account change before network transmission", async () => {
    const f = fixture();let release;f.user.getIdToken.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    const pending = f.transport.create({});await expect(f.transport.create({})).rejects.toHaveProperty("code", "calendar-write-validation");f.getUser.mockReturnValue(null);release("synthetic");
    await expect(pending).rejects.toHaveProperty("code", "session-changed");expect(f.fetcher).not.toHaveBeenCalled();
  });
  it.each([[403, "permission-denied"], [401, "permission-denied"], [400, "calendar-write-validation"], [409, "calendar-write-stale"], [503, "unavailable"]])("preserves definite versus uncertain failures for status %i", async (status, code) => {
    const f = fixture();f.fetcher.mockResolvedValueOnce({ ok: false, status, json: async () => ({ code, message: "Synthetic failure" }) });await expect(f.transport.create({})).rejects.toHaveProperty("code", code);
  });
  it("does not claim a commit after a lost reply, malformed result or account switch", async () => {
    const lost = fixture();lost.fetcher.mockRejectedValueOnce(new Error("Lost reply"));await expect(lost.transport.create({})).rejects.toThrow("Lost reply");
    const bad = fixture();bad.fetcher.mockResolvedValueOnce({ ok: true, json: async () => ({}) });await expect(bad.transport.create({})).rejects.toHaveProperty("code", "unavailable");
    const changed = fixture();changed.fetcher.mockImplementationOnce(async () => { changed.getUser.mockReturnValue(null);return { ok: true, json: async () => saved }; });await expect(changed.transport.create({})).rejects.toHaveProperty("code", "session-changed");
  });
});
