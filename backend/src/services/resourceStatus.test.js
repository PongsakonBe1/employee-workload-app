import { describe, expect, it, vi } from "vitest";
import { createResourceStatusFeed, projectIndexedResourceStatus } from "./resourceStatus.js";
import { createResourceStatusHandler } from "./resourceStatusHandler.js";
import { equipmentCatalog, visibleEquipment } from "../../../frontend/lib/equipmentCatalog.js";
import { indexedWorklogEdit, worklogResourceIndex, withWorklogResourceIndex } from "../../../frontend/lib/resourceStatusIndex.js";

describe("shared resource status by ID", () => {
  const loan = { minorTask: "ยืมหูฟัง", equipment: "ICIT01", recipient: "0123456789012", time: "09:00", employeeId: "qa-staff" };
  const returned = { minorTask: "คืนหูฟัง", equipment: "ICIT01", equipmentCondition: "damaged", recipient: loan.recipient, equipmentNote: "QA private note" };
  const inventory = [{ id: "ICIT01", kind: "headphones", active: true, location: "ห้องบริการชั้น 3" }, { id: "ICIT02", kind: "headphones", active: true, location: "Finn Space" }];

  it("publishes only the current borrower and the actual resource selected from legacy worklogs", () => {
    const status = projectIndexedResourceStatus(new Map([
      ["401", { minorTask: "เปิดห้องเรียนชั้น 4", room: "401", comment: "402" }],
      ["ICIT01", loan]
    ]), new Map(), inventory);
    expect(status.roomStatus).toMatchObject({ 401: "in_use", 402: "available" });
    expect(status.equipmentStatus.headphones.ICIT01).toBe("in_use");
    expect(status.details.ICIT01).toEqual({ user: loan.recipient, time: "09:00", action: "ยืม" });
    expect(JSON.stringify(status)).not.toContain(loan.employeeId);
  });

  it("uses the return's condition immediately and omits the borrower and private notes", () => {
    const earlier = { ...returned, equipmentCondition: "normal" };
    const status = projectIndexedResourceStatus(new Map([["ICIT01", returned]]), new Map([["ICIT01", earlier]]), inventory);
    expect(status.equipmentStatus.headphones.ICIT01).toBe("available");
    expect(status.equipmentConditions.ICIT01).toBe("damaged");
    expect(JSON.stringify(status)).not.toContain(returned.equipmentNote);
    expect(JSON.stringify(status)).not.toContain(loan.recipient);
    expect(projectIndexedResourceStatus(new Map([["ICIT01", loan]]), new Map([["ICIT01", returned]]), inventory).equipmentConditions.ICIT01).toBe("damaged");
  });

  it("rejects an index entry whose worklog does not belong to that resource", () => {
    expect(() => projectIndexedResourceStatus(new Map([["ICIT02", loan]]), new Map(), inventory)).toThrow("does not match");
  });

  it("recognizes exact IDs, retains multi-room legacy logs and falls back to the Bangkok worklog date", () => {
    const room = worklogResourceIndex({ minorTask: "เช็คอินห้องแลกเปลี่ยนความรู้", comment: "ห้อง 304/iOS, 306/Linux", date: "2026-11-18", time: "09:30" });
    expect(room.resourceKeys).toEqual(["304", "306"]);
    expect(room.resourceRecordedAt.toISOString()).toBe("2026-11-18T02:30:00.000Z");
    expect(worklogResourceIndex({ minorTask: "ยืมหูฟัง", comment: "ICIT010" }).resourceKeys).toEqual([]);
    expect(() => worklogResourceIndex({ ...loan, date: "2026-02-30" })).toThrow("usable recorded date");
  });

  it("saves the same timestamp transform with the worklog and rebuilds indices when the asset changes", () => {
    const serverTimestamp = { kind: "server-timestamp" };
    expect(withWorklogResourceIndex({ ...loan, createdAt: serverTimestamp })).toMatchObject({
      resourceKeys: ["ICIT01"], resourceConditionKeys: [], resourceRecordedAt: serverTimestamp
    });
    const current = { ...returned, createdAt: new Date("2026-11-01T02:00:00.000Z") };
    expect(indexedWorklogEdit(current, { comment: "คืนหูฟัง ICIT02" })).toEqual({
      comment: "คืนหูฟัง ICIT02", equipment: "ICIT02", resourceKeys: ["ICIT02"],
      resourceConditionKeys: ["ICIT02"], resourceRecordedAt: current.createdAt
    });
  });

  it("keeps the same loan when Admin moves an item and allows a disabled item only while awaiting return", () => {
    const latest = new Map([["ICIT30", { ...loan, equipment: "ICIT30" }]]);
    const floor3 = { name: " icit30 ", minorTask: "ยืมหูฟัง", location: "ห้องบริการชั้น 3", order: 30 };
    const moved = { ...floor3, location: "Finn Space", active: false, updatedAt: { toMillis: () => 2 } };
    const { equipment } = equipmentCatalog([floor3, moved]);
    const status = projectIndexedResourceStatus(latest, new Map(), equipment);
    expect(status.details.ICIT30.user).toBe(loan.recipient);
    expect(visibleEquipment(equipment, status.equipmentStatus, { kind: "headphones", template: "ชั้น 3" })).toEqual([]);
    expect(visibleEquipment(equipment, status.equipmentStatus, { kind: "headphones", template: "Finn Space" })).toEqual(equipment);
    expect(visibleEquipment(equipment, projectIndexedResourceStatus(new Map(), new Map(), equipment).equipmentStatus)).toEqual([]);
    expect(worklogResourceIndex({ ...loan, equipment: "", comment: "ยืมหูฟัง ICIT30", date: "2026-11-18" }).resourceKeys).toEqual(["ICIT30"]);
  });

  it("reports invalid catalog codes and excludes conflicting equipment kinds", () => {
    expect(equipmentCatalog([
      { name: "ICIT010", minorTask: "ยืม USB" },
      { name: "ICIT30", minorTask: "ยืมหูฟัง" },
      { name: "ICIT30", minorTask: "คืนปลั๊กไฟ" }
    ])).toEqual({ equipment: [], invalid: 1, conflicts: 1 });
  });

  it("leaves other resources usable when an equipment code has inconsistent history", () => {
    const status = projectIndexedResourceStatus(new Map([["ICIT01", { ...loan, minorTask: "ยืม USB" }]]), new Map(), inventory);
    expect(status.equipmentStatus.headphones).toEqual({ ICIT01: "unknown", ICIT02: "available" });
    expect(status.details).toEqual({});
  });
});

