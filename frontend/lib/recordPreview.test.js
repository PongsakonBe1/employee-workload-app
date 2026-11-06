import { describe, expect, it } from "vitest";
import { recordTasks, manualRecordEntry, phoneRecordEntry } from "./recordPreview";
import { MINOR_TASKS, getCommentSuggestions, getMainDutyFromMinorTask } from "./commentSuggestions";

const dateTime = { date: "2026-11-07", time: "17:00" };
describe("record development domain contract", () => {
  it("uses all existing task labels, duty mapping and configured suggestions", () => {
    expect(recordTasks.map(task => task.label)).toEqual(MINOR_TASKS);
    for (const task of recordTasks) {
      expect(task.major).toBe(getMainDutyFromMinorTask(task.label));
      expect(task.suggestions).toEqual(getCommentSuggestions(task.label));
    }
    expect(recordTasks.find(task => task.label === "คุมสอบ DL").group).toBe("งานในหน้าที่หลัก (คุมสอบ DL)");
  });
  it("keeps recipient, comment and classification as separate fields in a manual entry", () => {
    const result = manualRecordEntry({ taskId: "ติดตั้ง Software", recipient: " หน่วยงานตัวอย่าง ", notes: " MATLAB " }, dateTime);
    expect(result.entry).toMatchObject({ minorTask: "ติดตั้ง Software", recipient: "หน่วยงานตัวอย่าง", comment: "MATLAB", ...dateTime });
    expect(result.entry.mainDuty).toBe(getMainDutyFromMinorTask("ติดตั้ง Software"));
  });
  it("permits optional manual detail but rejects unknown tasks and invalid date/time", () => {
    const draft = { taskId: "คุมสอบ DL", recipient: "", notes: "" };
    expect(manualRecordEntry(draft, dateTime).entry.comment).toBe("");
    expect(manualRecordEntry({ ...draft, taskId: "not-a-task" }, dateTime).field).toBe("task");
    expect(manualRecordEntry(draft, { ...dateTime, date: "2026-02-30" }).field).toBe("date");
    expect(manualRecordEntry(draft, { ...dateTime, date: "" }).field).toBe("date");
    expect(manualRecordEntry(draft, { ...dateTime, time: "24:00" }).field).toBe("time");
  });
  it("requires phone recipient before detail and retains the real minor task label", () => {
    expect(phoneRecordEntry(" ", "", dateTime).field).toBe("recipient");
    expect(phoneRecordEntry("หน่วยงานตัวอย่าง", " ", dateTime).field).toBe("notes");
    expect(phoneRecordEntry("หน่วยงานตัวอย่าง", "ให้คำแนะนำ", dateTime).entry).toMatchObject({ minorTask: "รับแจ้งและแก้ปัญหาทางโทรศัพท์", recipient: "หน่วยงานตัวอย่าง", comment: "ให้คำแนะนำ" });
  });
});
