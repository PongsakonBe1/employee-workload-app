import { equipmentCode } from "./equipmentCatalog.js";

export const RESOURCE_STATUS_INDEX_VERSION = 1;
export const RESOURCE_STATUS_INDEX_PATH = "resourceStatusIndex/v1";

const roomFloors = [
  ["303", "304", "305", "306"],
  ["401", "402", "406", "407"]
];
export const RESOURCE_ROOM_IDS = roomFloors.flat();
const conditions = new Set(["normal", "damaged", "lost"]);
const text = value => typeof value === "string" ? value : "";

function resourceIds(explicit, comment, allowed, pattern) {
  const value = text(explicit).trim().toUpperCase();
  if (value) return allowed.includes(value) ? [value] : [];
  return [...new Set((comment.toUpperCase().match(pattern) || []).filter(id => allowed.includes(id)))].sort();
}

export function worklogResourceTask(minorTask) {
  const task = text(minorTask).trim().toLowerCase();
  const floor = task.includes("ห้องแลกเปลี่ยนความรู้") ? 0 : task.includes("ห้องเรียนชั้น 4") ? 1 : -1;
  if (floor !== -1 && /^(?:เช็คอิน|เปิด|ปิด)/.test(task)) {
    return { kind: "room", floor, closing: task.startsWith("ปิด") };
  }
  const match = task.match(/^(ยืม|คืน)\s*(หูฟัง|ปลั๊กไฟ|usb)/);
  return match ? { kind: { หูฟัง: "headphones", ปลั๊กไฟ: "power", usb: "usb" }[match[2]], closing: match[1] === "คืน" } : null;
}

export function worklogResourceEvents(log) {
  const task = worklogResourceTask(log.minorTask);
  if (!task) return [];
  const { kind, closing, floor } = task;
  const comment = text(log.comment);
  if (kind === "room") {
    return resourceIds(log.room, comment, roomFloors[floor], /\b\d{3}\b/g)
      .map(id => ({ id, kind, status: closing ? "available" : "in_use" }));
  }
  const explicit = text(log.equipment).trim();
  const codes = explicit ? [explicit] : comment.match(/\bICIT\d+\b/gi) || [];
  return [...new Set(codes.map(equipmentCode).filter(Boolean))].sort().map(id => ({
    id,
    kind,
    status: closing ? "available" : "in_use",
    condition: closing && conditions.has(log.equipmentCondition) ? log.equipmentCondition : null
  }));
}

export function worklogResourceTime(log) {
  const recorded = log.createdAt;
  if (recorded instanceof Date && Number.isFinite(recorded.getTime())) return { timestamp: recorded };
  if (typeof recorded?.toMillis === "function" && Number.isFinite(recorded.toMillis())) return { timestamp: recorded };
  if (typeof recorded === "string" && /(?:Z|[+-]\d\d:\d\d)$/.test(recorded)) {
    const parsed = new Date(recorded);
    if (Number.isFinite(parsed.getTime())) return { timestamp: parsed };
  }
  const day = text(log.date);
  if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    const midnight = Date.parse(day + "T00:00:00Z");
    if (Number.isFinite(midnight) && new Date(midnight).toISOString().slice(0, 10) === day) {
      const hasTime = /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(log.time);
      const time = hasTime ? log.time : "00:00";
      return { timestamp: new Date(`${day}T${time}:00+07:00`), assumedTime: !hasTime };
    }
  }
  throw Error("Resource worklog has no usable recorded date");
}

// Derive lookup fields on the same document as the event. New writes may pass
// the same serverTimestamp transform for createdAt and the resource sort key.
export function worklogResourceIndex(log, newTimestamp) {
  const events = worklogResourceEvents(log);
  return {
    resourceKeys: events.map(event => event.id),
    resourceConditionKeys: events.filter(event => event.condition).map(event => event.id),
    resourceRecordedAt: events.length ? newTimestamp ?? worklogResourceTime(log).timestamp : null
  };
}

export function withWorklogResourceIndex(log) {
  return { ...log, ...worklogResourceIndex(log, log.createdAt) };
}

export function indexedWorklogEdit(current, fields) {
  const updates = { ...fields };
  const edited = { ...current, ...updates };
  if (edited.comment !== current.comment || edited.minorTask !== current.minorTask) {
    const inferred = worklogResourceEvents({ ...edited, room: "", equipment: "" });
    if (inferred.length) {
      const field = inferred[0].kind === "room" ? "room" : "equipment";
      // Multiple IDs in a legacy comment remain a multi-resource event.
      updates[field] = inferred.length === 1 ? inferred[0].id : "";
      edited[field] = updates[field];
    }
  }
  return { ...updates, ...worklogResourceIndex(edited) };
}
