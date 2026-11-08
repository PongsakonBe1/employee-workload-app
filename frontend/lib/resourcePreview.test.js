import { describe, it, expect } from "vitest";
import { resourceStatusRows, resourceHistoryRows, resourceStatusCSV, resourceHistoryCSV, findPreviewResource } from "./resourcePreview";
import { normalizeEquipment } from "./equipmentPreview";
const admin = { id: "fixture-a", role: "admin" }, staff = { ...admin, role: "staff" };
const range = { start: "2026-11-01", end: "2026-11-30" };
const selection = { kind: "device", id: "same-id" };
const make = () => ({ rooms: [{ id: "same-id", floor: "3", open: false, detail: "ระบบตัวอย่าง" }], devices: [normalizeEquipment({ id: "same-id", assetCode: "TEST-01", name: "อุปกรณ์ตัวอย่าง", kind: "headphones", location: "ชั้น 3", active: true, condition: "normal", student: "0000000000000", barcode: "00000123", order: 2 })], logs: [
  { id: "own", date: "2026-11-01", time: "09:00", employeeId: "fixture-a", person: "เจ้าหน้าที่ A", title: "ยืมอุปกรณ์", recipient: "0000000000000", resource: { kind: "device", id: "same-id", student: "0000000000000" }, locationAtEvent: "สังกัดเดิม", assetCodeAtEvent: "OLD-CODE" },
  { id: "other", date: "2026-11-30", time: "10:00", employeeId: "fixture-b", person: "เจ้าหน้าที่ B", title: "คืนอุปกรณ์", resource: { kind: "device", id: "same-id", student: null } },
  { id: "room", date: "2026-11-03", time: "10:00", employeeId: "fixture-a", title: "เปิดห้อง", resource: { kind: "room", id: "same-id", open: true } },
  { id: "lookalike", date: "2026-11-03", time: "11:00", employeeId: "fixture-a", title: "same-id อุปกรณ์ตัวอย่าง", comment: "same-id" }
] });
describe("resource identity and history export scope", () => {
  it("separates room/device ID collisions and never guesses from similar text", () => {
    const data = make();expect(resourceHistoryRows(data, admin, selection, range).map(row => row.id)).toEqual(["other", "own"]);
    expect(resourceHistoryRows(data, admin, { kind: "room", id: "same-id" }, range).map(row => row.id)).toEqual(["room"]);
  });
  it("retains Staff ownership and allows Admin/Superadmin to review the team", () => {
    const data = make();expect(resourceHistoryRows(data, staff, selection, range).map(row => row.id)).toEqual(["own"]);
    expect(resourceHistoryRows(data, { id: "fixture-c", role: "staff" }, selection, range)).toEqual([]);
    expect(resourceHistoryRows(data, { ...admin, role: "superadmin" }, selection, range)).toHaveLength(2);
  });
  it("requires an approved role and a real resource in the correct collection", () => {
    const data = make();for (const actor of [null, { role: "staff" }, { id: "x", role: "pending" }]) {
      expect(() => resourceHistoryRows(data, actor, selection, range)).toThrow("สิทธิ์");expect(() => resourceStatusRows(data, actor)).toThrow("สิทธิ์");
    }
    expect(() => findPreviewResource(data, { kind: "room", id: "missing" })).toThrow("ไม่พบ");
    expect(() => findPreviewResource(data, { kind: "other", id: "same-id" })).toThrow("ถูกต้อง");
  });
  it("uses inclusive date boundaries and rejects invalid or reversed ranges", () => {
    const data = make();expect(resourceHistoryRows(data, admin, selection, { start: "2026-11-01", end: "2026-11-01" })).toHaveLength(1);
    expect(resourceHistoryRows(data, admin, selection, { start: "2026-12-01", end: "2026-12-02" })).toEqual([]);
    for (const bad of [{ start: "2026-02-30", end: "2026-11-01" }, { start: "2026-11-02", end: "2026-11-01" }]) expect(() => resourceHistoryRows(data, admin, selection, bad)).toThrow("วันที่");
  });
  it("supports legacy exact equipment IDs and preserves event metadata after moving", () => {
    const data = make();data.logs.push({ id: "legacy", equipmentId: "same-id", date: "2026-11-20", time: "15:00", employeeId: "fixture-a", minorTask: "ยืมหูฟัง" });data.devices[0].location = "Finn Space";
    const rows = resourceHistoryRows(data, staff, selection, range);expect(rows.map(row => row.id)).toEqual(["legacy", "own"]);
    expect(rows.find(row => row.id === "own")).toMatchObject({ assetCodeAtEvent: "OLD-CODE", locationAtEvent: "สังกัดเดิม" });
    expect(rows[0]).toMatchObject({ assetCodeAtEvent: "ไม่ระบุ", locationAtEvent: "ไม่ระบุ" });
  });
  it("does not expose student identifiers through history rows or CSV", () => {
    const rows = resourceHistoryRows(make(), admin, selection, range);expect(rows[0]).not.toHaveProperty("recipient");expect(resourceHistoryCSV(rows)).not.toContain("0000000000000");
    expect(resourceHistoryCSV(rows)).toContain('"OLD-CODE","สังกัดเดิม"');
  });
});
describe("resource status snapshot and CSV safety", () => {
  it("includes rooms and inactive items but never student identifiers", () => {
    const data = make();data.devices[0].active = false;const rows = resourceStatusRows(data, staff);expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({ status: "กำลังยืม · หยุดใช้หลังคืน", barcode: "00000123", order: 2 });
    expect(resourceStatusCSV(rows)).not.toContain("0000000000000");expect(rows[0].condition).toBe("—");
  });
  it("keeps a preview snapshot stable and never calls unknown condition healthy", () => {
    const data = make();data.devices[0] = normalizeEquipment({ ...data.devices[0], student: null, condition: "unknown" });const rows = resourceStatusRows(data, admin);
    data.devices[0].location = "Finn Space";data.rooms[0].open = true;expect(rows[1].location).toBe("ชั้น 3");expect(rows[0].status).toBe("ปิดอยู่");
    expect(rows[1]).toMatchObject({ status: "ไม่พร้อมยืม", condition: "ยังไม่ระบุ" });
  });
  it("quotes commas, embedded quotes and line breaks while neutralizing formulas", () => {
    const rows = [{ id: '=HYPERLINK("example")', type: "ห้อง", location: 'ชั้น 3, "ตัวอย่าง"\nบรรทัดใหม่', status: "ปิดอยู่", condition: "—", barcode: "  +1+2", order: 0 }];
    const text = resourceStatusCSV(rows);expect(text).toContain('"\'=HYPERLINK(""example"")"');expect(text).toContain('"ชั้น 3, ""ตัวอย่าง""\nบรรทัดใหม่"');expect(text).toContain('"\'  +1+2"');expect(text).toContain("\r\n");
    expect(resourceHistoryCSV([{ title: "@SUM(1)", person: "\tmalicious" }])).toContain('"\'@SUM(1)","\'\tmalicious"');
  });
  it("exports empty history with headers instead of fabricated events", () => {
    const text = resourceHistoryCSV([]);expect(text).toContain('"วันที่","เวลา"');expect(text).not.toContain("\r\n");
  });
});
