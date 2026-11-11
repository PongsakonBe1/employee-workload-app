// Session + existing writer + actual Web SDK/Rules on loopback. Never resets a namespace or uses cloud credentials.
import fs from "node:fs";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { initializeApp, deleteApp } from "firebase/app";
import { initializeAuth, inMemoryPersistence, connectAuthEmulator, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, deleteUser } from "firebase/auth";
import { initializeFirestore, connectFirestoreEmulator, terminate, setLogLevel, disableNetwork, enableNetwork } from "firebase/firestore";
import { STAGING_PROJECT, STAGING_APP } from "../frontend/lib/calendarStagingConfig.js";
import { createCalendarStagingSession } from "../frontend/lib/calendarStagingSession.js";
import { createCalendarReadOnly } from "../frontend/lib/calendarReadOnly.js";
import { calendarSdkTransport } from "../frontend/lib/calendarSdkTransport.js";
import { createCalendarWriter } from "../frontend/lib/calendarWriter.js";
import { prepareCalendarCreate } from "../frontend/lib/calendarCreatePlan.js";
import { calendarRoleWriteTransport } from "../frontend/lib/calendarRoleWriteSdk.js";
import { calendarTestPassword } from "../frontend/lib/calendarEmulatorConfig.js";
import { calendarWeekday } from "../frontend/lib/calendarView.js";
import { planClassroomImport } from "../frontend/lib/classroomImport.js";
import { planDlImport } from "../frontend/lib/dlImageImport.js";
setLogLevel("silent");
const project = STAGING_PROJECT, origin = "http://127.0.0.1:18080", authOrigin = "http://127.0.0.1:19099";
const prefix = `projects/${project}/databases/(default)/documents`, run = "entry-" + randomUUID().replaceAll("-", "");
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
  value.factory = (_approved, options) => {
    assert.equal(options.roleQa, false);assert.equal(options.roleWriteQa, false);
    return {
      reader,
      async login() { if (!auth.currentUser) await signInWithEmailAndPassword(auth, value.email, calendarTestPassword);reader.setSession(auth.currentUser.uid); },
      identity: () => transport.identity(auth.currentUser?.uid),
      async close() { reader.clear();await signOut(auth); },
      ...(options.writer ? { async create(input) {
        const result = await writer(input);
        if (value.loseReply) { value.loseReply = false;throw Object.assign(new Error("Synthetic lost reply after commit"), { code: "unavailable" }); }
        return result;
      } } : {})
    };
  };
  value.reader = reader;value.transport = transport;value.session = createCalendarStagingSession(value.factory, { writable: true });await value.session.login(config);
  return value;
}
try {
  for (const collection of collections) assert.equal((await list(collection)).length, 0, "Refuse to modify a nonempty loopback QA namespace");
  await local(`/emulator/v1/projects/${project}:securityRules`, "PUT", { rules: { files: [{ name: "firestore.rules", content: fs.readFileSync("firebase/calendar-writer/firestore.rules", "utf8") }] } });
  await commit([{ update: { name: prefix + "/calendarWriteState/main", fields: fields({ revision: 0 }) }, currentDocument: { exists: false } }]);ownsNamespace = true;
  const superadmin = await fixtureClient("super", "superadmin", true), admin = await fixtureClient("admin", "admin", true), staff = await fixtureClient("staff", "staff", false), noCapability = await fixtureClient("admin-read", "admin", false);
  const session = superadmin.session, empty = { rules: [], events: [] }, people = (await session.read("2027-05-17", "2027-05-23")).people;
  const manual = batch(rule("QA-ENTRY-MANUAL", "2027-05-17"));
  assert.equal((await session.create(manual)).created, 1);
  const readBack = await session.read("2027-05-17", "2027-05-23");assert.equal(readBack.data.rules.length, 1);assert.equal(session.getState().writeOutcome.readBack, "verified");
  assert.equal((await session.create(manual)).created, 0);checks.push("session manual create/read-back and receipt replay");
  const terms = { higher: { start: "2027-05-18", end: "2027-05-18" }, vocational: { start: "2027-05-18", end: "2027-05-18" } };
  const pdf = planClassroomImport(["401", "402"].map((room, index) => ({ id: "pdf-" + index, title: "QA-ENTRY-PDF-" + room, room, weekday: 1, start: "11:00", end: "12:00", group: "higher", selected: true })), terms, "1/2570", empty);
  assert.equal(pdf.issues.length, 0);assert.equal((await session.create({ rules: pdf.rules, events: [] })).created, 2);checks.push("reviewed PDF planner output reaches session writer atomically");
  const dl = planDlImport(["2027-05-19", "2027-05-20"].map((date, index) => ({ id: "dl-" + index, selected: true, date, start: "17:00", end: "18:30", proctorKeys: [], manualProctors: [superadmin.uid, staff.uid] })), { people, participants: 75, semester: "1/2570" }, empty);
  assert.equal(dl.issues.length, 0);assert.equal((await session.create({ rules: [], events: dl.events.map(row => ({ ...row, examType: "student" })) })).created, 2);
  const exams = (await session.read("2027-05-17", "2027-05-23")).data.events;assert.equal(exams.length, 2);assert.ok(exams.every(row => row.start === "17:00" && row.rooms.join() === "406,407" && row.proctors.includes(staff.uid)));checks.push("reviewed DL planner: two evening rounds, 75 each, 406+407 and directory IDs");
  const beforeAtomic = await gateRevision(), countBefore = (await list("classroomSchedules")).length;
  await assert.rejects(session.create(batch(rule("QA-ENTRY-ATOMIC-GOOD", "2027-05-21"), rule("QA-ENTRY-ATOMIC-CONFLICT", "2027-05-17", "401", "09:30", "10:30"))), /ชน/);
  assert.equal(await gateRevision(), beforeAtomic);assert.equal((await list("classroomSchedules")).length, countBefore);checks.push("one conflicting row prevents the entire import and gate advance");
  const baseline = { subject: "QA-ENTRY-PROCTOR-BASELINE", date: "2027-05-22", startTime: "17:00", endTime: "18:30", timeSlot: "17:00-18:30", semester: "1/2570", locations: ["ห้อง 407"], proctors: [staff.uid], studentCount: 20, examType: "student", notes: "Synthetic legacy room assignment for proctor-only collision", isActive: true, createdBy: superadmin.uid };
  await commit([{ update: { name: prefix + "/dlExamSchedules/entry-owned-baseline", fields: fields(baseline) }, currentDocument: { exists: false } }]);
  await assert.rejects(session.create({ rules: [], events: [{ title: "QA-ENTRY-PROCTOR-COLLISION", kind: "dl", date: "2027-05-22", start: "17:00", end: "18:30", rooms: ["406"], participants: 20, proctors: [staff.uid], examType: "student", semester: "1/2570" }] }), /ผู้คุมชน/);checks.push("proctor collision denied even when rooms do not overlap");
  const concurrent = await Promise.allSettled([session.create(batch(rule("QA-ENTRY-CONCURRENT-A", "2027-05-23", "402", "09:00", "11:00"))), admin.session.create(batch(rule("QA-ENTRY-CONCURRENT-B", "2027-05-23", "402", "10:00", "12:00")))]);
  assert.equal(concurrent.filter(row => row.status === "fulfilled").length, 1);assert.equal(concurrent.filter(row => row.status === "rejected").length, 1);checks.push("two session controllers serialize conflicting concurrent writes");
  const same = batch(rule("QA-ENTRY-CONCURRENT-SAME", "2027-05-24"));
  const identical = await Promise.all([session.create(same), admin.session.create(same)]);assert.equal(identical.reduce((sum, row) => sum + row.created, 0), 1);checks.push("identical concurrent batch creates one schedule across two sessions");
  const deniedPlan = await prepareCalendarCreate(batch(rule("QA-ENTRY-DENIED", "2027-05-25")), people), deniedRevision = await gateRevision();
  for (const candidate of [staff, noCapability]) {
    assert.equal(candidate.session.getState().canCreate, false);await assert.rejects(candidate.session.create(batch(rule("Denied", "2027-05-25"))), error => error.code === "permission-denied");
    await assert.rejects(calendarRoleWriteTransport(candidate.db, () => candidate.auth.currentUser.uid).rawCommit(deniedPlan, deniedRevision, candidate.uid), error => error.code === "permission-denied");
  }
  assert.equal(await gateRevision(), deniedRevision);checks.push("Staff and Admin without capability denied by session and actual Rules raw batch");
  const beforeOffline = await gateRevision();await disableNetwork(superadmin.db);
  await assert.rejects(session.create(batch(rule("QA-ENTRY-OFFLINE", "2027-05-28"))), error => error.code === "calendar-write-preflight");
  await enableNetwork(superadmin.db);assert.equal(await gateRevision(), beforeOffline);checks.push("actual SDK offline preflight fails without queuing a write or advancing the gate");
  superadmin.loseReply = true;const lost = batch(rule("QA-ENTRY-LOST-REPLY", "2027-05-26"));
  await assert.rejects(session.create(lost), error => error.code === "calendar-write-uncertain");const revisionAfterLost = await gateRevision();
  const retry = await session.retryCreate();assert.equal(retry.created, 0);assert.equal(retry.repeated, true);assert.equal(await gateRevision(), revisionAfterLost);checks.push("lost response after actual commit retries frozen input without another write");
  const originalClassrooms = superadmin.transport.classrooms;superadmin.transport.classrooms = async () => { throw Object.assign(new Error("Synthetic read-back failure"), { code: "unavailable" }); };
  await assert.rejects(session.read("2027-05-26", "2027-05-26"));assert.equal(session.getState().writeOutcome.status, "committed");assert.equal(session.getState().writeOutcome.readBack, "failed");
  superadmin.transport.classrooms = originalClassrooms;await session.read("2027-05-26", "2027-05-26");assert.equal(session.getState().writeOutcome.readBack, "verified");checks.push("read-back failure does not erase confirmed commit; refresh recovers");
  const profile = await local(`/v1/${prefix}/users/${superadmin.uid}`);
  await commit([{ update: { name: profile.name, fields: fields({ calendarWriter: false }) }, updateMask: { fieldPaths: ["calendarWriter"] }, currentDocument: { updateTime: profile.updateTime } }]);
  await assert.rejects(session.create(batch(rule("QA-ENTRY-REVOKED", "2027-05-27"))), error => error.code === "permission-denied");assert.equal(session.getState().canCreate, false);checks.push("fresh profile preflight blocks a capability revoked after login");
  await session.logout();assert.equal(session.stats(), null);assert.equal(session.getState().writeOutcome, null);checks.push("logout clears writer state and read cache");
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
  for (const value of clients) {
    try { if (value.uid) { if (!value.auth.currentUser) await signInWithEmailAndPassword(value.auth, value.email, calendarTestPassword);assert.equal(value.auth.currentUser.uid, value.uid);await deleteUser(value.auth.currentUser); } }
    finally { await terminate(value.db);await deleteApp(value.app); }
  }
}
assert.equal(cleanupPassed, true);
const report = { passed: !failure, project, firestoreEndpoint: origin, authEndpoint: authOrigin, checks, ...(failure ? { failure: { code: failure.code || "unknown", message: failure.message } } : {}), cloudUsed: false, namespaceReset: false, ownedFixtureCleanupPassed: cleanupPassed, sourceRulesChanged: false, note: "Synthetic Emulator Auth; actual Google session is a separate browser check. PDF/OCR byte parsing is covered separately." };
fs.mkdirSync("output/playwright/calendar-staging-entry-write", { recursive: true });fs.writeFileSync("output/playwright/calendar-staging-entry-write/emulator-report.json", JSON.stringify(report, null, 2) + "\n");console.log(JSON.stringify(report));
if (failure) throw failure;