describe("resource status shutdown", () => {
  function subscriptions() {
    const listeners = [];
    const onSnapshot = vi.fn(next => {
      const unsubscribe = vi.fn();
      listeners.push({ next, unsubscribe });
      return unsubscribe;
    });
    const query = { where: () => query, orderBy: () => query, limit: () => query, onSnapshot };
    return { listeners, db: { collection: () => query } };
  }

  it("unsubscribes every listener once after returning resource status", async () => {
    const { db, listeners } = subscriptions();
    const feed = createResourceStatusFeed(db);
    const read = feed.read();
    listeners[0].next({ docs: [{ data: () => ({ name: "ICIT01", minorTask: "ยืมหูฟัง" }) }] });
    for (const listener of listeners.slice(1)) listener.next({ docs: [] });
    await expect(read).resolves.toMatchObject({ equipmentStatus: { headphones: { ICIT01: "available" } } });

    expect(listeners).toHaveLength(11);
    feed.close();
    feed.close();
    for (const { unsubscribe } of listeners) expect(unsubscribe).toHaveBeenCalledTimes(1);
    await expect(feed.read()).rejects.toThrow("closed");
    expect(listeners).toHaveLength(11);
  });

  it("releases callers waiting for the first snapshot when the feed closes", async () => {
    const { db, listeners } = subscriptions();
    const feed = createResourceStatusFeed(db);
    const result = expect(feed.read()).rejects.toThrow("closed");

    feed.close();
    await result;
    listeners[0].next({ docs: [] });
    expect(listeners).toHaveLength(1);
    expect(listeners[0].unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("does not start a feed for a request that reaches readiness after the handler is closed", async () => {
    const awaitingReady = Promise.withResolvers();
    const ready = Promise.withResolvers();
    const collection = vi.fn(() => ({ doc: () => ({ get: async () => ({ data: () => ({ role: "staff", active: true }) }) }) }));
    const getFirebase = vi.fn(async () => ({
      auth: () => ({ verifyIdToken: async () => ({ uid: "qa", email: "qa@example.test", email_verified: true }) }),
      firestore: () => ({ collection, doc: () => ({ get() { awaitingReady.resolve(); return ready.promise; } }) })
    }));
    const handler = createResourceStatusHandler(getFirebase);
    const res = { set: vi.fn(), sendStatus: vi.fn(), json: vi.fn() };
    const reading = handler({ get: () => "Bearer synthetic" }, res);
    await awaitingReady.promise;
    handler.close();
    ready.resolve({ data: () => ({ version: 1, ready: true }) });
    await reading;

    expect(res.sendStatus).toHaveBeenCalledWith(503);
    expect(collection.mock.calls).toEqual([["users"]]);
    expect(res.json).not.toHaveBeenCalled();
  });
});
