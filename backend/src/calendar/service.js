// Reuse the repository's pure document planners; never trust client-authored metadata.
import { prepareCalendarCreate, validateCalendarCreateAgainst, calendarWriteError } from "../../../frontend/lib/calendarCreatePlan.js";
import { prepareCalendarMutation, validateCalendarMutationTarget, validateCalendarMutationAgainst } from "../../../frontend/lib/calendarMutationPlan.js";
import { adaptCalendarDocuments } from "../../../frontend/lib/calendarDataAdapter.js";
import { TRUSTED_CALENDAR_PROJECT } from "./emulatorConfig.js";
import { PRODUCTION_CALENDAR_PROJECT, STAGING_CALENDAR_PROJECT } from "../../../frontend/lib/calendarServerProtocol.js";
import { prepareProductionCalendarMutation, productionCalendarReplacements, validateProductionCalendarConflicts, validateProductionCalendarReplacements } from "../../../frontend/lib/calendarProductionMutation.js";
const LIMIT = 200;
const directoryRoles = ["staff", "admin", "superadmin"];
const denied = () => Object.assign(new Error("บัญชีนี้ไม่มีสิทธิ์เขียนปฏิทิน"), { code: "permission-denied" });
const records = snapshot => snapshot.docs.map(row => ({ ...row.data(), id: row.id }));
export function createTrustedCalendarService({ db, timestamp, projectId = TRUSTED_CALENDAR_PROJECT, productionCreate = false }) {
  const production = productionCreate && projectId === PRODUCTION_CALENDAR_PROJECT;
  if ((!production && ![TRUSTED_CALENDAR_PROJECT, STAGING_CALENDAR_PROJECT].includes(projectId)) || db.projectId !== projectId) throw new Error("Calendar service requires the reviewed project");
  const query = collection => db.collection(collection).limit(LIMIT + 1);
  async function bounded(tx, request) {
    const rows = records(await tx.get(request));
    if (rows.length > LIMIT) throw calendarWriteError("ข้อมูลเกินขอบเขต 200 รายการ ยังไม่บันทึกบางส่วน");
    return rows;
  }
  async function readDirectory(tx) {
    const active = query("users").where("active", "==", true);
    const users = await bounded(tx, production ? active : active.where("role", "in", directoryRoles));
    return users.filter(row => directoryRoles.includes(row.role));
  }
  async function readConflictSchedules(tx, range) {
    const exams = query("dlExamSchedules").where("date", ">=", range.start).where("date", "<=", range.end).orderBy("date");
    const classroomSchedules = await bounded(tx, query("classroomSchedules").where("isActive", "==", true));
    // On production use the date index already shared by the calendar reader.
    const dlExamSchedules = await bounded(tx, production ? exams : exams.where("isActive", "==", true));
    return { classroomSchedules, dlExamSchedules: dlExamSchedules.filter(row => row.isActive === true) };
  }
  return async function execute(kind, uid, input, identity) {
    if (!["create", "mutate"].includes(kind) || typeof uid !== "string" || !uid || uid.includes("/")) throw denied();
    if (production && (identity?.uid !== uid || identity.email_verified !== true || typeof identity.email !== "string" || !identity.email)) throw denied();
    const draft = structuredClone(input);
    const productionMutation = production && kind === "mutate" ? await prepareProductionCalendarMutation(draft) : null;
    return db.runTransaction(async tx => {
      // Gate and all conflict/profile queries are transactional on every retry.
      const profile = await tx.get(db.doc("users/" + uid));
      const user = profile.data();
      if (!profile.exists || user.active !== true || !["admin", "superadmin"].includes(user.role)) throw denied();
      if (production ? user.role === "superadmin" && user.email !== identity.email : user.calendarWriter !== true) throw denied();
      const gateRef = db.doc("calendarWriteState/main"), gate = await tx.get(gateRef);
      const gateData = gate.data();
      const trustedMode = gateData?.mode === "trusted-write-v1" || kind === "create" && gateData?.mode === "trusted-create-v1";
      if (production && !trustedMode) throw Object.assign(new Error("ระบบยังไม่เปิดรับบันทึก"), { code: "calendar-write-disabled" });
      if (!gate.exists || !Number.isSafeInteger(gateData.revision) || gateData.revision < 0 || gateData.revision >= Number.MAX_SAFE_INTEGER) throw calendarWriteError("สถานะธุรกรรมปฏิทินไม่ถูกต้อง");
      if (productionMutation) {
        return applyProductionMutation(tx, productionMutation, gateRef, gateData.revision, uid);
      }
      const users = await readDirectory(tx);
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
        const documents = { users, ...await readConflictSchedules(tx, plan.range) };
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

  async function applyProductionMutation(tx, plan, gateRef, revision, uid) {
    const receiptRef = db.doc("calendarWriteOperations/" + plan.operationId);
    const receipt = await tx.get(receiptRef);
    const result = (changed, repeated) => ({ action: plan.action, changed, operationId: plan.operationId, repeated });
    if (receipt.exists) {
      const previous = receipt.data();
      if (previous.schemaVersion !== 3 || previous.action !== plan.action || previous.targetCollection !== plan.collection ||
          typeof previous.createdBy !== "string" || !Number.isSafeInteger(previous.count) ||
          previous.count < 0 || previous.count > plan.entries.length) throw calendarWriteError("receipt เดิมไม่ตรงกับคำสั่ง ให้ตรวจข้อมูลก่อนส่งใหม่");
      return result(0, true);
    }
    const targets = plan.entries.map(row => db.doc(plan.collection + "/" + row.id));
    const current = (await tx.getAll(...targets)).map(row => row.exists ? row.data() : null);
    const replacements = productionCalendarReplacements(plan, current);
    const needsDirectory = plan.collection === "dlExamSchedules" && replacements.some(row => plan.action === "edit" || row.value.isActive);
    const users = needsDirectory ? await readDirectory(tx) : [];
    const { checked, writes } = await validateProductionCalendarReplacements(plan, replacements, adaptCalendarDocuments({ users }).people);
    if (checked) {
      const schedules = await readConflictSchedules(tx, checked.range);
      // Active exams also need their directory records for the conflict adapter.
      const directory = !needsDirectory && schedules.dlExamSchedules.length ? await readDirectory(tx) : users;
      validateProductionCalendarConflicts(plan, checked, { users: directory, ...schedules });
    }
    for (const row of writes) tx.update(db.doc(plan.collection + "/" + row.id), { ...row.value, mutationVersion: row.version, lastOperationId: plan.operationId, updatedBy: uid, updatedAt: timestamp() });
    tx.create(receiptRef, { action: plan.action, targetCollection: plan.collection, count: writes.length, createdBy: uid, createdAt: timestamp(), schemaVersion: 3 });
    tx.update(gateRef, { revision: revision + 1, operationId: plan.operationId, updatedBy: uid, updatedAt: timestamp() });
    return result(writes.length, false);
  }
}
