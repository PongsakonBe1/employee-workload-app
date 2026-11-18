// A signed SDK and local Admin setup exercise the deployed path roles on a fresh demo Emulator.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { initializeApp as initializeAdmin, deleteApp as deleteAdmin } from "firebase-admin/app";
import { getAuth as adminAuth } from "firebase-admin/auth";
import { FieldPath, getFirestore as adminFirestore } from "firebase-admin/firestore";
import { initializeApp, deleteApp } from "firebase/app";
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { collection, connectFirestoreEmulator, deleteDoc, doc, getDocFromServer, getDocsFromServer, getFirestore, limit, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { indexedWorklogEdit, withWorklogResourceIndex } from "../frontend/lib/resourceStatusIndex.js";
import { backfillResourceStatus } from "../backend/src/services/resourceStatusBackfill.js";
import { createResourceStatusHandler } from "../backend/src/services/resourceStatusHandler.js";
import { createTrustedCalendarApp } from "../calendar-server/src/app.js";

const projectId = "demo-worklog-workspace";
const authHost = "127.0.0.1:19218";
const firestoreHost = "127.0.0.1:18218";
process.env.FIREBASE_AUTH_EMULATOR_HOST = authHost;
process.env.FIRESTORE_EMULATOR_HOST = firestoreHost;
process.env.GCLOUD_PROJECT = projectId;
delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
const server = initializeAdmin({ projectId });
const identities = [];
const roleDocument = (email, role, active = true) => ({ email, role, active });
const ensureDenied = promise => assert.rejects(promise, error => error.code === "permission-denied");

async function connect(uid, role, { verified = true, active = true, domain = "example.test" } = {}) {
  const email = `${uid}@${domain}`;
  const password = crypto.randomUUID();
  await adminAuth(server).createUser({ uid, email, password, emailVerified: verified });
  if (role) await adminFirestore(server).doc(`users/${uid}`).create(roleDocument(email, role, active));
  const app = initializeApp({ projectId, apiKey: "demo-key" }, uid);
  identities.push(app);
  const auth = getAuth(app);
  connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, "127.0.0.1", 18218);
  await signInWithEmailAndPassword(auth, email, password);
  return { uid, email, db, auth };
}

const users = client => collection(client.db, "users");
const profile = (client, uid = client.uid) => doc(users(client), uid);
const pending = (client, uid = client.uid) => doc(client.db, "pendingUsers", uid);
const worklog = (client, id) => doc(client.db, "worklogs", id);

