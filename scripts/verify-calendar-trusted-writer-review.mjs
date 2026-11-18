// Offline review only: pure planners and synthetic IDs. No SDK, credentials, HTTP or cloud actions.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { prepareCalendarCreate, validateCalendarCreateAgainst } from "../frontend/lib/calendarCreatePlan.js";
import { prepareCalendarMutation, validateCalendarMutationTarget, validateCalendarMutationAgainst } from "../frontend/lib/calendarMutationPlan.js";
import { adaptCalendarDocuments } from "../frontend/lib/calendarDataAdapter.js";
import { calendarWeekday } from "../frontend/lib/calendarView.js";

const manifestPath = "docs/development/calendar-trusted-writer-qa-prep/cloud-qa.review.json";
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const hash = path => createHash("sha256").update(fs.readFileSync(path)).digest("hex");
assert.equal(manifest.cloudExecutionApproved, false);
assert.equal(manifest.status, "proposed-not-approved-for-cloud");
assert.equal(manifest.target.projectId, "labboy-workload-app-staging");
assert.equal(manifest.target.databaseId, "(default)");
assert.equal(manifest.target.apiOrigin, "https://labboy-calendar-staging.onrender.com");
assert.equal(manifest.target.plan, "free");
assert.equal(manifest.source.pushApproved, false);
assert.equal(manifest.source.deployApproved, false);
assert.equal(manifest.source.cloudQaRuntimeCommit, null);
assert.equal(manifest.rules.deployApproved, false);
assert.equal(manifest.rules.freshDeployedHash, null);
assert.equal(manifest.rules.freshBaselineReadApproved, false);
assert.equal(manifest.rules.restoreLegacyClientWrites, false);
assert.equal(hash(manifest.rules.candidatePath), manifest.rules.candidateSha256);
assert.equal(manifest.actors.cloudUidBindingsFrozen, false);
assert.equal(manifest.actors.createAccountsOrChangeProfiles, false);
assert.deepEqual(manifest.actors.proctorAliases, ["staff", "superadmin"]);
const budgets = manifest.budgets, sequence = manifest.requestSequence;
const sum = key => sequence.reduce((total, row) => total + row[key], 0);
assert.equal(sum("httpRequests"), 13);
assert.equal(sum("expectedNewSchedules"), 5);
assert.equal(sum("expectedNewReceipts"), 5);
assert.equal(sum("expectedGateIncrease"), 5);
assert.equal(budgets.maximumCreateOrMutatePostRequests, 13);
assert.equal(budgets.maximumNewSchedules, 5);
assert.equal(budgets.maximumNewReceipts, 5);
assert.equal(budgets.expectedGateRevisionIncrease, 5);
assert.equal(budgets.uniqueSuccessfulWriteOperations + budgets.replayRequests + budgets.expectedFailureRequests, 13);
assert.equal(budgets.maximumConcurrentWriteRequests, 2);
assert.equal(budgets.maximumPostRequestsPerUidPerRollingMinute, 10);
assert.equal(budgets.physicalDeletes, 0);
const connectivityManifestHash = hash("deploy/calendar-staging/connectivity-rollout.review.json");
assert.equal(connectivityManifestHash, "7ba003c7879e8d7e24a81cc44946c131219ae6ebf29eefc208e77b22bb7eb1ae");
const blueprintHash = hash("deploy/calendar-staging/render.yaml");
assert.equal(blueprintHash, "c45be50a48b9b12ec33559da9da6ababba61bd529311dc29220db787b1140973");

const users = [
  { id: "synthetic-review-staff", displayName: "Synthetic staff", role: "staff", active: true },
  { id: "synthetic-review-superadmin", displayName: "Synthetic superadmin", role: "superadmin", active: true, calendarWriter: true }
];
const people = adaptCalendarDocuments({ users }).people;
const documents = { users, classroomSchedules: [], dlExamSchedules: [] };
const templates = manifest.inputTemplates;
const rule = (input, title, room) => ({
  kind: "classroom", title, rooms: [room], weekday: calendarWeekday(input.date),
  validFrom: input.date, validTo: input.date, start: input.start, end: input.end,
  semester: input.semester, teacher: ""
});
const batch = rules => ({ rules, events: [] });
const checks = ["Cloud approvals remain false and cloud UID/source/Rules bindings remain unfrozen", "13 POST proposal totals 5 schedules, 5 receipts and gate +5", "Prior approved connectivity manifest and Blueprint remain unchanged"];
const plans = [];
function simulateCreate(plan) {
  const checked = validateCalendarCreateAgainst(plan, documents);
  assert.equal(checked.skipped, 0);
  for (const entry of checked.entries) documents[entry.collection].push({ ...entry.value, id: entry.id, operationId: plan.operationId, schemaVersion: 1, createdBy: "synthetic-review-superadmin" });
  return checked.entries;
}
function original(id) {
  const data = adaptCalendarDocuments(documents);
  assert.equal(data.complete, true);
  return [...data.data.rules, ...data.data.events].find(row => row.source.documentId === id);
}
function simulateMutation(plan) {
  const record = documents[plan.target.collection].find(row => row.id === plan.target.id);
  validateCalendarMutationTarget(plan, record);
  validateCalendarMutationAgainst(plan, documents);
  Object.assign(record, plan.value, { mutationVersion: plan.expectedVersion + 1, lastOperationId: plan.operationId });
  return record;
}
const manualInput = batch([rule(templates.manual, templates.manual.title, templates.manual.room)]);
const manual = await prepareCalendarCreate(manualInput, people);
assert.equal(manual.operationId, (await prepareCalendarCreate(structuredClone(manualInput), people)).operationId);
const [manualRecord] = simulateCreate(manual);
plans.push({ alias: "manual", operationId: manual.operationId, targets: manual.entries.map(row => row.collection + "/" + row.id) });
checks.push("Manual payload has deterministic targets and receipt; concurrency itself is not tested offline");

