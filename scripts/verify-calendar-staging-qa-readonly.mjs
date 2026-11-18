// Real staging denial checks with no login and no write API. Only nonexistent QA references.
import fs from "node:fs";
import assert from "node:assert/strict";
import { initializeApp, deleteApp } from "firebase/app";
import { initializeAuth, inMemoryPersistence, signOut } from "firebase/auth";
import { initializeFirestore, getDocFromServer, doc, terminate, setLogLevel } from "firebase/firestore";
import { validateCalendarStagingConfig } from "../frontend/lib/calendarStagingConfig.js";
setLogLevel("silent");
const config = validateCalendarStagingConfig(JSON.parse(fs.readFileSync(".tools/calendar-staging/web-sdk-config.json", "utf8")));
const app = initializeApp(config, "calendar-cloud-qa-readonly"), auth = initializeAuth(app, { persistence: inMemoryPersistence }), db = initializeFirestore(app, {});
const report = { completed: false, project: config.projectId, authenticated: false, deniedReads: 0, realDocumentReferencesUsed: false, writeCalls: 0, productionUsed: false, checks: [] };
try {
  assert.equal(auth.currentUser, null);
  for (const collection of ["users", "classroomSchedules", "dlExamSchedules", "calendarWriteState"]) {
    await assert.rejects(getDocFromServer(doc(db, collection, "QA-CLOUD-READ-DENIAL")), error => error.code === "permission-denied");
    report.deniedReads++;report.checks.push({ collection, denied: true });
  }
  report.completed = true;
} finally {
  await signOut(auth);await terminate(db);await deleteApp(app);
  fs.mkdirSync("output/playwright/calendar-role-concurrency-qa", { recursive: true });
  fs.writeFileSync("output/playwright/calendar-role-concurrency-qa/cloud-readonly-report.json", JSON.stringify(report, null, 2));
}
console.log("PASS staging anonymous boundary: 4 SDK reads denied; no sign-in, real-record reads or writes");
