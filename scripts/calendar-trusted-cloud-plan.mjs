// Pure review helpers. No network, SDK, credentials or file access.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { prepareCalendarCreate, validateCalendarCreateAgainst } from "../frontend/lib/calendarCreatePlan.js";
import { prepareCalendarMutation, validateCalendarMutationTarget, validateCalendarMutationAgainst } from "../frontend/lib/calendarMutationPlan.js";
import { adaptCalendarDocuments } from "../frontend/lib/calendarDataAdapter.js";
import { calendarWeekday } from "../frontend/lib/calendarView.js";

export const TRUSTED_REVIEW_PROJECT = "labboy-workload-app-staging";
export const TRUSTED_REVIEW_PROPOSAL_SHA = "7c7fd051fdd935dcb440ee7c0d54bede8d1d8cf29c915fcf96ad200c5553560a";
const prefix = `/projects/${TRUSTED_REVIEW_PROJECT}/databases/(default)`;
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
export const reviewValueHash = value => createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
export const reviewTextHash = value => createHash("sha256").update(value).digest("hex");

export function assertTrustedReviewRead(api, method, resource, body) {
  assert.equal(typeof resource, "string");
  assert(!resource.includes("?") && !resource.includes("%") && !resource.includes(".."));
  if (api === "rules" && method === "GET" && (resource === `/projects/${TRUSTED_REVIEW_PROJECT}/releases/cloud.firestore` || new RegExp(`^/projects/${TRUSTED_REVIEW_PROJECT}/rulesets/[a-zA-Z0-9-]+$`).test(resource))) return;
  if (api === "auth" && method === "POST" && resource === `/projects/${TRUSTED_REVIEW_PROJECT}/accounts:lookup`) {
    assert.deepEqual(Object.keys(body), ["email"]);assert.equal(body.email.length, 1);assert.match(body.email[0], /^[^\s@]+@[^\s@]+\.[^\s@]+$/);return;
  }
  assert.equal(api, "store");
  if (method === "GET" && resource === prefix) return;
  assert.equal(method, "POST");
  if (resource === prefix + "/documents:batchGet") {
    assert(body.documents.length > 0 && body.documents.length <= 24);
    for (const reference of body.documents) assert(new RegExp(`^${prefix.slice(1).replace(/[()]/g, "\\$&")}/documents/(?:users/[a-zA-Z0-9_-]+|calendarWriteState/main|classroomSchedules/cal-[0-9a-f]{64}|dlExamSchedules/cal-[0-9a-f]{64}|calendarWriteOperations/op-[0-9a-f]{64})$`).test(reference));
    assert(Object.keys(body).every(key => ["documents", "mask"].includes(key)));return;
  }
  assert.equal(resource, prefix + "/documents:runQuery");
  assert.deepEqual(Object.keys(body), ["structuredQuery"]);
  const query = body.structuredQuery;
  assert.equal(query.limit, 201);assert.equal(query.from.length, 1);
  assert(["users", "classroomSchedules", "dlExamSchedules"].includes(query.from[0].collectionId));
  assert(!query.from[0].allDescendants && query.select?.fields?.length > 0);
}

