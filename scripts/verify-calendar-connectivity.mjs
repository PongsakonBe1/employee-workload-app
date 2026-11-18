// Dedicated demo Emulator only. Own synthetic setup/cleanup; no cloud, namespace reset or credentials.
import assert from "node:assert/strict";
import fs from "node:fs";
import { initializeApp, deleteApp } from "firebase/app";
import { initializeAuth, inMemoryPersistence, connectAuthEmulator, createUserWithEmailAndPassword, signInWithEmailAndPassword, deleteUser } from "firebase/auth";
import { TRUSTED_EMULATOR_CONFIG } from "../frontend/lib/calendarTrustedConfig.js";
import { calendarTestPassword } from "../frontend/lib/calendarEmulatorConfig.js";
import { createCalendarConnectivityTransport } from "../frontend/lib/calendarConnectivity.js";
const project = "demo-calendar-trusted", store = "http://127.0.0.1:18180", api = "http://127.0.0.1:4321";
assert.equal(TRUSTED_EMULATOR_CONFIG.projectId, project);
const prefix = `projects/${project}/databases/(default)/documents`, statePath = ".tools/calendar-staging/connectivity-fixture.json", output = "output/playwright/calendar-staging-connectivity";
fs.mkdirSync(output, { recursive: true });
const clients = [], checks = [], collections = ["users", "calendarWriteState", "classroomSchedules", "dlExamSchedules", "calendarWriteOperations"];
async function local(path, method = "GET", value) {
  const url = new URL(path, store);assert.equal(url.origin, store);
  const response = await fetch(url, { method, headers: { Authorization: "Bearer owner", "Content-Type": "application/json" }, ...(value ? { body: JSON.stringify(value) } : {}), signal: AbortSignal.timeout(15000) });
  if (response.status === 404) return null;assert.ok(response.ok, `Emulator setup/audit ${response.status}`);return response.json();
}
const snapshot = async () => JSON.stringify(await Promise.all(collections.map(async name => [name, (await local(`/v1/${prefix}/${name}?pageSize=1000`))?.documents || []])));
const fields = value => Object.fromEntries(Object.entries(value).map(([key, v]) => [key, typeof v === "boolean" ? { booleanValue: v } : typeof v === "number" ? { integerValue: String(v) } : { stringValue: v }]));
const patch = (path, value) => local(`/v1/${prefix}/${path}`, "PATCH", { fields: fields(value) });
async function client(alias, create = false) {
  const app = initializeApp(TRUSTED_EMULATOR_CONFIG, "connectivity-" + alias), auth = initializeAuth(app, { persistence: inMemoryPersistence });connectAuthEmulator(auth, "http://127.0.0.1:19199", { disableWarnings: true });
  const user = (await (create ? createUserWithEmailAndPassword : signInWithEmailAndPassword)(auth, `mutation-ui-${alias}@example.test`, calendarTestPassword)).user;
  const value = { app, auth, user, alias };clients.push(value);return value;
}
const post = async (actor, route = "connectivity") => {
  const response = await fetch(`${api}/api/calendar/${route}`, { method: "POST", headers: { "Content-Type": "application/json", ...(actor ? { Authorization: "Bearer " + await actor.user.getIdToken() } : {}) }, body: "{}", signal: AbortSignal.timeout(20000) });return { status: response.status, value: await response.json() };
};
let state;
try {
  const health = await (await fetch(api + "/health")).json();assert.equal(health.projectId, project);assert.equal(health.writesEnabled, false);assert.equal(health.connectivityEnabled, true);
  if (process.argv.includes("--cleanup")) {
    state = JSON.parse(fs.readFileSync(statePath, "utf8"));assert.equal(state.project, project);assert.equal(state.stage, "ready");
    const expected = new Set(state.accounts.map(row => `${prefix}/users/${row.uid}`).concat(`${prefix}/calendarWriteState/main`));
    const rows = JSON.parse(await snapshot()).flatMap(([, docs]) => docs);assert.equal(rows.length, expected.size);for (const row of rows) assert.ok(expected.has(row.name), "Refuse unrelated Emulator data");
    for (const row of state.accounts) await client(row.alias);
    const writes = rows.map(row => ({ delete: row.name, currentDocument: { updateTime: row.updateTime } }));await local(`/v1/${prefix}:commit`, "POST", { writes });
    for (const value of clients) await deleteUser(value.user);state.stage = "cleaned";fs.writeFileSync(statePath, JSON.stringify(state, null, 2));console.log("PASS owned Emulator cleanup; no namespace reset");
  } else {
    const empty = JSON.parse(await snapshot());assert.ok(empty.every(([, docs]) => docs.length === 0), "Refuse nonempty demo namespace");
    state = { project, stage: "preparing", accounts: [] };fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
    await patch("calendarWriteState/main", { revision: 0 });
    const actors = {};
    for (const alias of ["admin", "superadmin", "staff"]) {
      const current = await client(alias, true);actors[alias] = current;state.accounts.push({ alias, uid: current.user.uid });fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
      await patch("users/" + current.user.uid, { displayName: "Synthetic " + alias, role: alias, active: true, calendarWriter: alias !== "staff" });
    }
    const before = await snapshot();
    for (const alias of ["admin", "superadmin"]) {
      assert.equal((await post(actors[alias])).status, 200);
      const transport = createCalendarConnectivityTransport({ origin: api, getUser: () => actors[alias].auth.currentUser });assert.deepEqual(await transport(), { verified: true });
    }checks.push("Admin/Superadmin verified through HTTP and real Auth/Firestore Emulator SDKs");
    assert.equal((await post(actors.staff)).status, 403);assert.equal((await post(null)).status, 401);checks.push("Staff/missing token denied");
    for (const route of ["create", "mutate"]) assert.equal((await post(actors.admin, route)).status, 503);checks.push("Both write routes remain disabled");
    assert.equal(await snapshot(), before);checks.push("All five collections unchanged by every probe/write-denial attempt");
    const admin = actors.admin, ownProfile = { displayName: "Synthetic admin", role: "admin", active: true, calendarWriter: false };await patch("users/" + admin.user.uid, ownProfile);
    assert.equal((await post(admin)).status, 403);await patch("users/" + admin.user.uid, { ...ownProfile, calendarWriter: true });checks.push("Capability revocation observed on next request");
    await patch("calendarWriteState/main", { revision: -1 });assert.equal((await post(admin)).status, 503);await patch("calendarWriteState/main", { revision: 0 });checks.push("Invalid gate fails closed without writes");
    state.stage = "ready";fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
    const report = { passed: true, checks, cloudUsed: false, credentialFilesRead: false, probeWrites: 0, fixtureSetup: "synthetic Emulator accounts/profiles/gate only", browserFixturesReady: true };fs.writeFileSync(output + "/emulator-report.json", JSON.stringify(report, null, 2));console.log(JSON.stringify(report));
  }
} finally { for (const value of clients) await deleteApp(value.app); }
