// Browser-only staging QA adapter. No token export and no direct-SDK transaction fallback.
import { doc, getDocFromServer, increment, serverTimestamp, writeBatch } from "firebase/firestore";
import { calendarSdkTransport } from "./calendarSdkTransport.js";
import { createCalendarReadOnly } from "./calendarReadOnly.js";
import { TRUSTED_CUTOVER_FROZEN_HASH, TRUSTED_CUTOVER_MANUAL_ID, TRUSTED_CUTOVER_MANUAL_OPERATION } from "./calendarDirectDenialQa.js";

export async function reserveCutoverAttempt(kind) {
  if (globalThis.location?.origin !== "http://127.0.0.1:4311" || !["reader-staff", "reader-superadmin", "direct-denial"].includes(kind)) throw new Error("Cutover reservation target rejected");
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("calendar-trusted-cutover-qa", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("attempts");
    request.onerror = () => reject(new Error("Durable reservation unavailable"));
    request.onsuccess = () => {
      const db = request.result, tx = db.transaction("attempts", "readwrite");
      tx.objectStore("attempts").add({ reservedAt: new Date().toISOString() }, TRUSTED_CUTOVER_FROZEN_HASH + ":" + kind);
      tx.oncomplete = () => { db.close();resolve(); };
      tx.onabort = () => { db.close();reject(new Error("Attempt consumed or storage unavailable")); };
      tx.onerror = () => {};
    };
  });
}
export function calendarDirectDenialTransport(db, getUser) {
  if (db.app.options.projectId !== "labboy-workload-app-staging" || globalThis.location?.origin !== "http://127.0.0.1:4311") throw new Error("Cutover SDK target rejected");
  const read = async (collection, id) => { const row = await getDocFromServer(doc(db, collection, id));return row.exists() ? row.data() : null; };
  return {
    projectId: db.app.options.projectId, origin: globalThis.location.origin, getUser, reserve: reserveCutoverAttempt,
    profile: uid => read("users", uid), schedule: id => read("classroomSchedules", id), restrictedRead: read,
    async reader(uid) {
      const reader = createCalendarReadOnly(calendarSdkTransport(db));reader.setSession(uid);
      try { const result = await reader.read("2027-06-07", "2027-06-11");return { complete: result.complete === true }; }
      finally { reader.setSession(null); }
    },
    async health() {
      const response = await fetch("https://labboy-calendar-staging.onrender.com/health", { credentials: "omit", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error("Health unavailable");return response.json();
    },
    async rawCommit(manual, uid) {
      if (getUser()?.uid !== uid || manual.id !== "manual" || manual.kind !== "create" || manual.operationId !== TRUSTED_CUTOVER_MANUAL_OPERATION || manual.entries.length !== 1 || manual.entries[0].collection !== "classroomSchedules" || manual.entries[0].id !== TRUSTED_CUTOVER_MANUAL_ID) throw new Error("Cutover SDK commit rejected");
      const entry = manual.entries[0], batch = writeBatch(db);
      batch.set(doc(db, entry.collection, entry.id), { ...entry.value, operationId: manual.operationId, createdBy: uid, createdAt: serverTimestamp(), schemaVersion: 1 });
      batch.set(doc(db, "calendarWriteOperations", manual.operationId), { count: 1, skipped: 0, createdBy: uid, createdAt: serverTimestamp(), schemaVersion: 1 });
      // An increment avoids moving a concurrently advanced gate backwards if a defective policy allows it.
      batch.update(doc(db, "calendarWriteState", "main"), { revision: increment(1), operationId: manual.operationId, updatedBy: uid, updatedAt: serverTimestamp() });
      return batch.commit();
    }
  };
}
