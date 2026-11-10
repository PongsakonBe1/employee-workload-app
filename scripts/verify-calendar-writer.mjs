// Real Web SDK transactions/rules on an isolated demo namespace; synthetic data only.
import assert from "node:assert/strict";
import fs from "node:fs";
import { initializeApp, deleteApp } from "firebase/app";
import { initializeAuth, inMemoryPersistence, connectAuthEmulator, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { initializeFirestore, connectFirestoreEmulator, collection, getDocsFromServer, getDocFromServer, doc, updateDoc, deleteDoc, setDoc, writeBatch, serverTimestamp, disableNetwork, enableNetwork, terminate, setLogLevel } from "firebase/firestore";
import { createCalendarWriter } from "../frontend/lib/calendarWriter.js";
import { createCalendarEmulatorClient } from "../frontend/lib/calendarEmulatorClient.js";
import { prepareCalendarCreate } from "../frontend/lib/calendarCreatePlan.js";
import { addCalendarDays, calendarWeekday } from "../frontend/lib/calendarView.js";
import { calendarTestPassword } from "../frontend/lib/calendarEmulatorConfig.js";
setLogLevel("silent");
const report = {
  completed: false,
  project: "demo-calendar-writer",
  checks: [],
  deniedWrites: 0,
  cloudUsed: false
};
const out = "output/playwright/calendar-staging-import";
fs.mkdirSync(out, {
  recursive: true
});
const clients = [];
async function client(id) {
  const value = createCalendarEmulatorClient({
    local: true,
    writer: true
  });
  clients.push(value);
  await value.login(id);
  return value;
}
const rule = (title, date = "2026-11-25", start = "10:00", end = "12:00") => ({
  kind: "classroom",
  title,
  rooms: ["402"],
  weekday: calendarWeekday(date),
  validFrom: date,
  validTo: date,
  start,
  end,
  semester: "2/2569",
  teacher: "Synthetic teacher"
});
const batch = (...rules) => ({
  rules,
  events: []
});
const a = await client("directory-a"),
  c = await client("directory-c");
try {
  const input = batch(rule("Synthetic creation"));
  assert.equal((await a.create(input)).created, 1);
  assert.equal((await a.create(input)).created, 0);
  assert.equal((await c.create(input)).skipped, 1);
  report.checks.push({
    name: "atomic create, receipt replay and cross-admin idempotency",
    passed: true
  });
  const dl = {
    rules: [],
    events: [{
      kind: "dl",
      title: "Synthetic evening DL",
      date: "2026-11-26",
      start: "17:00",
      end: "18:30",
      rooms: ["406", "407"],
      participants: 75,
      proctors: ["directory-a", "directory-c"],
      examType: "student",
      semester: "2/2569"
    }]
  };
  assert.equal((await a.create(dl)).created, 1);
  const snapshot = await a.reader.read("2026-11-26", "2026-11-26");
  assert.equal(snapshot.data.events.find(row => row.date === "2026-11-26").start, "17:00");
  report.checks.push({
    name: "evening DL, 75 per round, two rooms and directory IDs round trip",
    passed: true
  });
  await assert.rejects(a.create(batch(rule("Atomic good", "2026-11-27"), {
    ...rule("Atomic collision", "2026-11-02", "08:00", "10:00"),
    rooms: ["401"]
  })), /ชน/);
  const concurrent = await Promise.allSettled([a.create(batch(rule("Concurrent A", "2026-11-28", "10:00", "12:00"))), c.create(batch(rule("Concurrent B", "2026-11-28", "11:00", "13:00")))]);
  assert.equal(concurrent.filter(row => row.status === "fulfilled").length, 1);
  assert.equal(concurrent.filter(row => row.status === "rejected").length, 1);
  assert.match(concurrent.find(row => row.status === "rejected").reason.message, /ชน/);
  report.checks.push({
    name: "conflicting atomic batch leaves no partial rows; concurrent writers revalidate the revision gate",
    passed: true
  });
  const repeat = batch(rule("Concurrent identical", "2026-11-29"));
  const identical = await Promise.all([a.create(repeat), c.create(repeat)]);
  assert.equal(identical.reduce((sum, row) => sum + row.created, 0), 1);
  const pending = a.create(batch(rule("Double click", "2026-11-30")));
  await assert.rejects(a.create(batch(rule("Double click", "2026-11-30"))), /กำลังบันทึก/);
  await pending;
  report.checks.push({
    name: "same-batch concurrent retry and double-click suppression",
    passed: true
  });
  for (const id of ["directory-b", "pending-user", "inactive-user"]) {
    const denied = await client(id);
    await assert.rejects(denied.create(batch(rule("Denied writer " + id, "2026-12-01"))));
  }
  report.checks.push({
    name: "staff, pending and inactive cannot create despite calling the writer API",
    passed: true
  });
  const app = initializeApp({
    projectId: report.project,
    apiKey: "demo-calendar-key",
    appId: "demo-writer-rules"
  }, "writer-negative-sdk");
  const auth = initializeAuth(app, {
    persistence: inMemoryPersistence
  });
  connectAuthEmulator(auth, "http://127.0.0.1:19099", {
    disableWarnings: true
  });
  const db = initializeFirestore(app, {});
  connectFirestoreEmulator(db, "127.0.0.1", 18080);
  await signInWithEmailAndPassword(auth, "directory-a@example.test", calendarTestPassword);
  try {
    const docs = await getDocsFromServer(collection(db, "classroomSchedules"));
    assert.ok(!docs.docs.some(row => row.data().subject === "Atomic good"));
    const target = docs.docs.find(row => row.data().subject === "Synthetic creation").ref;
    for (const action of [() => updateDoc(target, {
      subject: "Forbidden overwrite"
    }), () => deleteDoc(target), () => updateDoc(doc(db, "users", "directory-b"), {
      calendarWriter: true
    }), () => setDoc(doc(db, "classroomSchedules", "cal-" + "a".repeat(64)), {
      subject: "Missing protocol"
    }), () => setDoc(doc(db, "calendarWriteState", "other"), {
      revision: 0
    })]) {
      await assert.rejects(action(), error => error.code === "permission-denied");
      report.deniedWrites++;
    }
    report.checks.push({
      name: "rules deny overwrite/delete, profile escalation, protocol bypass and unauthorized gate creation",
      passed: true
    });
    const validPlan = await prepareCalendarCreate(batch(rule("Malformed direct request", "2026-12-04")), []);
    const invalidPatches = [{
      subject: ""
    }, {
      subject: "x".repeat(301)
    }, {
      extraField: true
    }, {
      dayOfWeek: "nonday"
    }, {
      startTime: "15:00",
      endTime: "09:00"
    }, {
      validFrom: "not-a-date"
    }, {
      teacher: 17
    }, {
      createdBy: "other-user"
    }];
    for (const [index, patch] of invalidPatches.entries()) {
      const gate = await getDocFromServer(doc(db, "calendarWriteState", "main")),
        operationId = "op-" + (index + 100).toString(16).padStart(64, "0");
      const changes = writeBatch(db);
      changes.set(doc(db, "calendarWriteState", "main"), {
        revision: gate.data().revision + 1,
        operationId,
        updatedBy: "directory-a",
        updatedAt: serverTimestamp()
      });
      changes.set(doc(db, "calendarWriteOperations", operationId), {
        count: 1,
        skipped: 0,
        createdBy: "directory-a",
        createdAt: serverTimestamp(),
        schemaVersion: 1
      });
      changes.set(doc(db, "classroomSchedules", validPlan.entries[0].id), {
        ...validPlan.entries[0].value,
        operationId,
        createdBy: "directory-a",
        createdAt: serverTimestamp(),
        schemaVersion: 1,
        ...patch
      });
      await assert.rejects(changes.commit(), error => error.code === "permission-denied");
      report.deniedWrites++;
      assert.equal((await getDocFromServer(doc(db, "calendarWriteState", "main"))).data().revision, gate.data().revision);
    }
    report.checks.push({
      name: "malformed schema/ownership transactions rejected atomically without advancing the gate",
      passed: true
    });
    const beforeCapability = await getDocFromServer(doc(db, "calendarWriteState", "main"));
    const setCapability = async enabled => {
      const response = await fetch("http://127.0.0.1:18080/v1/projects/demo-calendar-writer/databases/(default)/documents/users/directory-a?updateMask.fieldPaths=calendarWriter", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: "Bearer owner" }, body: JSON.stringify({ fields: { calendarWriter: { booleanValue: enabled } } }) });
      assert.ok(response.ok);
    };
    await setCapability(false);
    try {
      await assert.rejects(a.create(batch(rule("Admin without capability", "2026-12-05"))), /สิทธิ์/);
      const operationId = "op-" + "e".repeat(64), denied = writeBatch(db);
      denied.set(doc(db, "calendarWriteState", "main"), { revision: beforeCapability.data().revision + 1, operationId, updatedBy: "directory-a", updatedAt: serverTimestamp() });
      denied.set(doc(db, "calendarWriteOperations", operationId), { count: 1, skipped: 0, createdBy: "directory-a", createdAt: serverTimestamp(), schemaVersion: 1 });
      denied.set(doc(db, "classroomSchedules", validPlan.entries[0].id), { ...validPlan.entries[0].value, operationId, createdBy: "directory-a", createdAt: serverTimestamp(), schemaVersion: 1 });
      await assert.rejects(denied.commit(), error => error.code === "permission-denied");report.deniedWrites++;
    } finally { await setCapability(true); }
    report.checks.push({ name: "active admin without explicit writer capability denied by API and direct SDK transaction", passed: true });
    const offline = createCalendarWriter(db, () => auth.currentUser?.uid);
    await disableNetwork(db);
    await assert.rejects(offline(batch(rule("Offline not queued", "2026-12-05"))));
    await enableNetwork(db);
    assert.ok(!(await getDocsFromServer(collection(db, "classroomSchedules"))).docs.some(row => row.data().subject === "Offline not queued"));
    report.checks.push({
      name: "offline writer rejects server reads and never queues a later silent write",
      passed: true
    });
    const hundred = Array.from({
      length: 100
    }, (_, index) => rule("Bounded batch " + index, addCalendarDays("2027-04-01", index)));
    assert.equal((await a.create(batch(...hundred))).created, 100);
    const all = await getDocsFromServer(collection(db, "classroomSchedules"));
    assert.equal(all.docs.filter(row => row.data().subject.startsWith("Bounded batch ")).length, 100);
    report.checks.push({
      name: "100-record pilot limit commits atomically within actual emulator rules access budgets",
      passed: true
    });
    const closing = await client("directory-a"),
      late = closing.create(batch(rule("Closed session", "2026-12-06")));
    await closing.close();
    await assert.rejects(late);
    assert.ok(!(await getDocsFromServer(collection(db, "classroomSchedules"))).docs.some(row => row.data().subject === "Closed session"));
    report.checks.push({
      name: "closing a client during preflight prevents the pending create",
      passed: true
    });
  } finally {
    await signOut(auth);
    await terminate(db);
    await deleteApp(app);
  }
  report.completed = true;
} finally {
  await Promise.all(clients.map(value => value.close().catch(() => {})));
  fs.writeFileSync(out + "/integration-report.json", JSON.stringify(report, null, 2));
}
console.log(`PASS writer SIT: ${report.checks.length} groups; ${report.deniedWrites} forbidden writes denied`);
