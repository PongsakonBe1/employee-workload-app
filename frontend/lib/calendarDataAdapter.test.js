import { describe, expect, it, vi } from "vitest";
import { adaptCalendarDocuments, adaptLegacyCalendarForDisplay, calendarAdapterRange, createCalendarDocumentCache, planCalendarDocumentChanges } from "./calendarDataAdapter";
import { calendarConflicts, calendarDetailPeriod, expandCalendar } from "./calendarView";
import { planClassroomImport } from "./classroomImport";
import { planDlImport } from "./dlImageImport";
const users = ["a", "b", "c"].map(id => ({
  id,
  name: `Staff ${id}`,
  role: "staff"
}));
const course = {
  id: "same-id",
  room: "401",
  dayOfWeek: "monday",
  startTime: "08:00",
  endTime: "10:00",
  subject: "Fixture course",
  semester: "2/2569",
  isActive: true
};
const exam = {
  id: "same-id",
  date: "2026-11-03",
  timeSlot: "evening",
  startTime: "17:00",
  endTime: "18:30",
  locations: ["ห้อง 406", "ห้อง 407"],
  studentCount: 75,
  proctors: ["a", "b", "c"],
  examType: "student",
  semester: "2/2569",
  isActive: true
};
const options = {
  boundsById: {
    "same-id": {
      validFrom: "2026-11-02",
      validTo: "2027-03-14"
    }
  }
};
const documents = (classroomSchedules = [course], dlExamSchedules = [exam], directory = users) => ({
  classroomSchedules,
  dlExamSchedules,
  users: directory
});
const read = (docs = documents(), config = options) => adaptCalendarDocuments(docs, config);
const changeOptions = people => ({
  role: "admin",
  people
});
describe("production calendar display", () => {
  it("shows recurring classes without fabricating a semester boundary", () => {
    const { data } = adaptLegacyCalendarForDisplay(documents([course], []));
    const rows = expandCalendar(data, { start: "2026-11-02", end: "2026-11-09" });
    expect(rows.map(row => row.date)).toEqual(["2026-11-02", "2026-11-09"]);
    expect(calendarDetailPeriod(rows[0])).toEqual({ label: "ตารางรายสัปดาห์", value: "ทุกสัปดาห์" });
  });

  it("respects an existing start date even with an open end", () => {
    const { data } = adaptLegacyCalendarForDisplay(documents([{ ...course, validFrom: "2026-11-03" }], []));
    expect(expandCalendar(data, { start: "2026-11-02", end: "2026-11-09" }).map(row => row.date)).toEqual(["2026-11-09"]);
  });

  it("preserves recorded evening hours and omits exams with an ambiguous time", () => {
    const incomplete = { ...exam, id: "incomplete", startTime: undefined, endTime: undefined };
    const { data, unavailable } = adaptLegacyCalendarForDisplay(documents([], [exam, incomplete, { ...exam, id: "cancelled", isActive: false }]));
    expect(unavailable).toBe(1);
    expect(data.events).toHaveLength(1);
    expect(data.events[0]).toMatchObject({ start: "17:00", end: "18:30", rooms: ["406", "407"], participants: 75, legacyProctorNames: ["Staff a", "Staff b", "Staff c"] });
  });
});
describe("legacy calendar documents to reviewed UI contract", () => {
  it("maps the two legacy shapes without ID collisions or mutating source data", () => {
    const source = documents(),
      before = JSON.stringify(source),
      result = read(source);
    expect(result.issues).toEqual([]);
    expect(result.data.rules[0]).toMatchObject({
      id: "classroomSchedules:same-id",
      weekday: 0,
      rooms: ["401"],
      start: "08:00",
      validFrom: "2026-11-02",
      source: {
        collection: "classroomSchedules",
        documentId: "same-id"
      }
    });
    expect(result.data.events[0]).toMatchObject({
      id: "dlExamSchedules:same-id",
      start: "17:00",
      end: "18:30",
      participants: 75,
      proctors: ["a", "b", "c"]
    });
    expect(JSON.stringify(source)).toBe(before);
  });
  it.each([["monday", 0], ["tuesday", 1], ["wednesday", 2], ["thursday", 3], ["friday", 4], ["saturday", 5], ["sunday", 6]])("maps legacy %s without Sunday/Monday offset errors", (dayOfWeek, weekday) => {
    expect(read(documents([{
      ...course,
      dayOfWeek
    }])).data.rules[0].weekday).toBe(weekday);
  });
  it("does not invent a term for old classroom documents", () => {
    const result = read(documents(), {});
    expect(result.complete).toBe(false);
    expect(result.data.rules).toEqual([]);
    expect(result.issues[0].field).toBe("bounds");
  });
  it("respects stored bounds and never repairs a partial stored pair with defaults", () => {
    expect(read(documents([{
      ...course,
      validFrom: "2026-11-23",
      validTo: "2027-03-14"
    }])).data.rules[0].validFrom).toBe("2026-11-23");
    expect(read(documents([{
      ...course,
      validFrom: "2026-11-23"
    }])).data.rules).toEqual([]);
  });
  it("keeps historical explicit times even when a slot label is inconsistent", () => {
    expect(read(documents([], [{
      ...exam,
      startTime: "15:00",
      endTime: "16:00"
    }])).data.events[0]).toMatchObject({
      start: "15:00",
      end: "16:00"
    });
  });
  it("never guesses missing or partial times from a legacy slot name", () => {
    for (const record of [{
      ...exam,
      startTime: undefined,
      endTime: undefined
    }, {
      ...exam,
      endTime: undefined
    }, {
      ...exam,
      startTime: "bad"
    }]) expect(read(documents([], [record])).issues[0].field).toBe("time");
  });
  it("accepts a per-document reviewed time only when the stored pair is absent", () => {
    const record = {
      ...exam
    };
    delete record.startTime;
    delete record.endTime;
    const result = read(documents([], [record]), {
      timesById: {
        "same-id": {
          start: "17:00",
          end: "18:30"
        }
      }
    });
    expect(result.data.events[0].start).toBe("17:00");
    expect(result.warnings).toHaveLength(1);
    expect(read(documents([], [{
      ...exam,
      endTime: undefined
    }]), {
      timesById: {
        "same-id": {
          start: "17:00",
          end: "18:30"
        }
      }
    }).data.events).toEqual([]);
  });
  it("supports legacy singular location and embedded proctor IDs", () => {
    expect(read(documents([], [{
      ...exam,
      locations: undefined,
      location: "ห้อง 406",
      proctors: [{
        id: "a"
      }, {
        userId: "b"
      }]
    }])).data.events[0]).toMatchObject({
      rooms: ["406"],
      proctors: ["a", "b"]
    });
  });
  it("does not silently discard an unsupported CEM room", () => {
    const result = read(documents([], [{
      ...exam,
      locations: ["ห้อง 406", "CEM"]
    }]));
    expect(result.data.events).toEqual([]);
    expect(result.issues[0].field).toBe("rooms");
  });
  it("excludes inactive records and rejects malformed active flags", () => {
    expect(read(documents([{
      ...course,
      isActive: false
    }], [{
      ...exam,
      isActive: false
    }])).data).toEqual({
      rules: [],
      events: []
    });
    expect(read(documents([], [{
      ...exam,
      isActive: "false"
    }])).issues[0].field).toBe("isActive");
  });
  it("rejects unknown/name-only/duplicate proctors and accounts outside the staff directory", () => {
    for (const proctors of [["missing"], ["Staff a"], ["a", "a"], []]) expect(read(documents([], [{
      ...exam,
      proctors
    }])).data.events).toEqual([]);
    expect(read(documents([], [exam], users.map(u => ({
      ...u,
      role: "user"
    })))).data.events).toEqual([]);
  });
  it("keeps similar display names distinct by UID, using the existing display-name precedence", () => {
    const result = read(documents([], [exam], users.map(u => ({
      ...u,
      displayName: "Staff (" + u.id + ")",
      nickname: "nickname"
    }))));
    expect(result.people.map(p => p.label)).toEqual(["Staff (a)", "Staff (b)", "Staff (c)"]);
    expect(result.data.events[0].proctors).toEqual(["a", "b", "c"]);
  });
  it("surfaces duplicate directory/document IDs without hiding the incomplete state", () => {
    expect(read(documents([course, course])).issues.some(i => i.field === "id")).toBe(true);
    expect(read(documents([], [exam], [...users, users[0]])).complete).toBe(false);
  });
  it("rejects invalid dates, count, room and weekdays", () => {
    for (const patch of [{
      date: "2026-02-30"
    }, {
      date: new Date()
    }, {
      studentCount: "75"
    }, {
      studentCount: 0
    }, {
      locations: []
    }]) expect(read(documents([], [{
      ...exam,
      ...patch
    }])).data.events).toEqual([]);
    for (const patch of [{
      dayOfWeek: "wrong"
    }, {
      room: "CEM"
    }, {
      subject: ""
    }, {
      endTime: "07:00"
    }]) expect(read(documents([{
      ...course,
      ...patch
    }])).data.rules).toEqual([]);
  });
  it("expands dates within explicit bounds and uses the normalized data for real room conflicts", () => {
    const result = read(),
      rows = expandCalendar(result.data, {
        start: "2026-11-02",
        end: "2026-11-08"
      });
    expect(rows).toHaveLength(2);
    expect(calendarConflicts({
      date: exam.date,
      start: "17:30",
      end: "18:00",
      rooms: ["407"]
    }, rows)).toHaveLength(1);
    expect(expandCalendar(result.data, {
      start: "2027-03-15",
      end: "2027-03-21"
    })).toEqual([]);
  });
});
describe("offline document change plans", () => {
  it("ignores view-only metadata and retains an edited DL title in the payload", () => {
    const {
        data,
        people
      } = read(),
      after = structuredClone(data);
    after.events[0].sourceId = after.events[0].id;
    after.events[0].recurring = false;
    after.events[0].repeat = "none";
    expect(planCalendarDocumentChanges(data, after, changeOptions(people)).commands).toEqual([]);
    after.events[0].title = "Edited exam fixture";
    expect(planCalendarDocumentChanges(data, after, changeOptions(people)).commands[0].value.subject).toBe("Edited exam fixture");
  });
  it("keeps document IDs byte-for-byte and rejects path-like IDs", () => {
    const docs = documents([], [{
      ...exam,
      id: " padded-id "
    }]);
    const result = read(docs);
    expect(result.data.events[0].source.documentId).toBe(" padded-id ");
    expect(read(documents([], [{
      ...exam,
      id: "nested/path"
    }])).issues[0].field).toBe("id");
  });
  it("does not generate writes for an unchanged snapshot", () => {
    const {
      data,
      people
    } = read();
    expect(planCalendarDocumentChanges(data, data, changeOptions(people))).toEqual({
      commands: [],
      issues: []
    });
  });
  it("round-trips changed classroom bounds/weekday and explicit DL time to original document references", () => {
    const {
        data,
        people
      } = read(),
      after = structuredClone(data);
    after.rules[0].title = "Changed fixture";
    after.events[0].start = "17:15";
    const result = planCalendarDocumentChanges(data, after, changeOptions(people));
    expect(result.issues).toEqual([]);
    expect(result.commands.map(c => [c.operation, c.reference.documentId])).toEqual([["update", "same-id"], ["update", "same-id"]]);
    expect(result.commands[0].value).toMatchObject({
      subject: "Changed fixture",
      dayOfWeek: "monday",
      validFrom: "2026-11-02"
    });
    expect(result.commands[1].value).toMatchObject({
      startTime: "17:15",
      endTime: "18:30",
      proctors: ["a", "b", "c"],
      studentCount: 75
    });
    const roundtrip = read(documents([{
      id: "same-id",
      ...result.commands[0].value
    }], [{
      id: "same-id",
      ...result.commands[1].value
    }]));
    expect(roundtrip.data.events[0].start).toBe("17:15");
  });
  it("preserves legacy deletion contracts: classroom delete, DL soft delete", () => {
    const {
      data,
      people
    } = read();
    const result = planCalendarDocumentChanges(data, {
      rules: [],
      events: []
    }, changeOptions(people));
    expect(result.commands.map(c => c.operation)).toEqual(["delete", "update"]);
    expect(result.commands[1].value).toEqual({
      isActive: false
    });
  });
  it.each(["staff", "user", undefined])("denies change planning for role %s", role => {
    const {
      data,
      people
    } = read();
    expect(planCalendarDocumentChanges(data, {
      rules: [],
      events: []
    }, {
      people,
      role
    }).commands).toEqual([]);
  });
  it("rejects temporary proctors atomically even if another change is valid", () => {
    const {
        data,
        people
      } = read(),
      after = structuredClone(data);
    after.rules[0].title = "Changed fixture";
    after.events[0].proctors = ["temporary-id"];
    const result = planCalendarDocumentChanges(data, after, changeOptions([...people, {
      id: "temporary-id",
      label: "Staff X",
      temporary: true,
      identity: "directory"
    }]));
    expect(result.commands).toEqual([]);
    expect(result.issues[0].field).toBe("proctors");
  });
  it("rejects source changes, forged references, duplicate IDs and unsupported event kinds", () => {
    const {
      data,
      people
    } = read();
    for (const patch of [{
      source: {
        collection: "users",
        documentId: "same-id"
      }
    }, {
      source: undefined
    }, {
      kind: "exam"
    }]) {
      const after = structuredClone(data);
      Object.assign(after.events[0], patch);
      expect(planCalendarDocumentChanges(data, after, changeOptions(people)).commands).toEqual([]);
    }
    const after = structuredClone(data);
    after.events.push({
      ...after.events[0],
      id: "new"
    });
    expect(planCalendarDocumentChanges(data, after, changeOptions(people)).issues[0].field).toBe("source");
    after.events.push(after.events[0]);
    expect(planCalendarDocumentChanges(data, after, changeOptions(people)).issues.some(i => i.field === "id")).toBe(true);
  });
  it("requires an explicit exam type before a new DL payload can be prepared", () => {
    const {
        data,
        people
      } = read(),
      newEvent = {
        ...data.events[0],
        id: "new",
        source: undefined,
        examType: undefined,
        date: "2026-11-24"
      };
    expect(planCalendarDocumentChanges(data, {
      ...data,
      events: [...data.events, newEvent]
    }, changeOptions(people)).issues[0].field).toBe("examType");
  });
  it("plans a reviewed image import and blocks reimport against the adapted snapshot", () => {
    const {
        data,
        people
      } = read(),
      row = {
        id: "image-1",
        selected: true,
        date: "2026-11-24",
        start: "17:00",
        end: "18:30",
        proctorKeys: [],
        manualProctors: ["a", "b", "c"]
      };
    const imported = planDlImport([row], {
      people,
      participants: 75,
      semester: "2/2569"
    }, data);
    expect(imported.issues).toEqual([]);
    const after = {
      ...data,
      events: [...data.events, ...imported.events.map(e => ({
        ...e,
        id: "new-dl",
        examType: "student"
      }))]
    };
    const changes = planCalendarDocumentChanges(data, after, changeOptions(people));
    expect(changes.issues).toEqual([]);
    expect(changes.commands).toHaveLength(1);
    expect(changes.commands[0]).toMatchObject({
      operation: "create",
      value: {
        startTime: "17:00",
        endTime: "18:30",
        locations: ["ห้อง 406", "ห้อง 407"]
      }
    });
    expect(planDlImport([row], {
      people,
      participants: 75,
      semester: "2/2569"
    }, after).events).toEqual([]);
  });
  it("plans PDF-derived weekly rows with an explicit term and blocks a duplicate", () => {
    const {
      data,
      people
    } = read();
    const row = {
        id: "pdf-1",
        selected: true,
        title: "Imported fixture",
        weekday: 1,
        room: "402",
        start: "08:00",
        end: "10:00",
        group: "vocational"
      },
      terms = {
        vocational: {
          start: "2026-11-02",
          end: "2027-03-14"
        },
        other: {
          start: "2026-11-23",
          end: "2027-03-14"
        }
      };
    const imported = planClassroomImport([row], terms, "2/2569", data);
    expect(imported.issues).toEqual([]);
    const after = {
      ...data,
      rules: [...data.rules, ...imported.rules.map(r => ({
        ...r,
        id: "new-pdf"
      }))]
    };
    expect(planCalendarDocumentChanges(data, after, changeOptions(people)).commands[0]).toMatchObject({
      operation: "create",
      value: {
        dayOfWeek: "tuesday",
        room: "402",
        validFrom: "2026-11-03"
      }
    });
    expect(planClassroomImport([row], terms, "2/2569", after).rules).toEqual([]);
  });
});
describe("bounded cached calendar reads", () => {
  it("deduplicates simultaneous loads and serves all views/filters from the same snapshot", async () => {
    const loader = vi.fn(async () => documents()),
      cache = createCalendarDocumentCache(loader, options);
    const [a, b] = await Promise.all([cache.read(), cache.read()]);
    expect(a).toBe(b);
    for (const [start, end] of [["2026-11-03", "2026-11-03"], ["2026-11-02", "2026-11-08"], ["2026-11-01", "2026-11-30"]]) {
      const result = await cache.read();
      expect(calendarAdapterRange(result.data, start, end).events).toHaveLength(1);
    }
    expect(loader).toHaveBeenCalledTimes(1);
    expect(Object.isFrozen(a.data.events[0])).toBe(true);
  });
  it("retries a failed load and only reloads after explicit invalidation", async () => {
    const loader = vi.fn().mockRejectedValueOnce(new Error("fixture failure")).mockResolvedValue(documents()),
      cache = createCalendarDocumentCache(loader, options);
    await expect(cache.read()).rejects.toThrow("fixture failure");
    await cache.read();
    await cache.read();
    expect(loader).toHaveBeenCalledTimes(2);
    cache.invalidate();
    await cache.read();
    expect(loader).toHaveBeenCalledTimes(3);
  });
  it("cannot poison a newer cache with a stale in-flight response", async () => {
    let release;
    const loader = vi.fn().mockImplementationOnce(() => new Promise(resolve => {
        release = resolve;
      })).mockResolvedValue(documents([], [])),
      cache = createCalendarDocumentCache(loader, options);
    const old = cache.read();
    await Promise.resolve();
    cache.invalidate();
    await cache.read();
    release(documents());
    await old;
    expect((await cache.read()).data.events).toEqual([]);
    expect(cache.stats().loads).toBe(2);
  });
  it("rejects invalid or excessive view ranges instead of expanding unbounded history", () => {
    const {
      data
    } = read();
    for (const range of [["bad", "2026-11-03"], ["2026-11-03", "2026-11-02"], ["2026-01-01", "2030-01-01"]]) expect(() => calendarAdapterRange(data, ...range)).toThrow();
  });
});
