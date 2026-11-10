import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCalendarStagingClient } from "./calendarStagingClient.js";
import { createCalendarEmulatorClient } from "./calendarEmulatorClient.js";
import { STAGING_APP, STAGING_PROJECT } from "./calendarStagingConfig.js";
const sdk = vi.hoisted(() => ({
  initializeApp: vi.fn(() => ({})),
  deleteApp: vi.fn(async () => {}),
  initializeAuth: vi.fn(() => ({})),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(async () => {}),
  initializeFirestore: vi.fn(() => ({})),
  terminate: vi.fn(async () => {}),
  getDocFromServer: vi.fn(async () => ({ exists: () => true, data: () => ({ revision: 9 }) })),
  doc: vi.fn((_db, collection, id) => ({ collection, id })),
  transport: {
    identity: vi.fn(),
    directory: vi.fn(async () => []),
    classrooms: vi.fn(async () => []),
    exams: vi.fn(async () => [])
  }
}));
vi.mock("firebase/app", () => ({
  initializeApp: sdk.initializeApp,
  deleteApp: sdk.deleteApp
}));
vi.mock("firebase/auth", () => ({
  initializeAuth: sdk.initializeAuth,
  inMemoryPersistence: "memory-only",
  browserPopupRedirectResolver: "browser-popup",
  GoogleAuthProvider: class {
    setCustomParameters() {}
  },
  signInWithPopup: sdk.signInWithPopup,
  signOut: sdk.signOut,
  connectAuthEmulator: vi.fn(),
  signInWithEmailAndPassword: vi.fn()
}));
vi.mock("firebase/firestore", () => ({
  initializeFirestore: sdk.initializeFirestore,
  terminate: sdk.terminate,
  getDocFromServer: sdk.getDocFromServer,
  doc: sdk.doc,
  connectFirestoreEmulator: vi.fn()
}));
vi.mock("./calendarSdkTransport.js", () => ({
  calendarSdkTransport: () => sdk.transport
}));
const config = {
  projectId: STAGING_PROJECT,
  appId: STAGING_APP,
  authDomain: STAGING_PROJECT + ".firebaseapp.com",
  apiKey: "public-test-placeholder"
};
const read = client => client.reader.read("2026-11-03", "2026-11-03");
beforeEach(() => {
  vi.clearAllMocks();
  sdk.signInWithPopup.mockReset().mockResolvedValue({
    user: {
      uid: "synthetic-reader"
    }
  });
  sdk.signOut.mockReset().mockResolvedValue(undefined);
  sdk.terminate.mockReset().mockResolvedValue(undefined);
  sdk.deleteApp.mockReset().mockResolvedValue(undefined);
  sdk.transport.identity.mockReset().mockImplementation(async id => ({
    id,
    displayName: "Test reader",
    active: true,
    role: "staff"
  }));
});
describe("staging client session lifecycle with mocked SDK boundaries", () => {
  it("does not expose developer role probes on ordinary staging clients", async () => {
    const client = createCalendarStagingClient(config);
    expect(client.probeWriterReads).toBeUndefined();
    expect(client.roleWriteQa).toBeUndefined();
    await client.close();
  });
  it("limits role probes to an active QA client's session, never reusing a closed session", async () => {
    sdk.initializeAuth.mockReturnValueOnce({ currentUser: { uid: "synthetic-reader" } });
    const client = createCalendarStagingClient(config, { roleQa: true });
    await client.login();
    expect(await client.probeWriterReads()).toEqual({ gate: { outcome: "found", revision: 9 }, receipt: { outcome: "found" } });
    expect(sdk.getDocFromServer).toHaveBeenCalledTimes(2);
    await client.close();
    await expect(client.probeWriterReads()).rejects.toMatchObject({ code: "unauthenticated" });
    expect(sdk.getDocFromServer).toHaveBeenCalledTimes(2);
  });
  it("activates scoped reads only after login, then invalidates them immediately on close", async () => {
    const client = createCalendarStagingClient(config);
    await expect(read(client)).rejects.toMatchObject({
      code: "unauthenticated"
    });
    await client.login();
    expect((await read(client)).identity.id).toBe("synthetic-reader");
    const closing = client.close();
    await expect(read(client)).rejects.toMatchObject({
      code: "unauthenticated"
    });
    await closing;
    expect(sdk.initializeAuth.mock.calls[0][1]).toEqual({
      persistence: "memory-only",
      popupRedirectResolver: "browser-popup"
    });
  });
  it("does not revive a closed session when a Google popup completes late", async () => {
    let release;
    sdk.signInWithPopup.mockImplementationOnce(() => new Promise(resolve => {
      release = resolve;
    }));
    const client = createCalendarStagingClient(config);
    const login = client.login();
    await client.close();
    release({
      user: {
        uid: "synthetic-reader"
      }
    });
    await expect(login).rejects.toThrow("Session changed");
    await expect(read(client)).rejects.toMatchObject({
      code: "unauthenticated"
    });
    expect(sdk.transport.identity).not.toHaveBeenCalled();
  });
  it("deduplicates concurrent close calls while denying further login and reads", async () => {
    let release;
    sdk.signOut.mockImplementationOnce(() => new Promise(resolve => {
      release = resolve;
    }));
    const client = createCalendarStagingClient(config);
    const first = client.close();
    expect(client.close()).toBe(first);
    await expect(client.login()).rejects.toThrow("Client closed");
    await expect(read(client)).rejects.toMatchObject({
      code: "unauthenticated"
    });
    release();
    await first;
    expect(sdk.signOut).toHaveBeenCalledTimes(1);
    expect(sdk.terminate).toHaveBeenCalledTimes(1);
    expect(sdk.deleteApp).toHaveBeenCalledTimes(1);
  });
  it.each(["staging", "emulator"])("%s cleans Firestore and the named app even if Auth sign-out fails", async mode => {
    sdk.signOut.mockRejectedValueOnce(new Error("sign-out failure"));
    const client = mode === "staging" ? createCalendarStagingClient(config) : createCalendarEmulatorClient({
      local: true
    });
    await expect(client.close()).rejects.toThrow("sign-out failure");
    expect(sdk.terminate).toHaveBeenCalledTimes(1);
    expect(sdk.deleteApp).toHaveBeenCalledTimes(1);
    await expect(read(client)).rejects.toMatchObject({
      code: "unauthenticated"
    });
  });
  it.each(["staging", "emulator"])("%s deletes the named app even if Firestore termination fails", async mode => {
    sdk.terminate.mockRejectedValueOnce(new Error("termination failure"));
    const client = mode === "staging" ? createCalendarStagingClient(config) : createCalendarEmulatorClient({
      local: true
    });
    await expect(client.close()).rejects.toThrow("termination failure");
    expect(sdk.deleteApp).toHaveBeenCalledTimes(1);
  });
  it("keeps a new client isolated from a previous client's cached identity", async () => {
    const previous = createCalendarStagingClient(config);
    await previous.login();
    await read(previous);
    await previous.close();
    const next = createCalendarStagingClient(config);
    await expect(read(next)).rejects.toMatchObject({
      code: "unauthenticated"
    });
    sdk.signInWithPopup.mockResolvedValueOnce({
      user: {
        uid: "second-synthetic-reader"
      }
    });
    await next.login();
    expect((await read(next)).identity.id).toBe("second-synthetic-reader");
    expect(sdk.transport.identity).toHaveBeenCalledTimes(2);
    await next.close();
  });
});
