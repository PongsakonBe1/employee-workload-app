// Fixed approved payload on loopback only. No cloud CLI credentials, namespace resets or real users.
import fs from "node:fs";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { initializeApp, deleteApp } from "firebase/app";
import { initializeAuth, inMemoryPersistence, connectAuthEmulator, createUserWithEmailAndPassword, deleteUser } from "firebase/auth";
import { initializeFirestore, connectFirestoreEmulator, terminate, setLogLevel } from "firebase/firestore";
import { calendarRoleWriteSdk, calendarRoleWriteTransport } from "../frontend/lib/calendarRoleWriteSdk.js";
import { createCalendarWriter } from "../frontend/lib/calendarWriter.js";
import { prepareRoleWriteFixture, validateRoleWritePlan } from "./calendar-role-write-plan.mjs";
import { calendarTestPassword } from "../frontend/lib/calendarEmulatorConfig.js";
setLogLevel("silent");
const project = "labboy-workload-app-staging", origin = "http://127.0.0.1:18080", authOrigin = "http://127.0.0.1:19099";
const prefix = `projects/${project}/databases/(default)/documents`, clients = [], run = "qa-write-" + randomUUID().replaceAll("-", "");
const proposal = JSON.parse(fs.readFileSync("docs/development/calendar-role-write-plan/staging-fixture.json")), prepared = await prepareRoleWriteFixture(proposal);
const refs = { gate: "calendarWriteState/main", schedule: "classroomSchedules/" + prepared.entries[0].id, receipt: "calendarWriteOperations/" + prepared.operationId };
const checks = [], profileRefs = [], ownerUids = new Set();let gateOwned = false, cleanupPassed = false;
const encode = value => Object.fromEntries(Object.entries(value).map(([key, item]) => [key, typeof item === "boolean" ? { booleanValue: item } : typeof item === "number" ? { integerValue: String(item) } : { stringValue: item }]));
async function local(path, method = "GET", body) {
  const url = new URL(path, origin);assert.equal(url.origin, origin);assert.equal(url.hostname, "127.0.0.1");
  const response = await fetch(url, { method, headers: { Authorization: "Bearer owner", "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000) });
  const value = await response.json();
  if (!response.ok && response.status !== 404) throw new Error(`Loopback QA request failed (${response.status})`);
  return response.status === 404 ? null : value;
}
const document = ref => local(`/v1/${prefix}/${ref}`);
const commit = writes => local(`/v1/${prefix}:commit`, "POST", { writes });
async function snapshot() { return Object.fromEntries(await Promise.all(Object.entries(refs).map(async ([key, ref]) => [key, await document(ref)]))); }
try {
  // A distinct, previously unused Emulator namespace. Never replace an existing test namespace.
  for (const collection of ["users", "classroomSchedules", "dlExamSchedules", "calendarWriteState", "calendarWriteOperations"]) {
    const existing = await local(`/v1/${prefix}/${collection}?pageSize=1`);
    assert.equal(existing?.documents?.length || 0, 0, "Refuse to initialize a nonempty loopback QA namespace");
  }
  await local(`/emulator/v1/projects/${project}:securityRules`, "PUT", { rules: { files: [{ name: "firestore.rules", content: fs.readFileSync("firebase/calendar-writer/firestore.rules", "utf8") }] } });
  await commit([{ update: { name: prefix + "/" + refs.gate, fields: encode({ revision: 9 }) }, currentDocument: { exists: false } }]);gateOwned = true;
  for (const role of ["staff", "superadmin"]) {
    const app = initializeApp({ projectId: project, apiKey: "demo-role-write-placeholder", appId: "demo-role-write" }, run + role);
    const auth = initializeAuth(app, { persistence: inMemoryPersistence });connectAuthEmulator(auth, authOrigin, { disableWarnings: true });
    const db = initializeFirestore(app, { experimentalForceLongPolling: true });connectFirestoreEmulator(db, "127.0.0.1", 18080);
    const value = { role, app, auth, db };clients.push(value);
    const credential = await createUserWithEmailAndPassword(auth, run + "-" + role + "@example.test", calendarTestPassword);
    const uid = credential.user.uid;ownerUids.add(uid);
    const ref = "users/" + uid;
    await commit([{ update: { name: prefix + "/" + ref, fields: encode({ displayName: "QA " + role, role, active: true, calendarWriter: role === "superadmin" }) }, currentDocument: { exists: false } }]);profileRefs.push(ref);
    value.qa = calendarRoleWriteSdk(db, () => auth.currentUser?.uid || null, proposal);
  }
  const staff = clients[0], superadmin = clients[1];
  assert.deepEqual(await staff.qa.staffDenial(), { outcome: "permission-denied", stop: false });
  const afterDenial = await snapshot();assert.equal(afterDenial.gate.fields.revision.integerValue, "9");assert.equal(afterDenial.schedule, null);assert.equal(afterDenial.receipt, null);
  await assert.rejects(staff.qa.staffDenial(), error => error.code === "qa-write-stopped");checks.push("actual Staff SDK raw batch denied atomically; duplicate attempt blocked");
  const transport = calendarRoleWriteTransport(superadmin.db, () => superadmin.auth.currentUser?.uid || null);
  await transport.rawCommit(prepared, 9, superadmin.auth.currentUser.uid);
  const rawAllowed = await snapshot();assert.equal(rawAllowed.gate.fields.revision.integerValue, "10");assert.equal(rawAllowed.receipt.fields.count.integerValue, "1");
  assert.equal(rawAllowed.schedule.fields.operationId.stringValue, prepared.operationId);checks.push("same raw payload accepted by rules for actual Superadmin");
  // Restore only the three owned fixture documents, with server version preconditions.
  assert.equal(rawAllowed.schedule.fields.createdBy.stringValue, superadmin.auth.currentUser.uid);
  assert.equal(rawAllowed.receipt.fields.createdBy.stringValue, superadmin.auth.currentUser.uid);
  await commit([{ delete: prefix + "/" + refs.schedule, currentDocument: { updateTime: rawAllowed.schedule.updateTime } }, { delete: prefix + "/" + refs.receipt, currentDocument: { updateTime: rawAllowed.receipt.updateTime } }, { update: { name: prefix + "/" + refs.gate, fields: encode({ revision: 9 }) }, currentDocument: { updateTime: rawAllowed.gate.updateTime } }]);
  assert.equal((await superadmin.qa.create(validateRoleWritePlan(proposal), true)).created, 1);checks.push("Superadmin ordinary writer creates exactly one fixed fixture");
  const beforeRepeat = await snapshot();
  assert.equal((await superadmin.qa.repeat()).created, 0);assert.deepEqual(await snapshot(), beforeRepeat);checks.push("repeat-only writer reuses receipt without any document change");
  await assert.rejects(createCalendarWriter(superadmin.db, () => superadmin.auth.currentUser.uid, null, { expectedRevision: 9 })(validateRoleWritePlan(proposal)));
  assert.deepEqual(await snapshot(), beforeRepeat);checks.push("pinned revision rejects stale requests inside transaction");
  await commit([{ delete: prefix + "/" + refs.receipt, currentDocument: { updateTime: beforeRepeat.receipt.updateTime } }]);
  await assert.rejects(createCalendarWriter(superadmin.db, () => superadmin.auth.currentUser.uid, null, { expectedRevision: 10, requireExistingReceipt: true })(validateRoleWritePlan(proposal)));
  const missing = await snapshot();assert.equal(missing.receipt, null);assert.equal(missing.gate.fields.revision.integerValue, "10");checks.push("repeat-only mode refuses to recreate a missing receipt");
} finally {
  // Never delete unrelated data, and never reset a namespace. All references belong to this run.
  if (gateOwned) {
    const current = await snapshot(), writes = [];
    for (const [alias, value] of Object.entries(current)) if (value) {
      if (alias === "gate") assert.ok(value.fields.revision.integerValue === "9" || value.fields.operationId?.stringValue === prepared.operationId && ownerUids.has(value.fields.updatedBy?.stringValue));
      else assert.ok(ownerUids.has(value.fields.createdBy?.stringValue) && (alias !== "schedule" || value.fields.operationId?.stringValue === prepared.operationId));
      writes.push({ delete: prefix + "/" + refs[alias], currentDocument: { updateTime: value.updateTime } });
    }
    for (const ref of profileRefs) { const value = await document(ref);if (value) writes.push({ delete: prefix + "/" + ref, currentDocument: { updateTime: value.updateTime } }); }
    if (writes.length) await commit(writes);
    cleanupPassed = Object.values(await snapshot()).every(value => value === null);
  }
  for (const client of clients) {
    try { if (client.auth.currentUser && ownerUids.has(client.auth.currentUser.uid)) await deleteUser(client.auth.currentUser); }
    finally { await terminate(client.db);await deleteApp(client.app); }
  }
}
assert.equal(cleanupPassed, true);
const report = { passed: true, project, endpoint: origin, authEndpoint: authOrigin, cloudUsed: false, syntheticIdentitiesOnly: true, namespaceReset: false, checks, ownedFixtureCleanupPassed: cleanupPassed, preexistingRecordsChanged: false };
fs.mkdirSync("output/playwright/calendar-role-write-qa", { recursive: true });fs.writeFileSync("output/playwright/calendar-role-write-qa/emulator-report.json", JSON.stringify(report, null, 2) + "\n");console.log(JSON.stringify(report));
