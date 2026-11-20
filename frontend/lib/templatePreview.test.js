import { describe, it, expect } from "vitest";
import { createPreviewLedger } from "./previewLedger";
import { templateFields, previewTemplateEntries } from "./templatePreview";
import { templateCreateFields } from "./templatePayload";
import { initialTemplates } from "../app/dev/record/templateFixtures";
import { assessmentResult, DEFAULT_ASSESSMENT_MAPPING } from "./assessmentPreview";
import { recordTasks } from "./recordPreview";
const admin = { id: "a", role: "admin" }, staff = { id: "a", role: "staff" };
const date = { date: "2026-11-06", time: "10:55" };
const draft = () => ({ name: "ชุดตัวอย่าง", order: 20, isCombo: true, requireRecipient: true, requireComment: true, comment: "ตั้งต้น", comboItems: [{ name: "งาน A", minorTask: "Gmail" }, { name: "งาน B", minorTask: "Gmail" }] });
const ledger = () => createPreviewLedger({ templates: initialTemplates, rooms: [], devices: [], logs: [] });
const command = (store, args) => store.transact({ actor: admin, requestId: crypto.randomUUID(), expectedRevision: store.getSnapshot().revision, ...args });
describe("Template catalog and recording contracts", () => {
  it("preserves every Combo field in the production create payload without retaining mutable input references", () => {
    const input = { ...draft(), requireCheckbox: true, minorTask: "Gmail", mainDuty: "ตัวอย่าง" };
    const value = templateCreateFields(input);
    expect(value).toMatchObject({ isCombo: true, isSmart: false, requireCheckbox: true, isActive: true, usageCount: 0 });
    input.comboItems[0].name = "เปลี่ยนต้นฉบับ"; expect(value.comboItems[0].name).toBe("งาน A");
    expect(templateCreateFields({ name: "ทั่วไป" })).toMatchObject({ isCombo: false, comboItems: [], requireCheckbox: false });
  });
  it("permits repeated canonical tasks but rejects ambiguous item names, unknown tasks and invalid ordering", () => {
    expect(templateFields(draft()).comboItems.map(item => item.minorTask)).toEqual(["Gmail", "Gmail"]);
    for (const change of [{ name: "" }, { order: -1 }, { order: "" }, { comboItems: [] }, { comboItems: [{ name: "A", minorTask: "Gmail" }, { name: "a", minorTask: "Gmail" }] }, { comboItems: [{ name: "A", minorTask: "unknown" }, { name: "B", minorTask: "Gmail" }] }]) expect(() => templateFields({ ...draft(), ...change })).toThrow();
  });
  it("checks duplicate names including inactive templates and derives classification from the canonical catalog", () => {
    expect(() => templateFields({ ...draft(), name: " เปิดใช้บัญชี " }, initialTemplates)).toThrow(/ชื่อ/);
    const result = templateFields({ name: "ทั่วไป", order: 9, minorTask: "Gmail", mainDuty: "forged" });
    expect(result.mainDuty).toBe(recordTasks.find(task => task.id === "Gmail").major);
  });
  it("keeps system Smart types and mandatory phone/assigned fields intact", () => {
    const room = initialTemplates[0], phone = initialTemplates.find(item => item.id === "phone");
    expect(() => templateFields({ ...room, isSmart: false }, initialTemplates, room)).toThrow();
    expect(() => templateFields({ ...room, isCombo: true }, initialTemplates, room)).toThrow();
    expect(() => templateFields({ ...room, comment: "เพิ่มข้อความ" }, initialTemplates, room)).toThrow();
    expect(templateFields({ ...phone, requireRecipient: false, requireComment: false }, initialTemplates, phone)).toMatchObject({ requireRecipient: true, requireComment: true });
  });
  it("enforces admin writes/Undo even after the same actor switches to Staff", () => {
    const store = ledger(); expect(() => command(store, { actor: staff, kind: "template-create", template: draft() })).toThrow(/ผู้ดูแล/);
    command(store, { kind: "template-create", template: draft() });
    expect(() => store.undo(staff, store.getSnapshot().undo.id)).toThrow(/สิทธิ์/);
    store.undo(admin, store.getSnapshot().undo.id); expect(store.getSnapshot().data.templates).toHaveLength(9);
  });
  it("is atomic on failure and stale revisions, and idempotent when the same request retries", () => {
    const store = ledger(), before = store.getSnapshot(), requestId = "retry";
    store.failNext(); expect(() => command(store, { kind: "template-create", template: draft(), requestId })).toThrow(/จำลอง/);
    expect(store.getSnapshot()).toBe(before);
    const first = command(store, { kind: "template-create", template: draft(), requestId });
    expect(command(store, { kind: "template-create", template: draft(), requestId, expectedRevision: 0 }).duplicate).toBe(true);
    expect(store.getSnapshot().data.templates).toHaveLength(10);
    expect(() => command(store, { kind: "template-update", ids: first.ids, template: draft(), expectedRevision: 0 })).toThrow(/เปลี่ยน/);
  });
  it("requires an explicit nonempty unique selection and the configured fields without auto-selecting Combo items", () => {
    const template = { ...templateFields(draft()), id: "x", version: 1, isActive: true };
    for (const [selected, recipient, notes] of [[[], "X", "Y"], [[0, 0], "X", "Y"], [[99], "X", "Y"], [[0], "", "Y"], [[0], "X", ""]]) expect(() => previewTemplateEntries(template, selected, recipient, notes, date)).toThrow();
    const rows = previewTemplateEntries(template, [1, 0], "ผู้รับบริการตัวอย่าง", "เพิ่ม", date);
    expect(rows.map(row => row.title)).toEqual(["งาน B", "งาน A"]); expect(rows.every(row => row.minorTask === "Gmail")).toBe(true);
  });
  it("supports optional recipient/detail while enforcing complete date/time and detail limits", () => {
    const template = { ...templateFields({ name: "งานทั่วไป", minorTask: "Gmail", order: 1 }), id: "x", version: 1, isActive: true };
    expect(previewTemplateEntries(template, [], "", "", date)[0].recipient).toBe("");
    expect(() => previewTemplateEntries(template, [], "", "", { ...date, time: "25:00" })).toThrow();
    expect(() => previewTemplateEntries(template, [], "", "x".repeat(501), date)).toThrow();
  });
  it("retains historical template snapshots after rename/reorder/deactivation and reconciles assessment counts", () => {
    const store = ledger(); const created = command(store, { kind: "template-create", template: draft() });
    const template = store.getSnapshot().data.templates.find(item => item.id === created.ids[0]);
    const entries = previewTemplateEntries(template, [0, 1], "ตัวอย่าง", "รายละเอียด", date).map(row => ({ ...row, employeeId: "a" }));
    command(store, { actor: staff, kind: "create", entries });
    const historical = store.getSnapshot().data.logs;
    command(store, { kind: "template-update", ids: [template.id], template: { ...draft(), name: "ชื่อใหม่", comboItems: [...draft().comboItems].reverse() } });
    command(store, { kind: "template-toggle", ids: [template.id] });
    expect(store.getSnapshot().data.logs).toEqual(historical);
    expect(historical.every(row => row.templateNameAtRecord === "ชุดตัวอย่าง" && row.templateVersion === 1)).toBe(true);
    const report = assessmentResult(historical, [{ id: "a", displayName: "A" }], { personId: "a", start: date.date, end: date.date, round: "1", year: 2570 }, staff, recordTasks, DEFAULT_ASSESSMENT_MAPPING);
    expect(report.rows).toHaveLength(2); expect(report.sections.find(section => section.id === "1.5").count).toBe(2);
    expect(() => command(store, { actor: staff, kind: "create", entries })).toThrow(/เทมเพลตเปลี่ยน/);
    store.undo(admin, store.getSnapshot().undo.id); expect(store.getSnapshot().data.templates.find(item => item.id === template.id).isActive).toBe(true);
  });
  it("rejects changed template versions and forged required fields without creating partial worklogs", () => {
    const store = ledger(); const created = command(store, { kind: "template-create", template: draft() });
    const template = store.getSnapshot().data.templates.find(item => item.id === created.ids[0]);
    const entry = { ...previewTemplateEntries(template, [0], "ตัวอย่าง", "รายละเอียด", date)[0], employeeId: "a" };
    expect(() => command(store, { actor: staff, kind: "create", entries: [{ ...entry, recipient: "", requireRecipient: false }] })).toThrow();
    command(store, { kind: "template-update", ids: created.ids, template: draft() });
    expect(() => command(store, { actor: staff, kind: "create", entries: [entry] })).toThrow(/เทมเพลตเปลี่ยน/);
    expect(store.getSnapshot().data.logs).toHaveLength(0);
  });
});
