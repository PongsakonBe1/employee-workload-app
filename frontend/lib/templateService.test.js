import { describe, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({ addDoc: vi.fn().mockResolvedValue({ id: "synthetic-template" }), collection: vi.fn(() => ({ synthetic: true })), serverTimestamp: vi.fn(() => "synthetic-timestamp") }));
vi.mock("./firebase", () => ({ db: { synthetic: true } }));
vi.mock("firebase/firestore", () => ({ ...mocks, query: vi.fn(), where: vi.fn(), getDocs: vi.fn(), updateDoc: vi.fn(), deleteDoc: vi.fn(), doc: vi.fn(), orderBy: vi.fn() }));
import { createTemplate } from "./quickLogTemplates";
describe("Template create service field contract (mock Firestore only)", () => {
  it("sends Combo selection fields, child tasks and attribution through the actual create function", async () => {
    const comboItems = [{ name: "บริการ A", minorTask: "Gmail", mainDuty: "ตัวอย่าง", comment: "" }, { name: "บริการ B", minorTask: "Gmail", comment: "เพิ่ม" }];
    const id = await createTemplate({ name: "Combo ตัวอย่าง", isCombo: true, requireCheckbox: true, requireRecipient: true, comboItems, createdBy: "fixture-admin" });
    expect(id).toBe("synthetic-template");
    expect(mocks.collection).toHaveBeenCalledWith({ synthetic: true }, "globalTemplates");
    expect(mocks.addDoc.mock.calls.at(-1)[1]).toMatchObject({ isCombo: true, requireCheckbox: true, requireRecipient: true, comboItems: [{ ...comboItems[0] }, { ...comboItems[1], mainDuty: "" }], createdBy: "fixture-admin", createdAt: "synthetic-timestamp" });
  });
});
