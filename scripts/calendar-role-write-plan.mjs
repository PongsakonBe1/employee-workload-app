// Immutable proposal checks and occupancy calculations only; no SDK/Auth/network mutations.
import { calendarConflicts, calendarWeekday, validCalendarDate, timeMinutes, CALENDAR_ROOMS } from "../frontend/lib/calendarView.js";
import { prepareCalendarCreate } from "../frontend/lib/calendarCreatePlan.js";
export function validateRoleWritePlan(plan) {
  const fail = () => { throw new Error("Unapproved role-write QA proposal"); };
  if (plan?.version !== 1 || plan.targetProject !== "labboy-workload-app-staging" || plan.database !== "(default)") fail();
  const row = plan.fixture;
  if (!row || row.title !== "QA-ROLE-CLOUD-CREATE" || row.date !== "2027-04-23" || row.room !== "402" || row.start !== "10:00" || row.end !== "11:00" || row.semester !== "2/2569" || row.teacher !== "" || Object.keys(row).sort().join() !== "date,end,room,semester,start,teacher,title") fail();
  if (plan.expectedBefore?.qaSchedules !== 4 || plan.expectedBefore?.qaReceipts !== 4 || plan.expectedBefore?.revision !== 9 || plan.budget?.newSchedules !== 1 || plan.budget?.newReceipts !== 1 || plan.budget?.revisionDelta !== 1) fail();
  const expected = ["staff-create-denial:staff:raw-sdk-batch:permission-denied:0", "superadmin-create:superadmin:calendar-ui:created:1", "superadmin-repeat:superadmin:sanctioned-writer-sdk:repeated:0"];
  if (!Array.isArray(plan.attempts) || plan.attempts.length !== 3 || plan.attempts.some((row, index) => `${row.id}:${row.role}:${row.transport}:${row.expected}:${row.expectedNewSchedules}` !== expected[index])) fail();
  if (plan.stopOnUnexpectedStaffWrite !== true || plan.cleanup !== false || plan.roleChanges !== false || plan.productionAccess !== false) fail();
  return { rules: [{ kind: "classroom", title: row.title, rooms: [row.room], weekday: calendarWeekday(row.date), validFrom: row.date, validTo: row.date, start: row.start, end: row.end, semester: row.semester, teacher: row.teacher }], events: [] };
}
export async function prepareRoleWriteFixture(plan) {
  return prepareCalendarCreate(validateRoleWritePlan(plan), []);
}
export function roleWriteOccupancy(plan, classrooms, exams) {
  validateRoleWritePlan(plan);
  if (!Array.isArray(classrooms) || !Array.isArray(exams) || classrooms.length > 200 || exams.length > 200) throw new Error("Role-write preflight exceeded bounded read limits");
  const candidate = { ...plan.fixture, rooms: [plan.fixture.room] }, intervals = [];
  const weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const validTimes = row => Number.isFinite(timeMinutes(row.startTime)) && Number.isFinite(timeMinutes(row.endTime)) && row.startTime < row.endTime;
  for (const row of classrooms) {
    if (!validCalendarDate(row.validFrom) || !validCalendarDate(row.validTo) || row.validTo < row.validFrom || !weekdays.includes(row.dayOfWeek) || !CALENDAR_ROOMS.includes(row.room) || !validTimes(row)) throw new Error("Incomplete classroom blocks role-write preflight");
    if (candidate.date >= row.validFrom && candidate.date <= row.validTo && calendarWeekday(candidate.date) === weekdays.indexOf(row.dayOfWeek)) intervals.push({ date: candidate.date, rooms: [row.room], start: row.startTime, end: row.endTime });
  }
  for (const row of exams) {
    if (row.date !== candidate.date || !Array.isArray(row.locations) || !row.locations.length || row.locations.some(room => !/^ห้อง (401|402|406|407)$/.test(room)) || !validTimes(row)) throw new Error("Incomplete exam blocks role-write preflight");
    intervals.push({ date: row.date, rooms: row.locations.map(room => room.slice(-3)), start: row.startTime, end: row.endTime });
  }
  return { candidateClearAtReadTime: calendarConflicts(candidate, intervals).length === 0 };
}
