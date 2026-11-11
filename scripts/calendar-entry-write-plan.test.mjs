import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { prepareEntryWriteAudit } from "./calendar-entry-write-plan.mjs";
const raw = fs.readFileSync(new URL("../docs/development/calendar-staging-entry-write/staging-fixtures.json", import.meta.url), "utf8"), ids = { staff: "synthetic-staff", superadmin: "synthetic-super" };
test("reviewed manifest resolves exactly five deterministic schedules and three operations", async () => {
  const result = await prepareEntryWriteAudit(raw, ids);
  assert.deepEqual(result.operations.map(row => row.entries.length), [1,2,2]);assert.equal(new Set(result.operations.flatMap(row => row.entries.map(entry => entry.id))).size, 5);
  const dl = result.operations[2].entries;assert.ok(dl.every(row => row.collection === "dlExamSchedules" && row.value.startTime === "17:00" && row.value.endTime === "18:30" && row.value.studentCount === 75));
  assert.deepEqual(dl[0].value.proctors, ["synthetic-staff", "synthetic-super"]);assert.deepEqual(dl[0].value.locations, ["ห้อง 406", "ห้อง 407"]);
});
test("changed payload or budget requires renewed manifest review", async () => {
  await assert.rejects(prepareEntryWriteAudit(raw.replace('"newSchedules": 5', '"newSchedules": 6'), ids), /changed/);
  await assert.rejects(prepareEntryWriteAudit(raw.replace("QA-ENTRY-MANUAL", "Different fixture"), ids), /changed/);
});
test("Windows checkout line endings preserve the reviewed manifest and deterministic targets", async () => {
  const lf = await prepareEntryWriteAudit(raw.replaceAll("\r\n", "\n"), ids), crlf = await prepareEntryWriteAudit(raw.replaceAll("\r\n", "\n").replaceAll("\n", "\r\n"), ids);
  assert.deepEqual(crlf, lf);
});
test("missing, invalid or identical directory identities stop preparation", async () => {
  for (const value of [null, {}, { staff: "same", superadmin: "same" }, { staff: "bad/id", superadmin: "valid" }]) await assert.rejects(prepareEntryWriteAudit(raw, value), /identities/);
});
