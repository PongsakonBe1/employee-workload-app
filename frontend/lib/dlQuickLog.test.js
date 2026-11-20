import { describe, expect, it } from "vitest";
import { adaptLegacyCalendarForDisplay } from "./calendarDataAdapter";
import { assignedDlRounds, combineDlRoundTemplates, dlRoundLabel } from "./dlQuickLog";

describe("DL Quick Log", () => {
  it("shows one card at the first DL position and prefers the exact task template", () => {
    const unrelated = { id: "phone", name: "รับสายโทรศัพท์", minorTask: "รับสายโทรศัพท์" };
    const combo = { id: "combo", name: "งานชุด", minorTask: "คุมสอบ DL", isCombo: true };
    const legacy = { id: "legacy", name: "คุมสอบ DL เช้า/บ่าย", minorTask: "คุมสอบ DL" };
    const current = { id: "current", name: "คุมสอบ DL", minorTask: "คุมสอบ DL" };
    expect(combineDlRoundTemplates([unrelated, legacy, combo, current])).toEqual([unrelated, current, combo]);
    const untouched = [combo, unrelated];
    expect(combineDlRoundTemplates(untouched)).toBe(untouched);
    expect(combineDlRoundTemplates([legacy])).toEqual([{ ...legacy, name: "คุมสอบ DL" }]);
  });

  it("matches IDs only and keeps exact times for separate assigned rounds", () => {
    const date = "2026-11-20";
    const evening = { date, id: "evening", startTime: "17:00", endTime: "18:30", locations: ["ห้อง 406", "ห้อง 407"], proctors: ["qa-person"], isActive: true };
    const dlExamSchedules = [
      evening,
      { ...evening, id: "morning", startTime: "09:00", endTime: "10:30", proctors: [{ userId: "qa-person" }] },
      { ...evening, id: "legacy-name", proctors: [{ name: "qa-person" }] },
      { ...evening, id: "cancelled", isActive: false },
      { ...evening, id: "another-person", proctors: ["qa-other"] },
    ];
    const { data } = adaptLegacyCalendarForDisplay({ dlExamSchedules, classroomSchedules: [], users: [] });
    const rounds = assignedDlRounds(data.events, dlExamSchedules, "qa-person");
    expect(rounds.map(round => round.id)).toEqual(["morning", "evening"]);
    expect(dlRoundLabel({ ...rounds[1], roundId: rounds[1].id })).toBe("17:00–18:30 · ห้อง 406 + 407");
    expect(dlRoundLabel({ shift: "evening" })).toBe("เย็น");
  });
});
