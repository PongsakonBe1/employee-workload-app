import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { validateRoleWritePlan, prepareRoleWriteFixture, roleWriteOccupancy } from "./calendar-role-write-plan.mjs";
import { calendarDates } from "../frontend/lib/calendarView.js";
const proposal = JSON.parse(fs.readFileSync(new URL("../docs/development/calendar-role-write-plan/staging-fixture.json", import.meta.url)));
test("one fixed-day proposal creates one deterministic schedule/receipt shared by both roles", async () => {
  const input = validateRoleWritePlan(proposal), first = await prepareRoleWriteFixture(proposal), second = await prepareRoleWriteFixture(structuredClone(proposal));
  assert.equal(calendarDates(input.rules[0].validFrom, input.rules[0].validTo).length, 1);
  assert.equal(first.entries.length, 1);assert.deepEqual(first, second);
  assert.match(first.operationId, /^op-[a-f0-9]{64}$/);assert.match(first.entries[0].id, /^cal-[a-f0-9]{64}$/);
  assert.equal(first.entries[0].collection, "classroomSchedules");
});
for (const [label, mutate] of [
  ["production", row => row.targetProject = "labboy-workload-app"],
  ["larger write budget", row => row.budget.newSchedules = 2],
  ["unexpected gate", row => row.expectedBefore.revision = 10],
  ["changed room", row => row.fixture.room = "401"],
  ["different date", row => row.fixture.date = "2027-04-24"],
  ["recurring fixture", row => row.fixture.validTo = "2027-05-30"],
  ["personal teacher name", row => row.fixture.teacher = "real person"],
  ["positive attempt before Staff denial", row => row.attempts.reverse()],
  ["missing stop condition", row => row.stopOnUnexpectedStaffWrite = false],
  ["role changes", row => row.roleChanges = true],
  ["cleanup", row => row.cleanup = true],
]) test("rejects " + label, () => { const value = structuredClone(proposal);mutate(value);assert.throws(() => validateRoleWritePlan(value)); });
const classroom = overrides => ({ room: "402", dayOfWeek: "friday", startTime: "10:30", endTime: "11:30", validFrom: "2027-04-01", validTo: "2027-04-30", ...overrides });
test("weekly occupancy blocks overlapping room use but accepts adjacent slots, other days and expired terms", () => {
  assert.equal(roleWriteOccupancy(proposal, [classroom({})], []).candidateClearAtReadTime, false);
  for (const change of [{ room: "401" }, { startTime: "11:00", endTime: "12:00" }, { dayOfWeek: "thursday" }, { validTo: "2027-04-22" }]) assert.equal(roleWriteOccupancy(proposal, [classroom(change)], []).candidateClearAtReadTime, true);
});
test("an exam sharing the same room/time blocks the candidate", () => {
  assert.equal(roleWriteOccupancy(proposal, [], [{ date: "2027-04-23", locations: ["ห้อง 402", "ห้อง 407"], startTime: "10:00", endTime: "10:30" }]).candidateClearAtReadTime, false);
});
test("incomplete or excessive reads never count as a free slot", () => {
  assert.throws(() => roleWriteOccupancy(proposal, [{}], []));
  assert.throws(() => roleWriteOccupancy(proposal, [], [{ date: "2027-04-23", locations: ["unknown"] }]));
  assert.throws(() => roleWriteOccupancy(proposal, Array(201).fill(classroom({})), []));
});