export async function freezeTrustedReview(proposal, identities, profiles, baselineDocuments) {
  assert.equal(proposal.target.projectId, TRUSTED_REVIEW_PROJECT);
  assert.equal(proposal.target.databaseId, "(default)");assert.equal(proposal.cloudExecutionApproved, false);
  assert.equal(proposal.budgets.maximumNewSchedules, 5);assert.equal(proposal.budgets.maximumCreateOrMutatePostRequests, 13);
  assert.deepEqual(Object.keys(identities).sort(), ["staff", "superadmin"]);
  assert(identities.staff && identities.superadmin && identities.staff !== identities.superadmin);
  for (const [alias, uid] of Object.entries(identities)) {
    assert.match(uid, /^[a-zA-Z0-9_-]+$/);
    assert.equal(profiles[alias]?.active, true);assert.equal(profiles[alias]?.role, alias);
    assert(baselineDocuments.users.some(row => row.id === uid));
  }
  assert.equal(profiles.superadmin.calendarWriter, true);
  assert.equal(profiles.staff.calendarWriter, false);
  for (const collection of ["users", "classroomSchedules", "dlExamSchedules"]) assert(baselineDocuments[collection].length <= 200);
  const documents = structuredClone(baselineDocuments), adapted = adaptCalendarDocuments(documents);
  assert.equal(adapted.complete, true, "Baseline adapter must be complete; do not silently omit invalid records");
  const people = adapted.people, templates = proposal.inputTemplates;
  const makeRule = (input, title, room) => ({ kind: "classroom", title, rooms: [room], weekday: calendarWeekday(input.date), validFrom: input.date, validTo: input.date, start: input.start, end: input.end, semester: input.semester, teacher: "" });
  const batch = rules => ({ rules, events: [] });
  const operations = [], rejections = [];
  function rememberCreate(id, input, plan) {
    const checked = validateCalendarCreateAgainst(plan, documents);assert.equal(checked.skipped, 0, "Existing deterministic target requires review");
    for (const entry of checked.entries) documents[entry.collection].push({ ...entry.value, id: entry.id, operationId: plan.operationId, schemaVersion: 1, createdBy: identities.superadmin });
    operations.push({ id, kind: "create", input, operationId: plan.operationId, entries: plan.entries, expectedNewSchedules: checked.entries.length });
  }
  const manualInput = batch([makeRule(templates.manual, templates.manual.title, templates.manual.room)]);
  const manual = await prepareCalendarCreate(manualInput, people);rememberCreate("manual", manualInput, manual);
  const free = templates.atomicConflict;
  const atomicInput = batch([makeRule({ date: free.freeDate, start: free.freeStart, end: free.freeEnd, semester: templates.manual.semester }, "QA-SERVER-ATOMIC-FREE", free.freeRoom), makeRule(templates.manual, "QA-SERVER-ATOMIC-CONFLICT", templates.manual.room)]);
  const atomic = await prepareCalendarCreate(atomicInput, people);
  assert.throws(() => validateCalendarCreateAgainst(atomic, documents), error => error.code === "calendar-write-validation");
  rejections.push({ id: "atomic-room-conflict", kind: "create", input: atomicInput, operationId: atomic.operationId, entries: atomic.entries, expectedHttpStatus: 400 });
  const pdfInput = batch(templates.pdfReview.rooms.map(room => makeRule(templates.pdfReview, templates.pdfReview.titlePrefix + " " + room, room)));
  rememberCreate("pdf", pdfInput, await prepareCalendarCreate(pdfInput, people));
  const dlInput = { rules: [], events: templates.dlReview.dates.map(date => ({ kind: "dl", title: templates.dlReview.title, date, start: templates.dlReview.start, end: templates.dlReview.end, rooms: templates.dlReview.rooms, participants: templates.dlReview.participantsPerRound, proctors: [identities.staff, identities.superadmin], examType: "student", semester: templates.dlReview.semester, repeat: "none" })) };
  rememberCreate("dl", dlInput, await prepareCalendarCreate(dlInput, people));
  const dlConflictInput = { rules: [], events: [{ ...dlInput.events[0], title: "QA-SERVER-DL-CONFLICT" }] };
  const dlConflict = await prepareCalendarCreate(dlConflictInput, people);
  assert.throws(() => validateCalendarCreateAgainst(dlConflict, documents), error => error.code === "calendar-write-validation");
  rejections.push({ id: "dl-room-and-proctor-conflict", kind: "create", input: dlConflictInput, operationId: dlConflict.operationId, entries: dlConflict.entries, expectedHttpStatus: 400 });
  const original = () => adaptCalendarDocuments(documents).data.rules.find(row => row.source.documentId === manual.entries[0].id);
  const before = original(), editInput = { action: "edit", original: before, replacement: { ...before, ...templates.manualEdit } };
  const edit = await prepareCalendarMutation(editInput, people), current = documents.classroomSchedules.find(row => row.id === edit.target.id);
  validateCalendarMutationTarget(edit, current);validateCalendarMutationAgainst(edit, documents);
  Object.assign(current, edit.value, { mutationVersion: 1, lastOperationId: edit.operationId });
  operations.push({ id: "edit", kind: "mutate", input: editInput, operationId: edit.operationId, target: edit.target, expectedVersion: 0 });
  const staleInput = { ...editInput, replacement: { ...before, start: "11:00", end: "12:00" } }, stale = await prepareCalendarMutation(staleInput, people);
  assert.notEqual(stale.operationId, edit.operationId);
  assert.throws(() => validateCalendarMutationTarget(stale, current), error => error.code === "calendar-write-stale");
  rejections.push({ id: "stale-manual-edit", kind: "mutate", input: staleInput, operationId: stale.operationId, target: stale.target, expectedHttpStatus: 409 });
  const cancelInput = { action: "cancel", original: original() }, cancel = await prepareCalendarMutation(cancelInput, people);
  validateCalendarMutationTarget(cancel, current);
  Object.assign(current, cancel.value, { mutationVersion: 2, isActive: false, lastOperationId: cancel.operationId });
  operations.push({ id: "cancel", kind: "mutate", input: cancelInput, operationId: cancel.operationId, target: cancel.target, expectedVersion: 1 });
  assert.equal(operations.length, 5);assert.equal(rejections.length, 3);
  assert.equal(new Set([...operations, ...rejections].map(row => row.operationId)).size, 8);
  const references = [...new Set([...operations, ...rejections].flatMap(row => [`calendarWriteOperations/${row.operationId}`, ...(row.entries || []).map(entry => `${entry.collection}/${entry.id}`)]))].sort();
  assert.equal(references.length, 16);
  return { target: TRUSTED_REVIEW_PROJECT, database: "(default)", cloudExecutionApproved: false, identities, operations, rejections, references, requestSequence: proposal.requestSequence, maximumPostRequests: 13, expectedGateIncrease: 5, expectedNewSchedules: 5, expectedNewReceipts: 5 };
}
