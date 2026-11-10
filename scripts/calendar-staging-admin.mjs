// Use the installed CLI's authenticated API client; never read credential files or tokens.
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { validateStagingQaPlan, stagingQaOccupancy, stagingQaRowsToRules } from "./calendar-staging-qa-plan.mjs";
import { prepareCalendarCreate } from "../frontend/lib/calendarCreatePlan.js";
import { calendarEmulatorFixtures } from "../firebase/calendar-emulator/fixtures.mjs";
import { adaptCalendarDocuments } from "../frontend/lib/calendarDataAdapter.js";
import { prepareQaRoleBaseline, planQaRoleWrites } from "./calendar-staging-role-plan.mjs";
import { validateRoleWritePlan, prepareRoleWriteFixture, roleWriteOccupancy } from "./calendar-role-write-plan.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
  target = "labboy-workload-app-staging";
const account = process.argv[2],
  action = process.argv[3];
if (!account?.includes("@")) throw new Error("Explicit account required");
const directory = path.join(root, ".tools/calendar-staging");
fs.mkdirSync(directory, {
  recursive: true
});
process.chdir(directory);
delete process.env.FIREBASE_TOKEN;
delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
const require = createRequire(path.join(process.env.APPDATA, "npm/node_modules/firebase-tools/package.json"));
if (require("./package.json").version !== "15.18.0") throw new Error("Review staging admin compatibility before changing the installed Firebase CLI version");
const {
    Command
  } = require("./lib/command"),
  {
    requireAuth
  } = require("./lib/requireAuth");
