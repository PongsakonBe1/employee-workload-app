// Session + existing writer + actual Web SDK/Rules on loopback. Never resets a namespace or uses cloud credentials.
import fs from "node:fs";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { initializeApp, deleteApp } from "firebase/app";
import { initializeAuth, inMemoryPersistence, connectAuthEmulator, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, deleteUser } from "firebase/auth";
import { initializeFirestore, connectFirestoreEmulator, terminate, setLogLevel, doc, writeBatch, serverTimestamp, updateDoc, deleteDoc } from "firebase/firestore";
import { STAGING_PROJECT, STAGING_APP } from "../frontend/lib/calendarStagingConfig.js";
import { createCalendarStagingSession } from "../frontend/lib/calendarStagingSession.js";
import { createCalendarReadOnly } from "../frontend/lib/calendarReadOnly.js";
import { calendarSdkTransport } from "../frontend/lib/calendarSdkTransport.js";
import { createCalendarWriter } from "../frontend/lib/calendarWriter.js";
import { calendarTestPassword } from "../frontend/lib/calendarEmulatorConfig.js";
import { calendarWeekday } from "../frontend/lib/calendarView.js";
import { createCalendarMutationWriter } from "../frontend/lib/calendarMutationWriter.js";
import { prepareMutationCloudPlan, renderMutationQaRules, captureMutationQaBaseline, auditMutationQaProgress, qaTextHash, qaValueHash, assertMutationQaRollbackAllowed, APPEND_ONLY_SOURCE_SHA } from "./calendar-mutation-cloud-plan.mjs";
setLogLevel("silent");
const project = STAGING_PROJECT, origin = "http://127.0.0.1:18180", authOrigin = "http://127.0.0.1:19199";
const prefix = `projects/${project}/databases/(default)/documents`, run = "mutation-" + randomUUID().replaceAll("-", "");
const config = { projectId: project, appId: STAGING_APP, apiKey: "demo-entry-write-placeholder", authDomain: project + ".firebaseapp.com" };
const clients = [], checks = [], collections = ["users", "classroomSchedules", "dlExamSchedules", "calendarWriteState", "calendarWriteOperations"];
let ownsNamespace = false, cleanupPassed = false, failure = null;
const field = value => typeof value === "boolean" ? { booleanValue: value } : typeof value === "number" ? { integerValue: String(value) } : Array.isArray(value) ? { arrayValue: { values: value.map(field) } } : { stringValue: value };
const fields = value => Object.fromEntries(Object.entries(value).map(([key, value]) => [key, field(value)]));
async function local(path, method = "GET", body) {
  const url = new URL(path, origin);assert.equal(url.origin, origin);assert.equal(url.hostname, "127.0.0.1");
  const response = await fetch(url, { method, headers: { Authorization: "Bearer owner", "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000) });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Loopback request failed (${response.status})`);
  return response.json();
}
const commit = writes => local(`/v1/${prefix}:commit`, "POST", { writes });
const list = async collection => (await local(`/v1/${prefix}/${collection}?pageSize=1000`))?.documents || [];
const gateRevision = async () => Number((await local(`/v1/${prefix}/calendarWriteState/main`)).fields.revision.integerValue);
const rule = (title, date, room = "401", start = "09:00", end = "10:00") => ({ title, kind: "classroom", rooms: [room], weekday: calendarWeekday(date), validFrom: date, validTo: date, start, end, semester: "1/2570", teacher: "" });
const batch = (...rules) => ({ rules, events: [] });
async function fixtureClient(alias, role, capability) {
  const app = initializeApp(config, run + alias), auth = initializeAuth(app, { persistence: inMemoryPersistence });
  connectAuthEmulator(auth, authOrigin, { disableWarnings: true });
  const db = initializeFirestore(app, { experimentalForceLongPolling: true });connectFirestoreEmulator(db, "127.0.0.1", 18180);
  const value = { app, auth, db, alias, email: run + alias + "@example.test" };clients.push(value);
  value.uid = (await createUserWithEmailAndPassword(auth, value.email, calendarTestPassword)).user.uid;
  await commit([{ update: { name: prefix + "/users/" + value.uid, fields: fields({ displayName: "Synthetic " + alias, role, active: true, calendarWriter: capability }) }, currentDocument: { exists: false } }]);
  const transport = calendarSdkTransport(db), reader = createCalendarReadOnly(transport);
  const writer = createCalendarWriter(db, () => auth.currentUser?.uid || null, () => reader.refresh());
  const mutate = createCalendarMutationWriter(db, () => auth.currentUser?.uid || null, () => reader.refresh());
  value.factory = (_approved, options) => {
    assert.equal(options.roleQa, false);assert.equal(options.roleWriteQa, false);
    return {
      reader,
      async login() { if (!auth.currentUser) await signInWithEmailAndPassword(auth, value.email, calendarTestPassword);reader.setSession(auth.currentUser.uid); },
      identity: () => transport.identity(auth.currentUser?.uid),
      async close() { reader.clear();await signOut(auth); },
      ...(options.mutations ? { async mutate(input) { const result = await mutate(input);if (value.loseReply) { value.loseReply = false;throw Object.assign(new Error("Synthetic lost reply"), { code: "unavailable" }); }return result; } } : {}),
      ...(options.writer ? { async create(input) {
        const result = await writer(input);
        if (value.loseReply) { value.loseReply = false;throw Object.assign(new Error("Synthetic lost reply after commit"), { code: "unavailable" }); }
        return result;
      } } : {})
    };
  };
  value.reader = reader;value.transport = transport;value.session = createCalendarStagingSession(value.factory, { writable: true, mutable: true });await value.session.login(config);
  return value;
}
const manifestText = fs.readFileSync("docs/development/calendar-staging-mutation-cloud-qa/staging-manifest.json", "utf8");
const sourceText = fs.readFileSync("firebase/calendar-mutations/firestore.rules", "utf8");
const setRules = content => local(`/emulator/v1/projects/${project}:securityRules`, "PUT", { rules: { files: [{ name: "firestore.rules", content }] } });
const decode = value => value.stringValue ?? value.timestampValue ?? (value.integerValue !== undefined ? Number(value.integerValue) : value.booleanValue !== undefined ? value.booleanValue : value.arrayValue ? (value.arrayValue.values || []).map(decode) : null);
const timestamp = [{ fieldPath: "createdAt", setToServerValue: "REQUEST_TIME" }];
let plan, baseline, finalQaAudit, candidateHash, originalRulesRestored = false;
async function deadline(promise, label) {
  let timer;
  try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("SDK deadline: " + label)), 15000); })]); }
  finally { clearTimeout(timer); }
}
async function observe(superadmin, staff) {
  const rows = (await Promise.all(collections.filter(name => name !== "users").map(list))).flat();
  const documents = Object.fromEntries(rows.map(row => [row.name.slice(prefix.length + 1), Object.fromEntries(Object.entries(row.fields).map(([key, value]) => [key, decode(value)]))]));
  const profileDigests = {};
  for (const [alias, client] of [["staff", staff], ["superadmin", superadmin]]) profileDigests[alias] = qaValueHash((await local(`/v1/${prefix}/users/${client.uid}`)).fields);
  return { documents, profileDigests };
}
async function rawMutation(candidate, operation, { value = {}, receipt = {}, omitTarget = false, extraCreate = false, operationId = operation.operationId, schemaVersion = 2 } = {}) {
  console.log("Checking raw denial: " + candidate.alias + " / " + operation.id);
  const tx = writeBatch(candidate.db), revision = await gateRevision();
  if (!omitTarget) tx.update(doc(candidate.db, operation.target.collection, operation.target.id), { ...operation.value, mutationVersion: operation.expectedVersion + 1, lastOperationId: operationId, updatedBy: candidate.uid, updatedAt: serverTimestamp(), ...value });
  tx.set(doc(candidate.db, "calendarWriteOperations", operationId), schemaVersion === 1 ? { count: 1, skipped: 0, createdBy: candidate.uid, createdAt: serverTimestamp(), schemaVersion: 1 } : { action: operation.action, targetCollection: operation.target.collection, targetId: operation.target.id, expectedVersion: operation.expectedVersion, count: 1, skipped: 0, createdBy: candidate.uid, createdAt: serverTimestamp(), schemaVersion: 2, ...receipt });
  tx.set(doc(candidate.db, "calendarWriteState", "main"), { revision: revision + 1, operationId, updatedBy: candidate.uid, updatedAt: serverTimestamp() });
  if (extraCreate) tx.set(doc(candidate.db, "classroomSchedules", "cal-" + "e".repeat(64)), { ...plan.initialRecords[0].value, subject: "Unreviewed piggyback", operationId, createdBy: candidate.uid, createdAt: serverTimestamp() });
  await assert.rejects(deadline(tx.commit(), "raw " + candidate.alias + "/" + operation.id), error => error.code === "permission-denied");assert.equal(await gateRevision(), revision);
}
try {
  for (const collection of collections) assert.equal((await list(collection)).length, 0, "Refuse a nonempty loopback namespace");
  await setRules(fs.readFileSync("firebase/calendar-writer/firestore.rules", "utf8"));
  await commit([{ update: { name: prefix + "/calendarWriteState/main", fields: fields({ revision: 0 }) }, currentDocument: { exists: false } }]);ownsNamespace = true;
  const superadmin = await fixtureClient("super", "superadmin", true), staff = await fixtureClient("staff", "staff", false), otherSuper = await fixtureClient("other-super", "superadmin", true), admin = await fixtureClient("admin", "admin", true);
  plan = await prepareMutationCloudPlan(manifestText, { staff: staff.uid, superadmin: superadmin.uid });
  const candidate = renderMutationQaRules(sourceText, plan);candidateHash = qaTextHash(candidate);
  const baselineWrites = plan.initialRecords.map(row => ({ update: { name: prefix + "/" + row.collection + "/" + row.id, fields: fields(row.value) }, updateTransforms: timestamp, currentDocument: { exists: false } }));
  for (const [operationId, count] of [[plan.initialRecords[0].value.operationId, 1], [plan.initialRecords[1].value.operationId, 2]]) baselineWrites.push({ update: { name: prefix + "/calendarWriteOperations/" + operationId, fields: fields({ count, skipped: 0, createdBy: superadmin.uid, schemaVersion: 1 }) }, updateTransforms: timestamp, currentDocument: { exists: false } });
  baselineWrites.push({ update: { name: prefix + "/classroomSchedules/cloud-qa-owned-protected", fields: fields({ ...plan.initialRecords[0].value, subject: "Protected synthetic baseline", room: "402" }) }, updateTransforms: timestamp, currentDocument: { exists: false } });
  await commit(baselineWrites);
  const initialGate = await local(`/v1/${prefix}/calendarWriteState/main`);
  await commit([{ update: { name: initialGate.name, fields: fields({ revision: 13, operationId: plan.initialRecords[1].value.operationId, updatedBy: superadmin.uid }) }, updateTransforms: [{ fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" }], currentDocument: { updateTime: initialGate.updateTime } }]);
  await setRules(candidate);checks.push("generated bounded Rules compile on actual Firestore Emulator");console.log("Bounded Rules compiled; checking denied batches");
  baseline = captureMutationQaBaseline(plan, await observe(superadmin, staff));
  for (const candidate of [staff, otherSuper, admin]) await rawMutation(candidate, plan.operations[0]);checks.push("Staff and non-allowlisted Admin/Superadmin denied by actual raw SDK, despite other writers having capability");
  await rawMutation(superadmin, plan.operations[1]);checks.push("reviewed DL operation cannot run before the manual operation advances the exact gate");
  for (const value of [{ startTime: "10:30" }, { room: "402" }, { subject: "Unreviewed title" }, { createdBy: staff.uid }, { extra: "schema pollution" }]) await rawMutation(superadmin, plan.operations[0], { value });
  await rawMutation(superadmin, plan.operations[0], { receipt: { count: 2 } });
  await rawMutation(superadmin, plan.operations[0], { operationId: "op-" + "f".repeat(64) });checks.push("exact reviewed values, fields, actor, count and operation allowlist are enforced atomically");
  await rawMutation(superadmin, plan.operations[0], { omitTarget: true });
  await rawMutation(superadmin, plan.operations[0], { omitTarget: true, schemaVersion: 1 });checks.push("orphan v2 receipts and v1 preemption of reviewed operation IDs are denied");
  await rawMutation(superadmin, plan.operations[0], { extraCreate: true });
  assert.equal(await local(`/v1/${prefix}/classroomSchedules/cal-${"e".repeat(64)}`), null);checks.push("an extra create cannot piggyback on a valid v2 mutation receipt");
  const protectedBefore = qaValueHash((await observe(superadmin, staff)).documents["classroomSchedules/cloud-qa-owned-protected"]);
  await assert.rejects(updateDoc(doc(superadmin.db, "classroomSchedules", "cloud-qa-owned-protected"), { subject: "Outside target" }), error => error.code === "permission-denied");
  await assert.rejects(deleteDoc(doc(superadmin.db, plan.initialRecords[0].collection, plan.initialRecords[0].id)), error => error.code === "permission-denied");
  await assert.rejects(updateDoc(doc(superadmin.db, "users", staff.uid), { calendarWriter: true }), error => error.code === "permission-denied");checks.push("unreviewed documents, physical delete and profile escalation remain denied");
  let previousAudit;
  for (const [index, operation] of plan.operations.entries()) {
    console.log("Checking reviewed operation: " + operation.id);
    const result = await deadline(superadmin.session.mutate(operation.input), operation.id);assert.equal(result.operationId, operation.operationId);assert.equal(result.changed, 1);
    const observation = await observe(superadmin, staff), audit = auditMutationQaProgress(plan, baseline, observation, index + 1);
    if (previousAudit) assert.deepEqual(audit.receipts.slice(0, previousAudit.receipts.length), previousAudit.receipts);
    const replay = await deadline(superadmin.session.mutate(operation.input), "replay " + operation.id);assert.equal(replay.repeated, true);assert.equal(replay.changed, 0);
    assert.deepEqual(auditMutationQaProgress(plan, baseline, await observe(superadmin, staff), index + 1), audit);previousAudit = audit;
    checks.push(operation.id + " commits exactly once; replay preserves receipts and gate");
  }
  finalQaAudit = previousAudit;assert.equal(finalQaAudit.revision, 17);assert.ok(finalQaAudit.schedules.every(row => row.version === 2 && row.active === false));
  assert.equal(qaValueHash((await observe(superadmin, staff)).documents["classroomSchedules/cloud-qa-owned-protected"]), protectedBefore);checks.push("both documents remain inactive with creation metadata, protected data and profiles unchanged");
  // This independent Emulator-only create verifies compatibility; it is not a proposed cloud operation.
  const legacyCreate = await superadmin.session.create(batch(rule("QA-BOUNDED-V1-CREATE", "2027-05-21", "402", "14:00", "15:00")));
  assert.equal(legacyCreate.created, 1);checks.push("existing v1 append-only creation remains compatible under the bounded candidate");
  assert.equal(assertMutationQaRollbackAllowed({ manifestHash: plan.manifestHash, candidateRulesHash: candidateHash, rollbackRulesHash: APPEND_ONLY_SOURCE_SHA }, candidateHash).rollbackAllowed, true);
  await setRules(fs.readFileSync("firebase/calendar-writer/firestore.rules", "utf8"));originalRulesRestored = true;
  await assert.rejects(updateDoc(doc(superadmin.db, plan.initialRecords[0].collection, plan.initialRecords[0].id), { isActive: true }), error => error.code === "permission-denied");checks.push("rollback source compiles and append-only Rules deny further schedule updates");
} catch (error) { failure = error; }
finally {
  // Stop pending SDK work before privileged cleanup; a timeout is never proof of cancellation.
  for (const value of clients) { await value.session.logout();await terminate(value.db); }
  if (ownsNamespace) {
    const owned = new Set(clients.map(value => value.uid).filter(Boolean)), writes = [];
    for (const collection of collections) for (const row of await list(collection)) {
      const id = row.name.split("/").at(-1);
      if (collection === "users") assert.ok(owned.has(id));else if (collection === "calendarWriteState") assert.equal(id, "main");else assert.ok(owned.has(row.fields.createdBy?.stringValue), "Never clean up an unowned record");
      writes.push({ delete: row.name, currentDocument: { updateTime: row.updateTime } });
    }
    if (writes.length) await commit(writes);cleanupPassed = (await Promise.all(collections.map(list))).every(rows => rows.length === 0);
    await setRules(fs.readFileSync("firebase/calendar-writer/firestore.rules", "utf8"));originalRulesRestored = true;
  }
  for (const value of clients) {
    try { if (value.uid) { if (!value.auth.currentUser) await signInWithEmailAndPassword(value.auth, value.email, calendarTestPassword);assert.equal(value.auth.currentUser.uid, value.uid);await deleteUser(value.auth.currentUser); } }
    finally { await deleteApp(value.app); }
  }
}
const report = { passed: !failure && cleanupPassed, checks, qaFinalRevision: finalQaAudit?.revision ?? null, reviewedMutationOperations: finalQaAudit?.receipts.length ?? 0, cleanupPassed, originalRulesRestored, cloudUsed: false, candidateIdentity: "Synthetic Emulator UIDs only", error: failure ? String(failure.message) : null };
fs.mkdirSync("output/playwright/calendar-staging-mutation-cloud-qa", { recursive: true });fs.writeFileSync("output/playwright/calendar-staging-mutation-cloud-qa/emulator-report.json", JSON.stringify(report, null, 2));
if (failure) throw failure;assert.equal(cleanupPassed, true);console.log("PASS bounded cloud-QA preparation on Emulator: " + checks.length + " groups; no cloud write");
