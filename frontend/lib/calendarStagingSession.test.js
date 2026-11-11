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

const draft = (title = "Synthetic session fixture") => ({ rules: [{ id: "ui-row", title, rooms: ["401"], weekday: 0, validFrom: "2027-05-17", validTo: "2027-05-17", start: "09:00", end: "10:00", semester: "1/2570", teacher: "" }], events: [] });
const saved = { created: 1, skipped: 0, operationId: "op-" + "a".repeat(64), repeated: false };
function writerClient(role = "superadmin", capability = true) {
  const sdk = client(role), profile = { id: "synthetic-staff", displayName: "Synthetic tester", role, active: true, calendarWriter: capability };
  sdk.identity.mockResolvedValue(profile);sdk.transport.identity.mockResolvedValue(profile);sdk.create = vi.fn(async () => ({ ...saved }));
  return { sdk, profile };
}
describe("opt-in staging session writes", () => {
  it("keeps the default session read-only and never forwards create", async () => {
    const sdk = client(), session = createCalendarStagingSession(() => sdk);await session.login(config);
    expect(session.getState().canCreate).toBe(false);await expect(session.create(draft())).rejects.toMatchObject({ code: "permission-denied" });
  });
  it.each([["staff",true],["admin",false],["superadmin",false]])("denies %s without the required role/capability pair (%s)", async (role, capability) => {
    const { sdk } = writerClient(role, capability), session = createCalendarStagingSession(() => sdk, { writable: true });await session.login(config);
    expect(session.getState().canCreate).toBe(false);await expect(session.create(draft())).rejects.toMatchObject({ code: "permission-denied" });expect(sdk.create).not.toHaveBeenCalled();
  });
  it.each(["admin","superadmin"])("supports an active %s writer only through explicit opt-in", async role => {
    const { sdk } = writerClient(role), factory = vi.fn(() => sdk), session = createCalendarStagingSession(factory, { writable: true });await session.login(config);
    expect(factory.mock.calls[0][1]).toEqual({ writer: true, roleQa: false, roleWriteQa: false });expect(session.getState().canCreate).toBe(true);
    await expect(session.create(draft())).resolves.toEqual(saved);expect(session.getState()).toMatchObject({ saving: false, writeRevision: 1, writeOutcome: { status: "committed", readBack: "pending" } });
  });
  it("rejects a writable client without a create method or with a QA mutation API", async () => {
    const session = createCalendarStagingSession(() => client(), { writable: true });await expect(session.login(config)).rejects.toMatchObject({ code: "writer-client-required" });
    const other = createCalendarStagingSession(() => ({ ...writerClient().sdk, roleWriteQa: {} }), { writable: true });await expect(other.login(config)).rejects.toMatchObject({ code: "read-only-client-required" });
  });
  it("freezes the reviewed payload and suppresses a second submit before preflight returns", async () => {
    const { sdk } = writerClient(), session = createCalendarStagingSession(() => sdk, { writable: true });await session.login(config);
    let release;sdk.identity.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    const input = draft(), before = structuredClone(input), pending = session.create(input);input.rules[0].title = "Changed after click";
    expect(session.getState().saving).toBe(true);await expect(session.create(draft())).rejects.toMatchObject({ code: "calendar-write-validation" });
    release({ id: "synthetic-staff", role: "superadmin", active: true, calendarWriter: true });await pending;expect(sdk.create).toHaveBeenCalledExactlyOnceWith(before);
  });
  it("rechecks a revoked capability before forwarding to the writer", async () => {
    const { sdk, profile } = writerClient(), session = createCalendarStagingSession(() => sdk, { writable: true });await session.login(config);
    sdk.identity.mockResolvedValue({ ...profile, calendarWriter: false });await expect(session.create(draft())).rejects.toMatchObject({ code: "permission-denied" });
    expect(sdk.create).not.toHaveBeenCalled();expect(session.getState()).toMatchObject({ canCreate: false, saving: false, status: "ready" });
  });
  it("leaves a validation error editable without recording a commit or retry-only batch", async () => {
    const { sdk } = writerClient(), session = createCalendarStagingSession(() => sdk, { writable: true });await session.login(config);
    sdk.create.mockRejectedValueOnce({ code: "calendar-write-validation", message: "Room conflict" });await expect(session.create(draft())).rejects.toMatchObject({ message: "Room conflict" });
    expect(session.getState().writeOutcome).toBeNull();await session.create(draft("Corrected"));expect(session.getState().writeOutcome.status).toBe("committed");
  });
  it("does not call the writer when the fresh identity read fails", async () => {
    const { sdk } = writerClient(), session = createCalendarStagingSession(() => sdk, { writable: true });await session.login(config);sdk.identity.mockRejectedValueOnce({ code: "unavailable" });
    await expect(session.create(draft())).rejects.toMatchObject({ code: "calendar-write-preflight" });expect(sdk.create).not.toHaveBeenCalled();expect(session.getState().saving).toBe(false);
  });
  it("retains an uncertain batch, rejects a different batch and retries the frozen original", async () => {
    const { sdk } = writerClient(), session = createCalendarStagingSession(() => sdk, { writable: true });await session.login(config);
    sdk.create.mockRejectedValueOnce({ code: "unavailable" }).mockResolvedValueOnce({ ...saved, created: 0, skipped: 1, repeated: true });
    const input = draft();await expect(session.create(input)).rejects.toMatchObject({ code: "calendar-write-uncertain" });input.rules[0].title = "Edited after uncertainty";
    expect(session.getState()).toMatchObject({ saving: false, writeOutcome: { status: "uncertain" } });
    await expect(session.create(input)).rejects.toMatchObject({ code: "calendar-write-validation" });expect(sdk.create).toHaveBeenCalledTimes(1);
    const result = await session.retryCreate();expect(result.repeated).toBe(true);expect(sdk.create.mock.calls[1][0]).toEqual(draft());expect(session.getState().writeOutcome.status).toBe("committed");
  });
  it("allows identical UI retries even when the form generates a new row ID", async () => {
    const { sdk } = writerClient(), session = createCalendarStagingSession(() => sdk, { writable: true });await session.login(config);sdk.create.mockRejectedValueOnce({ code: "unavailable" });
    await expect(session.create(draft())).rejects.toMatchObject({ code: "calendar-write-uncertain" });const retry = draft();retry.rules[0].id = "new-ui-row";await expect(session.create(retry)).resolves.toEqual(saved);
  });
  it("invalidates pre-write cache and distinguishes committed writes from failed reads", async () => {
    const { sdk } = writerClient(), session = createCalendarStagingSession(() => sdk, { writable: true });await session.login(config);await session.read("2027-05-17", "2027-05-17");
    await session.create(draft());expect(session.stats().cachedMonths).toEqual([]);sdk.transport.classrooms.mockRejectedValueOnce({ code: "unavailable" });
    await expect(session.read("2027-05-17", "2027-05-17")).rejects.toMatchObject({ code: "unavailable" });expect(session.getState().writeOutcome).toMatchObject({ status: "committed", created: 1, readBack: "failed" });
    await session.read("2027-05-17", "2027-05-17");expect(session.getState().writeOutcome.readBack).toBe("verified");expect(sdk.create).toHaveBeenCalledTimes(1);
  });
  it("does not publish an old read after a commit or turn it into a read-back failure", async () => {
    const { sdk, profile } = writerClient(), session = createCalendarStagingSession(() => sdk, { writable: true });await session.login(config);
    let release;sdk.reader.read = vi.fn(() => new Promise(resolve => { release = resolve; }));const pending = session.read("2027-05-17", "2027-05-17");
    await session.create(draft());release({ identity: profile, data: { rules: [], events: [] } });await expect(pending).rejects.toMatchObject({ code: "session-changed" });expect(session.getState().writeOutcome.readBack).toBe("pending");
  });
  it("does not let an invalidated old read overwrite a successful refreshed read-back", async () => {
    const { sdk, profile } = writerClient(), session = createCalendarStagingSession(() => sdk, { writable: true });await session.login(config);await session.create(draft());
    let reject;sdk.reader.read = vi.fn().mockImplementationOnce(() => new Promise((_resolve, fail) => { reject = fail; })).mockResolvedValueOnce({ identity: profile, data: { rules: [], events: [] } });
    const old = session.read("2027-05-17", "2027-05-17");session.refresh();await session.read("2027-05-17", "2027-05-17");reject({ code: "session-changed" });
    await expect(old).rejects.toMatchObject({ code: "session-changed" });expect(session.getState().writeOutcome.readBack).toBe("verified");
  });
  it("does not publish a late write into a new account, or claim it was cancelled", async () => {
    const first = writerClient(), second = client(), factory = vi.fn().mockReturnValueOnce(first.sdk).mockReturnValueOnce({ ...second, create: vi.fn() }), session = createCalendarStagingSession(factory, { writable: true });await session.login(config);
    let release;first.sdk.create.mockImplementation(() => new Promise(resolve => { release = resolve; }));const pending = session.create(draft());await vi.waitFor(() => expect(first.sdk.create).toHaveBeenCalledOnce());
    await session.logout();await session.login(config);release(saved);await expect(pending).rejects.toMatchObject({ code: "calendar-write-uncertain" });
    expect(session.getState()).toMatchObject({ canCreate: false, saving: false, writeRevision: 0, writeOutcome: null });
  });
});

