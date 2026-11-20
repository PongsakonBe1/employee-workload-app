import { validCalendarDate } from "./calendarView";
import { validateDate } from "./validation";

export const DL_WORKLOG_TASK = "คุมสอบ DL";
export const DL_SHIFTS = { morning: "เช้า", afternoon: "บ่าย", evening: "เย็น" };

export function validateDlWorklogDate(date) {
  const validation = validateDate(date);
  return validation.valid && !validCalendarDate(date) ? { valid: false, error: "วันที่ไม่ถูกต้อง" } : validation;
}

export function isDlRoundWorklog(log) {
  return log.minorTask === DL_WORKLOG_TASK && Boolean(log.dlRoundKey && log.dlProctoring);
}

export function dlRoundSlot(worklogs, key, date, selection) {
  const duplicate = worklogs.find(log => isDlRoundWorklog(log) && log.date === date && (
    selection.roundId ? log.dlProctoring.roundId === selection.roundId : log.dlProctoring.shift === selection.shift
  ));
  if (duplicate) return { duplicate };

  // Keep retired worklog IDs available to history and audit. New attempts for
  // the same round still choose the same ID when racing across sessions.
  const usedIds = new Set(worklogs.map(log => log.id));
  let writeId = key;
  for (let revision = 1; usedIds.has(writeId); revision++) writeId = `${key}-${revision}`;
  return { writeId };
}

export function isDlRoundTemplate(template) {
  return !template.isCombo && template.minorTask?.trim() === DL_WORKLOG_TASK;
}

export function combineDlRoundTemplates(templates) {
  const first = templates.findIndex(isDlRoundTemplate);
  if (first === -1) return templates;
  const backingTemplate = templates.find(template => isDlRoundTemplate(template) && template.name === DL_WORKLOG_TASK) ?? templates[first];
  return templates.flatMap((template, index) => {
    if (index === first) return [{ ...backingTemplate, name: DL_WORKLOG_TASK }];
    return isDlRoundTemplate(template) ? [] : [template];
  });
}

export function assignedDlRounds(events, records, employeeId) {
  if (!employeeId) return [];
  const assigned = new Set(records.filter(record => Array.isArray(record.proctors) && record.proctors.some(proctor =>
    (typeof proctor === "string" ? proctor : proctor?.id || proctor?.userId || proctor?.uid) === employeeId
  )).map(record => `dlExamSchedules:${record.id}`));
  return events.filter(event => event.kind === "dl" && assigned.has(event.id)).map(event => ({
    id: event.id.slice("dlExamSchedules:".length), date: event.date, start: event.start, end: event.end, rooms: event.rooms,
  })).sort((first, second) => first.start.localeCompare(second.start));
}

export function dlRoundLabel(selection) {
  if (!selection.roundId) return DL_SHIFTS[selection.shift];
  return `${selection.start}–${selection.end} · ห้อง ${selection.rooms.join(" + ")}`;
}
