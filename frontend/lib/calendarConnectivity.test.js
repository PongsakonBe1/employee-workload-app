import { describe, it, expect, vi } from "vitest";
import { calendarConnectivityEnabled, createCalendarConnectivityTransport } from "./calendarConnectivity.js";
import { createCalendarStagingSession } from "./calendarStagingSession.js";
const origin = "http://127.0.0.1:4321", peer = { ok: true, projectId: "demo-calendar-trusted", mode: "emulator", protocol: 1, writesEnabled: false, connectivityEnabled: true, checks: { auth: true, profile: true, gate: true, classrooms: true, exams: true } };
const response = (value = peer, status = 200) => ({ ok: status === 200, status, headers: { get: () => "application/json" }, text: async () => JSON.stringify(value) });
function transport(fetcher = vi.fn(async () => response())) {
  let user = { uid: "synthetic-admin", getIdToken: vi.fn(async () => "synthetic-token") };
  return { run: createCalendarConnectivityTransport({ origin, getUser: () => user, fetcher }), fetcher, getUser: () => user, setUser: value => { user = value; } };
}
describe("read-only connectivity transport", () => {
  it("is opt-in, development-only, and requires explicit write-off", () => {
    expect(calendarConnectivityEnabled("development", "1", "1", "0")).toBe(true);
    for (const args of [["production", "1", "1", "0"], ["development", "0", "1", "0"], ["development", "1", "0", "0"], ["development", "1", "1", "1"], ["development", "1", "1", undefined]]) expect(calendarConnectivityEnabled(...args)).toBe(false);
  });
  it("uses the existing session and an empty body, returns only verified", async () => {
    const f = transport();expect(await f.run()).toEqual({ verified: true });expect(f.getUser().getIdToken).toHaveBeenCalledOnce();
    expect(f.fetcher.mock.calls[1]).toMatchObject([origin + "/api/calendar/connectivity", { method: "POST", credentials: "omit", redirect: "error", cache: "no-store", body: "{}", headers: { Authorization: "Bearer synthetic-token" } }]);
  });
  it.each([{ writesEnabled: true }, { projectId: "labboy-workload-app" }, { connectivityEnabled: false }, { protocol: 0 }])("does not send a token to a mismatched peer %j", async patch => {
    const f = transport(vi.fn(async () => response({ ...peer, ...patch })));await expect(f.run()).rejects.toThrow();expect(f.getUser().getIdToken).not.toHaveBeenCalled();expect(f.fetcher).toHaveBeenCalledOnce();
  });
  it("does not issue duplicate requests while pending", async () => {
    let finish;const f = transport(vi.fn(() => new Promise(resolve => { finish = resolve; }))), pending = f.run();await expect(f.run()).rejects.toHaveProperty("code", "calendar-connectivity-busy");f.setUser(null);finish(response());await expect(pending).rejects.toHaveProperty("code", "session-changed");
  });
  it("drops a late POST response after switching accounts", async () => {
    let finish;const f = transport(vi.fn().mockResolvedValueOnce(response()).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })));
    const pending = f.run();while (!finish) await Promise.resolve();f.setUser({ uid: "synthetic-other" });finish(response());await expect(pending).rejects.toHaveProperty("code", "session-changed");expect(f.fetcher).toHaveBeenCalledTimes(2);
  });
  it.each([401, 403, 429, 503])("handles HTTP %s without reflecting server details", async status => {
    const f = transport(vi.fn().mockResolvedValueOnce(response()).mockResolvedValueOnce(response({ message: "private" }, status)));await expect(f.run()).rejects.toHaveProperty("code", [401, 403].includes(status) ? "permission-denied" : status === 429 ? "calendar-connectivity-busy" : "unavailable");
  });
  it("rejects incomplete success payloads and unreviewed origin", async () => {
    expect(() => createCalendarConnectivityTransport({ origin: "https://example.test", getUser: () => null })).toThrow();
    const f = transport(vi.fn().mockResolvedValueOnce(response()).mockResolvedValueOnce(response({ ...peer, checks: {} })));await expect(f.run()).rejects.toHaveProperty("code", "unavailable");
  });
});
const config = { synthetic: true };
function sessionFixture(role = "superadmin", options = {}) {
  const user = { id: "synthetic-admin", role, active: true, calendarWriter: true };
  const client = { login: vi.fn(async () => {}), close: vi.fn(async () => {}), identity: vi.fn(async () => user), reader: { refresh: vi.fn() }, checkConnectivity: vi.fn(async () => ({ verified: true })) };
  // Validation itself is covered by the staging session/config tests; use a synthetic config here.
  const session = createCalendarStagingSession(() => client, { connectivity: true, validateConfig: value => value, ...options });
  return { client, session, user };
}
describe("read-only connectivity session", () => {
  it("keeps create/edit off and does not invalidate the calendar cache", async () => {
    const f = sessionFixture();await f.session.login(config);expect(f.session.getState()).toMatchObject({ canCreate: false, canEdit: false, canCheckConnectivity: true });
    await f.session.checkConnectivity();expect(f.session.getState()).toMatchObject({ checking: false, connectivityStatus: "verified", writeRevision: 0 });expect(f.client.reader.refresh).not.toHaveBeenCalled();
    await expect(f.session.create({})).rejects.toHaveProperty("code", "permission-denied");
  });
  it("denies Staff and capabilities revoked after login before API call", async () => {
    const staff = sessionFixture("staff");await staff.session.login(config);await expect(staff.session.checkConnectivity()).rejects.toHaveProperty("code", "permission-denied");expect(staff.client.checkConnectivity).not.toHaveBeenCalled();
    const f = sessionFixture();await f.session.login(config);f.user.calendarWriter = false;await expect(f.session.checkConnectivity()).rejects.toHaveProperty("code", "permission-denied");expect(f.session.getState().canCheckConnectivity).toBe(false);expect(f.client.checkConnectivity).not.toHaveBeenCalled();
  });
  it("suppresses double clicks and never publishes success after logout", async () => {
    let finish;const f = sessionFixture();f.client.checkConnectivity.mockImplementation(() => new Promise(resolve => { finish = resolve; }));await f.session.login(config);
    const pending = f.session.checkConnectivity();await Promise.resolve();await expect(f.session.checkConnectivity()).rejects.toHaveProperty("code", "calendar-connectivity-busy");
    await f.session.logout();finish({ verified: true });await expect(pending).rejects.toHaveProperty("code", "session-changed");expect(f.session.getState()).toMatchObject({ checking: false, connectivityStatus: null, user: null });
  });
  it("permits retry after failure without write outcome claims", async () => {
    const f = sessionFixture();await f.session.login(config);f.client.checkConnectivity.mockRejectedValueOnce(new Error("offline"));await expect(f.session.checkConnectivity()).rejects.toThrow();expect(f.session.getState()).toMatchObject({ checking: false, connectivityStatus: "failed", writeOutcome: null });await f.session.checkConnectivity();expect(f.session.getState().connectivityStatus).toBe("verified");
  });
  it("rejects writer/probe combinations", () => { expect(() => sessionFixture("admin", { writable: true })).toThrow(); });
});
