import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { validateStagingQaPlan, stagingQaRowsToRules, stagingQaOccupancy } from "./calendar-staging-qa-plan.mjs";
import { calendarDates, calendarWeekday } from "../frontend/lib/calendarView.js";
const plan = JSON.parse(fs.readFileSync(new URL("../docs/development/calendar-role-concurrency-qa/staging-fixtures.json", import.meta.url), "utf8"));
test("exact staging proposal contains four successful schedules and one all-or-nothing negative batch", () => {
  assert.equal(validateStagingQaPlan(plan).expectedCreatedSchedules, 4);assert.equal(stagingQaRowsToRules(plan).length, 8);
  assert.ok(stagingQaRowsToRules(plan).every(row => calendarDates(row.validFrom, row.validTo).filter(date => calendarWeekday(date) === row.weekday).length === 1));
});
for (const [name, mutate] of [
  ["production target", value => value.targetProject = "labboy-workload-app"],
  ["changed budget", value => value.expectedCreatedSchedules = 5],
  ["different identical request", value => value.cases[1].requests[1][0].title = "QA-CLOUD-OTHER"],
  ["invalid date", value => value.cases[0].requests[0][0].date = "2027-02-30"],
  ["invalid room", value => value.cases[0].requests[0][0].room = "403"],
  ["reversed time", value => value.cases[0].requests[0][0].end = "09:00"],
  ["negative batch no longer collides", value => value.cases[3].requests[0][0].room = "407"],
]) test("rejects " + name, () => { const value = structuredClone(plan);mutate(value);assert.throws(() => validateStagingQaPlan(value)); });
test("empty occupancy is clear but a weekly room collision blocks preflight", () => {
  assert.equal(stagingQaOccupancy(plan, [], []).candidateClearAtReadTime, true);
  const row = { room: "401", dayOfWeek: "monday", startTime: "10:00", endTime: "11:00", validFrom: "2027-04-19", validTo: "2027-04-22" };
  assert.equal(stagingQaOccupancy(plan, [row], []).candidateClearAtReadTime, false);
  assert.equal(stagingQaOccupancy(plan, [{ ...row, endTime: "10:00", startTime: "09:00" }], []).candidateClearAtReadTime, true);
});
test("a shared-room exam collision blocks preflight without roster information", () => {
  const row = { date: "2027-04-20", locations: ["ห้อง 406", "ห้อง 402"], startTime: "10:30", endTime: "12:00" };
  assert.ok(stagingQaOccupancy(plan, [], [row]).conflictingQaTitles.includes("QA-CLOUD-IDENTICAL"));
});
test("malformed schedules never count as free time", () => {
  assert.throws(() => stagingQaOccupancy(plan, [{ room: "401" }], []));
  assert.throws(() => stagingQaOccupancy(plan, [], [{ date: "2027-04-20", locations: ["Unknown room"] }]));
});
