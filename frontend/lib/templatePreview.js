import { recordTasks, manualRecordEntry } from "./recordPreview";
export const templateKind = value => value.isSmart ? "smart" : value.isCombo ? "combo" : "standard";
export const TEMPLATE_KINDS = {
  standard: "ทั่วไป",
  combo: "Combo",
  smart: "Smart"
};
export function templateFields(value, templates = [], current = null) {
  const fail = (field, message) => {
    throw Object.assign(Error(message), {
      field
    });
  };
  const name = String(value.name || "").trim(),
    comment = String(value.comment || "").trim(),
    order = Number(value.order);
  if (!name || name.length > 100) fail("name", "ระบุชื่อเทมเพลตไม่เกิน 100 ตัวอักษร");
  if (templates.some(item => item.id !== current?.id && item.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase())) fail("name", "มีชื่อเทมเพลตนี้แล้ว รวมรายการที่หยุดใช้");
  if (comment.length > 500) fail("comment", "รายละเอียดตั้งต้นไม่เกิน 500 ตัวอักษร");
  if (value.isSmart && value.isCombo) fail("kind", "Smart และ Combo เป็นคนละชนิด");
  if (value.order === "" || !Number.isInteger(order) || order < 0 || order > 9999) fail("order", "ลำดับต้องเป็นจำนวนเต็ม 0–9999");
  if (value.isSmart && !current?.isSmart) fail("kind", "Smart ใช้กับห้องและอุปกรณ์ที่ระบบรองรับ");
  if (current?.action && templateKind(value) !== templateKind(current)) fail("kind", "คงชนิดเดิมของเทมเพลตระบบ");
  const isCombo = Boolean(value.isCombo),
    isSmart = Boolean(current?.isSmart);
  if (isSmart && comment !== current.comment) fail("comment", "ใช้รายละเอียดจากการเลือกห้องหรืออุปกรณ์ตามเดิม");
  const task = recordTasks.find(task => task.id === value.minorTask);
  if (!isCombo && !isSmart && !task) fail("minorTask", "เลือกหัวข้อรองจากบัญชีงาน");
  const items = isCombo ? value.comboItems : [];
  if (isCombo && (!Array.isArray(items) || items.length < 2 || items.length > 30)) fail("comboItems", "Combo ต้องมี 2–30 รายการ");
  const labels = new Set();
  const comboItems = items.map((item, index) => {
    const name = String(item.name || "").trim(),
      task = recordTasks.find(task => task.id === item.minorTask),
      detail = String(item.comment || "").trim();
    if (!name || name.length > 100 || labels.has(name.toLocaleLowerCase())) fail(`item-${index}`, "ระบุชื่อรายการที่ไม่ซ้ำ ไม่เกิน 100 ตัวอักษร");
    if (!task || detail.length > 500) fail(`item-${index}`, "เลือกหัวข้อรองที่ถูกต้อง และรายละเอียดไม่เกิน 500 ตัวอักษร");
    labels.add(name.toLocaleLowerCase());
    if ([detail || name, comment].filter(Boolean).join(" · ").length > 500) fail(`item-${index}`, "รายละเอียดตั้งต้นรวมไม่เกิน 500 ตัวอักษร");
    return {
      name,
      minorTask: task.id,
      mainDuty: task.major,
      comment: detail
    };
  });
  return {
    name,
    comment,
    order,
    isSmart,
    isCombo,
    comboItems,
    requireCheckbox: isCombo,
    minorTask: task?.id || current?.minorTask || "",
    mainDuty: task?.major || "",
    dutyGroup: task?.group || "main",
    requireRecipient: isSmart ? current.requireRecipient : Boolean(value.requireRecipient || current?.action === "phone"),
    requireComment: isSmart ? current.requireComment : Boolean(value.requireComment || ["phone", "assigned"].includes(current?.action))
  };
}
export function previewTemplateEntries(template, selected, recipient, notes, dateTime) {
  const fail = (field, message) => {
    throw Object.assign(Error(message), {
      field
    });
  };
  if (!template?.isActive || template.isSmart) fail("template", "เทมเพลตไม่พร้อมให้บันทึก");
  if (template.requireRecipient && !recipient.trim()) fail("recipient", "ระบุผู้รับบริการ");
  if (template.requireComment && !notes.trim()) fail("notes", "ระบุรายละเอียดเพิ่มเติม");
  const items = template.isCombo ? template.comboItems : [{
    name: template.name,
    minorTask: template.minorTask,
    comment: ""
  }];
  const indices = template.isCombo ? selected : [0];
  if (!indices.length || new Set(indices).size !== indices.length || indices.some(index => !Number.isInteger(index) || !items[index])) fail("selection", "เลือกอย่างน้อย 1 รายการที่ทำจริง");
  return indices.map(index => {
    const item = items[index],
      detail = [item.comment || (template.isCombo ? item.name : ""), template.comment, notes.trim()].filter(Boolean).join(" · ");
    if (detail.length > 500 || recipient.trim().length > 50) fail("notes", "รายละเอียดรวมไม่เกิน 500 และผู้รับบริการไม่เกิน 50 ตัวอักษร");
    const result = manualRecordEntry({
      taskId: item.minorTask,
      recipient,
      notes: detail
    }, dateTime);
    if (!result.entry) fail("datetime", result.message);
    return {
      ...result.entry,
      title: item.name,
      requireRecipient: template.requireRecipient,
      requireComment: template.requireComment,
      templateId: template.id,
      templateVersion: template.version,
      templateNameAtRecord: template.name
    };
  });
}