const mutationDraft = () => ({ action: "cancel", original: { id: "synthetic", title: "Synthetic fixture" } });
const mutationSaved = { action: "cancel", changed: 1, repeated: false, operationId: "op-" + "c".repeat(64) };
function mutationClient() { const value = writerClient();value.sdk.mutate = vi.fn(async () => ({ ...mutationSaved }));return value; }
describe("mutation receipt replay session boundary", () => {
  const packet = { text: "synthetic-reviewed-packet", index: 0 };
  const repeated = { action: "replay", changed: 0, repeated: true, operationId: "synthetic-receipt" };
  it("never forwards replay from default, create-only or Staff sessions", async () => {
    for (const options of [{}, { writable: true }, { writable: true, mutable: true }]) {
      const { sdk, profile } = writerClient(options.mutable ? "staff" : "superadmin");
      if (!options.writable) delete sdk.create;
      if (options.mutable) sdk.mutate = vi.fn();
      sdk.replayQa = vi.fn();sdk.identity.mockResolvedValue(profile);
      const session = createCalendarStagingSession(() => sdk, options);await session.login(config);
      await expect(session.replayQa(packet)).rejects.toHaveProperty("code", "permission-denied");
      expect(sdk.replayQa).not.toHaveBeenCalled();
    }
  });
  it("requires an available QA API and rechecks a revoked writer before replay", async () => {
    const { sdk, profile } = mutationClient(), session = createCalendarStagingSession(() => sdk, { writable: true, mutable: true });await session.login(config);
    await expect(session.replayQa(packet)).rejects.toHaveProperty("code", "calendar-write-validation");
    sdk.replayQa = vi.fn();sdk.identity.mockResolvedValueOnce({ ...profile, calendarWriter: false });
    await expect(session.replayQa(packet)).rejects.toHaveProperty("code", "permission-denied");
    expect(sdk.replayQa).not.toHaveBeenCalled();expect(session.getState().canEdit).toBe(false);
  });
  it("shares double-submit protection and refreshes cached reads after receipt replay", async () => {
    const { sdk } = mutationClient();let release;sdk.replayQa = vi.fn(() => new Promise(resolve => { release = resolve; }));
    const session = createCalendarStagingSession(() => sdk, { writable: true, mutable: true });await session.login(config);await session.read("2027-05-17", "2027-05-17");
    const pending = session.replayQa(packet);await vi.waitFor(() => expect(sdk.replayQa).toHaveBeenCalledOnce());
    await expect(session.mutate(mutationDraft())).rejects.toHaveProperty("code", "calendar-write-validation");
    release(repeated);await expect(pending).resolves.toEqual(repeated);
    expect(session.stats().cachedMonths).toEqual([]);expect(session.getState()).toMatchObject({ saving: false, writeOutcome: { action: "replay", changed: 0, repeated: true } });
  });
});

