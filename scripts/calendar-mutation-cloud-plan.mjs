// Pure, pinned QA plan and Rules rendering. No SDK, credentials, deployment or cloud writes.
import { createHash } from "node:crypto";
import { adaptCalendarDocuments } from "../frontend/lib/calendarDataAdapter.js";
import { prepareCalendarMutation, validateCalendarMutationAgainst } from "../frontend/lib/calendarMutationPlan.js";
export const MUTATION_QA_MANIFEST_SHA = "d0ebac68d1b06fc2cf12753ea46e53a9f48421a98a84c64ed4465866272dbd17";
export const MUTATION_SOURCE_SHA = "89484e3d4d84dc46b500df6ff51497d2b8cbf707783076d382e5adc19ef7cb3c";
export const APPEND_ONLY_SOURCE_SHA = "6cd83e8b8a287f301725b26adbb36c987f789351a8aea1475a6150d40bae458f";
export const normalizeQaText = text => text.replaceAll("\r\n", "\n").trimEnd();
export const qaTextHash = text => createHash("sha256").update(normalizeQaText(text)).digest("hex");
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
export const qaValueHash = value => createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
const same = (a, b) => qaValueHash(a) === qaValueHash(b);
const fail = message => { throw new Error(message); };
const ref = target => target.collection + "/" + target.id;
const metadataFields = ["mutationVersion", "lastOperationId", "updatedBy", "updatedAt"];
export async function prepareMutationCloudPlan(manifestText, identities) {
  if (qaTextHash(manifestText) !== MUTATION_QA_MANIFEST_SHA) fail("Mutation manifest changed; renewed review is required");
  if (!identities || ["staff", "superadmin"].some(alias => !/^[A-Za-z0-9:_-]{1,128}$/.test(identities[alias] || "")) || identities.staff === identities.superadmin) fail("Two distinct verified identity aliases are required");
  const manifest = JSON.parse(manifestText), people = manifest.identityAliases.map(alias => ({ id: identities[alias], label: "Synthetic " + alias, identity: "directory" }));
  const initialRecords = manifest.targets.map(target => {
    const value = structuredClone(target.initial);
    if (value.proctorAliases) { value.proctors = value.proctorAliases.map(alias => identities[alias]).sort();delete value.proctorAliases; }
    return { collection: target.collection, id: target.id, value: { ...value, operationId: target.creationOperationId, createdBy: identities.superadmin, schemaVersion: 1 } };
  });
  const current = new Map(initialRecords.map(record => [ref(record), structuredClone(record.value)])), operations = [];
  for (const [index, operation] of manifest.operations.entries()) {
    const target = manifest.targets.find(row => row.alias === operation.target), key = ref(target), before = current.get(key);
    if ((before.mutationVersion ?? 0) !== operation.expectedVersion) fail("Invalid reviewed operation order");
    const after = { ...before, ...operation.patch };
    const adapt = value => {
      const snapshot = adaptCalendarDocuments({ users: people.map(p => ({ id: p.id, displayName: p.label, role: "staff", active: true })), [target.collection]: [{ id: target.id, ...value }] });
      if (!snapshot.complete) fail("Reviewed target cannot be adapted");
      return [...snapshot.data.rules, ...snapshot.data.events][0];
    };
    const input = { action: operation.action, original: adapt(before), ...(operation.action === "edit" ? { replacement: adapt(after) } : {}) };
    const plan = await prepareCalendarMutation(input, people);
    operations.push({ id: operation.id, expectedRevision: manifest.baselineRevision + index, input, ...plan });
    current.set(key, { ...before, ...plan.value, mutationVersion: plan.expectedVersion + 1, lastOperationId: plan.operationId, updatedBy: identities.superadmin });
  }
  if (operations.length !== 4 || new Set(operations.map(row => row.operationId)).size !== 4 || initialRecords.length !== 2) fail("QA budget mismatch");
  return { manifest, manifestHash: MUTATION_QA_MANIFEST_SHA, actorUid: identities.superadmin, initialRecords, operations };
}

