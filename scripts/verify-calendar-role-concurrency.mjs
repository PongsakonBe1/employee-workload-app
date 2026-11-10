// Append-only QA against existing loopback emulators; never reset namespaces or contact cloud.
import assert from "node:assert/strict";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { initializeApp, deleteApp } from "firebase/app";
import { initializeAuth, inMemoryPersistence, connectAuthEmulator, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, deleteUser } from "firebase/auth";
import { initializeFirestore, connectFirestoreEmulator, collection, getDocsFromServer, getDocFromServer, doc, writeBatch, serverTimestamp, updateDoc, deleteDoc, terminate, setLogLevel } from "firebase/firestore";
import { createCalendarWriter } from "../frontend/lib/calendarWriter.js";
import { calendarSdkTransport } from "../frontend/lib/calendarSdkTransport.js";
import { prepareCalendarCreate } from "../frontend/lib/calendarCreatePlan.js";
import { adaptCalendarDocuments } from "../frontend/lib/calendarDataAdapter.js";
import { addCalendarDays, calendarWeekday, expandCalendar } from "../frontend/lib/calendarView.js";
import { calendarTestPassword } from "../frontend/lib/calendarEmulatorConfig.js";
import { CALENDAR_READ_LIMIT } from "../frontend/lib/calendarReadOnly.js";

