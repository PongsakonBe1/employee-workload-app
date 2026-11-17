// Warming proxy simulation around real loopback HTTP/Auth/Firestore, never a cloud origin.
import fs from "node:fs";
import assert from "node:assert/strict";
import { initializeApp, deleteApp } from "firebase/app";
import { initializeAuth, inMemoryPersistence, connectAuthEmulator, signInWithEmailAndPassword } from "firebase/auth";
import { initializeFirestore, connectFirestoreEmulator, terminate } from "firebase/firestore";
import { TRUSTED_EMULATOR_CONFIG, validateTrustedCalendarConfig } from "../frontend/lib/calendarTrustedConfig.js";
import { calendarTestPassword } from "../frontend/lib/calendarEmulatorConfig.js";
import { calendarSdkTransport } from "../frontend/lib/calendarSdkTransport.js";
import { createCalendarReadOnly } from "../frontend/lib/calendarReadOnly.js";
import { createCalendarStagingSession } from "../frontend/lib/calendarStagingSession.js";
import { createTrustedCalendarTransport } from "../frontend/lib/calendarTrustedTransport.js";
import { createCalendarServerReadiness } from "../frontend/lib/calendarServerReadiness.js";
const origin = "http://127.0.0.1:4321", checks = [], app = initializeApp(TRUSTED_EMULATOR_CONFIG, "prep-warmup"), auth = initializeAuth(app, { persistence: inMemoryPersistence });connectAuthEmulator(auth, "http://127.0.0.1:19199", { disableWarnings: true });
const db = initializeFirestore(app, { experimentalForceLongPolling: true });connectFirestoreEmulator(db, "127.0.0.1", 18180);let session, failure;
const input = { rules: [{ kind: "classroom", title: "QA warmup real HTTP", weekday: 1, validFrom: "2027-06-07", validTo: "2027-06-07", rooms: ["401"], start: "09:00", end: "10:00", teacher: "", semester: "1/2570" }], events: [] };
try {
  const user = (await signInWithEmailAndPassword(auth, "mutation-ui-admin@example.test", calendarTestPassword)).user;
  const owned = JSON.parse(fs.readFileSync(".tools/calendar-staging/trusted-fixture.json", "utf8"));assert.ok(owned.uids.includes(user.uid));
  let warming = true, posts = 0, checksBeforeToken = 0, time = 0, deferred, started;
  const waiting = new Promise(resolve => { started = resolve; });
  const fetcher = async (url, options) => {
    assert.equal(new URL(url).origin, origin);
    if (options.method === "GET") {
      assert.equal(options.headers, undefined);checksBeforeToken++;
      if (warming) { started();await new Promise(resolve => { deferred = resolve; });return { ok: true, headers: { get: () => "text/html" } }; }
    } else { posts++;assert.ok(checksBeforeToken >= 2); }
    return fetch(url, options);
  };
  // Inject a zero-wall-time pause only into the preflight, preserving the real POST transport.
  const prepare = createCalendarServerReadiness({ origin, fetcher, now: () => time, pause: async ms => { time += ms; } });
  const writer = createTrustedCalendarTransport({ getUser: () => auth.currentUser, fetcher }), source = calendarSdkTransport(db), reader = createCalendarReadOnly(source);
  session = createCalendarStagingSession(() => ({ reader, identity: () => source.identity(user.uid), login: async () => reader.setSession(user.uid), close: async () => reader.clear(), prepareWrite: prepare, create: writer.create }), { writable: true, validateConfig: validateTrustedCalendarConfig });
  await session.login(TRUSTED_EMULATOR_CONFIG);const pending = session.create(input);await waiting;
  assert.equal(session.getState().saving, true);assert.equal(session.getState().writePhase, "connecting");assert.equal(posts, 0);
  await assert.rejects(session.create(input), error => error.code === "calendar-write-validation");checks.push("warming HTML leaves session connecting and double-submit blocked; zero POSTs or tokens sent");
  warming = false;deferred();const created = await pending;assert.equal(created.created, 1);assert.equal(posts, 1);
  const view = await session.read("2027-06-07", "2027-06-07");assert.ok(view.data.rules.some(row => row.title === input.rules[0].title));assert.equal(session.getState().writeOutcome.readBack, "verified");
  const replay = await session.create(input);assert.equal(replay.repeated, true);assert.equal(replay.created, 0);assert.equal(replay.operationId, created.operationId);checks.push("after warmup actual HTTP commits once, server read-back verifies and original receipt replays without another schedule");
} catch (error) { failure = error; }
finally { await session?.logout();await terminate(db);await deleteApp(app); }
const report = { passed: !failure, checks, cloudUsed: false, ...(failure ? { failure: { code: failure.code || "unknown", message: failure.message } } : {}) };fs.writeFileSync("output/playwright/calendar-staging-server-prep/warmup-emulator-report.json", JSON.stringify(report, null, 2));console.log(JSON.stringify(report));if (failure) process.exitCode = 1;