const free = templates.atomicConflict;
const atomic = await prepareCalendarCreate(batch([
  rule({ date: free.freeDate, start: free.freeStart, end: free.freeEnd, semester: templates.manual.semester }, "QA-SERVER-ATOMIC-FREE", free.freeRoom),
  rule(templates.manual, "QA-SERVER-ATOMIC-CONFLICT", templates.manual.room)
]), people);
assert.throws(() => validateCalendarCreateAgainst(atomic, documents), error => error.code === "calendar-write-validation");
checks.push("Atomic room-conflict plan rejects the whole proposed batch at pure validation; no transaction claim");

const pdfInput = batch(templates.pdfReview.rooms.map(room => rule(templates.pdfReview, templates.pdfReview.titlePrefix + " " + room, room)));
const pdf = await prepareCalendarCreate(pdfInput, people);
assert.equal(simulateCreate(pdf).length, 2);
plans.push({ alias: "pdf", operationId: pdf.operationId, targets: pdf.entries.map(row => row.collection + "/" + row.id) });
const dlInput = { rules: [], events: templates.dlReview.dates.map(date => ({
  kind: "dl", title: templates.dlReview.title, date,
  start: templates.dlReview.start, end: templates.dlReview.end,
  rooms: templates.dlReview.rooms, participants: templates.dlReview.participantsPerRound,
  proctors: users.map(row => row.id), examType: "student", semester: templates.dlReview.semester, repeat: "none"
})) };
const dl = await prepareCalendarCreate(dlInput, people);
assert.equal(simulateCreate(dl).length, 2);
for (const entry of dl.entries) {
  assert.equal(entry.value.studentCount, 75);
  assert.equal(entry.value.startTime, "17:00");
  assert.equal(entry.value.endTime, "18:30");
  assert.deepEqual(entry.value.locations, ["ห้อง 406", "ห้อง 407"]);
}
plans.push({ alias: "dl-synthetic-ids-only", operationId: dl.operationId, targets: dl.entries.map(row => row.collection + "/" + row.id) });
checks.push("PDF review-output creates 2 classroom plans; DL review-output creates 2 evening 75-person plans using both rooms and synthetic IDs");
const dlConflict = await prepareCalendarCreate({ rules: [], events: [{ ...dlInput.events[0], title: "QA-SERVER-DL-CONFLICT" }] }, people);
assert.throws(() => validateCalendarCreateAgainst(dlConflict, documents), error => error.code === "calendar-write-validation");
checks.push("Combined DL room/proctor overlap rejected; isolated proctor-only behavior not claimed");

const before = original(manualRecord.id);
const editInput = { action: "edit", original: before, replacement: { ...before, ...templates.manualEdit } };
const edit = await prepareCalendarMutation(editInput, people);
const edited = simulateMutation(edit);
assert.equal(edited.id, manualRecord.id);
assert.equal(edited.mutationVersion, 1);
plans.push({ alias: "edit-manual", operationId: edit.operationId, targets: [edit.target.collection + "/" + edit.target.id] });
const stale = await prepareCalendarMutation({ ...editInput, replacement: { ...before, start: "11:00", end: "12:00" } }, people);
assert.notEqual(stale.operationId, edit.operationId);
assert.throws(() => validateCalendarMutationTarget(stale, edited), error => error.code === "calendar-write-stale");
const cancel = await prepareCalendarMutation({ action: "cancel", original: original(manualRecord.id) }, people);
const cancelled = simulateMutation(cancel);
assert.equal(cancelled.isActive, false);
assert.equal(cancelled.mutationVersion, 2);
plans.push({ alias: "cancel-manual", operationId: cancel.operationId, targets: [cancel.target.collection + "/" + cancel.target.id] });
assert.equal(new Set(plans.map(row => row.operationId)).size, 5);
assert.equal(documents.classroomSchedules.length + documents.dlExamSchedules.length, 5);
assert.equal(adaptCalendarDocuments(documents).data.rules.length, 2);
assert.equal(adaptCalendarDocuments(documents).data.events.length, 2);
checks.push("Edit preserves target, stale original rejects with distinct receipt hash, cancellation retains the inactive record at version 2");

const report = {
  passed: true, observedAt: new Date().toISOString(), scope: "offline manifest arithmetic and pure planner validation only",
  cloudUsed: false, credentialMaterialRead: false, sdkImported: false, networkRequests: 0,
  emulatorSitExecuted: false, unitSuiteExecuted: false, buildExecuted: false,
  candidateRulesCompiledThisPhase: false, candidateRulesCloudBaselineVerified: false,
  cloudExecutionApproved: false, manifestSha256: hash(manifestPath),
  candidateRulesSha256: hash(manifest.rules.candidatePath), connectivityManifestHash, blueprintHash,
  checks, syntheticPlansNotApprovedCloudPayloads: plans,
  limitations: ["No live baseline or real directory binding", "No transaction, receipt replay, concurrency or HTTP assertion", "No PDF/OCR byte parsing in this offline check", "Local fixture IDs and hashes must not be used as frozen cloud payloads"]
};
const output = "output/playwright/calendar-trusted-writer-qa-prep";
fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(output + "/local-review-report.json", JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ passed: report.passed, checks: checks.length, cloudUsed: false, networkRequests: 0, schedules: 5, operations: 5, report: output + "/local-review-report.json" }));
