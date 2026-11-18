import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { freezeTrustedReview } from "./calendar-trusted-cloud-plan.mjs";
import { prepareCalendarMutation } from "../frontend/lib/calendarMutationPlan.js";
import { auditTrustedCheckpoint } from "./calendar-trusted-audit-plan.mjs";
const proposal = JSON.parse(fs.readFileSync("docs/development/calendar-trusted-writer-qa-prep/cloud-qa.review.json", "utf8"));
const identities = { staff: "synthetic-staff", superadmin: "synthetic-superadmin" };
const profiles = { staff: { role: "staff", active: true, calendarWriter: false }, superadmin: { role: "superadmin", active: true, calendarWriter: true } };
const time = step => `2027-06-01T10:0${step}:00.000000000Z`;
async function fixture() {
  const users = Object.entries(identities).map(([alias, id]) => ({ id, displayName: "Synthetic " + alias, ...profiles[alias] }));
  const frozen = await freezeTrustedReview(proposal, identities, profiles, { users, classroomSchedules: [], dlExamSchedules: [] });
  const snapshot = { target: frozen.target, database: "(default)", identities, profiles, frozen, gateRevision: 17, gateUpdateTime: time(0), fingerprints: { users: users.map(row => ({ id: row.id, updateTime: time(0) })), classroomSchedules: [{ id: "legacy-protected", updateTime: time(0) }], dlExamSchedules: [] } };
  const observation = { documents: Object.fromEntries([...frozen.references, "calendarWriteState/main"].map(reference => [reference, null])), profiles: Object.fromEntries(Object.entries(profiles).map(([alias, fields]) => [alias, { fields, updateTime: time(0) }])), protected: structuredClone(snapshot.fingerprints) };
  observation.documents["calendarWriteState/main"] = { data: { revision: 17, operationId: "synthetic-old-operation", updatedBy: "synthetic-old-actor", updatedAt: time(0) }, createTime: time(0), updateTime: time(0) };
  const people = users.map(row => ({ id: row.id, label: row.displayName, identity: "directory" }));
  async function advance(step) {
    const operation = frozen.operations[step - 1];
    if (operation.kind === "create") {
      for (const entry of operation.entries) {
        const reference = `${entry.collection}/${entry.id}`;
        observation.documents[reference] = { data: { ...entry.value, operationId: operation.operationId, createdBy: identities.superadmin, createdAt: time(step), schemaVersion: 1 }, createTime: time(step), updateTime: time(step) };
        observation.protected[entry.collection].push({ id: entry.id, updateTime: time(step) });
      }
      observation.documents["calendarWriteOperations/" + operation.operationId] = { data: { count: operation.entries.length, skipped: 0, createdBy: identities.superadmin, createdAt: time(step), schemaVersion: 1 }, createTime: time(step), updateTime: time(step) };
    } else {
      const plan = await prepareCalendarMutation(operation.input, people), reference = `${plan.target.collection}/${plan.target.id}`, row = observation.documents[reference];
      Object.assign(row.data, plan.value, { mutationVersion: plan.expectedVersion + 1, lastOperationId: plan.operationId, updatedBy: identities.superadmin, updatedAt: time(step) });row.updateTime = time(step);
      observation.protected[plan.target.collection] = observation.protected[plan.target.collection].filter(record => record.id !== plan.target.id);
      if (row.data.isActive) observation.protected[plan.target.collection].push({ id: plan.target.id, updateTime: time(step) });
      observation.documents["calendarWriteOperations/" + operation.operationId] = { data: { action: operation.input.action, targetCollection: operation.target.collection, targetId: operation.target.id, expectedVersion: operation.expectedVersion, count: 1, skipped: 0, createdBy: identities.superadmin, createdAt: time(step), schemaVersion: 2 }, createTime: time(step), updateTime: time(step) };
    }
    observation.documents["calendarWriteState/main"] = { data: { revision: 17 + step, operationId: operation.operationId, updatedBy: identities.superadmin, updatedAt: time(step) }, createTime: time(0), updateTime: time(step) };
  }
  return { snapshot, observation, advance };
}
const audit = (f, completed, previous = null) => auditTrustedCheckpoint({ snapshot: f.snapshot, observation: f.observation, completed, previous });

