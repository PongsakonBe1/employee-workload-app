import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { prepareMutationCloudPlan, renderMutationQaRules, captureMutationQaBaseline, auditMutationQaProgress, assertMutationQaRollbackAllowed, assertMutationQaCheckpointUnchanged, preflightMutationCloudConflicts, qaTextHash, APPEND_ONLY_SOURCE_SHA, MUTATION_QA_MANIFEST_SHA } from "./calendar-mutation-cloud-plan.mjs";
const raw = fs.readFileSync(new URL("../docs/development/calendar-staging-mutation-cloud-qa/staging-manifest.json", import.meta.url), "utf8");
const source = fs.readFileSync(new URL("../firebase/calendar-mutations/firestore.rules", import.meta.url), "utf8"), identities = { staff: "synthetic-staff", superadmin: "synthetic-super" };
async function fixture() {
  const plan = await prepareMutationCloudPlan(raw, identities), documents = Object.fromEntries(plan.initialRecords.map(row => [row.collection + "/" + row.id, { ...row.value, createdAt: "2026-11-11T10:00:00Z" }]));
  documents["classroomSchedules/protected-fixture"] = { subject: "Unchanged synthetic fixture", isActive: true };
  documents["calendarWriteState/main"] = { revision: 13, operationId: "op-" + "b".repeat(64), updatedBy: identities.superadmin, updatedAt: "2026-11-11T10:00:00Z" };
  const observed = { documents, profileDigests: { staff: "unchanged-staff-profile", superadmin: "unchanged-super-profile" } };
  return { plan, observed, baseline: captureMutationQaBaseline(plan, observed) };
}
function apply(observed, operation, actor) {
  const docs = observed.documents, reference = operation.target.collection + "/" + operation.target.id;
  docs[reference] = { ...docs[reference], ...operation.value, mutationVersion: operation.expectedVersion + 1, lastOperationId: operation.operationId, updatedBy: actor, updatedAt: "2026-11-11T11:00:00Z" };
  docs["calendarWriteOperations/" + operation.operationId] = { action: operation.action, targetCollection: operation.target.collection, targetId: operation.target.id, expectedVersion: operation.expectedVersion, count: 1, skipped: 0, createdBy: actor, createdAt: "2026-11-11T11:00:00Z", schemaVersion: 2 };
  docs["calendarWriteState/main"] = { revision: operation.expectedRevision + 1, operationId: operation.operationId, updatedBy: actor, updatedAt: "2026-11-11T11:00:00Z" };
}
test("pinned proposal resolves exactly two existing targets and four ordered mutation receipts", async () => {
  const { plan } = await fixture();assert.equal(plan.manifestHash, MUTATION_QA_MANIFEST_SHA);assert.equal(plan.initialRecords.length, 2);
  assert.deepEqual(plan.operations.map(row => [row.action, row.expectedVersion, row.expectedRevision]), [["edit",0,13],["edit",0,14],["cancel",1,15],["cancel",1,16]]);
  assert.equal(plan.operations[0].value.startTime, "10:00");assert.equal(plan.operations[1].value.subject, "QA-MUTATION-DL");assert.deepEqual(plan.operations[1].value.proctors, ["synthetic-staff", "synthetic-super"]);
  assert.ok(plan.operations.slice(2).every(row => row.value.isActive === false));assert.equal(new Set(plan.operations.map(row => row.operationId)).size, 4);
});
test("manifest changes, budget changes, missing/invalid identity aliases fail closed", async () => {
  for (const text of [raw.replace('"mutationOperations": 4', '"mutationOperations": 5'), raw.replace('"10:00", "endTime": "11:00"', '"10:30", "endTime": "11:30"')]) await assert.rejects(prepareMutationCloudPlan(text, identities), /changed/);
  for (const ids of [null, {}, { staff: "same", superadmin: "same" }, { staff: "unsafe/id", superadmin: "valid" }, { staff: "valid", superadmin: "a\"b" }]) await assert.rejects(prepareMutationCloudPlan(raw, ids), /identity/);
  assert.deepEqual(await prepareMutationCloudPlan(raw.replaceAll("\r\n","\n").replaceAll("\n","\r\n"), identities), await prepareMutationCloudPlan(raw, identities));
});
test("Rules are actor/target/operation bounded and preserve v1 create with no v2 piggyback", async () => {
  const { plan } = await fixture(), rules = renderMutationQaRules(source, plan);
  assert.ok(rules.includes('request.auth.uid == "synthetic-super"'));assert.equal((rules.match(/allow update: if writer\(\) && mutationQaAllowed/g)||[]).length, 2);
  assert.equal((rules.match(/allow create: if writer\(\) && id.matches/g)||[]).length, 2);assert.ok(rules.includes("data.schemaVersion == 1\n        && gateAdvanced(d.operationId)"));
  for (const operation of plan.operations) { assert.ok(rules.includes(operation.operationId));assert.ok(rules.includes(`data.revision == ${operation.expectedRevision}`)); }
  assert.ok(rules.includes("allow delete: if false"));assert.ok(!rules.includes("allow create,update:"));
  assert.throws(() => renderMutationQaRules(source.replace("validExam", "changedExam"), plan), /source changed/);
});
test("every before/after checkpoint passes only for the exact sequential state", async () => {
  const { plan, observed, baseline } = await fixture();
  for (let done=0;done<=4;done++) { if(done)apply(observed,plan.operations[done-1],plan.actorUid);const report=auditMutationQaProgress(plan,baseline,observed,done);assert.equal(report.revision,13+done);assert.equal(report.receipts.length,done);assert.ok(report.protectedDocumentsUnchanged); }
  for (const row of plan.initialRecords) assert.equal(observed.documents[row.collection+"/"+row.id].isActive,false);
});
test("baseline, target ownership, immutable metadata and added fields are checked", async () => {
  const { plan, observed, baseline } = await fixture(), reference = plan.initialRecords[0].collection+"/"+plan.initialRecords[0].id;
  const changed=structuredClone(observed);changed.documents[reference].subject="Unexpected";assert.throws(()=>captureMutationQaBaseline(plan,changed),/differs/);
  apply(observed,plan.operations[0],plan.actorUid);
  for (const patch of [{createdBy:"other"},{createdAt:"changed"},{mutationVersion:8},{extra:"schema pollution"}]) { const bad=structuredClone(observed);Object.assign(bad.documents[reference],patch);assert.throws(()=>auditMutationQaProgress(plan,baseline,bad,1)); }
});
test("receipt forgery, missing receipt, unexpected revision/profile or protected changes stop audit", async () => {
  const { plan, observed, baseline } = await fixture();apply(observed,plan.operations[0],plan.actorUid);
  const receipt="calendarWriteOperations/"+plan.operations[0].operationId;
  for(const mutate of [data=>delete data.documents[receipt],data=>{data.documents[receipt].count=2;},data=>{data.documents["calendarWriteState/main"].revision++;},data=>{data.profileDigests.staff="changed";},data=>{data.documents["classroomSchedules/protected-fixture"].isActive=false;}]) {const bad=structuredClone(observed);mutate(bad);assert.throws(()=>auditMutationQaProgress(plan,baseline,bad,1));}
  assert.throws(()=>auditMutationQaProgress(plan,baseline,observed,0),/unexpected|Unexpected|future/);
});
test("rollback proposal refuses to overwrite a release that is no longer this QA candidate", async () => {
  const { plan }=await fixture(), hash=qaTextHash(renderMutationQaRules(source,plan)), prepared={manifestHash:MUTATION_QA_MANIFEST_SHA,candidateRulesHash:hash,rollbackRulesHash:APPEND_ONLY_SOURCE_SHA};
  assert.equal(assertMutationQaRollbackAllowed(prepared,hash).rollbackAllowed,true);assert.throws(()=>assertMutationQaRollbackAllowed(prepared,"different"),/another release/);
  assert.throws(()=>assertMutationQaRollbackAllowed({...prepared,rollbackRulesHash:"different"},hash));
});
test("conflict preflight uses fresh calendar data and does not silently accept an overlapping edit", async () => {
  const { plan } = await fixture(), documents = { users: Object.entries(identities).map(([alias, id]) => ({ id, displayName: "Synthetic " + alias, role: alias, active: true })), classroomSchedules: [], dlExamSchedules: [] };
  for (const row of plan.initialRecords) documents[row.collection].push({ id: row.id, ...row.value });
  assert.equal(preflightMutationCloudConflicts(plan, documents).conflicts, 0);
  documents.classroomSchedules.push({ ...documents.classroomSchedules[0], id: "synthetic-new-overlap", startTime: "10:30", endTime: "11:30", subject: "New overlapping fixture" });
  assert.throws(() => preflightMutationCloudConflicts(plan, documents), /ชน/);
});
test("rechecking a checkpoint preserves accepted receipts and target digests while permitting Rules restoration", async () => {
  const { plan, baseline, observed } = await fixture();apply(observed, plan.operations[0], plan.actorUid);
  const previous = { manifestHash: plan.manifestHash, ...auditMutationQaProgress(plan, baseline, observed, 1), deployedRulesHash: "candidate" };
  assert.doesNotThrow(() => assertMutationQaCheckpointUnchanged(previous, { ...previous, checkedAt: "later", deployedRulesHash: "rollback" }));
  const changed = structuredClone(previous);changed.schedules[0].digest = "changed";
  assert.throws(() => assertMutationQaCheckpointUnchanged(previous, changed), /checkpoint changed/);
});
