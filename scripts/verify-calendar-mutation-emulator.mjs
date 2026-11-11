// Session + existing writer + actual Web SDK/Rules on loopback. Never resets a namespace or uses cloud credentials.
import fs from "node:fs";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { initializeApp, deleteApp } from "firebase/app";
import { initializeAuth, inMemoryPersistence, connectAuthEmulator, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, deleteUser } from "firebase/auth";
import { initializeFirestore, connectFirestoreEmulator, terminate, setLogLevel, disableNetwork, enableNetwork, doc, writeBatch, serverTimestamp, updateDoc, deleteDoc } from "firebase/firestore";
import { STAGING_PROJECT, STAGING_APP } from "../frontend/lib/calendarStagingConfig.js";
import { createCalendarStagingSession } from "../frontend/lib/calendarStagingSession.js";
import { createCalendarReadOnly } from "../frontend/lib/calendarReadOnly.js";
import { calendarSdkTransport } from "../frontend/lib/calendarSdkTransport.js";
import { createCalendarWriter } from "../frontend/lib/calendarWriter.js";
import { prepareCalendarCreate } from "../frontend/lib/calendarCreatePlan.js";
import { calendarTestPassword } from "../frontend/lib/calendarEmulatorConfig.js";
import { calendarWeekday } from "../frontend/lib/calendarView.js";
import { createCalendarMutationWriter } from "../frontend/lib/calendarMutationWriter.js";
import { prepareCalendarMutation } from "../frontend/lib/calendarMutationPlan.js";
setLogLevel("silent");
const project = STAGING_PROJECT, origin = "http://127.0.0.1:18080", authOrigin = "http://127.0.0.1:19099";
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
  const db = initializeFirestore(app, { experimentalForceLongPolling: true });connectFirestoreEmulator(db, "127.0.0.1", 18080);
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
try {
  for (const collection of collections) assert.equal((await list(collection)).length, 0, "Refuse a nonempty loopback namespace");
  await local(`/emulator/v1/projects/${project}:securityRules`, "PUT", { rules: { files: [{ name: "firestore.rules", content: fs.readFileSync("firebase/calendar-mutations/firestore.rules", "utf8") }] } });
  await commit([{ update: { name: prefix + "/calendarWriteState/main", fields: fields({ revision: 0 }) }, currentDocument: { exists: false } }]);ownsNamespace = true;
  const admin = await fixtureClient("admin", "admin", true), superadmin = await fixtureClient("super", "superadmin", true), staff = await fixtureClient("staff", "staff", false), noCapability = await fixtureClient("admin-read", "admin", false);
  const session = admin.session;
  const readRules = async () => { session.refresh();return (await session.read("2027-05-01", "2027-06-30")).data.rules; };
  const originalByTitle = async title => (await readRules()).find(row => row.title === title);
  await session.create(batch({ ...rule("QA-MUTATE-SERIES", "2027-05-17"), validTo: "2027-06-14" }, rule("QA-MUTATE-BLOCK", "2027-05-17", "402", "09:00", "10:00")));
  const original = await originalByTitle("QA-MUTATE-SERIES");assert.equal(original.source.version, 0);
  const input = { action: "edit", original, replacement: { ...original, title: "QA-MUTATE-EDITED", start: "10:00", end: "11:00" } };
  const edited = await session.mutate(input);assert.equal(edited.changed, 1);
  const current = await originalByTitle("QA-MUTATE-EDITED");assert.equal(current.source.documentId, original.source.documentId);assert.equal(current.source.version, 1);assert.equal(current.validTo, "2027-06-14");
  checks.push("whole-series edit retains identity, bounds and creation metadata with version +1");
  const afterEditRevision = await gateRevision();assert.equal((await session.retryCreate().catch(() => ({ noPending: true }))).noPending, true);
  assert.equal((await session.mutate(input)).repeated, true);assert.equal(await gateRevision(), afterEditRevision);checks.push("edit receipt replay does not advance revision");
  await assert.rejects(superadmin.session.mutate({ action: "cancel", original }), error => error.code === "calendar-write-stale");
  assert.equal(await gateRevision(), afterEditRevision);checks.push("stale edit or cancel cannot overwrite another writer");
  await assert.rejects(session.mutate({ action: "edit", original: current, replacement: { ...current, rooms: ["402"], start: "09:30", end: "10:30" } }), /ชน/);
  assert.equal(await gateRevision(), afterEditRevision);checks.push("room collision aborts edit atomically");
  const dl = date => ({ kind: "dl", title: "QA-MUTATE-DL", date, start: "17:00", end: "18:30", rooms: ["406", "407"], proctors: [staff.uid, superadmin.uid], participants: 75, semester: "1/2570", examType: "student" });
  await session.create({ rules: [], events: [dl("2027-05-19")] });
  const exam = (await session.read("2027-05-01", "2027-05-31")).data.events[0];
  await session.mutate({ action: "edit", original: exam, replacement: { ...exam, date: "2027-05-20" } });
  const examRead = (await session.read("2027-05-01", "2027-05-31")).data.events[0];assert.equal(examRead.date, "2027-05-20");assert.equal(examRead.start, "17:00");assert.equal(examRead.participants, 75);assert.deepEqual(examRead.rooms, ["406", "407"]);checks.push("DL evening edit retains 75 people and actual directory IDs");
  // A synthetic historical allocation allows a proctor-only conflict with disjoint rooms.
  const legacy = { ...dl("2027-05-21"), id: undefined };
  const dlPlan = await prepareCalendarCreate({ rules: [], events: [legacy] }, (await session.read("2027-05-01", "2027-05-31")).people);
  const legacyValue = { ...dlPlan.entries[0].value, locations: ["ห้อง 401"], createdBy: admin.uid };
  await commit([{ update: { name: prefix + "/dlExamSchedules/mutation-owned-legacy", fields: fields(legacyValue) }, currentDocument: { exists: false } }]);
  await assert.rejects(session.mutate({ action: "edit", original: examRead, replacement: { ...examRead, date: "2027-05-21" } }), /ผู้คุมชน/);checks.push("proctor-only conflict is rejected across disjoint rooms");
  const base = await originalByTitle("QA-MUTATE-EDITED"), gateBeforeRace = await gateRevision();
  const race = await Promise.allSettled([session.mutate({ action: "edit", original: base, replacement: { ...base, title: "QA-RACE-A" } }), superadmin.session.mutate({ action: "edit", original: base, replacement: { ...base, title: "QA-RACE-B" } })]);
  assert.equal(race.filter(row => row.status === "fulfilled").length, 1);assert.equal(race.filter(row => row.status === "rejected" && row.reason.code === "calendar-write-stale").length, 1);assert.equal(await gateRevision(), gateBeforeRace + 1);checks.push("concurrent editors have exactly one winner and a stale loser");
  const fresh = (await readRules()).find(row => row.source.documentId === base.source.documentId);
  admin.loseReply = true;const cancelInput = { action: "cancel", original: fresh };
  await assert.rejects(session.mutate(cancelInput), error => error.code === "calendar-write-uncertain");const afterCancel = await gateRevision();
  assert.equal((await session.retryCreate()).repeated, true);assert.equal(await gateRevision(), afterCancel);
  const cancelledRecord = await local(`/v1/${prefix}/classroomSchedules/${fresh.source.documentId}`);assert.equal(cancelledRecord.fields.isActive.booleanValue, false);assert.equal(cancelledRecord.fields.createdBy.stringValue, admin.uid);assert.ok(!(await readRules()).some(row => row.source.documentId === fresh.source.documentId));checks.push("lost cancel reply retries its receipt; original document remains inactive and disappears from reads");
  const examCurrent = (await session.read("2027-05-01", "2027-05-31")).data.events.find(row => row.source.documentId === exam.source.documentId);
  await session.mutate({ action: "cancel", original: examCurrent });assert.ok(!(await session.read("2027-05-01", "2027-05-31")).data.events.some(row => row.source.documentId === exam.source.documentId));checks.push("DL cancellation also preserves its document and invalidates month cache");
  const block = await originalByTitle("QA-MUTATE-BLOCK");
  for (const candidate of [staff, noCapability]) { assert.equal(candidate.session.getState().canEdit, false);await assert.rejects(candidate.session.mutate({ action: "cancel", original: block }), error => error.code === "permission-denied");await assert.rejects(updateDoc(doc(candidate.db, "classroomSchedules", block.source.documentId), { isActive: false }), error => error.code === "permission-denied"); }
  checks.push("Staff/Admin without writer capability denied by session and actual raw SDK Rules");
  await assert.rejects(deleteDoc(doc(admin.db, "classroomSchedules", block.source.documentId)), error => error.code === "permission-denied");
  await assert.rejects(updateDoc(doc(admin.db, "users", admin.uid), { role: "superadmin" }), error => error.code === "permission-denied");checks.push("permanent delete and profile escalation remain denied");
  const people = (await session.read("2027-05-01", "2027-05-31")).people;
  async function invalidRaw(overrides, receiptOverrides = {}, includeTarget = true) {
    const plan = await prepareCalendarMutation({ action: "cancel", original: block }, people), gate = await gateRevision(), tx = writeBatch(admin.db);
    if (includeTarget) tx.update(doc(admin.db, plan.target.collection, plan.target.id), { ...plan.value, mutationVersion: 1, lastOperationId: plan.operationId, updatedBy: admin.uid, updatedAt: serverTimestamp(), ...overrides });
    tx.set(doc(admin.db, "calendarWriteOperations", plan.operationId), { action: "cancel", targetCollection: plan.target.collection, targetId: plan.target.id, expectedVersion: 0, count: 1, skipped: 0, createdBy: admin.uid, createdAt: serverTimestamp(), schemaVersion: 2, ...receiptOverrides });
    tx.update(doc(admin.db, "calendarWriteState", "main"), { revision: gate + 1, operationId: plan.operationId, updatedBy: admin.uid, updatedAt: serverTimestamp() });
    await assert.rejects(tx.commit(), error => error.code === "permission-denied");assert.equal(await gateRevision(), gate);
  }
  for (const overrides of [{ subject: "Cancellation must not edit content" }, { createdBy: staff.uid }, { createdAt: serverTimestamp() }, { mutationVersion: 2 }, { updatedBy: staff.uid }, { subject: "x".repeat(301) }, { startTime: "25:00" }, { room: "999" }, { extra: "schema pollution" }, { isActive: true }]) await invalidRaw(overrides);
  await invalidRaw({}, { expectedVersion: 1 });await invalidRaw({}, {}, false);checks.push("Rules reject cancellation content edits, ownership/timestamp hijacking, version forgery, invalid fields and orphan receipts atomically");
  const immutableRevision = await gateRevision();await disableNetwork(admin.db);
  await assert.rejects(session.mutate({ action: "cancel", original: block }), error => error.code === "calendar-write-preflight");await enableNetwork(admin.db);assert.equal(await gateRevision(), immutableRevision);checks.push("offline preflight never queues a mutation");
  const profile = await local(`/v1/${prefix}/users/${admin.uid}`);
  await commit([{ update: { name: profile.name, fields: fields({ calendarWriter: false }) }, updateMask: { fieldPaths: ["calendarWriter"] }, currentDocument: { updateTime: profile.updateTime } }]);
  await assert.rejects(session.mutate({ action: "cancel", original: block }), error => error.code === "permission-denied");assert.equal(session.getState().canEdit, false);checks.push("revoked capability is detected before mutation");
} catch (error) {
  failure = error;
} finally {
  if (ownsNamespace) {
    const owned = new Set(clients.map(value => value.uid).filter(Boolean)), writes = [];
    for (const collection of collections) for (const row of await list(collection)) {
      const id = row.name.split("/").at(-1);
      if (collection === "users") assert.ok(owned.has(id));
      else if (collection === "calendarWriteState") assert.equal(id, "main");
      else assert.ok(owned.has(row.fields.createdBy?.stringValue), "Never clean up an unowned record");
      writes.push({ delete: row.name, currentDocument: { updateTime: row.updateTime } });
    }
    if (writes.length) await commit(writes);
    cleanupPassed = (await Promise.all(collections.map(list))).every(rows => rows.length === 0);
  }
  if (ownsNamespace) await local(`/emulator/v1/projects/${project}:securityRules`, "PUT", { rules: { files: [{ name: "firestore.rules", content: fs.readFileSync("firebase/calendar-writer/firestore.rules", "utf8") }] } });
  for (const value of clients) {
    try { if (value.uid) { if (!value.auth.currentUser) await signInWithEmailAndPassword(value.auth, value.email, calendarTestPassword);assert.equal(value.auth.currentUser.uid, value.uid);await deleteUser(value.auth.currentUser); } }
    finally { await terminate(value.db);await deleteApp(value.app); }
  }
}
const report = { passed: !failure && cleanupPassed, checks, cleanupPassed, cloudUsed: false, permanentDeletesAllowed: false, originalAppendOnlyRulesRestored: ownsNamespace, error: failure ? String(failure.message) : null };
fs.mkdirSync("output/playwright/calendar-staging-edit-cancel", { recursive: true });fs.writeFileSync("output/playwright/calendar-staging-edit-cancel/emulator-report.json", JSON.stringify(report,null,2));
if (failure) throw failure;assert.equal(cleanupPassed,true);console.log("PASS mutation SDK/Rules SIT: " + checks.length + " groups; owned fixtures cleaned; cloud untouched");
