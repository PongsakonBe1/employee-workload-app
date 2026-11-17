// Review Rules compiled against the isolated demo Emulator only. Never deploys cloud Rules.
import fs from "node:fs";
import assert from "node:assert/strict";
import { initializeApp, deleteApp } from "firebase/app";
import { initializeAuth, inMemoryPersistence, connectAuthEmulator, signInWithEmailAndPassword } from "firebase/auth";
import { initializeFirestore, connectFirestoreEmulator, doc, getDocFromServer, setDoc, updateDoc, deleteDoc, terminate, setLogLevel } from "firebase/firestore";
import { TRUSTED_EMULATOR_CONFIG } from "../frontend/lib/calendarTrustedConfig.js";
import { calendarTestPassword } from "../frontend/lib/calendarEmulatorConfig.js";
import { createCalendarReadOnly } from "../frontend/lib/calendarReadOnly.js";
import { calendarSdkTransport } from "../frontend/lib/calendarSdkTransport.js";
const project = "demo-calendar-trusted", base = "http://127.0.0.1:18180", prefix = `projects/${project}/databases/(default)/documents`, clients = [], checks = [];
assert.equal(TRUSTED_EMULATOR_CONFIG.projectId, project);setLogLevel("silent");
const owned = JSON.parse(fs.readFileSync(".tools/calendar-staging/trusted-fixture.json", "utf8"));assert.equal(owned.project, project);assert.equal(owned.stage, "browser-ready");
async function owner(path) { const response = await fetch(base + path, { headers: { Authorization: "Bearer owner" }, signal: AbortSignal.timeout(10000) });assert.ok(response.ok);return response.json(); }
async function sdk(alias) {
  const app = initializeApp(TRUSTED_EMULATOR_CONFIG, "prep-rules-" + alias), auth = initializeAuth(app, { persistence: inMemoryPersistence });connectAuthEmulator(auth, "http://127.0.0.1:19199", { disableWarnings: true });
  const db = initializeFirestore(app, { experimentalForceLongPolling: true });connectFirestoreEmulator(db, "127.0.0.1", 18180);const entry = { app, auth, db };clients.push(entry);
  if (alias !== "anonymous") { await signInWithEmailAndPassword(auth, `mutation-ui-${alias}@example.test`, calendarTestPassword);assert.ok(owned.uids.includes(auth.currentUser.uid)); }return entry;
}
let failure;
try {
  const response = await fetch(base + `/emulator/v1/projects/${project}:securityRules`, { method: "PUT", headers: { Authorization: "Bearer owner", "Content-Type": "application/json" }, body: JSON.stringify({ rules: { files: [{ name: "firestore.rules", content: fs.readFileSync("deploy/calendar-staging/firestore.review.rules", "utf8") }] } }) });
  assert.ok(response.ok, "Review Rules compile in demo Emulator");checks.push("actual review file compiled in isolated demo Emulator; no cloud deploy");
  const classes = (await owner(`/v1/${prefix}/classroomSchedules?pageSize=1000`)).documents, rounds = (await owner(`/v1/${prefix}/dlExamSchedules?pageSize=1000`)).documents;
  const before = JSON.stringify(await owner(`/v1/${prefix}/calendarWriteState/main`));
  const denied = operation => assert.rejects(operation, error => error.code === "permission-denied");
  for (const alias of ["admin", "superadmin", "staff", "no-cap"]) {
    const { db, auth } = await sdk(alias), reader = createCalendarReadOnly(calendarSdkTransport(db));reader.setSession(auth.currentUser.uid);const read = await reader.read("2027-05-17", "2027-05-26");assert.equal(read.identity.active, true);assert.ok(read.complete);
    const targets = [["users", auth.currentUser.uid], ["classroomSchedules", classes[0].name.split("/").at(-1)], ["dlExamSchedules", rounds[0].name.split("/").at(-1)], ["calendarWriteState", "main"], ["calendarWriteOperations", "forbidden-prep-probe"]];
    for (const [collection, id] of targets) {
      await denied(() => setDoc(doc(db, collection, "forbidden-prep-new"), { isActive: true }));
      await denied(() => updateDoc(doc(db, collection, id), { isActive: false }));
      await denied(() => deleteDoc(doc(db, collection, id)));
      if (["calendarWriteState", "calendarWriteOperations"].includes(collection)) await denied(() => getDocFromServer(doc(db, collection, id)));
    }
    checks.push(alias + ": real reader queries pass; all five collection create/update/delete calls and gate/receipt reads denied");
  }
  for (const alias of ["inactive", "anonymous"]) { const { db } = await sdk(alias);await denied(() => getDocFromServer(doc(db, "classroomSchedules", classes[0].name.split("/").at(-1))));checks.push(alias + ": schedule read denied"); }
  assert.equal(JSON.stringify(await owner(`/v1/${prefix}/calendarWriteState/main`)), before);checks.push("denials leave gate unchanged");
} catch (error) { failure = error; }
finally { for (const entry of clients) { await terminate(entry.db);await deleteApp(entry.app); } }
const report = { passed: !failure, checks, cloudUsed: false, ...(failure ? { failure: { code: failure.code || "unknown", message: failure.message } } : {}) };
fs.writeFileSync("output/playwright/calendar-staging-server-prep/rules-emulator-report.json", JSON.stringify(report, null, 2));console.log(JSON.stringify(report));if (failure) process.exitCode = 1;
