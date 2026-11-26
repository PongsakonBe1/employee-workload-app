import { describe, expect, it } from "vitest";
import { bangkokRoomClock, roomClosureNotices, summarizeEquipment } from "./worklogResourceSummary.js";

const date = "2026-11-26";
const clockAt = minute => ({ date, minute });
const item = (start, end, rooms = ["406"], kind = "classroom") => ({ start, end, rooms, kind });
const scheduleFor = (...items) => ({ date, items, status: "ready" });

describe("resource summary in the worklog workspace", () => {
  it("uses the Bangkok minute and date across midnight independent of the host time zone", () => {
    expect(bangkokRoomClock(new Date("2026-11-25T16:59:17Z"))).toEqual({ date: "2026-11-25", minute: 1439 });
    expect(bangkokRoomClock(new Date("2026-11-25T17:00:00Z"))).toEqual(clockAt(0));
  });

  it("merges overlapping and touching periods across class and DL while tracking both DL rooms", () => {
    const schedule = scheduleFor(item("08:00", "10:00"), item("09:30", "11:00"), item("11:00", "12:00", ["406", "407"], "dl"));
    const rooms = { "406": "in_use", "407": "in_use" };
    expect(roomClosureNotices(rooms, schedule, clockAt(595))).toEqual([]);
    expect(roomClosureNotices(rooms, schedule, clockAt(705))).toEqual([
      { room: "406", minutes: 15, endTime: "12:00" }, { room: "407", minutes: 15, endTime: "12:00" },
    ]);
  });

  it("alerts in the final 15 minutes, persists through a gap, then waits for the next period to end", () => {
    const rooms = { "406": "in_use" };
    const schedule = scheduleFor(item("08:00", "10:00"), item("13:00", "15:00"));
    for (const [minute, remaining] of [[585, 15], [599, 1], [600, 0], [660, -60]]) {
      expect(roomClosureNotices(rooms, schedule, clockAt(minute))).toEqual([{ room: "406", minutes: remaining, endTime: "10:00" }]);
    }
    for (const minute of [479, 584, 780]) expect(roomClosureNotices(rooms, schedule, clockAt(minute))).toEqual([]);
  });

  it("requires an open classroom and a confirmed schedule for the current Bangkok date", () => {
    const schedule = scheduleFor(item("08:00", "10:00", ["303", "406", "407"]));
    expect(roomClosureNotices({ "303": "in_use", "406": "available" }, schedule, clockAt(595))).toEqual([]);
    for (const stale of [{ date: "2026-11-25" }, { status: "error" }, { unavailable: 1 }, { items: [] }]) {
      expect(roomClosureNotices({ "406": "in_use" }, { ...schedule, ...stale }, clockAt(595))).toEqual([]);
    }
  });

  it("counts active inventory by loan state and condition and retains a disabled item still on loan", () => {
    const catalog = [1, 2, 3, 4, 5, 6, 7].map(number => ({
      id: `ICIT0${number}`, kind: "headphones", active: number < 6,
    }));
    const statuses = { headphones: { ICIT01: "available", ICIT02: "in_use", ICIT03: "unknown", ICIT04: "available", ICIT06: "in_use" } };
    expect(summarizeEquipment(catalog, statuses, { ICIT04: "damaged" })).toEqual({
      headphones: { ready: 1, inUse: 2, issue: 3 },
      power: { ready: 0, inUse: 0, issue: 0 },
      usb: { ready: 0, inUse: 0, issue: 0 },
    });
  });
});
