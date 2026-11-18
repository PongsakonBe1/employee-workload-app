// Read-only staging inspection. CLI authentication is delegated; never inspect tokens/key files.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import { assertTrustedReviewRead, freezeTrustedReview, reviewValueHash, reviewTextHash, TRUSTED_REVIEW_PROJECT, TRUSTED_REVIEW_PROPOSAL_SHA } from "./calendar-trusted-cloud-plan.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [operator, ...pairs] = process.argv.slice(2);
assert.match(operator || "", /^[^\s@]+@[^\s@]+\.[^\s@]+$/);
const aliases = Object.fromEntries(pairs.map(pair => { const at = pair.indexOf("=");return [pair.slice(0, at), pair.slice(at + 1)]; }));
assert.equal(pairs.length, 2);assert.deepEqual(Object.keys(aliases).sort(), ["staff", "superadmin"]);
for (const email of Object.values(aliases)) assert.match(email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/);
assert.notEqual(aliases.staff, aliases.superadmin);
const proposalPath = path.join(root, "docs/development/calendar-trusted-writer-qa-prep/cloud-qa.review.json");
const proposalText = fs.readFileSync(proposalPath, "utf8");
assert.equal(reviewTextHash(proposalText), TRUSTED_REVIEW_PROPOSAL_SHA, "Prior reviewed proposal changed");
const proposal = JSON.parse(proposalText), target = TRUSTED_REVIEW_PROJECT;
assert.equal(proposal.target.projectId, target);assert.equal(proposal.cloudExecutionApproved, false);
assert.equal(reviewTextHash(fs.readFileSync(path.join(root, proposal.rules.candidatePath), "utf8")), proposal.rules.candidateSha256);
const privateDirectory = path.join(root, ".tools/calendar-staging/trusted-writer-baseline");
assert(!fs.existsSync(privateDirectory), "Never overwrite an existing captured baseline; review it first");
fs.mkdirSync(privateDirectory, { recursive: false });
const output = path.join(root, "output/playwright/calendar-trusted-writer-baseline");fs.mkdirSync(output, { recursive: true });
const ledger = { startedAt: new Date().toISOString(), target, approval: "User continued the proposed bounded baseline-read phase; cloud writes and deployments remain unapproved", healthGetAttempts: 0, requests: [], cloudDataWrites: 0, rulesChanged: false, profilesChanged: false, privateKeyMaterialRead: false };
const saveLedger = () => fs.writeFileSync(path.join(privateDirectory, "read-ledger.json"), JSON.stringify(ledger, null, 2) + "\n");
const writeNew = (name, value) => fs.writeFileSync(path.join(privateDirectory, name), typeof value === "string" ? value : JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
saveLedger();
const decode = value => value.stringValue ?? value.timestampValue ?? (value.integerValue !== undefined ? Number(value.integerValue) : value.booleanValue !== undefined ? value.booleanValue : value.arrayValue ? (value.arrayValue.values || []).map(decode) : value.mapValue ? decodeFields(value.mapValue.fields || {}) : null);
const decodeFields = fields => Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decode(value)]));
const documentPrefix = `projects/${target}/databases/(default)/documents`;
let stage = "health";
try {
  let health;
  for (let attempt = 0; attempt < 3; attempt++) {
    ledger.healthGetAttempts++;saveLedger();
    let response;
    try { response = await fetch(proposal.target.apiOrigin + "/health", { redirect: "error", signal: AbortSignal.timeout(30000) }); }
    catch (error) { if (attempt === 2) throw error;continue; }
    assert.equal(response.status, 200);health = await response.json();
    assert.deepEqual(health, { ok: true, projectId: target, mode: "staging", protocol: 1, writesEnabled: false, connectivityEnabled: false, emulator: false });break;
  }
  assert(health);ledger.healthVerifiedAt = new Date().toISOString();saveLedger();
  stage = "cli-auth";
  delete process.env.FIREBASE_TOKEN;delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const require = createRequire(path.join(process.env.APPDATA, "npm/node_modules/firebase-tools/package.json"));
  assert.equal(require("./package.json").version, "15.18.0", "Review installed CLI compatibility before changing versions");
  const { Command } = require("./lib/command"), { requireAuth } = require("./lib/requireAuth"), { Client } = require("./lib/apiv2");
  const clients = { store: new Client({ urlPrefix: "https://firestore.googleapis.com", apiVersion: "v1" }), rules: new Client({ urlPrefix: "https://firebaserules.googleapis.com", apiVersion: "v1" }), auth: new Client({ urlPrefix: "https://identitytoolkit.googleapis.com", apiVersion: "v1" }) };
  const command = new Command("calendar-trusted-baseline-readonly").before(options => {
    assert.equal(options.project, target);assert.equal(options.user?.email, operator);
  }).before(requireAuth).action(async () => {
    async function read(api, method, resource, body, label, queryParams) {
      assertTrustedReviewRead(api, method, resource, body);
      assert(ledger.requests.length < 10, "Bounded baseline API request limit reached");
      const entry = { label, api, method, reservedAt: new Date().toISOString() };ledger.requests.push(entry);saveLedger();
      const response = method === "GET" ? await clients[api].get(resource) : await clients[api].post(resource, body, queryParams ? { queryParams } : undefined);
      entry.completedAt = new Date().toISOString();saveLedger();return response.body;
    }
    stage = "database-metadata";
    const database = await read("store", "GET", `/projects/${target}/databases/(default)`, undefined, "database edition");
    assert.equal(database.name, `projects/${target}/databases/(default)`);assert.equal(database.databaseEdition, "STANDARD");
    stage = "rules-baseline";
    const release = await read("rules", "GET", `/projects/${target}/releases/cloud.firestore`, undefined, "deployed Rules release");
    assert(release.rulesetName?.startsWith(`projects/${target}/rulesets/`));
    const ruleset = await read("rules", "GET", "/" + release.rulesetName, undefined, "deployed Rules source");
    assert.equal(ruleset.source?.files?.length, 1);const rulesSource = ruleset.source.files[0].content;assert.equal(typeof rulesSource, "string");
    const rulesHash = reviewTextHash(rulesSource);writeNew("baseline.rules", rulesSource);
    stage = "identity-bindings";
    const identities = {};
    for (const [alias, email] of Object.entries(aliases)) {
      const response = await read("auth", "POST", `/projects/${target}/accounts:lookup`, { email: [email] }, "lookup " + alias, { fields: "users(localId,emailVerified,providerUserInfo(providerId))" });
      assert.equal(response.users?.length, 1);const user = response.users[0];
      assert.equal(user.emailVerified, true);assert(user.providerUserInfo?.some(row => row.providerId === "google.com"));
      identities[alias] = user.localId;
    }
    const gateName = documentPrefix + "/calendarWriteState/main", profileNames = Object.values(identities).map(uid => documentPrefix + "/users/" + uid);
    stage = "profiles-and-gate";
    const initial = await read("store", "POST", `/${documentPrefix}:batchGet`, { documents: [gateName, ...profileNames], mask: { fieldPaths: ["revision", "role", "active", "calendarWriter", "operationId"] } }, "initial profiles and gate");
    const found = new Map(initial.filter(row => row.found).map(row => [row.found.name, row.found]));
    assert.equal(found.size, 3);const gate = decodeFields(found.get(gateName).fields);
    assert(Number.isSafeInteger(gate.revision) && gate.revision >= 0 && gate.revision < Number.MAX_SAFE_INTEGER - 5);
    const profiles = Object.fromEntries(Object.entries(identities).map(([alias, uid]) => [alias, decodeFields(found.get(documentPrefix + "/users/" + uid).fields)]));
    const field = (name, op, value) => ({ fieldFilter: { field: { fieldPath: name }, op, value } });
    const active = field("active", "EQUAL", { booleanValue: true }), activeSchedule = field("isActive", "EQUAL", { booleanValue: true });
    const queries = [
      ["users", [active, field("role", "IN", { arrayValue: { values: ["staff", "admin", "superadmin"].map(stringValue => ({ stringValue })) } })], ["displayName", "nickname", "name", "role", "active"]],
      ["classroomSchedules", [activeSchedule], ["subject", "courseName", "room", "dayOfWeek", "startTime", "endTime", "validFrom", "validTo", "semester", "isActive", "schemaVersion", "operationId", "mutationVersion"]],
      ["dlExamSchedules", [activeSchedule, field("date", "GREATER_THAN_OR_EQUAL", { stringValue: "2027-06-07" }), field("date", "LESS_THAN_OR_EQUAL", { stringValue: "2027-06-11" })], ["date", "subject", "startTime", "endTime", "locations", "location", "proctors", "studentCount", "semester", "examType", "isActive", "schemaVersion", "operationId", "mutationVersion"]]
    ];
    stage = "bounded-conflict-baseline";
    const documents = {}, fingerprints = {};
    for (const [collection, filters, fields] of queries) {
      const response = await read("store", "POST", `/${documentPrefix}:runQuery`, { structuredQuery: { from: [{ collectionId: collection }], select: { fields: fields.map(fieldPath => ({ fieldPath })) }, where: filters.length === 1 ? filters[0] : { compositeFilter: { op: "AND", filters } }, ...(collection === "dlExamSchedules" ? { orderBy: [{ field: { fieldPath: "date" }, direction: "ASCENDING" }] } : {}), limit: 201 } }, collection + " bounded query");
      const raw = response.filter(row => row.document).map(row => row.document);assert(raw.length <= 200, "Baseline exceeds 200 records");
      fingerprints[collection] = raw.map(row => ({ id: row.name.split("/").at(-1), updateTime: row.updateTime, digest: reviewValueHash(row.fields || {}) })).sort((a, b) => a.id.localeCompare(b.id));
      documents[collection] = raw.map(row => ({ id: row.name.split("/").at(-1), ...decodeFields(row.fields || {}) }));
      if (collection === "users") documents.users = documents.users.map((user, index) => ({ id: user.id, role: user.role, active: user.active, displayName: [user.displayName, user.nickname, user.name].some(value => typeof value === "string" && value.trim()) ? `Directory ${index + 1}` : "" }));
    }
    stage = "freeze-and-conflict-validation";
    const frozen = await freezeTrustedReview(proposal, identities, profiles, documents);
    stage = "target-absence-and-stability";
    const references = frozen.references.map(reference => documentPrefix + "/" + reference);
    const final = await read("store", "POST", `/${documentPrefix}:batchGet`, { documents: [...references, gateName, ...profileNames], mask: { fieldPaths: ["revision", "role", "active", "calendarWriter", "operationId"] } }, "absence of 16 prospective targets and receipts; stable gate/profiles");
    const finalFound = new Map(final.filter(row => row.found).map(row => [row.found.name, row.found]));
    assert.equal(finalFound.size, 3, "Proposed target or receipt already exists");
    for (const name of [gateName, ...profileNames]) assert.equal(finalFound.get(name)?.updateTime, found.get(name).updateTime, "Gate or profile changed during capture");
    const capturedAt = new Date().toISOString();
    const privateSnapshot = { capturedAt, target, database: "(default)", proposalSha256: TRUSTED_REVIEW_PROPOSAL_SHA, baselineRulesHash: rulesHash, candidateRulesHash: proposal.rules.candidateSha256, releaseName: release.name, rulesetName: release.rulesetName, gateRevision: gate.revision, gateUpdateTime: found.get(gateName).updateTime, fingerprints, identities, profiles, frozen, sourceCommit: proposal.source.lastVerifiedRuntimeCommit, runtimeHealth: health, cloudExecutionApproved: false, rulesDeploymentApproved: false };
    const snapshotHash = reviewValueHash(privateSnapshot), frozenHash = reviewValueHash(frozen);
    writeNew("prepared.json", privateSnapshot);writeNew("reviewed-operations.json", frozen);
    ledger.completedAt = capturedAt;ledger.passed = true;saveLedger();
    const report = { passed: true, capturedAt, projectId: target, databaseId: "(default)", edition: database.databaseEdition, sourceCommit: proposal.source.lastVerifiedRuntimeCommit, runtimeHealth: health, proposalSha256: TRUSTED_REVIEW_PROPOSAL_SHA, baselineRulesHash: rulesHash, candidateRulesHash: proposal.rules.candidateSha256, baselineMatchesCandidate: rulesHash === proposal.rules.candidateSha256, gateRevision: gate.revision, expectedFinalGateRevision: gate.revision + 5, counts: Object.fromEntries(Object.entries(documents).map(([collection, rows]) => [collection, rows.length])), actorProfiles: Object.fromEntries(Object.entries(profiles).map(([alias, value]) => [alias, { role: value.role, active: value.active, calendarWriter: value.calendarWriter }])), frozenHash, privateSnapshotHash: snapshotHash, scheduleTargetsAbsent: 8, operationReceiptsAbsent: 8, gateAndProfileStableDuringCapture: true, conflictsWithBaseline: 0, cloudApiReadRequests: ledger.requests.length, healthGetAttempts: ledger.healthGetAttempts, frontendReadsNotIncluded: true, countsAreNotBilledReads: true, cloudDataWrites: 0, rulesChanged: false, profilesChanged: false, billingChanged: false, iamChanged: false, productionAccessed: false, keyMaterialRead: false, cloudExecutionApproved: false, rulesDeploymentApproved: false, gateStillNeedsRevalidationImmediatelyBeforeCutover: true, privilegedAuditIsNotRulesEvidence: true, localArtifacts: [".tools/calendar-staging/trusted-writer-baseline/prepared.json", ".tools/calendar-staging/trusted-writer-baseline/reviewed-operations.json", ".tools/calendar-staging/trusted-writer-baseline/baseline.rules"] };
    fs.writeFileSync(path.join(output, "baseline-report.json"), JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
    return report;
  });
  process.chdir(privateDirectory);
  const report = await command.runner()({ project: target, account: operator, json: true, nonInteractive: true, cwd: privateDirectory });
  console.log(JSON.stringify({ passed: report.passed, gateRevision: report.gateRevision, counts: report.counts, baselineRulesHash: report.baselineRulesHash, frozenHash: report.frozenHash, cloudDataWrites: 0, cloudExecutionApproved: false }));
} catch (error) {
  ledger.passed = false;ledger.failedStage = stage;saveLedger();
  // Do not print provider messages, raw CLI output, profile data, UIDs or diagnostic URLs.
  const failure = { passed: false, stage, errorCode: typeof error.code === "string" && /^[a-zA-Z0-9_/-]{1,70}$/.test(error.code) ? error.code : "baseline-capture-failed", readRequestsReserved: ledger.requests.length, healthGetAttempts: ledger.healthGetAttempts, cloudDataWrites: 0, rulesChanged: false, productionAccessed: false, noAutomaticRetry: true };
  fs.writeFileSync(path.join(output, "capture-failure.json"), JSON.stringify(failure, null, 2) + "\n", { flag: "wx" });console.log(JSON.stringify(failure));process.exitCode = 1;
}
