// Small real-cloud negative tests; fixed staging target and synthetic fixtures only.
import fs from "node:fs";
import assert from "node:assert/strict";
import { initializeApp, deleteApp } from "firebase/app";
import { initializeAuth, inMemoryPersistence, signOut } from "firebase/auth";
import { initializeFirestore, getDocFromServer, getDocsFromServer, collection, doc, setDoc, updateDoc, deleteDoc, terminate, setLogLevel } from "firebase/firestore";
import { validateCalendarStagingConfig } from "../frontend/lib/calendarStagingConfig.js";
setLogLevel("silent");
const config = validateCalendarStagingConfig(JSON.parse(fs.readFileSync("frontend/public/dev-staging-config.json", "utf8")));
const report = {
  completed: false,
  projectId: config.projectId,
  anonymousReadsDenied: 0,
  anonymousWritesDenied: 0,
  productionUsed: false
};
const app = initializeApp(config, "stage-negative-test"),
  auth = initializeAuth(app, {
    persistence: inMemoryPersistence
  }),
  db = initializeFirestore(app, {});
try {
  for (const name of ["users", "classroomSchedules", "dlExamSchedules"]) {
    await assert.rejects(getDocsFromServer(collection(db, name)), error => error.code === "permission-denied");
    report.anonymousReadsDenied++;
  }
  await assert.rejects(getDocFromServer(doc(db, "worklogs", "synthetic-only")), error => error.code === "permission-denied");
  report.anonymousReadsDenied++;
  for (const task of [() => setDoc(doc(db, "classroomSchedules", "forbidden-staging-fixture"), {
    subject: "Denied synthetic fixture"
  }), () => updateDoc(doc(db, "dlExamSchedules", "dl-morning"), {
    isActive: false
  }), () => deleteDoc(doc(db, "dlExamSchedules", "dl-evening"))]) {
    await assert.rejects(task(), error => error.code === "permission-denied");
    report.anonymousWritesDenied++;
  }
  report.completed = true;
} finally {
  await signOut(auth);
  await terminate(db);
  await deleteApp(app);
  fs.mkdirSync("output/playwright/calendar-staging-readonly", {
    recursive: true
  });
  fs.writeFileSync("output/playwright/calendar-staging-readonly/cloud-anonymous-report.json", JSON.stringify(report, null, 2));
}
console.log("PASS cloud staging anonymous reads/writes denied");
