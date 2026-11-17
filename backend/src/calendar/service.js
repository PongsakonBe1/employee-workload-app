// Reuse the repository's pure document planners; never trust client-authored metadata.
import { prepareCalendarCreate, validateCalendarCreateAgainst, calendarWriteError } from "../../../frontend/lib/calendarCreatePlan.js";
import { prepareCalendarMutation, validateCalendarMutationTarget, validateCalendarMutationAgainst } from "../../../frontend/lib/calendarMutationPlan.js";
import { adaptCalendarDocuments } from "../../../frontend/lib/calendarDataAdapter.js";
import { TRUSTED_CALENDAR_PROJECT } from "./emulatorConfig.js";
import { STAGING_CALENDAR_PROJECT } from "../../../frontend/lib/calendarServerProtocol.js";
const LIMIT = 200;
const denied = () => Object.assign(new Error("บัญชีนี้ไม่มีสิทธิ์เขียนปฏิทิน"), { code: "permission-denied" });
const records = snapshot => snapshot.docs.map(row => ({ ...row.data(), id: row.id }));
export function createTrustedCalendarService({ db, timestamp, projectId = TRUSTED_CALENDAR_PROJECT }) {
  if (![TRUSTED_CALENDAR_PROJECT, STAGING_CALENDAR_PROJECT].includes(projectId) || db.projectId !== projectId) throw new Error("Calendar service requires the reviewed project");
  const query = collection => db.collection(collection).limit(LIMIT + 1);
  async function bounded(tx, request) {
    const rows = records(await tx.get(request));
    if (rows.length > LIMIT) throw calendarWriteError("ข้อมูลเกินขอบเขต 200 รายการ ยังไม่บันทึกบางส่วน");
    return rows;
  }
  return async function execute(kind, uid, input) {
    if (!["create", "mutate"].includes(kind) || typeof uid !== "string" || !uid || uid.includes("/")) throw denied();
    const draft = structuredClone(input);
    return db.runTransaction(async tx => {
      // Gate and all conflict/profile queries are transactional on every retry.
      const profile = await tx.get(db.doc("users/" + uid));
      const user = profile.data();
      if (!profile.exists || user.active !== true || !["admin", "superadmin"].includes(user.role) || user.calendarWriter !== true) throw denied();
      const gateRef = db.doc("calendarWriteState/main"), gate = await tx.get(gateRef);
      if (!gate.exists || !Number.isSafeInteger(gate.data().revision) || gate.data().revision < 0 || gate.data().revision >= Number.MAX_SAFE_INTEGER) throw calendarWriteError("revision ของ Emulator ไม่ถูกต้อง");
      const users = await bounded(tx, query("users").where("role", "in", ["staff", "admin", "superadmin"]).where("active", "==", true));
      const people = adaptCalendarDocuments({ users }).people;
      const plan = kind === "create" ? await prepareCalendarCreate(draft, people) : await prepareCalendarMutation(draft, people);
      const receiptRef = db.doc("calendarWriteOperations/" + plan.operationId), receipt = await tx.get(receiptRef);
      if (receipt.exists) {
        const previous = receipt.data();
        if (previous.schemaVersion !== (kind === "create" ? 1 : 2) || !Number.isSafeInteger(previous.count) || previous.count < 0 || typeof previous.createdBy !== "string" ||
            kind === "mutate" && (previous.action !== plan.action || previous.targetCollection !== plan.target.collection || previous.targetId !== plan.target.id || previous.expectedVersion !== plan.expectedVersion || previous.count !== 1)) throw calendarWriteError("receipt เดิมไม่ตรงกับคำสั่ง ให้ตรวจข้อมูลก่อนส่งใหม่");
        return kind === "create" ? { created: 0, skipped: plan.entries.length, operationId: plan.operationId, repeated: true } : { action: plan.action, changed: 0, operationId: plan.operationId, repeated: true };
      }
      let target;
      if (kind === "mutate") {
        target = db.doc(plan.target.collection + "/" + plan.target.id);
        const current = await tx.get(target);
        validateCalendarMutationTarget(plan, current.exists ? current.data() : null);
      }
      let checked;
      if (kind === "create" || plan.action === "edit") {
        const classroomSchedules = await bounded(tx, query("classroomSchedules").where("isActive", "==", true));
        const dlExamSchedules = await bounded(tx, query("dlExamSchedules").where("isActive", "==", true).where("date", ">=", plan.range.start).where("date", "<=", plan.range.end).orderBy("date"));
        const documents = { users, classroomSchedules, dlExamSchedules };
        if (kind === "create") checked = validateCalendarCreateAgainst(plan, documents);
        else validateCalendarMutationAgainst(plan, documents);
      }
      if (kind === "create") {
        // Even an inactive deterministic target must not be overwritten.
        const targets = await Promise.all(checked.entries.map(row => tx.get(db.doc(row.collection + "/" + row.id))));
        if (targets.some(row => row.exists)) throw calendarWriteError("พบเอกสารเดิมที่หยุดใช้ กรุณาตรวจรายการก่อนนำเข้าอีกครั้ง");
        for (const row of checked.entries) tx.create(db.doc(row.collection + "/" + row.id), { ...row.value, operationId: plan.operationId, createdBy: uid, createdAt: timestamp(), schemaVersion: 1 });
        tx.create(receiptRef, { count: checked.entries.length, skipped: checked.skipped, createdBy: uid, createdAt: timestamp(), schemaVersion: 1 });
      } else {
        tx.update(target, { ...plan.value, mutationVersion: plan.expectedVersion + 1, lastOperationId: plan.operationId, updatedBy: uid, updatedAt: timestamp() });
        tx.create(receiptRef, { action: plan.action, targetCollection: plan.target.collection, targetId: plan.target.id, expectedVersion: plan.expectedVersion, count: 1, skipped: 0, createdBy: uid, createdAt: timestamp(), schemaVersion: 2 });
      }
      tx.update(gateRef, { revision: gate.data().revision + 1, operationId: plan.operationId, updatedBy: uid, updatedAt: timestamp() });
      return kind === "create" ? { created: checked.entries.length, skipped: checked.skipped, operationId: plan.operationId, repeated: false } : { action: plan.action, changed: 1, operationId: plan.operationId, repeated: false };
    }, { maxAttempts: 3 });
  };
}
