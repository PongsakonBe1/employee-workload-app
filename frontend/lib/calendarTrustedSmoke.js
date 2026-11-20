import review from "../../docs/development/calendar-staging-writer-smoke/review.json";
import { cutoverValueHash, validateCalendarDirectDenialPacket } from "./calendarDirectDenialQa.js";
import { CALENDAR_SERVER_PROTOCOL } from "./calendarServerProtocol.js";

export const CALENDAR_SMOKE_REVIEW_HASH = "e6699885c178e982b8a08b2dc0865e9ce04b8201e6d2d7f3d0b23360884a711c";
export const calendarSmokeApproved = proof => proof?.writerSmokeReviewHash === CALENDAR_SMOKE_REVIEW_HASH && proof.readerChecksApproved === false && proof.directWriteProbeApproved === false;
export function calendarSmokeFresh(proof, now = Date.now()) {
  const age = now - Date.parse(proof?.auditedAt);
  return calendarSmokeApproved(proof) && Number.isFinite(age) && age >= -5000 && age <= 600000;
}

// One cross-tab journal for this manifest. A request left pending by a crash consumes its slot.
async function editJournal(update) {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open("calendar-staging-writer-smoke", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("progress");
    request.onsuccess = () => resolve(request.result);
    request.onerror = request.onblocked = () => reject(Error("QA journal unavailable"));
  });
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("progress", "readwrite"), store = tx.objectStore("progress");
      const request = store.get(CALENDAR_SMOKE_REVIEW_HASH);
      let result, failure;
      request.onsuccess = () => {
        try {
          result = update(request.result ?? { completed: [], pending: null });
          store.put(result, CALENDAR_SMOKE_REVIEW_HASH);
        } catch (error) { failure = error;tx.abort(); }
      };
      tx.oncomplete = () => resolve(result);
      tx.onabort = tx.onerror = () => reject(failure ?? Error("QA journal rejected"));
    });
  } finally { db.close(); }
}

export function assertCalendarSmokeReply(step, response, body, operation) {
  if (response !== step.status || !body || typeof body !== "object") throw Error("Unexpected HTTP result");
  if (step.status !== 200) {
    if (body.code !== step.code) throw Error("Unexpected rejection code");
    return;
  }
  if (body.operationId !== operation.operationId || body.repeated !== step.repeated) throw Error("Unexpected operation or replay result");
  const fields = step.endpoint === "create" ? ["created", "skipped"] : ["action", "changed"];
  if (fields.some(field => body[field] !== step[field])) throw Error("Unexpected result count or action");
}

export async function runCalendarTrustedSmoke({ frozen, proof, getUser, onStep }) {
  if (globalThis.location?.origin !== review.target.browserOrigin || !calendarSmokeFresh(proof) || await cutoverValueHash(review) !== CALENDAR_SMOKE_REVIEW_HASH) throw Error("Smoke proof or origin mismatch");
  await validateCalendarDirectDenialPacket(frozen, proof);
  const user = getUser();
  const actor = Object.keys(frozen.identities).find(role => frozen.identities[role] === user?.uid);
  if (!user || !["staff", "superadmin"].includes(actor)) throw Error("QA actor mismatch");
  const active = () => {
    if (getUser() !== user || !calendarSmokeFresh(proof)) throw Error("QA session changed or proof expired");
  };
  const options = { credentials: "omit", cache: "no-store", redirect: "error" };
  const health = await fetch(review.target.apiOrigin + "/health", { ...options, signal: AbortSignal.timeout(20000) });
  const peer = await health.json();
  if (!health.ok || peer?.ok !== true || peer.projectId !== review.target.projectId || peer.mode !== "staging" || peer.protocol !== CALENDAR_SERVER_PROTOCOL || peer.writesEnabled !== true || peer.connectivityEnabled !== false || peer.emulator !== false) throw Error("Staging writer is not ready");
  for (;;) {
    active();
    const token = await user.getIdToken();active();
    const record = await editJournal(progress => {
      if (progress.pending) throw Error("Previous attempt is unresolved. Stop and audit.");
      const step = review.requests[progress.completed.length];
      if (!step || step.actor !== actor) throw Error("Next step belongs to another account or the smoke test is complete");
      return { ...progress, pending: step.id };
    });
    const step = review.requests[record.completed.length];
    const operation = [...frozen.operations, ...frozen.rejections].find(row => row.id === step.payload);
    if (operation?.kind !== step.endpoint) throw Error("Frozen payload mismatch");
    active();
    const response = await fetch(`${review.target.apiOrigin}/api/calendar/${step.endpoint}`, {
      ...options,
      signal: AbortSignal.timeout(20000),
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(operation.input)
    });
    active();
    assertCalendarSmokeReply(step, response.status, await response.json(), operation);
    const after = await editJournal(progress => {
      if (progress.pending !== step.id) throw Error("QA journal changed");
      return { pending: null, completed: [...progress.completed, { id: step.id, status: response.status }] };
    });
    onStep(after.completed);
    if (review.requests[after.completed.length]?.actor !== actor) return after.completed;
  }
}
