// Read-only audit command. No deployment, Firestore commit, credential-file or token access.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { assertTrustedReviewRead, reviewTextHash, reviewValueHash, TRUSTED_REVIEW_PROJECT } from "./calendar-trusted-cloud-plan.mjs";
import { auditTrustedCheckpoint } from "./calendar-trusted-audit-plan.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), target = TRUSTED_REVIEW_PROJECT;
const [operator, checkpoint, mode, ...extra] = process.argv.slice(2), completed = Number(checkpoint), renewedPrecutover = mode === "--renewed-precutover", beforeCutover = mode === "--before-cutover" || renewedPrecutover, trustedWindow = mode === "--trusted-window";
const renewedCutover = mode === "--renewed-cutover";
const writerSmoke = mode === "--writer-smoke";
assert.match(operator || "", /^[^\s@]+@[^\s@]+\.[^\s@]+$/);assert.match(checkpoint || "", /^[0-5]$/);
assert(extra.length === 0 && [undefined, "--before-cutover", "--renewed-precutover", "--renewed-cutover", "--trusted-window", "--writer-smoke"].includes(mode));assert(trustedWindow || writerSmoke || completed === 0);
const base = path.join(root, ".tools/calendar-staging/trusted-writer-baseline");
const snapshot = JSON.parse(fs.readFileSync(path.join(base, "prepared.json"), "utf8"));
const baseline = JSON.parse(fs.readFileSync(path.join(root, "output/playwright/calendar-trusted-writer-baseline/baseline-report.json"), "utf8"));
assert.equal(reviewValueHash(snapshot), baseline.privateSnapshotHash);assert.equal(reviewValueHash(snapshot.frozen), baseline.frozenHash);
assert.equal(snapshot.target, target);assert.equal(snapshot.database, "(default)");
assert.equal(snapshot.candidateRulesHash, "4762054e74b3723bc4345f351b01bb43ee450ae8c7e6a399c4fd6473b717a1c7");
const directory = path.join(root, ".tools/calendar-staging/trusted-writer-audit");fs.mkdirSync(directory, { recursive: true });
const latestPath = path.join(directory, "latest.json"), ledgerPath = path.join(directory, "read-ledger.json");
assert(!beforeCutover || !fs.existsSync(latestPath), "Never return to the legacy baseline after a candidate checkpoint");
const latest = fs.existsSync(latestPath) ? JSON.parse(fs.readFileSync(latestPath, "utf8")) : null;
if (latest) assert.equal(reviewValueHash(latest.audit), latest.auditHash);
assert(writerSmoke ? latest?.audit.completed === 0 : latest ? [latest.audit.completed, latest.audit.completed + 1].includes(completed) : completed === 0);
const ledger = fs.existsSync(ledgerPath) ? JSON.parse(fs.readFileSync(ledgerPath, "utf8")) : { target, contextHash: baseline.privateSnapshotHash, attempts: [] };
assert.equal(ledger.target, target);assert.equal(ledger.contextHash, baseline.privateSnapshotHash);
const approvedCutoverManifestHash = "fc3c8b4a161941707dda95f0e6178b37b811d50555854678bd9dbc3df6b135a3";
if (renewedPrecutover) {
  const approval = JSON.parse(fs.readFileSync(path.join(root, "output/playwright/calendar-staging-cutover-verify/execution-progress.json"), "utf8"));
  assert.equal(approval.target, target);assert.equal(approval.approvedManifestSha256, approvedCutoverManifestHash);
  assert.equal(approval.explicitActionApproval?.additionalPreAuditApproved, true);assert.equal(approval.explicitActionApproval?.maximumTotalAuditReadRequests, 28);
  assert.equal(ledger.attempts.filter(row => row.beforeCutover).length, 1, "Renewed approval permits exactly one additional pre-audit");
}
if (renewedCutover) {
  const execution = JSON.parse(fs.readFileSync(path.join(root, "output/playwright/calendar-staging-cutover-verify/execution-progress.json"), "utf8"));
  const approval = execution.renewedCutoverApproval;
  assert.equal(execution.target, target);
  assert.equal(execution.database, "(default)");
  assert.equal(execution.approvedManifestSha256, approvedCutoverManifestHash);
  assert.equal(execution.deployedRulesHash, snapshot.candidateRulesHash);
  assert.equal(approval?.additionalAudits, 2);
  assert.equal(approval?.maximumAdditionalReadRequests, 14);
  assert.equal(approval?.maximumTotalAuditReadRequests, 42);
  const expectedWindows = ["before-cutover", "before-cutover", "cutover", "cutover", "renewed-cutover"];
  assert(ledger.attempts.length === 4 || ledger.attempts.length === 5, "Renewed cutover permits only audit rounds 5 and 6");
  assert.deepEqual(ledger.attempts.map(row => row.auditWindow), expectedWindows.slice(0, ledger.attempts.length));
  assert(ledger.attempts.every(row => row.passed === true && row.completed === 0 && row.requests.length === 7));
  assert.equal(latest?.report, `cloud-audit-0-${ledger.attempts.length}.json`);
  assert.equal(latest?.audit.revision, 17);
}
if (writerSmoke) {
  const review = JSON.parse(fs.readFileSync(path.join(root, "docs/development/calendar-staging-writer-smoke/review.json"), "utf8"));
  const approval = JSON.parse(fs.readFileSync(path.join(directory, "writer-smoke-approval.json"), "utf8"));
  assert.equal(reviewValueHash(review), "e6699885c178e982b8a08b2dc0865e9ce04b8201e6d2d7f3d0b23360884a711c");
  assert.equal(approval.reviewHash, reviewValueHash(review));
  assert.equal(approval.target, target);
  assert.equal(approval.database, "(default)");
  assert.equal(approval.maximumAdditionalCliAuditRequests, 14);
  assert.equal(review.pins.privateSnapshotHash, baseline.privateSnapshotHash);
  assert.equal(review.pins.frozenPayloadHash, baseline.frozenHash);
  const priorSmokeAudits = ledger.attempts.filter(row => row.auditWindow === "writer-smoke");
  assert(ledger.attempts.length === 6 + priorSmokeAudits.length && priorSmokeAudits.length < 2);
  assert(ledger.attempts.every(row => row.passed === true && row.completed === 0 && row.requests.length === 7));
  assert.equal(latest.report, `cloud-audit-0-${ledger.attempts.length}.json`);
  assert(priorSmokeAudits.length === 1 || completed === 0);
}
assert(ledger.attempts.length < 13, "Audit window exhausted; obtain renewed review before more reads");
assert(ledger.attempts.filter(row => Boolean(row.beforeCutover) === beforeCutover).length < (beforeCutover ? renewedPrecutover ? 2 : 1 : 12));
const auditWindow = beforeCutover ? "before-cutover" : writerSmoke ? "writer-smoke" : trustedWindow ? "trusted-window" : renewedCutover ? "renewed-cutover" : "cutover";
assert(auditWindow !== "cutover" || ledger.attempts.filter(row => row.auditWindow === "cutover").length < 2);
const lockPath = path.join(directory, "audit.lock"), lock = fs.openSync(lockPath, "wx");
// Detect a different process advancing the ledger between the initial read and our lock.
const lockedLedger = fs.existsSync(ledgerPath) ? JSON.parse(fs.readFileSync(ledgerPath, "utf8")) : ledger;
if (reviewValueHash(lockedLedger) !== reviewValueHash(ledger)) {
  fs.closeSync(lock);fs.unlinkSync(lockPath);
  throw new Error("Audit ledger changed while acquiring the lock");
}
const attempt = { number: ledger.attempts.length + 1, completed, beforeCutover, auditWindow, startedAt: new Date().toISOString(), requests: [] };
ledger.attempts.push(attempt);
const save = () => fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2) + "\n");save();
const decode = value => value.stringValue ?? value.timestampValue ?? (value.integerValue !== undefined ? Number(value.integerValue) : value.booleanValue !== undefined ? value.booleanValue : value.arrayValue ? (value.arrayValue.values || []).map(decode) : value.mapValue ? decodeFields(value.mapValue.fields || {}) : null);
const decodeFields = fields => Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decode(value)]));
const prefix = `projects/${target}/databases/(default)/documents`;
try {
  delete process.env.FIREBASE_TOKEN;delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const require = createRequire(path.join(process.env.APPDATA, "npm/node_modules/firebase-tools/package.json"));
  assert.equal(require("./package.json").version, "15.18.0");
  const { Command } = require("./lib/command"), { requireAuth } = require("./lib/requireAuth"), { Client } = require("./lib/apiv2");
  const clients = { store: new Client({ urlPrefix: "https://firestore.googleapis.com", apiVersion: "v1" }), rules: new Client({ urlPrefix: "https://firebaserules.googleapis.com", apiVersion: "v1" }) };
  const command = new Command("calendar-trusted-readonly-audit").before(options => { assert.equal(options.project, target);assert.equal(options.user?.email, operator); }).before(requireAuth).action(async () => {
    async function read(api, method, resource, body, label) {
      assertTrustedReviewRead(api, method, resource, body);assert(attempt.requests.length < 7);
      const request = { label, api, method, reservedAt: new Date().toISOString() };attempt.requests.push(request);save();
      const options = { retries: 0, timeout: 20000, skipLog: { body: true, resBody: true, queryParams: true } };
      const response = method === "GET" ? await clients[api].get(resource, options) : await clients[api].post(resource, body, options);
      request.finishedAt = new Date().toISOString();save();return response.body;
    }
    const release = await read("rules", "GET", `/projects/${target}/releases/cloud.firestore`, undefined, "deployed Rules release");
    assert(release.rulesetName?.startsWith(`projects/${target}/rulesets/`));
    const rules = await read("rules", "GET", "/" + release.rulesetName, undefined, "candidate Rules source");
    assert.equal(rules.source?.files?.length, 1);const expectedRulesHash = beforeCutover ? snapshot.baselineRulesHash : snapshot.candidateRulesHash;
    assert.equal(reviewTextHash(rules.source.files[0].content), expectedRulesHash, "Rules do not match the selected baseline/candidate audit window");
    const references = [...snapshot.frozen.references, "calendarWriteState/main"];
    const records = await read("store", "POST", `/${prefix}:batchGet`, { documents: references.map(reference => prefix + "/" + reference) }, "owned records, receipts and gate");
    const observation = { documents: Object.fromEntries(references.map(reference => [reference, null])), profiles: {}, protected: {} };
    const expectedNames = new Set(references.map(reference => prefix + "/" + reference));
    for (const row of records) {
      const name = row.found?.name || row.missing;assert(expectedNames.has(name));
      if (row.found) observation.documents[name.slice(prefix.length + 1)] = { data: decodeFields(row.found.fields || {}), updateTime: row.found.updateTime, createTime: row.found.createTime };
    }
    assert.equal(new Set(records.map(row => row.found?.name || row.missing)).size, references.length);
    const profileNames = Object.entries(snapshot.identities).map(([alias, uid]) => [alias, prefix + "/users/" + uid]);
    const profiles = await read("store", "POST", `/${prefix}:batchGet`, { documents: profileNames.map(([, name]) => name), mask: { fieldPaths: ["role", "active", "calendarWriter"] } }, "approved actor profile versions");
    for (const [alias, name] of profileNames) {
      const row = profiles.find(record => record.found?.name === name)?.found;assert(row);
      observation.profiles[alias] = { fields: decodeFields(row.fields || {}), updateTime: row.updateTime };
    }
    const field = (name, op, value) => ({ fieldFilter: { field: { fieldPath: name }, op, value } });
    for (const collection of ["users", "classroomSchedules", "dlExamSchedules"]) {
      const filters = [field(collection === "users" ? "active" : "isActive", "EQUAL", { booleanValue: true })];
      if (collection === "users") filters.push(field("role", "IN", { arrayValue: { values: ["staff", "admin", "superadmin"].map(stringValue => ({ stringValue })) } }));
      if (collection === "dlExamSchedules") filters.push(field("date", "GREATER_THAN_OR_EQUAL", { stringValue: "2027-06-07" }), field("date", "LESS_THAN_OR_EQUAL", { stringValue: "2027-06-11" }));
      const response = await read("store", "POST", `/${prefix}:runQuery`, { structuredQuery: { from: [{ collectionId: collection }], select: { fields: (collection === "users" ? ["role", "active"] : collection === "dlExamSchedules" ? ["isActive", "date"] : ["isActive"]).map(fieldPath => ({ fieldPath })) }, where: filters.length === 1 ? filters[0] : { compositeFilter: { op: "AND", filters } }, ...(collection === "dlExamSchedules" ? { orderBy: [{ field: { fieldPath: "date" }, direction: "ASCENDING" }] } : {}), limit: 201 } }, collection + " protected versions");
      observation.protected[collection] = response.filter(row => row.document).map(row => ({ id: row.document.name.split("/").at(-1), updateTime: row.document.updateTime }));
    }
    const audit = await auditTrustedCheckpoint({ snapshot, observation, completed, previous: latest?.audit || null, terminalFromBaseline: writerSmoke && attempt.number === 8 });
    const report = { ...audit, checkedAt: new Date().toISOString(), attempt: attempt.number, beforeCutover, auditWindow, deployedRulesHash: expectedRulesHash, candidateRulesHash: snapshot.candidateRulesHash, readApiRequests: attempt.requests.length, countsAreNotBilledReads: true, productionAccessed: false, rulesChanged: false, profilesChanged: false };
    const output = path.join(root, "output/playwright/calendar-trusted-writer-audit-prep");fs.mkdirSync(output, { recursive: true });
    const filename = `${beforeCutover ? "precutover-audit" : "cloud-audit"}-${completed}-${attempt.number}.json`;
    fs.writeFileSync(path.join(output, filename), JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
    if (!beforeCutover) fs.writeFileSync(latestPath, JSON.stringify({ audit, auditHash: reviewValueHash(audit), report: filename }, null, 2) + "\n");
    attempt.passed = true;attempt.finishedAt = report.checkedAt;save();return report;
  });
  process.chdir(directory);
  const result = await command.runner()({ project: target, account: operator, json: true, nonInteractive: true, cwd: directory });
  console.log(JSON.stringify({ passed: result.passed, completed, revision: result.revision, schedules: result.schedules.length, receipts: result.receipts.length, cloudRecordsWritten: 0 }));
} catch {
  attempt.passed = false;attempt.finishedAt = new Date().toISOString();save();
  console.log(JSON.stringify({ passed: false, completed, readRequestsReserved: attempt.requests.length, cloudRecordsWritten: 0, noAutomaticRetry: true, rawProviderDataPrinted: false }));process.exitCode = 1;
} finally { fs.closeSync(lock);fs.unlinkSync(lockPath); }
