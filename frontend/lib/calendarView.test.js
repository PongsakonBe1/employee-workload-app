import { describe, it, expect } from "vitest";
import { addCalendarDays, addCalendarMonths, calendarConflicts, calendarDates, calendarDetailPeriod, calendarHolidays, calendarRange, calendarRoomColor, calendarToday, expandCalendar, filterCalendar, layoutCalendarDay, monthCalendarDates, validCalendarDate, validateCalendarEntry } from "./calendarView";
const event = { id: "one", sourceId: "one", date: "2026-11-03", start: "09:00", end: "10:30", rooms: ["406"], title: "กิจกรรมตัวอย่าง", kind: "dl", participants: 75, proctors: ["fixture-a"], repeat: "none" };
describe("calendar date-only and occurrence behavior", () => {
  it("rejects rollover dates and keeps Monday weeks across month/year boundaries", () => {
    expect(validCalendarDate("2027-02-29")).toBe(false);expect(validCalendarDate("2028-02-29")).toBe(true);
    expect(calendarRange("2027-01-01", "week")).toEqual({ start: "2026-12-28", end: "2027-01-03" });
    expect(calendarRange("2026-11-06", "day").end).toBe("2026-11-06");
  });
  it("clamps month navigation and uses complete Monday-to-Sunday grids", () => {
    expect(addCalendarMonths("2026-01-31", 1)).toBe("2026-02-28");expect(addCalendarDays("2028-02-28", 1)).toBe("2028-02-29");
    const cells = monthCalendarDates("2026-11-06");expect(cells[0]).toBe("2026-10-26");expect(cells.at(-1)).toBe("2026-12-06");expect(cells.length).toBe(42);
  });
  it("takes today from Bangkok rather than UTC or the execution host", () => {
    expect(calendarToday(new Date("2026-11-05T18:00:00Z"))).toBe("2026-11-06");
  });
  it("bounds ranges and rejects reversed dates", () => {
    expect(() => calendarDates("2026-11-03", "2026-11-01")).toThrow();expect(() => calendarDates("2026-01-01", "2028-01-01")).toThrow();
  });
  it("expands recurring schedules only inside validity and semester without dropping dated exams", () => {
    const data = { events: [event], rules: [{ id: "course", title: "วิชาตัวอย่าง", weekday: 0, semester: "2/2569", validFrom: "2026-11-02", validTo: "2026-11-09", start: "08:00", end: "10:00", rooms: ["401"], kind: "classroom" }] };
    const rows = expandCalendar(data, { start: "2026-10-26", end: "2026-11-16" }, "2/2569");expect(rows.filter(x => x.recurring).map(x => x.date)).toEqual(["2026-11-02", "2026-11-09"]);expect(rows.map(x => x.id)).toContain("one");
    expect(expandCalendar(data, { start: "2026-11-02", end: "2026-11-09" }, "1/2569")).toHaveLength(1);
  });
  it("filters room IDs exactly and honors empty type selection and text search", () => {
    const base = { kinds: ["dl"], room: "406", query: "ตัวอย่าง" };expect(filterCalendar([event], base)).toHaveLength(1);expect(filterCalendar([event], { ...base, kinds: [] })).toHaveLength(0);expect(filterCalendar([event], { ...base, room: "40" })).toHaveLength(0);
  });
  it("filters dated exams by their declared semester and preserves unassigned legacy exams", () => {
    const events = [event, { ...event, id: "blank", semester: " " }, { ...event, id: "matching", semester: "2/2569" }, { ...event, id: "other", semester: "1/2570" }];
    const bounds = { start: event.date, end: event.date };
    const rows = expandCalendar({ events, rules: [] }, bounds, "2/2569");
    expect(rows.map(row => row.id)).toEqual(["one", "blank", "matching"]);
    expect(expandCalendar({ events, rules: [] }, bounds, "all")).toHaveLength(4);
    // The copy workflow filters already-expanded events, so it needs the same semantics.
    expect(filterCalendar(events, { kinds: ["dl"], room: "all", query: "", semester: "2/2569" }).map(row => row.id)).toEqual(["one", "blank", "matching"]);
  });
  it("keeps real term boundaries inclusive without hiding future dates relative to today", () => {
    const rule = { id: "term", title: "Synthetic class", weekday: 2, semester: "2/2569", validFrom: "2026-11-25", validTo: "2027-03-14", start: "08:00", end: "12:00", rooms: ["407"], kind: "classroom" };
    const count = date => expandCalendar({ rules: [rule], events: [] }, { start: date, end: date }, "2/2569").length;
    expect(count("2026-11-18")).toBe(0);expect(count("2026-11-25")).toBe(1);
    expect(count("2026-12-02")).toBe(1);expect(count("2027-03-17")).toBe(0);
    expect(expandCalendar({ rules: [{ ...rule, weekday: 6 }], events: [] }, { start: "2027-03-14", end: "2027-03-14" }, "2/2569")).toHaveLength(1);
  });
  it("includes a shared-room exam in either room filter without changing its room list", () => {
    const shared = { ...event, rooms: ["406", "407"] };
    const filters = { kinds: ["dl"], room: "406", query: "", semester: "all" };
    expect(filterCalendar([shared], filters)).toEqual([shared]);
    expect(filterCalendar([shared], { ...filters, room: "407" })).toEqual([shared]);
    expect(filterCalendar([shared], { ...filters, room: "401" })).toEqual([]);
    expect(shared.rooms).toEqual(["406", "407"]);
  });
  it("assigns stable room tones and shows a neutral shared surface unless a room is selected", () => {
    expect(["401", "402", "406", "407"].map(room => calendarRoomColor([room]))).toEqual(["blue", "amber", "purple", "green"]);
    expect(calendarRoomColor(["406", "407"])).toBe("shared");
    expect(calendarRoomColor(["406", "407"], "407")).toBe("green");
    expect(calendarRoomColor(["406", "407"], "401")).toBe("shared");
    expect(calendarRoomColor([])).toBe("shared");expect(calendarRoomColor(["unknown"])).toBe("shared");
  });
  it("lays out overlapping chains into lanes and resets width at a touching boundary", () => {
    const rows = layoutCalendarDay([event, { ...event, id: "two", start: "10:00", end: "11:00" }, { ...event, id: "three", start: "11:00", end: "12:00" }]);expect(rows.map(x => [x.lane, x.lanes])).toEqual([[0, 2], [1, 2], [0, 1]]);
    expect(layoutCalendarDay([{ ...event, end: "08:00" }])).toEqual([]);
  });
  it("uses half-open time/holiday intervals and excludes only the edited source", () => {
    expect(calendarConflicts({ ...event, start: "10:30", end: "11:00" }, [event])).toHaveLength(0);expect(calendarConflicts(event, [event], "one")).toHaveLength(0);expect(calendarConflicts({ ...event, rooms: ["407"] }, [event])).toHaveLength(0);
    const data = { events: [{ start: "2026-12-31", endExclusive: "2027-01-01", kind: "public" }] };expect(calendarHolidays(data, "2026-12-31")).toHaveLength(1);expect(calendarHolidays(data, "2027-01-01")).toHaveLength(0);
  });
  it("validates missing and invalid input while allowing the evening DL round", () => {
    expect(validateCalendarEntry({ ...event, start: "17:00", end: "18:30" })).toBe(null);expect(validateCalendarEntry({ ...event, title: " " }).field).toBe("title");expect(validateCalendarEntry({ ...event, participants: 75.5 }).field).toBe("participants");expect(validateCalendarEntry({ ...event, proctors: [] }).field).toBe("proctors");expect(validateCalendarEntry({ ...event, end: "08:30" }).field).toBe("end");
  });
});