function replaceOnce(source, original, replacement) {
  if (source.split(original).length !== 2) fail("Rules structure changed; review the renderer");
  return source.replace(original, () => replacement);
}
const literal = value => JSON.stringify(value);
// Compare the full business map in one Rules expression; only immutable/mutation metadata
// may differ from this map. This also rejects extra, missing or altered business fields.
const fieldsMatch = (name, fields) => `${name}.diff(${literal(fields)}).affectedKeys().hasOnly(${literal(["operationId", "createdBy", "createdAt", "schemaVersion", ...metadataFields])})`;
export function renderMutationQaRules(sourceText, plan) {
  if (qaTextHash(sourceText) !== MUTATION_SOURCE_SHA) fail("Mutation Rules source changed; renewed review is required");
  if (plan.manifestHash !== MUTATION_QA_MANIFEST_SHA || !/^[A-Za-z0-9:_-]{1,128}$/.test(plan.actorUid)) fail("Pinned resolved plan required");
  const ids = plan.operations.map(row => row.operationId);
  const clauses = plan.operations.map(row => `(
          collection == ${literal(row.target.collection)} && id == ${literal(row.target.id)}
          && d.lastOperationId == ${literal(row.operationId)} && previousVersion(b) == ${row.expectedVersion}
          && get(/databases/$(database)/documents/calendarWriteState/main).data.revision == ${row.expectedRevision}
          && b.operationId == ${literal(row.creationOperationId)} && b.createdBy == ${literal(plan.actorUid)}
          && ${fieldsMatch("b", row.expected)}
          && ${fieldsMatch("d", row.value)}
          && d.diff(b).affectedKeys().hasOnly(${literal([...Object.keys(row.value).filter(key => !same(row.value[key], row.expected[key])), ...metadataFields])})
        )`).join("\n        || ");
  const receiptClauses = plan.operations.map(row => `(id == ${literal(row.operationId)} && d.action == ${literal(row.action)}
          && d.targetCollection == ${literal(row.target.collection)} && d.targetId == ${literal(row.target.id)}
          && d.expectedVersion == ${row.expectedVersion}
          && get(/databases/$(database)/documents/calendarWriteState/main).data.revision == ${row.expectedRevision})`).join("\n        || ");
  const helpers = `    // Reviewed QA allowlist: one actor, two targets, four exact state transitions.
    function mutationQaAllowed(collection, id) {
      let d = request.resource.data;
      let b = resource.data;
      return request.auth.uid == ${literal(plan.actorUid)} && (${clauses});
    }
    function mutationQaReceiptAllowed(d, id) {
      return request.auth.uid == ${literal(plan.actorUid)} && (${receiptClauses});
    }
`;
  let source = normalizeQaText(sourceText);
  source = replaceOnce(source, "    function validReceipt(d, id) {\n      return d.schemaVersion == 1 ? validCreateReceipt(d, id) : validMutationReceipt(d, id);\n    }", helpers + `    function validReceipt(d, id) {
      return (id in ${literal(ids)} && mutationQaReceiptAllowed(d, id) && validMutationReceipt(d, id))
        || (!(id in ${literal(ids)}) && validCreateReceipt(d, id));
    }`);
  // Prevent an extra create from piggybacking on a v2 mutation receipt. Existing v1 creates remain unchanged.
  source = replaceOnce(source, "&& gateAdvanced(d.operationId)", "&& getAfter(/databases/$(database)/documents/calendarWriteOperations/$(d.operationId)).data.schemaVersion == 1\n        && gateAdvanced(d.operationId)");
  for (const [collection, validator] of [["classroomSchedules", "validClass"], ["dlExamSchedules", "validExam"]]) {
    const original = `allow create,update: if writer() && id.matches('^cal-[0-9a-f]{64}$') && ${validator}(request.resource.data,id);`;
    source = replaceOnce(source, original, `allow create: if writer() && id.matches('^cal-[0-9a-f]{64}$') && ${validator}(request.resource.data,id);\n      allow update: if writer() && mutationQaAllowed('${collection}', id) && ${validator}(request.resource.data,id);`);
  }
  return `// Generated review candidate. Never deploy without explicit cloud QA approval.\n// Manifest SHA256: ${plan.manifestHash}\n` + source + "\n";
}