async function readStatus(client, expected) {
  const token = await client?.auth.currentUser.getIdToken();
  const response = await fetch("http://127.0.0.1:4318/api/resource-status", {
    redirect: "error", signal: AbortSignal.timeout(14000),
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  assert.equal(response.status, expected);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  return expected === 200 ? response.json() : null;
}

async function waitForStatus(client, expected) {
  for (let attempt = 0; attempt < 12; attempt++) {
    const status = await readStatus(client, 200);
    if (expected(status)) return status;
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  throw Error("The shared projection did not observe a worklog change");
}

async function populateLegacyHistory(db, employeeId) {
  const logs = db.collection("worklogs");
  const older = db.batch();
  const common = { employeeId, date: "2026-10-01", time: "08:00", mainDuty: "QA legacy" };
  older.create(logs.doc("qa-archive-room"), { ...common, minorTask: "เปิดห้องเรียนชั้น 4", comment: "ห้อง 406" });
  older.create(logs.doc("qa-archive-headset"), { ...common, minorTask: "ยืมหูฟัง", comment: "ICIT12", recipient: "0000000000012", createdAt: new Date("2026-10-01T01:00:00Z") });
  older.create(logs.doc("qa-archive-power"), { ...common, minorTask: "คืนปลั๊กไฟ", comment: "ICIT21", equipmentCondition: "lost", createdAt: new Date("2026-10-01T01:00:01Z") });
  await older.commit();
  for (let offset = 0; offset < 503; offset += 200) {
    const batch = db.batch();
    for (let index = offset; index < Math.min(offset + 200, 503); index++) {
      batch.create(logs.doc(`qa-recent-${index}`), {
        employeeId, date: "2026-11-18", time: "09:00", mainDuty: "QA", minorTask: "QA general activity",
        createdAt: new Date(Date.parse("2026-11-18T02:00:00Z") + index)
      });
    }
    await batch.commit();
  }
}

async function verifyStagingRoute(resourceStatusEnabled) {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const apiOrigin = `http://127.0.0.1:${server.address().port}`;
  const allowed = "http://127.0.0.1:4311";
  let sdkCalls = 0;
  const resourceStatus = createResourceStatusHandler(() => { sdkCalls++;throw Error("Anonymous request must not access SDK"); });
  server.on("request", createTrustedCalendarApp({
    runtime: { mode: "staging", projectId, apiOrigin, origins: [allowed], writable: false, connectivity: false, resourceStatus: resourceStatusEnabled },
    resourceStatus
  }));
  const request = (path, method = "GET", origin = allowed) => fetch(apiOrigin + path, {
    method, redirect: "error", signal: AbortSignal.timeout(6000), headers: { Origin: origin }
  });
  try {
    assert.equal((await request("/health")).status, 200);
    assert.equal((await request("/api/resource-status")).status, resourceStatusEnabled ? 401 : 404);
    assert.equal((await request("/api/resource-status", "POST")).status, 404);
    assert.equal((await request("/api/resource-status", "GET", "https://unreviewed.example.test")).status, 403);
    const preflight = await request("/api/resource-status", "OPTIONS");
    if (resourceStatusEnabled) assert.equal(preflight.headers.get("Access-Control-Allow-Methods"), "GET, OPTIONS");
    assert.equal((await request("/api/calendar/create", "POST")).status, 503);
    assert.equal(sdkCalls, 0);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

try {
  await verifyStagingRoute(false);
  await verifyStagingRoute(true);
  console.log("PASS staging HTTP wiring: default off, GET requires auth, Calendar writer stays off");
  const staff = await connect("qa-role-staff-a", "staff");
  const other = await connect("qa-role-staff-b", "staff");
  const admin = await connect("qa-role-admin", "admin");
  const superadmin = await connect("qa-role-superadmin", "superadmin");
  const inactive = await connect("qa-role-inactive", "admin", { active: false });
  const unverified = await connect("qa-role-unverified", "admin", { verified: false });
  const waiting = await connect("qa-role-waiting", null, { domain: "icit.kmutnb.ac.th" });
  const legacy = await connect("qa-role-migrate", null);
  await adminFirestore(server).doc("users/qa-role-old").create(roleDocument(legacy.email, "staff"));

  await ensureDenied(setDoc(profile(waiting), roleDocument(waiting.email, "staff")));
  await ensureDenied(setDoc(profile(waiting), roleDocument(superadmin.email, "superadmin")));
  await ensureDenied(setDoc(profile(waiting, other.uid), roleDocument(waiting.email, "staff")));
  await ensureDenied(getDocsFromServer(users(waiting)));
  await ensureDenied(getDocFromServer(profile(waiting, other.uid)));
  assert.equal((await getDocFromServer(profile(waiting))).exists(), false);
  await setDoc(pending(waiting), { uid: waiting.uid, email: waiting.email, status: "pending" });
  assert((await getDocFromServer(pending(waiting))).exists());
  await ensureDenied(updateDoc(pending(waiting), { status: "approved" }));
  await ensureDenied(getDocFromServer(pending(staff, waiting.uid)));
  assert((await getDocFromServer(pending(admin, waiting.uid))).exists());

  const resourceLog = (employeeId, minorTask, data = {}) => ({
    employeeId, date: "2026-11-19", time: "09:00", minorTask, mainDuty: "QA",
    createdAt: new Date(), ...data
  });
  const student = "0123456789012";
  await readStatus(null, 401);
  await readStatus(waiting, 403);
  await readStatus(inactive, 403);
  await readStatus(unverified, 403);
  await readStatus(staff, 503);
  const fixtureDb = adminFirestore(server);
  await populateLegacyHistory(fixtureDb, admin.uid);
  assert.deepEqual(await backfillResourceStatus(fixtureDb, FieldPath.documentId()), { inspected: 506, candidates: 3, indexed: 3 });
  assert.deepEqual(await backfillResourceStatus(fixtureDb, FieldPath.documentId()), { inspected: 506, candidates: 3, indexed: 0 });
  const historic = await readStatus(other, 200);
  assert.equal(historic.roomStatus[406], "in_use");
  assert.equal(historic.equipmentStatus.headphones.ICIT12, "in_use");
  assert.equal(historic.equipmentConditions.ICIT21, "lost");
  console.log("PASS older open room, outstanding loan and lost condition survive 503 newer worklogs; backfill replay writes no worklogs");

  const writeResource = (client, id, task, fields) => setDoc(worklog(client, id), withWorklogResourceIndex(resourceLog(client.uid, task, fields)));
  await ensureDenied(setDoc(worklog(staff, "qa-role-plain"), resourceLog(staff.uid, "QA no index")));
  await writeResource(staff, "qa-role-room", "เปิดห้องเรียนชั้น 4", { room: "402" });
  await writeResource(staff, "qa-role-loan", "ยืม USB", { equipment: "ICIT27", recipient: student, comment: "QA private detail" });
  await ensureDenied(getDocFromServer(worklog(other, "qa-role-loan")));
  await ensureDenied(getDocFromServer(worklog(waiting, "qa-role-loan")));
  await ensureDenied(getDocsFromServer(collection(other.db, "worklogs")));
  await ensureDenied(setDoc(worklog(waiting, "qa-role-new"), resourceLog(waiting.uid, "QA pending")));
  await ensureDenied(updateDoc(worklog(staff, "qa-role-loan"), { employeeId: other.uid }));
  await ensureDenied(updateDoc(worklog(other, "qa-role-loan"), { comment: "not an owner" }));
  const ownWorklogs = await getDocsFromServer(query(collection(staff.db, "worklogs"), where("employeeId", "==", staff.uid)));
  assert.equal(ownWorklogs.size, 2);
  assert.equal((await getDocsFromServer(query(collection(admin.db, "worklogs"), limit(3)))).size, 3);

  const active = await waitForStatus(other, value => value.roomStatus[402] === "in_use" && value.equipmentStatus.usb.ICIT27 === "in_use");
  assert.equal(active.details.ICIT27.user, student);
  assert(!JSON.stringify(active).includes("QA private detail"));
  assert(!JSON.stringify(active).includes(staff.uid));
  await writeResource(other, "qa-role-return", "คืน USB", { equipment: "ICIT27", recipient: active.details.ICIT27.user, equipmentCondition: "normal" });
  await writeResource(other, "qa-role-close", "ปิดห้องเรียนชั้น 4", { room: "402" });
  const complete = await waitForStatus(staff, value => value.roomStatus[402] === "available" && value.equipmentStatus.usb.ICIT27 === "available");
  assert(!JSON.stringify(complete).includes(student));
  await writeResource(other, "qa-role-return-retry", "คืน USB", { equipment: "ICIT27", recipient: student, equipmentCondition: "damaged" });
  await waitForStatus(staff, value => value.equipmentStatus.usb.ICIT27 === "available" && value.equipmentConditions.ICIT27 === "damaged");
  await deleteDoc(worklog(other, "qa-role-return-retry"));
  await waitForStatus(staff, value => value.equipmentStatus.usb.ICIT27 === "available" && value.equipmentConditions.ICIT27 === "normal");
  await deleteDoc(worklog(other, "qa-role-return"));
  await waitForStatus(staff, value => value.equipmentStatus.usb.ICIT27 === "in_use" && value.details.ICIT27.user === student);
  const loanRef = worklog(staff, "qa-role-loan");
  const before = (await getDocFromServer(loanRef)).data();
  await ensureDenied(updateDoc(loanRef, { comment: "ยืม USB ICIT29" }));
  await updateDoc(loanRef, indexedWorklogEdit(before, { comment: "ยืม USB ICIT28", updatedAt: serverTimestamp() }));
  await waitForStatus(other, value => value.equipmentStatus.usb.ICIT27 === "available" && value.equipmentStatus.usb.ICIT28 === "in_use");
  await writeResource(other, "qa-role-return-final", "คืน USB", { equipment: "ICIT28", recipient: student });
  await waitForStatus(staff, value => value.equipmentStatus.usb.ICIT28 === "available");
  console.log("PASS indexed edit, duplicate return and Undo recompute the affected assets");
  const templates = adminFirestore(server).collection("globalTemplates");
  const defaults = { isActive: true, active: true, department: null, usageCount: 0, mainDuty: "QA", dutyGroup: "main", isSmart: true };
  await templates.doc("qa-scope-room").create({ ...defaults, name: "QA ห้องชั้น 4", minorTask: "เปิดห้องเรียนชั้น 4" });
  await templates.doc("qa-scope-equipment").create({ ...defaults, name: "QA หูฟัง", minorTask: "ยืมหูฟัง", requireRecipient: true });
  console.log("PASS active cross-account room/loan state without access to other Staff worklogs");
  for (const forbidden of [inactive, unverified]) {
    await ensureDenied(setDoc(profile(forbidden, `${forbidden.uid}-new`), roleDocument(staff.email, "staff")));
  }
  await ensureDenied(updateDoc(profile(staff), { role: "admin" }));
  await ensureDenied(updateDoc(profile(admin, superadmin.uid), { role: "staff" }));
  await updateDoc(profile(superadmin, staff.uid), { displayName: "QA Staff A" });
  await updateDoc(profile(staff), { nickname: "QA nickname" });
  const old = await getDocsFromServer(query(users(legacy), where("email", "==", legacy.email)));
  assert.deepEqual(old.docs.map(snapshot => snapshot.id), ["qa-role-old"]);
  const migration = { email: legacy.email, uid: legacy.uid, active: true, migratedFrom: "qa-role-old" };
  await ensureDenied(setDoc(profile(legacy), { ...migration, role: "admin" }));
  await setDoc(profile(legacy), { ...migration, role: "staff" });
  await setDoc(profile(admin, waiting.uid), roleDocument(waiting.email, "staff"));
  assert.equal((await getDocFromServer(profile(waiting))).data().active, true);
  console.log("PASS verified approval and legacy migration; pending, inactive, unverified and role changes rejected");
} finally {
  await Promise.all(identities.map(deleteApp));
  await deleteAdmin(server);
}
