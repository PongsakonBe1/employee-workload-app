// Session + existing writer + actual Web SDK/Rules on loopback. Never resets a namespace or uses cloud credentials.
import fs from "node:fs";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { initializeApp, deleteApp } from "firebase/app";
import { initializeAuth, inMemoryPersistence, connectAuthEmulator, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, deleteUser } from "firebase/auth";
import { initializeFirestore, connectFirestoreEmulator, terminate, setLogLevel } from "firebase/firestore";
import { STAGING_PROJECT, STAGING_APP } from "../frontend/lib/calendarStagingConfig.js";
import { createCalendarStagingSession } from "../frontend/lib/calendarStagingSession.js";
import { createCalendarReadOnly } from "../frontend/lib/calendarReadOnly.js";
import { calendarSdkTransport } from "../frontend/lib/calendarSdkTransport.js";
import { createCalendarWriter } from "../frontend/lib/calendarWriter.js";
import { calendarTestPassword } from "../frontend/lib/calendarEmulatorConfig.js";
import { calendarWeekday } from "../frontend/lib/calendarView.js";
import { createCalendarMutationWriter } from "../frontend/lib/calendarMutationWriter.js";
setLogLevel("silent");
const project = STAGING_PROJECT, origin = "http://127.0.0.1:18080", authOrigin = "http://127.0.0.1:19099";
const prefix = `projects/${project}/databases/(default)/documents`, run = "mutation-" + randomUUID().replaceAll("-", "");
const config = { projectId: project, appId: STAGING_APP, apiKey: "demo-entry-write-placeholder", authDomain: project + ".firebaseapp.com" };
const clients = [], collections = ["users", "classroomSchedules", "dlExamSchedules", "calendarWriteState", "calendarWriteOperations"];
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
  const value = { app, auth, db, alias, email: "mutation-ui-" + alias + "@example.test" };clients.push(value);
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

const statePath = ".tools/calendar-staging/edit-cancel-ui-fixture.json", action = process.argv[2];
assert.ok(["prepare", "audit", "cleanup"].includes(action), "Use prepare/audit/cleanup");
fs.mkdirSync(".tools/calendar-staging", { recursive: true });
let state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, "utf8")) : null;
const save = () => fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
const rules = file => local(`/emulator/v1/projects/${project}:securityRules`, "PUT", { rules: { files: [{ name: "firestore.rules", content: fs.readFileSync(file, "utf8") }] } });
try {
  if (action === "prepare") {
    assert.ok(!state || state.stage === "cleaned", "Previous fixture still owned; inspect before preparing again");
    for (const collection of collections) assert.equal((await list(collection)).length, 0, "Refuse a nonempty loopback namespace");
    state = { project, stage: "preparing", uids: [], preparedAt: new Date().toISOString() };save();
    await rules("firebase/calendar-mutations/firestore.rules");
    await commit([{ update: { name: prefix + "/calendarWriteState/main", fields: fields({ revision: 0 }) }, currentDocument: { exists: false } }]);
    for (const [alias, role, capability] of [["admin", "admin", true], ["staff", "staff", false], ["superadmin", "superadmin", true]]) {
      const value = await fixtureClient(alias, role, capability);state.uids.push({ alias, uid: value.uid });save();
    }
    const admin = clients.find(row => row.alias === "admin"), staff = clients.find(row => row.alias === "staff");
    await admin.session.create(batch({ ...rule("QA-UI-WEEKLY", "2026-11-11"), validFrom: "2026-11-09", validTo: "2026-12-02" }, { ...rule("QA-UI-BLOCK", "2026-11-11", "402"), validFrom: "2026-11-09", validTo: "2026-12-02" }));
    await admin.session.create({ rules: [], events: [{ title: "QA-UI-DL", kind: "dl", date: "2026-11-12", start: "17:00", end: "18:30", rooms: ["406", "407"], participants: 75, proctors: [admin.uid, staff.uid], semester: "2/2569", examType: "student" }] });
    state.stage = "prepared";save();console.log("Prepared owned synthetic UI fixtures: 2 weekly rules / 1 evening DL; cloud untouched");
  } else {
    assert.equal(state?.project, project);assert.ok(["prepared", "preparing"].includes(state.stage));
    const owned = new Set(state.uids.map(row => row.uid)), rows = (await Promise.all(collections.map(async collection => (await list(collection)).map(row => ({ collection, row }))))).flat();
    for (const { collection, row } of rows) {
      const id = row.name.split("/").at(-1);
      if (collection === "users") assert.ok(owned.has(id));else if (collection === "calendarWriteState") assert.equal(id, "main");else assert.ok(owned.has(row.fields.createdBy?.stringValue), "Unowned record: do not modify");
    }
    const report = { loopback: true, cloudUsed: false, revision: await gateRevision(), schedules: rows.filter(({ collection }) => ["classroomSchedules", "dlExamSchedules"].includes(collection)).map(({ collection, row }) => ({ collection, id: row.name.split("/").at(-1), title: row.fields.subject.stringValue, active: row.fields.isActive.booleanValue, version: Number(row.fields.mutationVersion?.integerValue || 0), start: row.fields.startTime.stringValue, end: row.fields.endTime.stringValue })), receipts: rows.filter(({ collection }) => collection === "calendarWriteOperations").map(({ row }) => ({ id: row.name.split("/").at(-1), action: row.fields.action?.stringValue || "create", count: Number(row.fields.count.integerValue) })) };
    fs.mkdirSync("output/playwright/calendar-staging-edit-cancel", { recursive: true });fs.writeFileSync("output/playwright/calendar-staging-edit-cancel/ui-emulator-audit.json", JSON.stringify(report, null, 2));console.log(JSON.stringify(report));
    if (action === "cleanup") {
      if (rows.length) await commit(rows.map(({ row }) => ({ delete: row.name, currentDocument: { updateTime: row.updateTime } })));
      assert.ok((await Promise.all(collections.map(list))).every(rows => rows.length === 0));
      for (const account of state.uids) {
        const app = initializeApp(config, "cleanup-" + account.alias + randomUUID()), auth = initializeAuth(app, { persistence: inMemoryPersistence });connectAuthEmulator(auth, authOrigin, { disableWarnings: true });
        try { const credential = await signInWithEmailAndPassword(auth, "mutation-ui-" + account.alias + "@example.test", calendarTestPassword);assert.equal(credential.user.uid, account.uid);await deleteUser(credential.user); } finally { await deleteApp(app); }
      }
      await rules("firebase/calendar-writer/firestore.rules");state.stage = "cleaned";save();console.log("Cleaned only owned UI fixtures/accounts and restored append-only Emulator Rules");
    }
  }
} finally { for (const value of clients) { await value.session.logout();await terminate(value.db);await deleteApp(value.app); } }
