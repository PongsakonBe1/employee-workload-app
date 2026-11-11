// Opt-in staging/loopback mutation pilot. Rules are a separate, reviewed rollout.
import { doc, runTransaction, serverTimestamp, getDocFromServer } from "firebase/firestore";
import { calendarSdkTransport } from "./calendarSdkTransport.js";
import { adaptCalendarDocuments } from "./calendarDataAdapter.js";
import { CALENDAR_READ_LIMIT } from "./calendarReadOnly.js";
import { calendarWriteError } from "./calendarCreatePlan.js";
import { prepareCalendarMutation, validateCalendarMutationTarget, validateCalendarMutationAgainst } from "./calendarMutationPlan.js";
export function createCalendarMutationWriter(db, getUid, onCommitted) {
  if (!["labboy-workload-app-staging", "demo-calendar-writer"].includes(db.app.options.projectId)) throw new Error("Calendar mutations require staging/emulator");
  let pending = false;
  return async input => {
    if (pending) throw calendarWriteError("กำลังบันทึก กรุณารอผลก่อน");
    const uid = getUid();
    if (!uid) throw Object.assign(calendarWriteError("เข้าสู่ระบบก่อนบันทึก"), { code: "permission-denied" });
    pending = true;
    const active = () => { if (getUid() !== uid) throw Object.assign(new Error("Session changed after submission"), { code: "session-changed" }); };
    try {
      const draft = structuredClone(input), transport = calendarSdkTransport(db), users = await transport.directory();
      if (users.length > CALENDAR_READ_LIMIT) throw calendarWriteError("รายชื่อเกินขอบเขต pilot");
      const plan = await prepareCalendarMutation(draft, adaptCalendarDocuments({ users }).people);
      let observedRevision;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const result = await runTransaction(db, async tx => {
            active();
            const identity = await tx.get(doc(db, "users", uid)), profile = identity.data();
            if (!identity.exists() || profile.active !== true || !["admin", "superadmin"].includes(profile.role) || profile.calendarWriter !== true) throw Object.assign(new Error("ไม่มีสิทธิ์แก้ไข/ยกเลิกตาราง"), { code: "permission-denied" });
            const gateRef = doc(db, "calendarWriteState", "main"), receiptRef = doc(db, "calendarWriteOperations", plan.operationId), targetRef = doc(db, plan.target.collection, plan.target.id);
            const gate = await tx.get(gateRef), receipt = await tx.get(receiptRef), target = await tx.get(targetRef);
            if (receipt.exists()) return { action: plan.action, changed: 0, repeated: true, operationId: plan.operationId };
            if (!gate.exists() || !Number.isSafeInteger(gate.data().revision) || gate.data().revision < 0) throw calendarWriteError("revision ของ staging ไม่ถูกต้อง");
            observedRevision = gate.data().revision;
            validateCalendarMutationTarget(plan, target.exists() ? target.data() : null);
            if (plan.action === "edit") {
              const [currentUsers, classrooms, exams] = await Promise.all([transport.directory(), transport.classrooms(), transport.exams(plan.range.start, plan.range.end)]);
              if ([currentUsers, classrooms, exams].some(rows => rows.length > CALENDAR_READ_LIMIT)) throw calendarWriteError("ข้อมูลเกินขอบเขต pilot");
              validateCalendarMutationAgainst(plan, { users: currentUsers, classroomSchedules: classrooms, dlExamSchedules: exams });
            }
            active();
            tx.update(targetRef, { ...plan.value, mutationVersion: plan.expectedVersion + 1, lastOperationId: plan.operationId, updatedBy: uid, updatedAt: serverTimestamp() });
            tx.set(receiptRef, { action: plan.action, targetCollection: plan.target.collection, targetId: plan.target.id, expectedVersion: plan.expectedVersion, count: 1, skipped: 0, createdBy: uid, createdAt: serverTimestamp(), schemaVersion: 2 });
            tx.set(gateRef, { revision: observedRevision + 1, operationId: plan.operationId, updatedBy: uid, updatedAt: serverTimestamp() });
            return { action: plan.action, changed: 1, repeated: false, operationId: plan.operationId };
          });
          active();onCommitted?.();return result;
        } catch (error) {
          if (error.code !== "permission-denied" || observedRevision === undefined || attempt === 2) throw error;
          active();const gate = await getDocFromServer(doc(db, "calendarWriteState", "main"));
          if (!gate.exists() || gate.data().revision === observedRevision) throw error;
        }
      }
    } finally { pending = false; }
  };
}
