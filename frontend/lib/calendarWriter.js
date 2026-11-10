// Restricted append-only pilot: all sanctioned writers serialize through the same revision gate.
import { doc, getDocFromServer, runTransaction, serverTimestamp } from "firebase/firestore";
import { calendarSdkTransport } from "./calendarSdkTransport.js";
import { adaptCalendarDocuments } from "./calendarDataAdapter.js";
import { CALENDAR_READ_LIMIT } from "./calendarReadOnly.js";
import { prepareCalendarCreate, validateCalendarCreateAgainst, calendarWriteError } from "./calendarCreatePlan.js";
export function createCalendarWriter(db, getUid, onCommitted, { expectedRevision, requireExistingReceipt = false } = {}) {
  if (!["labboy-workload-app-staging", "demo-calendar-writer"].includes(db.app.options.projectId)) throw new Error("Calendar writer is restricted to the approved staging/emulator project");
  if (expectedRevision !== undefined && (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0)) throw new Error("Invalid pinned QA revision");
  let pending = false;
  return async input => {
    if (pending) throw calendarWriteError("กำลังบันทึกชุดก่อนหน้า กรุณารอผลก่อน");
    const uid = getUid();
    if (!uid) throw calendarWriteError("เข้าสู่ระบบก่อนบันทึกตาราง");
    pending = true;
    const active = () => {
      if (getUid() !== uid) throw calendarWriteError("เซสชันเปลี่ยน โปรดเข้าสู่ระบบและตรวจผลรายการนำเข้าอีกครั้ง");
    };
    try {
      // Freeze the reviewed input across transparent Firestore retries.
      const draft = structuredClone(input);
      const transport = calendarSdkTransport(db);
      const users = await transport.directory();
      if (users.length > CALENDAR_READ_LIMIT) throw calendarWriteError("รายชื่อเกินขอบเขต pilot");
      const people = adaptCalendarDocuments({
        users
      }).people;
      const plan = await prepareCalendarCreate(draft, people);
      let observedRevision;
      const commit = () => runTransaction(db, async tx => {
        active();
        const identity = await tx.get(doc(db, "users", uid));
        const profile = identity.data();
        if (!identity.exists() || !profile.active || !["admin", "superadmin"].includes(profile.role) || profile.calendarWriter !== true) throw calendarWriteError("บัญชีนี้ยังไม่ได้รับสิทธิ์เพิ่ม/นำเข้าตาราง");
        const gateRef = doc(db, "calendarWriteState", "main"),
          receiptRef = doc(db, "calendarWriteOperations", plan.operationId);
        const gate = await tx.get(gateRef),
          receipt = await tx.get(receiptRef);
        if (expectedRevision !== undefined && (!gate.exists() || gate.data().revision !== expectedRevision)) throw calendarWriteError("QA revision เปลี่ยน กรุณาหยุดและตรวจ audit ก่อนส่งอีกครั้ง");
        if (receipt.exists()) return {
          created: 0,
          skipped: plan.entries.length,
          operationId: plan.operationId,
          repeated: true
        };
        if (requireExistingReceipt) throw calendarWriteError("ไม่พบ receipt เดิม จึงหยุดการทดสอบส่งซ้ำ");
        if (!gate.exists() || !Number.isSafeInteger(gate.data().revision)) throw calendarWriteError("ยังไม่ได้เตรียม revision ของ staging");
        observedRevision = gate.data().revision;
        // Queries use fresh server reads inside each callback attempt. The transactional gate
        // precondition forces a retry if any sanctioned writer commits during these queries.
        const [currentUsers, classrooms, exams] = await Promise.all([transport.directory(), transport.classrooms(), transport.exams(plan.range.start, plan.range.end)]);
        if ([currentUsers, classrooms, exams].some(rows => rows.length > CALENDAR_READ_LIMIT)) throw calendarWriteError("ข้อมูลเกินขอบเขต pilot ยังไม่บันทึกบางส่วน");
        const checked = validateCalendarCreateAgainst(plan, {
          users: currentUsers,
          classroomSchedules: classrooms,
          dlExamSchedules: exams
        });
        // Read deterministic targets too: inactive existing records must never be overwritten.
        const targets = await Promise.all(checked.entries.map(row => tx.get(doc(db, row.collection, row.id))));
        if (targets.some(record => record.exists())) throw calendarWriteError("พบเอกสารเดิมที่หยุดใช้ กรุณาตรวจรายการก่อนนำเข้าอีกครั้ง");
        active();
        const metadata = {
          operationId: plan.operationId,
          createdBy: uid,
          createdAt: serverTimestamp(),
          schemaVersion: 1
        };
        for (const row of checked.entries) tx.set(doc(db, row.collection, row.id), {
          ...row.value,
          ...metadata
        });
        tx.set(receiptRef, {
          count: checked.entries.length,
          skipped: checked.skipped,
          createdBy: uid,
          createdAt: serverTimestamp(),
          schemaVersion: 1
        });
        tx.set(gateRef, {
          revision: gate.data().revision + 1,
          operationId: plan.operationId,
          updatedBy: uid,
          updatedAt: serverTimestamp()
        });
        return {
          created: checked.entries.length,
          skipped: checked.skipped,
          operationId: plan.operationId,
          repeated: false
        };
      });
      for (let contentionAttempt = 0; contentionAttempt < 3; contentionAttempt++) {
        try {
          const result = await commit();
          active();
          onCommitted?.();
          return result;
        } catch (error) {
          if (error.code !== "permission-denied" || contentionAttempt === 2 || observedRevision === undefined) throw error;
          active();
          // Some stale-revision commits fail rules before the SDK sees an ABORTED status.
          // Re-read through the same user permissions; never retry a genuine unchanged-gate denial.
          const currentGate = await getDocFromServer(doc(db, "calendarWriteState", "main"));
          if (!currentGate.exists() || currentGate.data().revision === observedRevision) throw error;
        }
      }
    } finally {
      pending = false;
    }
  };
}