// Snapshot values are already decoded by the caller; no raw identifiers are returned by audits.
export function captureMutationQaBaseline(plan, observed) {
  const documents = observed.documents;
  for (const target of plan.initialRecords) {
    const value = documents[ref(target)];
    if (!value || (value.mutationVersion ?? 0) !== 0 || !same(Object.fromEntries(Object.keys(target.value).map(key => [key, value[key]])), target.value) || !value.createdAt) fail("Initial QA target differs from the reviewed state");
  }
  const baseline = { manifestHash: plan.manifestHash, documents: structuredClone(documents), profileDigests: structuredClone(observed.profileDigests) };
  auditMutationQaProgress(plan, baseline, observed, 0);
  return baseline;
}
export function auditMutationQaProgress(plan, baseline, observed, completed) {
  if (baseline.manifestHash !== plan.manifestHash || !Number.isInteger(completed) || completed < 0 || completed > 4) fail("Invalid audit checkpoint");
  if (!same(baseline.profileDigests, observed.profileDigests)) fail("Profile version changed; stop QA");
  const expectedTargets = new Map(plan.initialRecords.map(row => [ref(row), { ...row.value }]));
  for (const operation of plan.operations.slice(0, completed)) expectedTargets.set(ref(operation.target), { ...expectedTargets.get(ref(operation.target)), ...operation.value, mutationVersion: operation.expectedVersion + 1, lastOperationId: operation.operationId, updatedBy: plan.actorUid });
  const reports = [];
  for (const [reference, expected] of expectedTargets) {
    const actual = observed.documents[reference], initial = baseline.documents[reference];
    if (!actual || !same(Object.fromEntries(Object.keys(expected).map(key => [key, actual[key]])), expected) || actual.createdAt !== initial.createdAt) fail("QA target state or creation metadata changed unexpectedly");
    const version = expected.mutationVersion ?? 0;
    if (version === 0 && !same(actual, initial) || version > 0 && (!actual.updatedAt || !same(Object.keys(actual).sort(), [...Object.keys(initial), ...metadataFields].filter((key, index, all) => all.indexOf(key) === index).sort()))) fail("Unexpected target fields or update metadata");
    reports.push({ reference, version, active: actual.isActive, digest: qaValueHash(actual) });
  }
  const receiptReports = [];
  for (const [index, operation] of plan.operations.entries()) {
    const reference = "calendarWriteOperations/" + operation.operationId, actual = observed.documents[reference];
    if (index >= completed) { if (actual) fail("Unreviewed/future mutation receipt exists");continue; }
    const expected = { action: operation.action, targetCollection: operation.target.collection, targetId: operation.target.id, expectedVersion: operation.expectedVersion, count: 1, skipped: 0, createdBy: plan.actorUid, schemaVersion: 2 };
    if (!actual?.createdAt || !same(Object.fromEntries(Object.keys(expected).map(key => [key, actual[key]])), expected) || !same(Object.keys(actual).sort(), [...Object.keys(expected), "createdAt"].sort())) fail("Mutation receipt differs from the budget");
    receiptReports.push({ id: operation.operationId, digest: qaValueHash(actual) });
  }
  for (const [reference, initial] of Object.entries(baseline.documents)) if (!expectedTargets.has(reference) && reference !== "calendarWriteState/main" && !plan.operations.some(op => reference === "calendarWriteOperations/" + op.operationId)) {
    if (!same(initial, observed.documents[reference])) fail("Protected baseline document changed");
  }
  const gate = observed.documents["calendarWriteState/main"], last = plan.operations[completed - 1];
  if (!gate || gate.revision !== plan.manifest.baselineRevision + completed || completed === 0 && !same(gate, baseline.documents["calendarWriteState/main"]) || last && (gate.operationId !== last.operationId || gate.updatedBy !== plan.actorUid || !gate.updatedAt)) fail("Unexpected gate revision or actor");
  return { completed, revision: gate.revision, schedules: reports, receipts: receiptReports, profileDigestsUnchanged: true, protectedDocumentsUnchanged: true, cloudRecordsWritten: 0 };
}
export function assertMutationQaRollbackAllowed(prepared, currentRulesHash) {
  if (prepared.manifestHash !== MUTATION_QA_MANIFEST_SHA || prepared.rollbackRulesHash !== APPEND_ONLY_SOURCE_SHA || prepared.candidateRulesHash !== currentRulesHash) fail("Current Rules are not this QA candidate; do not overwrite another release");
  return { rollbackAllowed: true, rollbackRulesHash: APPEND_ONLY_SOURCE_SHA };
}
export function preflightMutationCloudConflicts(plan, documents) {
  const current = structuredClone(documents);
  for (const operation of plan.operations) {
    validateCalendarMutationAgainst(operation, current);
    current[operation.target.collection] = current[operation.target.collection].map(row => row.id === operation.target.id ? { ...row, ...operation.value } : row);
  }
  return { checkedOperations: plan.operations.length, conflicts: 0 };
}
export function assertMutationQaCheckpointUnchanged(previous, current) {
  for (const key of ["manifestHash", "completed", "revision", "schedules", "receipts"]) if (!same(previous[key], current[key])) fail("Existing checkpoint changed; preserve the original audit and stop QA");
}
