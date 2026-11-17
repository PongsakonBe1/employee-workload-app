// Approved staging identity only. Use the installed CLI session without reading credentials or tokens.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const target = "labboy-workload-app-staging", output = "output/playwright/calendar-staging-identity";
const manifest = JSON.parse(fs.readFileSync("deploy/calendar-staging/identity-manifest.review.json", "utf8"));
const draft = JSON.parse(fs.readFileSync("deploy/calendar-staging/iam-role.review.json", "utf8"));
const accountAt = process.argv.indexOf("--account"), account = accountAt < 0 ? null : process.argv[accountAt + 1];
const apply = process.argv.includes("--apply");
const resume = process.argv.includes("--resume-binding");
if (resume && !apply) throw new Error("Resume requires the approved apply mode");
if (!account || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account)) throw new Error("Explicit CLI account required; never supply tokens");
assert.equal(manifest.targetProjectId, target);
assert.equal(manifest.serviceAccountId, "calendar-staging-server");
assert.equal(manifest.serviceAccountEmail, `${manifest.serviceAccountId}@${target}.iam.gserviceaccount.com`);
assert.equal(manifest.customRoleName, `projects/${target}/roles/calendarStagingServerPilot`);
assert.equal(manifest.bindingResource, `projects/${target}`);
assert.equal(manifest.bindingMember, "serviceAccount:" + manifest.serviceAccountEmail);
assert.equal(manifest.includedPermissions.length, 7);
assert.deepEqual([...manifest.includedPermissions].sort(), [...draft.includedPermissions].sort());
for (const key of ["createKeys", "changeBillingPlan", "changeRules", "changeProfiles", "enableApiWriter", "changeProduction"]) assert.equal(manifest[key], false);
if (apply) assert.equal(manifest.status, "approved-pending-apply");
delete process.env.FIREBASE_TOKEN;
delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
const require = createRequire(path.join(process.env.APPDATA, "npm/node_modules/firebase-tools/package.json"));
assert.equal(require("./package.json").version, "15.18.0");
const { Command } = require("./lib/command"), { requireAuth } = require("./lib/requireAuth"), { Client } = require("./lib/apiv2");
const iam = new Client({ urlPrefix: "https://iam.googleapis.com", apiVersion: "v1" });
const resources = new Client({ urlPrefix: "https://cloudresourcemanager.googleapis.com", apiVersion: "v1" });
const servicePath = `/projects/${target}/serviceAccounts/${manifest.serviceAccountEmail}`;
const rolePath = "/" + manifest.customRoleName;
const readPolicy = async () => (await resources.post(`/projects/${target}:getIamPolicy`, { options: { requestedPolicyVersion: 3 } })).body;
const directBindings = policy => (policy.bindings || []).filter(row => (row.members || []).includes(manifest.bindingMember));
function normalizedBindings(policy, stripApprovedMember = false) {
  return (policy.bindings || []).map(row => ({ ...row, members: row.members.filter(member => !(stripApprovedMember && row.role === manifest.customRoleName && !row.condition && member === manifest.bindingMember)).sort() }))
    .filter(row => row.members.length).map(row => JSON.stringify(row)).sort();
}
let created = false, bindingWriteAttempted = false, stage = "authentication", policyBackupFile;
const command = new Command("calendar-staging-identity").before(requireAuth).before(options => {
  assert.equal(options.project, target);assert.equal(options.user?.email, account);
}).action(async () => {
  stage = "preflight";
  const role = (await iam.get(rolePath, { queryParams: { fields: "name,includedPermissions,deleted" } })).body;
  assert.equal(role.name, manifest.customRoleName);assert.ok(!role.deleted);
  assert.deepEqual([...role.includedPermissions].sort(), [...manifest.includedPermissions].sort());
  const before = await readPolicy();assert.ok(before.etag, "Require optimistic concurrency protection");
  let service;
  try { service = (await iam.get(servicePath, { queryParams: { fields: "name,email,disabled" } })).body; }
  catch (error) { if (error.status !== 404) throw error; }
  if (!apply && manifest.status === "applied-and-verified") assert.ok(service, "An applied identity must still exist");
  if (apply) {
    // Do not adopt or modify an existing identity whose history has not been reviewed.
    if (resume) {
      const previous = JSON.parse(fs.readFileSync(path.join(output, "identity-failure-report.json"), "utf8"));
      assert.equal(previous.targetProjectId, target);assert.equal(previous.createdIdentityThisRun, true);assert.equal(previous.stage, "bind-role");
      assert.ok(service, "The identity created by this phase must still exist");
      const detail = (await iam.get(servicePath, { queryParams: { fields: "email,disabled,displayName,description" } })).body;
      assert.equal(detail.email, manifest.serviceAccountEmail);assert.ok(!detail.disabled);
      assert.equal(detail.displayName, manifest.serviceAccountDisplayName);assert.equal(detail.description, manifest.serviceAccountDescription);
      const existingKeys = (await iam.get(servicePath + "/keys", { queryParams: { keyTypes: "USER_MANAGED", fields: "keys(keyType)" } })).body.keys || [];
      assert.equal(existingKeys.length, 0);
    } else assert.ok(!service, "Identity already exists: inspect it read-only instead of recreating/adopting it");
    assert.equal(directBindings(before).length, 0);
    fs.mkdirSync(".tools/calendar-staging", { recursive: true });
    policyBackupFile = `.tools/calendar-staging/identity-policy-before-${Date.now()}.json`;
    // Private local recovery metadata may include existing principals; never print or commit it.
    fs.writeFileSync(policyBackupFile, JSON.stringify(before, null, 2) + "\n", { flag: "wx" });
    if (!resume) {
      stage = "create-identity";
      service = (await iam.post(`/projects/${target}/serviceAccounts`, { accountId: manifest.serviceAccountId, serviceAccount: { displayName: manifest.serviceAccountDisplayName, description: manifest.serviceAccountDescription } })).body;
      created = true;assert.equal(service.email, manifest.serviceAccountEmail);assert.ok(!service.disabled);
    }
    // Preserve the whole versioned policy, including unrelated conditional bindings.
    const next = structuredClone(before);next.bindings ||= [];
    let binding = next.bindings.find(row => row.role === manifest.customRoleName && !row.condition);
    if (!binding) { binding = { role: manifest.customRoleName, members: [] };next.bindings.push(binding); }
    binding.members.push(manifest.bindingMember);
    assert.deepEqual(normalizedBindings(next, true), normalizedBindings(before));
    stage = "bind-role";bindingWriteAttempted = true;
    await resources.post(`/projects/${target}:setIamPolicy`, { policy: next });
  }
  stage = "read-back";
  const after = await readPolicy(), bindings = directBindings(after);
  if (apply) assert.deepEqual(normalizedBindings(after, true), normalizedBindings(before), "Unrelated IAM bindings must be preserved");
  if (service) {
    service = (await iam.get(servicePath, { queryParams: { fields: "name,email,disabled" } })).body;
    assert.equal(service.email, manifest.serviceAccountEmail);assert.ok(!service.disabled);
    assert.equal(bindings.length, 1);assert.equal(bindings[0].role, manifest.customRoleName);assert.ok(!bindings[0].condition);
  }
  const keys = service ? (await iam.get(servicePath + "/keys", { queryParams: { keyTypes: "USER_MANAGED", fields: "keys(keyType,disabled)" } })).body.keys || [] : [];
  assert.equal(keys.length, 0, "No user-managed key may exist in this phase");
  let baselineVerification;
  if (process.argv.includes("--verify-baseline")) {
    assert.ok(!apply, "Baseline verification is read-only");
    const backups = fs.readdirSync(".tools/calendar-staging").filter(file => /^identity-policy-before-\d+\.json$/.test(file));
    assert.ok(backups.length, "Private pre-change policy snapshots required");
    for (const file of backups) {
      const original = JSON.parse(fs.readFileSync(path.join(".tools/calendar-staging", file), "utf8"));
      assert.deepEqual(normalizedBindings(after, true), normalizedBindings(original), "Only the approved role/member may differ from the original snapshots");
    }
    baselineVerification = { passed: true, privateSnapshotsCompared: backups.length, onlyApprovedBindingAdded: true };
  }
  const report = { passed: true, observedAt: new Date().toISOString(), targetProjectId: target, mode: apply ? "apply" : "read-only", serviceAccountEmail: manifest.serviceAccountEmail, serviceAccountExists: Boolean(service), serviceAccountEnabled: service ? !service.disabled : false, customRoleName: role.name, includedPermissions: role.includedPermissions, roleMatchesApprovedDraft: true, directProjectBindings: bindings.map(row => ({ role: row.role, conditional: Boolean(row.condition) })), userManagedKeyCount: keys.length, createdIdentityThisRun: created, resumedOwnCreatedIdentity: resume, bindingWriteAttempted, ...(apply ? { unrelatedIamBindingsPreserved: true, etagUsed: true, privateLocalPolicyBackupCreated: Boolean(policyBackupFile) } : {}), ...(baselineVerification ? { baselineVerification } : {}), credentialMaterialRead: false, firestoreDocumentsRead: false, rulesChanged: false, profilesChanged: false, productionChanged: false, billingChanged: false, effectiveInheritedPermissionsEvaluated: false };
  fs.mkdirSync(output, { recursive: true });fs.writeFileSync(path.join(output, apply ? "identity-apply-report.json" : "identity-readback-report.json"), JSON.stringify(report, null, 2) + "\n");console.log(JSON.stringify(report));
});
try { await command.runner()({ project: target, account, json: true, nonInteractive: true, cwd: process.cwd() }); }
catch (error) {
  // An ambiguous IAM response must be inspected, never retried with a broader policy or role.
  const message = String(error.message || "");
  const reasonCategory = /service account.*does not exist/i.test(message) ? "identity-not-yet-visible" : /role.*does not exist|role.*not found/i.test(message) ? "role-not-visible" : /permission|not authorized/i.test(message) ? "permission-rejected" : /invalid/i.test(message) ? "invalid-request" : "unclassified";
  fs.mkdirSync(output, { recursive: true });const report = { passed: false, targetProjectId: target, stage, createdIdentityThisRun: created, bindingWriteAttempted, status: error.status || null, errorType: error.name, reasonCategory, credentialMaterialRead: false, automaticBroadRetry: false };
  const failureFile = resume ? "identity-resume-failure-report.json" : apply ? "identity-failure-report.json" : "identity-readback-failure-report.json";
  fs.writeFileSync(path.join(output, failureFile), JSON.stringify(report, null, 2) + "\n");console.log(JSON.stringify(report));process.exitCode = 1;
}
