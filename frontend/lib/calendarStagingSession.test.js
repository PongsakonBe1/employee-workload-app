import { describe, it, expect, vi } from "vitest";
import { createCalendarStagingSession } from "./calendarStagingSession.js";
import { createCalendarReadOnly } from "./calendarReadOnly.js";
import { STAGING_PROJECT, STAGING_APP } from "./calendarStagingConfig.js";
const config = { projectId: STAGING_PROJECT, appId: STAGING_APP, authDomain: STAGING_PROJECT + ".firebaseapp.com", apiKey: "public-test-placeholder" };
function client(role = "staff", uid = "synthetic-staff") {
  const identity = { id: uid, displayName: "Synthetic tester", role, active: true };
  const transport = { identity: vi.fn(async () => identity), directory: vi.fn(async () => []), classrooms: vi.fn(async () => []), exams: vi.fn(async () => []) };
  const reader = createCalendarReadOnly(transport, { now: () => 0 });
  return { identity: vi.fn(async () => identity), login: vi.fn(async () => reader.setSession(uid)), close: vi.fn(async () => reader.clear()), reader, transport };
}
describe("read-only staging workspace session across navigation", () => {
  it("validates the staging config before constructing a client and rejects a production fallback", async () => {
    const factory = vi.fn(), session = createCalendarStagingSession(factory);
    await expect(session.login({ ...config, projectId: "labboy-workload-app" })).rejects.toThrow();expect(factory).not.toHaveBeenCalled();expect(session.getState().user).toBeNull();
  });
  it("uses one explicitly read-only client and reuses its calendar cache across page reads", async () => {
    const sdk = client(), factory = vi.fn(() => sdk), session = createCalendarStagingSession(factory);
    await session.login(config);expect(factory.mock.calls[0][1]).toEqual({ writer: false, roleQa: false, roleWriteQa: false });
    await session.read("2026-11-09", "2026-11-15");const before = session.stats();
    await session.read("2026-11-09", "2026-11-15");expect(session.stats()).toEqual(before);expect(factory).toHaveBeenCalledOnce();
    session.refresh();await session.read("2026-11-09", "2026-11-15");expect(sdk.transport.classrooms).toHaveBeenCalledTimes(2);
  });
  it("fails closed if a factory unexpectedly exposes writer methods", async () => {
    const sdk = { ...client(), create: vi.fn() }, session = createCalendarStagingSession(() => sdk);
    await expect(session.login(config)).rejects.toMatchObject({ code: "read-only-client-required" });expect(sdk.login).not.toHaveBeenCalled();expect(sdk.close).toHaveBeenCalledOnce();
  });
  it("logout synchronously removes identity, invalidates reads and clears cached months", async () => {
    const sdk = client(), session = createCalendarStagingSession(() => sdk);
    await session.login(config);await session.read("2026-11-09", "2026-11-15");const closing = session.logout();
    expect(session.getState().user).toBeNull();await expect(session.read("2026-11-09", "2026-11-15")).rejects.toMatchObject({ code: "unauthenticated" });await closing;expect(sdk.reader.stats().cachedMonths).toEqual([]);
  });
  it("does not revive a session when an old sign-in completes after logout", async () => {
    let release;const sdk = client();sdk.login.mockImplementation(() => new Promise(resolve => { release = resolve; }));
    const session = createCalendarStagingSession(() => sdk), login = session.login(config);
    await Promise.resolve();await session.logout();release();await expect(login).rejects.toMatchObject({ code: "session-changed" });expect(session.getState().user).toBeNull();
  });
  it.each(["user", "unknown"])("does not accept unsupported role %s", async role => {
    const sdk = client(role), session = createCalendarStagingSession(() => sdk);await expect(session.login(config)).rejects.toMatchObject({ code: "permission-denied" });expect(session.getState().status).toBe("error");
  });
  it("drops the session and data access when a fresh read is denied", async () => {
    const sdk = client(), session = createCalendarStagingSession(() => sdk);await session.login(config);
    sdk.transport.identity.mockRejectedValue({ code: "permission-denied" });await expect(session.read("2026-11-09", "2026-11-15")).rejects.toMatchObject({ code: "permission-denied" });
    expect(session.getState().user).toBeNull();expect(sdk.close).toHaveBeenCalledOnce();expect(session.stats()).toBeNull();
  });
  it("keeps a second account isolated from the first account's cached identity", async () => {
    const first = client(), second = client("superadmin", "synthetic-super"), factory = vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(second), session = createCalendarStagingSession(factory);
    await session.login(config);await session.read("2026-11-09", "2026-11-15");await session.logout();await session.login(config);
    expect((await session.read("2026-11-09", "2026-11-15")).identity.id).toBe("synthetic-super");expect(session.getState().user.role).toBe("superadmin");
  });
  it("rejects an old in-flight read after a different account logs in", async () => {
    let release;const first = client(), second = client("superadmin", "synthetic-second");
    first.reader.read = vi.fn(() => new Promise(resolve => { release = resolve; }));
    const factory = vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(second), session = createCalendarStagingSession(factory);
    await session.login(config);const pending = session.read("2026-11-09", "2026-11-15");await session.logout();await session.login(config);
    release({ identity: { id: "synthetic-staff", role: "staff", active: true }, data: { rules: [], events: [] } });
    await expect(pending).rejects.toMatchObject({ code: "session-changed" });expect(session.getState().user.id).toBe("synthetic-second");
  });
  it("does not publish an inactive profile even after a successful Google popup", async () => {
    const sdk = client();sdk.identity.mockResolvedValue({ id: "synthetic-staff", role: "staff", active: false });
    const session = createCalendarStagingSession(() => sdk);await expect(session.login(config)).rejects.toMatchObject({ code: "permission-denied" });expect(session.getState().user).toBeNull();expect(sdk.close).toHaveBeenCalledOnce();
  });
});