describe("opt-in calendar mutations share the session write boundary", () => {
  it("requires both writable and mutable, rejecting accidentally exposed mutation clients", async () => {
    const regular = writerClient(), session = createCalendarStagingSession(() => regular.sdk, { writable: true });await session.login(config);
    expect(session.getState().canEdit).toBe(false);await expect(session.mutate(mutationDraft())).rejects.toHaveProperty("code", "permission-denied");
    const value = mutationClient(), unsafe = createCalendarStagingSession(() => value.sdk, { writable: true });await expect(unsafe.login(config)).rejects.toHaveProperty("code", "read-only-client-required");
    const missing = createCalendarStagingSession(() => writerClient().sdk, { writable: true, mutable: true });await expect(missing.login(config)).rejects.toHaveProperty("code", "mutation-client-required");
  });
  it("freezes the original version and blocks both mutation and create double submits", async () => {
    const { sdk } = mutationClient(), factory = vi.fn(() => sdk), session = createCalendarStagingSession(factory, { writable: true, mutable: true });await session.login(config);
    expect(factory.mock.calls[0][1].mutations).toBe(true);let release;sdk.mutate.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    const input = mutationDraft(), before = structuredClone(input), pending = session.mutate(input);await vi.waitFor(() => expect(sdk.mutate).toHaveBeenCalledOnce());input.original.title = "Changed";
    await expect(session.mutate(mutationDraft())).rejects.toHaveProperty("code", "calendar-write-validation");await expect(session.create(draft())).rejects.toHaveProperty("code", "calendar-write-validation");
    expect(sdk.mutate).toHaveBeenCalledWith(before);release(mutationSaved);await pending;expect(session.getState().writeOutcome.action).toBe("cancel");
  });
  it("retains uncertainty across operation types and retries exactly the original mutation", async () => {
    const { sdk } = mutationClient(), session = createCalendarStagingSession(() => sdk, { writable: true, mutable: true });await session.login(config);
    sdk.mutate.mockRejectedValueOnce({ code: "unavailable" });await expect(session.mutate(mutationDraft())).rejects.toHaveProperty("code", "calendar-write-uncertain");
    await expect(session.create(draft())).rejects.toHaveProperty("code", "calendar-write-validation");
    await expect(session.mutate({ ...mutationDraft(), action: "edit" })).rejects.toHaveProperty("code", "calendar-write-validation");
    await session.retryCreate();expect(sdk.mutate).toHaveBeenCalledTimes(2);expect(sdk.mutate.mock.calls[1][0]).toEqual(mutationDraft());expect(sdk.create).not.toHaveBeenCalled();
  });
  it("treats a stale mutation as a definite failure and leaves the draft available for review", async () => {
    const { sdk } = mutationClient(), session = createCalendarStagingSession(() => sdk, { writable: true, mutable: true });await session.login(config);
    sdk.mutate.mockRejectedValueOnce({ code: "calendar-write-stale" });await expect(session.mutate(mutationDraft())).rejects.toHaveProperty("code", "calendar-write-stale");expect(session.getState().writeOutcome).toBeNull();expect(session.getState().saving).toBe(false);
    await session.create(draft());expect(sdk.create).toHaveBeenCalledOnce();
  });
  it("never reports cancellation when the account changes while a mutation is in flight", async () => {
    const { sdk } = mutationClient(), session = createCalendarStagingSession(() => sdk, { writable: true, mutable: true });await session.login(config);let release;sdk.mutate.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    const pending = session.mutate(mutationDraft());await vi.waitFor(() => expect(sdk.mutate).toHaveBeenCalledOnce());await session.logout();release(mutationSaved);
    await expect(pending).rejects.toHaveProperty("code", "calendar-write-uncertain");expect(session.getState()).toMatchObject({ canEdit: false, user: null, writeOutcome: null });
  });
  it("invalidates caches after mutation and distinguishes commit from read-back failure", async () => {
    const { sdk } = mutationClient(), session = createCalendarStagingSession(() => sdk, { writable: true, mutable: true });await session.login(config);await session.read("2027-05-17", "2027-05-17");
    await session.mutate(mutationDraft());expect(session.stats().cachedMonths).toEqual([]);sdk.transport.classrooms.mockRejectedValueOnce({ code: "unavailable" });
    await expect(session.read("2027-05-17", "2027-05-17")).rejects.toHaveProperty("code", "unavailable");expect(session.getState().writeOutcome).toMatchObject({ action: "cancel", status: "committed", readBack: "failed" });
    await session.read("2027-05-17", "2027-05-17");expect(session.getState().writeOutcome.readBack).toBe("verified");
  });
  it("checks revocation before forwarding mutation", async () => {
    const { sdk, profile } = mutationClient(), session = createCalendarStagingSession(() => sdk, { writable: true, mutable: true });await session.login(config);
    sdk.identity.mockResolvedValueOnce({ ...profile, calendarWriter: false });await expect(session.mutate(mutationDraft())).rejects.toHaveProperty("code", "permission-denied");expect(sdk.mutate).not.toHaveBeenCalled();expect(session.getState().canEdit).toBe(false);
  });
});
