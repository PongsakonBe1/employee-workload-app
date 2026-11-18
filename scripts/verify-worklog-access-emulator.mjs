// A signed SDK and local Admin setup exercise the deployed path roles on a fresh demo Emulator.
import assert from "node:assert/strict";
import { initializeApp as initializeAdmin, deleteApp as deleteAdmin } from "firebase-admin/app";
import { getAuth as adminAuth } from "firebase-admin/auth";
import { getFirestore as adminFirestore } from "firebase-admin/firestore";
import { initializeApp, deleteApp } from "firebase/app";
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { collection, connectFirestoreEmulator, doc, getDocFromServer, getDocsFromServer, getFirestore, query, setDoc, updateDoc, where } from "firebase/firestore";

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

try {
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
  await setDoc(worklog(staff, "qa-role-room"), resourceLog(staff.uid, "เปิดห้องเรียนชั้น 4", { room: "402" }));
  await setDoc(worklog(staff, "qa-role-loan"), resourceLog(staff.uid, "ยืม USB", { equipment: "ICIT27", recipient: student, comment: "QA private detail" }));
  await ensureDenied(getDocFromServer(worklog(other, "qa-role-loan")));
  await ensureDenied(getDocFromServer(worklog(waiting, "qa-role-loan")));
  await ensureDenied(getDocsFromServer(collection(other.db, "worklogs")));
  await ensureDenied(setDoc(worklog(waiting, "qa-role-new"), resourceLog(waiting.uid, "QA pending")));
  await ensureDenied(updateDoc(worklog(staff, "qa-role-loan"), { employeeId: other.uid }));
  await ensureDenied(updateDoc(worklog(other, "qa-role-loan"), { comment: "not an owner" }));
  const ownWorklogs = await getDocsFromServer(query(collection(staff.db, "worklogs"), where("employeeId", "==", staff.uid)));
  assert.equal(ownWorklogs.size, 2);
  assert.equal((await getDocsFromServer(collection(admin.db, "worklogs"))).size, 2);

  const active = await waitForStatus(other, value => value.roomStatus[402] === "in_use" && value.equipmentStatus.usb.ICIT27 === "in_use");
  assert.equal(active.details.ICIT27.user, student);
  assert(!JSON.stringify(active).includes("QA private detail"));
  assert(!JSON.stringify(active).includes(staff.uid));
  await setDoc(worklog(other, "qa-role-return"), resourceLog(other.uid, "คืน USB", { equipment: "ICIT27", recipient: active.details.ICIT27.user }));
  await setDoc(worklog(other, "qa-role-close"), resourceLog(other.uid, "ปิดห้องเรียนชั้น 4", { room: "402" }));
  const complete = await waitForStatus(staff, value => value.roomStatus[402] === "available" && value.equipmentStatus.usb.ICIT27 === "available");
  assert(!JSON.stringify(complete).includes(student));
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
