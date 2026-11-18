import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { assertTrustedReviewRead, freezeTrustedReview, reviewValueHash, TRUSTED_REVIEW_PROJECT } from "./calendar-trusted-cloud-plan.mjs";
const proposal = JSON.parse(fs.readFileSync("docs/development/calendar-trusted-writer-qa-prep/cloud-qa.review.json", "utf8"));
const identities = { staff: "synthetic-staff", superadmin: "synthetic-superadmin" };
const profiles = { staff: { role: "staff", active: true, calendarWriter: false }, superadmin: { role: "superadmin", active: true, calendarWriter: true } };
const baseline = () => ({ users: Object.entries(identities).map(([alias, id]) => ({ id, displayName: "Synthetic " + alias, ...profiles[alias] })), classroomSchedules: [], dlExamSchedules: [] });
const prefix = `/projects/${TRUSTED_REVIEW_PROJECT}/databases/(default)`;

test("allowlist accepts only explicit staging read APIs", () => {
  assert.doesNotThrow(() => assertTrustedReviewRead("store", "GET", prefix));
  assert.doesNotThrow(() => assertTrustedReviewRead("store", "POST", prefix + "/documents:batchGet", { documents: [prefix.slice(1) + "/documents/calendarWriteState/main"] }));
  assert.doesNotThrow(() => assertTrustedReviewRead("rules", "GET", `/projects/${TRUSTED_REVIEW_PROJECT}/releases/cloud.firestore`));
  assert.doesNotThrow(() => assertTrustedReviewRead("auth", "POST", `/projects/${TRUSTED_REVIEW_PROJECT}/accounts:lookup`, { email: ["synthetic@example.test"] }));
});
test("allowlist rejects writes, production, unrelated collections, recursive and oversized queries", () => {
  for (const [api, method, resource, body] of [
    ["store", "POST", prefix + "/documents:commit", { writes: [] }],
    ["store", "GET", "/projects/labboy-workload-app/databases/(default)"],
    ["rules", "POST", `/projects/${TRUSTED_REVIEW_PROJECT}/rulesets`, {}],
    ["auth", "POST", `/projects/${TRUSTED_REVIEW_PROJECT}/accounts:update`, {}],
    ["store", "POST", prefix + "/documents:batchGet", { documents: [prefix.slice(1) + "/documents/worklogs/unrelated"] }],
    ["store", "POST", prefix + "/documents:runQuery", { structuredQuery: { from: [{ collectionId: "users", allDescendants: true }], limit: 201, select: { fields: [{ fieldPath: "role" }] } } }],
    ["store", "POST", prefix + "/documents:runQuery", { structuredQuery: { from: [{ collectionId: "users" }], limit: 1000, select: { fields: [{ fieldPath: "role" }] } } }]
  ]) assert.throws(() => assertTrustedReviewRead(api, method, resource, body));
});
test("freeze binds directory IDs to five operations and three rejected inputs without approving execution", async () => {
  const frozen = await freezeTrustedReview(proposal, identities, profiles, baseline());
  assert.equal(frozen.operations.length, 5);assert.equal(frozen.references.length, 16);assert.equal(frozen.cloudExecutionApproved, false);
  const dl = frozen.operations.find(row => row.id === "dl");
  assert.equal(dl.entries.length, 2);
  for (const row of dl.entries) { assert.equal(row.value.studentCount, 75);assert.deepEqual(row.value.locations, ["ห้อง 406", "ห้อง 407"]);assert.deepEqual(new Set(row.value.proctors), new Set(Object.values(identities))); }
  assert.equal(frozen.operations.find(row => row.id === "cancel").input.original.source.version, 1);
});
test("freeze is deterministic and actual DL bindings affect targets", async () => {
  const first = await freezeTrustedReview(proposal, identities, profiles, baseline());
  assert.equal(reviewValueHash(first), reviewValueHash(await freezeTrustedReview(proposal, identities, profiles, baseline())));
  const nextIds = { staff: "synthetic-other-staff", superadmin: identities.superadmin }, next = baseline();next.users[0].id = nextIds.staff;
  const second = await freezeTrustedReview(proposal, nextIds, profiles, next);
  assert.notEqual(first.operations.find(row => row.id === "dl").operationId, second.operations.find(row => row.id === "dl").operationId);
});
test("freeze refuses production, role/capability drift and unknown directory IDs", async () => {
  const prod = structuredClone(proposal);prod.target.projectId = "labboy-workload-app";
  await assert.rejects(freezeTrustedReview(prod, identities, profiles, baseline()));
  for (const patch of [{ role: "admin" }, { active: false }, { calendarWriter: false }]) await assert.rejects(freezeTrustedReview(proposal, identities, { ...profiles, superadmin: { ...profiles.superadmin, ...patch } }, baseline()));
  const missing = baseline();missing.users.pop();await assert.rejects(freezeTrustedReview(proposal, identities, profiles, missing));
});
test("freeze refuses partial/oversized baseline and existing room conflicts", async () => {
  const invalid = baseline();invalid.classroomSchedules.push({ id: "incomplete", isActive: true });
  await assert.rejects(freezeTrustedReview(proposal, identities, profiles, invalid));
  const oversized = baseline();oversized.users = Array.from({ length: 201 }, (_, i) => ({ id: "row-" + i }));
  await assert.rejects(freezeTrustedReview(proposal, identities, profiles, oversized));
  const conflict = baseline();conflict.classroomSchedules.push({ id: "existing", subject: "Synthetic existing", room: "401", dayOfWeek: "monday", startTime: "09:00", endTime: "10:00", validFrom: "2027-06-07", validTo: "2027-06-07", isActive: true });
  await assert.rejects(freezeTrustedReview(proposal, identities, profiles, conflict), error => error.code === "calendar-write-validation");
});
test("stale mutation is distinct from replay and never gets approved as a success", async () => {
  const frozen = await freezeTrustedReview(proposal, identities, profiles, baseline());
  const stale = frozen.rejections.find(row => row.id === "stale-manual-edit"), edit = frozen.operations.find(row => row.id === "edit");
  assert.equal(stale.expectedHttpStatus, 409);assert.notEqual(stale.operationId, edit.operationId);
  assert.equal(stale.input.original.source.version, 0);assert.equal(frozen.maximumPostRequests, 13);
});
