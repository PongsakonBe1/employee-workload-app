import { EQUIPMENT_LABELS, equipmentCatalog } from "../../../frontend/lib/equipmentCatalog.js";
import { RESOURCE_ROOM_IDS, worklogResourceEvents } from "../../../frontend/lib/resourceStatusIndex.js";

const fill = (keys, value) => Object.fromEntries(keys.map(key => [key, value]));
const text = value => typeof value === "string" ? value : "";

function indexedEvent(log, id, conditionOnly = false) {
  if (!log) return null;
  const event = worklogResourceEvents(log).find(item => item.id === id && (!conditionOnly || item.condition));
  if (!event) throw Error("Resource event lookup does not match the worklog");
  return event;
}

export function projectIndexedResourceStatus(latest, lastConditions, equipment) {
  const roomStatus = fill(RESOURCE_ROOM_IDS, "available");
  const equipmentStatus = Object.fromEntries(Object.keys(EQUIPMENT_LABELS).map(kind => [kind, {}]));
  const equipmentConditions = {};
  const details = {};

  for (const id of RESOURCE_ROOM_IDS) {
    const event = indexedEvent(latest.get(id), id);
    if (event) roomStatus[id] = event.status;
  }

  for (const { id, kind } of equipment) {
    const log = latest.get(id);
    const event = indexedEvent(log, id);
    const lastReturn = indexedEvent(lastConditions.get(id), id, true);
    if ((event && event.kind !== kind) || (lastReturn && lastReturn.kind !== kind)) {
      equipmentStatus[kind][id] = "unknown";
      continue;
    }
    const condition = event?.condition || lastReturn?.condition;
    if (condition) equipmentConditions[id] = condition;
    equipmentStatus[kind][id] = event?.status ?? "available";
    if (event?.status === "in_use") {
      details[id] = { user: text(log.recipient).slice(0, 128), time: text(log.time).slice(0, 5), action: "ยืม" };
    }
  }
  return { roomStatus, equipmentStatus, equipmentConditions, details, equipmentCatalog: equipment };
}

const lookupKey = (id, condition) => `${id}:${condition}`;

export function createResourceStatusFeed(db) {
  let stream = null;
  let idle;
  let closed = false;

  function stop(error) {
    clearTimeout(idle);
    if (!stream) return;
    const closing = stream;
    stream = null;
    closing.unsubscribeCatalog?.();
    for (const lookup of closing.lookups.values()) lookup.unsubscribe?.();
    for (const waiter of closing.waiters) waiter.reject(error);
    closing.waiters.clear();
  }

  function subscribe() {
    const next = { equipment: null, lookups: new Map(), waiters: new Set() };
    stream = next;
    const fail = error => {
      if (stream === next) stop(error);
    };
    const publish = () => {
      if (!ready(next)) return;
      for (const waiter of next.waiters) waiter.resolve();
      next.waiters.clear();
    };
    const worklogs = db.collection("worklogs");
    try {
      next.unsubscribeCatalog = db.collection("equipmentItems").onSnapshot(snapshot => {
        if (stream !== next) return;
        try {
          const { equipment } = equipmentCatalog(snapshot.docs.map(doc => doc.data()));
          next.equipment = equipment;
          const ids = [...RESOURCE_ROOM_IDS, ...equipment.map(item => item.id)];
          const queries = [...ids.map(id => [id, false]), ...equipment.map(({ id }) => [id, true])];
          const required = new Set(queries.map(([id, condition]) => lookupKey(id, condition)));
          for (const [key, lookup] of next.lookups) {
            if (required.has(key)) continue;
            lookup.unsubscribe?.();
            next.lookups.delete(key);
          }
          for (const [id, condition] of queries) {
            const key = lookupKey(id, condition);
            if (next.lookups.has(key)) continue;
            const lookup = { id, condition, received: false, data: undefined };
            next.lookups.set(key, lookup);
            lookup.unsubscribe = worklogs.where(condition ? "resourceConditionKeys" : "resourceKeys", "array-contains", id)
              .orderBy("resourceRecordedAt", "desc").limit(1)
              .onSnapshot(result => {
                if (stream !== next || next.lookups.get(key) !== lookup) return;
                lookup.data = result.docs[0]?.data();
                lookup.received = true;
                publish();
              }, fail);
          }
          publish();
        } catch (error) {
          fail(error);
        }
      }, fail);
    } catch (error) {
      fail(error);
      throw error;
    }
    return next;
  }

  function ready(current) {
    return current.equipment !== null && [...current.lookups.values()].every(lookup => lookup.received);
  }

  function waitForSnapshots(current) {
    return new Promise((resolve, reject) => {
      const waiter = {
        resolve() { clearTimeout(timeout); resolve(); },
        reject(error) { clearTimeout(timeout); reject(error); }
      };
      const timeout = setTimeout(() => {
        if (stream === current) stop(Error("Resource state timed out"));
      }, 12_000);
      timeout.unref();
      current.waiters.add(waiter);
    });
  }

  async function read() {
    if (closed) throw Error("Resource status feed is closed");
    const current = stream ?? subscribe();
    clearTimeout(idle);
    idle = setTimeout(() => stop(Error("Resource state disconnected")), 6 * 60_000);
    idle.unref();
    while (!ready(current)) {
      if (stream !== current) throw Error("Resource state disconnected");
      await waitForSnapshots(current);
    }
    if (stream !== current) throw Error("Resource state disconnected");
    const latest = new Map();
    const lastConditions = new Map();
    for (const lookup of current.lookups.values()) {
      if (lookup.data) {
        (lookup.condition ? lastConditions : latest).set(lookup.id, lookup.data);
      }
    }
    return projectIndexedResourceStatus(latest, lastConditions, current.equipment);
  }

  function close() {
    closed = true;
    stop(Error("Resource status feed is closed"));
  }

  return { read, close };
}
