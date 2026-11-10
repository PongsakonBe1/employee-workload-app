import { test } from "node:test";
import assert from "node:assert/strict";
import { ROLE_QA_TARGET, prepareQaRoleBaseline, planQaRoleWrites } from "./calendar-staging-role-plan.mjs";
const initial = () => ({ staff: { uid: "synthetic-staff", verifiedGoogle: true, profile: { updateTime: "2026-11-11T01:00:00.000000Z", fields: { role: "admin", active: true, calendarWriter: true, unrelated: "keep" } } }, superadmin: { uid: "synthetic-superadmin", verifiedGoogle: true, profile: null } });
const prepared = () => {
  const current = initial(), baseline = prepareQaRoleBaseline(ROLE_QA_TARGET, current);
  const created = planQaRoleWrites(baseline, "provision-superadmin", current)[0];
  current.superadmin.profile = { updateTime: "2026-11-11T01:01:00.123456Z", fields: Object.fromEntries(Object.entries(created.update.fields).map(([key, value]) => [key, value.stringValue ?? value.booleanValue])) };
  return { current, baseline, checkpoint: { superadminUpdateTime: current.superadmin.profile.updateTime } };
};
test("creates only an absent verified Superadmin, leaving the existing Admin unchanged", () => {
  const current = initial(), baseline = prepareQaRoleBaseline(ROLE_QA_TARGET, current), before = structuredClone(current);
  const writes = planQaRoleWrites(baseline, "provision-superadmin", current);
  assert.equal(writes.length, 1);assert.equal(writes[0].update.name.endsWith('/users/synthetic-superadmin'), true);
  assert.deepEqual(writes[0].currentDocument, { exists: false });assert.deepEqual(current, before);
  assert.equal(writes[0].update.fields.role.stringValue, "superadmin");
});
for (const [label, change] of [
  ["unverified identity", row => row.superadmin.verifiedGoogle = false],
  ["duplicate identities", row => row.superadmin.uid = row.staff.uid],
  ["path traversal UID", row => row.superadmin.uid = "bad/uid"],
  ["existing Superadmin profile", row => row.superadmin.profile = { fields: {} }],
  ["unexpected original Staff role", row => row.staff.profile.fields.role = "superadmin"],
  ["inactive original Staff", row => row.staff.profile.fields.active = false],
  ["missing original capability", row => delete row.staff.profile.fields.calendarWriter],
  ["missing profile version", row => delete row.staff.profile.updateTime],
]) test("baseline rejects " + label, () => { const row = initial();change(row);assert.throws(() => prepareQaRoleBaseline(ROLE_QA_TARGET, row)); });
test("never prepares a production or arbitrary project mutation", () => {
  assert.throws(() => prepareQaRoleBaseline("labboy-workload-app", initial()));
  const { baseline, current, checkpoint } = prepared();baseline.target = "other";
  assert.throws(() => planQaRoleWrites(baseline, "set-staff", current, checkpoint));
});
test("a modified baseline cannot introduce unrelated fields into a rollback", () => {
  const { baseline, current, checkpoint } = prepared();baseline.staff.fields.unrelated = "overwrite";
  assert.throws(() => planQaRoleWrites(baseline, "rollback", current, checkpoint));
});
test("Staff downgrade uses exactly three masked fields and the original updateTime", () => {
  const { baseline, current, checkpoint } = prepared();
  const [write] = planQaRoleWrites(baseline, "set-staff", current, checkpoint);
  assert.deepEqual(write.updateMask.fieldPaths, ["role", "active", "calendarWriter"]);
  assert.deepEqual(write.currentDocument, { updateTime: baseline.staff.updateTime });
  assert.deepEqual(write.update.fields, { role: { stringValue: "staff" }, active: { booleanValue: true }, calendarWriter: { booleanValue: false } });
});
for (const [label, change] of [
  ["Superadmin not provisioned", row => row.current.superadmin.profile = null],
  ["missing creation checkpoint", row => row.checkpoint = {}],
  ["concurrently modified Staff", row => row.current.staff.profile.updateTime = "2026-11-11T01:02:00Z"],
  ["concurrently modified Superadmin", row => row.current.superadmin.profile.updateTime = "2026-11-11T01:02:00Z"],
  ["unexpected capability", row => row.current.superadmin.profile.fields.calendarWriter = false],
  ["changed candidate identity", row => row.current.staff.uid = "another-synthetic"],
]) test("Staff change rejects " + label, () => { const row = prepared();change(row);assert.throws(() => planQaRoleWrites(row.baseline, "set-staff", row.current, row.checkpoint)); });
test("rollback restores original Staff fields and revokes the new Superadmin without deletion", () => {
  const { baseline, current, checkpoint } = prepared();
  const [staffWrite] = planQaRoleWrites(baseline, "set-staff", current, checkpoint);
  current.staff.profile = { updateTime: "2026-11-11T01:03:00Z", fields: Object.fromEntries(Object.entries(staffWrite.update.fields).map(([key, value]) => [key, value.stringValue ?? value.booleanValue])) };
  checkpoint.staffUpdateTime = current.staff.profile.updateTime;
  const writes = planQaRoleWrites(baseline, "rollback", current, checkpoint);
  assert.equal(writes.length, 2);assert.equal(writes[0].update.fields.role.stringValue, "admin");
  assert.deepEqual(writes[1].update.fields, { active: { booleanValue: false }, calendarWriter: { booleanValue: false } });
  assert.ok(writes.every(write => !write.delete && write.currentDocument.updateTime));
  checkpoint.rolledBack = true;assert.throws(() => planQaRoleWrites(baseline, "rollback", current, checkpoint));
});
test("rollback after only provisioning Superadmin leaves Staff untouched", () => {
  const { baseline, current, checkpoint } = prepared();
  const writes = planQaRoleWrites(baseline, "rollback", current, checkpoint);
  assert.equal(writes.length, 1);assert.equal(writes[0].update.name.endsWith('/users/synthetic-superadmin'), true);
});
