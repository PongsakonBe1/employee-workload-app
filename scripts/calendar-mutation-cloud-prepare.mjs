// Read-only cloud inspection + local review artifacts. This program has no deployment/commit API.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { prepareMutationCloudPlan, renderMutationQaRules, captureMutationQaBaseline, auditMutationQaProgress, assertMutationQaRollbackAllowed, assertMutationQaCheckpointUnchanged, preflightMutationCloudConflicts, qaTextHash, qaValueHash, APPEND_ONLY_SOURCE_SHA, MUTATION_QA_MANIFEST_SHA } from "./calendar-mutation-cloud-plan.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), target = "labboy-workload-app-staging";
const [account, action, ...args] = process.argv.slice(2);
if (!account?.includes("@") || !["prepare", "audit", "rollback-check"].includes(action)) throw new Error("Explicit operator and prepare/audit/rollback-check required; no cloud mutation action exists");
const directory = path.join(root, ".tools/calendar-staging"), preparedDirectory = path.join(directory, "mutation-cloud-qa");
const manifestPath = path.join(root, "docs/development/calendar-staging-mutation-cloud-qa/staging-manifest.json"), output = path.join(root, "output/playwright/calendar-staging-mutation-cloud-qa");
const require = createRequire(path.join(process.env.APPDATA, "npm/node_modules/firebase-tools/package.json"));
if (require("./package.json").version !== "15.18.0") throw new Error("Installed CLI version changed; review compatibility first");
delete process.env.FIREBASE_TOKEN;delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
const { Command } = require("./lib/command"), { requireAuth } = require("./lib/requireAuth"), { Client } = require("./lib/apiv2");
const pinnedJson = (file, hash) => { const text = fs.readFileSync(path.join(root, file), "utf8");if (qaTextHash(text) !== hash) throw new Error("Baseline artifact changed; renewed review required");return JSON.parse(text); };
const storageBaseline = pinnedJson("output/playwright/calendar-staging-entry-write/cloud-storage-audit-after.json", "35d2ae57df72a782d8046491fbead23c2acaffe1950a7089ea94612bf0797676");
const profileBaseline = pinnedJson("output/playwright/calendar-staging-entry-write/cloud-audit-after.json", "b79c4c80d2fbe55bdf35553b2c86361ed44ad3eba1ba81f3b0600071581b2964");
const decode = value => value.stringValue ?? value.timestampValue ?? (value.integerValue !== undefined ? Number(value.integerValue) : value.booleanValue !== undefined ? value.booleanValue : value.arrayValue ? (value.arrayValue.values || []).map(decode) : value.mapValue ? decodeFields(value.mapValue.fields || {}) : null);
const decodeFields = values => Object.fromEntries(Object.entries(values).map(([key, value]) => [key, decode(value)]));
const writeNew = (filename, value) => fs.writeFileSync(filename, typeof value === "string" ? value : JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
const command = new Command("calendar-mutation-readonly-preparation").before(options => {
  if (options.project !== target || options.user?.email !== account) throw new Error("Staging target/operator mismatch");
}).before(requireAuth).action(async () => {
  const store = new Client({ urlPrefix: "https://firestore.googleapis.com", apiVersion: "v1" });
  const rules = new Client({ urlPrefix: "https://firebaserules.googleapis.com", apiVersion: "v1" });
  const prefix = `projects/${target}/databases/(default)/documents`;
  async function readRules() {
    const release = (await rules.get(`/projects/${target}/releases/cloud.firestore`)).body;
    if (!release.rulesetName?.startsWith(`projects/${target}/rulesets/`)) throw new Error("Unexpected Rules resource");
    const files = (await rules.get("/" + release.rulesetName)).body.source?.files || [];
    if (files.length !== 1 || typeof files[0].content !== "string") throw new Error("Expected one captured Rules source");
    return { source: files[0].content, hash: qaTextHash(files[0].content), releaseName: release.name, rulesetName: release.rulesetName };
  }
  async function observe(plan, identities) {
    const references = [...new Set([...storageBaseline.schedules.map(row => `${row.collection}/${row.id}`), ...storageBaseline.receipts.map(row => `calendarWriteOperations/${row.id}`), ...plan.operations.map(row => `calendarWriteOperations/${row.operationId}`), "calendarWriteState/main"])];
    const requested = new Set(references.map(reference => prefix + "/" + reference));
    const response = await store.post(`/${prefix}:batchGet`, { documents: [...requested] });
    const documents = Object.fromEntries(references.map(reference => [reference, null]));
    for (const item of response.body || []) {
      if (item.found) { if (!requested.has(item.found.name)) throw new Error("Unexpected read reference");documents[item.found.name.slice(prefix.length + 1)] = decodeFields(item.found.fields); }
    }
    const profiles = [], profileDigests = {};
    for (const alias of ["staff", "superadmin"]) {
      const response = await store.post(`/${prefix}:batchGet`, { documents: [prefix + "/users/" + identities[alias]], mask: { fieldPaths: ["role", "active", "calendarWriter"] } });
      const row = response.body?.[0]?.found;if (!row) throw new Error("Expected profile missing");
      profileDigests[alias] = qaValueHash({ fields: row.fields, updateTime: row.updateTime });
      const profile = decodeFields(row.fields);
      if (profile.role !== alias || profile.active !== true || profile.calendarWriter !== (alias === "superadmin")) throw new Error("Approved role/capability changed");
      profiles.push({ alias, ...profile, versionDigest: profileDigests[alias] });
    }
    return { documents, profiles, profileDigests };
  }
  async function conflicts(plan) {
    const fieldFilter = (fieldPath, op, value) => ({ fieldFilter: { field: { fieldPath }, op, value } });
    const active = fieldFilter("isActive", "EQUAL", { booleanValue: true });
    const queries = [
      ["users", [fieldFilter("active", "EQUAL", { booleanValue: true }), fieldFilter("role", "IN", { arrayValue: { values: ["staff", "admin", "superadmin"].map(stringValue => ({ stringValue })) } })], ["displayName", "name", "nickname", "role", "active"]],
      ["classroomSchedules", [active], ["subject", "teacher", "note", "semester", "room", "dayOfWeek", "startTime", "endTime", "validFrom", "validTo", "isActive"]],
      ["dlExamSchedules", [active, fieldFilter("date", "GREATER_THAN_OR_EQUAL", { stringValue: "2027-05-17" }), fieldFilter("date", "LESS_THAN_OR_EQUAL", { stringValue: "2027-05-19" })], ["subject", "date", "startTime", "endTime", "timeSlot", "locations", "location", "proctors", "studentCount", "examType", "semester", "notes", "isActive"]]
    ];
    const documents = {};
    for (const [collection, filters, fields] of queries) {
      const response = await store.post(`/${prefix}:runQuery`, { structuredQuery: { from: [{ collectionId: collection }], select: { fields: fields.map(fieldPath => ({ fieldPath })) }, where: filters.length === 1 ? filters[0] : { compositeFilter: { op: "AND", filters } }, limit: 201 } });
      const rows = (response.body || []).filter(row => row.document).map(row => ({ ...decodeFields(row.document.fields || {}), id: row.document.name.split("/").at(-1) }));
      if (rows.length > 200) throw new Error("Conflict preflight exceeds the pilot read limit");documents[collection] = rows;
    }
    return { ...preflightMutationCloudConflicts(plan, documents), queryRequests: 3, records: Object.fromEntries(Object.entries(documents).map(([collection, rows]) => [collection, rows.length])), notBilledReadCount: true };
  }
  if (action !== "prepare") {
    const prepared = JSON.parse(fs.readFileSync(path.join(preparedDirectory, "prepared.json"), "utf8"));
    if (prepared.target !== target || prepared.cloudExecutionApproved !== false || prepared.manifestHash !== MUTATION_QA_MANIFEST_SHA) throw new Error("Prepared review state mismatch");
    const plan = await prepareMutationCloudPlan(fs.readFileSync(manifestPath, "utf8"), prepared.identities), deployed = await readRules();
    if (qaTextHash(fs.readFileSync(path.join(preparedDirectory, "firestore.rules"), "utf8")) !== prepared.candidateRulesHash || qaTextHash(fs.readFileSync(path.join(preparedDirectory, "rollback.rules"), "utf8")) !== prepared.rollbackRulesHash) throw new Error("Reviewed local Rules artifact changed");
    if (action === "rollback-check") return { ...assertMutationQaRollbackAllowed(prepared, deployed.hash), cloudRecordsWritten: 0, rulesChanged: false, executed: false };
    const completed = Number(args[0]);if (args.length !== 1 || !Number.isInteger(completed) || completed < 0 || completed > 4) throw new Error("audit requires completed operation count 0..4");
    const observation = await observe(plan, prepared.identities);
    const audit = auditMutationQaProgress(plan, prepared.baseline, observation, completed);
    if (![prepared.rollbackRulesHash, prepared.candidateRulesHash].includes(deployed.hash)) throw new Error("Unexpected deployed Rules; stop QA");
    // A later checkpoint must preserve the receipts already accepted at the preceding checkpoint.
    if (completed > 1) {
      const previous = JSON.parse(fs.readFileSync(path.join(output, `cloud-audit-${completed - 1}.json`), "utf8"));
      if (previous.manifestHash !== plan.manifestHash || qaValueHash(audit.receipts.slice(0, previous.receipts.length)) !== qaValueHash(previous.receipts)) throw new Error("Earlier mutation receipt changed");
    }
    const result = { checkedAt: new Date().toISOString(), target, manifestHash: plan.manifestHash, ...audit, deployedRulesHash: deployed.hash, privilegedAuditIsNotRulesEvidence: true, productionAccessed: false };
    const checkpointPath = path.join(output, `cloud-audit-${completed}.json`);
    if (fs.existsSync(checkpointPath)) {
      assertMutationQaCheckpointUnchanged(JSON.parse(fs.readFileSync(checkpointPath, "utf8")), result);
      writeNew(path.join(output, `cloud-audit-${completed}-check-${Date.now()}.json`), result);
    } else writeNew(checkpointPath, result);
    return result;
  }
  if (fs.existsSync(preparedDirectory)) throw new Error("Prepared directory already exists; inspect it instead of overwriting review artifacts");
  const pairs = args.map(value => { const at = value.indexOf("=");return { alias: value.slice(0, at), email: value.slice(at + 1) }; });
  if (pairs.length !== 2 || pairs.some(row => !["staff", "superadmin"].includes(row.alias) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) || new Set(pairs.map(row => row.alias)).size !== 2 || new Set(pairs.map(row => row.email)).size !== 2) throw new Error("Two approved identity aliases required");
  const auth = new Client({ urlPrefix: "https://identitytoolkit.googleapis.com", apiVersion: "v1" }), identities = {};
  for (const pair of pairs) {
    const response = await auth.post(`/projects/${target}/accounts:lookup`, { email: [pair.email] }, { queryParams: { fields: "users(localId,emailVerified,providerUserInfo(providerId))" } });
    const users = response.body.users || [];
    if (users.length !== 1 || users[0].emailVerified !== true || !users[0].providerUserInfo?.some(row => row.providerId === "google.com")) throw new Error("Verified Google staging identity required");identities[pair.alias] = users[0].localId;
  }
  const plan = await prepareMutationCloudPlan(fs.readFileSync(manifestPath, "utf8"), identities), deployed = await readRules(), observation = await observe(plan, identities);
  if (deployed.hash !== APPEND_ONLY_SOURCE_SHA) throw new Error("Deployed Rules no longer match the reviewed append-only baseline");
  for (const row of storageBaseline.schedules) if (qaValueHash(observation.documents[`${row.collection}/${row.id}`]) !== row.digest) throw new Error("Existing QA schedule changed since its accepted create audit");
  for (const row of storageBaseline.receipts) if (qaValueHash(observation.documents[`calendarWriteOperations/${row.id}`]) !== row.digest) throw new Error("Original receipt changed");
  for (const profile of profileBaseline.profiles) if (observation.profileDigests[profile.alias] !== profile.versionDigest) throw new Error("Approved profile version changed");
  if (qaValueHash(observation.documents["calendarWriteState/main"]) !== storageBaseline.gateDigest) throw new Error("Gate baseline changed");
  const conflictPreflight = await conflicts(plan);
  const baseline = captureMutationQaBaseline(plan, observation), candidate = renderMutationQaRules(fs.readFileSync(path.join(root, "firebase/calendar-mutations/firestore.rules"), "utf8"), plan), candidateRulesHash = qaTextHash(candidate);
  const prepared = { target, database: "(default)", manifestHash: plan.manifestHash, cloudExecutionApproved: false, candidateRulesHash, rollbackRulesHash: deployed.hash, releaseName: deployed.releaseName, baselineRulesetName: deployed.rulesetName, identities, baseline };
  // Write new isolated files only. Actual UID-bound Rules and source snapshots stay ignored/local.
  fs.mkdirSync(preparedDirectory, { recursive: false });fs.mkdirSync(output, { recursive: true });
  writeNew(path.join(preparedDirectory, "firestore.rules"), candidate);writeNew(path.join(preparedDirectory, "rollback.rules"), deployed.source);
  writeNew(path.join(preparedDirectory, "firebase.json"), { firestore: { database: "(default)", rules: "firestore.rules" } });
  writeNew(path.join(preparedDirectory, "firebase.rollback.json"), { firestore: { database: "(default)", rules: "rollback.rules" } });
  writeNew(path.join(preparedDirectory, "prepared.json"), prepared);
  writeNew(path.join(preparedDirectory, "reviewed-operations.json"), { target, manifestHash: plan.manifestHash, candidateRulesHash, actorUid: plan.actorUid, cloudExecutionApproved: false, operations: plan.operations.map(row => ({ id: row.id, operationId: row.operationId, expectedRevision: row.expectedRevision, input: row.input })) });
  const result = { checkedAt: new Date().toISOString(), target, manifestHash: plan.manifestHash, candidateRulesHash, rollbackRulesHash: deployed.hash, baselineRevision: 13, proposedFinalRevision: 17, profiles: observation.profiles, conflictPreflight, operations: plan.operations.map(row => ({ id: row.id, action: row.action, target: row.target, expectedVersion: row.expectedVersion, expectedRevision: row.expectedRevision, operationId: row.operationId })), existingSchedulesUnchanged: storageBaseline.schedules.length, existingReceiptsUnchanged: storageBaseline.receipts.length, newMutationReceiptsAbsent: true, cloudExecutionApproved: false, cloudRecordsWritten: 0, rulesChanged: false, productionAccessed: false, privilegedReadIsNotRulesEvidence: true };
  writeNew(path.join(output, "cloud-preparation-report.json"), result);return result;
});
try {
  const result = await command.runner()({ project: target, account, json: true, nonInteractive: true, cwd: directory });console.log(JSON.stringify({ success: true, action, result }));
} catch (error) {
  console.log(JSON.stringify({ success: false, action, reason: String(error.message || "Read-only preparation failed").replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[account]").replace(/Bearer\s+\S+/gi, "Bearer [redacted]").slice(0, 700) }));process.exitCode = 1;
}
