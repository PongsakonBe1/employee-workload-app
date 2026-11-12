// Negative HTTP contracts and commit/read-back/session uncertainty against the actual local API.
import fs from "node:fs";
import assert from "node:assert/strict";
import { initializeApp, deleteApp } from "firebase/app";
import { initializeAuth, inMemoryPersistence, connectAuthEmulator, signInWithEmailAndPassword } from "firebase/auth";
import { initializeFirestore, connectFirestoreEmulator, terminate } from "firebase/firestore";
import { TRUSTED_EMULATOR_CONFIG, validateTrustedCalendarConfig } from "../frontend/lib/calendarTrustedConfig.js";
import { calendarTestPassword } from "../frontend/lib/calendarEmulatorConfig.js";
import { calendarWeekday } from "../frontend/lib/calendarView.js";
import { calendarSdkTransport } from "../frontend/lib/calendarSdkTransport.js";
import { createCalendarReadOnly } from "../frontend/lib/calendarReadOnly.js";
import { createCalendarStagingSession } from "../frontend/lib/calendarStagingSession.js";
import { createTrustedCalendarTransport } from "../frontend/lib/calendarTrustedTransport.js";
const output = "output/playwright/calendar-trusted-write-emulator", project = TRUSTED_EMULATOR_CONFIG.projectId, prefix = `projects/${project}/databases/(default)/documents`;
const app = initializeApp(TRUSTED_EMULATOR_CONFIG, "trusted-extra"), auth = initializeAuth(app, { persistence: inMemoryPersistence });connectAuthEmulator(auth, "http://127.0.0.1:19199", { disableWarnings: true });
const db = initializeFirestore(app, { experimentalForceLongPolling: true });connectFirestoreEmulator(db, "127.0.0.1", 18180);
const checks = [];let failure;
async function record(path) { const response = await fetch(`http://127.0.0.1:18180/v1/${prefix}/${path}`, { headers: { Authorization: "Bearer owner" }, signal: AbortSignal.timeout(20000) });assert.ok(response.ok);return response.json(); }
const revision = async () => Number((await record("calendarWriteState/main")).fields.revision.integerValue);
const rule = (title, date) => ({ title, kind: "classroom", rooms: ["402"], weekday: calendarWeekday(date), validFrom: date, validTo: date, start: "09:00", end: "10:00", semester: "1/2570", teacher: "" });
const batch = (title, date) => ({ rules: [rule(title, date)], events: [] });
try {
  const state = JSON.parse(fs.readFileSync(".tools/calendar-staging/trusted-fixture.json", "utf8"));assert.equal(state.project, project);assert.equal(state.stage, "browser-ready");
  const user = (await signInWithEmailAndPassword(auth, "mutation-ui-admin@example.test", calendarTestPassword)).user;
  assert.ok(state.uids.includes(user.uid));
  const before = await revision();assert.equal(before, 11, "8 SIT commits plus create/edit/cancel browser commits");
  const classes = await record("classroomSchedules?pageSize=1000");
  const browserRecord = classes.documents.find(row => row.fields.subject?.stringValue === "Trusted API · Edited");
  assert.ok(browserRecord);assert.equal(browserRecord.fields.isActive.booleanValue, false);assert.equal(browserRecord.fields.mutationVersion.integerValue, "2");assert.equal(browserRecord.fields.createdBy.stringValue, user.uid);assert.equal(browserRecord.fields.schemaVersion.integerValue, "1");
  checks.push("browser create/edit/soft-cancel persisted with immutable creation metadata and version 2; gate 11");
  const headers = { Authorization: "Bearer " + await user.getIdToken(), "Content-Type": "application/json" };
  for (const [body, status] of [["{", 400], ["[]", 400], [JSON.stringify({ rules: Array.from({ length: 101 }, () => rule("Over limit", "2027-05-26")), events: [] }), 400], [JSON.stringify(batch("x".repeat(300000), "2027-05-26")), 413], [JSON.stringify({ rules: [{ ...rule("Over range", "2027-01-01"), validTo: "2029-01-01" }], events: [] }), 400]]) {
    const response = await fetch("http://127.0.0.1:4321/api/calendar/create", { method: "POST", headers, body });assert.equal(response.status, status);assert.equal((await response.json()).code, "calendar-write-validation");
  }
  assert.equal(await revision(), before);checks.push("malformed JSON, array, >100 rows, >256kb and >400-day range rejected without commit");
  let failRead = false, loseReply = false;
  const source = calendarSdkTransport(db), reader = createCalendarReadOnly({ ...source, classrooms: () => failRead ? Promise.reject(Object.assign(new Error("Synthetic read-back unavailable"), { code: "unavailable" })) : source.classrooms() });
  const writer = createTrustedCalendarTransport({ getUser: () => auth.currentUser, fetcher: async (...args) => { const response = await fetch(...args);if (response.ok && loseReply) { loseReply = false;throw Object.assign(new Error("Synthetic lost HTTP reply"), { code: "unavailable" }); }return response; } });
  const session = createCalendarStagingSession(() => ({ reader, login: async () => reader.setSession(user.uid), identity: () => source.identity(user.uid), close: async () => reader.clear(), create: writer.create }), { writable: true, validateConfig: validateTrustedCalendarConfig });await session.login(TRUSTED_EMULATOR_CONFIG);
  await session.create(batch("Trusted read-back failure", "2027-05-25"));failRead = true;
  await assert.rejects(session.read("2027-05-25", "2027-05-25"), error => error.code === "unavailable");assert.equal(session.getState().writeOutcome.status, "committed");assert.equal(session.getState().writeOutcome.readBack, "failed");failRead = false;await session.read("2027-05-25", "2027-05-25");assert.equal(session.getState().writeOutcome.readBack, "verified");checks.push("real API commit preserved while read-back fails, then verified after recovery");
  loseReply = true;await assert.rejects(session.create(batch("Trusted retry same payload", "2027-05-26")), error => error.code === "calendar-write-uncertain");const afterLost = await revision();
  await assert.rejects(session.create(batch("Different payload", "2027-05-27")), error => error.code === "calendar-write-validation");
  const replay = await session.retryCreate();assert.equal(replay.repeated, true);assert.equal(replay.created, 0);assert.equal(await revision(), afterLost);await session.logout();checks.push("lost HTTP reply blocks different draft and retryCreate uses frozen input without another commit");
} catch (error) { failure = error; }
finally { await terminate(db);await deleteApp(app); }
const report = { passed: !failure, project, checks, cloudUsed: false, ...(failure ? { failure: { code: failure.code || "unknown", message: failure.message } } : {}) };
fs.writeFileSync(output + "/extra-sit-report.json", JSON.stringify(report, null, 2));console.log(JSON.stringify(report));if (failure) process.exitCode = 1;
