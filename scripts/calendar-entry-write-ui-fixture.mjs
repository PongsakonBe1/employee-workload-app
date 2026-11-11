// One owned browser regression fixture on an empty loopback demo namespace. No cloud or namespace reset.
import fs from "node:fs";
import assert from "node:assert/strict";
import { calendarTestPassword } from "../frontend/lib/calendarEmulatorConfig.js";
import { prepareCalendarCreate } from "../frontend/lib/calendarCreatePlan.js";
const action = process.argv[2];assert.ok(["prepare", "cleanup"].includes(action));
const project = "demo-calendar-writer", origin = "http://127.0.0.1:18080", authOrigin = "http://127.0.0.1:19099", prefix = `projects/${project}/databases/(default)/documents`;
const owner = "directory-a", stateFile = ".tools/calendar-staging/entry-write-ui-fixture.json", collections = ["users", "calendarWriteState", "calendarWriteOperations", "classroomSchedules", "dlExamSchedules"];
async function local(base, pathname, method = "GET", body) {
  assert.ok([origin, authOrigin].includes(base));const url = new URL(pathname, base);assert.equal(url.origin, base);
  const response = await fetch(url, { method, headers: { Authorization: "Bearer owner", "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000) });
  if (response.status === 404) return null;const value = await response.json();if (!response.ok) throw new Error(`Loopback fixture failed: ${value.error?.message || response.status}`);return value;
}
const list = async collection => (await local(origin, `/v1/${prefix}/${collection}?pageSize=1000`))?.documents || [];
const get = ref => local(origin, `/v1/${prefix}/${ref}`);
const commit = writes => local(origin, `/v1/${prefix}:commit`, "POST", { writes });
const fields = value => Object.fromEntries(Object.entries(value).map(([key, value]) => [key, typeof value === "boolean" ? { booleanValue: value } : typeof value === "number" ? { integerValue: String(value) } : { stringValue: value }]));
const input = { rules: [{ title: "QA-ENTRY-FILTER-SIT", kind: "classroom", teacher: "", rooms: ["402"], weekday: 0, validFrom: "2027-06-07", validTo: "2027-06-07", start: "10:00", end: "11:00", semester: "1/2570" }], events: [] }, plan = await prepareCalendarCreate(input, []);
if (action === "prepare") {
  if (fs.existsSync(stateFile)) throw new Error("Finish the existing owned UI fixture before preparing again");
  for (const collection of collections) assert.equal((await list(collection)).length, 0, "Do not seed a nonempty browser test namespace");
  await local(origin, `/emulator/v1/projects/${project}:securityRules`, "PUT", { rules: { files: [{ name: "firestore.rules", content: fs.readFileSync("firebase/calendar-writer/firestore.rules", "utf8") }] } });
  let ownedAuth = false;
  try { const result = await local(authOrigin, "/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-calendar-key", "POST", { localId: owner, email: owner + "@example.test", password: calendarTestPassword, targetProjectId: project, returnSecureToken: false });assert.equal(result.localId, owner);ownedAuth = true; }
  catch (error) { if (!error.message.includes("EMAIL_EXISTS")) throw error; }
  fs.mkdirSync(".tools/calendar-staging", { recursive: true });fs.writeFileSync(stateFile, JSON.stringify({ project, owner, ownedAuth, operationId: plan.operationId, scheduleId: plan.entries[0].id, stage: "prepared" }), { flag: "wx" });
  await commit([{ update: { name: prefix + "/users/" + owner, fields: fields({ displayName: "Emulator UI tester", role: "admin", active: true, calendarWriter: true }) }, currentDocument: { exists: false } }, { update: { name: prefix + "/calendarWriteState/main", fields: fields({ revision: 0 }) }, currentDocument: { exists: false } }]);
  console.log(JSON.stringify({ prepared: true, project, origin, newCloudWrites: 0, fixture: input.rules[0] }));
} else {
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));assert.equal(state.project, project);assert.equal(state.operationId, plan.operationId);assert.equal(state.scheduleId, plan.entries[0].id);
  const allowed = new Set([`users/${owner}`, "calendarWriteState/main", `classroomSchedules/${state.scheduleId}`, `calendarWriteOperations/${state.operationId}`]), writes = [];
  const gate = await get("calendarWriteState/main"), revision = Number(gate.fields.revision.integerValue);assert.ok([0,1].includes(revision));
  if (revision === 1) { assert.equal(gate.fields.operationId.stringValue, state.operationId);assert.equal(gate.fields.updatedBy.stringValue, owner); }
  else { assert.equal(await get(`classroomSchedules/${state.scheduleId}`), null);assert.equal(await get(`calendarWriteOperations/${state.operationId}`), null); }
  for (const collection of collections) for (const row of await list(collection)) {
    const ref = row.name.slice(prefix.length + 1);assert.ok(allowed.has(ref), "Never delete unrelated test data");
    if (["classroomSchedules", "calendarWriteOperations"].includes(collection)) assert.equal(row.fields.createdBy.stringValue, owner);
    writes.push({ delete: row.name, currentDocument: { updateTime: row.updateTime } });
  }
  assert.equal(writes.length, revision === 1 ? 4 : 2);await commit(writes);
  if (state.ownedAuth) {
    await local(authOrigin, `/identitytoolkit.googleapis.com/v1/projects/${project}/accounts:delete`, "POST", { localId: owner });
  }
  assert.ok((await Promise.all(collections.map(list))).every(rows => rows.length === 0));fs.writeFileSync(stateFile, JSON.stringify({ ...state, stage: "cleaned" }));
  const report = { cleanupPassed: true, browserRegressionExecuted: revision === 1, ...(revision === 0 ? { limitation: "Extra demo-writer browser regression could not sign in: running Auth Emulator resolves SDK API keys to its staging default project, while the owned test identity was created in the separate demo-writer project. Session SDK/Rules SIT uses the aligned project and passed separately." } : {}), project, endpoint: origin, cloudUsed: false, namespaceReset: false, ownedFixtureCleanupPassed: true, ownedAuthRemoved: state.ownedAuth, preexistingRecordsChanged: false };
  fs.writeFileSync("output/playwright/calendar-staging-entry-write/emulator-ui-cleanup.json", JSON.stringify(report, null, 2) + "\n");console.log(JSON.stringify(report));
}