function field(value) {
  if (typeof value === "string") return {
    stringValue: value
  };
  if (typeof value === "boolean") return {
    booleanValue: value
  };
  if (typeof value === "number") return {
    integerValue: String(value)
  };
  if (Array.isArray(value)) return {
    arrayValue: {
      values: value.map(field)
    }
  };
  return {
    mapValue: {
      fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, field(item)]))
    }
  };
}
async function writeFixtures(records) {
  if (records.some(record => !["users", "classroomSchedules", "dlExamSchedules"].includes(record.collection) || !record.id || record.id.includes("/"))) throw new Error("Invalid staging fixture reference");
  const {
      Client
    } = require("./lib/apiv2"),
    client = new Client({
      urlPrefix: "https://firestore.googleapis.com",
      apiVersion: "v1"
    });
  const writes = records.map(({
    collection,
    id,
    data
  }) => ({
    update: {
      name: `projects/${target}/databases/(default)/documents/${collection}/${id}`,
      fields: field(data).mapValue.fields
    }
  }));
  await client.post(`/projects/${target}/databases/(default)/documents:commit`, {
    writes
  });
  return writes.length;
}
const command = new Command("calendar-staging-internal").before(options => {
  if (options.project !== target || options.user?.email !== account) throw new Error("Staging target/account mismatch");
}).before(requireAuth).action(async () => {
  if (["qaRolePrepare", "qaProvisionSuper", "qaSetStaff", "qaRollbackRoles", "qaRolesStatus"].includes(action)) {
    const values = process.argv.slice(4).map(value => {
      const index = value.indexOf("="), role = value.slice(0, index), email = value.slice(index + 1).trim().toLowerCase();
      if (index < 1 || !["staff", "superadmin"].includes(role) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Explicit staging QA role/email pairs required");
      return { role, email };
    });
    if (values.length !== 2 || new Set(values.map(value => value.role)).size !== 2 || new Set(values.map(value => value.email)).size !== 2) throw new Error("Exactly two distinct approved QA candidates required");
    const { Client } = require("./lib/apiv2");
    const identity = new Client({ urlPrefix: "https://identitytoolkit.googleapis.com", apiVersion: "v1" });
    const store = new Client({ urlPrefix: "https://firestore.googleapis.com", apiVersion: "v1" });
    const prefix = `projects/${target}/databases/(default)/documents`;
    async function candidates() {
      const result = {};
      for (const value of values) {
        const lookup = await identity.post(`/projects/${target}/accounts:lookup`, { email: [value.email] }, { queryParams: { fields: "users(localId,emailVerified,providerUserInfo(providerId))" } });
        const users = lookup.body.users || [];
        if (users.length !== 1 || users[0].emailVerified !== true || !users[0].providerUserInfo?.some(provider => provider.providerId === "google.com") || !/^[A-Za-z0-9:_-]{1,128}$/.test(users[0].localId)) throw new Error("Both approved candidates must complete verified Google staging sign-in first");
        const uid = users[0].localId;
        const read = await store.post(`/projects/${target}/databases/(default)/documents:batchGet`, { documents: [`${prefix}/users/${uid}`], mask: { fieldPaths: value.role === "superadmin" ? ["role", "active", "calendarWriter", "displayName"] : ["role", "active", "calendarWriter"] } });
        if (!Array.isArray(read.body) || read.body.length !== 1 || !read.body[0].found && !read.body[0].missing) throw new Error("Unexpected staging profile response");
        const found = read.body[0].found;
        result[value.role] = { uid, verifiedGoogle: true, profile: found ? { updateTime: found.updateTime, fields: Object.fromEntries(Object.entries(found.fields || {}).map(([key, field]) => [key, field.stringValue ?? field.booleanValue])) } : null };
      }
      return result;
    }
    const baselinePath = path.join(directory, "role-qa-baseline.json"), checkpointPath = path.join(directory, "role-qa-checkpoint.json");
    const current = await candidates();
    let documentsWritten = 0;
    if (action === "qaRolePrepare") {
      const baseline = prepareQaRoleBaseline(target, current);
      fs.writeFileSync(baselinePath, JSON.stringify(baseline, null, 2) + "\n", { flag: "wx" });
    } else if (action !== "qaRolesStatus") {
      const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
      const baselineSha = createHash("sha256").update(fs.readFileSync(baselinePath)).digest("hex");
      const checkpoint = fs.existsSync(checkpointPath) ? JSON.parse(fs.readFileSync(checkpointPath, "utf8")) : {};
      if (checkpoint.baselineSha && checkpoint.baselineSha !== baselineSha) throw new Error("Staging QA role baseline changed; stop before writing");
      const planAction = { qaProvisionSuper: "provision-superadmin", qaSetStaff: "set-staff", qaRollbackRoles: "rollback" }[action];
      const writes = planQaRoleWrites(baseline, planAction, current, checkpoint);
      const response = await store.post(`/projects/${target}/databases/(default)/documents:commit`, { writes });
      if (!Array.isArray(response.body.writeResults) || response.body.writeResults.length !== writes.length || response.body.writeResults.some(value => !value.updateTime)) throw new Error("Ambiguous staging commit result; inspect before retrying");
      documentsWritten = writes.length;
      const next = { ...checkpoint, baselineSha, ...(action === "qaProvisionSuper" ? { superadminUpdateTime: response.body.writeResults[0].updateTime } : action === "qaSetStaff" ? { staffUpdateTime: response.body.writeResults[0].updateTime } : { rolledBack: true }), action, updatedAt: new Date().toISOString() };
      fs.writeFileSync(checkpointPath, JSON.stringify(next, null, 2) + "\n");
    }
    const after = documentsWritten ? await candidates() : current;
    const result = { checkedAt: new Date().toISOString(), target, action, documentsWritten, profiles: Object.entries(after).map(([alias, value]) => ({ alias, profilePresent: Boolean(value.profile), role: value.profile?.fields.role ?? null, active: value.profile?.fields.active ?? null, calendarWriter: value.profile?.fields.calendarWriter ?? null })), accountsCreatedByCli: 0, calendarDocumentsWritten: 0, productionAccessed: false, personalDetailsLogged: false };
    const output = path.join(root, "output/playwright/calendar-staging-role-qa");fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(path.join(output, action + ".json"), JSON.stringify(result, null, 2) + "\n");
    return result;
  }
  if (action === "qaRolePreflight") {
    const requested = process.argv.slice(4).map(value => {
      const separator = value.indexOf("="), role = value.slice(0, separator), email = value.slice(separator + 1).trim().toLowerCase();
      if (separator < 1 || !["staff", "superadmin"].includes(role) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Explicit staging QA role/email pairs required");
      return { role, email };
    });
    if (requested.length !== 2 || new Set(requested.map(row => row.role)).size !== 2 || new Set(requested.map(row => row.email)).size !== 2) throw new Error("Exactly two distinct approved QA candidates required");
    const { Client } = require("./lib/apiv2");
    const identity = new Client({ urlPrefix: "https://identitytoolkit.googleapis.com", apiVersion: "v1" });
    const store = new Client({ urlPrefix: "https://firestore.googleapis.com", apiVersion: "v1" });
    const candidates = [];
    for (const candidate of requested) {
      const lookup = await identity.post(`/projects/${target}/accounts:lookup`, { email: [candidate.email] }, { queryParams: { fields: "users(localId,emailVerified,providerUserInfo(providerId))" } });
      const users = lookup.body.users || [];
      if (users.length > 1) throw new Error("Ambiguous staging QA identity");
      if (!users.length) { candidates.push({ requestedRole: candidate.role, authAccountPresent: false, profilePresent: null, currentRole: null, roleMatchesRequested: false });continue; }
      const user = users[0];
      if (!/^[A-Za-z0-9:_-]{1,128}$/.test(user.localId)) throw new Error("Unsupported staging QA identity reference");
      const response = await store.post(`/projects/${target}/databases/(default)/documents:batchGet`, { documents: [`projects/${target}/databases/(default)/documents/users/${user.localId}`], mask: { fieldPaths: ["role", "active", "calendarWriter"] } });
      if (!Array.isArray(response.body) || response.body.length !== 1 || !response.body[0].found && !response.body[0].missing) throw new Error("Unexpected staging QA profile response");
      const profile = response.body[0].found, fields = profile?.fields || {};
      candidates.push({ requestedRole: candidate.role, authAccountPresent: true, verifiedGoogle: user.emailVerified === true && user.providerUserInfo?.some(provider => provider.providerId === "google.com") === true, profilePresent: Boolean(profile), currentRole: fields.role?.stringValue || null, active: fields.active?.booleanValue ?? null, calendarWriter: fields.calendarWriter?.booleanValue === true, roleMatchesRequested: fields.role?.stringValue === candidate.role });
    }
    const result = { checkedAt: new Date().toISOString(), target, candidates, authAccountsChanged: false, firestoreDocumentsWritten: 0, productionAccessed: false, emailsAndUidsLogged: false, privilegedReadIsNotRulesEvidence: true };
    const output = path.join(root, "output/playwright/calendar-cloud-session-qa");fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(path.join(output, "role-preflight.json"), JSON.stringify(result, null, 2) + "\n");
    return result;
  }
  if (action === "qaAudit") {
    const label = process.argv[4];
    if (!["before", "after"].includes(label)) throw new Error("Explicit QA audit label required");
    const reportScope = process.argv[5];
    if (reportScope !== undefined && !["role-qa", "role-write-plan", "role-write-qa"].includes(reportScope)) throw new Error("Unsupported QA audit report scope");
    const bytes = fs.readFileSync(path.join(root, "docs/development/calendar-role-concurrency-qa/staging-fixtures.json"));
    const plan = JSON.parse(bytes);
    const rules = stagingQaRowsToRules(plan);
    const { Client } = require("./lib/apiv2"), client = new Client({ urlPrefix: "https://firestore.googleapis.com", apiVersion: "v1" });
    const prefix = `/projects/${target}/databases/(default)/documents`;
    let queryRequests = 0, cursor = 0;
    const targets = new Map(), operations = new Map();
    for (const item of plan.cases) for (const request of item.requests) {
      const draft = { rules: rules.slice(cursor, cursor + request.length), events: [] };
      cursor += request.length;
      const prepared = await prepareCalendarCreate(draft, []);
      operations.set(prepared.operationId, { case: item.id, expectedCount: prepared.entries.length });
      for (const entry of prepared.entries) targets.set(entry.id, { ...entry, operationId: prepared.operationId });
    }
    async function projected(reference, selected) {
      queryRequests++;
      const response = await client.post(`${prefix}:batchGet`, { documents: [`projects/${target}/databases/(default)/documents/${reference}`], mask: { fieldPaths: selected } });
      const rows = response.body;
      if (!Array.isArray(rows) || rows.length !== 1) throw new Error("QA audit returned an unexpected reference count");
      if (rows[0].missing) return null;
      if (!rows[0].found) throw new Error("QA audit could not read an expected reference");
      const decode = value => value.stringValue ?? value.booleanValue ?? (value.integerValue !== undefined ? Number(value.integerValue) : null);
      return Object.fromEntries(Object.entries(rows[0].found.fields || {}).map(([key, value]) => [key, decode(value)]));
    }
    const schedules = [];
    for (const [id, entry] of targets) {
      const value = await projected(`classroomSchedules/${id}`, [...Object.keys(entry.value), "operationId"]);
      schedules.push({ title: entry.value.subject, exists: value !== null, exactFieldsMatched: value === null ? null : Object.entries(entry.value).every(([key, expected]) => value[key] === expected), operationMatches: value === null ? null : value.operationId === entry.operationId });
    }
    const receipts = [];
    for (const [id, expected] of operations) {
      const value = await projected(`calendarWriteOperations/${id}`, ["count", "skipped", "schemaVersion"]);
      receipts.push({ case: expected.case, exists: value !== null, count: value?.count ?? null, countMatches: value === null ? null : value.count === expected.expectedCount });
    }
    const gate = await projected("calendarWriteState/main", ["revision"]);
    const result = { checkedAt: new Date().toISOString(), target, manifestSHA256: createHash("sha256").update(bytes).digest("hex"), label, schedules, receipts, schedulesFound: schedules.filter(row => row.exists).length, receiptsFound: receipts.filter(row => row.exists).length, revision: gate?.revision ?? null, queryRequests, recordsWritten: 0, personalDetailsSelected: false, privilegedReadIsNotRulesEvidence: true };
    const output = path.join(root, reportScope === "role-qa" ? "output/playwright/calendar-staging-role-qa" : reportScope === "role-write-plan" ? "output/playwright/calendar-role-write-plan" : reportScope === "role-write-qa" ? "output/playwright/calendar-role-write-qa" : "output/playwright/calendar-role-concurrency-qa");
    fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(path.join(output, `cloud-storage-audit-${label}.json`), JSON.stringify(result, null, 2) + "\n");
    return result;
  }
  if (action === "qaRoleWriteAudit") {
    const label = process.argv[4], expectedActor = process.argv[5];
    if (!["before", "staff-denied", "created", "repeated", "final"].includes(label) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(expectedActor || "")) throw new Error("Explicit QA audit stage and approved actor required");
    const bytes = fs.readFileSync(path.join(root, "docs/development/calendar-role-write-plan/staging-fixture.json"));
    const manifestSHA256 = createHash("sha256").update(bytes).digest("hex");
    if (manifestSHA256 !== "cc046d34339f6a02bee2c5af99b5036c24dbfae8624baee2f2db3e2f8354ff55") throw new Error("Approved role-write manifest changed");
    const prepared = await prepareRoleWriteFixture(JSON.parse(bytes));
    const { Client } = require("./lib/apiv2"), store = new Client({ urlPrefix: "https://firestore.googleapis.com", apiVersion: "v1" }), identity = new Client({ urlPrefix: "https://identitytoolkit.googleapis.com", apiVersion: "v1" });
    const lookup = await identity.post(`/projects/${target}/accounts:lookup`, { email: [expectedActor] }, { queryParams: { fields: "users(localId,emailVerified,providerUserInfo(providerId))" } });
    const users = lookup.body.users || [];
    if (users.length !== 1 || users[0].emailVerified !== true || !users[0].providerUserInfo?.some(value => value.providerId === "google.com")) throw new Error("Verified approved QA actor required");
    const actorUid = users[0].localId, prefix = `projects/${target}/databases/(default)/documents`;
    const references = { schedule: `${prefix}/classroomSchedules/${prepared.entries[0].id}`, receipt: `${prefix}/calendarWriteOperations/${prepared.operationId}`, gate: `${prefix}/calendarWriteState/main` };
    const response = await store.post(`/${prefix}:batchGet`, { documents: Object.values(references), mask: { fieldPaths: [...Object.keys(prepared.entries[0].value), "operationId", "createdBy", "createdAt", "count", "skipped", "schemaVersion", "revision", "updatedBy", "updatedAt"] } });
    if (!Array.isArray(response.body) || response.body.length !== 3) throw new Error("Unexpected QA write audit response");
    const rows = Object.fromEntries(response.body.map(value => [value.found?.name || value.missing, value.found?.fields || null]));
    if (Object.values(references).some(reference => !(reference in rows))) throw new Error("Incomplete QA write audit");
    const decode = value => value.stringValue ?? value.booleanValue ?? value.timestampValue ?? (value.integerValue !== undefined ? Number(value.integerValue) : null);
    const canonical = value => value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
    const records = Object.fromEntries(Object.entries(references).map(([alias, reference]) => {
      const fields = rows[reference];
      if (!fields) return [alias, { exists: false }];
      const data = Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decode(value)]));
      return [alias, { exists: true, digest: createHash("sha256").update(JSON.stringify(canonical(fields))).digest("hex"), operationMatches: alias === "receipt" ? reference === `${prefix}/calendarWriteOperations/${prepared.operationId}` : data.operationId === prepared.operationId, ...(alias === "schedule" ? { exactBusinessFieldsMatched: Object.entries(prepared.entries[0].value).every(([key, value]) => data[key] === value) } : {}), ...(alias === "gate" ? { revision: data.revision, expectedActorMatched: data.updatedBy === actorUid, timestampPresent: Boolean(data.updatedAt) } : { expectedActorMatched: data.createdBy === actorUid, timestampPresent: Boolean(data.createdAt), schemaVersion: data.schemaVersion, ...(alias === "receipt" ? { count: data.count, skipped: data.skipped } : {}) }) }];
    }));
    const result = { checkedAt: new Date().toISOString(), target, manifestSHA256, stage: label, ...records, recordsWritten: 0, actorIdentifiersLogged: false, privilegedReadIsNotRulesEvidence: true };
    const output = path.join(root, "output/playwright/calendar-role-write-qa");fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(path.join(output, `cloud-audit-${label}.json`), JSON.stringify(result, null, 2) + "\n");return result;
  }
  if (action === "qaRoleWritePreflight") {
    const reportScope = process.argv[4];
    if (reportScope !== undefined && reportScope !== "role-write-qa") throw new Error("Unsupported role-write preflight report scope");
    const bytes = fs.readFileSync(path.join(root, "docs/development/calendar-role-write-plan/staging-fixture.json"));
    const proposal = JSON.parse(bytes);validateRoleWritePlan(proposal);
    const prepared = await prepareRoleWriteFixture(proposal);
    const { Client } = require("./lib/apiv2"), store = new Client({ urlPrefix: "https://firestore.googleapis.com", apiVersion: "v1" });
    const prefix = `projects/${target}/databases/(default)/documents`;
    const decode = value => value.stringValue ?? value.booleanValue ?? (value.integerValue !== undefined ? Number(value.integerValue) : value.arrayValue ? (value.arrayValue.values || []).map(decode) : null);
    const condition = (name, op, value) => ({ fieldFilter: { field: { fieldPath: name }, op, value: field(value) } });
    async function projectedQuery(collection, selected, filters, ordered = false) {
      const structuredQuery = { from: [{ collectionId: collection }], select: { fields: selected.map(fieldPath => ({ fieldPath })) }, where: filters.length === 1 ? filters[0] : { compositeFilter: { op: "AND", filters } }, limit: 201, ...(ordered ? { orderBy: [{ field: { fieldPath: "date" }, direction: "ASCENDING" }] } : {}) };
      const result = await store.post(`/${prefix}:runQuery`, { structuredQuery });
      if (!Array.isArray(result.body)) throw new Error("Unexpected role-write query response");
      const records = result.body.filter(value => value.document).map(value => Object.fromEntries(Object.entries(value.document.fields || {}).map(([key, item]) => [key, decode(item)])));
      if (records.length > 200) throw new Error("Role-write read limit exceeded");
      return records;
    }
    const classrooms = await projectedQuery("classroomSchedules", ["room", "dayOfWeek", "startTime", "endTime", "validFrom", "validTo"], [condition("isActive", "EQUAL", true)]);
    const exams = await projectedQuery("dlExamSchedules", ["date", "locations", "startTime", "endTime"], [condition("isActive", "EQUAL", true), condition("date", "GREATER_THAN_OR_EQUAL", proposal.fixture.date), condition("date", "LESS_THAN_OR_EQUAL", proposal.fixture.date)], true);
    const references = { gate: `${prefix}/calendarWriteState/main`, schedule: `${prefix}/classroomSchedules/${prepared.entries[0].id}`, receipt: `${prefix}/calendarWriteOperations/${prepared.operationId}` };
    const response = await store.post(`/${prefix}:batchGet`, { documents: Object.values(references), mask: { fieldPaths: ["revision", "schemaVersion"] } });
    if (!Array.isArray(response.body) || response.body.length !== 3) throw new Error("Unexpected role-write reference audit");
    const projected = Object.fromEntries(response.body.map(value => [value.found?.name || value.missing, value.found ? { exists: true, revision: decode(value.found.fields?.revision || {}) } : { exists: false }]));
    if (Object.values(references).some(reference => !projected[reference])) throw new Error("Incomplete role-write reference audit");
    const occupancy = roleWriteOccupancy(proposal, classrooms, exams), gate = projected[references.gate];
    const result = { checkedAt: new Date().toISOString(), target, manifestSHA256: createHash("sha256").update(bytes).digest("hex"), candidateDate: proposal.fixture.date, candidateRoom: proposal.fixture.room, activeClassroomsConsidered: classrooms.length, examsInRangeConsidered: exams.length, ...occupancy, candidateScheduleExists: projected[references.schedule].exists, candidateReceiptExists: projected[references.receipt].exists, revision: gate.exists ? gate.revision : null, readyAtReadTime: occupancy.candidateClearAtReadTime && gate.revision === proposal.expectedBefore.revision && !projected[references.schedule].exists && !projected[references.receipt].exists, queryRequests: 3, namesOrProctorsSelected: false, recordsWritten: 0, privilegedReadIsNotRulesEvidence: true };
    const output = path.join(root, reportScope === "role-write-qa" ? "output/playwright/calendar-role-write-qa" : "output/playwright/calendar-role-write-plan");fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(path.join(output, "cloud-preflight.json"), JSON.stringify(result, null, 2) + "\n");
    return result;
  }
  if (action === "qaPreflight") {
    const bytes = fs.readFileSync(path.join(root, "docs/development/calendar-role-concurrency-qa/staging-fixtures.json"));
    const plan = JSON.parse(bytes), { range } = validateStagingQaPlan(plan);
    const { Client } = require("./lib/apiv2"), client = new Client({ urlPrefix: "https://firestore.googleapis.com", apiVersion: "v1" });
    const decode = value => value.stringValue ?? value.booleanValue ?? (value.arrayValue ? value.arrayValue.values?.map(decode) || [] : null);
    const condition = (fieldPath, op, value) => ({ fieldFilter: { field: { fieldPath }, op, value: field(value) } });
    async function selectedQuery(collection, selected, filters, orderBy) {
      const structuredQuery = { from: [{ collectionId: collection }], select: { fields: selected.map(fieldPath => ({ fieldPath })) }, where: filters.length === 1 ? filters[0] : { compositeFilter: { op: "AND", filters } }, limit: 201 };
      if (orderBy) structuredQuery.orderBy = orderBy;
      const response = await client.post(`/projects/${target}/databases/(default)/documents:runQuery`, { structuredQuery });
      const rows = response.body.filter(row => row.document).map(row => Object.fromEntries(Object.entries(row.document.fields || {}).map(([key, value]) => [key, decode(value)])));
      if (rows.length > 200) throw new Error("QA preflight exceeded bounded read limit");
      return rows;
    }
    const classrooms = await selectedQuery("classroomSchedules", ["room", "dayOfWeek", "startTime", "endTime", "validFrom", "validTo"], [condition("isActive", "EQUAL", true)]);
    const exams = await selectedQuery("dlExamSchedules", ["date", "locations", "startTime", "endTime"], [condition("isActive", "EQUAL", true), condition("date", "GREATER_THAN_OR_EQUAL", range.start), condition("date", "LESS_THAN_OR_EQUAL", range.end)], [{ field: { fieldPath: "date" }, direction: "ASCENDING" }]);
    const result = { checkedAt: new Date().toISOString(), target, manifestSHA256: createHash("sha256").update(bytes).digest("hex"), dateRange: range, activeClassroomsConsidered: classrooms.length, examsInRangeConsidered: exams.length, queryRequests: 2, ...stagingQaOccupancy(plan, classrooms, exams), namesOrProctorsSelected: false, recordsWritten: 0, privilegedReadIsNotRulesEvidence: true };
    const output = path.join(root, "output/playwright/calendar-role-concurrency-qa");fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(path.join(output, "cloud-preflight.json"), JSON.stringify(result, null, 2) + "\n");
    return result;
  }
  if (action === "billing") return {
    billingEnabled: await require("./lib/gcp/cloudbilling").checkBillingEnabled(target)
  };
  if (action === "enableFirestore") {
    await require("./lib/ensureApiEnabled").ensure(target, "firestore.googleapis.com", "calendar-staging", false);
    return {
      firestoreApiEnabled: true
    };
  }
  if (action === "authDomains") {
    const {
      Client
    } = require("./lib/apiv2");
    const client = new Client({
      urlPrefix: "https://identitytoolkit.googleapis.com",
      apiVersion: "admin/v2"
    });
    const authorizedDomains = ["labboy-workload-app-staging.firebaseapp.com", "labboy-workload-app-staging.web.app", "localhost", "127.0.0.1", "northwest-revised-domains-varies.trycloudflare.com"];
    const response = await client.patch(`/projects/${target}/config`, {
      authorizedDomains
    }, {
      queryParams: {
        updateMask: "authorizedDomains",
        fields: "authorizedDomains"
      }
    });
    return {
      authorizedDomains: response.body.authorizedDomains
    };
  }
  if (action === "authStatus") {
    const {
        Client
      } = require("./lib/apiv2"),
      client = new Client({
        urlPrefix: "https://identitytoolkit.googleapis.com",
        apiVersion: "admin/v2"
      });
    const provider = await client.get(`/projects/${target}/defaultSupportedIdpConfigs/google.com`, {
      queryParams: {
        fields: "name,enabled"
      }
    });
    return {
      googleEnabled: provider.body.enabled === true
    };
  }
  if (action === "indexes") {
    const indexes = await new (require("./lib/firestore/api").FirestoreApi)().listIndexes(target, "(default)");
    return {
      indexes: indexes.map(index => ({
        name: index.name,
        state: index.state,
        fields: index.fields?.map(field => ({
          fieldPath: field.fieldPath,
          order: field.order,
          arrayConfig: field.arrayConfig
        }))
      }))
    };
  }
  if (action === "queryValidation") {
    const {
        Client
      } = require("./lib/apiv2"),
      client = new Client({
        urlPrefix: "https://firestore.googleapis.com",
        apiVersion: "v1"
      });
    const decode = value => value.stringValue ?? value.booleanValue ?? (value.integerValue !== undefined ? Number(value.integerValue) : value.arrayValue ? value.arrayValue.values?.map(decode) || [] : value.mapValue ? Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([key, item]) => [key, decode(item)])) : null);
    const equal = (fieldPath, value) => ({
      fieldFilter: {
        field: {
          fieldPath
        },
        op: "EQUAL",
        value: field(value)
      }
    });
    async function query(collection, filters, fields, orderBy) {
      const structuredQuery = {
        from: [{
          collectionId: collection
        }],
        select: {
          fields: fields.map(fieldPath => ({
            fieldPath
          }))
        },
        where: {
          compositeFilter: {
            op: "AND",
            filters
          }
        },
        limit: 201
      };
      if (orderBy) structuredQuery.orderBy = orderBy;
      const response = await client.post(`/projects/${target}/databases/(default)/documents:runQuery`, {
        structuredQuery
      });
      return response.body.filter(row => row.document).map(row => ({
        ...Object.fromEntries(Object.entries(row.document.fields || {}).map(([key, value]) => [key, decode(value)])),
        id: row.document.name.split("/").at(-1)
      }));
    }
    const users = await query("users", [equal("active", true), {
      fieldFilter: {
        field: {
          fieldPath: "role"
        },
        op: "IN",
        value: field(["staff", "admin", "superadmin"])
      }
    }], ["displayName", "role", "active"]);
    const classroomSchedules = await query("classroomSchedules", [equal("isActive", true)], ["room", "dayOfWeek", "startTime", "endTime", "subject", "teacher", "semester", "validFrom", "validTo", "isActive"]);
    const dlExamSchedules = await query("dlExamSchedules", [equal("isActive", true), {
      fieldFilter: {
        field: {
          fieldPath: "date"
        },
        op: "GREATER_THAN_OR_EQUAL",
        value: field("2026-11-01")
      }
    }, {
      fieldFilter: {
        field: {
          fieldPath: "date"
        },
        op: "LESS_THAN_OR_EQUAL",
        value: field("2026-11-30")
      }
    }], ["date", "startTime", "endTime", "timeSlot", "locations", "location", "studentCount", "proctors", "examType", "isActive"], [{
      field: {
        fieldPath: "date"
      },
      direction: "ASCENDING"
    }]);
    const result = adaptCalendarDocuments({
      users,
      classroomSchedules,
      dlExamSchedules
    });
    return {
      authorization: "provisioning-cli-not-app-user",
      directoryCount: users.length,
      classroomCount: result.data.rules.length,
      novemberExamCount: result.data.events.length,
      adapterIssues: result.issues.length,
      starts: result.data.events.map(event => event.start).sort(),
      documentDetailsLogged: false
    };
  }
  if (action === "seed") {
    const records = Object.entries(calendarEmulatorFixtures).flatMap(([collection, values]) => values.map(({
      id,
      ...data
    }) => ({
      collection,
      id,
      data
    })));
    return {
      syntheticDocumentsWritten: await writeFixtures(records),
      authAccountsCopied: false,
      productionRead: false
    };
  }
  if (action === "provisionWriter" || action === "disableWriter" || action === "writerStatus") {
    let provisionStep = "verify-google-account";
    try {
      const { Client } = require("./lib/apiv2");
      const identity = new Client({ urlPrefix: "https://identitytoolkit.googleapis.com", apiVersion: "v1" });
      const lookup = await identity.post(`/projects/${target}/accounts:lookup`, { email: [account] }, { queryParams: { fields: "users(localId,emailVerified,providerUserInfo(providerId))" } });
      const users = lookup.body.users || [];
      if (users.length !== 1 || !users[0].emailVerified || !users[0].providerUserInfo?.some(provider => provider.providerId === "google.com")) throw new Error("Verified staging Google account required");
      const store = new Client({ urlPrefix: "https://firestore.googleapis.com", apiVersion: "v1" });
      const prefix = `/projects/${target}/databases/(default)/documents`;
      const profilePath = `${prefix}/users/${users[0].localId}`;
      provisionStep = "verify-profile-role";
      const profile = await store.get(profilePath, { queryParams: { "mask.fieldPaths": "role" } });
      const activeProfile = await store.get(profilePath, { queryParams: { "mask.fieldPaths": "active" } });
      if (activeProfile.body.fields?.active?.booleanValue !== true || !["admin","superadmin"].includes(profile.body.fields?.role?.stringValue)) throw new Error("Active staging administrator required");
      if (action === "writerStatus") {
        provisionStep = "read-writer-status";
        const capability = await store.get(profilePath, { queryParams: { "mask.fieldPaths": "calendarWriter" } });
        const gate = await store.get(`${prefix}/calendarWriteState/main`, { resolveOnHTTPError: true, queryParams: { "mask.fieldPaths": "revision" } });
        return { writerEnabled: capability.body.fields?.calendarWriter?.booleanValue === true, gateReady: gate.status === 200, revision: gate.status === 200 ? Number(gate.body.fields?.revision?.integerValue) : null, personalDetailsLogged: false };
      }
      if (action === "provisionWriter") {
        provisionStep = "verify-revision-gate";
        const gate = await store.get(`${prefix}/calendarWriteState/main`, { resolveOnHTTPError: true, queryParams: { "mask.fieldPaths": "revision" } });
        if (gate.status === 404) await store.post(`${prefix}:commit`, { writes: [{ update: { name: `projects/${target}/databases/(default)/documents/calendarWriteState/main`, fields: { revision: { integerValue: "0" } } }, currentDocument: { exists: false } }] });
        else if (gate.status !== 200 || !Number.isSafeInteger(Number(gate.body.fields?.revision?.integerValue))) throw new Error("Invalid revision gate");
      }
      provisionStep = "update-writer-capability";
      await store.patch(profilePath, { fields: { calendarWriter: { booleanValue: action === "provisionWriter" } } }, { queryParams: { "updateMask.fieldPaths": "calendarWriter" } });
      return { writerEnabled: action === "provisionWriter", profileDetailsLogged: false, existingProfileFieldsPreserved: true, existingGateNeverReset: true };
    } catch { throw new Error(`Staging writer provisioning failed at ${provisionStep}; no credential or profile details logged`); }
  }
  if (action === "provisionReader") {
    const {
        Client
      } = require("./lib/apiv2"),
      client = new Client({
        urlPrefix: "https://identitytoolkit.googleapis.com",
        apiVersion: "v1"
      });
    const response = await client.post(`/projects/${target}/accounts:lookup`, {
      email: [account]
    }, {
      queryParams: {
        fields: "users(localId,emailVerified,providerUserInfo(providerId))"
      }
    });
    const users = response.body.users || [];
    if (users.length !== 1 || !users[0].emailVerified || !users[0].providerUserInfo?.some(p => p.providerId === "google.com")) return {
      readerProfileReady: false,
      reason: "verified_google_login_required"
    };
    await writeFixtures([{
      collection: "users",
      id: users[0].localId,
      data: {
        displayName: "ผู้ทดสอบหลัก",
        role: "admin",
        active: true
      }
    }]);
    return {
      readerProfileReady: true,
      role: "admin",
      personalDetailsLogged: false
    };
  }
  throw new Error("Unknown staging admin action");
});
try {
  const result = await command.runner()({
    project: target,
    account,
    json: true,
    nonInteractive: true,
    cwd: directory
  });
  console.log(JSON.stringify({
    success: true,
    target,
    action,
    result
  }));
} catch (error) {
  console.log(JSON.stringify({
    success: false,
    target,
    action,
    reason: String(error.message || "Staging admin operation failed").replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[account]").replace(/Bearer\s+\S+/gi, "Bearer [redacted]").slice(0, 1000)
  }));
  process.exitCode = 1;
}
