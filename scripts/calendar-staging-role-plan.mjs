// Pure, narrowly scoped plans for the two explicitly approved staging QA identities.
export const ROLE_QA_TARGET = "labboy-workload-app-staging";
export const ROLE_QA_FIELDS = ["role", "active", "calendarWriter"];
const staffBefore = { role: "admin", active: true, calendarWriter: true };
const staffAfter = { role: "staff", active: true, calendarWriter: false };
const superAfter = { displayName: "ผู้ทดสอบ Superadmin", role: "superadmin", active: true, calendarWriter: true };
const fail = () => { throw new Error("Staging QA role precondition failed; no role change prepared"); };
function identity(value) {
  if (!value || !/^[A-Za-z0-9:_-]{1,128}$/.test(value.uid) || value.verifiedGoogle !== true) fail();
}
function sameFields(profile, expected) {
  return profile && Object.entries(expected).every(([key, value]) => profile.fields?.[key] === value);
}
function version(profile) {
  if (!profile || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,9})?Z$/.test(profile.updateTime)) fail();
  return profile.updateTime;
}
function scope(target, candidates) {
  if (target !== ROLE_QA_TARGET) fail();
  identity(candidates?.staff);identity(candidates?.superadmin);
  if (candidates.staff.uid === candidates.superadmin.uid) fail();
}
export function prepareQaRoleBaseline(target, candidates) {
  scope(target, candidates);
  if (!sameFields(candidates.staff.profile, staffBefore) || candidates.superadmin.profile !== null) fail();
  return { target, schemaVersion: 1, staff: { uid: candidates.staff.uid, updateTime: version(candidates.staff.profile), fields: { ...staffBefore } }, superadmin: { uid: candidates.superadmin.uid, profileExisted: false } };
}
export function planQaRoleWrites(baseline, action, current, checkpoint = {}) {
  scope(baseline?.target, current);
  if (baseline.schemaVersion !== 1 || baseline.staff?.uid !== current.staff.uid || baseline.superadmin?.uid !== current.superadmin.uid || baseline.superadmin.profileExisted !== false || !sameFields(baseline.staff, staffBefore)) fail();
  if (Object.keys(baseline.staff.fields).sort().join() !== [...ROLE_QA_FIELDS].sort().join()) fail();
  version(baseline.staff);
  const prefix = `projects/${ROLE_QA_TARGET}/databases/(default)/documents/users/`;
  function write(alias, values, previous) {
    return { update: { name: prefix + current[alias].uid, fields: Object.fromEntries(Object.entries(values).map(([key, value]) => [key, typeof value === "boolean" ? { booleanValue: value } : { stringValue: value }])) }, ...(previous ? { updateMask: { fieldPaths: Object.keys(values) }, currentDocument: { updateTime: version(previous) } } : { currentDocument: { exists: false } }) };
  }
  const staff = current.staff.profile, superadmin = current.superadmin.profile;
  if (action === "provision-superadmin") {
    if (checkpoint.superadminUpdateTime || checkpoint.staffUpdateTime || superadmin !== null || !sameFields(staff, staffBefore) || version(staff) !== baseline.staff.updateTime) fail();
    return [write("superadmin", superAfter, null)];
  }
  if (action === "set-staff") {
    if (checkpoint.staffUpdateTime || !checkpoint.superadminUpdateTime || !sameFields(superadmin, superAfter) || version(superadmin) !== checkpoint.superadminUpdateTime || !sameFields(staff, staffBefore) || version(staff) !== baseline.staff.updateTime) fail();
    return [write("staff", staffAfter, staff)];
  }
  if (action === "rollback") {
    if (checkpoint.rolledBack || !checkpoint.superadminUpdateTime || !sameFields(superadmin, superAfter) || version(superadmin) !== checkpoint.superadminUpdateTime) fail();
    const writes = [];
    if (checkpoint.staffUpdateTime) {
      if (!sameFields(staff, staffAfter) || version(staff) !== checkpoint.staffUpdateTime) fail();
      writes.push(write("staff", baseline.staff.fields, staff));
    } else if (!sameFields(staff, staffBefore) || version(staff) !== baseline.staff.updateTime) fail();
    writes.push(write("superadmin", { active: false, calendarWriter: false }, superadmin));
    return writes;
  }
  fail();
}
