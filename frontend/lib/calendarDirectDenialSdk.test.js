import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ batch: { set: vi.fn(), update: vi.fn(), delete: vi.fn(), commit: vi.fn(async () => {}) }, initializeApp: vi.fn(config => ({ options: config })), deleteApp: vi.fn(async () => {}), initializeAuth: vi.fn(() => ({ currentUser: { uid: "synthetic-superadmin" } })), initializeFirestore: vi.fn(app => ({ app })), terminate: vi.fn(async () => {}), popup: vi.fn(async () => {}) }));
vi.mock("firebase/app", () => ({ initializeApp: mocks.initializeApp, deleteApp: mocks.deleteApp }));
vi.mock("firebase/auth", () => ({ initializeAuth: mocks.initializeAuth, inMemoryPersistence: {}, browserPopupRedirectResolver: {}, GoogleAuthProvider: class { setCustomParameters() {} }, signInWithPopup: mocks.popup, signOut: vi.fn(async () => {}) }));
vi.mock("firebase/firestore", () => ({ doc: (_db, collection, id) => collection + "/" + id, getDocFromServer: vi.fn(), getDocsFromServer: vi.fn(), collection: vi.fn(), query: vi.fn(), where: vi.fn(), orderBy: vi.fn(), limit: vi.fn(), increment: value => ({ increment: value }), serverTimestamp: () => "synthetic-server-time", writeBatch: () => mocks.batch, initializeFirestore: mocks.initializeFirestore, terminate: mocks.terminate }));
import { calendarDirectDenialTransport, reserveCutoverAttempt } from "./calendarDirectDenialSdk.js";
import { createCalendarDirectDenialClient } from "./calendarDirectDenialClient.js";
import { TRUSTED_CUTOVER_MANUAL_ID, TRUSTED_CUTOVER_MANUAL_OPERATION } from "./calendarDirectDenialQa.js";
beforeEach(() => { vi.clearAllMocks();vi.stubGlobal("location", { origin: "http://127.0.0.1:4311" }); });
afterEach(() => { vi.unstubAllGlobals();vi.unstubAllEnvs(); });
describe("cutover SDK adapter", () => {
  it("submits only manual, receipt and gate in one atomic batch, with no delete or HTTP writer fallback", async () => {
    const user = { uid: "synthetic-superadmin" }, db = { app: { options: { projectId: "labboy-workload-app-staging" } } }, transport = calendarDirectDenialTransport(db, () => user);
    const manual = { id: "manual", kind: "create", operationId: TRUSTED_CUTOVER_MANUAL_OPERATION, entries: [{ collection: "classroomSchedules", id: TRUSTED_CUTOVER_MANUAL_ID, value: { subject: "Synthetic manual" } }] };
    await transport.rawCommit(manual, user.uid);
    expect(mocks.batch.set).toHaveBeenCalledTimes(2);expect(mocks.batch.update).toHaveBeenCalledTimes(1);expect(mocks.batch.commit).toHaveBeenCalledTimes(1);expect(mocks.batch.delete).not.toHaveBeenCalled();
    expect(mocks.batch.set.mock.calls[0][0]).toBe("classroomSchedules/" + TRUSTED_CUTOVER_MANUAL_ID);
    expect(mocks.batch.set.mock.calls[1][0]).toBe("calendarWriteOperations/" + TRUSTED_CUTOVER_MANUAL_OPERATION);
    expect(mocks.batch.update.mock.calls[0]).toEqual(["calendarWriteState/main", { revision: { increment: 1 }, operationId: manual.operationId, updatedBy: user.uid, updatedAt: "synthetic-server-time" }]);
  });
  it("rejects a production database, wrong origin and a changed user before committing", async () => {
    expect(() => calendarDirectDenialTransport({ app: { options: { projectId: "labboy-workload-app" } } }, () => null)).toThrow();
    vi.stubGlobal("location", { origin: "http://127.0.0.1:4315" });expect(() => calendarDirectDenialTransport({ app: { options: { projectId: "labboy-workload-app-staging" } } }, () => null)).toThrow();
    vi.stubGlobal("location", { origin: "http://127.0.0.1:4311" });const transport = calendarDirectDenialTransport({ app: { options: { projectId: "labboy-workload-app-staging" } } }, () => ({ uid: "different" }));
    await expect(transport.rawCommit({}, "synthetic-superadmin")).rejects.toThrow();expect(mocks.batch.commit).not.toHaveBeenCalled();
  });
  it("uses an add-only IndexedDB reservation, so a new controller cannot reuse a consumed slot", async () => {
    const keys = new Set();
    vi.stubGlobal("indexedDB", { open: vi.fn(() => {
      const request = {};
      queueMicrotask(() => {
        request.result = { close: vi.fn(), transaction: () => {
          const tx = { objectStore: () => ({ add: (_value, key) => queueMicrotask(() => { if (keys.has(key)) tx.onabort();else { keys.add(key);tx.oncomplete(); } }) }) };return tx;
        } };request.onsuccess();
      });return request;
    }) });
    await reserveCutoverAttempt("direct-denial");await expect(reserveCutoverAttempt("direct-denial")).rejects.toThrow("Attempt consumed");
    await reserveCutoverAttempt("reader-staff");expect(keys.size).toBe(2);
  });
  it("does not initialize a Firebase session in production or with invalid config", () => {
    vi.stubEnv("NODE_ENV", "production");expect(() => createCalendarDirectDenialClient({})).toThrow();expect(mocks.initializeApp).not.toHaveBeenCalled();
    vi.stubEnv("NODE_ENV", "development");expect(() => createCalendarDirectDenialClient({ projectId: "labboy-workload-app" })).toThrow();expect(mocks.initializeApp).not.toHaveBeenCalled();
  });
  it("keeps a developer Auth session isolated and terminates it once", async () => {
    vi.stubEnv("NODE_ENV", "development");const client = createCalendarDirectDenialClient({ projectId: "labboy-workload-app-staging", appId: "1:299459134462:web:5f1bd25089a933cdf7b6af", authDomain: "labboy-workload-app-staging.firebaseapp.com", apiKey: "synthetic-public-config" });
    await client.login();expect(mocks.popup).toHaveBeenCalledTimes(1);await client.close();await client.close();expect(mocks.terminate).toHaveBeenCalledTimes(1);expect(mocks.deleteApp).toHaveBeenCalledTimes(1);
  });
});
