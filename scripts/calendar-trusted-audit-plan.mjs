// Pure checkpoint validation. No IO, SDK, credentials or cloud mutations.
import assert from "node:assert/strict";
import { prepareCalendarMutation } from "../frontend/lib/calendarMutationPlan.js";
import { reviewValueHash, TRUSTED_REVIEW_PROJECT } from "./calendar-trusted-cloud-plan.mjs";

const gateReference = "calendarWriteState/main";
const timestamp = value => typeof value === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,9})?Z$/.test(value) && Number.isFinite(Date.parse(value));
const normalizeTimestamp = value => { const match = value.match(/^(.+:\d\d)(?:\.(\d{1,9}))?Z$/);return match[1] + "." + (match[2] || "").padEnd(9, "0") + "Z"; };
const sameTimestamp = (left, right) => {
  assert(timestamp(left) && timestamp(right));assert.equal(normalizeTimestamp(left), normalizeTimestamp(right));
};
const equal = (left, right) => assert.equal(reviewValueHash(left), reviewValueHash(right));
const shape = (data, expected, timestamps = []) => {
  assert(data && typeof data === "object");
  equal(Object.keys(data).sort(), [...Object.keys(expected), ...timestamps].sort());
  for (const [key, value] of Object.entries(expected)) equal(data[key], value);
  for (const key of timestamps) assert(timestamp(data[key]), "Expected server timestamp");
};

