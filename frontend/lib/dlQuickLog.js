export const DL_WORKLOG_TASK = "คุมสอบ DL";
export const DL_SHIFTS = { morning: "เช้า", afternoon: "บ่าย", evening: "เย็น" };

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