test("audits checkpoints 0..5, repeated checkpoints and retained soft-cancel exactly", async () => {
  const f = await fixture();let previous = await audit(f, 0);
  for (let step = 1; step <= 5; step++) { await f.advance(step);previous = await audit(f, step, previous);assert.deepEqual(await audit(f, step, previous), previous); }
  assert.equal(previous.revision, 22);assert.equal(previous.schedules.length, 5);assert.equal(previous.receipts.length, 5);
  assert.equal(previous.schedules.filter(row => row.active).length, 4);
  const text = JSON.stringify(previous);for (const uid of Object.values(identities)) assert(!text.includes(uid));
});
test("rejects missing targets, partial commits, future writes and rejection receipts", async () => {
  for (const damage of [
    f => { f.observation.documents[f.snapshot.frozen.references[0]] = { data: {}, updateTime: time(1) }; },
    f => { f.observation.documents["calendarWriteOperations/" + f.snapshot.frozen.rejections[0].operationId] = { data: {}, updateTime: time(1) }; }
  ]) { const f = await fixture();damage(f);await assert.rejects(audit(f, 0)); }
  const f = await fixture(), prior = await audit(f, 0);await f.advance(1);
  f.observation.documents[f.snapshot.frozen.operations[0].entries.map(row => `${row.collection}/${row.id}`)[0]] = null;
  await assert.rejects(audit(f, 1, prior));
});
test("rejects count, actor, schema and unexpected business/metadata fields", async () => {
  for (const damage of [
    f => { f.observation.documents["calendarWriteOperations/" + f.snapshot.frozen.operations[0].operationId].data.count = 2; },
    f => { f.observation.documents["calendarWriteOperations/" + f.snapshot.frozen.operations[0].operationId].data.createdBy = identities.staff; },
    f => { f.observation.documents["calendarWriteOperations/" + f.snapshot.frozen.operations[0].operationId].data.schemaVersion = 2; },
    f => { f.observation.documents["calendarWriteOperations/" + f.snapshot.frozen.operations[0].operationId].data.createdAt = time(0); },
    f => { const entry = f.snapshot.frozen.operations[0].entries[0];f.observation.documents[`${entry.collection}/${entry.id}`].data.unreviewed = true; }
  ]) { const f = await fixture(), prior = await audit(f, 0);await f.advance(1);damage(f);await assert.rejects(audit(f, 1, prior)); }
});
test("rejects profile changes and edits, disappearance or additions in protected baseline", async () => {
  for (const damage of [
    f => { f.observation.profiles.superadmin = { fields: { ...profiles.superadmin, calendarWriter: false }, updateTime: time(0) }; },
    f => { f.observation.profiles.superadmin.updateTime = time(1); },
    f => { f.observation.protected.classroomSchedules[0].updateTime = time(1); },
    f => { f.observation.protected.classroomSchedules = []; },
    f => { f.observation.protected.classroomSchedules.push({ id: "unexpected-extra", updateTime: time(1) }); }
  ]) { const f = await fixture();damage(f);await assert.rejects(audit(f, 0)); }
});
test("replay/rejection cannot alter gate, timestamps or any receipt", async () => {
  const f = await fixture(), zero = await audit(f, 0);await f.advance(1);const first = await audit(f, 1, zero);
  const clone = structuredClone(f.observation);f.observation.documents["calendarWriteState/main"].data.revision++;
  await assert.rejects(audit(f, 1, first));f.observation = clone;
  f.observation.documents["calendarWriteOperations/" + f.snapshot.frozen.operations[0].operationId].data.createdAt = time(2);
  await assert.rejects(audit(f, 1, first));
});
test("mutations cannot rewrite original creation metadata or earlier receipts", async () => {
  const f = await fixture();let previous = await audit(f, 0);
  for (let step = 1; step <= 3; step++) { await f.advance(step);previous = await audit(f, step, previous); }
  await f.advance(4);const entry = f.snapshot.frozen.operations[0].entries[0];
  f.observation.documents[`${entry.collection}/${entry.id}`].data.createdAt = time(4);
  await assert.rejects(audit(f, 4, previous));
});
test("accepts server transform timestamps with lower precision than document metadata", async () => {
  const f = await fixture(), zero = await audit(f, 0);await f.advance(1);
  const operation = f.snapshot.frozen.operations[0], entry = operation.entries[0];
  for (const reference of [`${entry.collection}/${entry.id}`, "calendarWriteOperations/" + operation.operationId]) {
    const row = f.observation.documents[reference];row.createTime = "2027-06-01T10:01:00.000123Z";row.updateTime = row.createTime;row.data.createdAt = "2027-06-01T10:01:00Z";
  }
  f.observation.documents["calendarWriteState/main"].updateTime = "2027-06-01T10:01:00.000123Z";
  const result = await audit(f, 1, zero);assert.equal(result.revision, 18);
});
test("does not accept skipped, reversed, production or cross-snapshot checkpoints", async () => {
  const f = await fixture(), zero = await audit(f, 0);
  await assert.rejects(audit(f, 1));await assert.rejects(audit(f, 2, zero));
  const previous = { ...zero, contextHash: "different" };await assert.rejects(audit(f, 0, previous));
  f.snapshot.target = "labboy-workload-app";await assert.rejects(audit(f, 0));
});

test("final smoke audit checks all targets and receipts directly against checkpoint 0", async () => {
  const f = await fixture(), previous = await audit(f, 0);
  for (let step = 1; step <= 5; step++) await f.advance(step);
  const terminal = () => auditTrustedCheckpoint({ snapshot: f.snapshot, observation: f.observation, completed: 5, previous, terminalFromBaseline: true });
  await assert.rejects(audit(f, 5, previous));
  const result = await terminal();
  assert.equal(result.revision, 22);
  assert.equal(result.receipts.length, 5);
  assert.equal(result.schedules.filter(row => row.active).length, 4);
  const rejectedReceipt = "calendarWriteOperations/" + f.snapshot.frozen.rejections[0].operationId;
  f.observation.documents[rejectedReceipt] = { data: {}, updateTime: time(5) };
  await assert.rejects(terminal(), /Unexpected future or rejection receipt/);
});
