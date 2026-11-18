const roomsByFloor = [
  ["303", "304", "305", "306"],
  ["401", "402", "406", "407"]
];
const codeRange = (start, end) => Array.from({ length: end - start + 1 }, (_, offset) => `ICIT${String(start + offset).padStart(2, "0")}`);
const equipmentByKind = {
  headphones: codeRange(1, 20),
  power: codeRange(21, 25),
  usb: codeRange(26, 29)
};
const conditions = new Set(["normal", "damaged", "lost"]);
const text = value => typeof value === "string" ? value : "";
const fill = (keys, value) => Object.fromEntries(keys.map(key => [key, value]));

// Input is newest-first by createdAt, just as in the previous status readers.
// Only the current borrower field is shared; histories remain in worklogs.
export function projectResourceStatus(logs) {
  const roomStatus = fill(roomsByFloor.flat(), "available");
  const equipmentStatus = Object.fromEntries(Object.entries(equipmentByKind).map(([kind, codes]) => [kind, fill(codes, "available")]));
  const details = {};
  const equipmentConditions = {};
  for (const log of [...logs].reverse()) {
    const task = text(log.minorTask).trim().toLowerCase();
    const floor = task.includes("ห้องแลกเปลี่ยนความรู้") ? 0 : task.includes("ห้องเรียนชั้น 4") ? 1 : -1;
    const comment = text(log.comment);
    if (floor !== -1 && /^(?:เช็คอิน|เปิด|ปิด)/.test(task)) {
      const ids = resourcesIn(log.room, comment, roomsByFloor[floor], /\b\d{3}\b/g);
      for (const id of ids) roomStatus[id] = task.startsWith("ปิด") ? "available" : "in_use";
    }
    const loan = task.match(/^(ยืม|คืน)\s*(หูฟัง|ปลั๊กไฟ|usb)/);
    if (!loan) continue;
    const returning = loan[1] === "คืน";
    const kind = { หูฟัง: "headphones", ปลั๊กไฟ: "power", usb: "usb" }[loan[2]];
    const ids = resourcesIn(log.equipment, comment, equipmentByKind[kind], /\bICIT\d{2}\b/gi);
    for (const id of ids) {
      equipmentStatus[kind][id] = returning ? "available" : "in_use";
      if (returning) {
        delete details[id];
        if (conditions.has(log.equipmentCondition)) equipmentConditions[id] = log.equipmentCondition;
      } else {
        details[id] = { user: text(log.recipient).slice(0, 128), time: text(log.time).slice(0, 5), action: "ยืม" };
      }
    }
  }
  return { roomStatus, equipmentStatus, equipmentConditions, details };
}

function resourcesIn(explicit, comment, allowed, pattern) {
  const value = text(explicit).trim().toUpperCase();
  if (value) return allowed.includes(value) ? [value] : [];
  return (comment.toUpperCase().match(pattern) || []).filter(id => allowed.includes(id));
}

// Share one bounded Firestore listener across sessions, including modals and the resources view.
// Subsequent state reads don't rescan the same history. Release the listener when nobody is using it.
export function createResourceStatusFeed(db) {
  let stream = null;
  let idle;

  function stop() {
    clearTimeout(idle);
    if (!stream) return;
    clearTimeout(stream.startup);
    stream.unsubscribe?.();
    stream = null;
  }

  return function readStatus() {
    clearTimeout(idle);
    idle = setTimeout(stop, 6 * 60_000);
    idle.unref();
    if (!stream) {
      const next = { latest: null, ready: null, unsubscribe: null, startup: null };
      stream = next;
      next.ready = new Promise((resolve, reject) => {
        const fail = error => {
          if (stream === next) stop();
          reject(error);
        };
        next.startup = setTimeout(() => fail(new Error("Resource state timed out")), 12_000);
        next.startup.unref();
        try {
          next.unsubscribe = db.collection("worklogs").orderBy("createdAt", "desc").limit(500)
            .onSnapshot(snapshot => {
              clearTimeout(next.startup);
              next.latest = projectResourceStatus(snapshot.docs.map(doc => doc.data()));
              resolve(next.latest);
            }, fail);
        } catch (error) {
          fail(error);
        }
      });
      return next.ready;
    }
    return Promise.resolve(stream.latest ?? stream.ready);
  };
}
