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
