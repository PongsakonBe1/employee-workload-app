import { RESOURCE_EQUIPMENT_IDS, RESOURCE_ROOM_IDS, worklogResourceEvents } from "../../../frontend/lib/resourceStatusIndex.js";

const fill = (keys, value) => Object.fromEntries(keys.map(key => [key, value]));
const equipmentIds = Object.values(RESOURCE_EQUIPMENT_IDS).flat();
const resourceIds = [...RESOURCE_ROOM_IDS, ...equipmentIds];
const text = value => typeof value === "string" ? value : "";

function indexedEvent(log, id, conditionOnly = false) {
  if (!log) return null;
  const event = worklogResourceEvents(log).find(item => item.id === id && (!conditionOnly || item.condition));
  if (!event) throw Error("Resource event lookup does not match the worklog");
  return event;
}

export function projectIndexedResourceStatus(latest, lastConditions) {
  const roomStatus = fill(RESOURCE_ROOM_IDS, "available");
  const equipmentStatus = Object.fromEntries(Object.entries(RESOURCE_EQUIPMENT_IDS)
    .map(([kind, codes]) => [kind, fill(codes, "available")]));
  const equipmentConditions = {};
  const details = {};

  for (const id of resourceIds) {
    const log = latest.get(id);
    const event = indexedEvent(log, id);
    if (event?.kind === "room") {
      roomStatus[id] = event.status;
      continue;
    }

    const condition = event?.condition || indexedEvent(lastConditions.get(id), id, true)?.condition;
    if (condition) equipmentConditions[id] = condition;
    if (!event) continue;
    equipmentStatus[event.kind][id] = event.status;
    if (event.status === "in_use") {
      details[id] = { user: text(log.recipient).slice(0, 128), time: text(log.time).slice(0, 5), action: "ยืม" };
    }
  }
  return { roomStatus, equipmentStatus, equipmentConditions, details };
}

const lookups = [
  ...resourceIds.map(id => ({ id, field: "resourceKeys", result: "latest" })),
  ...equipmentIds.map(id => ({ id, field: "resourceConditionKeys", result: "conditions" }))
];

// Publish only after the first snapshot for every resource has arrived, then
// keep each latest event current even when other worklogs change.
export function createResourceStatusFeed(db) {
  let stream = null;
  let idle;

  function stop() {
    clearTimeout(idle);
    if (!stream) return;
    const closing = stream;
    stream = null;
    clearTimeout(closing.startup);
    for (const unsubscribe of closing.subscriptions) unsubscribe();
  }

  function subscribe() {
    const next = { latest: new Map(), conditions: new Map(), subscriptions: [], ready: null, startup: null };
    stream = next;
    next.ready = new Promise((resolve, reject) => {
      const fail = error => {
        if (stream === next) stop();
        reject(error);
      };
      next.startup = setTimeout(() => fail(new Error("Resource state timed out")), 12_000);
      next.startup.unref();
      const worklogs = db.collection("worklogs");
      try {
        for (const { id, field, result } of lookups) {
          const unsubscribe = worklogs.where(field, "array-contains", id)
            .orderBy("resourceRecordedAt", "desc").limit(1)
            .onSnapshot(snapshot => {
              if (stream !== next) return;
              next[result].set(id, snapshot.docs[0]?.data());
              if (next.latest.size + next.conditions.size === lookups.length) {
                clearTimeout(next.startup);
                resolve();
              }
            }, fail);
          if (stream !== next) {
            unsubscribe();
            break;
          }
          next.subscriptions.push(unsubscribe);
        }
      } catch (error) {
        fail(error);
      }
    });
    return next;
  }

  return async function readStatus() {
    clearTimeout(idle);
    idle = setTimeout(stop, 6 * 60_000);
    idle.unref();
    const current = stream ?? subscribe();
    await current.ready;
    if (stream !== current) throw Error("Resource state disconnected");
    return projectIndexedResourceStatus(current.latest, current.conditions);
  };
}
