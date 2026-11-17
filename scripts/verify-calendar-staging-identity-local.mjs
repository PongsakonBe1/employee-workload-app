// Fail-closed checks run with no CLI installation available, so fixtures cannot authenticate or mutate cloud.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
const root = process.cwd(), output = "output/playwright/calendar-staging-identity";
const parent = path.join(root, ".tools/calendar-staging");fs.mkdirSync(parent, { recursive: true });
const folder = fs.mkdtempSync(path.join(parent, "identity-guard-tests-"));
for (const directory of ["scripts", "deploy/calendar-staging"]) fs.mkdirSync(path.join(folder, directory), { recursive: true });
fs.copyFileSync("scripts/calendar-staging-identity.mjs", path.join(folder, "scripts/calendar-staging-identity.mjs"));
fs.copyFileSync("deploy/calendar-staging/iam-role.review.json", path.join(folder, "deploy/calendar-staging/iam-role.review.json"));
const source = JSON.parse(fs.readFileSync("deploy/calendar-staging/identity-manifest.review.json", "utf8"));
const cases = [
  ["closed apply window rejected", value => { value.status = "applied-and-verified"; }],
  ["production target rejected", value => { value.targetProjectId = "labboy-workload-app"; }],
  ["permission expansion rejected", value => { value.includedPermissions[6] = "iam.serviceAccountKeys.create"; }],
  ["identity outside staging rejected", value => { value.serviceAccountEmail = "qa@example.invalid"; }],
  ["writer enablement drift rejected", value => { value.enableApiWriter = true; }]
];
const checks = [];
for (const [name, mutate] of cases) {
  const value = structuredClone(source);value.status = "approved-pending-apply";mutate(value);
  fs.writeFileSync(path.join(folder, "deploy/calendar-staging/identity-manifest.review.json"), JSON.stringify(value));
  const result = spawnSync(process.execPath, ["scripts/calendar-staging-identity.mjs", "--account", "qa@example.invalid", "--apply"], { cwd: folder, env: { ...process.env, APPDATA: path.join(folder, "no-cli"), FIREBASE_TOKEN: "", GOOGLE_APPLICATION_CREDENTIALS: "" }, windowsHide: true, encoding: "utf8", timeout: 5000 });
  assert.equal(result.status, 1, name);assert.match(result.stderr, /AssertionError/, name + " must fail before CLI loading");
  assert.ok(!fs.existsSync(path.join(folder, "output")), "Guard failure must precede authenticated command/report execution");checks.push(name);
}
const report = { passed: true, checks, cloudUsed: false, cliAvailableInFixtures: false, credentialsUsed: false };
fs.mkdirSync(output, { recursive: true });fs.writeFileSync(path.join(output, "local-guard-report.json"), JSON.stringify(report, null, 2) + "\n");console.log(JSON.stringify(report));
