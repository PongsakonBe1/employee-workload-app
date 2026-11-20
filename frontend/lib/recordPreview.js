// Development uses the existing product catalog, never a replacement production taxonomy.
import { MINOR_TASKS, getCommentSuggestions, getMainDutyFromMinorTask } from "./commentSuggestions";
import { getDutyGroupFromMinorTask } from "./worklogUtils";
import { validCalendarDate } from "./calendarView";

export const recordTasks = MINOR_TASKS.map(label => ({
  id: label, label, major: getMainDutyFromMinorTask(label),
  group: getDutyGroupFromMinorTask(label), suggestions: getCommentSuggestions(label),
}));

export function manualRecordEntry(draft, dateTime) {
  const task = recordTasks.find(item => item.id === draft.taskId);
  if (!task) return { field: "task", message: "เลือกหัวข้อรองจากรายการ" };
  if (!validCalendarDate(dateTime.date)) return { field: "date", message: "ระบุวันที่ที่ถูกต้อง" };
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(dateTime.time)) return { field: "time", message: "ระบุเวลาที่ถูกต้อง" };
  const recipient = draft.recipient.trim(), comment = draft.notes.trim();
  return { entry: { title: task.label, minorTask: task.label, mainDuty: task.major, dutyGroup: task.group, recipient, comment, ...dateTime, detail: [recipient, comment].filter(Boolean).join(" · ") } };
}

export function phoneRecordEntry(recipient, notes, dateTime) {
  if (!recipient.trim()) return { field: "recipient", message: "ระบุผู้รับบริการก่อนบันทึก" };
  if (!notes.trim()) return { field: "notes", message: "ระบุรายละเอียดการให้บริการ" };
  const result = manualRecordEntry({ taskId: "รับแจ้งและแก้ปัญหาทางโทรศัพท์", recipient, notes }, dateTime);
  return result.entry ? { entry: { ...result.entry, requireRecipient: true, requireComment: true } } : result;
}

export function assignedRecordEntry(recipient, notes, dateTime) {
  if (!notes.trim()) return { field: "notes", message: "ระบุรายละเอียดของงานที่ได้รับมอบหมาย" };
  const result = manualRecordEntry({ taskId: "ปฏิบัติงานตามที่ผู้บังคับบัญชามอบหมาย", recipient, notes }, dateTime);
  return result.entry ? { entry: { ...result.entry, requireComment: true } } : result;
}

export function comboRecordEntries(combo, selected, recipient, dateTime) {
  if (!recipient.trim() || !selected.length || new Set(selected).size !== selected.length) throw Error("เลือกงานและระบุผู้รับบริการ");
  return selected.map(index => {
    if (!Number.isInteger(index) || !combo.tasks[index]) throw Error("รายการ Combo ไม่ถูกต้อง");
    const result = manualRecordEntry({ taskId: combo.minorTasks[index], recipient, notes: combo.tasks[index] }, dateTime);
    if (!result.entry) throw Error(result.message);
    return { ...result.entry, title: combo.tasks[index], requireRecipient: true };
  });
}