export async function auditTrustedCheckpoint({ snapshot, observation, completed, previous = null }) {
  assert.equal(snapshot.target, TRUSTED_REVIEW_PROJECT);assert.equal(snapshot.database, "(default)");
  assert.equal(snapshot.frozen.target, TRUSTED_REVIEW_PROJECT);
  assert(Number.isInteger(completed) && completed >= 0 && completed <= 5);
  const frozen = snapshot.frozen, actorUid = snapshot.identities.superadmin;
  assert.equal(frozen.operations.length, 5);assert.equal(frozen.rejections.length, 3);
  assert.equal(new Set(frozen.references).size, 16);
  const contextHash = reviewValueHash(snapshot);
  if (previous) {
    assert.equal(previous.contextHash, contextHash);
    assert([previous.completed, previous.completed + 1].includes(completed), "Audit cannot skip or reverse a checkpoint");
  } else assert.equal(completed, 0, "Initial audit must precede the first write");
  equal(Object.keys(observation.documents).sort(), [...frozen.references, gateReference].sort());
  equal(Object.keys(observation.profiles).sort(), ["staff", "superadmin"]);
  const profileVersions = {};
  for (const alias of ["staff", "superadmin"]) {
    const row = observation.profiles[alias], uid = snapshot.identities[alias];
    assert(row);equal(row.fields, snapshot.profiles[alias]);
    assert.equal(row.updateTime, snapshot.fingerprints.users.find(person => person.id === uid)?.updateTime);
    profileVersions[alias] = reviewValueHash(row);
  }
  const protectedDigests = {};
  for (const collection of ["users", "classroomSchedules", "dlExamSchedules"]) {
    const rows = observation.protected[collection];assert(Array.isArray(rows) && rows.length <= 200);
    const owned = new Set(frozen.operations.flatMap(op => op.entries || []).filter(row => row.collection === collection).map(row => row.id));
    const versions = values => values.map(row => ({ id: row.id, updateTime: row.updateTime })).sort((a, b) => a.id.localeCompare(b.id));
    const current = versions(rows.filter(row => !owned.has(row.id)));
    equal(current, versions(snapshot.fingerprints[collection]));protectedDigests[collection] = reviewValueHash(current);
  }
  const expectedTargets = new Map(), expectedReceipts = new Map();
  const people = snapshot.fingerprints.users.map((row, index) => ({ id: row.id, label: "Directory " + index, identity: "directory" }));
  for (const operation of frozen.operations.slice(0, completed)) {
    if (operation.kind === "create") {
      for (const entry of operation.entries) expectedTargets.set(`${entry.collection}/${entry.id}`, { value: { ...entry.value, operationId: operation.operationId, createdBy: actorUid, schemaVersion: 1 }, timestamps: ["createdAt"], version: 0 });
      expectedReceipts.set(operation.operationId, { count: operation.entries.length, skipped: 0, createdBy: actorUid, schemaVersion: 1 });
    } else {
      const plan = await prepareCalendarMutation(operation.input, people);assert.equal(plan.operationId, operation.operationId);
      const reference = `${operation.target.collection}/${operation.target.id}`, existing = expectedTargets.get(reference);assert(existing);
      existing.value = { ...existing.value, ...plan.value, mutationVersion: plan.expectedVersion + 1, lastOperationId: operation.operationId, updatedBy: actorUid };
      existing.timestamps = ["createdAt", "updatedAt"];existing.version = plan.expectedVersion + 1;
      expectedReceipts.set(operation.operationId, { action: operation.input.action, targetCollection: operation.target.collection, targetId: operation.target.id, expectedVersion: operation.expectedVersion, count: 1, skipped: 0, createdBy: actorUid, schemaVersion: 2 });
    }
  }
  const schedules = [], receipts = [];
  for (const reference of frozen.references) {
    const row = observation.documents[reference];
    if (reference.startsWith("calendarWriteOperations/")) {
      const id = reference.split("/")[1], expected = expectedReceipts.get(id);
      if (!expected) { assert.equal(row, null, "Unexpected future or rejection receipt");continue; }
      assert(row);shape(row.data, expected, ["createdAt"]);assert(timestamp(row.updateTime) && timestamp(row.createTime));
      sameTimestamp(row.createTime, row.updateTime);
      receipts.push({ reference, digest: reviewValueHash(row) });
    } else {
      const expected = expectedTargets.get(reference);
      if (!expected) { assert.equal(row, null, "Unexpected future or rejection schedule");continue; }
      assert(row);shape(row.data, expected.value, expected.timestamps);assert(timestamp(row.updateTime) && timestamp(row.createTime));
      // REQUEST_TIME fields share a transaction timestamp, but need not equal document metadata.
      // https://firebase.google.com/docs/firestore/reference/rest/v1/Write#ServerValue
      const createdReceipt = observation.documents["calendarWriteOperations/" + row.data.operationId];assert(createdReceipt);
      sameTimestamp(row.data.createdAt, createdReceipt.data.createdAt);
      if (expected.version) {
        const changedReceipt = observation.documents["calendarWriteOperations/" + row.data.lastOperationId];assert(changedReceipt);
        sameTimestamp(row.data.updatedAt, changedReceipt.data.createdAt);
        assert(normalizeTimestamp(row.updateTime) > normalizeTimestamp(row.createTime));
      } else sameTimestamp(row.createTime, row.updateTime);
      schedules.push({ reference, version: expected.version, active: row.data.isActive, createdAt: row.data.createdAt, createTime: row.createTime, digest: reviewValueHash(row) });
    }
  }
  const gate = observation.documents[gateReference];assert(gate && timestamp(gate.updateTime));
  assert.equal(gate.data.revision, snapshot.gateRevision + completed);
  if (completed === 0) assert.equal(gate.updateTime, snapshot.gateUpdateTime);
  else {
    const last = frozen.operations[completed - 1];
    shape(gate.data, { revision: snapshot.gateRevision + completed, operationId: last.operationId, updatedBy: actorUid }, ["updatedAt"]);
    sameTimestamp(gate.data.updatedAt, observation.documents["calendarWriteOperations/" + last.operationId].data.createdAt);
  }
  if (previous) {
    equal(profileVersions, previous.profileVersions);equal(protectedDigests, previous.protectedDigests);
    for (const old of previous.receipts) equal(receipts.find(row => row.reference === old.reference), old);
    const changedTarget = completed > previous.completed && frozen.operations[completed - 1].kind === "mutate" ? frozen.operations[completed - 1].target : null;
    for (const old of previous.schedules) {
      const current = schedules.find(row => row.reference === old.reference);assert(current);
      assert.equal(current.createdAt, old.createdAt);assert.equal(current.createTime, old.createTime);
      if (!changedTarget || old.reference !== `${changedTarget.collection}/${changedTarget.id}`) equal(current, old);
    }
    if (completed === previous.completed) assert.equal(reviewValueHash(gate), previous.gateDigest);
  }
  return { passed: true, contextHash, completed, revision: gate.data.revision, gateDigest: reviewValueHash(gate), schedules, receipts, profileVersions, protectedDigests, cloudRecordsWritten: 0, privilegedAuditIsNotRulesEvidence: true };
}