setLogLevel("silent");
const project = "demo-calendar-writer", store = "http://127.0.0.1:18080", authOrigin = "http://127.0.0.1:19099";
const out = "output/playwright/calendar-role-concurrency-qa";
fs.mkdirSync(out, { recursive: true });
const run = "qa-" + randomUUID().replaceAll("-", "").slice(0, 12), clients = [], ownedProfiles = new Map();
const report = { completed: false, project, cloudUsed: false, namespaceReset: false, preexistingProfilesChanged: false, roleMatrix: [], checks: [], deniedSdkOperations: 0, cleanup: {}, limitations: ["Emulator results do not establish cloud role/concurrency behavior", "Sanctioned writer protocol only; aggregate business invariants are not fully enforced by prototype rules", "No new 100-record stress batch; previously tested separately"] };
const fields = value => Object.fromEntries(Object.entries(value).map(([key, item]) => [key, typeof item === "boolean" ? { booleanValue: item } : { stringValue: item }]));
async function emulator(url, method = "GET", body) {
  const parsed = new URL(url);
  assert.ok([store, authOrigin].includes(parsed.origin));
  assert.ok(parsed.pathname.includes(project) || parsed.pathname.includes("identitytoolkit.googleapis.com"));
  const response = await fetch(url, { method, headers: { "Content-Type": "application/json", Authorization: "Bearer owner" }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Loopback fixture operation failed (${response.status})`);
  const text = await response.text();return text ? JSON.parse(text) : {};
}
async function actor(label, id = null, fixtureProfile = null) {
  const app = initializeApp({ projectId: project, apiKey: "demo-calendar-key", appId: "demo-calendar-role-qa" }, run + "-" + clients.length);
  const auth = initializeAuth(app, { persistence: inMemoryPersistence });connectAuthEmulator(auth, authOrigin, { disableWarnings: true });
  const db = initializeFirestore(app, { experimentalForceLongPolling: true });connectFirestoreEmulator(db, "127.0.0.1", 18080);
  const value = { label, id, app, auth, db, owned: Boolean(fixtureProfile), transport: calendarSdkTransport(db) };
  clients.push(value);
  if (fixtureProfile) {
    const credential = await createUserWithEmailAndPassword(auth, run + "-" + label + "@example.test", calendarTestPassword);
    id = value.id = credential.user.uid;
    const profile = { displayName: "QA " + label, ...fixtureProfile };
    ownedProfiles.set(id, { fields: fields(profile), run, created: false });
    await emulator(`${store}/v1/projects/${project}/databases/(default)/documents:commit`, "POST", { writes: [{ update: { name: `projects/${project}/databases/(default)/documents/users/${id}`, fields: fields(profile) }, currentDocument: { exists: false } }] });
    ownedProfiles.get(id).created = true;
  } else if (id) await signInWithEmailAndPassword(auth, id + "@example.test", calendarTestPassword);
  value.create = createCalendarWriter(db, () => auth.currentUser?.uid || null);
  return value;
}
const documents = async (db, name) => (await getDocsFromServer(collection(db, name))).docs.map(record => ({ id: record.id, ...record.data() }));
const encoded = row => JSON.stringify(row, (_key, value) => value && typeof value === "object" && !Array.isArray(value) ? Object.fromEntries(Object.keys(value).sort().map(key => [key, value[key]])) : value);
async function snapshot(db) {
  const [users, classrooms, exams] = await Promise.all([documents(db, "users"), documents(db, "classroomSchedules"), documents(db, "dlExamSchedules")]);
  return { users, classrooms, exams };
}
const revision = async db => (await getDocFromServer(doc(db, "calendarWriteState", "main"))).data().revision;
const batch = (...rules) => ({ rules, events: [] });
let startDate;
const rule = (name, offset = 0, room = "402", start = "10:00", end = "12:00") => {
  const date = addCalendarDays(startDate, offset);
  return { kind: "classroom", title: `${run} ${name}`, teacher: "Synthetic QA teacher", semester: "2/2574", rooms: [room], weekday: calendarWeekday(date), validFrom: date, validTo: date, start, end };
};
async function state(db) {
  const [value, gate] = await Promise.all([snapshot(db), revision(db)]);
  return { ...value, revision: gate };
}
async function unchanged(db, before) {
  const after = await state(db);
  assert.equal(after.revision, before.revision);
  for (const key of ["classrooms", "exams", "users"]) assert.deepEqual(after[key].map(encoded).sort(), before[key].map(encoded).sort());
}
async function check(name, work) {
  await work();report.checks.push({ name, passed: true });console.log("PASS " + name);
}
async function rawTransaction(actor, plan, gate) {
  const changes = writeBatch(actor.db), operationId = plan.operationId;
  changes.set(doc(actor.db, "calendarWriteState", "main"), { revision: gate + 1, operationId, updatedBy: actor.auth.currentUser?.uid || "anonymous", updatedAt: serverTimestamp() });
  changes.set(doc(actor.db, "calendarWriteOperations", operationId), { count: plan.entries.length, skipped: 0, createdBy: actor.auth.currentUser?.uid || "anonymous", createdAt: serverTimestamp(), schemaVersion: 1 });
  for (const entry of plan.entries) changes.set(doc(actor.db, entry.collection, entry.id), { ...entry.value, operationId, createdBy: actor.auth.currentUser?.uid || "anonymous", createdAt: serverTimestamp(), schemaVersion: 1 });
  return changes.commit();
}
async function expectDenied(action) {
  await assert.rejects(action, error => error.code === "permission-denied");report.deniedSdkOperations++;
}
async function cleanup() {
  const errors = [];
  for (const client of clients) {
    try { if (client.owned && client.auth.currentUser?.uid === client.id) await deleteUser(client.auth.currentUser); } catch { errors.push(client.label + " auth cleanup"); }
  }
  for (const [id, value] of ownedProfiles) {
    if (!value.created) continue;
    try {
      assert.equal(value.run, run);
      const url = `${store}/v1/projects/${project}/databases/(default)/documents/users/${id}`, current = await emulator(url);
      assert.deepEqual(current.fields, value.fields, "Refuse to remove a modified QA profile");
      await emulator(`${store}/v1/projects/${project}/databases/(default)/documents:commit`, "POST", { writes: [{ delete: current.name, currentDocument: { updateTime: current.updateTime } }] });
    } catch (error) { errors.push("temporary QA profile cleanup: " + error.message); }
  }
  if (observer && baseline) {
    try {
      const users = await documents(observer.db, "users");
      assert.deepEqual(users.map(encoded).sort(), baseline.users.map(encoded).sort());
      report.postCleanupProfileBaselinePreserved = true;
    } catch (error) { errors.push("profile baseline differs after cleanup: " + error.message); }
  }
  for (const client of clients) {
    try { await signOut(client.auth);await terminate(client.db);await deleteApp(client.app); } catch { errors.push(client.label + " SDK cleanup"); }
  }
  report.cleanup = { errors, temporaryProfiles: ownedProfiles.size, onlyRunOwnedProfilesRemoved: errors.length === 0 };
  assert.deepEqual(errors, []);
}
let baseline, observer;
try {
  const admin = observer = await actor("admin", "directory-a"), superadmin = await actor("superadmin", "directory-c"), otherAdmin = await actor("second-admin-session", "directory-a");
  baseline = await snapshot(admin.db);
  assert.ok(baseline.classrooms.length + 10 < CALENDAR_READ_LIMIT, "Existing synthetic data is too close to the pilot limit; do not reset or delete it");
  assert.ok(baseline.users.find(row => row.id === "directory-a")?.calendarWriter === true);
  assert.ok(baseline.users.find(row => row.id === "directory-c")?.calendarWriter === true);
  const converted = adaptCalendarDocuments({ users: await admin.transport.directory(), classroomSchedules: baseline.classrooms, dlExamSchedules: baseline.exams });
  assert.equal(converted.complete, true);
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = addCalendarDays("2032-01-05", attempt * 21);
    if (!expandCalendar(converted.data, { start: candidate, end: addCalendarDays(candidate, 14) }).length) { startDate = candidate;break; }
  }
  assert.ok(startDate, "No unused QA interval available");
  report.testRange = { start: startDate, end: addCalendarDays(startDate, 14) };
  report.baselineCounts = { users: baseline.users.length, classrooms: baseline.classrooms.length, exams: baseline.exams.length };
  const staff = await actor("staff", "directory-b"), pending = await actor("pending", "pending-user"), inactive = await actor("inactive", "inactive-user"), anonymous = await actor("anonymous");
  const adminReader = await actor("admin-without-capability", null, { role: "admin", active: true, calendarWriter: false });
  const superReader = await actor("superadmin-without-capability", null, { role: "superadmin", active: true, calendarWriter: false });
  const staffFlagged = await actor("staff-with-writer-flag", null, { role: "staff", active: true, calendarWriter: true });
  await check("read/write role matrix through real Web SDK and direct atomic requests", async () => {
    for (const item of [{ actor: admin, read: true, write: true }, { actor: superadmin, read: true, write: true }, { actor: staff, read: true }, { actor: adminReader, read: true }, { actor: superReader, read: true }, { actor: staffFlagged, read: true }, { actor: pending }, { actor: inactive }, { actor: anonymous }]) {
      if (item.read) assert.ok((await item.actor.transport.directory()).length >= 3);
      else await expectDenied(() => item.actor.transport.directory());
      if (!item.write) {
        const before = await state(admin.db), input = batch(rule("denied " + item.actor.label, 13));
        await assert.rejects(item.actor.create(input), error => ["permission-denied", "calendar-write-validation"].includes(error.code));
        const plan = await prepareCalendarCreate(input, []);
        await expectDenied(() => rawTransaction(item.actor, plan, before.revision));
        assert.equal((await getDocFromServer(doc(admin.db, "calendarWriteOperations", plan.operationId))).exists(), false);
        await unchanged(admin.db, before);
      }
      report.roleMatrix.push({ actor: item.actor.label, readAllowed: Boolean(item.read), writeAllowed: Boolean(item.write), directAtomicWriteDenied: !item.write });
    }
  });
  await check("Admin and Superadmin capability-enabled writes advance revision and persist", async () => {
    const before = await revision(admin.db);
    for (const [actor, input] of [[admin, batch(rule("admin allowed", 0))], [superadmin, batch(rule("superadmin allowed", 1))]]) {
      const result = await actor.create(input);assert.equal(result.created, 1);
      const plan = await prepareCalendarCreate(input, []);
      assert.equal((await getDocFromServer(doc(admin.db, "classroomSchedules", plan.entries[0].id))).exists(), true);
    }
    assert.equal(await revision(admin.db), before + 2);
  });
  await check("conflicting concurrent actors commit one winner with a fresh conflict for the loser", async () => {
    const before = await revision(admin.db), inputs = [batch(rule("race A", 2)), batch(rule("race B", 2, "402", "11:00", "13:00"))];
    const results = await Promise.allSettled([admin.create(inputs[0]), superadmin.create(inputs[1])]);
    assert.equal(results.filter(row => row.status === "fulfilled").length, 1);
    assert.match(results.find(row => row.status === "rejected").reason.message, /ชน/);
    assert.equal(await revision(admin.db), before + 1);
    const plans = await Promise.all(inputs.map(input => prepareCalendarCreate(input, [])));
    const found = await Promise.all(plans.map(plan => getDocFromServer(doc(admin.db, "classroomSchedules", plan.entries[0].id))));
    assert.equal(found.filter(record => record.exists()).length, 1);
    const receipts = await Promise.all(plans.map(plan => getDocFromServer(doc(admin.db, "calendarWriteOperations", plan.operationId))));
    assert.equal(receipts.filter(record => record.exists()).length, 1);
  });
  await check("independent sessions of the same Admin replay an identical concurrent batch exactly once", async () => {
    const input = batch(rule("same batch", 3)), before = await revision(admin.db);
    const results = await Promise.all([admin.create(input), otherAdmin.create(input)]);
    assert.equal(results.reduce((count, row) => count + row.created, 0), 1);
    assert.equal(results.reduce((count, row) => count + row.skipped, 0), 1);
    assert.equal(await revision(admin.db), before + 1);
    assert.equal((await superadmin.create(input)).created, 0);
    assert.equal(await revision(admin.db), before + 1);
  });
  await check("different rooms and touching time boundaries both commit without a false conflict", async () => {
    let before = await revision(admin.db);
    const rooms = await Promise.all([admin.create(batch(rule("room 401", 4, "401"))), superadmin.create(batch(rule("room 402", 4, "402")))]);
    assert.equal(rooms.reduce((count, row) => count + row.created, 0), 2);assert.equal(await revision(admin.db), before + 2);
    before = await revision(admin.db);
    const touching = await Promise.all([admin.create(batch(rule("before boundary", 5))), superadmin.create(batch(rule("after boundary", 5, "402", "12:00", "13:00")))]);
    assert.equal(touching.reduce((count, row) => count + row.created, 0), 2);assert.equal(await revision(admin.db), before + 2);
  });
  await check("mixed valid/conflicting batch leaves no partial schedule or receipt", async () => {
    const input = batch(rule("atomic good", 6), rule("atomic collision", 0, "402", "11:00", "13:00")), plan = await prepareCalendarCreate(input, []), before = await state(admin.db);
    await assert.rejects(superadmin.create(input), /ชน/);await unchanged(admin.db, before);
    for (const entry of plan.entries) assert.equal((await getDocFromServer(doc(admin.db, entry.collection, entry.id))).exists(), false);
    assert.equal((await getDocFromServer(doc(admin.db, "calendarWriteOperations", plan.operationId))).exists(), false);
  });
  await check("rules deny update/delete and self-service profile escalation for enabled writers", async () => {
    const target = (await prepareCalendarCreate(batch(rule("admin allowed", 0)), [])).entries[0], before = await state(admin.db);
    for (const item of [admin, superadmin]) {
      await expectDenied(() => updateDoc(doc(item.db, target.collection, target.id), { subject: "Forbidden QA edit" }));
      await expectDenied(() => deleteDoc(doc(item.db, target.collection, target.id)));
      await expectDenied(() => updateDoc(doc(item.db, "users", "directory-b"), { role: "superadmin", calendarWriter: true }));
    }
    await unchanged(admin.db, before);
  });
  const after = await snapshot(admin.db);
  for (const key of ["users", "classrooms", "exams"]) {
    const found = new Map(after[key].map(row => [row.id, encoded(row)]));
    for (const row of baseline[key]) assert.equal(found.get(row.id), encoded(row), "Preexisting synthetic document changed");
  }
  report.preexistingDocumentsPreserved = true;
  report.createdScheduleCount = after.classrooms.length - baseline.classrooms.length;
  assert.equal(report.createdScheduleCount, 8);
} catch (error) { report.failure = error.stack;throw error; }
finally {
  try { await cleanup();if (!report.failure) report.completed = true; }
  finally { fs.writeFileSync(out + "/sdk-report.json", JSON.stringify(report, null, 2)); }
}
console.log(`PASS role/concurrency QA: ${report.roleMatrix.length} actors, ${report.checks.length} groups, ${report.deniedSdkOperations} denied operations; no reset or cloud access`);
