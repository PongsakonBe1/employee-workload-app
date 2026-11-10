// REST atomicity tests for the approved fixture set in an isolated loopback namespace.
import fs from "node:fs";
import assert from "node:assert/strict";
import { FIXTURE_TARGETS, FIXTURE_MAINTENANCE_ID, encodeCleanupValue, buildCalendarFixtureCleanup } from "../backend/src/utils/calendarFixtureCleanup.js";
import { CLEANUP_OPERATION_ID } from "../backend/src/utils/calendarTestCleanup.js";
const projectId = "demo-calendar-fixture-cleanup",
  uid = "synthetic-operator";
const base = `http://127.0.0.1:18080/v1/projects/${projectId}/databases/(default)/documents`;
const gatePath = "/calendarWriteState/main",
  auditPath = "/calendarMaintenance/" + FIXTURE_MAINTENANCE_ID;
const report = {
  completed: false,
  projectId,
  checks: [],
  cloudUsed: false
};
async function request(path, method = "GET", body, allowFailure = false) {
  const response = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer owner"
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10000)
  });
  if (!allowFailure) assert.ok(response.ok, "Local REST request failed");
  return {
    ok: response.ok,
    status: response.status,
    body: await response.json()
  };
}
for (const row of FIXTURE_TARGETS) await request(`/${row.collection}/${row.id}`, "PATCH", {
  fields: encodeCleanupValue(row.data).mapValue.fields
});
await request(gatePath, "PATCH", {
  fields: encodeCleanupValue({
    revision: 2,
    operationId: CLEANUP_OPERATION_ID,
    updatedBy: uid
  }).mapValue.fields
});
const existingAudit = await request(auditPath, "GET", undefined, true);
if (existingAudit.ok) await request(auditPath, "DELETE");
const controls = [{
  path: "/classroomSchedules/user-created",
  data: {
    subject: "Unrelated synthetic input",
    isActive: true
  }
}, {
  path: "/users/fixture-user",
  data: {
    displayName: "Synthetic staff",
    active: true,
    role: "staff"
  }
}, {
  path: "/dlExamSchedules/dl-inactive",
  data: {
    isActive: false
  }
}, {
  path: "/calendarWriteOperations/original-receipt",
  data: {
    count: 1
  }
}];
for (const row of controls) await request(row.path, "PATCH", {
  fields: encodeCleanupValue(row.data).mapValue.fields
});
const controlSnapshots = await Promise.all(controls.map(async row => (await request(row.path)).body));
async function state() {
  const audit = await request(auditPath, "GET", undefined, true);
  return {
    projectId,
    uid,
    records: await Promise.all(FIXTURE_TARGETS.map(async row => (await request(`/${row.collection}/${row.id}`)).body)),
    gate: (await request(gatePath)).body,
    audit: audit.ok ? audit.body : null
  };
}
try {
  let snapshot = await state(),
    plan = buildCalendarFixtureCleanup(snapshot);
  await request("/dlExamSchedules/dl-evening?updateMask.fieldPaths=studentCount", "PATCH", {
    fields: encodeCleanupValue({
      studentCount: 90
    }).mapValue.fields
  });
  assert.equal((await request(":commit", "POST", {
    writes: plan.writes
  }, true)).ok, false);
  assert.ok((await state()).records.every(row => row.fields.isActive.booleanValue === true));
  assert.equal((await state()).gate.fields.revision.integerValue, "2");
  assert.equal((await request(auditPath, "GET", undefined, true)).status, 404);
  const changed = await state();
  assert.throws(() => buildCalendarFixtureCleanup({
    ...snapshot,
    records: changed.records
  }), /fixture-content-changed/);
  report.checks.push({
    name: "a changed fixture version rejects all seven writes without partial deactivation",
    passed: true
  });
  await request("/dlExamSchedules/dl-evening?updateMask.fieldPaths=studentCount", "PATCH", {
    fields: encodeCleanupValue({
      studentCount: 75
    }).mapValue.fields
  });
  snapshot = await state();
  plan = buildCalendarFixtureCleanup(snapshot);
  await request(gatePath + "?updateMask.fieldPaths=revision", "PATCH", {
    fields: encodeCleanupValue({
      revision: 3
    }).mapValue.fields
  });
  assert.equal((await request(":commit", "POST", {
    writes: plan.writes
  }, true)).ok, false);
  assert.ok((await state()).records.every(row => row.fields.isActive.booleanValue === true));
  report.checks.push({
    name: "a concurrent gate revision rejects the complete maintenance batch",
    passed: true
  });
  await request(gatePath + "?updateMask.fieldPaths=revision", "PATCH", {
    fields: encodeCleanupValue({
      revision: 2
    }).mapValue.fields
  });
  snapshot = await state();
  plan = buildCalendarFixtureCleanup(snapshot);
  await request(":commit", "POST", {
    writes: plan.writes
  });
  const after = await state();
  assert.ok(after.records.every(row => row.fields.isActive.booleanValue === false));
  assert.equal(after.gate.fields.revision.integerValue, "3");
  assert.ok(after.audit.fields.createdAt.timestampValue);
  for (let index = 0; index < 5; index++) assert.deepEqual(after.records[index].fields, {
    ...snapshot.records[index].fields,
    isActive: {
      booleanValue: false
    }
  });
  for (let index = 0; index < controls.length; index++) assert.deepEqual((await request(controls[index].path)).body, controlSnapshots[index]);
  report.checks.push({
    name: "exactly five flags, revision and audit committed; user-created data, directory, inactive fixture and receipt unchanged",
    passed: true
  });
  assert.deepEqual(buildCalendarFixtureCleanup(after).writes, []);
  report.checks.push({
    name: "repeat execution is a verified no-op",
    passed: true
  });
  report.completed = true;
} finally {
  fs.mkdirSync("output/playwright/calendar-staging-fixture-cleanup", {
    recursive: true
  });
  fs.writeFileSync("output/playwright/calendar-staging-fixture-cleanup/integration.json", JSON.stringify(report, null, 2));
}
console.log(`PASS fixture cleanup REST integration: ${report.checks.length} groups`);
