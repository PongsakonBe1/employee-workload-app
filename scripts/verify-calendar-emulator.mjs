// Rules/SIT on loopback emulators using the existing Web SDK, never Admin credentials.
import assert from "node:assert/strict";
import fs from "node:fs";
import { initializeApp, deleteApp } from "firebase/app";
import { initializeAuth, inMemoryPersistence, connectAuthEmulator, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { initializeFirestore, connectFirestoreEmulator, getDocFromServer, getDocsFromServer, collection, doc, setDoc, updateDoc, deleteDoc, disableNetwork, enableNetwork, terminate, setLogLevel } from "firebase/firestore";
import { createCalendarEmulatorClient } from "../frontend/lib/calendarEmulatorClient.js";
import { calendarTestAccounts, calendarTestPassword } from "../frontend/lib/calendarEmulatorConfig.js";
setLogLevel("silent");
const out = "output/playwright/calendar-emulator-readonly";
fs.mkdirSync(out, {
  recursive: true
});
const report = {
  completed: false,
  checks: [],
  project: "demo-calendar-readonly",
  edition: "standard",
  productionUsed: false,
  credentialFilesUsed: false,
  deniedWrites: 0
};
let sequence = 0;
async function context(id) {
  const app = initializeApp({
    projectId: report.project,
    apiKey: "demo-calendar-key",
    appId: "demo-calendar-app"
  }, "rules-test-" + ++sequence);
  const auth = initializeAuth(app, {
    persistence: inMemoryPersistence
  });
  connectAuthEmulator(auth, "http://127.0.0.1:19099", {
    disableWarnings: true
  });
  const db = initializeFirestore(app, {});
  connectFirestoreEmulator(db, "127.0.0.1", 18080);
  if (id) await signInWithEmailAndPassword(auth, `${id}@example.test`, calendarTestPassword);
  return {
    db,
    close: async () => {
      await signOut(auth);
      await terminate(db);
      await deleteApp(app);
    }
  };
}
const denied = async task => {
  await assert.rejects(task, error => error.code === "permission-denied");
};
try {
  for (const id of [null, "pending-user", "inactive-user"]) {
    const client = await context(id);
    try {
      for (const collectionName of ["users", "classroomSchedules", "dlExamSchedules"]) await denied(getDocsFromServer(collection(client.db, collectionName)));
    } finally {
      await client.close();
    }
  }
  report.checks.push({
    name: "unauthenticated, pending and inactive accounts denied all three collections",
    passed: true
  });
  for (const account of calendarTestAccounts.slice(0, 3)) {
    const client = await context(account.id);
    try {
      const before = (await getDocsFromServer(collection(client.db, "dlExamSchedules"))).docs.map(record => [record.id, record.data()]);
      assert.equal((await getDocsFromServer(collection(client.db, "classroomSchedules"))).size, 1);
      for (const task of [() => setDoc(doc(client.db, "classroomSchedules", "forbidden-new"), {
        subject: "Denied fixture"
      }), () => updateDoc(doc(client.db, "classroomSchedules", "class-one"), {
        subject: "Denied fixture"
      }), () => deleteDoc(doc(client.db, "classroomSchedules", "class-one")), () => updateDoc(doc(client.db, "dlExamSchedules", "dl-morning"), {
        isActive: false
      }), () => setDoc(doc(client.db, "users", account.id), {
        role: "superadmin"
      }, {
        merge: true
      })]) {
        await denied(task());
        report.deniedWrites++;
      }
      await denied(getDocFromServer(doc(client.db, "worklogs", "fixture")));
      const after = (await getDocsFromServer(collection(client.db, "dlExamSchedules"))).docs.map(record => [record.id, record.data()]);
      assert.deepEqual(after, before);
      await disableNetwork(client.db);
      await assert.rejects(getDocFromServer(doc(client.db, "classroomSchedules", "class-one")), error => error.code === "unavailable");
      await enableNetwork(client.db);
    } finally {
      await client.close();
    }
  }
  report.checks.push({
    name: "staff/admin/superadmin read succeeds; 15 creates/updates/deletes/role changes denied; unrelated collection denied; offline server read rejects instead of cached success",
    passed: true
  });
  const client = createCalendarEmulatorClient({
    local: true
  });
  try {
    await client.login("directory-a");
    const initial = await client.reader.read("2026-11-02", "2026-11-08");
    assert.equal(initial.complete, true);
    assert.equal(initial.data.events.length, 3);
    assert.deepEqual(initial.data.events.map(e => e.start).sort(), ["09:00", "15:00", "17:00"]);
    assert.equal(initial.people.length, 3);
    await client.reader.read("2026-11-03", "2026-11-03");
    assert.deepEqual(client.reader.stats(), {
      identity: 1,
      directory: 1,
      classrooms: 1,
      months: 1,
      cachedMonths: ["2026-11"]
    });
    const wider = await client.reader.read("2026-10-26", "2026-12-06");
    assert.equal(wider.data.events.length, 4);
    assert.equal(client.reader.stats().months, 3);
    assert.equal(client.reader.stats().directory, 1);
    await client.logout();
    await assert.rejects(client.reader.read("2026-11-03", "2026-11-03"), error => error.code === "unauthenticated");
    await client.login("directory-b");
    const switched = await client.reader.read("2026-11-03", "2026-11-03");
    assert.equal(switched.identity.id, "directory-b");
  } finally {
    await client.close();
  }
  report.checks.push({
    name: "real SDK Auth → scoped reads → adapter; active filter, UID/time preservation, monthly reuse, wider-window fetch, logout/account switch invalidation",
    passed: true
  });
  assert.throws(() => createCalendarEmulatorClient(), /localhost/);
  report.completed = true;
} finally {
  fs.writeFileSync(out + "/integration-report.json", JSON.stringify(report, null, 2));
}
console.log(`PASS Emulator integration: ${report.checks.length} groups, ${report.deniedWrites} denied writes`);
