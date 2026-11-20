import { describe, it, expect } from "vitest";
import { createPreviewLedger } from "./previewLedger";
import { equipmentDraft, normalizeEquipment, equipmentList, equipmentSummary, equipmentRange, canBorrowEquipment, canReturnEquipment, canUndoPreview } from "./equipmentPreview";
import { deviceWorklog, roomWorklog } from "./resourceWorklog";
import { historyRows } from "./historyPreview";

const admin = { id: "synthetic-a", role: "admin" }, staff = { ...admin, role: "staff" };
const time = { date: "2026-11-06", time: "10:00" };
const device = (extra = {}) => normalizeEquipment({ id: "fixture-1", name: "อุปกรณ์ตัวอย่าง", assetCode: "TEST-1", barcode: "TEST-BAR", kind: "headphones", location: "ชั้น 3", active: true, condition: "normal", order: 0, student: null, ...extra });
const make = () => createPreviewLedger({ rooms: [{ id: "303", floor: "3", open: false }], devices: [device()], logs: [] });
let request = 0;
const command = (ledger, extra = {}) => ledger.transact({ actor: admin, requestId: `test-${++request}`, ...extra });
const loan = (ledger, condition = "unknown") => {
  const entry = deviceWorklog(ledger.getSnapshot().data.devices[0], "0000000000000", condition, time).entry;
  return command(ledger, { entries: [{ ...entry, employeeId: admin.id, person: "เจ้าหน้าที่ตัวอย่าง" }] });
};
const update = (ledger, changes) => command(ledger, { kind: "device-update", ids: ["fixture-1"], device: { ...ledger.getSnapshot().data.devices[0], ...changes } });
describe("equipment registry validation", () => {
  it("normalizes unavailable legacy items as unknown rather than healthy", () => {
    const item = normalizeEquipment({ id: "legacy", available: false });
    expect(item.condition).toBe("unknown");expect(canBorrowEquipment(item)).toBe(false);
  });
  it("rejects cross-field and case-insensitive codes including retired devices", () => {
    expect(() => equipmentDraft(device({ assetCode: "test-bar" }), [device({ active: false })])).toThrow("ทะเบียนแล้ว");
    expect(() => equipmentDraft(device({ barcode: "test-1", assetCode: "NEW" }), [device()])).toThrow();
    expect(equipmentDraft(device({ name: "  ใหม่  " }), [device()], "fixture-1").name).toBe("ใหม่");
  });
  it.each([["name", ""], ["location", ""], ["kind", "other"], ["condition", "excellent"], ["order", -1], ["order", 1.5], ["active", "yes"]])("focuses invalid field %s", (field, value) => {
    try { equipmentDraft({ ...device(), [field]: value }, []);throw Error("Expected validation"); }
    catch (error) { expect(error.field).toBe(field); }
  });
  it("searches barcode and includes inactive borrowers so they can return", () => {
    const items = [device({ active: false }), device({ id: "two", assetCode: "TEST-2", active: false, student: "0000000000000" })];
    expect(equipmentList(items)).toHaveLength(1);
    expect(equipmentList(items, { includeInactive: true, search: "TEST-BAR" })).toHaveLength(2);
  });
});
describe("synthetic registry and worklog integration", () => {
  it("guards catalog commands and Undo even for the same person in Staff role", () => {
    const ledger = make();expect(() => command(ledger, { actor: staff, kind: "device-toggle", ids: ["fixture-1"] })).toThrow("ผู้ดูแล");
    update(ledger, { location: "Finn Space" });const token = ledger.getSnapshot().undo;
    expect(canUndoPreview(token, staff)).toBe(false);expect(() => ledger.undo(staff, token.id)).toThrow("สิทธิ์");
    ledger.undo(admin, token.id);expect(ledger.getSnapshot().data.devices[0].location).toBe("ชั้น 3");
  });
  it("adds once, retains a failed request for retry, and preserves state on stale writes", () => {
    const ledger = make(), args = { kind: "device-create", device: device({ assetCode: "NEW", barcode: "" }), requestId: "stable" };
    ledger.failNext();expect(() => command(ledger, args)).toThrow("ไม่สำเร็จ");expect(ledger.getSnapshot().revision).toBe(0);
    const result = command(ledger, args);expect(command(ledger, args).duplicate).toBe(true);expect(ledger.getSnapshot().data.devices).toHaveLength(2);
    expect(() => command(ledger, { ...args, requestId: "stale", expectedRevision: 0 })).toThrow("เปลี่ยนแล้ว");
    expect(result.ids[0]).not.toBe("fixture-1");ledger.undo(admin, ledger.getSnapshot().undo.id);expect(ledger.getSnapshot().data.devices).toHaveLength(1);
  });
  it("keeps historical location/code while rename and move update the current catalog", () => {
    const ledger = make();loan(ledger);update(ledger, { location: "Finn Space", name: "ชื่อใหม่", assetCode: "NEW-1" });
    const data = ledger.getSnapshot().data;expect(data.devices[0]).toMatchObject({ student: "0000000000000", location: "Finn Space", name: "ชื่อใหม่" });
    expect(data.logs[0]).toMatchObject({ locationAtEvent: "ชั้น 3", assetCodeAtEvent: "TEST-1", equipmentId: "fixture-1" });
    loan(ledger);expect(ledger.getSnapshot().data.logs[0]).toMatchObject({ locationAtEvent: "Finn Space", recipient: "0000000000000" });
  });
  it("allows return of a retired borrower, but no new borrow", () => {
    const ledger = make();loan(ledger);command(ledger, { kind: "device-toggle", ids: ["fixture-1"] });
    expect(canReturnEquipment(ledger.getSnapshot().data.devices[0])).toBe(true);loan(ledger);
    expect(canBorrowEquipment(ledger.getSnapshot().data.devices[0])).toBe(false);expect(equipmentList(ledger.getSnapshot().data.devices)).toHaveLength(0);
  });
  it("unknown returns never become measured normal returns", () => {
    const ledger = make();loan(ledger);loan(ledger);
    const data = ledger.getSnapshot().data, totals = equipmentSummary(data, equipmentRange(time.date, "week"));
    expect(totals).toMatchObject({ borrows: 1, returns: 1, outstanding: 0, returnConditions: { unknown: 1, normal: 0 } });
    expect(data.devices[0].condition).toBe("normal");
  });
  it.each(["damaged", "lost"])("%s returns stop borrowing; admin inspection supersedes the old event", condition => {
    const ledger = make();loan(ledger);loan(ledger, condition);expect(canBorrowEquipment(ledger.getSnapshot().data.devices[0])).toBe(false);
    update(ledger, { condition: "normal" });expect(canBorrowEquipment(ledger.getSnapshot().data.devices[0])).toBe(true);
    update(ledger, { location: "Finn Space" });expect(ledger.getSnapshot().data.devices[0].condition).toBe("normal");
  });
  it("rejects a type change after history and prevents duplicate borrowing atomically", () => {
    const ledger = make();loan(ledger);expect(() => update(ledger, { kind: "usb" })).toThrow("ประวัติ");
    const snapshot = ledger.getSnapshot();const entry = { ...snapshot.data.logs[0], employeeId: admin.id };
    expect(() => command(ledger, { entries: [entry] })).toThrow("ไม่พร้อม");expect(ledger.getSnapshot()).toBe(snapshot);
  });
  it("rejects reborrowing in a batch after damaged return without partial commits", () => {
    const ledger = make();loan(ledger);const item = ledger.getSnapshot().data.devices[0];
    const returned = { ...deviceWorklog(item, "", "damaged", time).entry, employeeId: admin.id };
    const borrowed = { ...returned, resource: { kind: "device", id: item.id, student: "0000000000000" } };
    const before = ledger.getSnapshot();expect(() => command(ledger, { entries: [returned, borrowed] })).toThrow();expect(ledger.getSnapshot()).toBe(before);
  });
  it("rejects Thai digits, mixed input and 12/14 digits, preserving canonical task mapping", () => {
    for (const text of ["๑๒๓๔๕๖๗๘๙๐๑๒๓", "000000000000a", "0".repeat(12), "0".repeat(14)]) expect(deviceWorklog(device(), text, "unknown", time).field).toBe("recipient");
    expect(deviceWorklog(device({ kind: "usb" }), "0".repeat(13), "unknown", time).entry.minorTask).toBe("ยืม USB");
    expect(roomWorklog({ id: "401", floor: "4", open: false }, time).entry.resource.open).toBe(true);
  });
});
describe("measurable equipment analytics and exact history joins", () => {
  it("defaults date windows to Thai fiscal boundaries and handles a leap quarter", () => {
    expect(equipmentRange("2026-09-30", "fiscal")).toEqual({ start: "2025-10-01", end: "2026-09-30" });
    expect(equipmentRange("2026-10-01", "fiscal")).toEqual({ start: "2026-10-01", end: "2027-09-30" });
    expect(equipmentRange("2024-02-29", "quarter")).toEqual({ start: "2024-01-01", end: "2024-03-31" });
  });
  it("uses current location filters, exact IDs, separate outstanding state and unknown conditions", () => {
    const ledger = make();loan(ledger);update(ledger, { location: "Finn Space" });
    const data = structuredClone(ledger.getSnapshot().data);data.logs.push({ id: "legacy", minorTask: "คืนหูฟัง", date: time.date, comment: data.devices[0].name });
    const range = equipmentRange(time.date, "week"), result = equipmentSummary(data, range, { location: "Finn Space" });
    expect(result).toMatchObject({ borrows: 1, returns: 0, outstanding: 1, unmatched: 1 });
    expect(equipmentSummary(data, range, { person: "other" })).toMatchObject({ borrows: 0, returns: 0, outstanding: 1 });
    expect(result.events[0].locationAtEvent).toBe("ชั้น 3");expect(equipmentSummary(data, range, { location: "ชั้น 3" }).borrows).toBe(0);
    expect(equipmentSummary(data, { start: "2026-12-01", end: "2026-12-02" })).toMatchObject({ borrows: 0, outstanding: 1 });
    expect(() => equipmentSummary(data, { start: "2026-12-02", end: "2026-12-01" })).toThrow();
  });
  it("asset history links retain actor scope and match IDs rather than similar names", () => {
    const ledger = make();loan(ledger);const rows = ledger.getSnapshot().data.logs;
    const filters = { ...equipmentRange(time.date, "week"), assetId: "fixture-1" };
    expect(historyRows(rows, staff, filters)).toHaveLength(1);
    expect(historyRows(rows, { id: "other", role: "staff" }, filters)).toHaveLength(0);
    expect(historyRows(rows, admin, { ...filters, assetId: "missing" })).toHaveLength(0);
  });
});
