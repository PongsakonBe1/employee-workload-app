// Positive/negative controls for the exact three-document batch shape. Loopback demo only.
import fs from "node:fs";
import assert from "node:assert/strict";
import { initializeApp, deleteApp } from "firebase/app";
import { initializeAuth, inMemoryPersistence, connectAuthEmulator, createUserWithEmailAndPassword, deleteUser } from "firebase/auth";
import { initializeFirestore, connectFirestoreEmulator, writeBatch, doc, getDocFromServer, serverTimestamp, increment, terminate, setLogLevel } from "firebase/firestore";
import { prepareCalendarCreate } from "../frontend/lib/calendarCreatePlan.js";
import { calendarSdkTransport } from "../frontend/lib/calendarSdkTransport.js";
import { createCalendarReadOnly } from "../frontend/lib/calendarReadOnly.js";
import { calendarTestPassword } from "../frontend/lib/calendarEmulatorConfig.js";
import { TRUSTED_CUTOVER_MANUAL_ID, TRUSTED_CUTOVER_MANUAL_OPERATION } from "../frontend/lib/calendarDirectDenialQa.js";
import { reviewValueHash } from "./calendar-trusted-cloud-plan.mjs";
const project = "demo-calendar-cutover", origin = "http://127.0.0.1:18220", prefix = `projects/${project}/databases/(default)/documents`;
const collections = ["users", "classroomSchedules", "dlExamSchedules", "calendarWriteState", "calendarWriteOperations"], clients = [], ownedReferences = new Set(), checks = [];
const output = "output/playwright/calendar-trusted-writer-audit-prep";setLogLevel("silent");
async function local(resource, method = "GET", body) {
  const url = new URL(resource, origin);assert.equal(url.origin, origin);
  assert(url.pathname.startsWith(`/v1/${prefix}`) || url.pathname === `/emulator/v1/projects/${project}:securityRules`);
  const response = await fetch(url, { method, redirect: "error", headers: { Authorization: "Bearer owner", "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000) });
  if (response.status === 404) return null;assert(response.ok, "Owned local Emulator request failed");return response.json();
}
const field = value => typeof value === "string" ? { stringValue: value } : typeof value === "boolean" ? { booleanValue: value } : typeof value === "number" ? { integerValue: String(value) } : Array.isArray(value) ? { arrayValue: { values: value.map(field) } } : { mapValue: { fields: fields(value) } };
const fields = value => Object.fromEntries(Object.entries(value).map(([key, item]) => [key, field(item)]));
const commit = writes => local(`/v1/${prefix}:commit`, "POST", { writes });
const rows = async () => (await Promise.all(collections.map(async collection => ((await local(`/v1/${prefix}/${collection}?pageSize=201`))?.documents || [])))).flat();
const snapshot = async () => reviewValueHash(await rows());
const rules = file => local(`/emulator/v1/projects/${project}:securityRules`, "PUT", { rules: { files: [{ name: "firestore.rules", content: fs.readFileSync(file, "utf8") }] } });
async function sdk(alias) {
  const app = initializeApp({ projectId: project, apiKey: "synthetic-emulator-key", appId: "synthetic-cutover" }, "cutover-" + alias), auth = initializeAuth(app, { persistence: inMemoryPersistence });
  connectAuthEmulator(auth, "http://127.0.0.1:19220", { disableWarnings: true });
  const db = initializeFirestore(app, { experimentalForceLongPolling: true });connectFirestoreEmulator(db, "127.0.0.1", 18220);
  const value = { app, auth, db, alias };clients.push(value);
  await createUserWithEmailAndPassword(auth, `cutover-${alias}@example.test`, calendarTestPassword);return value;
}
let failure, cleanupPassed = false;
try {
  assert.equal((await rows()).length, 0, "Refuse a nonempty demo namespace; never reset it");
  const staff = await sdk("staff"), superadmin = await sdk("superadmin");
  for (const value of [staff, superadmin]) {
    const reference = "users/" + value.auth.currentUser.uid;ownedReferences.add(reference);
    await commit([{ update: { name: prefix + "/" + reference, fields: fields({ displayName: "Synthetic " + value.alias, role: value.alias, active: true, calendarWriter: value.alias === "superadmin" }) }, currentDocument: { exists: false } }]);
  }
  const gateReference = "calendarWriteState/main";ownedReferences.add(gateReference);
  await commit([{ update: { name: prefix + "/" + gateReference, fields: fields({ revision: 17 }) }, currentDocument: { exists: false } }]);
  const input = { rules: [{ kind: "classroom", title: "QA-SERVER-MANUAL", rooms: ["401"], weekday: 0, validFrom: "2027-06-07", validTo: "2027-06-07", start: "09:00", end: "10:00", semester: "1/2570", teacher: "" }], events: [] };
  const plan = await prepareCalendarCreate(input, []);assert.equal(plan.entries[0].id, TRUSTED_CUTOVER_MANUAL_ID);assert.equal(plan.operationId, TRUSTED_CUTOVER_MANUAL_OPERATION);
  const scheduleReference = "classroomSchedules/" + plan.entries[0].id, receiptReference = "calendarWriteOperations/" + plan.operationId;
  ownedReferences.add(scheduleReference);ownedReferences.add(receiptReference);
  const rawCommit = async () => {
    const uid = superadmin.auth.currentUser.uid, batch = writeBatch(superadmin.db);
    batch.set(doc(superadmin.db, "classroomSchedules", plan.entries[0].id), { ...plan.entries[0].value, operationId: plan.operationId, createdBy: uid, createdAt: serverTimestamp(), schemaVersion: 1 });
    batch.set(doc(superadmin.db, "calendarWriteOperations", plan.operationId), { count: 1, skipped: 0, createdBy: uid, createdAt: serverTimestamp(), schemaVersion: 1 });
    batch.update(doc(superadmin.db, "calendarWriteState", "main"), { revision: increment(1), operationId: plan.operationId, updatedBy: uid, updatedAt: serverTimestamp() });
    return batch.commit();
  };
  await rules("firebase/calendar-writer/firestore.rules");await rawCommit();
  const gateAfter = await local(`/v1/${prefix}/${gateReference}`);assert.equal(Number(gateAfter.fields.revision.integerValue), 18);
  const schedule = await local(`/v1/${prefix}/${scheduleReference}`), receipt = await local(`/v1/${prefix}/${receiptReference}`);
  assert.equal(schedule.fields.createdBy.stringValue, superadmin.auth.currentUser.uid);assert.equal(receipt.fields.count.integerValue, "1");
  checks.push("Legacy append-only Rules compile and accept the exact frozen manual/receipt/gate-increment batch");
  await commit([{ delete: schedule.name, currentDocument: { updateTime: schedule.updateTime } }, { delete: receipt.name, currentDocument: { updateTime: receipt.updateTime } }, { update: { name: gateAfter.name, fields: fields({ revision: 17 }) }, currentDocument: { updateTime: gateAfter.updateTime } }]);
  await rules("deploy/calendar-staging/firestore.review.rules");const before = await snapshot();
  for (const value of [staff, superadmin]) {
    const reader = createCalendarReadOnly(calendarSdkTransport(value.db));reader.setSession(value.auth.currentUser.uid);
    const read = await reader.read("2027-06-07", "2027-06-11");assert.equal(read.complete, true);reader.setSession(null);
    for (const [collection, id] of [["calendarWriteState", "main"], ["calendarWriteOperations", plan.operationId]]) await assert.rejects(getDocFromServer(doc(value.db, collection, id)), error => error.code === "permission-denied");
  }
  checks.push("Candidate Rules compile; Staff/Superadmin actual reader queries pass and SDK gate/receipt reads deny");
  await assert.rejects(rawCommit(), error => error.code === "permission-denied");assert.equal(await snapshot(), before);
  assert.equal(await local(`/v1/${prefix}/${scheduleReference}`), null);assert.equal(await local(`/v1/${prefix}/${receiptReference}`), null);
  assert.equal(Number((await local(`/v1/${prefix}/${gateReference}`)).fields.revision.integerValue), 17);
  checks.push("Candidate denies the same valid atomic batch; gate, profiles and all fixture data remain byte-equivalent");
} catch (error) { failure = error; }
finally {
  try {
    const current = await rows();for (const row of current) assert(ownedReferences.has(row.name.slice(prefix.length + 1)), "Never delete an unowned Emulator document");
    if (current.length) await commit(current.map(row => ({ delete: row.name, currentDocument: { updateTime: row.updateTime } })));
    for (const value of clients) if (value.auth.currentUser) await deleteUser(value.auth.currentUser);
    cleanupPassed = (await rows()).length === 0;
  } catch { cleanupPassed = false; }
  for (const value of clients) { await terminate(value.db);await deleteApp(value.app); }
}
const report = { passed: !failure && cleanupPassed, project, cloudUsed: false, namespaceReset: false, installedPackages: false, credentialFilesRead: false, cleanupOwnedFixturesPassed: cleanupPassed, checks, ...(failure ? { failure: { code: failure.code || "local-sit-failed", message: String(failure.message).slice(0, 180) } } : {}) };
fs.mkdirSync(output, { recursive: true });fs.writeFileSync(output + "/emulator-denial-report.json", JSON.stringify(report, null, 2) + "\n");console.log(JSON.stringify(report));if (!report.passed) process.exitCode = 1;
