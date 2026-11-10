// Privileged provisioning integration only, against loopback. Not user-rules evidence.
import assert from "node:assert/strict";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { prepareQaRoleBaseline, planQaRoleWrites, ROLE_QA_TARGET } from "./calendar-staging-role-plan.mjs";
const origin = "http://127.0.0.1:18080", project = "demo-calendar-role-provision";
const prefix = `projects/${project}/databases/(default)/documents/users/`;
const run = "qa-role-" + randomUUID().replaceAll("-", "");
const ids = { staff: run + "-staff", superadmin: run + "-superadmin" };
async function request(suffix, method = "GET", body) {
  const url = new URL(`/v1/projects/${project}/databases/(default)/documents${suffix}`, origin);
  assert.equal(url.origin, origin);assert.equal(url.hostname, "127.0.0.1");
  const response = await fetch(url, { method, headers: { Authorization: "Bearer owner", "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(12000) });
  return { status: response.status, body: await response.json() };
}
const encode = values => Object.fromEntries(Object.entries(values).map(([key, value]) => [key, typeof value === "boolean" ? { booleanValue: value } : { stringValue: value }]));
async function commit(writes) {
  // The pure planner only accepts the staging target. Remap its synthetic UIDs to a demo namespace.
  for (const write of writes) {
    const name = write.update?.name || write.delete;
    assert.ok(Object.values(ids).some(id => name === `projects/${ROLE_QA_TARGET}/databases/(default)/documents/users/${id}`));
  }
  const mapped = writes.map(write => ({ ...write, ...(write.update ? { update: { ...write.update, name: write.update.name.replace(`projects/${ROLE_QA_TARGET}/`, `projects/${project}/`) } } : { delete: write.delete.replace(`projects/${ROLE_QA_TARGET}/`, `projects/${project}/`) }) }));
  return request(":commit", "POST", { writes: mapped });
}
async function candidates() {
  const rows = {};
  for (const [alias, uid] of Object.entries(ids)) {
    const value = await request("/users/" + uid);
    assert.ok([200, 404].includes(value.status));
    rows[alias] = { uid, verifiedGoogle: true, profile: value.status === 404 ? null : { updateTime: value.body.updateTime, fields: Object.fromEntries(Object.entries(value.body.fields).map(([key, item]) => [key, item.stringValue ?? item.booleanValue])) } };
  }
  return rows;
}
const checks = [];
try {
  const seed = await request(":commit", "POST", { writes: [{ update: { name: prefix + ids.staff, fields: encode({ role: "admin", active: true, calendarWriter: true, unrelated: "preserve-me" }) }, currentDocument: { exists: false } }] });
  assert.equal(seed.status, 200);
  let current = await candidates();
  const baseline = prepareQaRoleBaseline(ROLE_QA_TARGET, current), create = planQaRoleWrites(baseline, "provision-superadmin", current);
  const superCommit = await commit(create);assert.equal(superCommit.status, 200);
  const checkpoint = { superadminUpdateTime: superCommit.body.writeResults[0].updateTime };
  const duplicate = await commit(create);assert.equal(duplicate.body.error?.status, "ALREADY_EXISTS");checks.push("Superadmin create-only rejects duplicate without overwrite");
  current = await candidates();
  const staffWrites = planQaRoleWrites(baseline, "set-staff", current, checkpoint);
  const stale = structuredClone(staffWrites);stale[0].currentDocument.updateTime = "2000-01-01T00:00:00Z";
  const conflict = await commit(stale);assert.equal(conflict.body.error?.status, "FAILED_PRECONDITION");
  assert.equal((await candidates()).staff.profile.fields.role, "admin");checks.push("server rejects stale updateTime and preserves Staff baseline");
  const staffCommit = await commit(staffWrites);assert.equal(staffCommit.status, 200);
  checkpoint.staffUpdateTime = staffCommit.body.writeResults[0].updateTime;
  current = await candidates();assert.equal(current.staff.profile.fields.role, "staff");assert.equal(current.staff.profile.fields.unrelated, "preserve-me");checks.push("masked Staff update preserves unrelated fields");
  const rolledBack = await commit(planQaRoleWrites(baseline, "rollback", current, checkpoint));assert.equal(rolledBack.status, 200);
  current = await candidates();assert.equal(current.staff.profile.fields.role, "admin");assert.equal(current.staff.profile.fields.unrelated, "preserve-me");assert.equal(current.superadmin.profile.fields.active, false);assert.equal(current.superadmin.profile.fields.calendarWriter, false);checks.push("atomic rollback restores Staff and revokes only the newly created Superadmin");
} finally {
  // Only synthetic profiles created by this run are eligible for cleanup.
  const current = await candidates();
  for (const [alias, value] of Object.entries(current)) if (value.profile) {
    assert.equal(value.uid, ids[alias]);
    const removed = await commit([{ delete: `projects/${ROLE_QA_TARGET}/databases/(default)/documents/users/${value.uid}`, currentDocument: { updateTime: value.profile.updateTime } }]);
    assert.equal(removed.status, 200);
  }
}
const report = { passed: true, endpoint: origin, project, cloudUsed: false, namespaceReset: false, calendarDocumentsWritten: 0, checks, temporaryProfilesRemoved: true, userRulesTested: false };
fs.mkdirSync("output/playwright/calendar-staging-role-qa", { recursive: true });
fs.writeFileSync("output/playwright/calendar-staging-role-qa/emulator-provision-report.json", JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report));
