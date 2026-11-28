import { describe, expect, it } from "vitest";
import { labelWorklogOperators } from "./worklogOperatorLabels";

describe("worklog operator labels", () => {
  it("appends the nickname without changing the fields used to write the worklog", () => {
    const person = Object.freeze({
      id: "qa-operator",
      uid: "qa-operator",
      displayName: "ชื่อบันทึก ก.",
      nickname: " ฟ้า ",
      username: "operator-a",
      fullName: "ตัวอย่าง ชื่อเต็ม",
    });
    expect(labelWorklogOperators([person])).toEqual([{ ...person, label: "ชื่อบันทึก ก. (ฟ้า)" }]);
  });

  it.each([
    [{ displayName: "ชื่อบันทึก" }, "ชื่อบันทึก"],
    [{ displayName: "ชื่อบันทึก ( QA )", nickname: "qa" }, "ชื่อบันทึก ( QA )"],
    [{ displayName: "ชื่อบันทึก (เดิม)", nickname: "ฟ้า" }, "ชื่อบันทึก (เดิม) (ฟ้า)"],
    [{ displayName: "ฟ้า", nickname: "ฟ้า" }, "ฟ้า"],
    [{ displayName: " ", fullName: "ชื่อเต็ม", nickname: "ฟ้า" }, "ชื่อเต็ม (ฟ้า)"],
    [{ nickname: "ฟ้า" }, "ฟ้า"],
    [{ displayName: null, nickname: null, email: "qa@example.test" }, "qa@example.test"],
    [{}, "qa-operator"],
  ])("formats %# without duplicate or missing text", (fields, label) => {
    expect(labelWorklogOperators([{ id: "qa-operator", ...fields }])[0].label).toBe(label);
  });

  it("disambiguates identical labels with the full names and preserves distinct IDs", () => {
    const worklogName = { displayName: "ชื่อบันทึก", nickname: "ฟ้า" };
    const people = [
      { id: "qa-a", ...worklogName, fullName: "ตัวอย่าง ก" },
      { id: "qa-b", ...worklogName, fullName: "ตัวอย่าง ข" },
      { id: "qa-c", displayName: "ชื่อบันทึก", nickname: "ฝน", fullName: "ตัวอย่าง ค" },
    ];
    expect(labelWorklogOperators(people)).toEqual([
      { ...people[0], label: "ชื่อบันทึก (ฟ้า) · ตัวอย่าง ก" },
      { ...people[1], label: "ชื่อบันทึก (ฟ้า) · ตัวอย่าง ข" },
      { ...people[2], label: "ชื่อบันทึก (ฝน)" },
    ]);
  });

  it("uses existing identifiers when full names are identical or unavailable", () => {
    const people = [
      { id: "qa-a", fullName: "ชื่อเดียวกัน", email: "a@example.test" },
      { id: "qa-b", fullName: "ชื่อเดียวกัน", email: "b@example.test" },
      { id: "qa-c", displayName: "ชื่อบันทึก" },
      { id: "qa-d", displayName: "ชื่อบันทึก" },
    ];
    expect(labelWorklogOperators(people).map(({ label }) => label)).toEqual([
      "ชื่อเดียวกัน · a@example.test",
      "ชื่อเดียวกัน · b@example.test",
      "ชื่อบันทึก · qa-c",
      "ชื่อบันทึก · qa-d",
    ]);
  });
});
