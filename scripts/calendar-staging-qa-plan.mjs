// Pure validation of the exact proposed cloud QA set. No Auth, filesystem or network IO.
import { CALENDAR_ROOMS, calendarConflicts, calendarWeekday, timeMinutes, validCalendarDate } from "../frontend/lib/calendarView.js";
export function validateStagingQaPlan(plan) {
  const fail = message => { throw new Error(message); };
  if (plan?.version !== 1 || plan.targetProject !== "labboy-workload-app-staging" || plan.database !== "(default)") fail("Unapproved QA target");
  const range = plan.dateRange;
  if (!validCalendarDate(range?.start) || !validCalendarDate(range?.end) || range.end < range.start || Date.parse(range.end) - Date.parse(range.start) > 7 * 86400000) fail("Invalid QA date range");
  if (plan.semester !== "2/2569" || plan.teacher !== "") fail("Unexpected QA metadata");
  if (plan.atomicImportTerm?.start !== range.start || plan.atomicImportTerm?.end !== range.end) fail("Unexpected atomic PDF term");
  if (!Array.isArray(plan.cases) || plan.cases.map(item => item.id).join() !== "overlap,identical,different-rooms,atomic-rejection") fail("Unexpected QA cases");
  const expected = [1, 1, 2, 0], rows = [];
  for (const [index, item] of plan.cases.entries()) {
    if (item.expectedCreated !== expected[index] || !Array.isArray(item.requests) || item.requests.length !== (index === 3 ? 1 : 2)) fail("Invalid QA request count");
    for (const request of item.requests) {
      if (!Array.isArray(request) || request.length !== (index === 3 ? 2 : 1)) fail("Invalid QA batch size");
      for (const row of request) {
        if (typeof row.title !== "string" || !/^QA-CLOUD-[A-Z0-9-]+$/.test(row.title) || !validCalendarDate(row.date) || row.date < range.start || row.date > range.end || !CALENDAR_ROOMS.includes(row.room) || !Number.isFinite(timeMinutes(row.start)) || !Number.isFinite(timeMinutes(row.end)) || row.end <= row.start) fail("Invalid synthetic QA row");
        if (row.validTo !== undefined && (index !== 3 || row.validTo !== range.end || row.validTo < row.date)) fail("Unexpected recurring QA bound");
        rows.push({ ...row, kind: "classroom", rooms: [row.room] });
      }
    }
  }
  const clash = (a, b) => calendarConflicts(a, [b]).length === 1;
  const [overlapA, overlapB] = plan.cases[0].requests.flat().map(row => ({ ...row, rooms: [row.room] }));
  if (!clash(overlapA, overlapB)) fail("Overlap case does not conflict");
  if (JSON.stringify(plan.cases[1].requests[0]) !== JSON.stringify(plan.cases[1].requests[1])) fail("Identical requests differ");
  const [roomA, roomB] = plan.cases[2].requests.flat().map(row => ({ ...row, rooms: [row.room] }));
  if (clash(roomA, roomB) || roomA.date !== roomB.date || roomA.start !== roomB.start || roomA.end !== roomB.end || roomA.room === roomB.room) fail("Different-room case is invalid");
  const [collision, good] = plan.cases[3].requests[0].map(row => ({ ...row, rooms: [row.room] }));
  if (!clash(collision, overlapA) || !clash(collision, overlapB) || rows.slice(0, 6).some(row => clash(good, row))) fail("Atomic case is invalid");
  if (plan.expectedCreatedSchedules !== 4 || plan.cases.reduce((count, item) => count + item.expectedCreated, 0) !== 4) fail("Unexpected write budget");
  return { rows, range, expectedCreatedSchedules: 4 };
}
export function stagingQaRowsToRules(plan) {
  return validateStagingQaPlan(plan).rows.map(row => ({ title: row.title, kind: "classroom", rooms: row.rooms, start: row.start, end: row.end, weekday: calendarWeekday(row.date), validFrom: row.date, validTo: row.validTo || row.date, semester: plan.semester, teacher: plan.teacher }));
}
export function stagingQaOccupancy(plan, classroomSchedules, dlExamSchedules) {
  const { rows, range } = validateStagingQaPlan(plan);
  const intervals = [];
  for (const row of classroomSchedules) {
    if (!validCalendarDate(row.validFrom) || !validCalendarDate(row.validTo) || row.validTo < row.validFrom || !["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].includes(row.dayOfWeek) || !CALENDAR_ROOMS.includes(row.room) || !Number.isFinite(timeMinutes(row.startTime)) || !Number.isFinite(timeMinutes(row.endTime)) || row.endTime <= row.startTime) throw new Error("Incomplete schedule blocks QA preflight");
    for (const date of new Set(rows.map(item => item.date))) if (date >= row.validFrom && date <= row.validTo && calendarWeekday(date) === ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].indexOf(row.dayOfWeek)) intervals.push({ date, rooms: [row.room], start: row.startTime, end: row.endTime });
  }
  for (const row of dlExamSchedules) {
    if (!validCalendarDate(row.date) || row.date < range.start || row.date > range.end || !Array.isArray(row.locations) || !row.locations.length || row.locations.some(room => !/^ห้อง (401|402|406|407)$/.test(room)) || !Number.isFinite(timeMinutes(row.startTime)) || !Number.isFinite(timeMinutes(row.endTime)) || row.endTime <= row.startTime) throw new Error("Incomplete exam blocks QA preflight");
    intervals.push({ date: row.date, rooms: row.locations.map(room => room.slice(-3)), start: row.startTime, end: row.endTime });
  }
  const conflicts = rows.filter(row => calendarConflicts(row, intervals).length);
  return { candidateClearAtReadTime: conflicts.length === 0, conflictingQaTitles: [...new Set(conflicts.map(row => row.title))] };
}
