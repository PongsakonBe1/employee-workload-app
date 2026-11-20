// Uses the signed-in Firebase SDK in the browser; no credentials leave the session.
import { doc, getDocFromServer, writeBatch, serverTimestamp } from "firebase/firestore";
import { createCalendarWriter } from "./calendarWriter.js";
import { createCalendarRoleWriteQa } from "./calendarRoleWriteQa.js";
export function calendarRoleWriteTransport(db, getUid, onCommitted) {
  const read = async (collection, id) => {
    const record = await getDocFromServer(doc(db, collection, id));
    return record.exists() ? record.data() : null;
  };
  return {
    projectId: db.app.options.projectId, getUid,
    profile: uid => read("users", uid),
    schedule: id => read("classroomSchedules", id),
    receipt: id => read("calendarWriteOperations", id),
    gate: () => read("calendarWriteState", "main"),
    create: createCalendarWriter(db, getUid, onCommitted, { expectedRevision: 9 }),
    repeat: createCalendarWriter(db, getUid, onCommitted, { expectedRevision: 10, requireExistingReceipt: true }),
    async rawCommit(plan, revision, uid) {
      if (getUid() !== uid) throw new Error("QA session changed");
      const batch = writeBatch(db), metadata = { operationId: plan.operationId, createdBy: uid, createdAt: serverTimestamp(), schemaVersion: 1 };
      for (const entry of plan.entries) batch.set(doc(db, entry.collection, entry.id), { ...entry.value, ...metadata });
      batch.set(doc(db, "calendarWriteOperations", plan.operationId), { count: 1, skipped: 0, createdBy: uid, createdAt: serverTimestamp(), schemaVersion: 1 });
      batch.set(doc(db, "calendarWriteState", "main"), { revision: revision + 1, operationId: plan.operationId, updatedBy: uid, updatedAt: serverTimestamp() });
      return batch.commit();
    }
  };
}
export function calendarRoleWriteSdk(db, getUid, proposal, onCommitted) {
  return createCalendarRoleWriteQa(calendarRoleWriteTransport(db, getUid, onCommitted), proposal);
}