describe("calendar detail period presentation", () => {
  const rule = { id: "synthetic-once", title: "Synthetic classroom", kind: "classroom", weekday: 4, start: "10:00", end: "11:00", rooms: ["402"], semester: "2/2569", validFrom: "2027-04-23", validTo: "2027-04-23" };
  it("labels a one-day stored rule as one-off without changing its occurrence data", () => {
    const before = structuredClone(rule);
    const [row] = expandCalendar({ rules: [rule], events: [] }, { start: "2027-04-23", end: "2027-04-23" });
    expect(row.recurring).toBe(true);
    expect(calendarDetailPeriod(row)).toEqual({ label: "การเกิดซ้ำ", value: "ครั้งเดียว" });
    expect(rule).toEqual(before);
    expect(expandCalendar({ rules: [rule], events: [] }, { start: "2027-04-30", end: "2027-04-30" })).toHaveLength(0);
  });
  it("keeps weekly bounds even when the current view contains only one occurrence", () => {
    const weekly = { ...rule, validTo: "2027-04-30" };
    const rows = expandCalendar({ rules: [weekly], events: [] }, { start: "2027-04-23", end: "2027-04-23" });
    expect(rows).toHaveLength(1);
    expect(calendarDetailPeriod(rows[0])).toEqual({ label: "ตารางรายสัปดาห์", value: "23 เมษายน 2570 – 30 เมษายน 2570" });
    expect(expandCalendar({ rules: [weekly], events: [] }, { start: "2027-04-23", end: "2027-04-30" })).toHaveLength(2);
  });
  it("preserves the existing dated-event detail layout", () => {
    const [row] = expandCalendar({ rules: [], events: [event] }, { start: event.date, end: event.date });
    expect(calendarDetailPeriod(row)).toBeNull();expect(calendarDetailPeriod(null)).toBeNull();
  });
  it("does not invent a period for missing, invalid or reversed bounds", () => {
    for (const row of [{ recurring: true }, { recurring: true, validFrom: "2027-02-30", validTo: "2027-02-30" }, { recurring: true, validFrom: "2027-04-30", validTo: "2027-04-23" }]) expect(calendarDetailPeriod(row)).toBeNull();
  });
});
