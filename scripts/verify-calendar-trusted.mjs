// Actual loopback HTTP + Admin transactions + Auth/Firestore SDK. No cloud requests or namespace resets.
import fs from "node:fs";
import assert from "node:assert/strict";
import { initializeApp, deleteApp } from "firebase/app";
import { initializeAuth, inMemoryPersistence, connectAuthEmulator, createUserWithEmailAndPassword, signInWithEmailAndPassword, deleteUser } from "firebase/auth";
import { initializeFirestore, connectFirestoreEmulator, doc, setDoc, terminate, setLogLevel } from "firebase/firestore";
import { TRUSTED_EMULATOR_CONFIG } from "../frontend/lib/calendarTrustedConfig.js";
import { calendarTestPassword } from "../frontend/lib/calendarEmulatorConfig.js";
import { adaptCalendarDocuments } from "../frontend/lib/calendarDataAdapter.js";
import { calendarWeekday } from "../frontend/lib/calendarView.js";
import { createTrustedCalendarTransport } from "../frontend/lib/calendarTrustedTransport.js";
import { createCalendarStagingSession } from "../frontend/lib/calendarStagingSession.js";
import { createCalendarReadOnly } from "../frontend/lib/calendarReadOnly.js";
import { calendarSdkTransport } from "../frontend/lib/calendarSdkTransport.js";
import { validateTrustedCalendarConfig } from "../frontend/lib/calendarTrustedConfig.js";
setLogLevel("silent");
const project = TRUSTED_EMULATOR_CONFIG.projectId, store = "http://127.0.0.1:18180", authOrigin = "http://127.0.0.1:19199", api = "http://127.0.0.1:4321";
const prefix = `projects/${project}/databases/(default)/documents`, statePath = ".tools/calendar-staging/trusted-fixture.json", output = "output/playwright/calendar-trusted-write-emulator";
const collections = ["users", "classroomSchedules", "dlExamSchedules", "calendarWriteOperations", "calendarWriteState"], clients = [], checks = [];
fs.mkdirSync(output, { recursive: true });
async function local(path, method = "GET", body) {
  const url = new URL(path, store);assert.equal(url.origin, store);
  const response = await fetch(url, { method, headers: { Authorization: "Bearer owner", "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20000) });
  if (response.status === 404) return null;
  assert.ok(response.ok, `Emulator setup/audit HTTP ${response.status}`);return response.json();
}
const list = async collection => (await local(`/v1/${prefix}/${collection}?pageSize=1000`))?.documents || [];
const commit = writes => local(`/v1/${prefix}:commit`, "POST", { writes });
const field = value => typeof value === "boolean" ? { booleanValue: value } : typeof value === "number" ? { integerValue: String(value) } : Array.isArray(value) ? { arrayValue: { values: value.map(field) } } : { stringValue: value };
const fields = value => Object.fromEntries(Object.entries(value).map(([key, value]) => [key, field(value)]));
const patch = (collection, id, value) => commit([{ update: { name: `${prefix}/${collection}/${id}`, fields: fields(value) } }]);
const revision = async () => Number((await local(`/v1/${prefix}/calendarWriteState/main`)).fields.revision.integerValue);
const size = async () => (await Promise.all(collections.map(list))).map(rows => rows.length).join(",");
async function sdk(alias, signup = false) {
  const app = initializeApp(TRUSTED_EMULATOR_CONFIG, "trusted-test-" + alias), auth = initializeAuth(app, { persistence: inMemoryPersistence });connectAuthEmulator(auth, authOrigin, { disableWarnings: true });
  const db = initializeFirestore(app, { experimentalForceLongPolling: true });connectFirestoreEmulator(db, "127.0.0.1", 18180);
  const email = `mutation-ui-${alias}@example.test`, user = (await (signup ? createUserWithEmailAndPassword : signInWithEmailAndPassword)(auth, email, calendarTestPassword)).user;
  const value = { app, auth, db, user, alias };clients.push(value);return value;
}
async function post(candidate, kind, input, overrides = {}) {
  const response = await fetch(api + "/api/calendar/" + kind, { method: "POST", headers: { "Content-Type": "application/json", ...(candidate ? { Authorization: "Bearer " + await candidate.user.getIdToken() } : {}), ...overrides }, body: JSON.stringify(input), signal: AbortSignal.timeout(30000) });
  return { status: response.status, value: await response.json() };
}
const rule = (title, date, room = "401", start = "09:00", end = "10:00") => ({ kind: "classroom", title, rooms: [room], weekday: calendarWeekday(date), validFrom: date, validTo: date, start, end, semester: "1/2570", teacher: "" });
const batch = (...rules) => ({ rules, events: [] });
async function original(id) {
  const row = (await local(`/v1/${prefix}/classroomSchedules/${id}`));
  const decode = value => "stringValue" in value ? value.stringValue : "booleanValue" in value ? value.booleanValue : "integerValue" in value ? Number(value.integerValue) : value;
  const data = Object.fromEntries(Object.entries(row.fields).map(([key, value]) => [key, decode(value)]));
  return adaptCalendarDocuments({ classroomSchedules: [{ ...data, id }] }).data.rules[0];
}
let failure, state;
try {
  if (!process.argv.includes("--cleanup")) assert.equal((await (await fetch(api + "/health")).json()).projectId, project);
  if (process.argv.includes("--cleanup")) {
    state = JSON.parse(fs.readFileSync(statePath, "utf8"));assert.equal(state.project, project);assert.notEqual(state.stage, "cleaned");
    const owned = new Set(state.uids), writes = [];
    for (const collection of collections) for (const row of await list(collection)) {
      const id = row.name.split("/").at(-1);
      if (collection === "users") assert.ok(owned.has(id));
      else if (collection === "calendarWriteState") assert.equal(id, "main");
      else assert.ok(owned.has(row.fields.createdBy?.stringValue), "Refuse cleanup of another actor");
      writes.push({ delete: row.name, currentDocument: { updateTime: row.updateTime } });
    }
    for (const alias of state.aliases) await sdk(alias);
    if (writes.length) await commit(writes);
    for (const value of clients) await deleteUser(value.user);
    assert.equal(await size(), "0,0,0,0,0");state.stage = "cleaned";fs.writeFileSync(statePath, JSON.stringify(state, null, 2));console.log(JSON.stringify({ ownedCleanupPassed: true, namespaceReset: false, cloudUsed: false }));
  } else {
    assert.equal(await size(), "0,0,0,0,0", "Refuse nonempty dedicated demo namespace");
    state = { project, stage: "preparing", aliases: [], uids: [] };fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
    await patch("calendarWriteState", "main", { revision: 0 });
    const profiles = {};
    for (const [alias, role, capability, active] of [["admin", "admin", true, true], ["staff", "staff", false, true], ["superadmin", "superadmin", true, true], ["no-cap", "admin", false, true], ["inactive", "admin", true, false]]) {
      const value = await sdk(alias, true);profiles[alias] = { displayName: "Synthetic " + alias, role, active, calendarWriter: capability };await patch("users", value.user.uid, profiles[alias]);state.aliases.push(alias);state.uids.push(value.user.uid);fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
    }
    const [admin, staff, superadmin, noCap, inactive] = clients;
    const candidate = batch(rule("Trusted manual", "2027-05-17"));
    const before = await size();
    assert.equal((await post(null, "create", candidate)).status, 401);
    assert.equal((await post(admin, "create", candidate, { Authorization: "Bearer malformed" })).status, 401);
    const fake = [Buffer.from('{"alg":"none","typ":"JWT"}').toString("base64url"), Buffer.from(JSON.stringify({ aud: "another-demo", iss: "https://securetoken.google.com/another-demo", sub: admin.user.uid, iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000)+3600 })).toString("base64url"), ""].join(".");
    assert.equal((await post(admin, "create", candidate, { Authorization: "Bearer " + fake })).status, 401);
    for (const denied of [staff, noCap, inactive]) assert.equal((await post(denied, "create", candidate)).status, 403);
    assert.equal((await post(admin, "create", candidate, { Origin: "https://example.test" })).status, 403);assert.equal(await size(), before);checks.push("unauthenticated/malformed/wrong-project/Staff/no-capability/inactive/origin denied without writes");
    await assert.rejects(setDoc(doc(admin.db, "classroomSchedules", "raw-forbidden"), { isActive: true }), error => error.code === "permission-denied");checks.push("actual Web SDK direct write denied by read-only Rules");
    const created = await post(admin, "create", candidate);assert.equal(created.status, 200);assert.equal(created.value.created, 1);
    const afterCreate = await revision(), repeat = await post(admin, "create", candidate);assert.equal(repeat.value.repeated, true);assert.equal(repeat.value.created, 0);assert.equal(await revision(), afterCreate);checks.push("manual create and duplicate receipt replay");
    const pdf = await post(admin, "create", batch(rule("Trusted PDF 401", "2027-05-18", "401", "11:00", "12:00"), rule("Trusted PDF 402", "2027-05-18", "402", "11:00", "12:00")));assert.equal(pdf.value.created, 2);checks.push("PDF review output batch uses same API atomically (not PDF byte parsing)");
    const event = { kind: "dl", title: "Trusted DL evening", date: "2027-05-19", start: "17:00", end: "18:30", rooms: ["406", "407"], participants: 75, proctors: [admin.user.uid, superadmin.user.uid], examType: "student", semester: "1/2570", repeat: "none" };
    const dl = await post(superadmin, "create", { rules: [], events: [event] });assert.equal(dl.status, 200);assert.equal(dl.value.created, 1);checks.push("DL 17:00–18:30 75 people 406+407 and actual synthetic directory IDs");
    const atomicBefore = await size(), atomicRevision = await revision();
    assert.equal((await post(admin, "create", batch(rule("Atomic valid", "2027-05-21"), rule("Conflict", "2027-05-17")))).status, 400);
    assert.equal((await post(superadmin, "create", { rules: [], events: [{ ...event, title: "DL conflict" }] })).status, 400);
    assert.equal(await size(), atomicBefore);assert.equal(await revision(), atomicRevision);checks.push("room/proctor overlaps reject entire batch without partial entries");
    const concurrent = await Promise.all([post(admin, "create", batch(rule("Concurrent A", "2027-05-22"))), post(superadmin, "create", batch(rule("Concurrent B", "2027-05-22")))]);
    assert.equal(concurrent.filter(result => result.status === 200).length, 1);assert.equal(concurrent.filter(result => result.status === 400).length, 1);checks.push("concurrent HTTP writers serialize: one commit, one conflict");
    const manualId = (await list("classroomSchedules")).find(row => row.fields.subject.stringValue === "Trusted manual").name.split("/").at(-1);
    const source = await original(manualId), edit = { action: "edit", original: source, replacement: { ...source, start: "10:00", end: "11:00" } };
    const edited = await post(admin, "mutate", edit);assert.equal(edited.status, 200);assert.equal(edited.value.changed, 1);
    assert.equal((await post(admin, "mutate", { ...edit, replacement: { ...source, start: "11:00", end: "12:00" } })).status, 409);
    const editedOriginal = await original(manualId), cancel = { action: "cancel", original: editedOriginal };
    const cancelled = await post(admin, "mutate", cancel);assert.equal(cancelled.status, 200);assert.equal(cancelled.value.changed, 1);
    const finalRevision = await revision();for (const command of [edit, cancel]) { const replay = await post(admin, "mutate", command);assert.equal(replay.value.repeated, true);assert.equal(replay.value.changed, 0); }assert.equal(await revision(), finalRevision);checks.push("edit, stale denial, soft cancel and both frozen receipt replays");
    await patch("users", admin.user.uid, { ...profiles.admin, calendarWriter: false });assert.equal((await post(admin, "create", batch(rule("Revoked", "2027-05-23")))).status, 403);await patch("users", admin.user.uid, profiles.admin);checks.push("fresh revoked capability rejected server-side");
    const transport = createTrustedCalendarTransport({ getUser: () => admin.auth.currentUser, fetcher: async (...args) => { const response = await fetch(...args);if (response.ok) throw new Error("Synthetic reply lost after commit");return response; } });
    const sdkTransport = calendarSdkTransport(admin.db), reader = createCalendarReadOnly(sdkTransport);
    const session = createCalendarStagingSession(() => ({ reader, login: async () => reader.setSession(admin.user.uid), identity: () => sdkTransport.identity(admin.user.uid), create: transport.create, close: async () => {} }), { writable: true, validateConfig: validateTrustedCalendarConfig });await session.login(TRUSTED_EMULATOR_CONFIG);
    const lost = batch(rule("Trusted lost reply", "2027-05-24"));await assert.rejects(session.create(lost), error => error.code === "calendar-write-uncertain");const lostRevision = await revision();
    const directReplay = await post(admin, "create", lost);assert.equal(directReplay.value.repeated, true);assert.equal(await revision(), lostRevision);checks.push("HTTP reply lost after commit is uncertain; original receipt prevents duplicate");
    // Leave only owned synthetic fixtures for the following browser QA; cleanup is explicit/preconditioned.
    await post(admin, "create", batch({ ...rule("Trusted browser fixture", "2026-11-12", "401", "08:00", "09:00"), semester: "2/2569" }));
    state.stage = "browser-ready";fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  }
} catch (error) { failure = error; }
finally { for (const value of clients) { await terminate(value.db).catch(() => {});await deleteApp(value.app).catch(() => {}); } }
const report = { passed: !failure, project, checks, cloudUsed: false, namespaceReset: false, browserFixturesRetained: state?.stage === "browser-ready", ...(failure ? { failure: { code: failure.code || "unknown", message: failure.message } } : {}) };
fs.writeFileSync(output + (process.argv.includes("--cleanup") ? "/cleanup-report.json" : "/emulator-report.json"), JSON.stringify(report, null, 2));console.log(JSON.stringify(report));if (failure) process.exitCode = 1;
